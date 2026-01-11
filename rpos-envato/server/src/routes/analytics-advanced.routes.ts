import { Router } from 'express';
import * as analyticsAdvancedController from '../controllers/analytics-advanced.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isManager, isAdmin } from '../middlewares/manager.middleware';
import { readLimiter, writeLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ DASHBOARD ============
// Enhanced dashboard - available to all authenticated users
router.get(
  '/dashboard',
  readLimiter,
  catchAsync(analyticsAdvancedController.getEnhancedDashboard)
);

// ============ PRODUCT ANALYTICS ============
// ABC Classification - manager only (strategic data)
router.get(
  '/products/abc',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getABCClassification)
);

// Product performance with ABC integration
router.get(
  '/products/performance',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getProductPerformance)
);

// ============ CUSTOMER ANALYTICS ============
// RFM Segmentation - manager only
router.get(
  '/customers/rfm',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getRFMSegmentation)
);

// Customer cohort analysis - manager only
router.get(
  '/customers/cohorts',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getCustomerCohorts)
);

// ============ REVENUE ANALYTICS ============
// Revenue trends with projections - manager only
router.get(
  '/revenue/trends',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getRevenueTrends)
);

// Sales forecasting - manager only
router.get(
  '/revenue/forecast',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getSalesForecast)
);

// ============ OPERATIONS ANALYTICS ============
// Peak hours analysis - manager only
router.get(
  '/time/peak-hours',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getPeakHoursAnalysis)
);

// Staff performance - manager only
router.get(
  '/staff/performance',
  isManager,
  readLimiter,
  catchAsync(analyticsAdvancedController.getStaffPerformance)
);

// ============ INVENTORY ANALYTICS ============
// Inventory intelligence with predictions - available to staff
router.get(
  '/inventory/intelligence',
  readLimiter,
  catchAsync(analyticsAdvancedController.getInventoryIntelligence)
);

// ============ CACHE MANAGEMENT ============
// Get cache status - admin only
router.get(
  '/cache/status',
  isAdmin,
  readLimiter,
  catchAsync(analyticsAdvancedController.getCacheStatus)
);

// Invalidate cache - admin only
router.post(
  '/cache/invalidate',
  isAdmin,
  writeLimiter,
  catchAsync(analyticsAdvancedController.invalidateCache)
);

// Warm cache - admin only
router.post(
  '/cache/warm',
  isAdmin,
  writeLimiter,
  catchAsync(analyticsAdvancedController.warmCache)
);

export default router;
