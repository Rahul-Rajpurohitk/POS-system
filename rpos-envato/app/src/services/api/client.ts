import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store';
import type { ApiResponse, ApiError } from '@/types';

// API Base URL - should match your backend
const API_BASE_URL = __DEV__
  ? Platform.select({
      ios: 'http://localhost:3000/api',
      android: 'http://10.0.2.2:3000/api',
      default: 'http://localhost:3000/api',
    })
  : 'https://your-production-api.com/api';

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'X-Platform': Platform.OS,
      'X-App-Version': '2.0.0',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      // Handle 401 - token expired
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
      }

      // Extract error message
      const message =
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred';

      return Promise.reject(new Error(message));
    }
  );

  return client;
};

export const apiClient = createApiClient();

// Type-safe request helpers
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function post<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}

export async function put<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
}

export async function patch<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
}

export async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}

// File upload helper
export async function uploadFile<T>(
  url: string,
  file: { uri: string; type: string; name: string },
  config?: AxiosRequestConfig
): Promise<T> {
  const formData = new FormData();
  formData.append('image', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as unknown as Blob);

  const response = await apiClient.post<T>(url, formData, {
    ...config,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

// Set auth header manually (for initial login)
export function setAuthHeader(token: string): void {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// Clear auth header
export function clearAuthHeader(): void {
  delete apiClient.defaults.headers.common.Authorization;
}
