import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { reportService } from '../services/report.service';
import { analyticsService } from '../services/analytics.service';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business.entity';

// Helper to get business name
async function getBusinessName(businessId: string): Promise<string> {
  try {
    const businessRepo = AppDataSource.getRepository(Business);
    const business = await businessRepo.findOne({ where: { id: businessId } });
    return business?.name || 'Business';
  } catch {
    return 'Business';
  }
}

/**
 * Get sales report
 * GET /reports/sales
 */
export const getSalesReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, locationId, groupBy } = req.query;

  const report = await reportService.generateSalesReport({
    businessId: req.businessId!,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    locationId: locationId as string,
    groupBy: groupBy as 'day' | 'week' | 'month',
  });

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get inventory report
 * GET /reports/inventory
 */
export const getInventoryReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { locationId, categoryId, lowStockOnly, includeInactive } = req.query;

  const report = await reportService.generateInventoryReport({
    businessId: req.businessId!,
    locationId: locationId as string,
    categoryId: categoryId as string,
    lowStockOnly: lowStockOnly === 'true',
    includeInactive: includeInactive === 'true',
  });

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get customer report
 * GET /reports/customers
 */
export const getCustomerReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, segment, sortBy } = req.query;

  const report = await reportService.generateCustomerReport({
    businessId: req.businessId!,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    segment: segment as string,
    sortBy: sortBy as 'totalSpent' | 'orderCount' | 'lastVisit',
  });

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get daily report
 * GET /reports/daily
 */
export const getDailyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const date = req.query.date ? new Date(req.query.date as string) : new Date();
  const locationId = req.query.locationId as string;

  const report = await analyticsService.getDailySummary(req.businessId!, date, locationId);

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get weekly report
 * GET /reports/weekly
 */
export const getWeeklyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const date = req.query.date ? new Date(req.query.date as string) : new Date();
  const locationId = req.query.locationId as string;

  const report = await analyticsService.getWeeklySummary(req.businessId!, date, locationId);

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get monthly report
 * GET /reports/monthly
 */
export const getMonthlyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const locationId = req.query.locationId as string;

  const report = await analyticsService.getMonthlySummary(req.businessId!, year, month, locationId);

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get top products report
 * GET /reports/top-products
 */
export const getTopProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const sortBy = (req.query.sortBy as string) || 'revenue';

  const products = await analyticsService.getTopProducts(req.businessId!, {
    limit,
    startDate,
    endDate,
    sortBy: sortBy as 'revenue' | 'quantity' | 'profit',
  });

  res.json({
    success: true,
    data: products,
  });
});

/**
 * Get top customers report
 * GET /reports/top-customers
 */
export const getTopCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const customers = await analyticsService.getTopCustomers(req.businessId!, {
    limit,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: customers,
  });
});

/**
 * Get staff performance report
 * GET /reports/staff-performance
 */
export const getStaffPerformance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const locationId = req.query.locationId as string;

  const report = await analyticsService.getStaffPerformance(req.businessId!, {
    startDate,
    endDate,
    locationId,
  });

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Get payment methods breakdown
 * GET /reports/payment-methods
 */
export const getPaymentMethods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const report = await analyticsService.getPaymentMethodsBreakdown(req.businessId!, {
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Export report to CSV
 * GET /reports/export/csv
 */
export const exportToCSV = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reportType, startDate, endDate, locationId } = req.query;

  let reportData: any;

  switch (reportType) {
    case 'sales':
      reportData = await reportService.generateSalesReport({
        businessId: req.businessId!,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        locationId: locationId as string,
      });
      break;
    case 'inventory':
      reportData = await reportService.generateInventoryReport({
        businessId: req.businessId!,
        locationId: locationId as string,
      });
      break;
    case 'customers':
      reportData = await reportService.generateCustomerReport({
        businessId: req.businessId!,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid report type',
      });
  }

  const csv = await reportService.exportToCSV(reportData.details || reportData.products || reportData.customers, [
    { key: 'name', header: 'Name' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'amount', header: 'Amount' },
    { key: 'total', header: 'Total' },
  ]);

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`,
  });

  res.send(csv);
});

/**
 * Export report to Excel
 * GET /reports/export/excel
 */
export const exportToExcel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reportType, startDate, endDate, locationId } = req.query;

  let reportData: any;
  let reportTitle: string;

  switch (reportType) {
    case 'sales':
      reportData = await reportService.generateSalesReport({
        businessId: req.businessId!,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        locationId: locationId as string,
      });
      reportTitle = 'Sales Report';
      break;
    case 'inventory':
      reportData = await reportService.generateInventoryReport({
        businessId: req.businessId!,
        locationId: locationId as string,
      });
      reportTitle = 'Inventory Report';
      break;
    case 'customers':
      reportData = await reportService.generateCustomerReport({
        businessId: req.businessId!,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      reportTitle = 'Customer Report';
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid report type',
      });
  }

  const excel = await reportService.exportToExcel(reportData, reportTitle);

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
  });

  res.send(excel);
});

/**
 * Export report to PDF
 * GET /reports/export/pdf
 */
export const exportToPDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reportType, startDate, endDate, locationId } = req.query;

  let reportData: any;
  let reportTitle: string;

  switch (reportType) {
    case 'sales':
      reportData = await reportService.generateSalesReport({
        businessId: req.businessId!,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        locationId: locationId as string,
      });
      reportTitle = 'Sales Report';
      break;
    case 'inventory':
      reportData = await reportService.generateInventoryReport({
        businessId: req.businessId!,
        locationId: locationId as string,
      });
      reportTitle = 'Inventory Report';
      break;
    case 'customers':
      reportData = await reportService.generateCustomerReport({
        businessId: req.businessId!,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      reportTitle = 'Customer Report';
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid report type',
      });
  }

  // Get actual business name from database
  const businessName = await getBusinessName(req.businessId!);

  const pdf = await reportService.exportToPDF(
    reportTitle,
    reportData,
    businessName,
    {
      start: startDate ? new Date(startDate as string) : new Date(),
      end: endDate ? new Date(endDate as string) : new Date(),
    }
  );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf"`,
  });

  res.send(pdf);
});

/**
 * Compare periods
 * GET /reports/compare
 */
export const comparePeriods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    period1Start,
    period1End,
    period2Start,
    period2End,
    locationId,
  } = req.query;

  const comparison = await reportService.comparePeriods(
    req.businessId!,
    {
      start: new Date(period1Start as string),
      end: new Date(period1End as string),
    },
    {
      start: new Date(period2Start as string),
      end: new Date(period2End as string),
    },
    locationId as string
  );

  res.json({
    success: true,
    data: comparison,
  });
});

export default {
  getSalesReport,
  getInventoryReport,
  getCustomerReport,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getTopProducts,
  getTopCustomers,
  getStaffPerformance,
  getPaymentMethods,
  exportToCSV,
  exportToExcel,
  exportToPDF,
  comparePeriods,
};
