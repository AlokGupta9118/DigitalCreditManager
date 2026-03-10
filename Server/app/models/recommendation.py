from pydantic import BaseModel
from typing import List

class Recommendation(BaseModel):

    creditCaseId: str

    decision: str
    suggestedLoanAmount: float
    interestRate: float

    reasoning: List[str]