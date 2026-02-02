import { apiClient } from '@/services/api/client';
import type { ApiResponse, ApiListResponse, Order, Delivery, DriverProfile } from '@/types';

// ============================================
// Types
// ============================================

export interface OnlineOrderQueueItem {
  id: string;
  orderId: string;
  order: Order;
  status: 'pending' | 'accepted' | 'expired' | 'rejected';
  expiresAt: string;
  createdAt: string;
  reminderCount: number;
}

export interface AcceptOrderRequest {
  orderId: string;
}

export interface AssignDriverRequest {
  deliveryId: string;
  driverId: string;
}

export interface DriverSuggestion {
  driver: DriverProfile;
  score: number;
  distance?: number;
  distanceMeters?: number;
  estimatedPickupTime?: number;
  estimatedPickupMinutes?: number;
  currentDeliveries?: number;
  reason?: string;
  isBestMatch?: boolean;
}

export interface DeliveryStats {
  pendingOrders: number;
  activeDeliveries: number;
  completedToday: number;
  cancelledToday?: number;
  averageDeliveryTime?: number;
  availableDrivers?: number;
}

export interface QueueStats {
  pending: number;
  expiringSoon: number;
  acceptedToday: number;
  rejectedToday?: number;
  expiredToday?: number;
  averageAcceptanceTime?: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  color: string;
  zoneType: 'radius' | 'polygon';
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  baseFee: number;
  perKmFee: number;
  minOrderAmount: number;
  freeDeliveryThreshold: number | null;
  estimatedMinMinutes: number;
  estimatedMaxMinutes: number;
  priority: number;
  enabled: boolean;
  businessId: string;
}

// ============================================
// Delivery Zones API (POS)
// ============================================

export const deliveryZonesApi = {
  /**
   * Get all delivery zones for the business
   */
  getZones: () =>
    apiClient.get<ApiResponse<DeliveryZone[]>>('/delivery/zones'),

  /**
   * Get a single delivery zone
   */
  getZone: (zoneId: string) =>
    apiClient.get<ApiResponse<DeliveryZone>>(`/delivery/zones/${zoneId}`),

  /**
   * Check if an address is deliverable
   */
  checkAddress: (address: string, latitude?: number, longitude?: number) =>
    apiClient.post<ApiResponse<{ deliverable: boolean; zone?: DeliveryZone; fee?: number }>>('/delivery/zones/check', {
      address,
      latitude,
      longitude,
    }),
};

// ============================================
// Online Order Queue API (POS)
// ============================================

export const onlineOrderApi = {
  /**
   * Get pending online orders (queue)
   */
  getPendingOrders: () =>
    apiClient.get<ApiResponse<OnlineOrderQueueItem[]>>('/delivery/queue'),

  /**
   * Accept an online order
   * @param queueEntryId - The ID of the queue entry (not orderId)
   * @param createDelivery - Optional delivery details to create
   */
  acceptOrder: (queueEntryId: string, createDelivery?: {
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    deliveryAddress: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    customerName: string;
    customerPhone: string;
    deliveryFee?: number;
  }) =>
    apiClient.post<ApiResponse<{ queueEntry: OnlineOrderQueueItem; order: any; delivery?: Delivery }>>(
      `/delivery/queue/${queueEntryId}/accept`,
      { createDelivery }
    ),

  /**
   * Reject an online order
   * @param queueEntryId - The ID of the queue entry (not orderId)
   */
  rejectOrder: (queueEntryId: string, reason?: string) =>
    apiClient.post<ApiResponse<void>>(`/delivery/queue/${queueEntryId}/reject`, { reason }),

  /**
   * Get order queue stats
   */
  getQueueStats: () =>
    apiClient.get<ApiResponse<{ pending: number; expiringSoon: number }>>('/delivery/stats'),
};

// ============================================
// Driver Assignment API (POS)
// ============================================

export const driverAssignmentApi = {
  /**
   * Get available drivers
   */
  getAvailableDrivers: () =>
    apiClient.get<ApiResponse<DriverProfile[]>>('/delivery/drivers/available'),

  /**
   * Get driver suggestions for a delivery
   */
  getDriverSuggestions: (deliveryId: string) =>
    apiClient.get<ApiResponse<DriverSuggestion[]>>(`/delivery/${deliveryId}/drivers`),

  /**
   * Assign driver to delivery
   */
  assignDriver: (deliveryId: string, driverId: string) =>
    apiClient.post<ApiResponse<Delivery>>(`/delivery/${deliveryId}/assign`, { driverId }),

  /**
   * Unassign driver from delivery
   */
  unassignDriver: (deliveryId: string) =>
    apiClient.post<ApiResponse<Delivery>>(`/delivery/${deliveryId}/unassign`),
};

// ============================================
// Active Deliveries API (POS)
// ============================================

export const activeDeliveriesApi = {
  /**
   * Get all active deliveries
   */
  getActiveDeliveries: () =>
    apiClient.get<ApiListResponse<Delivery>>('/delivery/active'),

  /**
   * Get delivery details
   */
  getDeliveryDetails: (deliveryId: string) =>
    apiClient.get<ApiResponse<Delivery>>(`/delivery/${deliveryId}`),

  /**
   * Cancel a delivery
   */
  cancelDelivery: (deliveryId: string, reason?: string) =>
    apiClient.post<ApiResponse<Delivery>>(`/delivery/${deliveryId}/cancel`, { reason }),

  /**
   * Update delivery status
   */
  updateStatus: (deliveryId: string, status: string) =>
    apiClient.patch<ApiResponse<Delivery>>(`/delivery/${deliveryId}/status`, { status }),

  /**
   * Auto-assign best driver to delivery
   */
  autoAssignDriver: (deliveryId: string) =>
    apiClient.post<ApiResponse<Delivery>>(`/delivery/${deliveryId}/auto-assign`),

  /**
   * Get delivery stats for dashboard
   */
  getDeliveryStats: () =>
    apiClient.get<ApiResponse<DeliveryStats>>('/delivery/stats'),

  /**
   * Get delivery history
   */
  getDeliveryHistory: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiListResponse<Delivery>>('/delivery/history', { params }),
};

export default {
  orders: onlineOrderApi,
  drivers: driverAssignmentApi,
  deliveries: activeDeliveriesApi,
  zones: deliveryZonesApi,
};
