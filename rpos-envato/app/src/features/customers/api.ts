import { apiClient } from '@/services/api/client';
import type { Customer, ApiListResponse, ApiResponse } from '@/types';

export interface CustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {}

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
}

export const customersApi = {
  getAll: (params?: CustomersQuery) =>
    apiClient.get<ApiListResponse<Customer>>('/customers', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Customer>>(`/customers/${id}`),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<ApiResponse<Customer>>('/customers', data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/customers/${id}`),

  search: (query: string) =>
    apiClient.get<ApiResponse<Customer[]>>('/customers/search', { params: { q: query } }),

  getStats: (id: string) =>
    apiClient.get<ApiResponse<CustomerStats>>(`/customers/${id}/stats`),
};
