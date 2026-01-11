// Types
export * from './types';

// Query Keys
export { analyticsKeys, analyticsInvalidationKeys } from './keys';

// API
export { analyticsApi } from './api';

// Hooks
export {
  // Dashboard
  useEnhancedDashboard,
  // Product Analytics
  useABCClassification,
  useProductPerformance,
  // Customer Analytics
  useRFMSegmentation,
  useCustomerCohorts,
  // Revenue Analytics
  useRevenueTrends,
  useSalesForecast,
  // Operations
  usePeakHoursAnalysis,
  useStaffPerformance,
  // Inventory
  useInventoryIntelligence,
  // Cache Management
  useCacheStatus,
  useInvalidateAnalyticsCache,
  useWarmAnalyticsCache,
  // Refresh Hooks
  useRefreshABCClassification,
  useRefreshRFMSegmentation,
  useRefreshPeakHours,
  useRefreshInventoryIntelligence,
} from './hooks';
