/**
 * Multi-Modal Routing Engine
 *
 * Handles route calculation for different vehicle types:
 * - Walking
 * - Bicycle
 * - Motorcycle
 * - Car
 * - Public Transit (requires external provider)
 *
 * Uses Mapbox Directions API for non-transit modes.
 */

import { MAPBOX_ACCESS_TOKEN, GOOGLE_MAPS_API_KEY, TRANSIT_CONFIG } from '@/config/maps';

// Types
export type VehicleType = 'walking' | 'bicycle' | 'motorcycle' | 'car' | 'transit';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string;
  coordinates: Coordinate[];
}

export interface TransitLeg {
  mode: 'walk' | 'bus' | 'subway' | 'rail' | 'tram' | 'ferry';
  lineName?: string;
  lineColor?: string;
  departureTime: Date;
  arrivalTime: Date;
  departureStop?: string;
  arrivalStop?: string;
  numStops?: number;
  coordinates: Coordinate[];
}

export interface RouteResult {
  vehicleType: VehicleType;
  distance: number; // meters
  duration: number; // seconds
  coordinates: Coordinate[];
  steps?: RouteStep[];
  transitLegs?: TransitLeg[]; // For public transit
  polyline?: string; // Encoded polyline
  summary?: string;
  isAlternative?: boolean;
}

export interface RouteOptions {
  alternatives?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date; // For transit
  arrivalTime?: Date; // For transit
  optimize?: boolean; // For multi-stop
}

// Mapbox profile mapping
const MAPBOX_PROFILES: Record<Exclude<VehicleType, 'transit'>, string> = {
  walking: 'mapbox/walking',
  bicycle: 'mapbox/cycling',
  motorcycle: 'mapbox/driving',
  car: 'mapbox/driving-traffic',
};

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
 * Get route using Mapbox Directions API
 */
async function getMapboxRoute(
  origin: Coordinate,
  destination: Coordinate,
  vehicleType: Exclude<VehicleType, 'transit'>,
  options: RouteOptions = {}
): Promise<RouteResult[]> {
  const profile = MAPBOX_PROFILES[vehicleType];

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    geometries: 'polyline6',
    overview: 'full',
    steps: 'true',
    alternatives: String(options.alternatives ?? false),
    annotations: 'distance,duration',
  });

  // Add avoid options for driving
  if (vehicleType === 'car' || vehicleType === 'motorcycle') {
    const exclude: string[] = [];
    if (options.avoidTolls) exclude.push('toll');
    if (options.avoidHighways) exclude.push('motorway');
    if (exclude.length > 0) {
      params.set('exclude', exclude.join(','));
    }
  }

  const url = `https://api.mapbox.com/directions/v5/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?${params}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found');
    }

    return data.routes.map((route: any, index: number) => {
      const coordinates = decodePolyline(route.geometry, 6);

      const steps: RouteStep[] = route.legs?.[0]?.steps?.map((step: any) => ({
        instruction: step.maneuver?.instruction || '',
        distance: step.distance,
        duration: step.duration,
        maneuver: step.maneuver?.type || '',
        coordinates: step.geometry ? decodePolyline(step.geometry, 6) : [],
      })) || [];

      return {
        vehicleType,
        distance: route.distance,
        duration: route.duration,
        coordinates,
        steps,
        polyline: route.geometry,
        summary: route.legs?.[0]?.summary || '',
        isAlternative: index > 0,
      };
    });
  } catch (error) {
    console.error('Route calculation failed:', error);
    throw error;
  }
}

/**
 * Get multi-stop route (optimized or ordered)
 */
async function getMultiStopRoute(
  waypoints: Coordinate[],
  vehicleType: Exclude<VehicleType, 'transit'>,
  options: RouteOptions = {}
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('Need at least 2 waypoints');
  }

  const profile = MAPBOX_PROFILES[vehicleType];
  const coordinatesStr = waypoints
    .map((wp) => `${wp.longitude},${wp.latitude}`)
    .join(';');

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    geometries: 'polyline6',
    overview: 'full',
    steps: 'true',
  });

  // Optimization endpoint for multi-stop
  const baseUrl = options.optimize
    ? `https://api.mapbox.com/optimized-trips/v1/${profile}`
    : `https://api.mapbox.com/directions/v5/${profile}`;

  const url = `${baseUrl}/${coordinatesStr}?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status}`);
  }

  const data = await response.json();
  const route = options.optimize ? data.trips?.[0] : data.routes?.[0];

  if (!route) {
    throw new Error('No route found');
  }

  const coordinates = decodePolyline(route.geometry, 6);

  return {
    vehicleType,
    distance: route.distance,
    duration: route.duration,
    coordinates,
    polyline: route.geometry,
  };
}

/**
 * Transit routing using Google Directions API
 *
 * Provides public transit directions with detailed leg information
 * including walking segments, bus/subway details, and departure times.
 *
 * Requires GOOGLE_MAPS_API_KEY to be configured in config/maps.ts
 */
async function getTransitRoute(
  origin: Coordinate,
  destination: Coordinate,
  options: RouteOptions = {}
): Promise<RouteResult[]> {
  // If Google API key is not configured, use enhanced walking fallback
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured. Using walking route for transit.');
    return getTransitFallback(origin, destination, options);
  }

  try {
    return await getGoogleTransitRoute(origin, destination, options);
  } catch (error) {
    console.error('Google Transit API failed, using fallback:', error);
    return getTransitFallback(origin, destination, options);
  }
}

/**
 * Get transit route from Google Directions API
 */
async function getGoogleTransitRoute(
  origin: Coordinate,
  destination: Coordinate,
  options: RouteOptions = {}
): Promise<RouteResult[]> {
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: 'transit',
    alternatives: 'true',
    key: GOOGLE_MAPS_API_KEY,
  });

  // Add departure or arrival time
  if (options.departureTime) {
    params.set('departure_time', String(Math.floor(options.departureTime.getTime() / 1000)));
  } else if (options.arrivalTime) {
    params.set('arrival_time', String(Math.floor(options.arrivalTime.getTime() / 1000)));
  } else {
    params.set('departure_time', 'now');
  }

  // Add transit mode preferences
  const transitModes: string[] = [];
  if (TRANSIT_CONFIG.modes.bus) transitModes.push('bus');
  if (TRANSIT_CONFIG.modes.subway) transitModes.push('subway');
  if (TRANSIT_CONFIG.modes.train) transitModes.push('train');
  if (TRANSIT_CONFIG.modes.tram) transitModes.push('tram');
  if (TRANSIT_CONFIG.modes.rail) transitModes.push('rail');

  if (transitModes.length > 0) {
    params.set('transit_mode', transitModes.join('|'));
  }

  // Add routing preferences
  const routingPrefs: string[] = [];
  if (TRANSIT_CONFIG.preferences.lessWalking) routingPrefs.push('less_walking');
  if (TRANSIT_CONFIG.preferences.fewerTransfers) routingPrefs.push('fewer_transfers');

  if (routingPrefs.length > 0) {
    params.set('transit_routing_preference', routingPrefs.join('|'));
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Directions API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
    throw new Error(data.error_message || 'No transit routes found');
  }

  return data.routes.map((route: any, index: number) => {
    const leg = route.legs[0];
    const transitLegs: TransitLeg[] = [];
    const allCoordinates: Coordinate[] = [];

    // Process each step (walking or transit)
    for (const step of leg.steps) {
      const stepCoords = decodeGooglePolyline(step.polyline?.points || '');
      allCoordinates.push(...stepCoords);

      if (step.travel_mode === 'WALKING') {
        transitLegs.push({
          mode: 'walk',
          departureTime: new Date(),
          arrivalTime: new Date(Date.now() + (step.duration?.value || 0) * 1000),
          coordinates: stepCoords,
        });
      } else if (step.travel_mode === 'TRANSIT') {
        const transitDetails = step.transit_details;
        transitLegs.push({
          mode: mapGoogleTransitMode(transitDetails?.line?.vehicle?.type),
          lineName: transitDetails?.line?.short_name || transitDetails?.line?.name,
          lineColor: transitDetails?.line?.color,
          departureTime: new Date(transitDetails?.departure_time?.value * 1000 || Date.now()),
          arrivalTime: new Date(transitDetails?.arrival_time?.value * 1000 || Date.now()),
          departureStop: transitDetails?.departure_stop?.name,
          arrivalStop: transitDetails?.arrival_stop?.name,
          numStops: transitDetails?.num_stops,
          coordinates: stepCoords,
        });
      }
    }

    return {
      vehicleType: 'transit' as VehicleType,
      distance: leg.distance?.value || 0,
      duration: leg.duration?.value || 0,
      coordinates: allCoordinates,
      transitLegs,
      summary: route.summary || generateTransitSummary(transitLegs),
      isAlternative: index > 0,
    };
  });
}

/**
 * Decode Google's polyline encoding
 * (Google uses precision 5, slightly different from Mapbox's precision 6)
 */
function decodeGooglePolyline(encoded: string): Coordinate[] {
  return decodePolyline(encoded, 5);
}

/**
 * Map Google transit vehicle types to our TransitLeg modes
 */
function mapGoogleTransitMode(vehicleType: string | undefined): TransitLeg['mode'] {
  const modeMap: Record<string, TransitLeg['mode']> = {
    BUS: 'bus',
    SUBWAY: 'subway',
    TRAIN: 'rail',
    TRAM: 'tram',
    RAIL: 'rail',
    HEAVY_RAIL: 'rail',
    COMMUTER_TRAIN: 'rail',
    HIGH_SPEED_TRAIN: 'rail',
    LONG_DISTANCE_TRAIN: 'rail',
    METRO_RAIL: 'subway',
    MONORAIL: 'rail',
    FERRY: 'ferry',
    CABLE_CAR: 'tram',
    GONDOLA_LIFT: 'tram',
    FUNICULAR: 'tram',
    TROLLEYBUS: 'bus',
    SHARE_TAXI: 'bus',
  };
  return modeMap[vehicleType || ''] || 'bus';
}

/**
 * Generate a summary string from transit legs
 */
function generateTransitSummary(legs: TransitLeg[]): string {
  const transitLegs = legs.filter(l => l.mode !== 'walk');
  if (transitLegs.length === 0) return 'Walking only';

  const modes = transitLegs.map(l => {
    if (l.lineName) return l.lineName;
    return l.mode.charAt(0).toUpperCase() + l.mode.slice(1);
  });

  return modes.join(' → ');
}

/**
 * Fallback transit routing when Google API is unavailable
 * Provides walking directions with estimated transit times
 */
async function getTransitFallback(
  origin: Coordinate,
  destination: Coordinate,
  options: RouteOptions = {}
): Promise<RouteResult[]> {
  // Get walking route as base
  const walkingRoutes = await getMapboxRoute(origin, destination, 'walking', options);

  // Estimate transit time based on distance
  // Transit is typically 2-4x faster than walking for medium distances
  return walkingRoutes.map((route) => {
    const distanceKm = route.distance / 1000;

    // Estimate transit time: walking for short distances, transit multiplier for longer
    let estimatedDuration = route.duration;
    let transitLegs: TransitLeg[] = [];

    if (distanceKm < 0.5) {
      // Short distance - just walk
      transitLegs = [{
        mode: 'walk',
        departureTime: new Date(),
        arrivalTime: new Date(Date.now() + route.duration * 1000),
        coordinates: route.coordinates,
      }];
    } else if (distanceKm < 2) {
      // Medium distance - one transit leg
      estimatedDuration = route.duration * 0.6; // Transit saves ~40%
      const walkToStop = Math.min(300, route.duration * 0.2); // 5 min or 20% walk
      const transitTime = estimatedDuration * 0.6;
      const walkFromStop = Math.min(300, route.duration * 0.2);

      transitLegs = [
        {
          mode: 'walk',
          departureTime: new Date(),
          arrivalTime: new Date(Date.now() + walkToStop * 1000),
          coordinates: route.coordinates.slice(0, Math.floor(route.coordinates.length * 0.15)),
        },
        {
          mode: 'bus',
          lineName: 'Local Transit',
          departureTime: new Date(Date.now() + walkToStop * 1000),
          arrivalTime: new Date(Date.now() + (walkToStop + transitTime) * 1000),
          departureStop: 'Nearby Stop',
          arrivalStop: 'Destination Area',
          coordinates: route.coordinates.slice(
            Math.floor(route.coordinates.length * 0.15),
            Math.floor(route.coordinates.length * 0.85)
          ),
        },
        {
          mode: 'walk',
          departureTime: new Date(Date.now() + (walkToStop + transitTime) * 1000),
          arrivalTime: new Date(Date.now() + estimatedDuration * 1000),
          coordinates: route.coordinates.slice(Math.floor(route.coordinates.length * 0.85)),
        },
      ];
    } else {
      // Long distance - multiple transit legs
      estimatedDuration = route.duration * 0.4; // Transit saves ~60%
      const segmentDuration = estimatedDuration / 4;

      transitLegs = [
        {
          mode: 'walk',
          departureTime: new Date(),
          arrivalTime: new Date(Date.now() + segmentDuration * 1000),
          coordinates: route.coordinates.slice(0, Math.floor(route.coordinates.length * 0.1)),
        },
        {
          mode: 'bus',
          lineName: 'Bus',
          departureTime: new Date(Date.now() + segmentDuration * 1000),
          arrivalTime: new Date(Date.now() + segmentDuration * 2 * 1000),
          departureStop: 'Bus Stop',
          arrivalStop: 'Transfer Point',
          coordinates: route.coordinates.slice(
            Math.floor(route.coordinates.length * 0.1),
            Math.floor(route.coordinates.length * 0.4)
          ),
        },
        {
          mode: 'subway',
          lineName: 'Metro',
          departureTime: new Date(Date.now() + segmentDuration * 2 * 1000),
          arrivalTime: new Date(Date.now() + segmentDuration * 3 * 1000),
          departureStop: 'Metro Station',
          arrivalStop: 'Exit Station',
          coordinates: route.coordinates.slice(
            Math.floor(route.coordinates.length * 0.4),
            Math.floor(route.coordinates.length * 0.85)
          ),
        },
        {
          mode: 'walk',
          departureTime: new Date(Date.now() + segmentDuration * 3 * 1000),
          arrivalTime: new Date(Date.now() + estimatedDuration * 1000),
          coordinates: route.coordinates.slice(Math.floor(route.coordinates.length * 0.85)),
        },
      ];
    }

    return {
      ...route,
      vehicleType: 'transit' as VehicleType,
      duration: estimatedDuration,
      transitLegs,
      summary: generateTransitSummary(transitLegs) + ' (estimated)',
    };
  });
}

/**
 * Main routing function - handles all vehicle types
 */
export async function calculateRoute(
  origin: Coordinate,
  destination: Coordinate,
  vehicleType: VehicleType,
  options: RouteOptions = {}
): Promise<RouteResult[]> {
  if (vehicleType === 'transit') {
    return getTransitRoute(origin, destination, options);
  }

  return getMapboxRoute(origin, destination, vehicleType, options);
}

/**
 * Calculate routes for all vehicle types to compare
 */
export async function compareRoutes(
  origin: Coordinate,
  destination: Coordinate,
  vehicleTypes: VehicleType[] = ['walking', 'bicycle', 'car']
): Promise<Map<VehicleType, RouteResult>> {
  const results = new Map<VehicleType, RouteResult>();

  await Promise.all(
    vehicleTypes.map(async (type) => {
      try {
        const routes = await calculateRoute(origin, destination, type);
        if (routes.length > 0) {
          results.set(type, routes[0]);
        }
      } catch (error) {
        console.warn(`Failed to calculate ${type} route:`, error);
      }
    })
  );

  return results;
}

/**
 * Get optimal vehicle type based on distance and time
 */
export function suggestVehicleType(
  distance: number, // meters
  routes: Map<VehicleType, RouteResult>
): VehicleType {
  // Simple heuristics
  if (distance < 500) return 'walking';
  if (distance < 2000) return routes.has('bicycle') ? 'bicycle' : 'walking';
  if (distance < 5000) return routes.has('bicycle') ? 'bicycle' : 'car';
  return 'car';
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number, useImperial: boolean = true): string {
  if (useImperial) {
    const miles = meters * 0.000621371;
    if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
    return `${miles.toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calculate ETA from current time
 */
export function calculateETA(durationSeconds: number, fromTime: Date = new Date()): Date {
  return new Date(fromTime.getTime() + durationSeconds * 1000);
}

// Types are already exported at their definitions above
