import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import couponService from '../services/coupon.service';

/**
 * Get all coupons
 * GET /coupons
 */
export const getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await couponService.getCoupons(req.business!);

  res.json({
    success: true,
    data: coupons,
    total: coupons.length,
  });
});

/**
 * Get active/valid coupons (non-expired)
 * GET /coupons/active
 */
export const getActiveCoupons = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await couponService.getValidCoupons(req.business!);

  res.json({
    success: true,
    data: coupons,
    total: coupons.length,
  });
});

/**
 * Get single coupon by ID
 * GET /coupons/:id
 */
export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const coupon = await couponService.getCouponById(id, req.business!);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found'
    });
  }

  res.json({
    success: true,
    data: coupon,
  });
});

/**
 * Sync all coupons (for mobile app)
 * GET /coupons/sync
 */
export const syncCoupons = asyncHandler(async (req: Request, res: Response) => {
  const coupons = await couponService.syncCoupons(req.business!);

  res.json({
    success: true,
    data: coupons,
  });
});

/**
 * Add new coupon
 * POST /coupons
 */
export const addCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.createCoupon({
    ...req.body,
    businessId: req.business!,
  });

  res.status(201).json({
    success: true,
    message: 'Coupon created successfully',
    data: coupon,
  });
});

/**
 * Update coupon
 * PUT /coupons/:id
 */
export const editCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const coupon = await couponService.updateCoupon(id, req.business!, req.body);

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.json({
    success: true,
    message: 'Coupon updated successfully',
    data: coupon,
  });
});

/**
 * Delete coupon
 * DELETE /coupons/:id
 */
export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await couponService.deleteCoupon(id, req.business!);

  if (!result) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.json({
    success: true,
    message: 'Coupon deleted successfully',
  });
});

export default {
  getAllCoupons,
  getActiveCoupons,
  getCoupon,
  syncCoupons,
  addCoupon,
  editCoupon,
  deleteCoupon,
};
