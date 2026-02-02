/**
 * Geocoding Service
 *
 * Converts addresses to coordinates using various providers.
 * Currently uses Nominatim (OpenStreetMap) for geocoding.
 */

import { MAPBOX_ACCESS_TOKEN } from '@/config/maps';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName?: string;
  confidence?: number;
}

/**
 * Geocode an address to coordinates using Nominatim (OpenStreetMap)
 * Free and no API key required
 */
export async function geocodeAddressNominatim(address: string): Promise<GeocodingResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'POS-Universal-App/2.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
        confidence: result.importance,
      };
    }

    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

/**
 * Geocode an address to coordinates using Mapbox
 * Requires valid Mapbox access token
 */
export async function geocodeAddressMapbox(address: string): Promise<GeocodingResult | null> {
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'pk.your_mapbox_token_here') {
    // Fallback to Nominatim if no Mapbox token
    return geocodeAddressNominatim(address);
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Mapbox geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const result = data.features[0];
      return {
        latitude: result.center[1],
        longitude: result.center[0],
        displayName: result.place_name,
        confidence: result.relevance,
      };
    }

    return null;
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    // Fallback to Nominatim
    return geocodeAddressNominatim(address);
  }
}

/**
 * Main geocoding function - uses Mapbox if available, otherwise Nominatim
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length < 3) {
    return null;
  }

  // Try Mapbox first if configured
  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN !== 'pk.your_mapbox_token_here') {
    const result = await geocodeAddressMapbox(address);
    if (result) return result;
  }

  // Fallback to Nominatim
  return geocodeAddressNominatim(address);
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'POS-Universal-App/2.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
