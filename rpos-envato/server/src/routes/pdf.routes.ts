import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  generateOrderReceipt,
  generateOrderInvoice,
  downloadOrderReceipt,
} from '../controllers/pdf.controller';

const router = Router();

/**
 * PDF Generation Routes
 *
 * All routes require authentication.
 * PDFs are generated on-the-fly and cached for 1 hour.
 *
 * @swagger
 * tags:
 *   name: PDF
 *   description: PDF document generation
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /pdf/orders/{orderId}/receipt.pdf:
 *   get:
 *     summary: Generate receipt PDF for an order
 *     tags: [PDF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *         description: If true, forces download instead of inline display
 *     responses:
 *       200:
 *         description: PDF document
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Order not found
 *       500:
 *         description: PDF generation failed
 */
router.get('/orders/:orderId/receipt.pdf', (req, res, next) => {
  // Check if download is requested
  if (req.query.download === 'true') {
    return downloadOrderReceipt(req, res, next);
  }
  return generateOrderReceipt(req, res, next);
});

/**
 * @swagger
 * /pdf/orders/{orderId}/invoice.pdf:
 *   get:
 *     summary: Generate invoice PDF for an order
 *     tags: [PDF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: PDF document
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Order not found
 *       500:
 *         description: PDF generation failed
 */
router.get('/orders/:orderId/invoice.pdf', generateOrderInvoice);

export default router;
