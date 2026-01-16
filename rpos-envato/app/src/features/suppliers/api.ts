import { apiClient } from '@/services/api/client';
import type { Supplier, PaginatedResponse } from '@/types';

export interface SuppliersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending_approval';
}

export interface CreateSupplierRequest {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  paymentTerms?: 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'due_on_receipt' | 'prepaid';
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export const suppliersApi = {
  getAll: (params?: SuppliersQuery) =>
    apiClient.get<PaginatedResponse<Supplier>>('/suppliers', { params }),

  getById: (id: string) =>
    apiClient.get<Supplier>(`/suppliers/${id}`),

  create: (data: CreateSupplierRequest) =>
    apiClient.post<Supplier>('/suppliers', data),

  update: (id: string, data: UpdateSupplierRequest) =>
    apiClient.put<Supplier>(`/suppliers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/suppliers/${id}`),
};
