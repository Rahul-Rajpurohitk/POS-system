import { Router } from 'express';
import { param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import * as paymentsController from '../controllers/payments.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Payment processing
router.post(
  '/orders/:orderId/pay',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.processPayment)
);
router.post(
  '/orders/:orderId/pay/split',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.processSplitPayment)
);

// Payment history
router.get(
  '/orders/:orderId/payments',
  readLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.getOrderPayments)
);

// Void payment
router.post(
  '/payments/:paymentId/void',
  createLimiter,
  [param('paymentId').isUUID().withMessage('Invalid payment ID')],
  checkValidation,
  catchAsync(paymentsController.voidPayment)
);

// Refund processing
router.post(
  '/orders/:orderId/refund',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.processRefund)
);
router.get(
  '/orders/:orderId/refunds',
  readLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.getOrderRefunds)
);

// Order lifecycle
router.post(
  '/orders/:orderId/complete',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.completeOrder)
);
router.post(
  '/orders/:orderId/cancel',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(paymentsController.cancelOrder)
);

// Calculate totals (preview)
router.post('/calculate-totals', readLimiter, catchAsync(paymentsController.calculateTotals));

export default router;
