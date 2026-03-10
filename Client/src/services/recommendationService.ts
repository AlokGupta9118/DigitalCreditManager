import { apiClient } from "@/utils/api";

export interface Recommendation {
  _id?: string;
  creditCaseId: string;
  decision: string;
  suggestedLoanAmount: number;
  interestRate: number;
  reasoning: string[];
  status: string;
  // Officer finalization fields
  finalDecision?: string | null;
  finalAmount?: number | null;
  finalRate?: number | null;
  finalStatus?: string | null;
  officerComments?: string | null;
  finalizedAt?: string | null;
}

export interface FinalizeStatus {
  finalized: boolean;
  hasRecommendation: boolean;
  finalDecision?: string | null;
  finalStatus?: string | null;
  finalizedAt?: string | null;
  officerComments?: string | null;
  aiDecision?: string;
  recommendationId?: string;
}

export const recommendationService = {
  async runRecommendationAgent(creditCaseId: string): Promise<{ status: string; recommendationId: string; message: string; decision: string }> {
    return apiClient(`/recommendation/run/${creditCaseId}`, { method: "POST" });
  },

  async getLatestRecommendationByCase(creditCaseId: string): Promise<Recommendation> {
    return apiClient<Recommendation>(`/recommendation/case/${creditCaseId}`);
  },

  async getFinalizeStatus(creditCaseId: string): Promise<FinalizeStatus> {
    return apiClient<FinalizeStatus>(`/recommendation/finalize-status/${creditCaseId}`);
  },

  async finalizeRecommendation(
    creditCaseId: string,
    data: { decision: string; amount: number; rate: number; comments: string }
  ): Promise<{ status: string; message: string; finalStatus: string }> {
    return apiClient(`/recommendation/finalize/${creditCaseId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
};
