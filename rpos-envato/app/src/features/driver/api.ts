import { apiClient } from '@/services/api/client';
import type {
  DriverProfile,
  Delivery,
  DriverStatus,
  DeliveryStatus,
  DriverStats,
  DeliveryRoute,
  DeliveryETA,
  ApiResponse,
  ApiListResponse,
} from '@/types';

// ============================================
// Request/Response Types
// ============================================

export interface UpdateStatusRequest {
  status: DriverStatus;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatus;
}

export interface CompleteDeliveryRequest {
  photoUrl?: string;
  notes?: string;
}

export interface ReportIssueRequest {
  issueType: 'customer_unavailable' | 'wrong_address' | 'damaged_items' | 'other';
  description: string;
}

export interface DeliveryHistoryQuery {
  page?: number;
  limit?: number;
  status?: DeliveryStatus;
  startDate?: string;
  endDate?: string;
}

export interface RouteResponse {
  route: DeliveryRoute;
  eta: DeliveryETA;
  destination: {
    latitude: number;
    longitude: number;
  };
  destinationType: 'pickup' | 'delivery';
}

// ============================================
// Driver API
// ============================================

export const driverApi = {
  // ============ Profile ============

  /**
   * Get current driver's profile
   */
  getMyProfile: () =>
    apiClient.get<ApiResponse<DriverProfile>>('/driver/me'),

  // ============ Status ============

  /**
   * Update driver status (online/offline/busy/on_break)
   */
  updateStatus: (data: UpdateStatusRequest) =>
    apiClient.post<ApiResponse<DriverProfile>>('/driver/status', data),

  // ============ Location ============

  /**
   * Update driver's current location
   */
  updateLocation: (data: UpdateLocationRequest) =>
    apiClient.post<ApiResponse<{ message: string }>>('/driver/location', data),

  // ============ Deliveries ============

  /**
   * Get driver's active delivery
   */
  getActiveDelivery: () =>
    apiClient.get<ApiResponse<Delivery | null>>('/driver/delivery/active'),

  /**
   * Get driver's delivery history
   */
  getDeliveryHistory: (params?: DeliveryHistoryQuery) =>
    apiClient.get<ApiListResponse<Delivery>>('/driver/deliveries', { params }),

  /**
   * Update delivery status
   */
  updateDeliveryStatus: (deliveryId: string, data: UpdateDeliveryStatusRequest) =>
    apiClient.post<ApiResponse<Delivery>>(`/driver/delivery/${deliveryId}/status`, data),

  /**
   * Complete delivery with proof
   */
  completeDelivery: (deliveryId: string, data: CompleteDeliveryRequest) =>
    apiClient.post<ApiResponse<Delivery>>(`/driver/delivery/${deliveryId}/complete`, data),

  /**
   * Report an issue with delivery
   */
  reportIssue: (deliveryId: string, data: ReportIssueRequest) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/driver/delivery/${deliveryId}/issue`, data),

  /**
   * Get route to destination
   */
  getDeliveryRoute: (deliveryId: string) =>
    apiClient.get<ApiResponse<RouteResponse>>(`/driver/delivery/${deliveryId}/route`),

  // ============ Stats ============

  /**
   * Get driver statistics
   */
  getStats: () =>
    apiClient.get<ApiResponse<DriverStats>>('/driver/stats'),

  /**
   * Get driver earnings for period
   */
  getEarnings: (period: 'today' | 'week' | 'month' = 'today') =>
    apiClient.get<ApiResponse<{
      total: number;
      deliveryFees: number;
      tips: number;
      bonuses: number;
      deductions: number;
      deliveryCount: number;
      activeTime: number;
      avgPerDelivery: number;
    }>>(`/driver/earnings?period=${period}`),
};

// ============================================
// Delivery Feature API (for tracking)
// ============================================

export const deliveryApi = {
  /**
   * Get delivery by ID (for POS)
   */
  getById: (id: string) =>
    apiClient.get<ApiResponse<Delivery>>(`/delivery/${id}`),

  /**
   * Get active deliveries for business
   */
  getActive: () =>
    apiClient.get<ApiResponse<Delivery[]>>('/delivery/active'),

  /**
   * Get all deliveries (paginated)
   */
  getAll: (params?: { page?: number; limit?: number; status?: DeliveryStatus }) =>
    apiClient.get<ApiListResponse<Delivery>>('/delivery', { params }),

  /**
   * Assign driver to delivery
   */
  assignDriver: (deliveryId: string, driverId: string) =>
    apiClient.post<ApiResponse<Delivery>>(`/delivery/${deliveryId}/assign`, { driverId }),

  /**
   * Auto-assign best driver
   */
  autoAssignDriver: (deliveryId: string) =>
    apiClient.post<ApiResponse<{ delivery: Delivery; assignedDriver: { id: string; name: string } }>>(
      `/delivery/${deliveryId}/auto-assign`
    ),

  /**
   * Cancel delivery
   */
  cancel: (deliveryId: string, reason?: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/delivery/${deliveryId}/cancel`, { reason }),
};

// ============================================
// Public Tracking API (no auth required)
// ============================================

export const trackingApi = {
  /**
   * Get tracking info by token
   */
  getTrackingInfo: (trackingToken: string) =>
    apiClient.get<ApiResponse<{
      id: string;
      status: DeliveryStatus;
      statusText: string;
      deliveryAddress: string;
      estimatedArrival?: string;
      driver?: {
        name: string;
        vehicleType: string;
        rating: number;
      };
      currentLocation?: {
        latitude: number;
        longitude: number;
      };
      routePolyline?: string;
      timestamps: {
        created?: string;
        accepted?: string;
        assigned?: string;
        pickedUp?: string;
        delivered?: string;
      };
      deliveryFee: number;
      driverTip: number;
    }>>(`/track/${trackingToken}`),

  /**
   * Get driver location
   */
  getDriverLocation: (trackingToken: string) =>
    apiClient.get<ApiResponse<{
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      timestamp: number;
      eta?: string;
    } | null>>(`/track/${trackingToken}/location`),

  /**
   * Rate delivery
   */
  rateDelivery: (trackingToken: string, rating: number, feedback?: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/track/${trackingToken}/rate`, {
      rating,
      feedback,
    }),

  /**
   * Update tip
   */
  updateTip: (trackingToken: string, tipAmount: number) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/track/${trackingToken}/tip`, {
      tipAmount,
    }),

  /**
   * Get status history
   */
  getStatusHistory: (trackingToken: string) =>
    apiClient.get<ApiResponse<Array<{
      status: string;
      timestamp: string;
      description: string;
    }>>>(`/track/${trackingToken}/history`),

  /**
   * Contact driver
   */
  contactDriver: (trackingToken: string, message: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/track/${trackingToken}/contact`, {
      message,
    }),
};
