import { apiClient } from '@/services/api/client';
import type { Order, OrderItem, ApiListResponse, ApiResponse } from '@/types';

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: Order['status'];
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  customerId?: string;
  couponId?: string;
  subTotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'other';
  note?: string;
}

export interface UpdateOrderRequest {
  status?: Order['status'];
  note?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersToday: number;
  revenueToday: number;
}

export const ordersApi = {
  getAll: (params?: OrdersQuery) =>
    apiClient.get<ApiListResponse<Order>>('/orders', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${id}`),

  create: (data: CreateOrderRequest) =>
    apiClient.post<ApiResponse<Order>>('/orders', data),

  update: (id: string, data: UpdateOrderRequest) =>
    apiClient.put<ApiResponse<Order>>(`/orders/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/orders/${id}`),

  getStats: () =>
    apiClient.get<ApiResponse<OrderStats>>('/orders/stats'),

  getByCustomer: (customerId: string) =>
    apiClient.get<ApiResponse<Order[]>>(`/orders/customer/${customerId}`),

  getRecent: (limit?: number) =>
    apiClient.get<ApiResponse<Order[]>>('/orders/recent', { params: { limit } }),

  void: (id: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/void`),

  refund: (id: string, amount: number) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/refund`, { amount }),
};
