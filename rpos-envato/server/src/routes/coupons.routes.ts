import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import * as couponsController from '../controllers/coupons.controller';

const router = Router();

// GET /coupons/sync
router.get('/sync', staff, couponsController.syncCoupons);

// POST /coupons
router.post(
  '/',
  manager,
  [
    body('code').notEmpty().withMessage('Coupon code is required'),
    body('name').notEmpty().withMessage('Coupon name is required'),
    body('type').isIn(['fixed', 'percentage']).withMessage('Invalid coupon type'),
    body('amount').isNumeric().withMessage('Amount is required'),
  ],
  checkValidation,
  couponsController.addCoupon
);

// PUT /coupons/:id
router.put(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid coupon ID')],
  checkValidation,
  couponsController.editCoupon
);

// DELETE /coupons/:id
router.delete(
  '/:id',
  manager,
  [param('id').isUUID().withMessage('Invalid coupon ID')],
  checkValidation,
  couponsController.deleteCoupon
);

export default router;
