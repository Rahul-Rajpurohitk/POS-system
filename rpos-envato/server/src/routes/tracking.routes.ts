import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as trackingController from '../controllers/tracking.controller';

const router = Router();

// NOTE: These are PUBLIC endpoints - no authentication required
// Rate limiting is stricter for public endpoints

// GET /track/:trackingToken - Get delivery tracking info
router.get(
  '/:trackingToken',
  readLimiter,
  [param('trackingToken').isLength({ min: 32, max: 64 }).withMessage('Invalid tracking token')],
  checkValidation,
  catchAsync(trackingController.getTrackingInfo)
);

// GET /track/:trackingToken/location - Get current driver location
router.get(
  '/:trackingToken/location',
  readLimiter,
  [param('trackingToken').isLength({ min: 32, max: 64 }).withMessage('Invalid tracking token')],
  checkValidation,
  catchAsync(trackingController.getDriverLocation)
);

// GET /track/:trackingToken/history - Get status history
router.get(
  '/:trackingToken/history',
  readLimiter,
  [param('trackingToken').isLength({ min: 32, max: 64 }).withMessage('Invalid tracking token')],
  checkValidation,
  catchAsync(trackingController.getStatusHistory)
);

// POST /track/:trackingToken/rate - Rate delivery
router.post(
  '/:trackingToken/rate',
  createLimiter,
  [
    param('trackingToken').isLength({ min: 32, max: 64 }).withMessage('Invalid tracking token'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('feedback').optional().isString().isLength({ max: 500 }).withMessage('Feedback too long'),
  ],
  checkValidation,
  catchAsync(trackingController.rateDelivery)
);

// POST /track/:trackingToken/tip - Update tip
router.post(
  '/:trackingToken/tip',
  createLimiter,
  [
    param('trackingToken').isLength({ min: 32, max: 64 }).withMessage('Invalid tracking token'),
    body('tipAmount').isFloat({ min: 0 }).withMessage('Tip amount must be non-negative'),
  ],
  checkValidation,
  catchAsync(trackingController.updateTip)
);

// POST /track/:trackingToken/contact - Contact driver
router.post(
  '/:trackingToken/contact',
  createLimiter,
  [
    param('trackingToken').isLength({ min: 32, max: 64 }).withMessage('Invalid tracking token'),
    body('message').notEmpty().isLength({ max: 200 }).withMessage('Message required (max 200 chars)'),
  ],
  checkValidation,
  catchAsync(trackingController.contactDriver)
);

export default router;
