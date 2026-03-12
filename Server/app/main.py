from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from app.routes import (
    companies, credit_cases, documents, financials, 
    research, risk, recommendation, users, cam,
    due_diligence, activity_log
)
from app.database import users_collection

app = FastAPI(
    title="AI Credit Decision Engine",
    description="Backend API for AI-Powered Credit Analysis Platform",
    version="1.0.0"
)

# Configure CORS with all necessary ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000", 
        "http://localhost:8080",  # Add your current frontend port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081"

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Ensure reports and uploads directories exist
os.makedirs("reports", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# Serve generated reports and uploads
app.mount("/reports", StaticFiles(directory="reports"), name="reports")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include all routers
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(credit_cases.router)
app.include_router(documents.router)
app.include_router(financials.router)
app.include_router(research.router)
app.include_router(risk.router)
app.include_router(recommendation.router)
app.include_router(due_diligence.router)
app.include_router(cam.router)
app.include_router(activity_log.router)

@app.get("/")
async def root():
    return {
        "message": "Credit AI Backend Running",
        "version": "1.0.0",
        "status": "active",
        "endpoints": [
            "/users",
            "/companies",
            "/cases",
            "/documents",
            "/financials",
            "/research",
            "/risk",
            "/recommendations",
            "/cam",
            "/activity-log"
        ]
    }

@app.get("/health")
async def health_check():
    try:
        # Test database connection
        users_collection.find_one()
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    }
