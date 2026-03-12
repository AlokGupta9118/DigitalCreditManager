from fastapi import APIRouter, HTTPException, BackgroundTasks
from bson import ObjectId
from typing import List, Optional
from datetime import datetime
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.database import research_collection, activity_log_collection
from app.models.research import Research
from app.models.activity_log import create_activity_log
from ai_pipeline.agents.research_agent import run_automated_research
from app.workflow_manager import WorkflowOrchestrator

router = APIRouter(prefix="/research", tags=["Research"])
logger = logging.getLogger(__name__)

# Thread pool for running the research agent
executor = ThreadPoolExecutor(max_workers=2)

@router.post("/", response_model=dict)
async def add_research(research: Research):
    """Store research results (manual entry)"""
    try:
        research_dict = research.dict()
        research_dict["createdAt"] = datetime.now().isoformat()
        
        result = research_collection.insert_one(research_dict)
        return {
            "status": "stored", 
            "id": str(result.inserted_id),
            "message": "Research data stored successfully"
        }
    except Exception as e:
        logger.error(f"Error storing research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store research: {str(e)}")

@router.post("/run", response_model=dict)
async def run_research(
    creditCaseId: str,
    companyName: str,
    promoterNames: Optional[List[str]] = None,
    sector: Optional[str] = None,
    background_tasks: BackgroundTasks = None
):
    """Run the research agent for a company"""
    try:
        # Create initial research record
        initial_research = Research(
            creditCaseId=creditCaseId,
            companyName=companyName,
            overallRisk="PROCESSING",
            rawResearch="Research in progress...",
            news=[],
            sectorInsights=[],
            keyStrengths=[],
            keyConcerns=[]
        )
        
        research_dict = initial_research.dict()
        research_dict["createdAt"] = datetime.now().isoformat()
        research_dict["status"] = "PROCESSING"
        
        result = research_collection.insert_one(research_dict)
        research_id = str(result.inserted_id)
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"AI Research Started: {companyName}",
            category="RESEARCH",
            case_id=creditCaseId,
            details={"companyName": companyName, "researchId": research_id}
        )
        
        # Run research in background
        if background_tasks:
            background_tasks.add_task(
                execute_research_and_store,
                research_id,
                creditCaseId,
                companyName,
                promoterNames,
                sector
            )
            return {
                "status": "started",
                "researchId": research_id,
                "message": "Research started in background",
                "creditCaseId": creditCaseId
            }
        else:
            # Run synchronously in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                executor,
                execute_research_and_store_sync,
                research_id,
                creditCaseId,
                companyName,
                promoterNames,
                sector
            )
            return {
                "status": "completed",
                "researchId": research_id,
                "message": "Research completed",
                "creditCaseId": creditCaseId
            }
            
    except Exception as e:
        logger.error(f"Error starting research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start research: {str(e)}")

def execute_research_and_store_sync(
    research_id: str,
    creditCaseId: str,
    companyName: str,
    promoterNames: Optional[List[str]] = None,
    sector: Optional[str] = None
):
    """Synchronous version for thread pool execution"""
    try:
        # Get extracted financial data from documents
        from app.database import financial_data_collection, documents_collection
        docs = list(documents_collection.find({"creditCaseId": creditCaseId}))
        doc_ids = [str(d["_id"]) for d in docs]
        
        financials = list(financial_data_collection.find({"documentId": {"$in": doc_ids}}))
        financial_metrics_text = ""
        for f in financials:
            doc_type = f.get("documentType", "Unknown")
            fy = f.get("financialYear", "N/A")
            data = f.get("data", {})
            if data:
                financial_metrics_text += f"\n--- EXTRACTED {doc_type} (FY {fy}) ---\n"
                for key, val in data.items():
                    if val is not None:
                        financial_metrics_text += f"{key}: {val}\n"

        # Run the automated research agent
        research_iterations = run_automated_research(
            company_name=companyName,
            promoter_names=promoterNames,
            sector=sector,
            structured_data=financial_metrics_text
        )
        
        # Get final findings
        final_findings = ""
        if research_iterations and len(research_iterations) > 0:
            final_findings = research_iterations[-1].get("findings", "")
        
        # Simple risk extraction
        overall_risk = "MEDIUM"  # Default
        if final_findings and "LOW" in final_findings.upper():
            overall_risk = "LOW"
        elif final_findings and "HIGH" in final_findings.upper():
            overall_risk = "HIGH"
        
        # Update the research record - use both field names for compatibility
        research_collection.update_one(
            {"_id": ObjectId(research_id)},
            {"$set": {
                "status": "COMPLETED",
                "rawResearch": final_findings,
                "reportText": final_findings, # New field expected by some components
                "overallRisk": overall_risk,
                "updatedAt": datetime.now().isoformat()
            }}
        )
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"AI Research Completed: {companyName}",
            category="RESEARCH",
            case_id=creditCaseId,
            details={"companyName": companyName, "researchId": research_id, "risk": overall_risk}
        )
        
        logger.info(f"Research {research_id} completed successfully")
        
        # Trigger next workflow steps safely
        asyncio.create_task(WorkflowOrchestrator.trigger_next_steps(creditCaseId, "RESEARCH"))
        
    except Exception as e:
        logger.error(f"Research execution failed: {e}")
        research_collection.update_one(
            {"_id": ObjectId(research_id)},
            {"$set": {
                "status": "ERROR",
                "overallRisk": "ERROR",
                "creditOpinion": f"Research failed: {str(e)}",
                "updatedAt": datetime.now().isoformat()
            }}
        )

async def execute_research_and_store(
    research_id: str,
    creditCaseId: str,
    companyName: str,
    promoterNames: Optional[List[str]] = None,
    sector: Optional[str] = None
):
    """Async wrapper for thread pool execution"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        executor,
        execute_research_and_store_sync,
        research_id,
        creditCaseId,
        companyName,
        promoterNames,
        sector
    )

@router.get("/case/{creditCaseId}", response_model=List[Research])
async def get_research_by_case(creditCaseId: str):
    """Get all research reports for a specific credit case"""
    try:
        query = {
            "$or": [
                {"creditCaseId": creditCaseId},
                {"creditCaseId": ObjectId(creditCaseId)}
            ]
        } if ObjectId.is_valid(creditCaseId) else {"creditCaseId": creditCaseId}
        
        research_list = list(
            research_collection.find(query)
            .sort("createdAt", -1)
        )
        
        for research in research_list:
            research["_id"] = str(research["_id"])
            if "status" not in research:
                research["status"] = "COMPLETED"
            
        return research_list
    except Exception as e:
        logger.error(f"Error fetching research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch research: {str(e)}")

@router.get("/latest/{creditCaseId}")
async def get_latest_research(creditCaseId: str):
    """Get the latest research report for a credit case"""
    try:
        query = {
            "$or": [
                {"creditCaseId": creditCaseId},
                {"creditCaseId": ObjectId(creditCaseId)}
            ]
        } if ObjectId.is_valid(creditCaseId) else {"creditCaseId": creditCaseId}

        research = research_collection.find_one(
            query,
            sort=[("createdAt", -1)]
        )
        
        if not research:
            raise HTTPException(status_code=404, detail="No research found for this case")
        
        research["_id"] = str(research["_id"])
        if "status" not in research:
            research["status"] = "COMPLETED"
            
        return research
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch research: {str(e)}")

@router.get("/status/{research_id}")
async def get_research_status(research_id: str):
    """Get the status of a research job"""
    try:
        if not ObjectId.is_valid(research_id):
            raise HTTPException(status_code=400, detail="Invalid research ID")
            
        research = research_collection.find_one({"_id": ObjectId(research_id)})
        if not research:
            raise HTTPException(status_code=404, detail="Research not found")
            
        return {
            "id": research_id,
            "status": research.get("status", "COMPLETED"),
            "overallRisk": research.get("overallRisk"),
            "updatedAt": research.get("updatedAt")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching research status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch research status: {str(e)}")

@router.delete("/{research_id}")
async def delete_research(research_id: str):
    """Delete a research report"""
    try:
        if not ObjectId.is_valid(research_id):
            raise HTTPException(status_code=400, detail="Invalid research ID")
            
        result = research_collection.delete_one({"_id": ObjectId(research_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Research not found")
            
        return {"message": "Research deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting research: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete research: {str(e)}")