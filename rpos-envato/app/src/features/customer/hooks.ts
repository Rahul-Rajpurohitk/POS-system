import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import { useCustomerStore } from '@/store/customerStore';
import type { ApiResponse, Coupon } from '@/types';
import {
  customerStoreApi,
  customerOrderApi,
  customerCouponApi,
  customerAddressApi,
  type PlaceOrderRequest,
  type PlaceOrderResponse,
  type ValidateCouponRequest,
  type CustomerOrderHistoryQuery,
} from './api';

// ============================================
// Query Keys
// ============================================

export const customerKeys = {
  all: ['customer'] as const,
  store: () => [...customerKeys.all, 'store'] as const,
  storeInfo: () => [...customerKeys.store(), 'info'] as const,
  menu: () => [...customerKeys.all, 'menu'] as const,
  categories: () => [...customerKeys.menu(), 'categories'] as const,
  products: () => [...customerKeys.menu(), 'products'] as const,
  productList: (params?: { categoryId?: string; search?: string }) =>
    [...customerKeys.products(), 'list', params] as const,
  productDetail: (id: string) => [...customerKeys.products(), 'detail', id] as const,
  featured: () => [...customerKeys.menu(), 'featured'] as const,
  orders: () => [...customerKeys.all, 'orders'] as const,
  orderList: (params?: CustomerOrderHistoryQuery) => [...customerKeys.orders(), 'list', params] as const,
  orderDetail: (id: string) => [...customerKeys.orders(), 'detail', id] as const,
  activeOrder: () => [...customerKeys.orders(), 'active'] as const,
  coupons: () => [...customerKeys.all, 'coupons'] as const,
  addresses: () => [...customerKeys.all, 'addresses'] as const,
};

// ============================================
// Store Info Hooks
// ============================================

export function useStoreInfo() {
  const setStoreInfo = useCustomerStore((s) => s.setStoreInfo);

  const query = useQuery({
    queryKey: customerKeys.storeInfo(),
    queryFn: () => customerStoreApi.getStoreInfo(),
    select: (response) => response.data.data,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Sync store info to store
  useEffect(() => {
    if (query.data) {
      setStoreInfo({
        name: query.data.name,
        address: query.data.address,
        phone: query.data.phone,
        hours: query.data.estimatedDeliveryTime,
        isOpen: query.data.isOpen,
      });
    }
  }, [query.data, setStoreInfo]);

  return query;
}

// ============================================
// Menu Hooks
// ============================================

export function useMenuCategories() {
  return useQuery({
    queryKey: customerKeys.categories(),
    queryFn: () => customerStoreApi.getCategories(),
    select: (response) => response.data.data,
    staleTime: 300000, // 5 minutes
  });
}

export function useMenuProducts(params?: { categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: customerKeys.productList(params),
    queryFn: () => customerStoreApi.getAllProducts(params),
    select: (response) => response.data.data,
    staleTime: 60000, // 1 minute
  });
}

export function useInfiniteMenuProducts(params?: { categoryId?: string; search?: string }) {
  return useInfiniteQuery({
    queryKey: customerKeys.productList(params),
    queryFn: ({ pageParam = 1 }) =>
      customerStoreApi.getAllProducts({ ...params, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages.map((page) => page.data.data),
      pageParams: data.pageParams,
    }),
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: customerKeys.featured(),
    queryFn: () => customerStoreApi.getFeaturedProducts(),
    select: (response) => response.data.data,
    staleTime: 300000, // 5 minutes
  });
}

export function useProductDetails(productId: string) {
  return useQuery({
    queryKey: customerKeys.productDetail(productId),
    queryFn: () => customerStoreApi.getProductDetails(productId),
    select: (response) => response.data.data,
    enabled: !!productId,
    staleTime: 60000, // 1 minute
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: customerKeys.productList({ search: query }),
    queryFn: () => customerStoreApi.searchProducts(query),
    select: (response) => response.data.data,
    enabled: query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}

// ============================================
// Order Hooks
// ============================================

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  const clearCart = useCustomerStore((s) => s.clearCart);
  const setActiveOrder = useCustomerStore((s) => s.setActiveOrder);

  return useMutation<
    AxiosResponse<ApiResponse<PlaceOrderResponse>>,
    Error,
    PlaceOrderRequest
  >({
    mutationFn: (data: PlaceOrderRequest) => customerOrderApi.placeOrder(data),
    onSuccess: (response) => {
      const { order } = response.data.data;
      setActiveOrder(order);
      clearCart();
      queryClient.invalidateQueries({ queryKey: customerKeys.orders() });
      queryClient.invalidateQueries({ queryKey: customerKeys.activeOrder() });
    },
  });
}

export function useOrderHistory(params?: CustomerOrderHistoryQuery) {
  return useQuery({
    queryKey: customerKeys.orderList(params),
    queryFn: () => customerOrderApi.getOrderHistory(params),
    select: (response) => response.data.data,
    staleTime: 30000, // 30 seconds
  });
}

export function useInfiniteOrderHistory(params?: Omit<CustomerOrderHistoryQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: customerKeys.orderList(params),
    queryFn: ({ pageParam = 1 }) =>
      customerOrderApi.getOrderHistory({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages.map((page) => page.data.data),
      pageParams: data.pageParams,
    }),
  });
}

export function useOrderDetails(orderId: string) {
  return useQuery({
    queryKey: customerKeys.orderDetail(orderId),
    queryFn: () => customerOrderApi.getOrderDetails(orderId),
    select: (response) => response.data.data,
    enabled: !!orderId,
    staleTime: 10000, // 10 seconds
  });
}

export function useActiveOrder() {
  const setActiveOrder = useCustomerStore((s) => s.setActiveOrder);

  const query = useQuery({
    queryKey: customerKeys.activeOrder(),
    queryFn: () => customerOrderApi.getActiveOrder(),
    select: (response) => response.data.data,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });

  // Sync active order to store
  useEffect(() => {
    if (query.isSuccess) {
      setActiveOrder(query.data ?? null);
    }
  }, [query.data, query.isSuccess, setActiveOrder]);

  return query;
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const setActiveOrder = useCustomerStore((s) => s.setActiveOrder);

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      customerOrderApi.cancelOrder(orderId, reason),
    onSuccess: () => {
      setActiveOrder(null);
      queryClient.invalidateQueries({ queryKey: customerKeys.orders() });
      queryClient.invalidateQueries({ queryKey: customerKeys.activeOrder() });
    },
  });
}

export function useReorder() {
  const queryClient = useQueryClient();
  const setActiveOrder = useCustomerStore((s) => s.setActiveOrder);

  return useMutation<
    AxiosResponse<ApiResponse<PlaceOrderResponse>>,
    Error,
    string
  >({
    mutationFn: (orderId: string) => customerOrderApi.reorder(orderId),
    onSuccess: (response) => {
      const { order } = response.data.data;
      setActiveOrder(order);
      queryClient.invalidateQueries({ queryKey: customerKeys.orders() });
      queryClient.invalidateQueries({ queryKey: customerKeys.activeOrder() });
    },
  });
}

// ============================================
// Coupon Hooks
// ============================================

export function useValidateCoupon() {
  const applyCoupon = useCustomerStore((s) => s.applyCoupon);

  return useMutation<
    AxiosResponse<ApiResponse<Coupon>>,
    Error,
    ValidateCouponRequest
  >({
    mutationFn: (data: ValidateCouponRequest) => customerCouponApi.validateCoupon(data),
    onSuccess: (response) => {
      const coupon = response.data.data;
      applyCoupon(coupon);
    },
  });
}

export function useAvailableCoupons() {
  return useQuery({
    queryKey: customerKeys.coupons(),
    queryFn: () => customerCouponApi.getAvailableCoupons(),
    select: (response) => response.data.data,
    staleTime: 300000, // 5 minutes
  });
}

// ============================================
// Address Hooks
// ============================================

export function useCheckDeliverability() {
  return useMutation({
    mutationFn: ({
      address,
      latitude,
      longitude,
    }: {
      address: string;
      latitude?: number;
      longitude?: number;
    }) => customerAddressApi.checkDeliverability(address, latitude, longitude),
  });
}

export function useGeocodeAddress() {
  return useMutation({
    mutationFn: (address: string) => customerAddressApi.geocodeAddress(address),
  });
}

export function useSavedAddresses() {
  return useQuery({
    queryKey: customerKeys.addresses(),
    queryFn: () => customerAddressApi.getSavedAddresses(),
    select: (response) => response.data.data,
    staleTime: 300000, // 5 minutes
  });
}

interface SaveAddressData {
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  isDefault?: boolean;
}

export function useSaveAddress() {
  const queryClient = useQueryClient();
  const addSavedAddress = useCustomerStore((s) => s.addSavedAddress);

  return useMutation<
    AxiosResponse<ApiResponse<{ id: string }>>,
    Error,
    SaveAddressData
  >({
    mutationFn: (data: SaveAddressData) => customerAddressApi.saveAddress(data),
    onSuccess: (response, variables) => {
      addSavedAddress({
        id: response.data.data.id,
        ...variables,
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.addresses() });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const removeSavedAddress = useCustomerStore((s) => s.removeSavedAddress);

  return useMutation({
    mutationFn: (addressId: string) => customerAddressApi.deleteAddress(addressId),
    onSuccess: (_, addressId) => {
      removeSavedAddress(addressId);
      queryClient.invalidateQueries({ queryKey: customerKeys.addresses() });
    },
  });
}
