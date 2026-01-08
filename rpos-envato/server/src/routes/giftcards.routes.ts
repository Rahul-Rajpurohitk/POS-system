import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import * as giftcardsController from '../controllers/giftcards.controller';

const router = Router();

router.use(auth);

// Statistics (must be before :id routes)
router.get('/stats', managerOnly, giftcardsController.getStats);

// Batch generation
router.post(
  '/batch',
  managerOnly,
  [
    body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity required (1-100)'),
    body('initialBalance').isFloat({ min: 0 }).withMessage('Initial balance required'),
    body('type').optional().isIn(['standard', 'promotional', 'reward', 'corporate']),
    body('expirationDate').optional().isISO8601(),
    body('prefix').optional().isString(),
  ],
  checkValidation,
  giftcardsController.generateBatch
);

// Redeem by code (no ID in URL)
router.post(
  '/redeem',
  [
    body('code').notEmpty().withMessage('Gift card code required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount required'),
    body('orderId').optional().isUUID(),
    body('notes').optional().isString(),
  ],
  checkValidation,
  giftcardsController.redeemByCode
);

// Balance check by code
router.get(
  '/balance/:code',
  [param('code').notEmpty()],
  checkValidation,
  giftcardsController.checkBalance
);

// Get by code
router.get(
  '/code/:code',
  [param('code').notEmpty()],
  checkValidation,
  giftcardsController.getGiftCardByCode
);

// Customer gift cards
router.get(
  '/customer/:customerId',
  [param('customerId').isUUID()],
  checkValidation,
  giftcardsController.getCustomerGiftCards
);

// Create gift card
router.post(
  '/',
  [
    body('initialBalance').isFloat({ min: 0 }).withMessage('Initial balance required'),
    body('type').optional().isIn(['standard', 'promotional', 'reward', 'corporate']),
    body('customerId').optional().isUUID(),
    body('expirationDate').optional().isISO8601(),
  ],
  checkValidation,
  giftcardsController.createGiftCard
);

// Get all gift cards
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'inactive', 'expired', 'depleted']),
    query('customerId').optional().isUUID(),
    query('type').optional().isIn(['standard', 'promotional', 'reward', 'corporate']),
  ],
  checkValidation,
  giftcardsController.getGiftCards
);

// Get gift card by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  giftcardsController.getGiftCard
);

// Activate
router.post(
  '/:id/activate',
  [param('id').isUUID()],
  checkValidation,
  giftcardsController.activateGiftCard
);

// Deactivate
router.post(
  '/:id/deactivate',
  managerOnly,
  [
    param('id').isUUID(),
    body('reason').notEmpty().withMessage('Reason required'),
  ],
  checkValidation,
  giftcardsController.deactivateGiftCard
);

// Reload
router.post(
  '/:id/reload',
  [
    param('id').isUUID(),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount required'),
    body('paymentMethod').notEmpty().withMessage('Payment method required'),
    body('paymentReference').optional().isString(),
  ],
  checkValidation,
  giftcardsController.reloadGiftCard
);

// Redeem by ID
router.post(
  '/:id/redeem',
  [
    param('id').isUUID(),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount required'),
    body('orderId').optional().isUUID(),
    body('notes').optional().isString(),
  ],
  checkValidation,
  giftcardsController.redeemGiftCard
);

// Transfer balance
router.post(
  '/:id/transfer',
  managerOnly,
  [
    param('id').isUUID(),
    body('targetGiftCardId').isUUID().withMessage('Target gift card ID required'),
    body('amount').optional().isFloat({ min: 0.01 }),
  ],
  checkValidation,
  giftcardsController.transferBalance
);

// Transaction history
router.get(
  '/:id/transactions',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  checkValidation,
  giftcardsController.getTransactionHistory
);

// Assign to customer
router.post(
  '/:id/assign',
  [
    param('id').isUUID(),
    body('customerId').isUUID().withMessage('Customer ID required'),
  ],
  checkValidation,
  giftcardsController.assignToCustomer
);

export default router;
