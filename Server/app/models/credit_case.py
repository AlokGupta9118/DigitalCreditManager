from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CreditCase(BaseModel):
    companyId: str
    loanRequestAmount: float
    loanPurpose: str
    status: str = "Under Review"
    riskScore: Optional[float] = None
    caseType: str = "Term Loan"
    borrowerName: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.now().isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now().isoformat())