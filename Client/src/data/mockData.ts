import type {
  CreditCase, UploadedDocument, FinancialRow, RiskSignal, NewsItem,
  LegalRecord, RiskScores, LoanRecommendation, ActivityEntry, SearchResult
} from "@/types/creditCase";

export const mockCases: CreditCase[] = [
  { id: "1", companyName: "ABC Steel Pvt Ltd", sector: "Manufacturing", loanAmount: 100000000, loanPurpose: "Working Capital", status: "Under Review", riskScore: 63, camStatus: "In Progress", createdAt: "2026-02-15", promoterName: "Rajesh Kumar", promoterExperience: "20 years" },
  { id: "2", companyName: "XYZ Logistics", sector: "Logistics", loanAmount: 50000000, loanPurpose: "Fleet Expansion", status: "Research Stage", riskScore: null, camStatus: "Not Started", createdAt: "2026-02-28", promoterName: "Priya Sharma", promoterExperience: "12 years" },
  { id: "3", companyName: "Greenfield Agro", sector: "Agriculture", loanAmount: 250000000, loanPurpose: "Land Acquisition", status: "Approved", riskScore: 78, camStatus: "Generated", createdAt: "2026-01-10", promoterName: "Vikram Singh", promoterExperience: "30 years" },
  { id: "4", companyName: "TechNova Solutions", sector: "IT Services", loanAmount: 75000000, loanPurpose: "R&D Investment", status: "Pending", riskScore: null, camStatus: "Not Started", createdAt: "2026-03-01", promoterName: "Anil Mehta", promoterExperience: "8 years" },
  { id: "5", companyName: "Sunrise Pharma", sector: "Pharmaceuticals", loanAmount: 150000000, loanPurpose: "Plant Expansion", status: "Rejected", riskScore: 35, camStatus: "Generated", createdAt: "2026-01-20", promoterName: "Neha Gupta", promoterExperience: "15 years" },
];

export const mockDocuments: UploadedDocument[] = [
  { id: "d1", caseId: "1", fileName: "GST_Returns_2023.pdf", category: "GST Returns", uploadDate: "2026-02-16", status: "Extracted", fileSize: "2.4 MB" },
  { id: "d2", caseId: "1", fileName: "Bank_Statement_SBI.xlsx", category: "Bank Statements", uploadDate: "2026-02-16", status: "Extracted", fileSize: "1.8 MB" },
  { id: "d3", caseId: "1", fileName: "Annual_Report_2023.pdf", category: "Annual Report", uploadDate: "2026-02-17", status: "Processing", fileSize: "15.2 MB" },
  { id: "d4", caseId: "1", fileName: "ITR_FY2023.pdf", category: "ITR", uploadDate: "2026-02-17", status: "Uploaded", fileSize: "890 KB" },
  { id: "d5", caseId: "1", fileName: "Balance_Sheet_2023.xlsx", category: "Balance Sheet", uploadDate: "2026-02-18", status: "Extracted", fileSize: "540 KB" },
];

export const mockFinancials: FinancialRow[] = [
  { year: 2021, revenue: 350000000, profit: 22000000, gstTurnover: 330000000, verified: true },
  { year: 2022, revenue: 500000000, profit: 40000000, gstTurnover: 480000000, verified: true },
  { year: 2023, revenue: 630000000, profit: 60000000, gstTurnover: 600000000, verified: false },
];

export const mockRiskSignals: RiskSignal[] = [
  { id: "r1", message: "Revenue growth consistent with industry", type: "success" },
  { id: "r2", message: "GST filings match bank deposits", type: "success" },
  { id: "r3", message: "Possible circular trading pattern detected", type: "warning" },
  { id: "r4", message: "Debt-to-equity ratio above sector average", type: "danger" },
  { id: "r5", message: "Promoter has no adverse credit history", type: "success" },
];

export const mockNews: NewsItem[] = [
  { id: "n1", title: "Steel sector faces 15% capacity slowdown in Q3", source: "Economic Times", date: "2026-02-20", sentiment: "negative", summary: "Industry analysts predict continued slowdown due to global demand reduction." },
  { id: "n2", title: "Promoter Rajesh Kumar awarded Best Industrialist", source: "Business Standard", date: "2026-01-15", sentiment: "positive", summary: "ABC Steel promoter recognized for contributions to manufacturing sector." },
  { id: "n3", title: "Tax investigation into steel companies intensifies", source: "Mint", date: "2026-02-25", sentiment: "negative", summary: "Government agencies step up scrutiny of steel manufacturers for GST compliance." },
  { id: "n4", title: "New RBI regulation affecting NBFC lending norms", source: "RBI Bulletin", date: "2026-03-01", sentiment: "neutral", summary: "Updated guidelines for non-banking financial institutions on credit assessment." },
];

export const mockLegalRecords: LegalRecord[] = [
  { id: "l1", court: "Delhi High Court", caseNumber: "CW/2024/3421", status: "Active", description: "Dispute with supplier regarding material quality" },
  { id: "l2", court: "NCLT Mumbai", caseNumber: "CP/2023/1892", status: "Resolved", description: "Minor payment dispute settled" },
];

export const mockRiskScores: RiskScores = {
  overall: 62, character: 70, capacity: 55, capital: 65, collateral: 80, conditions: 60,
};

export const mockRecommendation: LoanRecommendation = {
  type: "Approve with Conditions",
  suggestedLimit: 70000000,
  interestRate: 11.75,
  riskGrade: "BBB",
  reasoning: [
    "Strong GST cash flow consistency over 3 years",
    "Low collateral risk with adequate asset coverage",
    "Moderate sector slowdown poses medium-term risk",
    "Minor litigation history with no material impact",
    "Promoter has strong industry track record (20 years)",
    "Debt-to-equity ratio slightly above benchmark — suggest monitoring",
  ],
};

export const mockActivities: ActivityEntry[] = [
  { id: "a1", timestamp: "2026-02-16 09:30", user: "Amit Patel", action: "Created credit case for ABC Steel Pvt Ltd", type: "system" },
  { id: "a2", timestamp: "2026-02-16 10:15", user: "Amit Patel", action: "Uploaded GST Returns (2023)", type: "upload" },
  { id: "a3", timestamp: "2026-02-16 10:20", user: "Amit Patel", action: "Uploaded Bank Statement (SBI)", type: "upload" },
  { id: "a4", timestamp: "2026-02-16 11:00", user: "AI System", action: "Extraction completed for GST Returns", type: "extraction" },
  { id: "a5", timestamp: "2026-02-16 11:05", user: "AI System", action: "Extraction completed for Bank Statement", type: "extraction" },
  { id: "a6", timestamp: "2026-02-17 14:30", user: "Amit Patel", action: "Added factory visit notes", type: "note" },
  { id: "a7", timestamp: "2026-02-17 15:00", user: "AI System", action: "Risk scoring completed — Score: 62", type: "review" },
  { id: "a8", timestamp: "2026-02-18 09:00", user: "Amit Patel", action: "Reviewed and verified financial data", type: "review" },
  { id: "a9", timestamp: "2026-02-18 11:30", user: "AI System", action: "CAM report generation started", type: "generation" },
];

export const mockSearchResults: SearchResult[] = [
  { id: "s1", documentName: "Annual_Report_2023.pdf", page: 45, snippet: "Total outstanding debt stands at ₹20 Crore as of March 2023, including term loans and working capital facilities.", category: "Annual Report" },
  { id: "s2", documentName: "Balance_Sheet_2023.xlsx", page: 1, snippet: "Long-term borrowings: ₹12 Crore | Short-term borrowings: ₹8 Crore | Total Debt: ₹20 Crore", category: "Balance Sheet" },
  { id: "s3", documentName: "Bank_Statement_SBI.xlsx", page: 3, snippet: "EMI debit of ₹45,00,000 towards term loan repayment on 15th of each month.", category: "Bank Statements" },
];

export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};
