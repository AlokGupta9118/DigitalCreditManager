from datetime import datetime
import logging
import asyncio
from typing import Optional, List
from bson import ObjectId

from app.database import (
    credit_cases_collection, 
    companies_collection, 
    research_collection, 
    risk_collection, 
    due_diligence_collection, 
    recommendation_collection,
    documents_collection,
    activity_log_collection
)
from app.models.activity_log import create_activity_log

logger = logging.getLogger(__name__)

class WorkflowOrchestrator:
    @staticmethod
    async def trigger_next_steps(case_id: str, current_stage: str):
        """
        Orchestrates the transition between credit engine stages.
        Stages: DOCUMENTS -> RESEARCH -> RISK -> RECOMMENDATION -> CAM
        """
        try:
            # We use local imports inside methods to avoid circular dependency
            logger.info(f"Orchestrating workflow for case {case_id} after {current_stage}")
            
            if current_stage == "DOCUMENTS":
                await WorkflowOrchestrator._handle_documents_completed(case_id)
            
            elif current_stage == "RESEARCH":
                await WorkflowOrchestrator._handle_research_completed(case_id)
                
            elif current_stage == "DUE_DILIGENCE":
                await WorkflowOrchestrator._handle_due_diligence_completed(case_id)
                
            elif current_stage == "RISK":
                await WorkflowOrchestrator._handle_risk_completed(case_id)
                
            elif current_stage == "RECOMMENDATION":
                await WorkflowOrchestrator._handle_recommendation_completed(case_id)

        except Exception as e:
            logger.error(f"Workflow orchestration error for case {case_id}: {e}")

    @staticmethod
    async def _handle_documents_completed(case_id: str):
        """After a document is extracted, try starting Research if not already started."""
        # Check if research already exists
        research = research_collection.find_one({"creditCaseId": case_id})
        if research:
            logger.info(f"Research already exists or in progress for case {case_id}. Skipping auto-trigger.")
            return

        # Fetch case and company info to trigger research
        case = credit_cases_collection.find_one({"_id": ObjectId(case_id)})
        if not case: return
        
        company = companies_collection.find_one({"_id": ObjectId(case["companyId"])})
        if not company: return

        logger.info(f"Auto-triggering Research agent for {company['companyName']}")
        
        create_activity_log(
            activity_log_collection,
            action=f"Auto-Triggered Intelligence Research: {company['companyName']}",
            category="RESEARCH",
            case_id=case_id,
            details={"trigger": "Document Extraction Completed"}
        )
        
        # We need a BackgroundTasks object? Or just call the function.
        # Since we are already in an async context (likely a background task), 
        # we can just call the route logic or the execution function directly.
        from app.routes.research import run_research
        # Note: run_research normally expects BackgroundTasks from FastAPI, but we can pass None 
        # if we want it to run synchronously in our current worker thread.
        # Better yet, let's just trigger it.
        await run_research(
            creditCaseId=case_id,
            companyName=company["companyName"],
            promoterNames=company.get("promoterNames", []),
            sector=company.get("sector", "General")
        )

    @staticmethod
    async def _handle_research_completed(case_id: str):
        """After Research is done, check if DD is done to trigger Risk Assessment."""
        # Check if Research is COMPLETED
        research = research_collection.find_one(
            {"creditCaseId": case_id, "status": "COMPLETED"},
            sort=[("createdAt", -1)]
        )
        if not research: return

        # Check if Due Diligence is recorded
        dd = due_diligence_collection.find_one({"creditCaseId": case_id})
        if not dd:
            logger.info(f"Research completed but Due Diligence pending for case {case_id}. Automation paused.")
            return

        # Trigger Risk
        await WorkflowOrchestrator._trigger_risk_assessment(case_id)

    @staticmethod
    async def _handle_due_diligence_completed(case_id: str):
        """After DD is saved, check if Research is done to trigger Risk Assessment."""
        # Check if Research is COMPLETED
        research = research_collection.find_one(
            {"creditCaseId": case_id, "status": "COMPLETED"},
            sort=[("createdAt", -1)]
        )
        if not research:
            logger.info(f"Due Diligence saved but Research pending for case {case_id}. Automation paused.")
            return

        # Trigger Risk
        await WorkflowOrchestrator._trigger_risk_assessment(case_id)

    @staticmethod
    async def _handle_risk_completed(case_id: str):
        """After Risk Scoring is done, trigger Recommendation."""
        # Check if Risk is COMPLETED
        risk = risk_collection.find_one(
            {"creditCaseId": case_id, "status": "COMPLETED"},
            sort=[("createdAt", -1)]
        )
        if not risk: return

        logger.info(f"Auto-triggering Recommendation agent for case {case_id}")
        
        create_activity_log(
            activity_log_collection,
            action="Auto-Triggered Credit Recommendation",
            category="RECOMMENDATION",
            case_id=case_id,
            details={"trigger": "Risk Assessment Completed"}
        )
        
        from app.routes.recommendation import run_recommendation_agent
        await run_recommendation_agent(case_id)

    @staticmethod
    async def _handle_recommendation_completed(case_id: str):
        """After Recommendation is finalized, auto-trigger CAM Generation."""
        # We check if Recommendation is finalized (has a finalDecision)
        rec = recommendation_collection.find_one(
            {"creditCaseId": case_id, "finalDecision": {"$ne": None}},
            sort=[("createdAt", -1)]
        )
        if not rec: return

        logger.info(f"Auto-triggering CAM Generation for case {case_id}")
        
        create_activity_log(
            activity_log_collection,
            action="Auto-Triggered Final Memo (CAM) Generation",
            category="CAM",
            case_id=case_id,
            details={"trigger": "Officer Decision Finalized"}
        )
        
        from app.routes.cam import generate_docx_cam
        await generate_docx_cam(case_id)

    @staticmethod
    async def _trigger_risk_assessment(case_id: str):
        """Internal helper to start Risk Scoring if not already in progress."""
        existing_risk = risk_collection.find_one(
            {"creditCaseId": case_id, "status": "PROCESSING"}
        )
        if existing_risk:
            logger.info(f"Risk assessment already in progress for {case_id}")
            return

        logger.info(f"Auto-triggering Risk Assessment for case {case_id}")
        
        create_activity_log(
            activity_log_collection,
            action="Auto-Triggered Risk Scoring",
            category="RISK",
            case_id=case_id,
            details={"trigger": "Research & Due Diligence Completed"}
        )
        
        from app.routes.risk import run_risk_agent
        await run_risk_agent(case_id)
