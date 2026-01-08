import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isManager } from '../middlewares/manager.middleware';
import { readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard - available to all authenticated users
router.get('/dashboard', readLimiter, catchAsync(analyticsController.getDashboard));
router.get('/recent-orders', readLimiter, catchAsync(analyticsController.getRecentOrders));

// Sales reports - manager only
router.get('/sales', isManager, readLimiter, catchAsync(analyticsController.getSalesSummary));
router.get('/sales/daily', isManager, readLimiter, catchAsync(analyticsController.getDailySales));
router.get('/sales/hourly', isManager, readLimiter, catchAsync(analyticsController.getHourlySales));
router.get('/sales/categories', isManager, readLimiter, catchAsync(analyticsController.getCategorySales));

// Orders reports - manager only
router.get('/orders', isManager, readLimiter, catchAsync(analyticsController.getOrdersSummary));

// Payments reports - manager only
router.get('/payments', isManager, readLimiter, catchAsync(analyticsController.getPaymentsSummary));

// Products reports - manager only
router.get('/products/top', isManager, readLimiter, catchAsync(analyticsController.getTopProducts));

// Inventory alerts - available to staff
router.get('/inventory/alerts', readLimiter, catchAsync(analyticsController.getInventoryAlerts));

// Customer analytics - manager only
router.get('/customers', isManager, readLimiter, catchAsync(analyticsController.getCustomerAnalytics));

export default router;
