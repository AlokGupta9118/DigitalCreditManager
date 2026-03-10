from pydantic import BaseModel
from typing import List, Optional

class Promoter(BaseModel):
    name: str
    shareholding: float
    DIN: Optional[str] = None

class Company(BaseModel):
    companyName: str
    CIN: str
    sector: str
    industry: str
    registeredAddress: str
    promoters: List[Promoter]