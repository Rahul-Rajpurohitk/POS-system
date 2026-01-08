import { Router } from 'express';
import * as receiptsController from '../controllers/receipts.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get receipt data as JSON
router.get('/orders/:orderId/receipt', receiptsController.getReceiptData);

// Get receipt as HTML (for preview/printing in browser)
router.get('/orders/:orderId/receipt/html', receiptsController.getReceiptHTML);

// Get receipt as ESC/POS commands (for thermal printers)
router.get('/orders/:orderId/receipt/escpos', receiptsController.getReceiptESCPOS);

// Print receipt (queue print job)
router.post('/orders/:orderId/receipt/print', receiptsController.printReceipt);

// Email receipt to customer
router.post('/orders/:orderId/receipt/email', receiptsController.emailReceipt);

export default router;
