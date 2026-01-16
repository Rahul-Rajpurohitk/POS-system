import { apiClient } from '@/services/api/client';
import type { Coupon, ApiResponse } from '@/types';

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
    apiClient.get<ApiResponse<Coupon[]>>('/coupons'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Coupon>>(`/coupons/${id}`),

  create: (data: CreateCouponRequest) =>
    apiClient.post<ApiResponse<Coupon>>('/coupons', data),

  update: (id: string, data: UpdateCouponRequest) =>
    apiClient.put<ApiResponse<Coupon>>(`/coupons/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/coupons/${id}`),

  validate: (code: string, orderTotal: number) =>
    apiClient.post<ApiResponse<ValidateCouponResponse>>('/coupons/validate', { code, orderTotal }),

  getByCode: (code: string) =>
    apiClient.get<ApiResponse<Coupon>>(`/coupons/code/${code}`),

  getActive: () =>
    apiClient.get<ApiResponse<Coupon[]>>('/coupons/active'),
};
