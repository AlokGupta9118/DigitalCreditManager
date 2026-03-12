from typing import List, Optional
from pydantic import BaseModel

class DueDiligence(BaseModel):
    creditCaseId: str
    factoryCapacityUtilization: float
    managementCredibility: str
    operationalRisks: str
    visitNotes: str
    sitePhotos: Optional[List[str]] = []