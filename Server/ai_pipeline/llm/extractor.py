"""
LLM Extractor — Uses Ollama to extract structured financial data from raw text.
Handles document classification and data extraction in Indian financial context.
"""
import json
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def _get_llm():
    """Get the optimized LLM with fallbacks from langchain_setup."""
    try:
        from langchain_setup import get_llm
        return get_llm(temperature=0.0) # Zero temperature for precision extraction
    except ImportError:
        try:
            from ai_pipeline.langchain_setup import get_llm
            return get_llm(temperature=0.0)
        except ImportError:
            logger.warning("langchain_setup not found. Falling back to basic Ollama.")
            return None


def classify_document(text: str, model: str = "llama3") -> Dict:
    """
    Use LLM to classify the type of financial document.
    """
    llm = _get_llm()
    snippet = text[:3000] # Slightly more context for classification

    prompt = f"""You are a specialized financial document classifier for Indian corporate credit analysis.
Your goal is to accurately identify the document type from the provided snippet.

CONTEXT: Indian Banking & Credit Analysis
CATEGORIES:
- GST_RETURN: GSTR-1, GSTR-3B, GSTR-9, GST registration
- ITR: Income Tax Returns (Forms 1-7), Tax audit reports (3CD)
- BANK_STATEMENT: Periodic transaction records from any Indian bank
- ANNUAL_REPORT: Full year company reports (Directors' report, auditors' report)
- FINANCIAL_STATEMENT: Balance sheets, Profit & Loss (P&L), Cash flow statements
- LEGAL_NOTICE: Litigation filings, court orders (eCourts), legal notices
- SANCTION_LETTER: Loan approval/sanction letters from other banks
- BOARD_MINUTES: Minutes of board of directors or committee meetings
- RATING_REPORT: Credit rating reports from CRISIL, ICRA, CARE, India Ratings, etc.
- SHAREHOLDING: Detailed shareholding patterns
- QUALITATIVE_NOTE: Observations, due diligence notes, or market feedback
- OTHER: Use only if none of the above match clearly

DOCUMENT TEXT (SNIPPET):
\"\"\"
{snippet}
\"\"\"

Respond ONLY with valid JSON in this exact format:
{{"document_type": "CATEGORY_NAME", "confidence": 0.0-1.0, "reasoning": "brief explanation"}}
"""

    try:
        if llm:
            response = llm.invoke(prompt)
            content = response.content if hasattr(response, 'content') else str(response)
        else:
            # Absolute fallback to raw Ollama
            import ollama
            resp = ollama.chat(model=model, messages=[{"role": "user", "content": prompt}], format="json")
            content = resp["message"]["content"]
            
        # Robust JSON parsing
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        result = json.loads(content)
        logger.info(f"Document classified as: {result.get('document_type', 'UNKNOWN')} with {result.get('confidence', 0)} confidence")
        return result
    except Exception as e:
        logger.warning(f"LLM classification failed: {e}. Defaulting to OTHER.")
        return {
            "document_type": "OTHER",
            "confidence": 0.0,
            "reasoning": f"Classification failed: {str(e)}",
        }


def extract_financial_data(text: str, document_type: str, model: str = "llama3") -> Dict:
    """
    Use High-Reasoning LLM (Groq 70B) to extract structured financial data.
    """
    llm = _get_llm()
    
    # Increase context window for complex financial documents
    truncated_text = text[:12000] # Groq supports larger context, use it for better extraction

    extraction_prompt = _get_extraction_prompt(document_type, truncated_text)

    try:
        if llm:
            response = llm.invoke(extraction_prompt)
            content = response.content if hasattr(response, 'content') else str(response)
        else:
            import ollama
            resp = ollama.chat(model=model, messages=[{"role": "user", "content": extraction_prompt}], format="json")
            content = resp["message"]["content"]

        # Robust JSON cleaning
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        result = json.loads(content)
        logger.info(f"Extracted {len(result)} fields from {document_type} with high accuracy model")
        return result
    except Exception as e:
        logger.error(f"LLM extraction failed for {document_type}: {e}")
        return {"extraction_error": str(e), "raw_text_preview": text[:500]}


def _get_extraction_prompt(document_type: str, text: str) -> str:
    """Generate document-type-specific extraction prompts."""

    base_instruction = (
        "You are a financial data extraction expert specializing in Indian corporate documents. "
        "Extract ALL relevant financial information from the following document text. "
        "Use INR (Indian Rupees) for all monetary values. "
        "Return ONLY valid JSON.\n\n"
    )

    prompts = {
        "GST_RETURN": f"""{base_instruction}
Extract GST return data from this document:
\"\"\"{text}\"\"\"

Return JSON with these fields (use null if not found):
{{
    "gstin": "GSTIN number",
    "legal_name": "Business name",
    "tax_period": "Month/Quarter and Year",
    "return_type": "GSTR-1 / GSTR-3B / GSTR-2A",
    "total_taxable_value": 0.0,
    "total_igst": 0.0,
    "total_cgst": 0.0,
    "total_sgst": 0.0,
    "total_cess": 0.0,
    "total_tax_liability": 0.0,
    "itc_claimed": 0.0,
    "itc_eligible": 0.0,
    "net_tax_payable": 0.0,
    "filing_date": "date if available",
    "key_observations": ["list of notable observations"]
}}""",

        "ITR": f"""{base_instruction}
Extract Income Tax Return data from this document:
\"\"\"{text}\"\"\"

Return JSON with these fields (use null if not found):
{{
    "pan": "PAN number",
    "assessment_year": "e.g. 2024-25",
    "name": "Assessee name",
    "itr_form": "ITR-1/2/3/4/5/6",
    "total_income": 0.0,
    "gross_total_income": 0.0,
    "total_deductions": 0.0,
    "tax_payable": 0.0,
    "business_income": 0.0,
    "capital_gains": 0.0,
    "other_sources_income": 0.0,
    "depreciation": 0.0,
    "brought_forward_losses": 0.0,
    "key_observations": ["list of notable items"]
}}""",

        "BANK_STATEMENT": f"""{base_instruction}
Extract bank statement data from this document:
\"\"\"{text}\"\"\"

Return JSON with these fields (use null if not found):
{{
    "account_holder": "Name",
    "account_number": "Account number (mask middle digits)",
    "bank_name": "Bank name",
    "statement_period": "From - To dates",
    "opening_balance": 0.0,
    "closing_balance": 0.0,
    "total_credits": 0.0,
    "total_debits": 0.0,
    "average_monthly_balance": 0.0,
    "number_of_transactions": 0,
    "largest_credit": 0.0,
    "largest_debit": 0.0,
    "bounce_count": 0,
    "emi_payments_detected": [],
    "key_observations": ["patterns, large transactions, irregularities"]
}}""",

        "ANNUAL_REPORT": f"""{base_instruction}
Extract key data from this Annual Report:
\"\"\"{text}\"\"\"

Return JSON with these fields (use null if not found):
{{
    "company_name": "Name",
    "cin": "Corporate Identification Number",
    "financial_year": "e.g. 2023-24",
    "revenue": 0.0,
    "net_profit": 0.0,
    "ebitda": 0.0,
    "total_assets": 0.0,
    "total_liabilities": 0.0,
    "net_worth": 0.0,
    "total_debt": 0.0,
    "equity_share_capital": 0.0,
    "reserves_and_surplus": 0.0,
    "promoter_holding_pct": 0.0,
    "dividend_declared": 0.0,
    "auditor_name": "Auditor firm name",
    "auditor_opinion": "Qualified / Unqualified / Adverse",
    "related_party_transactions": [],
    "contingent_liabilities": 0.0,
    "key_risks_mentioned": [],
    "key_observations": ["important highlights"]
}}""",

        "FINANCIAL_STATEMENT": f"""{base_instruction}
Extract financial statement data from this document:
\"\"\"{text}\"\"\"

Return JSON with these fields (use null if not found):
{{
    "statement_type": "Balance Sheet / P&L / Cash Flow",
    "company_name": "Name",
    "period": "Financial year or quarter",
    "revenue_from_operations": 0.0,
    "other_income": 0.0,
    "total_income": 0.0,
    "cost_of_materials": 0.0,
    "employee_benefit_expense": 0.0,
    "depreciation": 0.0,
    "finance_costs": 0.0,
    "other_expenses": 0.0,
    "profit_before_tax": 0.0,
    "tax_expense": 0.0,
    "profit_after_tax": 0.0,
    "current_assets": 0.0,
    "non_current_assets": 0.0,
    "current_liabilities": 0.0,
    "non_current_liabilities": 0.0,
    "shareholders_equity": 0.0,
    "key_observations": []
}}""",

        "LEGAL_NOTICE": f"""{base_instruction}
Extract legal/litigation details from this document:
\"\"\"{text}\"\"\"

Return JSON with:
{{
    "case_type": "Civil / Criminal / Tax / NCLT / Arbitration / Other",
    "parties_involved": [],
    "court_name": "Name of court or tribunal",
    "case_number": "Case/filing number",
    "date_filed": "Date if available",
    "current_status": "Pending / Disposed / Appeal",
    "amount_in_dispute": 0.0,
    "summary": "Brief description of dispute",
    "risk_assessment": "High / Medium / Low",
    "key_observations": []
}}""",

        "SANCTION_LETTER": f"""{base_instruction}
Extract loan sanction details from this document:
\"\"\"{text}\"\"\"

Return JSON with:
{{
    "lender_name": "Bank/NBFC name",
    "borrower_name": "Company name",
    "facility_type": "Term Loan / Working Capital / CC / OD etc.",
    "sanctioned_amount": 0.0,
    "interest_rate": "Rate or formula",
    "tenure_months": 0,
    "collateral_details": [],
    "key_covenants": [],
    "sanction_date": "Date",
    "key_observations": []
}}""",
    }

    # Default prompt for unrecognized types
    default_prompt = f"""{base_instruction}
Extract all relevant financial and business information from this document:
\"\"\"{text}\"\"\"

Return JSON with ALL relevant fields you can identify including:
- Company/entity names
- Financial figures (revenue, profit, debt, etc.)
- Dates and periods
- Key observations and risk factors
- Any compliance or regulatory information
"""

    return prompts.get(document_type, default_prompt)


def generate_document_summary(text: str, document_type: str, model: str = "llama3") -> str:
    """
    Generate a concise summary of the document using the best available model.
    """
    llm = _get_llm()
    snippet = text[:6000]

    prompt = f"""You are a senior credit analyst. Review this {document_type} and provide a concise (3-5 sentences) summary.
FOCUS ON: Financial risks, inconsistencies, key performance indicators (KPIs), and any regulatory red flags.

DOCUMENT:
\"\"\"
{snippet}
\"\"\"

Return ONLY the summary as plain text. Do not include introductory remarks.
"""

    try:
        if llm:
            response = llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
        else:
            import ollama
            resp = ollama.chat(model=model, messages=[{"role": "user", "content": prompt}])
            return resp["message"]["content"].strip()
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return f"Summary unavailable for {document_type}. Please review raw extracted data."
