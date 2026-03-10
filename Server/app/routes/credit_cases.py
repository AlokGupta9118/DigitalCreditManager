from fastapi import APIRouter, HTTPException
from app.database import credit_cases_collection, companies_collection, risk_collection, activity_log_collection
from app.models.credit_case import CreditCase
from app.models.activity_log import create_activity_log
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/cases", tags=["Credit Cases"])

def _enrich_case(case: dict) -> dict:
    """Enrich a case document with company info and latest risk score."""
    case["_id"] = str(case["_id"])

    # Join company data
    company = None
    try:
        if case.get("companyId"):
            company = companies_collection.find_one({"_id": ObjectId(case["companyId"])})
    except Exception:
        pass

    if company:
        case["borrowerName"] = company.get("companyName", "")
        case["companyName"] = company.get("companyName", "")
        case["sector"] = company.get("sector", "")
        case["industry"] = company.get("industry", "")
        promoters = company.get("promoters", [])
        case["promoterNames"] = [p.get("name", "") for p in promoters if p.get("name")]

    # Ensure timestamps exist for older docs
    if not case.get("createdAt"):
        case["createdAt"] = datetime.now().isoformat()
    if not case.get("updatedAt"):
        case["updatedAt"] = case["createdAt"]

    # Ensure riskScore is up to date from risk collection
    # (it may have been set when risk agent completed; keep DB value)
    if case.get("riskScore") is None:
        # Try fetching from risk_collection as fallback
        try:
            risk = risk_collection.find_one(
                {"creditCaseId": case["_id"], "status": "COMPLETED"},
                sort=[("createdAt", -1)]
            )
            if risk and risk.get("overallScore") is not None:
                case["riskScore"] = risk["overallScore"]
        except Exception:
            pass

    return case


@router.post("/")
def create_case(case: CreditCase):
    try:
        case_dict = case.dict()
        # Ensure timestamps are set
        now = datetime.now().isoformat()
        case_dict.setdefault("createdAt", now)
        case_dict.setdefault("updatedAt", now)

        # Populate borrowerName from company
        try:
            company = companies_collection.find_one({"_id": ObjectId(case_dict["companyId"])})
            if company:
                case_dict["borrowerName"] = company.get("companyName", "")
        except Exception:
            pass

        result = credit_cases_collection.insert_one(case_dict)
        case_id = str(result.inserted_id)
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"Credit Case Created: {case_dict.get('loanPurpose', 'N/A')}",
            category="CASE",
            case_id=case_id,
            details={"loanAmount": case_dict.get("loanRequestAmount"), "companyId": case_dict.get("companyId")}
        )
        
        return {"case_id": case_id, "message": "Case created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating case: {str(e)}")


@router.get("/")
def get_cases():
    cases = list(credit_cases_collection.find())
    return [_enrich_case(c) for c in cases]


@router.get("/{case_id}")
def get_case(case_id: str):
    try:
        case = credit_cases_collection.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        return _enrich_case(case)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching case: {str(e)}")