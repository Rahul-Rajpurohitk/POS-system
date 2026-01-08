import { AppDataSource } from '../config/database';
import { Coupon } from '../entities/Coupon.entity';
import { CouponType } from '../types/enums';
import { MoreThan, IsNull, Or } from 'typeorm';

export interface CreateCouponParams {
  code: string;
  name: string;
  type: CouponType;
  amount: number;
  expiredAt?: Date | null;
  businessId: string;
}

/**
 * Coupon Service - Handles coupon business logic
 */
export class CouponService {
  private couponRepository = AppDataSource.getRepository(Coupon);

  /**
   * Create a new coupon
   */
  async createCoupon(params: CreateCouponParams): Promise<Coupon> {
    // Check for duplicate code
    const existing = await this.couponRepository.findOne({
      where: { code: params.code, businessId: params.businessId },
    });

    if (existing) {
      throw new Error('Coupon code already exists');
    }

    const coupon = this.couponRepository.create({
      code: params.code.toUpperCase(),
      name: params.name,
      type: params.type,
      amount: params.amount,
      expiredAt: params.expiredAt || null,
      businessId: params.businessId,
      enabled: true,
    });

    return this.couponRepository.save(coupon);
  }

  /**
   * Update a coupon
   */
  async updateCoupon(
    couponId: string,
    businessId: string,
    params: Partial<CreateCouponParams>
  ): Promise<Coupon | null> {
    const coupon = await this.couponRepository.findOne({
      where: { id: couponId, businessId },
    });

    if (!coupon) {
      return null;
    }

    // Check for duplicate code if changing
    if (params.code && params.code.toUpperCase() !== coupon.code) {
      const existing = await this.couponRepository.findOne({
        where: { code: params.code.toUpperCase(), businessId },
      });

      if (existing) {
        throw new Error('Coupon code already exists');
      }
    }

    Object.assign(coupon, {
      code: params.code?.toUpperCase() ?? coupon.code,
      name: params.name ?? coupon.name,
      type: params.type ?? coupon.type,
      amount: params.amount ?? coupon.amount,
      expiredAt: params.expiredAt !== undefined ? params.expiredAt : coupon.expiredAt,
    });

    return this.couponRepository.save(coupon);
  }

  /**
   * Delete a coupon (soft delete)
   */
  async deleteCoupon(couponId: string, businessId: string): Promise<boolean> {
    const result = await this.couponRepository.update(
      { id: couponId, businessId },
      { enabled: false }
    );

    return (result.affected ?? 0) > 0;
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(couponId: string, businessId: string): Promise<Coupon | null> {
    return this.couponRepository.findOne({
      where: { id: couponId, businessId, enabled: true },
    });
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string, businessId: string): Promise<Coupon | null> {
    return this.couponRepository.findOne({
      where: { code: code.toUpperCase(), businessId, enabled: true },
    });
  }

  /**
   * Get all coupons for a business
   */
  async getCoupons(businessId: string): Promise<Coupon[]> {
    return this.couponRepository.find({
      where: { businessId, enabled: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get only valid (non-expired) coupons
   */
  async getValidCoupons(businessId: string): Promise<Coupon[]> {
    const now = new Date();

    const coupons = await this.couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.business_id = :businessId', { businessId })
      .andWhere('coupon.enabled = true')
      .andWhere('(coupon.expired_at IS NULL OR coupon.expired_at > :now)', { now })
      .orderBy('coupon.created_at', 'DESC')
      .getMany();

    return coupons;
  }

  /**
   * Sync all coupons for a business (for mobile app)
   */
  async syncCoupons(businessId: string): Promise<Coupon[]> {
    return this.getValidCoupons(businessId);
  }

  /**
   * Validate a coupon for use
   */
  async validateCoupon(
    code: string,
    businessId: string,
    orderTotal: number
  ): Promise<{ valid: boolean; coupon?: Coupon; discount?: number; message?: string }> {
    const coupon = await this.getCouponByCode(code, businessId);

    if (!coupon) {
      return { valid: false, message: 'Coupon not found' };
    }

    if (!coupon.isValid) {
      return { valid: false, message: 'Coupon is expired or disabled' };
    }

    let discount: number;
    if (coupon.type === CouponType.FIXED) {
      discount = Math.min(Number(coupon.amount), orderTotal);
    } else {
      discount = (orderTotal * Number(coupon.amount)) / 100;
    }

    return {
      valid: true,
      coupon,
      discount,
    };
  }
}

export default new CouponService();
