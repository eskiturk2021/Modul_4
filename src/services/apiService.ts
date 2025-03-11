// src/services/apiService.ts
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import tokenService from './tokenService';
import { useEffect } from 'react';

// Create a custom axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // If the error is due to an expired token (401) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const response = await axios.post('/api/auth/refresh', {}, {
          headers: tokenService.getAuthHeader()
        });

        const { token } = response.data;

        // Update the token
        tokenService.setToken(token);

        // Update authorization header for the original request
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If token refresh fails, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // General error handling
    if (error.response?.status === 404) {
      console.error('Resource not found');
    }

    if (error.response?.status === 500) {
      console.error('Server error');
    }

    return Promise.reject(error);
  }
);

// Error parsing helper
const parseError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unknown error occurred';
};

// API methods
const apiService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw parseError(error);
    }
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw parseError(error);
    }
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw parseError(error);
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE ${url} failed:`, error);
      throw parseError(error);
    }
  },

  // For file uploads
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    try {
      const uploadConfig: AxiosRequestConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
      };

      const response: AxiosResponse<T> = await api.post(url, formData, uploadConfig);
      return response.data;
    } catch (error) {
      console.error(`Upload to ${url} failed:`, error);
      throw parseError(error);
    }
  }
};

// Hook to attach API calls to components
export function useApi() {
  useEffect(() => {
    // This could be used to set up/tear down API-related resources
    return () => {
      // Cleanup if needed
    };
  }, []);

  return apiService;
}

export default apiService;