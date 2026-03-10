import axios from 'axios';

// Use import.meta.env for Vite, fallback to process.env for CRA, and finally a default value
const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 
  'http://localhost:8000/api';

export type DocumentCategory = 
  | "GST Returns" 
  | "Bank Statements" 
  | "ITR" 
  | "Balance Sheet"
  | "Annual Report" 
  | "Board Minutes" 
  | "Rating Report" 
  | "Sanction Letter" 
  | "Legal Notice";

export type DocumentStatus = 'Uploaded' | 'Processing' | 'Extracted' | 'Error';

export interface Document {
  _id: string;
  creditCaseId: string;
  documentType: DocumentCategory;
  financialYear: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  updatedAt: string;
  status: DocumentStatus;
  extractedData?: any;
  errorMessage?: string;
}

export const documentService = {
  async uploadDocument(
    file: File,
    creditCaseId: string,
    documentType: DocumentCategory,
    financialYear: string
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('creditCaseId', creditCaseId);
    formData.append('documentType', documentType);
    formData.append('financialYear', financialYear);

    const response = await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async getDocumentsByCase(creditCaseId: string): Promise<Document[]> {
    const response = await axios.get(`${API_BASE_URL}/documents/case/${creditCaseId}`);
    return response.data;
  },

  async getDocument(documentId: string): Promise<Document> {
    const response = await axios.get(`${API_BASE_URL}/documents/${documentId}`);
    return response.data;
  },

  async getExtractedData(documentId: string) {
    const response = await axios.get(`${API_BASE_URL}/documents/${documentId}/extracted-data`);
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/documents/${documentId}`);
  },

  getDocumentViewUrl(documentId: string): string {
    return `${API_BASE_URL}/documents/${documentId}/view`;
  },

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await axios.get(`${API_BASE_URL}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getDocumentStats(creditCaseId: string) {
    const response = await axios.get(`${API_BASE_URL}/documents/stats/${creditCaseId}`);
    return response.data;
  }
};