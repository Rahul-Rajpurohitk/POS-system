import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductStockHistory,
  getProductRecentActivity,
  getProductLastBatchOrder,
  getProductStockStats,
  createStockAdjustment,
  recordDamage,
  recordInventoryCount,
  getProductActivity,
  CreateStockAdjustmentRequest,
} from './api';

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  stockHistory: (productId: string) => [...inventoryKeys.all, 'stockHistory', productId] as const,
  recentActivity: (productId: string) => [...inventoryKeys.all, 'recentActivity', productId] as const,
  lastBatchOrder: (productId: string) => [...inventoryKeys.all, 'lastBatchOrder', productId] as const,
  stockStats: (productId: string, days?: number) => [...inventoryKeys.all, 'stockStats', productId, days] as const,
  productActivity: (productId: string) => [...inventoryKeys.all, 'productActivity', productId] as const,
};

/**
 * Hook to fetch stock history for a product
 */
export function useProductStockHistory(productId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: inventoryKeys.stockHistory(productId || ''),
    queryFn: () => getProductStockHistory(productId!, limit),
    enabled: !!productId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch recent activity for a product
 */
export function useProductRecentActivity(productId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: inventoryKeys.recentActivity(productId || ''),
    queryFn: () => getProductRecentActivity(productId!, limit),
    enabled: !!productId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch the last batch order for a product
 */
export function useProductLastBatchOrder(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryKeys.lastBatchOrder(productId || ''),
    queryFn: () => getProductLastBatchOrder(productId!),
    enabled: !!productId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch stock statistics for a product
 */
export function useProductStockStats(productId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: inventoryKeys.stockStats(productId || '', days),
    queryFn: () => getProductStockStats(productId!, days),
    enabled: !!productId,
    staleTime: 60000,
  });
}

/**
 * Hook to create a stock adjustment
 */
export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockAdjustmentRequest) => createStockAdjustment(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockHistory(variables.productId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.recentActivity(variables.productId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockStats(variables.productId) });
      // Also invalidate product queries to refresh quantity
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to record damage/loss
 */
export function useRecordDamage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity, reason, notes }: {
      productId: string;
      quantity: number;
      reason?: string;
      notes?: string;
    }) => recordDamage(productId, quantity, reason, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockHistory(variables.productId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.recentActivity(variables.productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to record inventory count
 */
export function useRecordInventoryCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, newQuantity, reason, notes }: {
      productId: string;
      newQuantity: number;
      reason?: string;
      notes?: string;
    }) => recordInventoryCount(productId, newQuantity, reason, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockHistory(variables.productId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.recentActivity(variables.productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to fetch product activity (audit trail)
 */
export function useProductActivity(productId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: inventoryKeys.productActivity(productId || ''),
    queryFn: () => getProductActivity(productId!, limit),
    enabled: !!productId,
    staleTime: 30000,
  });
}
