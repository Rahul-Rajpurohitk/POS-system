import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { isManager } from '../middlewares/manager.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard - available to all authenticated users
router.get('/dashboard', analyticsController.getDashboard);
router.get('/recent-orders', analyticsController.getRecentOrders);

// Sales reports - manager only
router.get('/sales', isManager, analyticsController.getSalesSummary);
router.get('/sales/daily', isManager, analyticsController.getDailySales);
router.get('/sales/hourly', isManager, analyticsController.getHourlySales);
router.get('/sales/categories', isManager, analyticsController.getCategorySales);

// Orders reports - manager only
router.get('/orders', isManager, analyticsController.getOrdersSummary);

// Payments reports - manager only
router.get('/payments', isManager, analyticsController.getPaymentsSummary);

// Products reports - manager only
router.get('/products/top', isManager, analyticsController.getTopProducts);

// Inventory alerts - available to staff
router.get('/inventory/alerts', analyticsController.getInventoryAlerts);

// Customer analytics - manager only
router.get('/customers', isManager, analyticsController.getCustomerAnalytics);

export default router;
