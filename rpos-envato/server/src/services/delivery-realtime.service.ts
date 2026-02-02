/**
 * Delivery Realtime Service
 * Handles location broadcasting with throttling for delivery tracking
 */

import { realtimeService, RealtimeEvent } from './realtime.service';
import { cacheService } from './cache.service';

// Throttling configuration
const LOCATION_UPDATE_MIN_INTERVAL_MS = parseInt(process.env.LOCATION_UPDATE_MIN_INTERVAL_MS || '3000', 10);
const LOCATION_UPDATE_MIN_DISTANCE_METERS = parseInt(process.env.LOCATION_UPDATE_MIN_DISTANCE_METERS || '10', 10);

interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface ThrottleState {
  lastUpdate: LocationUpdate;
  lastBroadcastTime: number;
}

class DeliveryRealtimeService {
  // In-memory throttle states (keyed by deliveryId)
  private throttleStates: Map<string, ThrottleState> = new Map();

  /**
   * Update driver location with throttling
   * Only broadcasts if enough time has passed AND enough distance has been traveled
   */
  async updateDriverLocation(
    deliveryId: string,
    businessId: string,
    trackingToken: string,
    location: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    },
    eta?: Date
  ): Promise<boolean> {
    const now = Date.now();
    const currentLocation: LocationUpdate = {
      ...location,
      timestamp: now,
    };

    const throttleState = this.throttleStates.get(deliveryId);

    // Check if we should broadcast
    if (throttleState) {
      const timeSinceLastBroadcast = now - throttleState.lastBroadcastTime;
      const distance = this.calculateDistance(
        throttleState.lastUpdate.latitude,
        throttleState.lastUpdate.longitude,
        location.latitude,
        location.longitude
      );

      // Skip if not enough time AND not enough distance
      if (
        timeSinceLastBroadcast < LOCATION_UPDATE_MIN_INTERVAL_MS &&
        distance < LOCATION_UPDATE_MIN_DISTANCE_METERS
      ) {
        return false;
      }
    }

    // Update throttle state
    this.throttleStates.set(deliveryId, {
      lastUpdate: currentLocation,
      lastBroadcastTime: now,
    });

    // Broadcast to real-time clients
    realtimeService.emitDeliveryLocationUpdate(
      businessId,
      deliveryId,
      trackingToken,
      location,
      eta
    );

    // Store in Redis for late-joining clients
    await this.cacheDriverLocation(deliveryId, currentLocation);

    return true;
  }

  /**
   * Get last known driver location from cache
   */
  async getLastKnownLocation(deliveryId: string): Promise<LocationUpdate | null> {
    const cacheKey = `delivery:${deliveryId}:location`;
    return cacheService.get<LocationUpdate>(cacheKey);
  }

  /**
   * Cache driver location in Redis
   */
  private async cacheDriverLocation(
    deliveryId: string,
    location: LocationUpdate
  ): Promise<void> {
    const cacheKey = `delivery:${deliveryId}:location`;
    // Cache for 1 hour (delivery should be completed by then)
    await cacheService.set(cacheKey, location, 3600);
  }

  /**
   * Clean up throttle state when delivery is completed
   */
  clearThrottleState(deliveryId: string): void {
    this.throttleStates.delete(deliveryId);
  }

  /**
   * Batch broadcast multiple driver locations (for POS dashboard)
   * Aggregates all active drivers for a business
   */
  async broadcastAllDriverLocations(businessId: string): Promise<void> {
    const driversKey = `business:${businessId}:active_drivers`;
    const driverIds = await cacheService.get<string[]>(driversKey) || [];

    if (driverIds.length === 0) return;

    const locations: Array<{
      driverId: string;
      location: LocationUpdate;
    }> = [];

    for (const driverId of driverIds) {
      const locationKey = `driver:${driverId}:location`;
      const location = await cacheService.get<LocationUpdate>(locationKey);
      if (location) {
        locations.push({ driverId, location });
      }
    }

    if (locations.length > 0) {
      realtimeService.broadcastToBusiness(
        businessId,
        RealtimeEvent.DRIVER_LOCATION_UPDATED,
        { drivers: locations }
      );
    }
  }

  /**
   * Register a driver as active for a business
   */
  async registerActiveDriver(businessId: string, driverId: string): Promise<void> {
    const driversKey = `business:${businessId}:active_drivers`;
    const driverIds = await cacheService.get<string[]>(driversKey) || [];

    if (!driverIds.includes(driverId)) {
      driverIds.push(driverId);
      await cacheService.set(driversKey, driverIds, 86400); // 24 hours
    }
  }

  /**
   * Unregister a driver from active list
   */
  async unregisterActiveDriver(businessId: string, driverId: string): Promise<void> {
    const driversKey = `business:${businessId}:active_drivers`;
    const driverIds = await cacheService.get<string[]>(driversKey) || [];

    const index = driverIds.indexOf(driverId);
    if (index > -1) {
      driverIds.splice(index, 1);
      await cacheService.set(driversKey, driverIds, 86400);
    }
  }

  /**
   * Update driver location in cache
   */
  async updateDriverLocationCache(
    driverId: string,
    location: LocationUpdate
  ): Promise<void> {
    const locationKey = `driver:${driverId}:location`;
    await cacheService.set(locationKey, location, 3600);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Handle customer joining tracking room
   * Sends current state immediately
   */
  async handleTrackingJoin(
    socketId: string,
    trackingToken: string,
    deliveryId: string
  ): Promise<void> {
    // Join the room
    realtimeService.joinTrackingRoom(socketId, trackingToken);

    // Send current location immediately
    const location = await this.getLastKnownLocation(deliveryId);
    if (location) {
      realtimeService.broadcastToTrackingRoom(
        trackingToken,
        RealtimeEvent.DELIVERY_LOCATION_UPDATED,
        {
          deliveryId,
          location,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * Handle driver going online
   */
  async handleDriverOnline(
    socketId: string,
    driverId: string,
    businessId: string
  ): Promise<void> {
    // Join driver room
    realtimeService.joinDriverRoom(socketId, driverId);

    // Register as active
    await this.registerActiveDriver(businessId, driverId);

    // Notify business
    realtimeService.broadcastToBusiness(
      businessId,
      RealtimeEvent.DRIVER_STATUS_CHANGED,
      { driverId, status: 'available' }
    );
  }

  /**
   * Handle driver going offline
   */
  async handleDriverOffline(
    socketId: string,
    driverId: string,
    businessId: string
  ): Promise<void> {
    // Leave driver room
    realtimeService.leaveDriverRoom(socketId, driverId);

    // Unregister from active list
    await this.unregisterActiveDriver(businessId, driverId);

    // Clean up location cache
    const locationKey = `driver:${driverId}:location`;
    await cacheService.del(locationKey);

    // Notify business
    realtimeService.broadcastToBusiness(
      businessId,
      RealtimeEvent.DRIVER_STATUS_CHANGED,
      { driverId, status: 'offline' }
    );
  }

  /**
   * Notify driver of new delivery assignment
   */
  notifyDriverAssignment(
    driverId: string,
    delivery: {
      id: string;
      orderId: string;
      orderNumber: number;
      pickupAddress: string;
      deliveryAddress: string;
      customerName: string;
      customerPhone: string;
      items?: Array<{ name: string; quantity: number }>;
    }
  ): void {
    realtimeService.sendToDriver(driverId, RealtimeEvent.DRIVER_ASSIGNED, delivery);
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    activeThrottleStates: number;
    minIntervalMs: number;
    minDistanceMeters: number;
  } {
    return {
      activeThrottleStates: this.throttleStates.size,
      minIntervalMs: LOCATION_UPDATE_MIN_INTERVAL_MS,
      minDistanceMeters: LOCATION_UPDATE_MIN_DISTANCE_METERS,
    };
  }
}

export const deliveryRealtimeService = new DeliveryRealtimeService();
