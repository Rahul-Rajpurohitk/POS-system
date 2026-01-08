import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as ordersController from '../controllers/orders.controller';

const router = Router();

// GET /orders/sync
router.get('/sync', staff, readLimiter, catchAsync(ordersController.syncOrders));

// GET /orders
router.get('/', staff, readLimiter, catchAsync(ordersController.getOrders));

// GET /orders/:id
router.get(
  '/:id',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(ordersController.getOrder)
);

// POST /orders
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

// PUT /orders/:id
router.put(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(ordersController.editOrder)
);

// DELETE /orders/:id
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(ordersController.deleteOrder)
);

export default router;
