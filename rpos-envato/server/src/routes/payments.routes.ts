import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Payment processing
router.post('/orders/:orderId/pay', paymentsController.processPayment);
router.post('/orders/:orderId/pay/split', paymentsController.processSplitPayment);

// Payment history
router.get('/orders/:orderId/payments', paymentsController.getOrderPayments);

// Void payment
router.post('/payments/:paymentId/void', paymentsController.voidPayment);

// Refund processing
router.post('/orders/:orderId/refund', paymentsController.processRefund);
router.get('/orders/:orderId/refunds', paymentsController.getOrderRefunds);

// Order lifecycle
router.post('/orders/:orderId/complete', paymentsController.completeOrder);
router.post('/orders/:orderId/cancel', paymentsController.cancelOrder);

// Calculate totals (preview)
router.post('/calculate-totals', paymentsController.calculateTotals);

export default router;
