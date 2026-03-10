from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime

from app.database import users_collection
from app.models.user import UserCreate, UserLogin, UserResponse
from app.utils.hash import hash_password, verify_password
from app.utils.jwt import create_access_token, verify_token

router = APIRouter(prefix="/users", tags=["Users"])
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("user_id")
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/register")
def register_user(user: UserCreate):
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Truncate password if too long (bcrypt limitation)
    if len(user.password) > 72:
        user.password = user.password[:72]

    user_dict = user.dict()
    user_dict["password"] = hash_password(user.password)
    user_dict["created_at"] = datetime.now().isoformat()
    
    result = users_collection.insert_one(user_dict)

    return {
        "user_id": str(result.inserted_id), 
        "message": "User registered successfully"
    }

@router.post("/login")
def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Truncate password if too long for verification
    password_to_verify = user.password
    if len(password_to_verify) > 72:
        password_to_verify = password_to_verify[:72]

    if not verify_password(password_to_verify, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_access_token({
        "user_id": str(db_user["_id"]), 
        "email": db_user["email"]
    })
    
    # Don't send password in response
    user_response = {
        "id": str(db_user["_id"]),
        "email": db_user["email"],
        "name": db_user.get("name", ""),
        "role": db_user.get("role", "analyst"),
        "organization": db_user.get("organization")
    }

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user.get("name", ""),
        email=current_user["email"],
        role=current_user.get("role", "analyst"),
        organization=current_user.get("organization")
    )

@router.get("/")
def get_all_users():
    users = list(users_collection.find())
    for u in users:
        u["_id"] = str(u["_id"])
        u.pop("password", None)  # Remove password from response
    return users