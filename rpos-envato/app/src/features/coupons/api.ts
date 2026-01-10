import { apiClient } from '@/services/api/client';
import type { Coupon } from '@/types';

export interface CreateCouponRequest {
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  amount: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  expiredAt?: string;
  isActive?: boolean;
}

export interface UpdateCouponRequest extends Partial<CreateCouponRequest> {}

export interface ValidateCouponResponse {
  valid: boolean;
  coupon?: Coupon;
  message?: string;
}

export const couponsApi = {
  getAll: () =>
    apiClient.get<Coupon[]>('/coupons'),

  getById: (id: string) =>
    apiClient.get<Coupon>(`/coupons/${id}`),

  create: (data: CreateCouponRequest) =>
    apiClient.post<Coupon>('/coupons', data),

  update: (id: string, data: UpdateCouponRequest) =>
    apiClient.put<Coupon>(`/coupons/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/coupons/${id}`),

  validate: (code: string, orderTotal: number) =>
    apiClient.post<ValidateCouponResponse>('/coupons/validate', { code, orderTotal }),

  getByCode: (code: string) =>
    apiClient.get<Coupon>(`/coupons/code/${code}`),

  getActive: () =>
    apiClient.get<Coupon[]>('/coupons/active'),
};
