import { apiClient } from '@/services/api/client';
import type { ApiResponse, ApiListResponse, Product, Category, Order, Coupon } from '@/types';

// ============================================
// Types
// ============================================

export interface StoreInfo {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  hours: {
    [key: string]: { open: string; close: string } | null;
  };
  isOpen: boolean;
  deliveryEnabled: boolean;
  minimumOrder?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  estimatedDeliveryTime?: string;
  logo?: string;
  banner?: string;
}

export interface MenuCategory extends Category {
  productCount: number;
  products?: Product[];
}

export interface PlaceOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
  }>;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryInstructions?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  couponCode?: string;
  paymentMethod: 'cash' | 'card' | 'online';
  tip?: number;
  scheduledTime?: string;
}

export interface PlaceOrderResponse {
  order: Order;
  trackingToken: string;
  estimatedDelivery?: string;
}

export interface ValidateCouponRequest {
  code: string;
  subtotal: number;
}

export interface CustomerOrderHistoryQuery {
  page?: number;
  limit?: number;
  status?: string;
}

// ============================================
// Customer Store API
// ============================================

export const customerStoreApi = {
  /**
   * Get store information
   */
  getStoreInfo: () =>
    apiClient.get<ApiResponse<StoreInfo>>('/customer/store'),

  /**
   * Get menu categories
   */
  getCategories: () =>
    apiClient.get<ApiResponse<MenuCategory[]>>('/customer/menu/categories'),

  /**
   * Get products by category
   */
  getProductsByCategory: (categoryId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiListResponse<Product>>(`/customer/menu/categories/${categoryId}/products`, {
      params,
    }),

  /**
   * Get all menu products
   */
  getAllProducts: (params?: { page?: number; limit?: number; search?: string; categoryId?: string }) =>
    apiClient.get<ApiListResponse<Product>>('/customer/menu/products', { params }),

  /**
   * Get featured products
   */
  getFeaturedProducts: () =>
    apiClient.get<ApiResponse<Product[]>>('/customer/menu/featured'),

  /**
   * Get product details
   */
  getProductDetails: (productId: string) =>
    apiClient.get<ApiResponse<Product>>(`/customer/menu/products/${productId}`),

  /**
   * Search products
   */
  searchProducts: (query: string) =>
    apiClient.get<ApiResponse<Product[]>>('/customer/menu/search', {
      params: { q: query },
    }),
};

// ============================================
// Customer Order API
// ============================================

export const customerOrderApi = {
  /**
   * Place a new order
   */
  placeOrder: (data: PlaceOrderRequest) =>
    apiClient.post<ApiResponse<PlaceOrderResponse>>('/customer/orders', data),

  /**
   * Get order history
   */
  getOrderHistory: (params?: CustomerOrderHistoryQuery) =>
    apiClient.get<ApiListResponse<Order>>('/customer/orders', { params }),

  /**
   * Get order details
   */
  getOrderDetails: (orderId: string) =>
    apiClient.get<ApiResponse<Order>>(`/customer/orders/${orderId}`),

  /**
   * Get active order (if any)
   */
  getActiveOrder: () =>
    apiClient.get<ApiResponse<Order | null>>('/customer/orders/active'),

  /**
   * Cancel order (only if still pending)
   */
  cancelOrder: (orderId: string, reason?: string) =>
    apiClient.post<ApiResponse<Order>>(`/customer/orders/${orderId}/cancel`, { reason }),

  /**
   * Reorder (create new order from previous)
   */
  reorder: (orderId: string) =>
    apiClient.post<ApiResponse<PlaceOrderResponse>>(`/customer/orders/${orderId}/reorder`),
};

// ============================================
// Customer Coupon API
// ============================================

export const customerCouponApi = {
  /**
   * Validate a coupon code
   */
  validateCoupon: (data: ValidateCouponRequest) =>
    apiClient.post<ApiResponse<Coupon>>('/customer/coupons/validate', data),

  /**
   * Get available coupons
   */
  getAvailableCoupons: () =>
    apiClient.get<ApiResponse<Coupon[]>>('/customer/coupons'),
};

// ============================================
// Customer Address API
// ============================================

export const customerAddressApi = {
  /**
   * Check if address is deliverable
   */
  checkDeliverability: (address: string, latitude?: number, longitude?: number) =>
    apiClient.post<ApiResponse<{
      deliverable: boolean;
      deliveryFee: number;
      estimatedTime: string;
      zone?: string;
    }>>('/customer/address/check', { address, latitude, longitude }),

  /**
   * Geocode an address
   */
  geocodeAddress: (address: string) =>
    apiClient.post<ApiResponse<{
      latitude: number;
      longitude: number;
      formattedAddress: string;
    }>>('/customer/address/geocode', { address }),

  /**
   * Get saved addresses
   */
  getSavedAddresses: () =>
    apiClient.get<ApiResponse<Array<{
      id: string;
      label: string;
      address: string;
      latitude?: number;
      longitude?: number;
      instructions?: string;
      isDefault: boolean;
    }>>>('/customer/addresses'),

  /**
   * Save a new address
   */
  saveAddress: (data: {
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    instructions?: string;
    isDefault?: boolean;
  }) =>
    apiClient.post<ApiResponse<{ id: string }>>('/customer/addresses', data),

  /**
   * Delete saved address
   */
  deleteAddress: (addressId: string) =>
    apiClient.delete<ApiResponse<void>>(`/customer/addresses/${addressId}`),
};

export default {
  store: customerStoreApi,
  order: customerOrderApi,
  coupon: customerCouponApi,
  address: customerAddressApi,
};
