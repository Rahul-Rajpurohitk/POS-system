import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as driverController from '../controllers/driver.controller';
import { DriverStatus, DeliveryStatus } from '../types/enums';

const router = Router();

// All driver app routes require authentication
router.use(staff);

// ============ DRIVER PROFILE ============

// GET /driver/me - Get current driver profile
router.get('/me', readLimiter, catchAsync(driverController.getMyProfile));

// GET /driver/stats - Get driver statistics
router.get('/stats', readLimiter, catchAsync(driverController.getDriverStats));

// ============ STATUS & LOCATION ============

// POST /driver/status - Update driver status
router.post(
  '/status',
  createLimiter,
  [
    body('status')
      .isIn(Object.values(DriverStatus))
      .withMessage('Invalid status'),
  ],
  checkValidation,
  catchAsync(driverController.updateStatus)
);

// POST /driver/location - Update driver location
router.post(
  '/location',
  createLimiter,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Invalid heading'),
    body('speed').optional().isFloat({ min: 0 }).withMessage('Invalid speed'),
  ],
  checkValidation,
  catchAsync(driverController.updateLocation)
);

// ============ DELIVERIES ============

// GET /driver/delivery/active - Get active delivery
router.get('/delivery/active', readLimiter, catchAsync(driverController.getActiveDelivery));

// GET /driver/deliveries - Get delivery history
router.get(
  '/deliveries',
  readLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  checkValidation,
  catchAsync(driverController.getDeliveryHistory)
);

// POST /driver/delivery/:id/status - Update delivery status
router.post(
  '/delivery/:id/status',
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid delivery ID'),
    body('status')
      .isIn([
        DeliveryStatus.PICKING_UP,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.ON_THE_WAY,
        DeliveryStatus.NEARBY,
      ])
      .withMessage('Invalid status transition'),
  ],
  checkValidation,
  catchAsync(driverController.updateDeliveryStatus)
);

// POST /driver/delivery/:id/complete - Complete delivery
router.post(
  '/delivery/:id/complete',
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid delivery ID'),
    body('photoUrl').optional().isURL().withMessage('Invalid photo URL'),
    body('notes').optional().isString().withMessage('Notes must be string'),
  ],
  checkValidation,
  catchAsync(driverController.completeDelivery)
);

// POST /driver/delivery/:id/issue - Report delivery issue
router.post(
  '/delivery/:id/issue',
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid delivery ID'),
    body('issueType')
      .isIn(['customer_unavailable', 'wrong_address', 'order_damaged', 'other'])
      .withMessage('Invalid issue type'),
    body('description').optional().isString().withMessage('Description must be string'),
  ],
  checkValidation,
  catchAsync(driverController.reportIssue)
);

// GET /driver/delivery/:id/route - Get route to destination
router.get(
  '/delivery/:id/route',
  readLimiter,
  [param('id').isUUID().withMessage('Invalid delivery ID')],
  checkValidation,
  catchAsync(driverController.getDeliveryRoute)
);

export default router;
