import os
from dotenv import load_dotenv
from pymongo import MongoClient
import certifi

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = MongoClient(
    MONGO_URL,
    tlsCAFile=certifi.where()
)

db = client["credit_ai_system"]

users_collection = db["users"]
companies_collection = db["companies"]
credit_cases_collection = db["credit_cases"]
documents_collection = db["documents"]
financial_data_collection = db["financial_data"]
research_collection = db["research"]
risk_collection = db["risk_scores"]
recommendation_collection = db["recommendations"]
due_diligence_collection = db["due_diligence"]
cam_collection = db["cam_reports"]
activity_log_collection = db["activity_logs"]
