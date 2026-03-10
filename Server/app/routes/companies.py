from fastapi import APIRouter, HTTPException
from app.database import companies_collection
from app.models.company import Company
from bson import ObjectId

router = APIRouter(prefix="/companies", tags=["Companies"])

def _enrich_company(c: dict) -> dict:
    """Add computed fields to a company document."""
    c["_id"] = str(c["_id"])
    # Build flat promoterNames list from nested promoters array
    promoters = c.get("promoters", [])
    c["promoterNames"] = [p.get("name", "") for p in promoters if p.get("name")]
    return c

@router.post("/")
def create_company(company: Company):
    try:
        result = companies_collection.insert_one(company.dict())
        return {"id": str(result.inserted_id), "message": "Company created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating company: {str(e)}")

@router.get("/")
def get_companies():
    companies = list(companies_collection.find())
    return [_enrich_company(c) for c in companies]

@router.get("/{company_id}")
def get_company(company_id: str):
    try:
        company = companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return _enrich_company(company)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching company: {str(e)}")