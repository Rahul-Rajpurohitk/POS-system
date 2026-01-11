import type { ReportPeriod } from './types';

/**
 * Analytics Query Keys Factory
 * Provides type-safe query keys for React Query
 */
export const analyticsKeys = {
  // Root key for all analytics queries
  all: ['analytics'] as const,

  // Dashboard
  dashboards: () => [...analyticsKeys.all, 'dashboard'] as const,
  dashboard: (period: ReportPeriod) =>
    [...analyticsKeys.dashboards(), period] as const,

  // ABC Classification (Product Analysis)
  abc: () => [...analyticsKeys.all, 'abc'] as const,
  abcWithRange: (startDate?: string, endDate?: string) =>
    [...analyticsKeys.abc(), { startDate, endDate }] as const,

  // RFM Segmentation (Customer Analysis)
  rfm: () => [...analyticsKeys.all, 'rfm'] as const,

  // Sales Forecasting
  forecasts: () => [...analyticsKeys.all, 'forecast'] as const,
  forecast: (days: number) => [...analyticsKeys.forecasts(), days] as const,

  // Revenue Trends
  revenue: () => [...analyticsKeys.all, 'revenue'] as const,
  revenueTrends: (period: ReportPeriod) =>
    [...analyticsKeys.revenue(), 'trends', period] as const,

  // Peak Hours
  peakHours: () => [...analyticsKeys.all, 'peak-hours'] as const,

  // Staff Performance
  staff: () => [...analyticsKeys.all, 'staff'] as const,
  staffPerformance: (period: ReportPeriod) =>
    [...analyticsKeys.staff(), 'performance', period] as const,

  // Inventory Intelligence
  inventory: () => [...analyticsKeys.all, 'inventory'] as const,
  inventoryIntelligence: () =>
    [...analyticsKeys.inventory(), 'intelligence'] as const,

  // Customer Cohorts
  cohorts: () => [...analyticsKeys.all, 'cohorts'] as const,

  // Product Performance
  products: () => [...analyticsKeys.all, 'products'] as const,
  productPerformance: (period: ReportPeriod) =>
    [...analyticsKeys.products(), 'performance', period] as const,

  // Cache Status
  cacheStatus: () => [...analyticsKeys.all, 'cache', 'status'] as const,
};

/**
 * Helper to get all keys for invalidation
 */
export const analyticsInvalidationKeys = {
  // Invalidate all analytics data
  all: () => analyticsKeys.all,

  // Invalidate dashboard and time-sensitive data
  timeSensitive: () => [
    analyticsKeys.dashboards(),
    analyticsKeys.staff(),
    analyticsKeys.revenue(),
  ],

  // Invalidate product-related analytics
  products: () => [
    analyticsKeys.abc(),
    analyticsKeys.products(),
    analyticsKeys.inventory(),
  ],

  // Invalidate customer-related analytics
  customers: () => [analyticsKeys.rfm(), analyticsKeys.cohorts()],
};
