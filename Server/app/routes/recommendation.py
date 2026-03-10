from fastapi import APIRouter, HTTPException, BackgroundTasks
from bson import ObjectId
from typing import List
from datetime import datetime
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re

from app.database import recommendation_collection, risk_collection, credit_cases_collection, due_diligence_collection, activity_log_collection
from app.models.recommendation import Recommendation
from app.models.activity_log import create_activity_log

router = APIRouter(prefix="/recommendation", tags=["Recommendation Agent"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=dict)
def add_recommendation(data: Recommendation):
    """Manually add a recommendation"""
    recommendation_collection.insert_one(data.dict())
    return {"status": "recommendation stored"}

@router.post("/run/{case_id}", response_model=dict)
async def run_recommendation_agent(case_id: str):
    """Generate final recommendation based on Risk Scorecard"""
    try:
        # Get case
        case = credit_cases_collection.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        # Get the latest completed risk assessment
        query = {"status": "COMPLETED"}
        if ObjectId.is_valid(case_id):
            query["$or"] = [{"creditCaseId": case_id}, {"creditCaseId": ObjectId(case_id)}]
        else:
            query["creditCaseId"] = case_id

        risk = risk_collection.find_one(query, sort=[("createdAt", -1)])

        if not risk or not risk.get("scorecardText"):
            raise HTTPException(
                status_code=400,
                detail="Completed risk assessment is required before running recommendation"
            )

        scorecard_text = risk.get("scorecardText", "")

        # Parse recommendation from the scorecard
        decision = "Review Required"
        conditions = []

        in_recommendation = False
        lines = scorecard_text.replace('\\n', '\n').split('\n')
        for line in lines:
            if "LENDING RECOMMENDATION" in line:
                in_recommendation = True
                continue

            if in_recommendation:
                if "Decision:" in line:
                    decision = line.split("Decision:")[-1].strip()
                elif "Conditions:" in line:
                    cond_str = line.split("Conditions:")[-1].strip()
                    if cond_str and cond_str.lower() != "none" and cond_str != "[]":
                        conditions = [c.strip() for c in cond_str.split(";")]

        # Parse Red Flags as reasoning
        reasoning = list(conditions) if conditions else []
        in_flags = False
        for line in lines:
            if "RED FLAGS" in line:
                in_flags = True
                continue
            if in_flags:
                if line.strip().startswith("-"):
                    reasoning.append(line.strip()[1:].strip())
                elif line.strip() and not line.strip().startswith("-"):
                    if any(kw in line for kw in ["KEY DATA", "LENDING", "═", "─"]):
                        break

        if not reasoning:
            if "APPROVE" in decision:
                reasoning = ["Strong credit profile based on AI analysis."]
            else:
                reasoning = ["See detailed scorecard for specific concerns."]

        # Math logic
        score = risk.get("overallScore", 50)
        risk_premium = (100 - score) / 10
        suggested_rate = round(9.0 + risk_premium, 2)

        requested = float(case.get("loanRequestAmount", 0))
        ebitda_match = re.search(r'EBITDA.*?([\d.]+)\s*(Cr|Crore)', scorecard_text, re.I)
        revenue_match = re.search(r'Revenue.*?([\d.]+)\s*(Cr|Crore)', scorecard_text, re.I)

        limit_logic = "Haircut based on credit score"
        math_cap = requested

        if ebitda_match:
            val = float(ebitda_match.group(1))
            math_cap = val * 3.0 * 10_000_000  # convert Cr to Rs
            limit_logic = f"Capped at 3x EBITDA ({val} Cr)"
        elif revenue_match:
            val = float(revenue_match.group(1))
            math_cap = val * 0.20 * 10_000_000
            limit_logic = f"Capped at 20% of Revenue ({val} Cr)"

        # Due diligence influence
        robust_query = {"$or": [{"creditCaseId": case_id}, {"creditCaseId": ObjectId(case_id)}]} if ObjectId.is_valid(case_id) else {"creditCaseId": case_id}
        dd_data = due_diligence_collection.find_one(robust_query)
        management_credibility = dd_data.get("managementCredibility", "Average") if dd_data else "Average"

        if management_credibility == "Poor" or score < 40:
            decision = "REJECT"
            reasoning.append(f"CRITICAL: {'Site visit revealed Poor management credibility' if management_credibility == 'Poor' else 'Credit score below minimum threshold (40)'}.")
            suggested_amount = 0.0
        else:
            score_haircut = score / 100.0
            dd_multiplier = 1.1 if management_credibility == "Excellent" else 0.8 if management_credibility == "Poor" else 1.0
            suggested_amount = min(requested, math_cap) * score_haircut * dd_multiplier
            suggested_amount = round(suggested_amount, 2)
            reasoning.append(f"Limit logic: {limit_logic} with {int(score_haircut*100)}% score-adjustment.")

        now = datetime.now().isoformat()
        rec_doc = {
            "creditCaseId": case_id,
            "decision": decision,
            "suggestedLoanAmount": suggested_amount,
            "interestRate": suggested_rate,
            "reasoning": reasoning,
            "managementCredibility": management_credibility,
            "overallRiskScore": score,
            "createdAt": now,
            "updatedAt": now,
            "status": "COMPLETED",
            # finalDecision/finalizedAt are set only after officer action
            "finalDecision": None,
            "finalizedAt": None,
            "finalStatus": None,
            "officerComments": None,
        }

        result = recommendation_collection.insert_one(rec_doc)
        rec_id = str(result.inserted_id)
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"AI Recommendation Generated: {decision}",
            category="RECOMMENDATION",
            case_id=case_id,
            details={"decision": decision, "recId": rec_id}
        )

        return {
            "status": "completed",
            "recommendationId": str(result.inserted_id),
            "message": "Recommendation generated successfully",
            "decision": decision
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case/{case_id}")
async def get_recommendation_by_case(case_id: str):
    """Get the latest AI recommendation for a case"""
    query = {"creditCaseId": case_id, "finalDecision": None}
    rec = recommendation_collection.find_one(
        {"creditCaseId": case_id},
        sort=[("createdAt", -1)]
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec["_id"] = str(rec["_id"])
    return rec


@router.get("/finalize-status/{case_id}")
async def get_finalize_status(case_id: str):
    """Check if the latest recommendation for this case has been finalized by an officer."""
    rec = recommendation_collection.find_one(
        {"creditCaseId": case_id},
        sort=[("createdAt", -1)]
    )
    if not rec:
        return {"finalized": False, "hasRecommendation": False}

    finalized = rec.get("finalDecision") is not None and rec.get("finalizedAt") is not None
    return {
        "finalized": finalized,
        "hasRecommendation": True,
        "finalDecision": rec.get("finalDecision"),
        "finalStatus": rec.get("finalStatus"),
        "finalizedAt": rec.get("finalizedAt"),
        "officerComments": rec.get("officerComments"),
        "aiDecision": rec.get("decision"),
        "recommendationId": str(rec["_id"]),
    }


@router.post("/finalize/{case_id}")
async def finalize_recommendation(case_id: str, data: dict):
    """Finalize the credit decision (Accept or Override). Updates existing recommendation record."""
    try:
        decision = data.get("decision")
        amount = data.get("amount")
        rate = data.get("rate")
        comments = data.get("comments", "")

        if not decision:
            raise HTTPException(status_code=400, detail="Decision is required")

        # Find the latest (non-finalized) recommendation
        rec = recommendation_collection.find_one(
            {"creditCaseId": case_id},
            sort=[("createdAt", -1)]
        )
        if not rec:
            raise HTTPException(status_code=404, detail="No recommendation found to finalize")

        # Determine final status
        dec_upper = decision.upper()
        if "REJECT" in dec_upper:
            final_status = "REJECTED"
        elif "APPROVE" in dec_upper:
            final_status = "APPROVED"
        else:
            final_status = "REVIEWED"

        now = datetime.now().isoformat()

        # UPDATE the existing recommendation record (not insert new)
        recommendation_collection.update_one(
            {"_id": rec["_id"]},
            {"$set": {
                "finalDecision": decision,
                "finalAmount": amount,
                "finalRate": rate,
                "officerComments": comments,
                "finalizedAt": now,
                "finalStatus": final_status,
                "updatedAt": now,
            }}
        )
        
        # Log activity
        create_activity_log(
            activity_log_collection,
            action=f"Credit Officer Decision: {decision}",
            category="RECOMMENDATION",
            case_id=case_id,
            details={"decision": decision, "status": final_status, "comments": comments}
        )

        # Update case status as well
        credit_cases_collection.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": {
                "status": final_status,
                "updatedAt": now,
            }}
        )

        return {
            "status": "success",
            "message": f"Case {decision.lower()} successfully",
            "finalStatus": final_status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Finalization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))