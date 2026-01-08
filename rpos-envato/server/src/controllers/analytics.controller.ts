import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { ReportPeriod } from '../types/enums';

/**
 * Get dashboard summary
 */
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.TODAY;

    const dashboard = await analyticsService.getDashboardSummary(businessId, period);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales summary
 */
export const getSalesSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const previousRange = period !== ReportPeriod.CUSTOM ? {
      startDate: new Date(dateRange.startDate.getTime() - (dateRange.endDate.getTime() - dateRange.startDate.getTime())),
      endDate: new Date(dateRange.startDate.getTime() - 1),
    } : undefined;

    const summary = await analyticsService.getSalesSummary(businessId, dateRange, previousRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders summary
 */
export const getOrdersSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const summary = await analyticsService.getOrdersSummary(businessId, dateRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payments summary
 */
export const getPaymentsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const summary = await analyticsService.getPaymentsSummary(businessId, dateRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top selling products
 */
export const getTopProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const limit = parseInt(req.query.limit as string) || 10;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const products = await analyticsService.getTopProducts(businessId, dateRange, limit);

    res.json({
      success: true,
      data: {
        period: dateRange,
        products,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get hourly sales breakdown
 */
export const getHourlySales = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.TODAY;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const hourlyData = await analyticsService.getHourlySales(businessId, dateRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        hourlyBreakdown: hourlyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily sales breakdown
 */
export const getDailySales = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const dailyData = await analyticsService.getDailySales(businessId, dateRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        dailyBreakdown: dailyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category sales breakdown
 */
export const getCategorySales = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const categories = await analyticsService.getCategorySales(businessId, dateRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory alerts (low stock)
 */
export const getInventoryAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;

    const alerts = await analyticsService.getInventoryAlerts(businessId);

    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        outOfStock: alerts.filter((a) => a.status === 'out_of_stock').length,
        critical: alerts.filter((a) => a.status === 'critical').length,
        low: alerts.filter((a) => a.status === 'low').length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer analytics
 */
export const getCustomerAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const period = (req.query.period as ReportPeriod) || ReportPeriod.THIS_MONTH;
    const { startDate, endDate } = req.query;

    const dateRange = analyticsService.getDateRange(
      period,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    const analytics = await analyticsService.getCustomerAnalytics(businessId, dateRange);

    res.json({
      success: true,
      data: {
        period: dateRange,
        analytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent orders
 */
export const getRecentOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const businessId = req.business!;
    const limit = parseInt(req.query.limit as string) || 10;

    const orders = await analyticsService.getRecentOrders(businessId, limit);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};
