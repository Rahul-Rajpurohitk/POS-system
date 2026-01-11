import { apiClient } from '@/services/api/client';
import type {
  ReportPeriod,
  AnalyticsApiResponse,
  EnhancedDashboardSummary,
  ABCAnalysisSummary,
  RFMAnalysisSummary,
  ForecastResult,
  RevenueTrendsSummary,
  PeakHoursAnalysis,
  StaffPerformanceSummary,
  InventoryIntelligenceSummary,
  CohortAnalysisSummary,
  ProductPerformanceResponse,
  CacheStatusResponse,
} from './types';

// Base URL for advanced analytics API
const BASE_URL = '/analytics/v2';

/**
 * Analytics API Client
 * Provides methods for all advanced analytics endpoints
 */
export const analyticsApi = {
  // ============ DASHBOARD ============

  /**
   * Get enhanced dashboard with real-time metrics
   */
  getDashboard: (period: ReportPeriod = 'today') =>
    apiClient.get<AnalyticsApiResponse<EnhancedDashboardSummary>>(
      `${BASE_URL}/dashboard`,
      { params: { period } }
    ),

  // ============ PRODUCT ANALYTICS ============

  /**
   * Get ABC (Pareto) classification of products
   */
  getABCClassification: (params?: {
    startDate?: string;
    endDate?: string;
    refresh?: boolean;
  }) =>
    apiClient.get<AnalyticsApiResponse<ABCAnalysisSummary>>(
      `${BASE_URL}/products/abc`,
      { params: { ...params, refresh: params?.refresh ? 'true' : undefined } }
    ),

  /**
   * Get detailed product performance
   */
  getProductPerformance: (params?: {
    period?: ReportPeriod;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient.get<AnalyticsApiResponse<ProductPerformanceResponse>>(
      `${BASE_URL}/products/performance`,
      { params }
    ),

  // ============ CUSTOMER ANALYTICS ============

  /**
   * Get RFM customer segmentation
   */
  getRFMSegmentation: (refresh?: boolean) =>
    apiClient.get<AnalyticsApiResponse<RFMAnalysisSummary>>(
      `${BASE_URL}/customers/rfm`,
      { params: { refresh: refresh ? 'true' : undefined } }
    ),

  /**
   * Get customer cohort analysis
   */
  getCustomerCohorts: (refresh?: boolean) =>
    apiClient.get<AnalyticsApiResponse<CohortAnalysisSummary>>(
      `${BASE_URL}/customers/cohorts`,
      { params: { refresh: refresh ? 'true' : undefined } }
    ),

  // ============ REVENUE ANALYTICS ============

  /**
   * Get revenue trends with projections
   */
  getRevenueTrends: (params?: {
    period?: ReportPeriod;
    startDate?: string;
    endDate?: string;
    refresh?: boolean;
  }) =>
    apiClient.get<AnalyticsApiResponse<RevenueTrendsSummary>>(
      `${BASE_URL}/revenue/trends`,
      { params: { ...params, refresh: params?.refresh ? 'true' : undefined } }
    ),

  /**
   * Get sales forecast
   */
  getSalesForecast: (days: number = 14, refresh?: boolean) =>
    apiClient.get<AnalyticsApiResponse<ForecastResult>>(
      `${BASE_URL}/revenue/forecast`,
      { params: { days, refresh: refresh ? 'true' : undefined } }
    ),

  // ============ OPERATIONS ANALYTICS ============

  /**
   * Get peak hours analysis
   */
  getPeakHoursAnalysis: (refresh?: boolean) =>
    apiClient.get<AnalyticsApiResponse<PeakHoursAnalysis>>(
      `${BASE_URL}/time/peak-hours`,
      { params: { refresh: refresh ? 'true' : undefined } }
    ),

  /**
   * Get staff performance metrics
   */
  getStaffPerformance: (params?: {
    period?: ReportPeriod;
    startDate?: string;
    endDate?: string;
    refresh?: boolean;
  }) =>
    apiClient.get<AnalyticsApiResponse<StaffPerformanceSummary>>(
      `${BASE_URL}/staff/performance`,
      { params: { ...params, refresh: params?.refresh ? 'true' : undefined } }
    ),

  // ============ INVENTORY ANALYTICS ============

  /**
   * Get inventory intelligence with reorder predictions
   */
  getInventoryIntelligence: (refresh?: boolean) =>
    apiClient.get<AnalyticsApiResponse<InventoryIntelligenceSummary>>(
      `${BASE_URL}/inventory/intelligence`,
      { params: { refresh: refresh ? 'true' : undefined } }
    ),

  // ============ CACHE MANAGEMENT ============

  /**
   * Get cache status
   */
  getCacheStatus: () =>
    apiClient.get<AnalyticsApiResponse<CacheStatusResponse>>(
      `${BASE_URL}/cache/status`
    ),

  /**
   * Invalidate analytics cache
   */
  invalidateCache: (type?: 'time-sensitive' | 'inventory' | 'customer') =>
    apiClient.post<AnalyticsApiResponse<{ message: string }>>(
      `${BASE_URL}/cache/invalidate`,
      null,
      { params: { type } }
    ),

  /**
   * Warm analytics cache
   */
  warmCache: () =>
    apiClient.post<AnalyticsApiResponse<{ message: string; warmedCaches: string[] }>>(
      `${BASE_URL}/cache/warm`
    ),
};
