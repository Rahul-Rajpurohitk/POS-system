import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as shiftsController from '../controllers/shifts.controller';

const router = Router();

router.use(auth);

// Active shifts (must be before :id routes)
router.get(
  '/active',
  [query('locationId').optional().isUUID()],
  checkValidation,
  shiftsController.getActiveShifts
);

// Current user's shift
router.get('/current', shiftsController.getCurrentShift);

// Start shift
router.post(
  '/start',
  [
    body('registerId').optional().isString(),
    body('openingCash').isFloat({ min: 0 }).withMessage('Opening cash required'),
    body('locationId').optional().isUUID(),
    body('notes').optional().isString(),
  ],
  checkValidation,
  shiftsController.startShift
);

// End shift
router.post(
  '/end',
  [
    body('shiftId').isUUID().withMessage('Shift ID required'),
    body('closingCash').isFloat({ min: 0 }).withMessage('Closing cash required'),
    body('notes').optional().isString(),
  ],
  checkValidation,
  shiftsController.endShift
);

// Get all shifts
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isUUID(),
    query('status').optional().isIn(['open', 'closed', 'reconciled', 'approved']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  shiftsController.getShifts
);

// Get shift by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  shiftsController.getShift
);

// Cash movement
router.post(
  '/:id/cash-movement',
  [
    param('id').isUUID(),
    body('type').isIn(['pay_in', 'pay_out', 'cash_drop', 'float_adjustment']).withMessage('Type required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount required'),
    body('reason').notEmpty().withMessage('Reason required'),
    body('reference').optional().isString(),
  ],
  checkValidation,
  shiftsController.recordCashMovement
);

// Get cash movements
router.get(
  '/:id/cash-movements',
  [param('id').isUUID()],
  checkValidation,
  shiftsController.getCashMovements
);

// Shift summary
router.get(
  '/:id/summary',
  [param('id').isUUID()],
  checkValidation,
  shiftsController.getShiftSummary
);

// Blind count
router.post(
  '/:id/blind-count',
  [
    param('id').isUUID(),
    body('countedCash').isFloat({ min: 0 }).withMessage('Counted cash required'),
    body('denominations').optional().isObject(),
  ],
  checkValidation,
  shiftsController.blindCount
);

// Variance report
router.get(
  '/:id/variance',
  [param('id').isUUID()],
  checkValidation,
  shiftsController.getVarianceReport
);

// Approve shift (manager only)
router.post(
  '/:id/approve',
  managerOnly,
  [
    param('id').isUUID(),
    body('varianceReason').optional().isString(),
    body('approvalNotes').optional().isString(),
  ],
  checkValidation,
  shiftsController.approveShift
);

export default router;
