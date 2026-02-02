/**
 * Routing Service
 *
 * Fetches routes from Mapbox Directions API for delivery tracking visualization.
 */

import { MAPBOX_ACCESS_TOKEN, VEHICLE_PROFILES, VehicleType } from '@/config/maps';
import type { Coordinate, RouteSegment } from '@/components/delivery/DeliveryMap';

export interface RouteOptions {
  vehicleType?: VehicleType;
  alternatives?: boolean;
  overview?: 'full' | 'simplified' | 'false';
  steps?: boolean;
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  coordinates: Coordinate[];
  geometry: string; // polyline
}

/**
 * Decode Mapbox polyline to coordinates
 */
function decodePolyline(encoded: string, precision: number = 5): Coordinate[] {
  const factor = Math.pow(10, precision);
  const coordinates: Coordinate[] = [];
  let lat = 0;
  let lng = 0;
  let index = 0;

  while (index < encoded.length) {
    let byte = 0;
    let shift = 0;
    let result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }

  return coordinates;
}

/**
 * Fetch route between two points using Mapbox Directions API
 */
export async function getRoute(
  origin: Coordinate,
  destination: Coordinate,
  options: RouteOptions = {}
): Promise<RouteResult | null> {
  const {
    vehicleType = 'car',
    alternatives = false,
    overview = 'full',
    steps = false,
  } = options;

  const profile = VEHICLE_PROFILES[vehicleType] || 'mapbox/driving';

  const url = new URL(
    `https://api.mapbox.com/directions/v5/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  );

  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN);
  url.searchParams.set('geometries', 'polyline');
  url.searchParams.set('overview', overview);
  url.searchParams.set('alternatives', String(alternatives));
  url.searchParams.set('steps', String(steps));

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Routing API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn('No routes found');
      return null;
    }

    const route = data.routes[0];

    return {
      distance: route.distance,
      duration: route.duration,
      coordinates: decodePolyline(route.geometry),
      geometry: route.geometry,
    };
  } catch (error) {
    console.error('Failed to fetch route:', error);
    return null;
  }
}

/**
 * Fetch routes for multiple waypoints (e.g., store → customer1 → customer2)
 */
export async function getMultiStopRoute(
  waypoints: Coordinate[],
  options: RouteOptions = {}
): Promise<RouteResult | null> {
  if (waypoints.length < 2) {
    console.warn('Need at least 2 waypoints for routing');
    return null;
  }

  const { vehicleType = 'car', overview = 'full', steps = false } = options;
  const profile = VEHICLE_PROFILES[vehicleType] || 'mapbox/driving';

  const coordinatesString = waypoints
    .map((wp) => `${wp.longitude},${wp.latitude}`)
    .join(';');

  const url = new URL(
    `https://api.mapbox.com/directions/v5/${profile}/${coordinatesString}`
  );

  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN);
  url.searchParams.set('geometries', 'polyline');
  url.searchParams.set('overview', overview);
  url.searchParams.set('steps', String(steps));

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Routing API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn('No routes found');
      return null;
    }

    const route = data.routes[0];

    return {
      distance: route.distance,
      duration: route.duration,
      coordinates: decodePolyline(route.geometry),
      geometry: route.geometry,
    };
  } catch (error) {
    console.error('Failed to fetch multi-stop route:', error);
    return null;
  }
}

/**
 * Convert RouteResult to RouteSegment for map display
 */
export function routeResultToSegment(
  result: RouteResult,
  options: {
    id?: string;
    color?: string;
    isCompleted?: boolean;
  } = {}
): RouteSegment {
  return {
    id: options.id || `route-${Date.now()}`,
    coordinates: result.coordinates,
    color: options.color,
    isCompleted: options.isCompleted || false,
  };
}

/**
 * Calculate estimated arrival time based on route duration
 */
export function calculateETA(durationSeconds: number): Date {
  return new Date(Date.now() + durationSeconds * 1000);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format distance in human-readable format
 */
export function formatDistance(meters: number, useImperial: boolean = true): string {
  if (useImperial) {
    const miles = meters * 0.000621371;
    if (miles < 0.1) {
      return `${Math.round(meters * 3.28084)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  } else {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }
}
