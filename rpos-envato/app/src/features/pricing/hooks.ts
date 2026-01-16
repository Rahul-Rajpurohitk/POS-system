import { useQuery } from '@tanstack/react-query';
import {
  getProductPriceHistory,
  getProductMarginTrend,
  getProductCostTrend,
  getRecentPriceChanges,
  getPriceVolatilityReport,
  getMarginAlerts,
  getCostChanges,
  PriceChangeType,
} from './api';

// Query keys
export const pricingKeys = {
  all: ['pricing'] as const,
  priceHistory: (productId: string) => [...pricingKeys.all, 'priceHistory', productId] as const,
  marginTrend: (productId: string, days?: number) => [...pricingKeys.all, 'marginTrend', productId, days] as const,
  costTrend: (productId: string, days?: number) => [...pricingKeys.all, 'costTrend', productId, days] as const,
  recentChanges: (productId: string) => [...pricingKeys.all, 'recentChanges', productId] as const,
  volatilityReport: (days?: number) => [...pricingKeys.all, 'volatilityReport', days] as const,
  marginAlerts: (threshold?: number) => [...pricingKeys.all, 'marginAlerts', threshold] as const,
  costChanges: (days?: number) => [...pricingKeys.all, 'costChanges', days] as const,
};

/**
 * Hook to fetch price history for a product
 */
export function usePriceHistory(
  productId: string | undefined,
  options?: { priceType?: PriceChangeType; limit?: number }
) {
  return useQuery({
    queryKey: pricingKeys.priceHistory(productId || ''),
    queryFn: () => getProductPriceHistory(productId!, options),
    enabled: !!productId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch margin trend for a product
 */
export function useMarginTrend(productId: string | undefined, days: number = 90) {
  return useQuery({
    queryKey: pricingKeys.marginTrend(productId || '', days),
    queryFn: () => getProductMarginTrend(productId!, days),
    enabled: !!productId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch cost trend for a product
 */
export function useCostTrend(productId: string | undefined, days: number = 90) {
  return useQuery({
    queryKey: pricingKeys.costTrend(productId || '', days),
    queryFn: () => getProductCostTrend(productId!, days),
    enabled: !!productId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch recent price changes for a product
 */
export function useRecentPriceChanges(productId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: pricingKeys.recentChanges(productId || ''),
    queryFn: () => getRecentPriceChanges(productId!, limit),
    enabled: !!productId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch price volatility report
 */
export function usePriceVolatilityReport(days: number = 30) {
  return useQuery({
    queryKey: pricingKeys.volatilityReport(days),
    queryFn: () => getPriceVolatilityReport(days),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch margin erosion alerts
 */
export function useMarginAlerts(threshold: number = 5) {
  return useQuery({
    queryKey: pricingKeys.marginAlerts(threshold),
    queryFn: () => getMarginAlerts(threshold),
    staleTime: 60000,
  });
}

/**
 * Hook to fetch cost changes report
 */
export function useCostChanges(days: number = 30) {
  return useQuery({
    queryKey: pricingKeys.costChanges(days),
    queryFn: () => getCostChanges(days),
    staleTime: 60000,
  });
}
