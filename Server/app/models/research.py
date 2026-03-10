from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class News(BaseModel):
    title: str
    source: str
    url: str
    sentiment: str  # positive/negative/neutral
    date: Optional[str] = None
    summary: Optional[str] = None

class HypothesisResult(BaseModel):
    hypothesis: str
    result: str  # CONFIRMED / DENIED / INCONCLUSIVE
    evidence: str
    confidence: Optional[float] = None

class RiskAssessment(BaseModel):
    level: str  # LOW / MEDIUM / HIGH
    confidence: float
    reasoning: str

class CreditRating(BaseModel):
    agency: Optional[str] = None
    longTermRating: Optional[str] = None
    shortTermRating: Optional[str] = None
    outlook: Optional[str] = None  # Stable/Positive/Negative
    lastAction: Optional[str] = None
    confidence: Optional[float] = None
    rationale: Optional[str] = None

class FinancialMetric(BaseModel):
    value: float
    year: Optional[str] = None
    unit: str = "crores"

class FinancialAnalysis(BaseModel):
    revenue: List[Dict[str, Any]] = []  # [{"year": "FY24", "value": 100.5}]
    netProfit: List[Dict[str, Any]] = []
    ebitdaMargin: Optional[float] = None
    netProfitMargin: Optional[float] = None
    debtToEquity: Optional[float] = None
    currentRatio: Optional[float] = None
    interestCoverage: Optional[float] = None
    dscr: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    workingCapitalCycle: Optional[int] = None
    cashFlowFromOps: Optional[float] = None
    freeCashFlow: Optional[float] = None
    confidence: Optional[float] = None

class PromoterInfo(BaseModel):
    name: str
    din: Optional[str] = None
    otherDirectorships: List[str] = []
    legalIssues: List[str] = []
    politicalConnections: Optional[str] = None
    wilfulDefaulter: bool = False
    confidence: Optional[float] = None

class Litigation(BaseModel):
    caseName: str
    court: str
    status: str
    amountInvolved: Optional[float] = None
    riskLevel: str = "MEDIUM"  # LOW/MEDIUM/HIGH

class Irregularity(BaseModel):
    description: str
    evidence: str
    severity: str  # LOW/MEDIUM/HIGH

class Research(BaseModel):
    # Core identifiers
    creditCaseId: str
    companyName: str
    researchDate: datetime = datetime.now()
    
    # Full research data
    companyOverview: Optional[Dict[str, Any]] = None
    creditRating: Optional[CreditRating] = None
    financialAnalysis: Optional[FinancialAnalysis] = None
    sectorBenchmark: Optional[Dict[str, Any]] = None
    promoterBackground: Optional[List[PromoterInfo]] = []
    regulatoryRisk: Optional[Dict[str, Any]] = None
    litigationRisk: Optional[Dict[str, Any]] = None
    irregularities: Optional[List[Irregularity]] = []
    hypothesisTesting: Optional[List[HypothesisResult]] = []
    
    # News and insights
    news: List[News] = []
    sectorInsights: List[str] = []
    
    # Final assessment
    overallRisk: Optional[str] = None  # LOW/MEDIUM/HIGH
    keyStrengths: List[str] = []
    keyConcerns: List[str] = []
    creditOpinion: Optional[str] = None
    recommendedLoanTerms: Optional[str] = None
    overallConfidence: Optional[float] = None
    
    # Raw research data from agent
    rawResearch: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }