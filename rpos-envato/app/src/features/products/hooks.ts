import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSyncStore } from '@/store';
import { generateLocalId } from '@/utils';
import { productsApi } from './api';
import type { ProductsQuery, CreateProductRequest, UpdateProductRequest } from './api';
import type { Product } from '@/types';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params?: ProductsQuery) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
  category: (categoryId: string) => [...productKeys.all, 'category', categoryId] as const,
  barcode: (barcode: string) => [...productKeys.all, 'barcode', barcode] as const,
  lowStock: () => [...productKeys.all, 'lowStock'] as const,
};

export function useProducts(params?: ProductsQuery) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.getAll(params),
    select: (response) => response.data.data, // Extract data array from { success, data, pagination }
  });
}

export function useInfiniteProducts(params?: Omit<ProductsQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ pageParam = 1 }) => productsApi.getAll({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages.map(page => page.data.data),
      pageParams: data.pageParams,
    }),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.getById(id),
    select: (response) => response.data,
    enabled: !!id && !id.startsWith('local-'),
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => productsApi.search(query),
    select: (response) => response.data,
    enabled: query.length >= 2,
  });
}

export function useProductsByCategory(categoryId: string) {
  return useQuery({
    queryKey: productKeys.category(categoryId),
    queryFn: () => productsApi.getByCategory(categoryId),
    select: (response) => response.data,
    enabled: !!categoryId,
  });
}

export function useProductByBarcode(barcode: string) {
  return useQuery({
    queryKey: productKeys.barcode(barcode),
    queryFn: () => productsApi.getByBarcode(barcode),
    select: (response) => response.data,
    enabled: !!barcode,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: productKeys.lowStock(),
    queryFn: () => productsApi.getLowStock(),
    select: (response) => response.data,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (data: CreateProductRequest) => {
      if (!isOnline) {
        const localProduct: Product = {
          id: generateLocalId(),
          ...data,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          stock: data.stock,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addToQueue({
          type: 'create',
          entity: 'product',
          data,
          localId: localProduct.id,
        });
        return { data: localProduct };
      }
      return productsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductRequest }) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'update',
          entity: 'product',
          data: { id, ...data },
          localId: id,
        });
        return { data: { id, ...data } as Product };
      }
      return productsApi.update(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'delete',
          entity: 'product',
          data: { id },
          localId: id,
        });
        return;
      }
      return productsApi.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      productsApi.updateStock(id, quantity),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
