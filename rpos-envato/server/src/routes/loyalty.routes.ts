import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as loyaltyController from '../controllers/loyalty.controller';

const router = Router();

router.use(auth);

// Statistics
router.get(
  '/stats',
  managerOnly,
  [query('programId').optional().isUUID()],
  checkValidation,
  loyaltyController.getStats
);

// Calculate points (for order preview)
router.post(
  '/calculate',
  [
    body('orderTotal').isFloat({ min: 0 }).withMessage('Order total required'),
    body('customerId').optional().isUUID(),
  ],
  checkValidation,
  loyaltyController.calculatePoints
);

// Programs

// Get active program
router.get('/programs/active', loyaltyController.getActiveProgram);

// Create program
router.post(
  '/programs',
  managerOnly,
  [
    body('name').notEmpty().withMessage('Name required'),
    body('type').isIn(['points_per_dollar', 'points_per_visit', 'tiered', 'cashback']).withMessage('Type required'),
    body('pointsPerDollar').optional().isInt({ min: 1 }),
    body('pointsPerVisit').optional().isInt({ min: 1 }),
  ],
  checkValidation,
  loyaltyController.createProgram
);

// Get program by ID
router.get(
  '/programs/:id',
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.getProgram
);

// Update program
router.put(
  '/programs/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.updateProgram
);

// Delete program
router.delete(
  '/programs/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.deleteProgram
);

// Tiers

// Get tiers for program
router.get(
  '/programs/:programId/tiers',
  [param('programId').isUUID()],
  checkValidation,
  loyaltyController.getTiers
);

// Create tier
router.post(
  '/programs/:programId/tiers',
  managerOnly,
  [
    param('programId').isUUID(),
    body('name').notEmpty().withMessage('Name required'),
    body('minimumPoints').isInt({ min: 0 }).withMessage('Minimum points required'),
    body('multiplier').optional().isFloat({ min: 1 }),
  ],
  checkValidation,
  loyaltyController.createTier
);

// Update tier
router.put(
  '/tiers/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.updateTier
);

// Delete tier
router.delete(
  '/tiers/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.deleteTier
);

// Accounts

// Enroll customer
router.post(
  '/accounts',
  [
    body('customerId').isUUID().withMessage('Customer ID required'),
    body('programId').isUUID().withMessage('Program ID required'),
  ],
  checkValidation,
  loyaltyController.enrollCustomer
);

// Get all accounts
router.get(
  '/accounts',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('tierId').optional().isUUID(),
    query('programId').optional().isUUID(),
  ],
  checkValidation,
  loyaltyController.getAccounts
);

// Get customer account
router.get(
  '/accounts/customer/:customerId',
  [param('customerId').isUUID()],
  checkValidation,
  loyaltyController.getCustomerAccount
);

// Get account by ID
router.get(
  '/accounts/:id',
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.getAccount
);

// Earn points
router.post(
  '/accounts/:id/earn',
  [
    param('id').isUUID(),
    body('points').isInt({ min: 1 }).withMessage('Points required'),
    body('orderId').optional().isUUID(),
    body('description').optional().isString(),
  ],
  checkValidation,
  loyaltyController.earnPoints
);

// Redeem points
router.post(
  '/accounts/:id/redeem',
  [
    param('id').isUUID(),
    body('points').isInt({ min: 1 }).withMessage('Points required'),
    body('rewardId').optional().isUUID(),
    body('orderId').optional().isUUID(),
    body('description').optional().isString(),
  ],
  checkValidation,
  loyaltyController.redeemPoints
);

// Adjust points (admin)
router.post(
  '/accounts/:id/adjust',
  managerOnly,
  [
    param('id').isUUID(),
    body('points').isInt().withMessage('Points required (positive or negative)'),
    body('reason').notEmpty().withMessage('Reason required'),
  ],
  checkValidation,
  loyaltyController.adjustPoints
);

// Get balance
router.get(
  '/accounts/:id/balance',
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.getPointsBalance
);

// Get transactions
router.get(
  '/accounts/:id/transactions',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  checkValidation,
  loyaltyController.getTransactions
);

// Rewards

// Create reward
router.post(
  '/rewards',
  managerOnly,
  [
    body('name').notEmpty().withMessage('Name required'),
    body('type').isIn(['discount_percent', 'discount_fixed', 'free_product', 'free_shipping', 'bonus_points']).withMessage('Type required'),
    body('pointsCost').isInt({ min: 1 }).withMessage('Points cost required'),
    body('value').isFloat({ min: 0 }).withMessage('Value required'),
  ],
  checkValidation,
  loyaltyController.createReward
);

// Get rewards
router.get(
  '/rewards',
  [
    query('programId').optional().isUUID(),
    query('tierId').optional().isUUID(),
    query('activeOnly').optional().isBoolean(),
  ],
  checkValidation,
  loyaltyController.getRewards
);

// Get available rewards for account
router.get(
  '/rewards/available/:accountId',
  [param('accountId').isUUID()],
  checkValidation,
  loyaltyController.getAvailableRewards
);

// Update reward
router.put(
  '/rewards/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.updateReward
);

// Delete reward
router.delete(
  '/rewards/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  loyaltyController.deleteReward
);

export default router;
