import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import * as suppliersController from '../controllers/suppliers.controller';

const router = Router();

router.use(auth);

// Reorder suggestions (must be before :id routes)
router.get(
  '/reorder-suggestions',
  [query('locationId').optional().isUUID()],
  checkValidation,
  suppliersController.getReorderSuggestions
);

// Purchase Orders (must be before :id routes)

// POST /suppliers/purchase-orders - Create purchase order
router.post(
  '/purchase-orders',
  [
    body('supplierId').isUUID().withMessage('Supplier ID required'),
    body('locationId').isUUID().withMessage('Location ID required'),
    body('items').isArray({ min: 1 }).withMessage('Items required'),
    body('items.*.productId').isUUID(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.unitCost').isFloat({ min: 0 }),
    body('expectedDeliveryDate').optional().isISO8601(),
  ],
  checkValidation,
  suppliersController.createPurchaseOrder
);

// GET /suppliers/purchase-orders - Get all purchase orders
router.get(
  '/purchase-orders',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('supplierId').optional().isUUID(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  suppliersController.getPurchaseOrders
);

// GET /suppliers/purchase-orders/:id - Get purchase order
router.get(
  '/purchase-orders/:id',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.getPurchaseOrder
);

// PUT /suppliers/purchase-orders/:id - Update purchase order
router.put(
  '/purchase-orders/:id',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.updatePurchaseOrder
);

// POST /suppliers/purchase-orders/:id/submit - Submit for approval
router.post(
  '/purchase-orders/:id/submit',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.submitPurchaseOrder
);

// POST /suppliers/purchase-orders/:id/approve - Approve
router.post(
  '/purchase-orders/:id/approve',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  suppliersController.approvePurchaseOrder
);

// POST /suppliers/purchase-orders/:id/send - Send to supplier
router.post(
  '/purchase-orders/:id/send',
  [
    param('id').isUUID(),
    body('sendMethod').optional().isIn(['email', 'manual']),
    body('sendToEmail').optional().isEmail(),
  ],
  checkValidation,
  suppliersController.sendPurchaseOrder
);

// POST /suppliers/purchase-orders/:id/receive - Receive items
router.post(
  '/purchase-orders/:id/receive',
  [
    param('id').isUUID(),
    body('items').isArray({ min: 1 }),
    body('items.*.purchaseOrderItemId').isUUID(),
    body('items.*.receivedQuantity').isInt({ min: 0 }),
    body('receivingNotes').optional().isString(),
  ],
  checkValidation,
  suppliersController.receivePurchaseOrder
);

// POST /suppliers/purchase-orders/:id/cancel - Cancel
router.post(
  '/purchase-orders/:id/cancel',
  [
    param('id').isUUID(),
    body('reason').notEmpty().withMessage('Reason required'),
  ],
  checkValidation,
  suppliersController.cancelPurchaseOrder
);

// GET /suppliers/purchase-orders/:id/receiving - Get receiving history
router.get(
  '/purchase-orders/:id/receiving',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.getReceivingHistory
);

// Supplier CRUD

// POST /suppliers - Create supplier
router.post(
  '/',
  managerOnly,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('paymentTerms').optional().isIn(['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt', 'prepaid']),
  ],
  checkValidation,
  suppliersController.createSupplier
);

// GET /suppliers - Get all suppliers
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_approval']),
    query('search').optional().isString(),
  ],
  checkValidation,
  suppliersController.getSuppliers
);

// GET /suppliers/:id - Get supplier
router.get(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.getSupplier
);

// PUT /suppliers/:id - Update supplier
router.put(
  '/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  suppliersController.updateSupplier
);

// DELETE /suppliers/:id - Delete supplier
router.delete(
  '/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  suppliersController.deleteSupplier
);

// Supplier Products

// GET /suppliers/:id/products - Get supplier products
router.get(
  '/:id/products',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.getSupplierProducts
);

// POST /suppliers/:id/products - Link product
router.post(
  '/:id/products',
  [
    param('id').isUUID(),
    body('productId').isUUID().withMessage('Product ID required'),
    body('cost').isFloat({ min: 0 }).withMessage('Cost required'),
    body('supplierSKU').optional().isString(),
    body('leadTimeDays').optional().isInt({ min: 0 }),
    body('minimumOrderQuantity').optional().isInt({ min: 1 }),
    body('isPreferred').optional().isBoolean(),
  ],
  checkValidation,
  suppliersController.linkProduct
);

// PUT /suppliers/:id/products/:productId - Update supplier product
router.put(
  '/:id/products/:productId',
  [
    param('id').isUUID(),
    param('productId').isUUID(),
  ],
  checkValidation,
  suppliersController.updateSupplierProduct
);

// DELETE /suppliers/:id/products/:productId - Unlink product
router.delete(
  '/:id/products/:productId',
  [
    param('id').isUUID(),
    param('productId').isUUID(),
  ],
  checkValidation,
  suppliersController.unlinkProduct
);

// Supplier Payments

// POST /suppliers/:id/payments - Record payment
router.post(
  '/:id/payments',
  managerOnly,
  [
    param('id').isUUID(),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount required'),
    body('method').isIn(['bank_transfer', 'check', 'cash', 'credit_card', 'other']),
    body('reference').optional().isString(),
    body('purchaseOrderId').optional().isUUID(),
  ],
  checkValidation,
  suppliersController.recordPayment
);

// GET /suppliers/:id/payments - Get supplier payments
router.get(
  '/:id/payments',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  checkValidation,
  suppliersController.getSupplierPayments
);

// GET /suppliers/:id/balance - Get supplier balance
router.get(
  '/:id/balance',
  [param('id').isUUID()],
  checkValidation,
  suppliersController.getSupplierBalance
);

export default router;
