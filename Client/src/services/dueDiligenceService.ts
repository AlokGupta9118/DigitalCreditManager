import { apiClient } from "../utils/api";

export interface DueDiligenceData {
  creditCaseId: string;
  factoryCapacityUtilization: number;
  managementCredibility: "Excellent" | "Good" | "Average" | "Poor";
  operationalRisks: string;
  visitNotes: string;
}

export const dueDiligenceService = {
  async saveDueDiligence(data: DueDiligenceData): Promise<{ status: string; message: string }> {
    return apiClient<{ status: string; message: string }>("/due-diligence", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getDueDiligenceByCase(caseId: string): Promise<DueDiligenceData | null> {
    try {
      return await apiClient<DueDiligenceData>(`/due-diligence/case/${caseId}`);
    } catch (error) {
      return null;
    }
  },
};
