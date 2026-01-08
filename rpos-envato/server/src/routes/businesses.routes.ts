import { Router } from 'express';
import { body } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as businessesController from '../controllers/businesses.controller';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /businesses/me - Get current business
router.get('/me', readLimiter, catchAsync(businessesController.getCurrentBusiness));

// PUT /businesses/me - Update business settings (manager only)
router.put(
  '/me',
  managerOnly,
  createLimiter,
  [
    body('name').optional().isString().trim().notEmpty(),
    body('tax').optional().isNumeric(),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('language').optional().isString(),
    body('timezone').optional().isString(),
    body('settings').optional().isObject(),
  ],
  checkValidation,
  catchAsync(businessesController.updateBusiness)
);

// GET /businesses/logs - Get activity logs
router.get('/logs', managerOnly, readLimiter, catchAsync(businessesController.getLogs));

// GET /businesses/stats - Get business statistics
router.get('/stats', readLimiter, catchAsync(businessesController.getStats));

export default router;
