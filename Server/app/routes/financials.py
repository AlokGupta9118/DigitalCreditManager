from fastapi import APIRouter
from app.database import financial_data_collection
from app.models.financial_data import FinancialData

router = APIRouter(prefix="/financials")

@router.post("/")
def add_financial(data: FinancialData):

    financial_data_collection.insert_one(data.dict())

    return {"status": "added"}