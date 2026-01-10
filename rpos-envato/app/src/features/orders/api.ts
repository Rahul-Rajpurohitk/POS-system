import { apiClient } from '@/services/api/client';
import type { Order, OrderItem, PaginatedResponse } from '@/types';

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
    apiClient.get<PaginatedResponse<Order>>('/orders', { params }),

  getById: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`),

  create: (data: CreateOrderRequest) =>
    apiClient.post<Order>('/orders', data),

  update: (id: string, data: UpdateOrderRequest) =>
    apiClient.put<Order>(`/orders/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/orders/${id}`),

  getStats: () =>
    apiClient.get<OrderStats>('/orders/stats'),

  getByCustomer: (customerId: string) =>
    apiClient.get<Order[]>(`/orders/customer/${customerId}`),

  getRecent: (limit?: number) =>
    apiClient.get<Order[]>('/orders/recent', { params: { limit } }),

  void: (id: string) =>
    apiClient.post<Order>(`/orders/${id}/void`),

  refund: (id: string, amount: number) =>
    apiClient.post<Order>(`/orders/${id}/refund`, { amount }),
};
