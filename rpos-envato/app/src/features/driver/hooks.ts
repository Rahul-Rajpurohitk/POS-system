import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useDriverStore } from '@/store/driverStore';
import {
  driverApi,
  deliveryApi,
  trackingApi,
  type DeliveryHistoryQuery,
  type UpdateStatusRequest,
  type UpdateLocationRequest,
  type UpdateDeliveryStatusRequest,
  type CompleteDeliveryRequest,
  type ReportIssueRequest,
} from './api';
import type { DriverStatus, DeliveryStatus } from '@/types';

// ============================================
// Query Keys
// ============================================

export const driverKeys = {
  all: ['driver'] as const,
  profile: () => [...driverKeys.all, 'profile'] as const,
  stats: () => [...driverKeys.all, 'stats'] as const,
  earnings: (period?: string) => [...driverKeys.all, 'earnings', period] as const,
  activeDelivery: () => [...driverKeys.all, 'active-delivery'] as const,
  deliveries: () => [...driverKeys.all, 'deliveries'] as const,
  deliveryList: (params?: DeliveryHistoryQuery) => [...driverKeys.deliveries(), 'list', params] as const,
  deliveryRoute: (id: string) => [...driverKeys.all, 'route', id] as const,
};

export const deliveryKeys = {
  all: ['deliveries'] as const,
  lists: () => [...deliveryKeys.all, 'list'] as const,
  list: (params?: { page?: number; limit?: number; status?: DeliveryStatus }) =>
    [...deliveryKeys.lists(), params] as const,
  active: () => [...deliveryKeys.all, 'active'] as const,
  details: () => [...deliveryKeys.all, 'detail'] as const,
  detail: (id: string) => [...deliveryKeys.details(), id] as const,
};

export const trackingKeys = {
  all: ['tracking'] as const,
  info: (token: string) => [...trackingKeys.all, 'info', token] as const,
  location: (token: string) => [...trackingKeys.all, 'location', token] as const,
  history: (token: string) => [...trackingKeys.all, 'history', token] as const,
};

// ============================================
// Driver Profile Hooks
// ============================================

export function useDriverProfile() {
  const setProfile = useDriverStore((s) => s.setProfile);

  const query = useQuery({
    queryKey: driverKeys.profile(),
    queryFn: () => driverApi.getMyProfile(),
    select: (response) => response.data.data,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });

  // Sync profile to store when data changes
  useEffect(() => {
    if (query.data) {
      setProfile(query.data);
    }
  }, [query.data, setProfile]);

  return query;
}

export function useDriverStats() {
  const setStats = useDriverStore((s) => s.setStats);

  const query = useQuery({
    queryKey: driverKeys.stats(),
    queryFn: () => driverApi.getStats(),
    select: (response) => response.data.data,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Auto-refetch every minute
  });

  // Sync stats to store when data changes
  useEffect(() => {
    if (query.data) {
      setStats(query.data);
    }
  }, [query.data, setStats]);

  return query;
}

export function useDriverEarnings(period: 'today' | 'week' | 'month' = 'today') {
  return useQuery({
    queryKey: driverKeys.earnings(period),
    queryFn: () => driverApi.getEarnings(period),
    select: (response) => response.data.data,
    staleTime: 60000, // 1 minute
  });
}

// ============================================
// Driver Status Hooks
// ============================================

export function useUpdateDriverStatus() {
  const queryClient = useQueryClient();
  const setStatus = useDriverStore((s) => s.setStatus);

  return useMutation({
    mutationFn: (status: DriverStatus) =>
      driverApi.updateStatus({ status }),
    onSuccess: (response) => {
      const profile = response.data.data;
      if (profile) {
        setStatus(profile.status);
      }
      queryClient.invalidateQueries({ queryKey: driverKeys.profile() });
    },
  });
}

export function useUpdateDriverLocation() {
  return useMutation({
    mutationFn: (data: UpdateLocationRequest) =>
      driverApi.updateLocation(data),
  });
}

// ============================================
// Active Delivery Hooks
// ============================================

export function useActiveDelivery() {
  const setActiveDelivery = useDriverStore((s) => s.setActiveDelivery);

  const query = useQuery({
    queryKey: driverKeys.activeDelivery(),
    queryFn: () => driverApi.getActiveDelivery(),
    select: (response) => response.data.data,
    staleTime: 5000, // 5 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Auto-refetch every 10 seconds
  });

  // Sync active delivery to store when data changes
  useEffect(() => {
    if (query.isSuccess) {
      setActiveDelivery(query.data ?? null);
    }
  }, [query.data, query.isSuccess, setActiveDelivery]);

  return query;
}

export function useDeliveryHistory(params?: DeliveryHistoryQuery) {
  return useQuery({
    queryKey: driverKeys.deliveryList(params),
    queryFn: () => driverApi.getDeliveryHistory(params),
    select: (response) => response.data.data,
    staleTime: 30000,
  });
}

export function useInfiniteDeliveryHistory(params?: Omit<DeliveryHistoryQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: driverKeys.deliveryList(params),
    queryFn: ({ pageParam = 1 }) =>
      driverApi.getDeliveryHistory({ ...params, page: pageParam }),
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

// ============================================
// Delivery Status Update Hooks
// ============================================

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const updateActiveDelivery = useDriverStore((s) => s.updateActiveDelivery);

  return useMutation({
    mutationFn: ({ deliveryId, status }: { deliveryId: string; status: DeliveryStatus }) =>
      driverApi.updateDeliveryStatus(deliveryId, { status }),
    onSuccess: (response, { status }) => {
      const delivery = response.data.data;
      if (delivery) {
        updateActiveDelivery({ status });
      }
      queryClient.invalidateQueries({ queryKey: driverKeys.activeDelivery() });
      queryClient.invalidateQueries({ queryKey: driverKeys.deliveries() });
    },
  });
}

export function useCompleteDelivery() {
  const queryClient = useQueryClient();
  const setActiveDelivery = useDriverStore((s) => s.setActiveDelivery);
  const incrementDeliveryCount = useDriverStore((s) => s.incrementDeliveryCount);

  return useMutation({
    mutationFn: ({ deliveryId, data }: { deliveryId: string; data: CompleteDeliveryRequest }) =>
      driverApi.completeDelivery(deliveryId, data),
    onSuccess: () => {
      setActiveDelivery(null);
      incrementDeliveryCount();
      queryClient.invalidateQueries({ queryKey: driverKeys.activeDelivery() });
      queryClient.invalidateQueries({ queryKey: driverKeys.deliveries() });
      queryClient.invalidateQueries({ queryKey: driverKeys.stats() });
      queryClient.invalidateQueries({ queryKey: driverKeys.profile() });
    },
  });
}

export function useReportIssue() {
  return useMutation({
    mutationFn: ({ deliveryId, data }: { deliveryId: string; data: ReportIssueRequest }) =>
      driverApi.reportIssue(deliveryId, data),
  });
}

export function useDeliveryRoute(deliveryId: string) {
  return useQuery({
    queryKey: driverKeys.deliveryRoute(deliveryId),
    queryFn: () => driverApi.getDeliveryRoute(deliveryId),
    select: (response) => response.data.data,
    enabled: !!deliveryId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute for live updates
  });
}

// ============================================
// POS Delivery Management Hooks
// ============================================

export function useDeliveries(params?: { page?: number; limit?: number; status?: DeliveryStatus }) {
  return useQuery({
    queryKey: deliveryKeys.list(params),
    queryFn: () => deliveryApi.getAll(params),
    select: (response) => response.data.data,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useActiveDeliveries() {
  return useQuery({
    queryKey: deliveryKeys.active(),
    queryFn: () => deliveryApi.getActive(),
    select: (response) => response.data.data,
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Auto-refetch every 10 seconds
  });
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: deliveryKeys.detail(id),
    queryFn: () => deliveryApi.getById(id),
    select: (response) => response.data.data,
    enabled: !!id,
    staleTime: 10000,
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, driverId }: { deliveryId: string; driverId: string }) =>
      deliveryApi.assignDriver(deliveryId, driverId),
    onSuccess: (_, { deliveryId }) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.active() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

export function useAutoAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliveryId: string) => deliveryApi.autoAssignDriver(deliveryId),
    onSuccess: (_, deliveryId) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.active() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, reason }: { deliveryId: string; reason?: string }) =>
      deliveryApi.cancel(deliveryId, reason),
    onSuccess: (_, { deliveryId }) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.active() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}

// ============================================
// Public Tracking Hooks
// ============================================

export function useTrackingInfo(trackingToken: string) {
  return useQuery({
    queryKey: trackingKeys.info(trackingToken),
    queryFn: () => trackingApi.getTrackingInfo(trackingToken),
    select: (response) => response.data.data,
    enabled: !!trackingToken,
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Auto-refetch every 15 seconds
  });
}

export function useDriverLocation(trackingToken: string, enabled = true) {
  return useQuery({
    queryKey: trackingKeys.location(trackingToken),
    queryFn: () => trackingApi.getDriverLocation(trackingToken),
    select: (response) => response.data.data,
    enabled: !!trackingToken && enabled,
    staleTime: 3000, // 3 seconds
    refetchInterval: 5000, // Auto-refetch every 5 seconds for live tracking
  });
}

export function useStatusHistory(trackingToken: string) {
  return useQuery({
    queryKey: trackingKeys.history(trackingToken),
    queryFn: () => trackingApi.getStatusHistory(trackingToken),
    select: (response) => response.data.data,
    enabled: !!trackingToken,
    staleTime: 30000,
  });
}

export function useRateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trackingToken,
      rating,
      feedback,
    }: {
      trackingToken: string;
      rating: number;
      feedback?: string;
    }) => trackingApi.rateDelivery(trackingToken, rating, feedback),
    onSuccess: (_, { trackingToken }) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.info(trackingToken) });
    },
  });
}

export function useUpdateTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trackingToken, tipAmount }: { trackingToken: string; tipAmount: number }) =>
      trackingApi.updateTip(trackingToken, tipAmount),
    onSuccess: (_, { trackingToken }) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.info(trackingToken) });
    },
  });
}

export function useContactDriver() {
  return useMutation({
    mutationFn: ({ trackingToken, message }: { trackingToken: string; message: string }) =>
      trackingApi.contactDriver(trackingToken, message),
  });
}
