export interface CreditCase {
  _id: string;
  companyId: string;
  loanRequestAmount: number;
  loanPurpose: string;
  status: string;
  riskScore: number | null;
  companyName?: string;
  borrowerName?: string;
  sector?: string;
  industry?: string;
  caseType?: string;
  camStatus?: string;
  promoterNames?: string[];
  tenureMonths?: number;
  address?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  _id: string;
  companyName: string;
  CIN: string;
  sector: string;
  industry: string;
  registeredAddress: string;
  promoterNames?: string[]; // computed flat list from promoters
  promoters: Array<{
    name: string;
    shareholding: number;
    DIN?: string;
  }>;
}

export interface CAM {
  _id: string;
  creditCaseId: string;
  reportUrl: string;
  format: string;
  generatedAt: string;
  caseName: string;
  finalDecision?: string;
}

export interface DashboardStats {
  totalCases: number;
  underReview: number;
  approved: number;
  rejected: number;
}