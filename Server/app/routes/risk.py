from fastapi import APIRouter, HTTPException, BackgroundTasks
from bson import ObjectId
from typing import Optional
from datetime import datetime
import logging
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.database import risk_collection, research_collection, credit_cases_collection, companies_collection, activity_log_collection
from app.models.risk_score import RiskScore
from app.models.activity_log import create_activity_log
from ai_pipeline.agents.credit_scoring_agent import run_credit_scoring
from app.workflow_manager import WorkflowOrchestrator

router = APIRouter(prefix="/risk", tags=["Credit Appraisal Engine"])
logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=2)

@router.post("/", response_model=dict)
def add_risk_score(score: RiskScore):
    """Manually add a risk score"""
    risk_collection.insert_one(score.dict())
    return {"status": "risk stored"}

@router.post("/run/{case_id}", response_model=dict)
async def run_risk_agent(case_id: str, background_tasks: BackgroundTasks = None):
    """Run the Credit Scoring Agent for a credit case"""
    try:
        # Get case and company
        case = credit_cases_collection.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
            
        company = companies_collection.find_one({"_id": ObjectId(case["companyId"])})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
            
        company_name = company.get("companyName", "Unknown")

        # Get latest research
        research = research_collection.find_one(
            {"creditCaseId": case_id, "status": "COMPLETED"},
            sort=[("createdAt", -1)]
        )
        
        if not research or not research.get("rawResearch"):
            raise HTTPException(
                status_code=400, 
                detail="Completed research report is required before running risk assessment"
            )
            
        research_text = research.get("rawResearch")

        # Create initial risk record to show it's processing
        initial_risk = {
            "creditCaseId": case_id,
            "status": "PROCESSING",
            "createdAt": datetime.now().isoformat()
        }
        
        result = risk_collection.insert_one(initial_risk)
        risk_id = str(result.inserted_id)
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"Risk Assessment Started: {company_name}",
            category="RISK",
            case_id=case_id,
            details={"companyName": company_name, "riskId": risk_id}
        )

        # Get due diligence findings
        from app.database import due_diligence_collection
        dd_data = due_diligence_collection.find_one({"creditCaseId": case_id})
        dd_text = ""
        if dd_data:
            dd_text = f"Site Visit Observations: {dd_data.get('visitNotes', 'N/A')}\n" \
                      f"Management Credibility: {dd_data.get('managementCredibility', 'N/A')}\n" \
                      f"Operational Risks observed: {dd_data.get('operationalRisks', 'N/A')}\n" \
                      f"Factory Capacity Utilization: {dd_data.get('factoryCapacityUtilization', 'N/A')}%"
        else:
            dd_text = "No site visit or due diligence data available."

        # Get extracted financial data from documents
        from app.database import financial_data_collection, documents_collection
        docs = list(documents_collection.find({"creditCaseId": case_id}))
        doc_ids = [str(d["_id"]) for d in docs]
        
        financials = list(financial_data_collection.find({"documentId": {"$in": doc_ids}}))
        financial_metrics_text = ""
        for f in financials:
            doc_type = f.get("documentType", "Unknown")
            fy = f.get("financialYear", "N/A")
            data = f.get("data", {})
            if data:
                financial_metrics_text += f"\n--- EXTRACTED {doc_type} (FY {fy}) ---\n"
                for key, val in data.items():
                    if val is not None:
                        financial_metrics_text += f"{key}: {val}\n"

        # Capture the event loop now (we're in an async context) and pass it to the thread
        loop = asyncio.get_running_loop()
        loop.run_in_executor(
            executor,
            execute_risk_and_store_sync,
            risk_id,
            case_id,
            company_name,
            research_text,
            dd_text,
            financial_metrics_text,
            loop
        )

        return {
            "status": "PROCESSING",
            "riskId": risk_id,
            "message": "Risk assessment started in background",
            "creditCaseId": case_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting risk assessment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start risk assessment: {str(e)}")

def execute_risk_and_store_sync(
    risk_id: str,
    case_id: str,
    company_name: str,
    research_text: str,
    due_diligence_text: str = "",
    financial_metrics_text: str = "",
    main_loop: Optional[asyncio.AbstractEventLoop] = None
):
    try:
        # Run agent
        scoring_result = run_credit_scoring(
            company_name, 
            research_text, 
            due_diligence_text, 
            financial_metrics_text,
            interactive=False
        )
        scorecard_text = scoring_result.get("scorecard", "")
        
        # Parse scorecard for basic values and individual category scores
        overall_score = 50.0
        risk_grade = "Moderate"
        
        category_scores = {
            "financialHealthScore": 50.0,
            "creditRatingScore": 50.0,
            "promoterBackgroundScore": 50.0,
            "regulatoryComplianceScore": 50.0,
            "litigationRiskScore": 50.0,
            "sectorPositionScore": 50.0,
            "esgIrregularitiesScore": 50.0
        }
        
        import re
        lines = scorecard_text.split("\n")
        for line in lines:
            if "OVERALL SCORE:" in line:
                match = re.search(r'OVERALL SCORE:.*?([\d.]+)/100', line)
                if match:
                    overall_score = float(match.group(1))
            elif "CREDIT RATING:" in line:
                risk_grade = line.split("CREDIT RATING:")[-1].strip()
            
            # Map categories from scorecard text if possible
            if "1. Financial Health" in line:
                match = re.search(r'(\d+)\s+30%', line)
                if match: category_scores["financialHealthScore"] = float(match.group(1))
            elif "2. Credit Rating" in line:
                match = re.search(r'(\d+)\s+15%', line)
                if match: category_scores["creditRatingScore"] = float(match.group(1))
            elif "3. Promoter Background" in line:
                match = re.search(r'(\d+)\s+15%', line)
                if match: category_scores["promoterBackgroundScore"] = float(match.group(1))
            elif "4. Regulatory Compliance" in line:
                match = re.search(r'(\d+)\s+10%', line)
                if match: category_scores["regulatoryComplianceScore"] = float(match.group(1))
            elif "5. Litigation Risk" in line:
                match = re.search(r'(\d+)\s+10%', line)
                if match: category_scores["litigationRiskScore"] = float(match.group(1))
            elif "6. Sector & Market Position" in line:
                match = re.search(r'(\d+)\s+10%', line)
                if match: category_scores["sectorPositionScore"] = float(match.group(1))
            elif "7. ESG & Irregularities" in line or "7. ESG Score" in line:
                match = re.search(r'(\d+)\s+', line)
                if match: category_scores["esgIrregularitiesScore"] = float(match.group(1))
        
        # Update risk record
        update_data = {
            "status": "COMPLETED",
            "overallScore": overall_score,
            "riskGrade": risk_grade,
            "scorecardText": scorecard_text,
            "updatedAt": datetime.now().isoformat(),
            **category_scores
        }
        
        risk_collection.update_one(
            {"_id": ObjectId(risk_id)},
            {"$set": update_data}
        )
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"Risk Assessment Completed: {company_name}",
            category="RISK",
            case_id=case_id,
            details={"companyName": company_name, "riskId": risk_id, "score": overall_score, "grade": risk_grade}
        )

        # Also sync riskScore back to the CreditCase document so Dashboard shows it
        try:
            credit_cases_collection.update_one(
                {"_id": ObjectId(case_id)},
                {"$set": {"riskScore": overall_score, "updatedAt": datetime.now().isoformat()}}
            )
        except Exception as sync_err:
            logger.warning(f"Could not sync riskScore to case {case_id}: {sync_err}")

        logger.info(f"Risk assessment {risk_id} completed for case {case_id}")
        
        # Trigger next workflow steps safely from the thread
        try:
            if main_loop and main_loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    WorkflowOrchestrator.trigger_next_steps(case_id, "RISK"),
                    main_loop
                )
            else:
                logger.warning("No running event loop available, skipping workflow trigger")
        except Exception as wf_err:
            logger.warning(f"Could not trigger next workflow steps: {wf_err}")
        
    except Exception as e:
        logger.error(f"Risk assessment failed: {str(e)}", exc_info=True)
        risk_collection.update_one(
            {"_id": ObjectId(risk_id)},
            {"$set": {
                "status": "ERROR",
                "overallScore": 0,
                "riskGrade": "Error",
                "scorecardText": f"Assessment failed: {str(e)}",
                "updatedAt": datetime.now().isoformat()
            }}
        )

@router.get("/{risk_id}/status")
async def get_risk_status(risk_id: str):
    """Get the status of a risk assessment"""
    try:
        risk = risk_collection.find_one({"_id": ObjectId(risk_id)})
        if not risk:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        
        return {
            "status": risk.get("status", "UNKNOWN"),
            "message": risk.get("scorecardText") if risk.get("status") == "ERROR" else ("Risk assessment is completed" if risk.get("status") == "COMPLETED" else "Risk assessment is in progress"),
            "overallScore": risk.get("overallScore")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid risk ID: {str(e)}")

@router.get("/case/{case_id}")
async def get_risk_by_case(case_id: str):
    """Get the latest risk assessment for a case"""
    # Try both string and ObjectId for compatibility
    query = {
        "$or": [
            {"creditCaseId": case_id},
            {"creditCaseId": ObjectId(case_id)}
        ]
    } if ObjectId.is_valid(case_id) else {"creditCaseId": case_id}
    
    risk = risk_collection.find_one(
        query,
        sort=[("createdAt", -1)]
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    risk["_id"] = str(risk["_id"])
    return risk