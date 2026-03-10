import { apiClient } from "@/utils/api";

export interface News {
  title: string;
  source: string;
  url: string;
  sentiment: string;
  date?: string;
  summary?: string;
}

export interface CreditRating {
  agency?: string;
  longTermRating?: string;
  shortTermRating?: string;
  outlook?: string;
  lastAction?: string;
  confidence?: number;
  rationale?: string;
}

export interface FinancialAnalysis {
  revenue: Array<{ year: string; value: number }>;
  netProfit: Array<{ year: string; value: number }>;
  ebitdaMargin?: number;
  netProfitMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
  interestCoverage?: number;
  dscr?: number;
  roe?: number;
  roce?: number;
  confidence?: number;
}

export interface PromoterInfo {
  name: string;
  din?: string;
  otherDirectorships: string[];
  legalIssues: string[];
  wilfulDefaulter: boolean;
  confidence?: number;
}

export interface HypothesisResult {
  hypothesis: string;
  result: string; // CONFIRMED / DENIED / INCONCLUSIVE
  evidence: string;
  confidence?: number;
}

export interface Irregularity {
  description: string;
  evidence: string;
  severity: string; // LOW/MEDIUM/HIGH
}

export interface Research {
  _id?: string;
  creditCaseId: string;
  companyName: string;
  researchDate: string;
  
  companyOverview?: Record<string, any>;
  creditRating?: CreditRating;
  financialAnalysis?: FinancialAnalysis;
  sectorBenchmark?: Record<string, any>;
  promoterBackground?: PromoterInfo[];
  regulatoryRisk?: Record<string, any>;
  litigationRisk?: Record<string, any>;
  irregularities?: Irregularity[];
  hypothesisTesting?: HypothesisResult[];
  
  news: News[];
  sectorInsights: string[];
  
  overallRisk?: string; // LOW/MEDIUM/HIGH
  keyStrengths: string[];
  keyConcerns: string[];
  creditOpinion?: string;
  recommendedLoanTerms?: string;
  overallConfidence?: number;
  
  rawResearch?: string;
}

export interface ResearchRunResponse {
  status: string;
  id?: string;
  creditCaseId: string;
  message: string;
}

export const researchService = {

    
  // Run research agent
  async runResearch(
    creditCaseId: string,
    companyName: string,
    promoterNames?: string[],
    sector?: string
  ): Promise<ResearchRunResponse> {
    const params = new URLSearchParams();
    params.append("creditCaseId", creditCaseId);
    params.append("companyName", companyName);
    if (promoterNames?.length) {
      promoterNames.forEach(name => params.append("promoterNames", name));
    }
    if (sector) {
      params.append("sector", sector);
    }
    
    return apiClient<ResearchRunResponse>(`/research/run?${params.toString()}`, {
      method: "POST",
    });
  },
  
  // Store research manually
  async storeResearch(research: Research): Promise<{ status: string; id: string }> {
    return apiClient<{ status: string; id: string }>("/research/", {
      method: "POST",
      body: JSON.stringify(research),
    });
  },
  
  // Get all research for a case
  async getResearchByCase(creditCaseId: string): Promise<Research[]> {
    return apiClient<Research[]>(`/research/case/${creditCaseId}`);
  },
  // Get research status by ID
async getResearchStatus(researchId: string): Promise<{ status: string; overallRisk?: string }> {
  return apiClient<{ status: string; overallRisk?: string }>(`/research/status/${researchId}`);
},
  
  // Get latest research for a case
  async getLatestResearch(creditCaseId: string): Promise<Research> {
    return apiClient<Research>(`/research/latest/${creditCaseId}`);
  },
  
  // Delete research
  async deleteResearch(researchId: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/research/${researchId}`, {
      method: "DELETE",
    });
  }
};