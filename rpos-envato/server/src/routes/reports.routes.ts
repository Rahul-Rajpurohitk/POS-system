import { Router } from 'express';
import { query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import { readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as reportsController from '../controllers/reports.controller';

const router = Router();

router.use(auth);

// Sales Report
router.get(
  '/sales',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
    query('groupBy').optional().isIn(['day', 'week', 'month']),
  ],
  checkValidation,
  reportsController.getSalesReport
);

// Inventory Report
router.get(
  '/inventory',
  [
    query('locationId').optional().isUUID(),
    query('categoryId').optional().isUUID(),
    query('lowStockOnly').optional().isBoolean(),
    query('includeInactive').optional().isBoolean(),
  ],
  checkValidation,
  reportsController.getInventoryReport
);

// Customer Report
router.get(
  '/customers',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('segment').optional().isString(),
    query('sortBy').optional().isIn(['totalSpent', 'orderCount', 'lastVisit']),
  ],
  checkValidation,
  reportsController.getCustomerReport
);

// Daily Report
router.get(
  '/daily',
  [
    query('date').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.getDailyReport
);

// Weekly Report
router.get(
  '/weekly',
  [
    query('date').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.getWeeklyReport
);

// Monthly Report
router.get(
  '/monthly',
  [
    query('year').optional().isInt({ min: 2000, max: 2100 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.getMonthlyReport
);

// Top Products
router.get(
  '/top-products',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('sortBy').optional().isIn(['revenue', 'quantity', 'profit']),
  ],
  checkValidation,
  reportsController.getTopProducts
);

// Top Customers
router.get(
  '/top-customers',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  checkValidation,
  reportsController.getTopCustomers
);

// Staff Performance
router.get(
  '/staff-performance',
  managerOnly,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.getStaffPerformance
);

// Payment Methods
router.get(
  '/payment-methods',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  checkValidation,
  reportsController.getPaymentMethods
);

// Export endpoints

// GET /reports/export/csv
router.get(
  '/export/csv',
  managerOnly,
  [
    query('reportType').isIn(['sales', 'inventory', 'customers']).withMessage('Report type required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.exportToCSV
);

// GET /reports/export/excel
router.get(
  '/export/excel',
  managerOnly,
  [
    query('reportType').isIn(['sales', 'inventory', 'customers']).withMessage('Report type required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.exportToExcel
);

// GET /reports/export/pdf
router.get(
  '/export/pdf',
  managerOnly,
  [
    query('reportType').isIn(['sales', 'inventory', 'customers']).withMessage('Report type required'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.exportToPDF
);

// Compare Periods
router.get(
  '/compare',
  [
    query('period1Start').isISO8601().withMessage('Period 1 start date required'),
    query('period1End').isISO8601().withMessage('Period 1 end date required'),
    query('period2Start').isISO8601().withMessage('Period 2 start date required'),
    query('period2End').isISO8601().withMessage('Period 2 end date required'),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  reportsController.comparePeriods
);

export default router;
