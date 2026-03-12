from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from bson import ObjectId
import shutil
import os
from datetime import datetime
from typing import List
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ai_pipeline.agents.document_parser import DocumentParserAgent
from app.database import financial_data_collection, documents_collection, activity_log_collection, companies_collection, credit_cases_collection
from app.models.document import Document, DocumentResponse
from app.models.activity_log import create_activity_log
from app.workflow_manager import WorkflowOrchestrator
import asyncio
import logging

router = APIRouter(prefix="/documents", tags=["Documents"])
security = HTTPBearer()
parser_agent = DocumentParserAgent()
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {"user_id": "authenticated"}

async def process_document_extraction(document_id: str, file_path: str, creditCaseId: str, documentType: str, financialYear: str):
    """Background task to process document extraction"""
    try:
        logger.info(f"Starting background extraction for document {document_id}")
        
        # Update status to Processing
        documents_collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"status": "Processing", "updatedAt": datetime.now().isoformat()}}
        )
        
        # Run the extraction (this is CPU intensive, run in thread pool)
        loop = asyncio.get_event_loop()
        extraction_result = await loop.run_in_executor(
            None, 
            parser_agent.ingest_file, 
            file_path
        )

        financial_data = extraction_result.get("extracted_data", {})

        # store extracted financials
        if financial_data and len(financial_data) > 0:
            financial_record = {
                "creditCaseId": creditCaseId,
                "documentId": document_id,
                "financialYear": financialYear,
                "documentType": documentType,
                "data": financial_data,
                "createdAt": datetime.now().isoformat()
            }

            financial_data_collection.insert_one(financial_record)
            
            # Update status to Extracted
            documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {
                    "status": "Extracted",
                    "extractedAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat()
                }}
            )
            logger.info(f"Document {document_id} extracted successfully with {len(financial_data)} fields")
            
            # Trigger next workflow steps
            await WorkflowOrchestrator.trigger_next_steps(creditCaseId, "DOCUMENTS")
        else:
            # No data extracted but no error
            documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {
                    "status": "Uploaded", 
                    "extractionMessage": "No financial data found",
                    "updatedAt": datetime.now().isoformat()
                }}
            )
            logger.info(f"Document {document_id} processed but no financial data found")

    except Exception as extraction_error:
        logger.error(f"Extraction error for document {document_id}: {extraction_error}")
        documents_collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "status": "Error", 
                "errorMessage": str(extraction_error),
                "updatedAt": datetime.now().isoformat()
            }}
        )

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    creditCaseId: str = Form(...),
    documentType: str = Form(...),
    financialYear: str = Form(...)
):
    try:
        allowed_extensions = ['.pdf', '.xlsx', '.xls', '.csv', '.json', '.png', '.jpg', '.jpeg']
        file_ext = os.path.splitext(file.filename)[1].lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )

        # generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-")
        filename = f"{timestamp}_{safe_filename}"

        file_path = os.path.join(UPLOAD_FOLDER, filename)

        # file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        # save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # create document record - initial status is "Uploaded"
        document_data = {
            "creditCaseId": creditCaseId,
            "documentType": documentType,
            "financialYear": financialYear,
            "fileUrl": file_path,
            "fileName": file.filename,
            "fileSize": file_size,
            "uploadDate": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "status": "Uploaded"  # Start with Uploaded, will be changed to Processing by background task
        }

        result = documents_collection.insert_one(document_data)
        document_id = str(result.inserted_id)
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"Document Uploaded: {file.filename}",
            category="DOCUMENT",
            case_id=creditCaseId,
            details={"documentType": documentType, "financialYear": financialYear}
        )
        
        # Add document ID to the data
        document_data["_id"] = document_id

        # Add background task for extraction (this will update status to Processing)
        background_tasks.add_task(
            process_document_extraction,
            document_id,
            file_path,
            creditCaseId,
            documentType,
            financialYear
        )

        logger.info(f"Document {document_id} uploaded successfully with status 'Uploaded', extraction will start in background")
        
        return document_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/case/{creditCaseId}", response_model=List[DocumentResponse])
async def get_documents_by_case(creditCaseId: str):
    """Get all documents for a specific credit case"""
    try:
        documents = list(documents_collection.find({"creditCaseId": creditCaseId}).sort("uploadDate", -1))
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            # Ensure all expected fields are present
            if "status" not in doc:
                doc["status"] = "Uploaded"
            if "updatedAt" not in doc:
                doc["updatedAt"] = doc.get("uploadDate", datetime.now().isoformat())
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")

@router.get("/search", response_model=List[DocumentResponse])
async def search_documents(query: str = ""):
    """Search for documents across all cases and companies with improved matching"""
    try:
        if not query or len(query) < 2:
            return []
            
        # 1. Broad Document Search (Name, Type, Year)
        search_filter = {
            "$or": [
                {"fileName": {"$regex": query, "$options": "i"}},
                {"documentType": {"$regex": query, "$options": "i"}},
                {"financialYear": {"$regex": query, "$options": "i"}}
            ]
        }
        
        # 2. Find companies matching the query
        matching_companies = list(companies_collection.find(
            {"companyName": {"$regex": query, "$options": "i"}}
        ))
        
        company_ids = [str(c["_id"]) for c in matching_companies]
        
        # 3. Find cases matching companies OR matching the query directly (borrower name)
        case_search = {"$or": []}
        if company_ids:
            case_search["$or"].append({"companyId": {"$in": company_ids}})
        
        case_search["$or"].append({"borrowerName": {"$regex": query, "$options": "i"}})
        case_search["$or"].append({"loanPurpose": {"$regex": query, "$options": "i"}})
        
        matching_cases = list(credit_cases_collection.find(case_search))
        case_ids = [str(c["_id"]) for c in matching_cases]
        
        # Add these case IDs to our document search
        if case_ids:
            search_filter["$or"].append({"creditCaseId": {"$in": case_ids}})

        # Execute Search
        documents = list(documents_collection.find(search_filter).sort("uploadDate", -1).limit(40))
        
        # 4. Final enrichment with Company Names for the UI
        results = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            
            # Fetch company name
            case = credit_cases_collection.find_one({"_id": ObjectId(doc["creditCaseId"])})
            if case:
                company = companies_collection.find_one({"_id": ObjectId(case["companyId"])})
                doc["companyName"] = company["companyName"] if company else case.get("borrowerName", "Unknown")
            else:
                doc["companyName"] = "Unknown"
                
            results.append(doc)
            
        return results
    except Exception as e:
        logger.error(f"Enhanced Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# ... rest of your endpoints remain the same ...
@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    """Get a single document by ID"""
    try:
        if not ObjectId.is_valid(document_id):
            raise HTTPException(status_code=400, detail="Invalid document ID")
            
        document = documents_collection.find_one({"_id": ObjectId(document_id)})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
            
        document["_id"] = str(document["_id"])
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching document: {str(e)}")

@router.get("/{document_id}/extracted-data")
async def get_extracted_data(document_id: str):
    """Get extracted financial data for a document"""
    try:
        if not ObjectId.is_valid(document_id):
            raise HTTPException(status_code=400, detail="Invalid document ID")
        
        # First check if document exists
        document = documents_collection.find_one({"_id": ObjectId(document_id)})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Find the extracted data for this document
        extracted_data = financial_data_collection.find_one({"documentId": document_id})
        
        if not extracted_data:
            return {
                "documentId": document_id,
                "status": document.get("status", "Uploaded"),
                "data": None,
                "message": "Data extraction in progress or not available"
            }
        
        # Convert ObjectId to string
        extracted_data["_id"] = str(extracted_data["_id"])
        
        return {
            "documentId": document_id,
            "status": "Extracted",
            "data": extracted_data.get("data", {}),
            "financialYear": extracted_data.get("financialYear"),
            "documentType": extracted_data.get("documentType")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching extracted data: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document by ID"""
    try:
        if not ObjectId.is_valid(document_id):
            raise HTTPException(status_code=400, detail="Invalid document ID")
        
        document = documents_collection.find_one({"_id": ObjectId(document_id)})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete the physical file
        file_path = document.get("fileUrl", "")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                logger.warning(f"Could not delete file: {file_path}")
        
        # Also delete any extracted data
        financial_data_collection.delete_many({"documentId": document_id})
        
        # Delete from database
        result = documents_collection.delete_one({"_id": ObjectId(document_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
            
        return {"message": "Document deleted successfully", "id": document_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@router.get("/stats/{creditCaseId}")
async def get_document_stats(creditCaseId: str):
    """Get document statistics for a case"""
    try:
        documents = list(documents_collection.find({"creditCaseId": creditCaseId}))
        
        total_docs = len(documents)
        by_status = {
            "Uploaded": 0,
            "Processing": 0,
            "Extracted": 0,
            "Error": 0
        }
        by_category = {}
        
        for doc in documents:
            status = doc.get("status", "Uploaded")
            if status in by_status:
                by_status[status] += 1
            
            category = doc.get("documentType", "Other")
            by_category[category] = by_category.get(category, 0) + 1
        
        return {
            "creditCaseId": creditCaseId,
            "totalDocuments": total_docs,
            "byStatus": by_status,
            "byCategory": by_category,
            "lastUpdated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching document stats: {str(e)}")