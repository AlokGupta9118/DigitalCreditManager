import { apiClient } from "@/utils/api";

export interface RiskScore {
  _id?: string;
  creditCaseId: string;
  status?: "PROCESSING" | "COMPLETED" | "ERROR";
  overallScore?: number;
  riskGrade?: string;
  scorecardText?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // New 7-category scores
  financialHealthScore?: number;
  creditRatingScore?: number;
  promoterBackgroundScore?: number;
  regulatoryComplianceScore?: number;
  litigationRiskScore?: number;
  sectorPositionScore?: number;
  esgIrregularitiesScore?: number;

  // Legacy fields
  characterScore?: number;
  capacityScore?: number;
  capitalScore?: number;
  collateralScore?: number;
  conditionsScore?: number;
}

export const riskService = {
  // Get latest risk score for a case
  async getLatestRiskByCase(caseId: string): Promise<RiskScore> {
    try {
      return await apiClient<RiskScore>(`/risk/case/${caseId}`);
    } catch (error) {
      throw error;
    }
  },

  // Run risk agent - CORRECTED ENDPOINT
  async runRiskAgent(caseId: string): Promise<{ riskId: string; message: string; status: string }> {
    // Using the correct endpoint: /risk/run/{case_id} as defined in your backend
    return apiClient<{ riskId: string; message: string; status: string }>(`/risk/run/${caseId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // No body needed since caseId is in URL
    });
  },

  // Get risk status
  async getRiskStatus(riskId: string): Promise<{ status: string; message?: string }> {
    return apiClient<{ status: string; message?: string }>(`/risk/${riskId}/status`);
  }
};