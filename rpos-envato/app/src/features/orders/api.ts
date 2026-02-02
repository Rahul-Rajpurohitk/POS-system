import { apiClient } from '@/services/api/client';
import type { Order, OrderItem, ApiListResponse, ApiResponse } from '@/types';

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: Order['status'] | string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  // Backend filter parameters
  dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  paymentMethod?: string;
  orderType?: string;
  search?: string;
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
  completedToday: number;
  pendingOrders: number;
  openOrders: number;
  cancelledOrders: number;
  ordersByStatus: Record<string, number>;
}

export interface ExchangeOrderRequest {
  returnItems?: Array<{ itemId: string; quantity: number }>;
  exchangeItems?: Array<{ productId: string; quantity: number }>;
  refundAmount: number;
  additionalPayment: number;
  reason: string;
  notes?: string;
  destination?: string;
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

  updateStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status }),

  delete: (id: string) =>
    apiClient.delete(`/orders/${id}`),

  getStats: (dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all') =>
    apiClient.get<ApiResponse<OrderStats>>('/orders/stats', { params: dateRange ? { dateRange } : undefined }),

  getByCustomer: (customerId: string) =>
    apiClient.get<ApiResponse<Order[]>>(`/orders/customer/${customerId}`),

  getRecent: (limit?: number) =>
    apiClient.get<ApiResponse<Order[]>>('/orders/recent', { params: { limit } }),

  void: (id: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/void`),

  refund: (id: string, amount: number) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/refund`, { amount }),

  exchange: (id: string, data: ExchangeOrderRequest) =>
    apiClient.post<ApiResponse<{ originalOrder: Order; exchangeOrder?: Order }>>(`/orders/${id}/exchange`, data),
};
