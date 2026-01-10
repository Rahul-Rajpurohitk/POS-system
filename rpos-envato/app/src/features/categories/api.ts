import { apiClient } from '@/services/api/client';
import type { Category } from '@/types';

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export const categoriesApi = {
  getAll: () =>
    apiClient.get<Category[]>('/categories'),

  getById: (id: string) =>
    apiClient.get<Category>(`/categories/${id}`),

  create: (data: CreateCategoryRequest) =>
    apiClient.post<Category>('/categories', data),

  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}`),

  getWithProductCount: () =>
    apiClient.get<Array<Category & { productCount: number }>>('/categories/with-count'),
};
