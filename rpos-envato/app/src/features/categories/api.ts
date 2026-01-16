import { apiClient } from '@/services/api/client';
import type { Category, ApiResponse } from '@/types';

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  image?: string;
  color?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export const categoriesApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Category[]>>('/categories'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Category>>(`/categories/${id}`),

  create: (data: CreateCategoryRequest) =>
    apiClient.post<ApiResponse<Category>>('/categories', data),

  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}`),

  getWithProductCount: () =>
    apiClient.get<ApiResponse<Array<Category & { productCount: number }>>>('/categories/with-count'),
};
