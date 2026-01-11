import { Request, Response, NextFunction } from 'express';
import { advancedAnalyticsService } from '../services/analytics-advanced.service';
import { analyticsService } from '../services/analytics.service';
import { analyticsCacheService } from '../services/analytics-cache.service';
import { ReportPeriod } from '../types/enums';
import { DateRange } from '../types/analytics.types';

/**
 * Advanced Analytics Controller
 * Provides enterprise-grade analytics endpoints with caching and optimization
 */

// ============ ENHANCED DASHBOARD ============

/**
 * Get enhanced dashboard with real-time metrics
 */
export const getEnhancedDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.TODAY;

    const dashboard = await advancedAnalyticsService.getEnhancedDashboard(
      businessId,
      period
    );

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

// ============ ABC CLASSIFICATION ============

/**
 * Get ABC (Pareto) classification of products
 * A: Top 80% revenue, B: 80-95%, C: 95-100%
 */
export const getABCClassification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const { startDate, endDate, refresh } = req.query;

    let dateRange: DateRange | undefined;
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    }

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getABCClassification(
      businessId,
      dateRange,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ RFM SEGMENTATION ============

/**
 * Get RFM (Recency, Frequency, Monetary) customer segmentation
 */
export const getRFMSegmentation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const { refresh } = req.query;

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getRFMSegmentation(
      businessId,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ SALES FORECASTING ============

/**
 * Get sales forecast for upcoming days
 */
export const getSalesForecast = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const days = parseInt(req.query.days as string) || 14;
    const { refresh } = req.query;

    // Limit forecast to reasonable range
    const forecastDays = Math.min(Math.max(days, 7), 30);
    const useCache = refresh !== 'true';

    const result = await advancedAnalyticsService.getSalesForecast(
      businessId,
      forecastDays,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ REVENUE TRENDS ============

/**
 * Get detailed revenue trends with projections
 */
export const getRevenueTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate, refresh } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getRevenueTrends(
      businessId,
      period,
      dateRange,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ PEAK HOURS ANALYSIS ============

/**
 * Get peak hours analysis with staffing recommendations
 */
export const getPeakHoursAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const { refresh } = req.query;

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getPeakHoursAnalysis(
      businessId,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ STAFF PERFORMANCE ============

/**
 * Get staff performance metrics and rankings
 */
export const getStaffPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate, refresh } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getStaffPerformance(
      businessId,
      period,
      dateRange,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ INVENTORY INTELLIGENCE ============

/**
 * Get inventory intelligence with reorder predictions
 */
export const getInventoryIntelligence = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const { refresh } = req.query;

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getInventoryIntelligence(
      businessId,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ CUSTOMER COHORTS ============

/**
 * Get customer cohort analysis for retention insights
 */
export const getCustomerCohorts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const { refresh } = req.query;

    const useCache = refresh !== 'true';
    const result = await advancedAnalyticsService.getCustomerCohorts(
      businessId,
      useCache
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============ PRODUCT PERFORMANCE ============

/**
 * Get detailed product performance analytics
 */
export const getProductPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const limit = parseInt(req.query.limit as string) || 50;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    // Combine ABC classification with top products
    const [abcData, topProducts] = await Promise.all([
      advancedAnalyticsService.getABCClassification(businessId, dateRange),
      analyticsService.getTopProducts(businessId, dateRange, limit),
    ]);

    res.json({
      success: true,
      data: {
        period: dateRange,
        abcClassification: abcData,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ CACHE MANAGEMENT ============

/**
 * Get cache status for analytics data
 */
export const getCacheStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;

    const missingCaches = await analyticsCacheService.getMissingCaches(businessId);

    res.json({
      success: true,
      data: {
        businessId,
        missingCaches,
        allCached: missingCaches.length === 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invalidate all analytics cache for a business
 * Useful after bulk data imports or corrections
 */
export const invalidateCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const { type } = req.query;

    switch (type) {
      case 'time-sensitive':
        await analyticsCacheService.invalidateTimeSensitive(businessId);
        break;
      case 'inventory':
        await analyticsCacheService.invalidateInventoryRelated(businessId);
        break;
      case 'customer':
        await analyticsCacheService.invalidateCustomerRelated(businessId);
        break;
      default:
        await analyticsCacheService.invalidateAllForBusiness(businessId);
    }

    res.json({
      success: true,
      message: `Analytics cache invalidated${type ? ` for ${type}` : ''}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Warm analytics cache by pre-computing key metrics
 */
export const warmCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;

    // Pre-compute and cache key analytics in parallel
    await Promise.all([
      advancedAnalyticsService.getABCClassification(businessId, undefined, false),
      advancedAnalyticsService.getRFMSegmentation(businessId, false),
      advancedAnalyticsService.getPeakHoursAnalysis(businessId, false),
      advancedAnalyticsService.getInventoryIntelligence(businessId, false),
      advancedAnalyticsService.getCustomerCohorts(businessId, false),
    ]);

    res.json({
      success: true,
      message: 'Analytics cache warmed successfully',
      warmedCaches: [
        'ABC Classification',
        'RFM Segmentation',
        'Peak Hours',
        'Inventory Intelligence',
        'Customer Cohorts',
      ],
    });
  } catch (error) {
    next(error);
  }
};
