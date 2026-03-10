from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from typing import Optional

from app.database import due_diligence_collection
from app.models.due_diligence import DueDiligence

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
            return {"status": "updated", "message": "Due diligence findings updated"}
        else:
            update_data["createdAt"] = datetime.now().isoformat()
            due_diligence_collection.insert_one(update_data)
            return {"status": "created", "message": "Due diligence findings saved"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/case/{case_id}", response_model=Optional[dict])
async def get_due_diligence_by_case(case_id: str):
    """Retrieve due diligence findings for a specific case"""
    data = due_diligence_collection.find_one({"creditCaseId": case_id})
    if not data:
        return None
    
    data["_id"] = str(data["_id"])
    return data
