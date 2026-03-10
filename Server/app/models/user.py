from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="analyst", pattern="^(admin|analyst|viewer)$")  
    organization: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    organization: Optional[str] = None
    created_at: Optional[str] = None

class UserInDB(UserCreate):
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: datetime