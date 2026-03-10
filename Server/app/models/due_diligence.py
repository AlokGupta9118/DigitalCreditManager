from pydantic import BaseModel

class DueDiligence(BaseModel):

    creditCaseId: str

    factoryCapacityUtilization: float
    managementCredibility: str
    operationalRisks: str
    visitNotes: str