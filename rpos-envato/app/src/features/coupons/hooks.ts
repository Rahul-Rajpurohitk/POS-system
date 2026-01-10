import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncStore } from '@/store';
import { generateLocalId } from '@/utils';
import { couponsApi } from './api';
import type { CreateCouponRequest, UpdateCouponRequest } from './api';
import type { Coupon } from '@/types';

export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  details: () => [...couponKeys.all, 'detail'] as const,
  detail: (id: string) => [...couponKeys.details(), id] as const,
  code: (code: string) => [...couponKeys.all, 'code', code] as const,
  active: () => [...couponKeys.all, 'active'] as const,
};

export function useCoupons() {
  return useQuery({
    queryKey: couponKeys.lists(),
    queryFn: () => couponsApi.getAll(),
    select: (response) => response.data,
  });
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: couponKeys.detail(id),
    queryFn: () => couponsApi.getById(id),
    select: (response) => response.data,
    enabled: !!id && !id.startsWith('local-'),
  });
}

export function useCouponByCode(code: string) {
  return useQuery({
    queryKey: couponKeys.code(code),
    queryFn: () => couponsApi.getByCode(code),
    select: (response) => response.data,
    enabled: !!code,
  });
}

export function useActiveCoupons() {
  return useQuery({
    queryKey: couponKeys.active(),
    queryFn: () => couponsApi.getActive(),
    select: (response) => response.data,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({ code, orderTotal }: { code: string; orderTotal: number }) =>
      couponsApi.validate(code, orderTotal),
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (data: CreateCouponRequest) => {
      if (!isOnline) {
        const localCoupon: Coupon = {
          id: generateLocalId(),
          ...data,
          createdAt: new Date().toISOString(),
        };
        addToQueue({
          type: 'create',
          entity: 'coupon',
          data,
          localId: localCoupon.id,
        });
        return { data: localCoupon };
      }
      return couponsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.active() });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCouponRequest }) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'update',
          entity: 'coupon',
          data: { id, ...data },
          localId: id,
        });
        return { data: { id, ...data } as Coupon };
      }
      return couponsApi.update(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: couponKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.active() });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  const { addToQueue, isOnline } = useSyncStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isOnline || id.startsWith('local-')) {
        addToQueue({
          type: 'delete',
          entity: 'coupon',
          data: { id },
          localId: id,
        });
        return;
      }
      return couponsApi.delete(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: couponKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.active() });
    },
  });
}
