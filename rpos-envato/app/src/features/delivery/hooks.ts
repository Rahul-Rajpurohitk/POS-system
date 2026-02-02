import { useEffect, useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Vibration } from 'react-native';
import type { AxiosResponse } from 'axios';
import type { ApiResponse, Delivery } from '@/types';
import {
  onlineOrderApi,
  driverAssignmentApi,
  activeDeliveriesApi,
  deliveryZonesApi,
  type OnlineOrderQueueItem,
  type DriverSuggestion,
  type DeliveryStats,
  type DeliveryZone,
} from './api';

// ============================================
// Query Keys
// ============================================

export const deliveryKeys = {
  all: ['delivery'] as const,
  orders: () => [...deliveryKeys.all, 'orders'] as const,
  pendingOrders: () => [...deliveryKeys.orders(), 'pending'] as const,
  queueStats: () => [...deliveryKeys.orders(), 'stats'] as const,
  drivers: () => [...deliveryKeys.all, 'drivers'] as const,
  availableDrivers: () => [...deliveryKeys.drivers(), 'available'] as const,
  driverSuggestions: (deliveryId: string) => [...deliveryKeys.drivers(), 'suggestions', deliveryId] as const,
  deliveries: () => [...deliveryKeys.all, 'deliveries'] as const,
  activeDeliveries: () => [...deliveryKeys.deliveries(), 'active'] as const,
  deliveryDetail: (id: string) => [...deliveryKeys.deliveries(), 'detail', id] as const,
  deliveryStats: () => [...deliveryKeys.deliveries(), 'stats'] as const,
  deliveryHistory: (params?: object) => [...deliveryKeys.deliveries(), 'history', params] as const,
  zones: () => [...deliveryKeys.all, 'zones'] as const,
};

// ============================================
// Sound Hook for Notifications
// ============================================

export function useNotificationSound() {
  const playSound = useCallback(async () => {
    try {
      // Use vibration as fallback notification
      // TODO: Add expo-av for sound: npm install expo-av
      Vibration.vibrate([0, 250, 100, 250]);
      console.log('📢 New order notification');
    } catch (error) {
      console.warn('Failed to play notification:', error);
    }
  }, []);

  return { playSound };
}

// ============================================
// Online Order Queue Hooks
// ============================================

// Enable delivery backend API calls
const DELIVERY_BACKEND_ENABLED = true;

export function usePendingOrders(options?: { enableSound?: boolean }) {
  const { playSound } = useNotificationSound();
  const previousCountRef = useRef<number>(0);

  const query = useQuery({
    queryKey: deliveryKeys.pendingOrders(),
    queryFn: () => onlineOrderApi.getPendingOrders(),
    select: (response) => response.data.data,
    staleTime: 5000, // 5 seconds
    refetchInterval: DELIVERY_BACKEND_ENABLED ? 10000 : false, // Auto-refetch every 10 seconds when enabled
    retry: false, // Don't retry if endpoint doesn't exist yet
    throwOnError: false, // Don't throw - return error in query state
    enabled: DELIVERY_BACKEND_ENABLED, // Disable until backend is ready
  });

  // Play sound when new orders arrive
  useEffect(() => {
    if (options?.enableSound && query.data) {
      const currentCount = query.data.length;
      if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
        playSound();
      }
      previousCountRef.current = currentCount;
    }
  }, [query.data, options?.enableSound, playSound]);

  return query;
}

export function useQueueStats() {
  return useQuery({
    queryKey: deliveryKeys.queueStats(),
    queryFn: () => onlineOrderApi.getQueueStats(),
    select: (response) => response.data.data,
    staleTime: 10000,
    refetchInterval: DELIVERY_BACKEND_ENABLED ? 15000 : false,
    retry: false, // Don't retry if endpoint doesn't exist yet
    throwOnError: false,
    enabled: DELIVERY_BACKEND_ENABLED, // Disable until backend is ready
  });
}

/**
 * Accept an online order from the queue
 * @param queueEntryId - The queue entry ID (OnlineOrderQueueItem.id), NOT the orderId
 */
export function useAcceptOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<{ queueEntry: OnlineOrderQueueItem; order: any; delivery?: Delivery }>>,
    Error,
    string
  >({
    mutationFn: (queueEntryId: string) => onlineOrderApi.acceptOrder(queueEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.pendingOrders() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.queueStats() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.activeDeliveries() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryStats() });
    },
  });
}

/**
 * Reject an online order from the queue
 * @param queueEntryId - The queue entry ID (OnlineOrderQueueItem.id), NOT the orderId
 */
export function useRejectOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<void>>,
    Error,
    { orderId: string; reason?: string }
  >({
    // Note: orderId param name kept for backwards compatibility, but it's actually the queueEntryId
    mutationFn: ({ orderId, reason }) => onlineOrderApi.rejectOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.pendingOrders() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.queueStats() });
    },
  });
}

// ============================================
// Driver Assignment Hooks
// ============================================

export function useAvailableDrivers() {
  return useQuery({
    queryKey: deliveryKeys.availableDrivers(),
    queryFn: () => driverAssignmentApi.getAvailableDrivers(),
    select: (response) => response.data.data,
    staleTime: 10000,
    refetchInterval: DELIVERY_BACKEND_ENABLED ? 30000 : false,
    retry: false, // Don't retry if endpoint doesn't exist yet
    throwOnError: false,
    enabled: DELIVERY_BACKEND_ENABLED, // Disable until backend is ready
  });
}

export function useDriverSuggestions(deliveryId: string) {
  return useQuery({
    queryKey: deliveryKeys.driverSuggestions(deliveryId),
    queryFn: () => driverAssignmentApi.getDriverSuggestions(deliveryId),
    select: (response) => response.data.data,
    enabled: !!deliveryId,
    staleTime: 15000,
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<Delivery>>,
    Error,
    { deliveryId: string; driverId: string }
  >({
    mutationFn: ({ deliveryId, driverId }) =>
      driverAssignmentApi.assignDriver(deliveryId, driverId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.activeDeliveries() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryDetail(variables.deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.availableDrivers() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryStats() });
    },
  });
}

export function useUnassignDriver() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<Delivery>>,
    Error,
    string
  >({
    mutationFn: (deliveryId: string) => driverAssignmentApi.unassignDriver(deliveryId),
    onSuccess: (_, deliveryId) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.activeDeliveries() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryDetail(deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.availableDrivers() });
    },
  });
}

// ============================================
// Active Deliveries Hooks
// ============================================

export function useActiveDeliveries() {
  return useQuery({
    queryKey: deliveryKeys.activeDeliveries(),
    queryFn: () => activeDeliveriesApi.getActiveDeliveries(),
    select: (response) => response.data.data,
    staleTime: 5000,
    refetchInterval: DELIVERY_BACKEND_ENABLED ? 15000 : false,
    retry: false, // Don't retry if endpoint doesn't exist yet
    throwOnError: false,
    enabled: DELIVERY_BACKEND_ENABLED, // Disable until backend is ready
  });
}

export function useDeliveryDetails(deliveryId: string) {
  return useQuery({
    queryKey: deliveryKeys.deliveryDetail(deliveryId),
    queryFn: () => activeDeliveriesApi.getDeliveryDetails(deliveryId),
    select: (response) => response.data.data,
    enabled: !!deliveryId,
    staleTime: 10000,
  });
}

export function useDeliveryStats() {
  return useQuery({
    queryKey: deliveryKeys.deliveryStats(),
    queryFn: () => activeDeliveriesApi.getDeliveryStats(),
    select: (response) => response.data.data,
    staleTime: 30000,
    refetchInterval: DELIVERY_BACKEND_ENABLED ? 60000 : false,
    retry: false, // Don't retry if endpoint doesn't exist yet
    throwOnError: false,
    enabled: DELIVERY_BACKEND_ENABLED, // Disable until backend is ready
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<Delivery>>,
    Error,
    { deliveryId: string; reason?: string }
  >({
    mutationFn: ({ deliveryId, reason }) =>
      activeDeliveriesApi.cancelDelivery(deliveryId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.activeDeliveries() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryDetail(variables.deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryStats() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.availableDrivers() });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<Delivery>>,
    Error,
    { deliveryId: string; status: string }
  >({
    mutationFn: ({ deliveryId, status }) =>
      activeDeliveriesApi.updateStatus(deliveryId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.activeDeliveries() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryDetail(variables.deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryStats() });
    },
  });
}

export function useAutoAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation<
    AxiosResponse<ApiResponse<Delivery>>,
    Error,
    string
  >({
    mutationFn: (deliveryId: string) =>
      activeDeliveriesApi.autoAssignDriver(deliveryId),
    onSuccess: (_, deliveryId) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.activeDeliveries() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryDetail(deliveryId) });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.availableDrivers() });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.deliveryStats() });
    },
  });
}

export function useDeliveryHistory(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: deliveryKeys.deliveryHistory(params),
    queryFn: () => activeDeliveriesApi.getDeliveryHistory(params),
    select: (response) => response.data.data,
    staleTime: 30000,
  });
}

// ============================================
// Delivery Zones Hooks
// ============================================

export function useDeliveryZones() {
  return useQuery({
    queryKey: deliveryKeys.zones(),
    queryFn: () => deliveryZonesApi.getZones(),
    select: (response) => response.data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes - zones don't change often
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * Get the primary (largest radius) delivery zone for the business
 */
export function usePrimaryDeliveryZone() {
  const { data: zones, ...queryState } = useDeliveryZones();

  // Return the zone with the largest radius (primary/extended zone)
  const primaryZone = zones?.reduce((largest, zone) => {
    if (!largest || zone.radiusMeters > largest.radiusMeters) {
      return zone;
    }
    return largest;
  }, null as DeliveryZone | null);

  return {
    ...queryState,
    data: primaryZone,
    zones,
  };
}

// ============================================
// Countdown Timer Hook
// ============================================

export function useCountdown(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft > 0 && timeLeft <= 120; // Last 2 minutes
  const isExpired = timeLeft <= 0;

  return {
    timeLeft,
    minutes,
    seconds,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    isUrgent,
    isExpired,
  };
}

