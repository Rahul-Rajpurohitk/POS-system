import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from './api';
import { analyticsKeys, analyticsInvalidationKeys } from './keys';
import type { ReportPeriod } from './types';

// ============ DASHBOARD ============

/**
 * Hook to fetch enhanced dashboard data
 */
export function useEnhancedDashboard(period: ReportPeriod = 'today') {
  return useQuery({
    queryKey: analyticsKeys.dashboard(period),
    queryFn: () => analyticsApi.getDashboard(period),
    select: (response) => response.data.data,
    // Dashboard should refresh frequently for real-time feel
    staleTime: period === 'today' ? 30 * 1000 : 5 * 60 * 1000, // 30s for today, 5m otherwise
    refetchInterval: period === 'today' ? 60 * 1000 : false, // Auto-refresh every minute for today
  });
}

// ============ PRODUCT ANALYTICS ============

/**
 * Hook to fetch ABC classification
 */
export function useABCClassification(params?: {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...apiParams } = params || {};

  return useQuery({
    queryKey: analyticsKeys.abcWithRange(apiParams.startDate, apiParams.endDate),
    queryFn: () => analyticsApi.getABCClassification(apiParams),
    select: (response) => response.data.data,
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to fetch product performance
 */
export function useProductPerformance(params?: {
  period?: ReportPeriod;
  limit?: number;
  enabled?: boolean;
}) {
  const { enabled = true, period = 'this_month', ...apiParams } = params || {};

  return useQuery({
    queryKey: analyticsKeys.productPerformance(period),
    queryFn: () => analyticsApi.getProductPerformance({ period, ...apiParams }),
    select: (response) => response.data.data,
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============ CUSTOMER ANALYTICS ============

/**
 * Hook to fetch RFM segmentation
 */
export function useRFMSegmentation(enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.rfm(),
    queryFn: () => analyticsApi.getRFMSegmentation(),
    select: (response) => response.data.data,
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to fetch customer cohorts
 */
export function useCustomerCohorts(enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.cohorts(),
    queryFn: () => analyticsApi.getCustomerCohorts(),
    select: (response) => response.data.data,
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ============ REVENUE ANALYTICS ============

/**
 * Hook to fetch revenue trends
 */
export function useRevenueTrends(params?: {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) {
  const { enabled = true, period = 'this_month', ...apiParams } = params || {};

  return useQuery({
    queryKey: analyticsKeys.revenueTrends(period),
    queryFn: () => analyticsApi.getRevenueTrends({ period, ...apiParams }),
    select: (response) => response.data.data,
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch sales forecast
 */
export function useSalesForecast(days = 14, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.forecast(days),
    queryFn: () => analyticsApi.getSalesForecast(days),
    select: (response) => response.data.data,
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============ OPERATIONS ANALYTICS ============

/**
 * Hook to fetch peak hours analysis
 */
export function usePeakHoursAnalysis(enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.peakHours(),
    queryFn: () => analyticsApi.getPeakHoursAnalysis(),
    select: (response) => response.data.data,
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to fetch staff performance
 */
export function useStaffPerformance(params?: {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) {
  const { enabled = true, period = 'this_month', ...apiParams } = params || {};

  return useQuery({
    queryKey: analyticsKeys.staffPerformance(period),
    queryFn: () => analyticsApi.getStaffPerformance({ period, ...apiParams }),
    select: (response) => response.data.data,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ INVENTORY ANALYTICS ============

/**
 * Hook to fetch inventory intelligence
 */
export function useInventoryIntelligence(enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.inventoryIntelligence(),
    queryFn: () => analyticsApi.getInventoryIntelligence(),
    select: (response) => response.data.data,
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ============ CACHE MANAGEMENT ============

/**
 * Hook to fetch cache status
 */
export function useCacheStatus(enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.cacheStatus(),
    queryFn: () => analyticsApi.getCacheStatus(),
    select: (response) => response.data.data,
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to invalidate analytics cache
 */
export function useInvalidateAnalyticsCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type?: 'time-sensitive' | 'inventory' | 'customer') =>
      analyticsApi.invalidateCache(type),
    onSuccess: (_, type) => {
      // Invalidate appropriate queries based on type
      if (!type) {
        queryClient.invalidateQueries({ queryKey: analyticsInvalidationKeys.all() });
      } else if (type === 'time-sensitive') {
        analyticsInvalidationKeys.timeSensitive().forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      } else if (type === 'inventory') {
        analyticsInvalidationKeys.products().forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      } else if (type === 'customer') {
        analyticsInvalidationKeys.customers().forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
}

/**
 * Hook to warm analytics cache
 */
export function useWarmAnalyticsCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyticsApi.warmCache(),
    onSuccess: () => {
      // Invalidate all analytics queries to fetch fresh cached data
      queryClient.invalidateQueries({ queryKey: analyticsInvalidationKeys.all() });
    },
  });
}

// ============ REFRESH HOOKS ============

/**
 * Hook to refresh specific analytics data
 */
export function useRefreshABCClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyticsApi.getABCClassification({ refresh: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.abc() });
    },
  });
}

export function useRefreshRFMSegmentation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyticsApi.getRFMSegmentation(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.rfm() });
    },
  });
}

export function useRefreshPeakHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyticsApi.getPeakHoursAnalysis(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.peakHours() });
    },
  });
}

export function useRefreshInventoryIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyticsApi.getInventoryIntelligence(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.inventoryIntelligence() });
    },
  });
}
