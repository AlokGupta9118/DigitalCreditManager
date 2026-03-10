from pydantic import BaseModel, Field, validator

class FinancialData(BaseModel):
    creditCaseId: str
    financialYear: str = Field(..., pattern=r"^\d{4}-\d{4}$")  # Changed from 'regex' to 'pattern'
    revenue: float = Field(..., ge=0)
    profit: float = Field(..., ge=0)
    ebitda: float = Field(..., ge=0)
    gstTurnover: float = Field(..., ge=0)
    bankCredits: float = Field(..., ge=0)
    debt: float = Field(..., ge=0)
    netWorth: float = Field(..., ge=0)

    @validator('profit')
    def profit_not_exceed_revenue(cls, v, values):
        if 'revenue' in values and v > values['revenue']:
            raise ValueError('Profit cannot exceed revenue')
        return v