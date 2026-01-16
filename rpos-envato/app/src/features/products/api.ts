import { apiClient } from '@/services/api/client';
import type { Product, PaginatedResponse, PartnerAvailability } from '@/types';

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  // Advanced filters
  supplier?: string;
  brand?: string;
  hasBarcode?: 'true' | 'false';
  partner?: string;
  tags?: string;
  minMargin?: number;
  maxMargin?: number;
}

export interface CreateProductRequest {
  // Core fields
  name: string;
  sku?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity?: number;
  stock?: number; // Alias for quantity
  minStock?: number;
  categoryId?: string;
  image?: string;
  images?: string[];
  isActive?: boolean;
  // Partner-ready: Sourcing & Brand
  brand?: string;
  primaryBarcode?: string;
  barcode?: string; // Alias for primaryBarcode
  taxClass?: string;
  unitOfMeasure?: string;
  unit?: string; // Alias for unitOfMeasure
  // Partner-ready: Default Supplier
  defaultSupplierId?: string;
  // Partner-ready: Shipping Dimensions
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  // Partner-ready: Availability & Tags
  partnerAvailability?: PartnerAvailability;
  tags?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface PartnerExportResponse {
  partner: string;
  exportedAt: string;
  count: number;
  products: Partial<Product>[];
}

export interface PartnerSummary {
  doordash: number;
  ubereats: number;
  grubhub: number;
  postmates: number;
  instacart: number;
  [key: string]: number;
}

export interface BulkPartnerUpdateRequest {
  productIds: string[];
  partner: string;
  available: boolean;
}

export const productsApi = {
  // Core CRUD operations
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

  // Search & Filtering
  search: (query: string) =>
    apiClient.get<Product[]>('/products/search', { params: { q: query } }),

  getByCategory: (categoryId: string) =>
    apiClient.get<Product[]>(`/products/category/${categoryId}`),

  getByBarcode: (barcode: string) =>
    apiClient.get<Product>(`/products/barcode/${barcode}`),

  getLowStock: () =>
    apiClient.get<Product[]>('/products/low-stock'),

  // Partner-ready: Filter Options
  getBrands: () =>
    apiClient.get<string[]>('/products/brands'),

  getTags: () =>
    apiClient.get<string[]>('/products/tags'),

  // Partner-ready: Partner Integration
  getPartnerSummary: () =>
    apiClient.get<PartnerSummary>('/products/partners/summary'),

  exportForPartner: (partner: string) =>
    apiClient.get<PartnerExportResponse>(`/products/export/${partner}`),

  bulkUpdatePartnerAvailability: (data: BulkPartnerUpdateRequest) =>
    apiClient.post<{ updated: number }>('/products/partners/bulk-update', data),
};
