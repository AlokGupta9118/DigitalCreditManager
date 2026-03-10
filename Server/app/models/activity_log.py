from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class ActivityLog(BaseModel):
    creditCaseId: Optional[str] = None
    action: str
    category: str  # e.g., "CASE", "DOCUMENT", "RESEARCH", "RISK", "RECOMMENDATION", "CAM"
    user: str = "System"
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

def create_activity_log(
    db_collection,
    action: str,
    category: str,
    case_id: Optional[str] = None,
    user: str = "System",
    details: Optional[Dict[str, Any]] = None
):
    log_entry = {
        "creditCaseId": case_id,
        "action": action,
        "category": category,
        "user": user,
        "details": details,
        "timestamp": datetime.utcnow()
    }
    try:
        db_collection.insert_one(log_entry)
        return True
    except Exception as e:
        print(f"Failed to create activity log: {e}")
        return False
