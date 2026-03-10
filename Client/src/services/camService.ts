import { apiClient } from "@/utils/api";

export interface CamReport {
  _id?: string;
  creditCaseId: string;
  reportUrl: string;
  format: string;
  generatedAt: string;
  caseName: string;
}

export const camService = {
  async generateCam(creditCaseId: string): Promise<{ message: string; report_id: string; report_url: string }> {
    return apiClient(`/cam/generate/${creditCaseId}`, { method: "POST" });
  },

  async generateDocxCam(creditCaseId: string): Promise<{ message: string; report_id: string; report_url: string }> {
    return apiClient(`/cam/generate-docx/${creditCaseId}`, { method: "POST" });
  },

  async getCamReportsByCase(creditCaseId: string): Promise<CamReport[]> {
    return apiClient<CamReport[]>(`/cam/${creditCaseId}`);
  }
};
