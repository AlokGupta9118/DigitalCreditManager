from pydantic import BaseModel
from typing import Optional

class RiskScore(BaseModel):
    creditCaseId: str
    status: str = "PROCESSING"  # PROCESSING, COMPLETED, ERROR
    
    # New 7-category scores
    financialHealthScore: float = 50.0
    creditRatingScore: float = 50.0
    promoterBackgroundScore: float = 50.0
    regulatoryComplianceScore: float = 50.0
    litigationRiskScore: float = 50.0
    sectorPositionScore: float = 50.0
    esgIrregularitiesScore: float = 50.0
    
    overallScore: float = 0.0
    riskGrade: str = "N/A"
    scorecardText: Optional[str] = None
    
    # Legacy fields (kept for compatibility)
    characterScore: Optional[float] = 50.0
    capacityScore: Optional[float] = 50.0
    capitalScore: Optional[float] = 50.0
    collateralScore: Optional[float] = 50.0
    conditionsScore: Optional[float] = 50.0
    
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None