from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from bson import ObjectId
from datetime import datetime
from typing import Optional
import json

from app.database import due_diligence_collection, activity_log_collection
from app.models.due_diligence import DueDiligence
from app.models.activity_log import create_activity_log
from app.workflow_manager import WorkflowOrchestrator

import os
import sys

# Ensure ai_pipeline is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
server_dir = os.path.dirname(parent_dir)
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

try:
    from ai_pipeline.langchain_setup import get_llm
except ImportError:
    pass

router = APIRouter(prefix="/due-diligence", tags=["Due Diligence"])

@router.post("/", response_model=dict)
async def upsert_due_diligence(data: DueDiligence):
    """Save or update due diligence findings for a case"""
    try:
        # Check if already exists
        existing = due_diligence_collection.find_one({"creditCaseId": data.creditCaseId})
        
        update_data = data.dict()
        update_data["updatedAt"] = datetime.now().isoformat()
        
        if existing:
            due_diligence_collection.update_one(
                {"creditCaseId": data.creditCaseId},
                {"$set": update_data}
            )
            status = "updated"
            msg = "Due diligence findings updated"
        else:
            update_data["createdAt"] = datetime.now().isoformat()
            due_diligence_collection.insert_one(update_data)
            status = "created"
            msg = "Due diligence findings saved"

        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"Due Diligence Recorded: {data.managementCredibility} credibility, {data.factoryCapacityUtilization}% capacity",
            category="DUE_DILIGENCE",
            case_id=data.creditCaseId,
            details={
                "credibility": data.managementCredibility,
                "capacity": data.factoryCapacityUtilization,
                "status": status
            }
        )
        
        # Trigger next workflow steps
        await WorkflowOrchestrator.trigger_next_steps(data.creditCaseId, "DUE_DILIGENCE")
        
        return {"status": status, "message": msg}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/case/{case_id}", response_model=Optional[dict])
async def get_due_diligence_by_case(case_id: str):
    """Retrieve due diligence findings for a specific case"""
    robust_query = {"$or": [{"creditCaseId": case_id}, {"creditCaseId": ObjectId(case_id)}]} if ObjectId.is_valid(case_id) else {"creditCaseId": case_id}
    data = due_diligence_collection.find_one(robust_query, sort=[("updatedAt", -1)])
    if not data:
        return None
    
    data["_id"] = str(data["_id"])
    return data

@router.post("/upload-photo")
async def upload_site_photo(file: UploadFile = File(...)):
    """Upload a site photo and return its public URL"""
    try:
        import uuid
        file_extension = os.path.splitext(file.filename)[1]
        new_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("uploads", new_filename)
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
            
        return {
            "status": "success",
            "url": f"/uploads/{new_filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/analyze")
async def analyze_due_diligence(notes: str = Form(""), file: UploadFile = File(None)):
    try:
        is_image = False
        base64_image = ""
        file_text = ""
        
        if file:
            content = await file.read()
            # Cast to bytes to ensure decode exists (satisfies some linters)
            content_bytes = bytes(content)
            mime_type = file.content_type or ""
            if mime_type.startswith("image/") or file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                import base64
                is_image = True
                base64_image = base64.b64encode(content_bytes).decode('utf-8')
                mime_type = mime_type if mime_type else "image/jpeg"
                base64_image = f"data:{mime_type};base64,{base64_image}"
            else:
                try:
                    file_text = content_bytes.decode("utf-8")
                except:
                    file_text = f"[Binary file uploaded: {file.filename}, size: {len(content_bytes)} bytes.]"

        combined_notes = f"User Notes: {notes}\nFile context: {file_text}"
        
        prompt = f"""You are an expert factory inspector and due diligence AI. 
Review the following notes and file data (and image if provided), then extract/infer realistic values for the following 4 fields.
If data is missing or standard, make a realistic assessment based on conventional MSME operational standards, ensuring the output is valid.

1. "factoryCapacityUtilization": integer between 0 and 100 (e.g. 75)
2. "managementCredibility": string MUST BE ONE OF ["Excellent", "Good", "Average", "Poor"]
3. "operationalRisks": string describing key operational risks observed or inferred (max 3 sentences)
4. "visitNotes": string summarizing the overall factory/site condition and operations (max 3 sentences)

Data Context:
\"\"\"
{combined_notes}
\"\"\"

Respond ONLY in valid JSON format, with precisely these 4 keys. No other text.
"""
        from langchain_core.messages import HumanMessage
        
        if is_image:
            from langchain_groq import ChatGroq
            import os
            vision_llm = ChatGroq(model="llama-3.2-11b-vision-preview", temperature=0.1, api_key=os.environ.get("GROQ_API_KEY"))
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": base64_image}},
                ]
            )
            res = vision_llm.invoke([message])
        else:
            from ai_pipeline.langchain_setup import get_llm
            llm = get_llm()
            res = llm.invoke(prompt)
            
        text = res.content if hasattr(res, 'content') else str(res)
        
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
            
        parsed = json.loads(text)
        
        # Ensure correct enums and ranges
        cap = int(parsed.get("factoryCapacityUtilization", 50))
        parsed["factoryCapacityUtilization"] = max(0, min(100, cap))
        
        cred = parsed.get("managementCredibility", "Average")
        if cred not in ["Excellent", "Good", "Average", "Poor"]:
            cred = "Average"
        parsed["managementCredibility"] = cred
        
        return {
            "status": "success",
            "data": parsed
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
