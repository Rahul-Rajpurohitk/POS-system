import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncStore } from '@/store';
import { generateLocalId } from '@/utils';
import { categoriesApi } from './api';
import type { CreateCategoryRequest, UpdateCategoryRequest } from './api';
import type { Category } from '@/types';

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
  withCount: () => [...categoryKeys.all, 'withCount'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: () => categoriesApi.getAll(),
    select: (response) => response.data,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoriesApi.getById(id),
    select: (response) => response.data,
    enabled: !!id && !id.startsWith('local-'),
  });
}

export function useCategoriesWithCount() {
  return useQuery({
    queryKey: categoryKeys.withCount(),
    queryFn: () => categoriesApi.getWithProductCount(),
    select: (response) => response.data,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      if (!isOnline) {
        const localCategory: Category = {
          id: generateLocalId(),
          ...data,
          name: data.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addToQueue({
          type: 'create',
          entity: 'category',
          data,
          localId: localCategory.id,
        });
        return { data: localCategory };
      }
      return categoriesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.withCount() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'update',
          entity: 'category',
          data: { id, ...data },
          localId: id,
        });
        return { data: { id, ...data } as Category };
      }
      return categoriesApi.update(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.withCount() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'delete',
          entity: 'category',
          data: { id },
          localId: id,
        });
        return;
      }
      return categoriesApi.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.withCount() });
    },
  });
}
