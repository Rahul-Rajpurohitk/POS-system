/**
 * Map Configuration
 *
 * Mapbox configuration for delivery tracking maps.
 *
 * To use your own Mapbox token:
 * 1. Create a Mapbox account at https://account.mapbox.com/
 * 2. Create an access token with the required scopes
 * 3. Replace the MAPBOX_ACCESS_TOKEN below with your token
 *
 * For production, consider using environment variables or secrets management.
 */

// Mapbox public access token
export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoicmFodWxyYWpwdXJvaGl0MjAyNCIsImEiOiJjbWwwMzV3M2IwOGo2M2Rva2pkZ2I1bGFpIn0.EOne6ueACyLGA232gnDWgg';

// Default map settings
export const MAP_CONFIG = {
  // Default center (San Francisco as fallback)
  defaultCenter: {
    latitude: 37.7749,
    longitude: -122.4194,
  },

  // Default zoom levels
  zoom: {
    initial: 14,
    min: 10,
    max: 18,
    storeView: 15,
    deliveryView: 13,
    driverTracking: 16,
  },

  // Map style URLs
  styles: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    navigation: 'mapbox://styles/mapbox/navigation-day-v1',
    navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
  },

  // Marker colors
  markers: {
    store: '#3B82F6',      // Primary blue
    driver: '#F59E0B',     // Warning yellow
    customer: '#10B981',   // Success green
    pickup: '#8B5CF6',     // Purple
    delivery: '#EF4444',   // Red
  },

  // Location tracking settings
  tracking: {
    updateIntervalMs: 3000,       // 3 seconds
    minDistanceMeters: 10,        // Minimum movement to broadcast
    highAccuracy: true,
  },

  // Route display
  route: {
    lineWidth: 4,
    lineColor: '#3B82F6',
    lineOpacity: 0.8,
    completedColor: '#10B981',
    pendingColor: '#9CA3AF',
  },
};

// Mapbox profile for routing based on vehicle type
export const VEHICLE_PROFILES = {
  walking: 'mapbox/walking',
  bicycle: 'mapbox/cycling',
  e_scooter: 'mapbox/cycling',
  motorcycle: 'mapbox/driving',
  car: 'mapbox/driving-traffic',
} as const;

export type VehicleType = keyof typeof VEHICLE_PROFILES;

// Google Maps API for public transit routing
// Set this to enable transit routing functionality
// Get your API key from: https://console.cloud.google.com/
// Required APIs: Directions API
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Transit configuration
export const TRANSIT_CONFIG = {
  // Whether transit routing is enabled
  enabled: !!GOOGLE_MAPS_API_KEY,

  // Transit mode preferences
  modes: {
    bus: true,
    subway: true,
    train: true,
    tram: true,
    rail: true,
  },

  // Routing preferences
  preferences: {
    lessWalking: false,
    fewerTransfers: false,
  },

  // Colors for different transit modes
  colors: {
    walk: '#6B7280',
    bus: '#10B981',
    subway: '#3B82F6',
    train: '#8B5CF6',
    tram: '#F59E0B',
    rail: '#EF4444',
    ferry: '#06B6D4',
  },
};
