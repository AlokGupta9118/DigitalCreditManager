import { apiClient, uploadFile } from "../utils/api";

export interface DueDiligenceData {
  creditCaseId: string;
  factoryCapacityUtilization: number;
  managementCredibility: "Excellent" | "Good" | "Average" | "Poor";
  operationalRisks: string;
  visitNotes: string;
  sitePhotos?: string[];
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

  async uploadPhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadFile<{ status: string, url: string }>("/due-diligence/upload-photo", formData);
    return result.url;
  },

  async analyzeDueDiligence(notes: string, file: File | null): Promise<DueDiligenceData> {
    const formData = new FormData();
    formData.append("notes", notes);
    if (file) {
      formData.append("file", file);
    }
    
    const result = await uploadFile<{ status: string, data: DueDiligenceData }>("/due-diligence/analyze", formData);
    return result.data;
  },
};

