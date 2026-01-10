import { apiClient } from '@/services/api/client';
import type { Product, PaginatedResponse } from '@/types';

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductRequest {
  name: string;
  sku?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock?: number;
  categoryId?: string;
  image?: string;
  barcode?: string;
  unit?: string;
  isActive?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export const productsApi = {
  getAll: (params?: ProductsQuery) =>
    apiClient.get<PaginatedResponse<Product>>('/products', { params }),

  getById: (id: string) =>
    apiClient.get<Product>(`/products/${id}`),

  create: (data: CreateProductRequest) =>
    apiClient.post<Product>('/products', data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<Product>(`/products/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/products/${id}`),

  updateStock: (id: string, quantity: number) =>
    apiClient.patch<Product>(`/products/${id}/stock`, { quantity }),

  search: (query: string) =>
    apiClient.get<Product[]>('/products/search', { params: { q: query } }),

  getByCategory: (categoryId: string) =>
    apiClient.get<Product[]>(`/products/category/${categoryId}`),

  getByBarcode: (barcode: string) =>
    apiClient.get<Product>(`/products/barcode/${barcode}`),

  getLowStock: () =>
    apiClient.get<Product[]>('/products/low-stock'),
};
