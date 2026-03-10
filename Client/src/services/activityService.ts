import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ActivityLog {
    _id: string;
    creditCaseId?: string;
    action: string;
    category: string;
    user: string;
    details?: any;
    timestamp: string;
}

export const activityService = {
    getGlobalLogs: async (limit: number = 20): Promise<ActivityLog[]> => {
        const response = await axios.get(`${API_URL}/activity-log/?limit=${limit}`);
        return response.data;
    },

    getCaseLogs: async (caseId: string, limit: number = 20): Promise<ActivityLog[]> => {
        const response = await axios.get(`${API_URL}/activity-log/case/${caseId}?limit=${limit}`);
        return response.data;
    },

    getCategoryLogs: async (category: string, limit: number = 20): Promise<ActivityLog[]> => {
        const response = await axios.get(`${API_URL}/activity-log/category/${category}?limit=${limit}`);
        return response.data;
    }
};
