import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as ordersController from '../controllers/orders.controller';

const router = Router();

// ============ READ ENDPOINTS ============

// GET /orders/stats - Dashboard statistics
router.get('/stats', staff, readLimiter, catchAsync(ordersController.getOrderStats));

// GET /orders/sync - Sync all orders (mobile app)
router.get('/sync', staff, readLimiter, catchAsync(ordersController.syncOrders));

// GET /orders/recent - Recent orders
router.get(
  '/recent',
  staff,
  readLimiter,
  [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')],
  checkValidation,
  catchAsync(ordersController.getRecentOrders)
);

// GET /orders/customer/:customerId - Orders by customer
router.get(
  '/customer/:customerId',
  staff,
  readLimiter,
  [param('customerId').isUUID().withMessage('Invalid customer ID')],
  checkValidation,
  catchAsync(ordersController.getCustomerOrders)
);

// GET /orders - List all orders (paginated)
router.get('/', staff, readLimiter, catchAsync(ordersController.getOrders));

// GET /orders/:id - Single order by ID
router.get(
  '/:id',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(ordersController.getOrder)
);

// ============ WRITE ENDPOINTS ============

// POST /orders - Create new order
router.post(
  '/',
  staff,
  createLimiter,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isUUID().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  checkValidation,
  catchAsync(ordersController.addOrder)
);

// PUT /orders/:id - Update order
router.put(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(ordersController.editOrder)
);

// PATCH /orders/:id/status - Update order status
router.patch(
  '/:id/status',
  staff,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('status').notEmpty().withMessage('Status is required'),
  ],
  checkValidation,
  catchAsync(ordersController.updateOrderStatus)
);

// POST /orders/:id/void - Void/Cancel order
router.post(
  '/:id/void',
  manager,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  checkValidation,
  catchAsync(ordersController.voidOrder)
);

// POST /orders/:id/refund - Process refund
router.post(
  '/:id/refund',
  manager,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid refund amount is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('restoreInventory').optional().isBoolean().withMessage('restoreInventory must be boolean'),
  ],
  checkValidation,
  catchAsync(ordersController.refundOrder)
);

// POST /orders/:id/exchange - Process product exchange
router.post(
  '/:id/exchange',
  manager,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('returnItems').optional().isArray().withMessage('returnItems must be an array'),
    body('exchangeItems').optional().isArray().withMessage('exchangeItems must be an array'),
  ],
  checkValidation,
  catchAsync(ordersController.exchangeOrder)
);

// DELETE /orders/:id - Delete order
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(ordersController.deleteOrder)
);

export default router;
