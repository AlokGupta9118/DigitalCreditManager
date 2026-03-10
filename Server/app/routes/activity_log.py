from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.database import activity_log_collection
from bson import ObjectId

router = APIRouter(prefix="/activity-log", tags=["Activity Logs"])

def serialize_log(log):
    log["_id"] = str(log["_id"])
    if "timestamp" in log and isinstance(log["timestamp"], datetime):
        log["timestamp"] = log["timestamp"].isoformat()
    return log

@router.get("/")
def get_all_logs(limit: int = Query(50, ge=1, le=100)):
    """Fetch recent global activity logs."""
    logs = list(activity_log_collection.find().sort("timestamp", -1).limit(limit))
    return [serialize_log(log) for log in logs]

@router.get("/case/{case_id}")
def get_logs_by_case(case_id: str, limit: int = Query(50, ge=1, le=100)):
    """Fetch activity logs for a specific credit case."""
    logs = list(activity_log_collection.find({"creditCaseId": case_id}).sort("timestamp", -1).limit(limit))
    return [serialize_log(log) for log in logs]

@router.get("/category/{category}")
def get_logs_by_category(category: str, limit: int = Query(50, ge=1, le=100)):
    """Fetch activity logs by category."""
    logs = list(activity_log_collection.find({"category": category.upper()}).sort("timestamp", -1).limit(limit))
    return [serialize_log(log) for log in logs]
