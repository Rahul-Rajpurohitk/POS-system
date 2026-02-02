import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSyncStore, useCartStore } from '@/store';
import { generateLocalId } from '@/utils';
import { ordersApi } from './api';
import type { OrdersQuery, CreateOrderRequest, UpdateOrderRequest, ExchangeOrderRequest } from './api';
import type { Order } from '@/types';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrdersQuery) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  customer: (customerId: string) => [...orderKeys.all, 'customer', customerId] as const,
  recent: (limit?: number) => [...orderKeys.all, 'recent', limit] as const,
};

export function useOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersApi.getAll(params),
    select: (response) => response.data.data, // Extract data array from { success, data, pagination }
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
    refetchOnMount: true, // Refetch when component mounts
  });
}

export function useInfiniteOrders(params?: Omit<OrdersQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: orderKeys.list(params),
    queryFn: ({ pageParam = 1 }) => ordersApi.getAll({ ...params, page: pageParam }),
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

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.getById(id),
    select: (response) => response.data.data, // Extract order from { success, data }
    enabled: !!id && id.length > 0 && !id.startsWith('local-'),
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
  });
}

export function useOrderStats(dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all') {
  return useQuery({
    queryKey: [...orderKeys.stats(), dateRange],
    queryFn: () => ordersApi.getStats(dateRange),
    select: (response) => response.data.data, // Extract stats from { success, data }
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
    refetchInterval: 60000, // Auto-refetch every minute for dashboard
  });
}

export function useCustomerOrders(customerId: string) {
  return useQuery({
    queryKey: orderKeys.customer(customerId),
    queryFn: () => ordersApi.getByCustomer(customerId),
    select: (response) => response.data.data, // Extract data array from { success, data }
    enabled: !!customerId,
  });
}

export function useRecentOrders(limit?: number) {
  return useQuery({
    queryKey: orderKeys.recent(limit),
    queryFn: () => ordersApi.getRecent(limit),
    select: (response) => response.data.data, // Extract data array from { success, data }
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();
  const { clearCart } = useCartStore();

  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      if (!isOnline) {
        const localOrder: Order = {
          id: generateLocalId(),
          orderNumber: `ORD-${Date.now()}`,
          items: data.items.map(item => ({
            id: generateLocalId(),
            product: {
              id: item.productId,
              name: 'Product', // Will be resolved on sync
              sku: '',
              sellingPrice: item.price,
              purchasePrice: 0,
              quantity: 0,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any,
            quantity: item.quantity,
          })),
          subTotal: data.subTotal,
          discount: data.discount,
          tax: data.tax,
          total: data.total,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Order;
        addToQueue({
          type: 'create',
          entity: 'order',
          data,
          localId: localOrder.id,
        });
        return { data: localOrder };
      }
      return ordersApi.create(data);
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: orderKeys.recent() });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderRequest }) =>
      ordersApi.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: orderKeys.recent() });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: orderKeys.recent() });
    },
  });
}

export function useVoidOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.void(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
    },
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ordersApi.refund(id, data.amount || 0),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
    },
  });
}

export function useExchangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExchangeOrderRequest }) =>
      ordersApi.exchange(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
    },
  });
}
