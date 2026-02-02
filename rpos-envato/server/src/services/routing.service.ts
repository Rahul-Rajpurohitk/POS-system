/**
 * Routing Service
 * Integrates with Mapbox Directions API for route calculation and ETA estimation
 */

import { VehicleType } from '../types/enums';
import { cacheService } from './cache.service';

// Mapbox configuration
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5';

// Vehicle type to Mapbox profile mapping
const VEHICLE_PROFILE_MAP: Record<VehicleType, string> = {
  [VehicleType.WALKING]: 'mapbox/walking',
  [VehicleType.BICYCLE]: 'mapbox/cycling',
  [VehicleType.E_SCOOTER]: 'mapbox/cycling',
  [VehicleType.MOTORCYCLE]: 'mapbox/driving',
  [VehicleType.CAR]: 'mapbox/driving-traffic',
};

// Average speeds for fallback calculation (meters per second)
const AVERAGE_SPEEDS: Record<VehicleType, number> = {
  [VehicleType.WALKING]: 1.4, // ~5 km/h
  [VehicleType.BICYCLE]: 4.2, // ~15 km/h
  [VehicleType.E_SCOOTER]: 5.6, // ~20 km/h
  [VehicleType.MOTORCYCLE]: 8.3, // ~30 km/h
  [VehicleType.CAR]: 8.3, // ~30 km/h (urban)
};

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string; // Encoded polyline
  legs: RouteLeg[];
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  summary: string;
  steps: RouteStep[];
}

export interface RouteStep {
  distanceMeters: number;
  durationSeconds: number;
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    bearingBefore: number;
    bearingAfter: number;
    location: Coordinates;
  };
}

export interface ETAResult {
  estimatedArrival: Date;
  durationSeconds: number;
  distanceMeters: number;
  confidence: 'high' | 'medium' | 'low';
}

class RoutingService {
  /**
   * Calculate route between two points
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType = VehicleType.CAR
  ): Promise<RouteResult | null> {
    // Check cache first
    const cacheKey = this.getRouteCacheKey(origin, destination, vehicleType);
    const cached = await cacheService.get<RouteResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Try Mapbox API
    if (MAPBOX_ACCESS_TOKEN) {
      try {
        const result = await this.fetchMapboxRoute(origin, destination, vehicleType);
        if (result) {
          // Cache for 5 minutes
          await cacheService.set(cacheKey, result, 300);
          return result;
        }
      } catch (error) {
        console.error('Mapbox routing error:', error);
      }
    }

    // Fallback to straight-line calculation
    return this.calculateFallbackRoute(origin, destination, vehicleType);
  }

  /**
   * Calculate route with multiple waypoints
   */
  async calculateMultiStopRoute(
    waypoints: Coordinates[],
    vehicleType: VehicleType = VehicleType.CAR
  ): Promise<RouteResult | null> {
    if (waypoints.length < 2) {
      return null;
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      // Fallback: sum individual routes
      let totalDistance = 0;
      let totalDuration = 0;
      const legs: RouteLeg[] = [];

      for (let i = 0; i < waypoints.length - 1; i++) {
        const route = await this.calculateFallbackRoute(
          waypoints[i],
          waypoints[i + 1],
          vehicleType
        );
        if (route) {
          totalDistance += route.distanceMeters;
          totalDuration += route.durationSeconds;
          legs.push(...route.legs);
        }
      }

      return {
        distanceMeters: totalDistance,
        durationSeconds: totalDuration,
        polyline: '',
        legs,
      };
    }

    try {
      const profile = VEHICLE_PROFILE_MAP[vehicleType];
      const coordinates = waypoints
        .map((wp) => `${wp.longitude},${wp.latitude}`)
        .join(';');

      const url = `${MAPBOX_DIRECTIONS_API}/${profile}/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=polyline&overview=full&steps=true`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json() as { routes?: any[] };
      if (data.routes && data.routes.length > 0) {
        return this.parseMapboxRoute(data.routes[0]);
      }
    } catch (error) {
      console.error('Mapbox multi-stop routing error:', error);
    }

    return null;
  }

  /**
   * Calculate ETA from current position to destination
   */
  async calculateETA(
    currentLocation: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType = VehicleType.CAR
  ): Promise<ETAResult> {
    const route = await this.calculateRoute(currentLocation, destination, vehicleType);

    if (route && MAPBOX_ACCESS_TOKEN) {
      const estimatedArrival = new Date();
      estimatedArrival.setSeconds(estimatedArrival.getSeconds() + route.durationSeconds);

      return {
        estimatedArrival,
        durationSeconds: route.durationSeconds,
        distanceMeters: route.distanceMeters,
        confidence: 'high',
      };
    }

    // Fallback calculation
    const distance = this.calculateHaversineDistance(currentLocation, destination);
    const speed = AVERAGE_SPEEDS[vehicleType];
    const durationSeconds = Math.ceil(distance / speed);

    const estimatedArrival = new Date();
    estimatedArrival.setSeconds(estimatedArrival.getSeconds() + durationSeconds);

    return {
      estimatedArrival,
      durationSeconds,
      distanceMeters: Math.round(distance),
      confidence: route ? 'medium' : 'low',
    };
  }

  /**
   * Update ETA during active delivery
   * Uses traffic-aware routing if available
   */
  async updateLiveETA(
    deliveryId: string,
    currentLocation: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType
  ): Promise<ETAResult> {
    // Use traffic-aware profile for cars
    const profile =
      vehicleType === VehicleType.CAR
        ? VehicleType.CAR // Will use driving-traffic
        : vehicleType;

    const eta = await this.calculateETA(currentLocation, destination, profile);

    // Cache the ETA
    const cacheKey = `delivery:${deliveryId}:eta`;
    await cacheService.set(cacheKey, eta, 60); // Cache for 1 minute

    return eta;
  }

  /**
   * Get the Mapbox profile for a vehicle type
   */
  getVehicleProfile(vehicleType: VehicleType): string {
    return VEHICLE_PROFILE_MAP[vehicleType];
  }

  /**
   * Check if a destination is reachable from origin
   */
  async isReachable(
    origin: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType,
    maxDistanceMeters?: number
  ): Promise<boolean> {
    const route = await this.calculateRoute(origin, destination, vehicleType);

    if (!route) {
      return false;
    }

    if (maxDistanceMeters && route.distanceMeters > maxDistanceMeters) {
      return false;
    }

    return true;
  }

  /**
   * Get distance matrix for multiple origins and destinations
   * Useful for finding nearest driver
   */
  async getDistanceMatrix(
    origins: Coordinates[],
    destinations: Coordinates[],
    vehicleType: VehicleType = VehicleType.CAR
  ): Promise<number[][]> {
    if (!MAPBOX_ACCESS_TOKEN) {
      // Fallback to Haversine calculation
      return origins.map((origin) =>
        destinations.map((dest) =>
          Math.round(this.calculateHaversineDistance(origin, dest))
        )
      );
    }

    try {
      const profile = VEHICLE_PROFILE_MAP[vehicleType];
      const allPoints = [...origins, ...destinations];
      const coordinates = allPoints
        .map((p) => `${p.longitude},${p.latitude}`)
        .join(';');

      // Matrix API
      const sources = origins.map((_, i) => i).join(';');
      const dests = destinations.map((_, i) => origins.length + i).join(';');

      const url = `https://api.mapbox.com/directions-matrix/v1/${profile}/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&sources=${sources}&destinations=${dests}&annotations=distance`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox Matrix API error: ${response.status}`);
      }

      const data = await response.json() as { distances?: number[][] };
      return data.distances || [];
    } catch (error) {
      console.error('Distance matrix error:', error);
      // Fallback
      return origins.map((origin) =>
        destinations.map((dest) =>
          Math.round(this.calculateHaversineDistance(origin, dest))
        )
      );
    }
  }

  // ============ PRIVATE METHODS ============

  /**
   * Fetch route from Mapbox Directions API
   */
  private async fetchMapboxRoute(
    origin: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType
  ): Promise<RouteResult | null> {
    const profile = VEHICLE_PROFILE_MAP[vehicleType];
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

    const url = `${MAPBOX_DIRECTIONS_API}/${profile}/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=polyline&overview=full&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json() as { routes?: any[] };

    if (data.routes && data.routes.length > 0) {
      return this.parseMapboxRoute(data.routes[0]);
    }

    return null;
  }

  /**
   * Parse Mapbox route response
   */
  private parseMapboxRoute(route: any): RouteResult {
    const legs: RouteLeg[] = route.legs.map((leg: any) => ({
      distanceMeters: Math.round(leg.distance),
      durationSeconds: Math.round(leg.duration),
      summary: leg.summary || '',
      steps: leg.steps?.map((step: any) => ({
        distanceMeters: Math.round(step.distance),
        durationSeconds: Math.round(step.duration),
        instruction: step.maneuver?.instruction || '',
        maneuver: {
          type: step.maneuver?.type || 'turn',
          modifier: step.maneuver?.modifier,
          bearingBefore: step.maneuver?.bearing_before || 0,
          bearingAfter: step.maneuver?.bearing_after || 0,
          location: {
            latitude: step.maneuver?.location?.[1] || 0,
            longitude: step.maneuver?.location?.[0] || 0,
          },
        },
      })) || [],
    }));

    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      polyline: route.geometry || '',
      legs,
    };
  }

  /**
   * Calculate fallback route using straight-line distance
   */
  private calculateFallbackRoute(
    origin: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType
  ): RouteResult {
    const distance = this.calculateHaversineDistance(origin, destination);
    const speed = AVERAGE_SPEEDS[vehicleType];
    const duration = Math.ceil(distance / speed);

    // Apply road factor (actual roads are ~1.3x longer than straight line)
    const roadFactor = 1.3;
    const adjustedDistance = distance * roadFactor;
    const adjustedDuration = Math.ceil(adjustedDistance / speed);

    return {
      distanceMeters: Math.round(adjustedDistance),
      durationSeconds: adjustedDuration,
      polyline: '', // No polyline for fallback
      legs: [
        {
          distanceMeters: Math.round(adjustedDistance),
          durationSeconds: adjustedDuration,
          summary: 'Direct route (estimated)',
          steps: [],
        },
      ],
    };
  }

  /**
   * Calculate Haversine distance between two coordinates
   */
  private calculateHaversineDistance(
    point1: Coordinates,
    point2: Coordinates
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate cache key for route
   */
  private getRouteCacheKey(
    origin: Coordinates,
    destination: Coordinates,
    vehicleType: VehicleType
  ): string {
    // Round coordinates to 4 decimal places (~11m precision)
    const o = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}`;
    const d = `${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
    return `route:${vehicleType}:${o}:${d}`;
  }
}

export const routingService = new RoutingService();
