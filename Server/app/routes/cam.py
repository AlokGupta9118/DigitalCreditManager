from fastapi import APIRouter, HTTPException
from bson import ObjectId
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
import os
from datetime import datetime

from app.database import (
    credit_cases_collection,
    companies_collection,
    financial_data_collection,
    research_collection,
    risk_collection,
    recommendation_collection,
    cam_collection,
    due_diligence_collection
)
from ai_pipeline.agents.report_generator import generate_report

router = APIRouter(prefix="/cam", tags=["CAM Reports"])

REPORT_FOLDER = "reports"
os.makedirs(REPORT_FOLDER, exist_ok=True)


def _get_finalized_recommendation(case_id: str):
    """Return the finalized recommendation for a case, or None."""
    rec = recommendation_collection.find_one(
        {"creditCaseId": case_id},
        sort=[("createdAt", -1)]
    )
    if rec and rec.get("finalDecision") and rec.get("finalizedAt"):
        return rec
    return None


@router.post("/generate/{case_id}")
def generate_cam(case_id: str):
    """Generate a standard PDF Credit Appraisal Memo. Requires finalized recommendation."""
    try:
        # ── APPROVAL GATE ──────────────────────────────────────────────────────
        finalized_rec = _get_finalized_recommendation(case_id)
        if not finalized_rec:
            raise HTTPException(
                status_code=400,
                detail=(
                    "CAM can only be generated after the credit recommendation has been "
                    "finalized (Accepted or Overridden) by a credit officer. "
                    "Please complete the Loan Recommendation step first."
                )
            )
        if finalized_rec.get("finalStatus") not in ("APPROVED", "REVIEWED"):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"The recommendation was finalized as '{finalized_rec.get('finalStatus')}'. "
                    "CAM can only be generated for APPROVED cases."
                )
            )
        # ───────────────────────────────────────────────────────────────────────

        case = credit_cases_collection.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        company = companies_collection.find_one({"_id": ObjectId(case["companyId"])})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        financials = list(financial_data_collection.find({"creditCaseId": case_id}))
        research = research_collection.find_one({"creditCaseId": case_id})
        risk = risk_collection.find_one({"creditCaseId": case_id})

        filename = f"CAM_{case_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        file_path = f"{REPORT_FOLDER}/{filename}"

        c = canvas.Canvas(file_path, pagesize=letter)
        width, height = letter
        y = height - 50
        margin = 50

        def check_page(needed=40):
            nonlocal y
            if y < needed:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 12)

        # Title
        c.setFont("Helvetica-Bold", 20)
        c.drawString(margin, y, "Credit Appraisal Memo")
        y -= 15
        c.setFont("Helvetica", 10)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(margin, y, f"Generated: {datetime.now().strftime('%d %b %Y %H:%M')} | Case ID: {case_id}")
        c.setFillColorRGB(0, 0, 0)
        y -= 30

        # Company Info
        check_page()
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin, y, "Company Information")
        y -= 25
        c.setFont("Helvetica", 12)
        for label, value in [
            ("Company", company.get("companyName", "N/A")),
            ("Sector", company.get("sector", "N/A")),
            ("Industry", company.get("industry", "N/A")),
            ("CIN", company.get("CIN", "N/A")),
        ]:
            c.drawString(margin + 20, y, f"{label}: {value}")
            y -= 20

        loan_amount = case.get("loanRequestAmount", 0)
        try:
            loan_text = f"Loan Requested: \u20b9{float(loan_amount):,.0f}"
        except Exception:
            loan_text = f"Loan Requested: \u20b9{loan_amount}"
        c.drawString(margin + 20, y, loan_text)
        y -= 30

        # Financial Summary
        if financials:
            check_page()
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin, y, "Financial Summary")
            y -= 25
            c.setFont("Helvetica", 12)
            for f in financials:
                check_page()
                try:
                    text = (f"Year {f.get('financialYear', 'N/A')}: "
                            f"Revenue \u20b9{float(f.get('revenue', 0)):,.0f} | "
                            f"Profit \u20b9{float(f.get('profit', 0)):,.0f} | "
                            f"EBITDA \u20b9{float(f.get('ebitda', 0)):,.0f}")
                except Exception:
                    text = f"Year {f.get('financialYear', 'N/A')}: Financial data"
                lines = simpleSplit(text, "Helvetica", 12, width - 2 * margin)
                for line in lines:
                    c.drawString(margin + 20, y, line)
                    y -= 20
            y -= 10

        # Due Diligence
        dd_data = due_diligence_collection.find_one({"creditCaseId": case_id})
        if dd_data:
            check_page()
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin, y, "Due Diligence (Site Visit)")
            y -= 25
            c.setFont("Helvetica", 12)
            c.drawString(margin + 20, y, f"Management Credibility: {dd_data.get('managementCredibility', 'N/A')}")
            y -= 20
            c.drawString(margin + 20, y, f"Capacity Utilization: {dd_data.get('factoryCapacityUtilization', 'N/A')}%")
            y -= 20
            notes = dd_data.get("visitNotes", "N/A")
            c.setFont("Helvetica-Oblique", 11)
            for line in simpleSplit(f"Visit Notes: {notes}", "Helvetica-Oblique", 11, width - 2 * margin - 40):
                check_page(30)
                c.drawString(margin + 20, y, line)
                y -= 15
            y -= 10

        # Research Insights
        if research and research.get("news"):
            check_page()
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin, y, "Research Insights")
            y -= 25
            for news in research.get("news", [])[:3]:
                check_page()
                c.setFont("Helvetica", 12)
                c.drawString(margin + 20, y, f"\u2022 {news.get('title', 'N/A')[:80]}...")
                y -= 20
                c.setFont("Helvetica-Oblique", 10)
                c.drawString(margin + 40, y, f"Source: {news.get('source', 'N/A')} | Sentiment: {news.get('sentiment', 'N/A')}")
                y -= 20
            y -= 10

        # Risk Score
        if risk:
            check_page()
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin, y, "Risk Assessment")
            y -= 25
            c.setFont("Helvetica", 12)
            c.drawString(margin + 20, y, f"Overall Score: {risk.get('overallScore', 'N/A')}/100")
            y -= 20
            c.drawString(margin + 20, y, f"Risk Grade: {risk.get('riskGrade', 'N/A')}")
            y -= 30

        # Final Recommendation (officer decision)
        check_page()
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin, y, "Credit Officer Decision")
        y -= 25
        c.setFont("Helvetica", 12)

        final_decision = finalized_rec.get("finalDecision", "N/A")
        final_status = finalized_rec.get("finalStatus", "N/A")
        if "APPROVE" in str(final_decision).upper() or final_status == "APPROVED":
            c.setFillColorRGB(0, 0.5, 0)
        else:
            c.setFillColorRGB(0.8, 0, 0)
        c.drawString(margin + 20, y, f"Decision: {final_decision}")
        y -= 20
        c.setFillColorRGB(0, 0, 0)

        ai_decision = finalized_rec.get("decision", "N/A")
        c.drawString(margin + 20, y, f"AI Recommendation: {ai_decision}")
        y -= 20

        try:
            amt_text = f"Sanctioned Amount: \u20b9{float(finalized_rec.get('finalAmount', finalized_rec.get('suggestedLoanAmount', 0))):,.0f}"
        except Exception:
            amt_text = "Sanctioned Amount: N/A"
        c.drawString(margin + 20, y, amt_text)
        y -= 20

        rate = finalized_rec.get("finalRate", finalized_rec.get("interestRate", "TBD"))
        c.drawString(margin + 20, y, f"Interest Rate: {rate}%")
        y -= 20

        c.drawString(margin + 20, y, f"Finalized: {finalized_rec.get('finalizedAt', 'N/A')}")
        y -= 20

        officer_comments = finalized_rec.get("officerComments", "")
        if officer_comments:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(margin + 20, y, "Officer Comments:")
            y -= 18
            c.setFont("Helvetica", 11)
            for line in simpleSplit(officer_comments, "Helvetica", 11, width - 2 * margin - 40):
                check_page(25)
                c.drawString(margin + 40, y, line)
                y -= 15

        # AI Reasoning
        if finalized_rec.get("reasoning"):
            check_page()
            c.setFont("Helvetica-Bold", 12)
            c.drawString(margin + 20, y, "Reasoning:")
            y -= 20
            c.setFont("Helvetica", 11)
            for reason in finalized_rec["reasoning"]:
                check_page(25)
                for line in simpleSplit(f"\u2022 {reason}", "Helvetica", 11, width - 2 * margin - 40):
                    c.drawString(margin + 40, y, line)
                    y -= 15

        c.save()

        # Store CAM record with relative URL (no double-prefix)
        cam_doc = {
            "creditCaseId": case_id,
            "reportUrl": f"reports/{filename}",
            "format": "pdf",
            "generatedAt": datetime.now().isoformat(),
            "caseName": company.get("companyName", "Unknown"),
            "finalDecision": final_decision,
        }
        result = cam_collection.insert_one(cam_doc)

        return {
            "message": "CAM generated successfully",
            "report_id": str(result.inserted_id),
            "report_url": f"reports/{filename}"
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating PDF CAM: {str(e)}")


@router.post("/generate-docx/{case_id}")
async def generate_docx_cam(case_id: str):
    """Generate a professional DOCX Credit Appraisal Memo. Requires finalized recommendation."""
    try:
        # ── APPROVAL GATE ──────────────────────────────────────────────────────
        finalized_rec = _get_finalized_recommendation(case_id)
        if not finalized_rec:
            raise HTTPException(
                status_code=400,
                detail=(
                    "CAM can only be generated after the credit recommendation has been "
                    "finalized (Accepted or Overridden) by a credit officer."
                )
            )
        if finalized_rec.get("finalStatus") not in ("APPROVED", "REVIEWED"):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"The recommendation was finalized as '{finalized_rec.get('finalStatus')}'. "
                    "CAM can only be generated for APPROVED cases."
                )
            )
        # ───────────────────────────────────────────────────────────────────────

        case = credit_cases_collection.find_one({"_id": ObjectId(case_id)})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        company = companies_collection.find_one({"_id": ObjectId(case["companyId"])})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        robust_query = (
            {"$or": [{"creditCaseId": case_id}, {"creditCaseId": ObjectId(case_id)}]}
            if ObjectId.is_valid(case_id) else {"creditCaseId": case_id}
        )

        research = research_collection.find_one(robust_query, sort=[("createdAt", -1)])
        risk = risk_collection.find_one(robust_query, sort=[("createdAt", -1)])

        if not research or not risk:
            raise HTTPException(
                status_code=400,
                detail="Research and Risk Assessment must be completed before generating CAM"
            )

        research_text = research.get("reportText") or research.get("rawResearch", "")
        scorecard_text = risk.get("scorecardText", "")

        if not research_text or not scorecard_text:
            raise HTTPException(
                status_code=400,
                detail=f"Research or Risk report text is missing."
            )

        dd_data = due_diligence_collection.find_one(robust_query)
        dd_text = ""
        if dd_data:
            dd_text = (
                f"Site Visit Observations: {dd_data.get('visitNotes', 'N/A')}\n"
                f"Management Credibility: {dd_data.get('managementCredibility', 'N/A')}\n"
                f"Operational Risks: {dd_data.get('operationalRisks', 'N/A')}\n"
                f"Capacity Utilization: {dd_data.get('factoryCapacityUtilization', 'N/A')}%"
            )

        # Append officer decision to scorecard text for report generator
        officer_decision_text = (
            f"\n\n═══════════ OFFICER DECISION ═══════════\n"
            f"Final Decision: {finalized_rec.get('finalDecision', 'N/A')}\n"
            f"Sanctioned Amount: {finalized_rec.get('finalAmount', finalized_rec.get('suggestedLoanAmount', 'N/A'))}\n"
            f"Interest Rate: {finalized_rec.get('finalRate', finalized_rec.get('interestRate', 'N/A'))}%\n"
            f"Officer Comments: {finalized_rec.get('officerComments', 'None')}\n"
            f"Finalized At: {finalized_rec.get('finalizedAt', 'N/A')}\n"
        )

        filename = f"CAM_{company['companyName'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"

        docx_path = generate_report(
            company_name=company["companyName"],
            research_text=research_text,
            scorecard_text=scorecard_text + officer_decision_text,
            due_diligence_text=dd_text,
            output_filename=filename
        )

        import shutil
        final_path = f"reports/{filename}"
        shutil.move(docx_path, final_path)

        cam_doc = {
            "creditCaseId": case_id,
            "reportUrl": final_path,
            "format": "docx",
            "generatedAt": datetime.now().isoformat(),
            "caseName": company["companyName"],
            "finalDecision": finalized_rec.get("finalDecision"),
        }
        result = cam_collection.insert_one(cam_doc)

        return {
            "message": "Professional DOCX CAM generated successfully",
            "report_id": str(result.inserted_id),
            "report_url": final_path
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating DOCX CAM: {str(e)}")


@router.get("/{case_id}")
def get_cam_reports(case_id: str):
    """Get all CAM reports for a case"""
    reports = list(cam_collection.find({"creditCaseId": case_id}))
    for r in reports:
        r["_id"] = str(r["_id"])
    return reports