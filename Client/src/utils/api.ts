// utils/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ApiError extends Error {
  status?: number;
  details?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const apiError = new Error(error.detail || `API Error: ${response.statusText}`) as ApiError;
    apiError.status = response.status;
    apiError.details = error.detail;
    throw apiError;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// For file uploads (multipart/form-data)
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const apiError = new Error(error.detail || 'Upload failed') as ApiError;
    apiError.status = response.status;
    apiError.details = error.detail;
    throw apiError;
  }

  return response.json();
}