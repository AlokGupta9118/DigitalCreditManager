// services/caseService.ts
import { apiClient } from "@/utils/api";
import { CreditCase, Company, CAM } from "@/types/creditCase";

export interface CreateCompanyData {
  companyName: string;
  CIN: string;
  sector: string;
  industry: string;
  registeredAddress: string;
  promoters: Array<{
    name: string;
    shareholding: number;
    DIN?: string;
  }>;
}

export interface CreateCaseData {
  companyId: string;
  loanRequestAmount: number;
  loanPurpose: string;
  status?: string;
}

export const caseService = {
  // Get all credit cases
  async getAllCases(): Promise<CreditCase[]> {
    return apiClient<CreditCase[]>("/cases");
  },

  // Get a single case by ID
  async getCaseById(caseId: string): Promise<CreditCase> {
    return apiClient<CreditCase>(`/cases/${caseId}`);
  },

  // Create a new company
  async createCompany(companyData: CreateCompanyData): Promise<{ id: string; message: string }> {
    return apiClient<{ id: string; message: string }>("/companies", {
      method: "POST",
      body: JSON.stringify(companyData),
    });
  },

  // Create a new case
  async createCase(caseData: CreateCaseData): Promise<{ case_id: string; message: string }> {
    return apiClient<{ case_id: string; message: string }>("/cases", {
      method: "POST",
      body: JSON.stringify(caseData),
    });
  },

  // Get company details
  async getCompany(companyId: string): Promise<Company> {
    return apiClient<Company>(`/companies/${companyId}`);
  },

  // Get CAM reports for a case
  async getCAMReports(caseId: string): Promise<CAM[]> {
    try {
      return await apiClient<CAM[]>(`/cam/${caseId}`);
    } catch (error) {
      return []; // Return empty array if no reports found
    }
  },

  // Get all companies (for mapping)
  async getAllCompanies(): Promise<Company[]> {
    return apiClient<Company[]>("/companies");
  },

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  // Calculate dashboard stats
  calculateStats(cases: CreditCase[]): {
    totalCases: number;
    underReview: number;
    approved: number;
    rejected: number;
  } {
    return {
      totalCases: cases.length,
      underReview: cases.filter(c => c.status === "Under Review" || c.status === "Research Stage").length,
      approved: cases.filter(c => c.status === "Approved").length,
      rejected: cases.filter(c => c.status === "Rejected").length,
    };
  },

  // Determine risk score color
  getRiskScoreColor(score: number | null): string {
    if (score === null) return "text-muted-foreground";
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  },

  // Get status badge color
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      "Under Review": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Research Stage": "bg-blue-100 text-blue-800 border-blue-200",
      "Approved": "bg-green-100 text-green-800 border-green-200",
      "Rejected": "bg-red-100 text-red-800 border-red-200",
      "Draft": "bg-gray-100 text-gray-800 border-gray-200",
      "Pending": "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  },

  // Get CAM status color
  getCAMStatusColor(status: string): string {
    if (status === "Generated") return "bg-green-100 text-green-800 border-green-200";
    if (status === "In Progress") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  },

  // Get cases by company ID
  async getCasesByCompany(companyId: string): Promise<CreditCase[]> {
    const allCases = await this.getAllCases();
    return allCases.filter(c => c.companyId === companyId);
  },

  // Get research status for a case
  async getResearchStatus(caseId: string): Promise<{ exists: boolean; status?: string }> {
    try {
      const response = await apiClient<{ status: string }>(`/research/latest/${caseId}`);
      return { exists: true, status: response.status };
    } catch (error) {
      return { exists: false };
    }
  }
};