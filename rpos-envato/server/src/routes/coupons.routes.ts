import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as couponsController from '../controllers/coupons.controller';

const router = Router();

// GET /coupons - Get all coupons
router.get('/', staff, readLimiter, catchAsync(couponsController.getAllCoupons));

// GET /coupons/active - Get active/valid coupons (non-expired)
router.get('/active', staff, readLimiter, catchAsync(couponsController.getActiveCoupons));

// GET /coupons/sync - Sync coupons for mobile
router.get('/sync', staff, readLimiter, catchAsync(couponsController.syncCoupons));

// GET /coupons/:id - Get single coupon
router.get(
  '/:id',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid coupon ID')],
  checkValidation,
  catchAsync(couponsController.getCoupon)
);

// POST /coupons
router.post(
  '/',
  manager,
  createLimiter,
  [
    body('code').notEmpty().withMessage('Coupon code is required'),
    body('name').notEmpty().withMessage('Coupon name is required'),
    body('type').isIn(['fixed', 'percentage']).withMessage('Invalid coupon type'),
    body('amount').isNumeric().withMessage('Amount is required'),
  ],
  checkValidation,
  catchAsync(couponsController.addCoupon)
);

// PUT /coupons/:id
router.put(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid coupon ID')],
  checkValidation,
  catchAsync(couponsController.editCoupon)
);

// DELETE /coupons/:id
router.delete(
  '/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid coupon ID')],
  checkValidation,
  catchAsync(couponsController.deleteCoupon)
);

export default router;
