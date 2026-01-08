import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as eodController from '../controllers/eod.controller';

const router = Router();

router.use(auth);

// Check readiness (must be before :id routes)
router.get(
  '/check',
  [query('locationId').optional().isUUID()],
  checkValidation,
  eodController.checkEODReadiness
);

// Get pending items
router.get(
  '/pending',
  [query('locationId').optional().isUUID()],
  checkValidation,
  eodController.getPendingItems
);

// Get summary
router.get(
  '/summary',
  managerOnly,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  eodController.getEODSummary
);

// Get by date
router.get(
  '/date/:date',
  [
    param('date').isISO8601().withMessage('Valid date required'),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  eodController.getEODReportByDate
);

// Generate EOD report
router.post(
  '/generate',
  managerOnly,
  [
    body('date').optional().isISO8601(),
    body('locationId').optional().isUUID(),
    body('includeOpenShifts').optional().isBoolean(),
  ],
  checkValidation,
  eodController.generateEODReport
);

// Get all EOD reports
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'pending_review', 'approved', 'finalized']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  eodController.getEODReports
);

// Get EOD report by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  eodController.getEODReport
);

// Review EOD report
router.post(
  '/:id/review',
  managerOnly,
  [
    param('id').isUUID(),
    body('approved').isBoolean().withMessage('Approval decision required'),
    body('notes').optional().isString(),
    body('adjustments').optional().isArray(),
  ],
  checkValidation,
  eodController.reviewEODReport
);

// Finalize EOD report
router.post(
  '/:id/finalize',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  eodController.finalizeEODReport
);

// Get reconciliation
router.get(
  '/:id/reconciliation',
  [param('id').isUUID()],
  checkValidation,
  eodController.getReconciliation
);

// Add reconciliation note
router.post(
  '/:id/reconciliation/note',
  managerOnly,
  [
    param('id').isUUID(),
    body('category').notEmpty().withMessage('Category required'),
    body('amount').isFloat().withMessage('Amount required'),
    body('reason').notEmpty().withMessage('Reason required'),
    body('reference').optional().isString(),
  ],
  checkValidation,
  eodController.addReconciliationNote
);

// Export EOD report
router.get(
  '/:id/export',
  [
    param('id').isUUID(),
    query('format').optional().isIn(['pdf', 'csv', 'excel']),
  ],
  checkValidation,
  eodController.exportEODReport
);

export default router;
