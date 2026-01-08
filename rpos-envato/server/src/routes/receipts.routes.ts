import { Router } from 'express';
import { param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import * as receiptsController from '../controllers/receipts.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get receipt data as JSON
router.get(
  '/orders/:orderId/receipt',
  readLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(receiptsController.getReceiptData)
);

// Get receipt as HTML (for preview/printing in browser)
router.get(
  '/orders/:orderId/receipt/html',
  readLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(receiptsController.getReceiptHTML)
);

// Get receipt as ESC/POS commands (for thermal printers)
router.get(
  '/orders/:orderId/receipt/escpos',
  readLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(receiptsController.getReceiptESCPOS)
);

// Print receipt (queue print job)
router.post(
  '/orders/:orderId/receipt/print',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(receiptsController.printReceipt)
);

// Email receipt to customer
router.post(
  '/orders/:orderId/receipt/email',
  createLimiter,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  checkValidation,
  catchAsync(receiptsController.emailReceipt)
);

export default router;
