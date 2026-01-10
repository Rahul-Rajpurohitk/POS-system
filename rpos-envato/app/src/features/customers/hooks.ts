import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSyncStore } from '@/store';
import { generateLocalId } from '@/utils';
import { customersApi } from './api';
import type { CustomersQuery, CreateCustomerRequest, UpdateCustomerRequest } from './api';
import type { Customer } from '@/types';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: CustomersQuery) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  search: (query: string) => [...customerKeys.all, 'search', query] as const,
  stats: (id: string) => [...customerKeys.all, 'stats', id] as const,
};

export function useCustomers(params?: CustomersQuery) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customersApi.getAll(params),
    select: (response) => response.data,
  });
}

export function useInfiniteCustomers(params?: Omit<CustomersQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ pageParam = 1 }) => customersApi.getAll({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data;
      return page < totalPages ? page + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages.map(page => page.data.data),
      pageParams: data.pageParams,
    }),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersApi.getById(id),
    select: (response) => response.data,
    enabled: !!id && !id.startsWith('local-'),
  });
}

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: customerKeys.search(query),
    queryFn: () => customersApi.search(query),
    select: (response) => response.data,
    enabled: query.length >= 2,
  });
}

export function useCustomerStats(id: string) {
  return useQuery({
    queryKey: customerKeys.stats(id),
    queryFn: () => customersApi.getStats(id),
    select: (response) => response.data,
    enabled: !!id && !id.startsWith('local-'),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      if (!isOnline) {
        const localCustomer: Customer = {
          id: generateLocalId(),
          ...data,
          name: data.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addToQueue({
          type: 'create',
          entity: 'customer',
          data,
          localId: localCustomer.id,
        });
        return { data: localCustomer };
      }
      return customersApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomerRequest }) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'update',
          entity: 'customer',
          data: { id, ...data },
          localId: id,
        });
        return { data: { id, ...data } as Customer };
      }
      return customersApi.update(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'delete',
          entity: 'customer',
          data: { id },
          localId: id,
        });
        return;
      }
      return customersApi.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
