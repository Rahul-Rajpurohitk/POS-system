import { apiClient } from '@/services/api/client';
import type { Customer, PaginatedResponse } from '@/types';

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
    apiClient.get<PaginatedResponse<Customer>>('/customers', { params }),

  getById: (id: string) =>
    apiClient.get<Customer>(`/customers/${id}`),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<Customer>('/customers', data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.put<Customer>(`/customers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/customers/${id}`),

  search: (query: string) =>
    apiClient.get<Customer[]>('/customers/search', { params: { q: query } }),

  getStats: (id: string) =>
    apiClient.get<CustomerStats>(`/customers/${id}/stats`),
};
