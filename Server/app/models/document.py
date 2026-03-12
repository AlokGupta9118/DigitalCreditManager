from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Document(BaseModel):
    creditCaseId: str
    documentType: str
    financialYear: str
    fileUrl: str
    fileName: str
    fileSize: int
    uploadDate: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: str = "Uploaded"  # Uploaded, Processing, Extracted, Error
    updatedAt: Optional[str] = None

class DocumentResponse(Document):
    id: str = Field(alias="_id")
    companyName: Optional[str] = None
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "creditCaseId": "507f1f77bcf86cd799439012",
                "documentType": "GST Returns",
                "financialYear": "2023-2024",
                "fileUrl": "/uploads/20240315_123045_annual_report.pdf",
                "fileName": "annual_report.pdf",
                "fileSize": 1048576,
                "uploadDate": "2024-03-15T12:30:45.123Z",
                "status": "Uploaded"
            }
        }