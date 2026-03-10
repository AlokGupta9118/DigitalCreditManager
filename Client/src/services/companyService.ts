import { apiClient } from "@/utils/api";

export interface Company {
  _id?: string;
  companyName: string;
  sector?: string;
  promoterNames?: string[];
  registeredAddress?: string;
  cin?: string;
  gstin?: string;
  incorporationDate?: string;
}

export const companyService = {
  // Get all companies
  async getAllCompanies(): Promise<Company[]> {
    try {
      // Try different possible endpoints
      const response = await apiClient<Company[]>("/companies");
      return response;
    } catch (error) {
      console.error("Error fetching companies:", error);
      throw error;
    }
  },

  // Get company by ID
  async getCompanyById(companyId: string): Promise<Company> {
    return apiClient<Company>(`/companies/${companyId}`);
  },

  // Create new company
  async createCompany(company: Company): Promise<{ id: string; message: string }> {
    return apiClient<{ id: string; message: string }>("/companies", {
      method: "POST",
      body: JSON.stringify(company),
    });
  }
};