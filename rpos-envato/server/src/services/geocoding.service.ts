/**
 * Geocoding Service
 * Integrates with Mapbox Geocoding API for address resolution
 */

import { cacheService } from './cache.service';
import { deliveryZoneService } from './delivery-zone.service';

// Mapbox configuration
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
const MAPBOX_GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  confidence: number; // 0-1
  placeId?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  isDeliverable: boolean;
  coordinates?: Coordinates;
  formattedAddress?: string;
  zone?: {
    id: string;
    name: string;
    baseFee: number;
    estimatedMinMinutes: number;
    estimatedMaxMinutes: number;
  };
  error?: string;
}

export interface ReverseGeocodingResult {
  formattedAddress: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

class GeocodingService {
  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(
    address: string,
    businessId?: string
  ): Promise<GeocodingResult | null> {
    // Check cache first
    const cacheKey = `geocode:${this.normalizeAddress(address)}`;
    const cached = await cacheService.get<GeocodingResult>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn('Mapbox access token not configured');
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${MAPBOX_GEOCODING_API}/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1&types=address`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox Geocoding API error: ${response.status}`);
      }

      const data = await response.json() as { features?: any[] };

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const result = this.parseGeocodingFeature(feature);

        // Cache for 24 hours
        await cacheService.set(cacheKey, result, 86400);

        return result;
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodingResult | null> {
    // Check cache first
    const cacheKey = `reverse:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = await cacheService.get<ReverseGeocodingResult>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn('Mapbox access token not configured');
      return null;
    }

    try {
      const url = `${MAPBOX_GEOCODING_API}/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=address&limit=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox Reverse Geocoding API error: ${response.status}`);
      }

      const data = await response.json() as { features?: any[] };

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const result = this.parseReverseGeocodingFeature(feature);

        // Cache for 24 hours
        await cacheService.set(cacheKey, result, 86400);

        return result;
      }

      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Validate delivery address and check if it's in a delivery zone
   */
  async validateDeliveryAddress(
    address: string,
    businessId: string,
    orderTotal?: number
  ): Promise<AddressValidationResult> {
    // First, geocode the address
    const geocodeResult = await this.geocodeAddress(address, businessId);

    if (!geocodeResult) {
      return {
        isValid: false,
        isDeliverable: false,
        error: 'Unable to find address. Please check the address and try again.',
      };
    }

    // Check confidence level
    if (geocodeResult.confidence < 0.7) {
      return {
        isValid: false,
        isDeliverable: false,
        coordinates: geocodeResult.coordinates,
        formattedAddress: geocodeResult.formattedAddress,
        error: 'Address could not be verified with high confidence. Please provide more details.',
      };
    }

    // Check if in delivery zone
    const zoneCheck = await deliveryZoneService.checkDeliverability(
      businessId,
      geocodeResult.coordinates.latitude,
      geocodeResult.coordinates.longitude,
      orderTotal || 0
    );

    if (!zoneCheck.deliverable) {
      return {
        isValid: true,
        isDeliverable: false,
        coordinates: geocodeResult.coordinates,
        formattedAddress: geocodeResult.formattedAddress,
        error: zoneCheck.reason || 'Address is outside delivery area.',
      };
    }

    return {
      isValid: true,
      isDeliverable: true,
      coordinates: geocodeResult.coordinates,
      formattedAddress: geocodeResult.formattedAddress,
      zone: zoneCheck.zone
        ? {
            id: zoneCheck.zone.id,
            name: zoneCheck.zone.name,
            baseFee: zoneCheck.deliveryFee || 0,
            estimatedMinMinutes: zoneCheck.zone.estimatedMinMinutes,
            estimatedMaxMinutes: zoneCheck.zone.estimatedMaxMinutes,
          }
        : undefined,
    };
  }

  /**
   * Search for address suggestions (autocomplete)
   */
  async getAddressSuggestions(
    query: string,
    proximity?: Coordinates,
    limit: number = 5
  ): Promise<GeocodingResult[]> {
    if (!MAPBOX_ACCESS_TOKEN || query.length < 3) {
      return [];
    }

    try {
      let url = `${MAPBOX_GEOCODING_API}/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=${limit}&types=address,place`;

      // Add proximity bias if provided
      if (proximity) {
        url += `&proximity=${proximity.longitude},${proximity.latitude}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox Autocomplete API error: ${response.status}`);
      }

      const data = await response.json() as { features?: any[] };

      if (data.features) {
        return data.features.map((feature: any) =>
          this.parseGeocodingFeature(feature)
        );
      }

      return [];
    } catch (error) {
      console.error('Address autocomplete error:', error);
      return [];
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses: string[]): Promise<Map<string, GeocodingResult | null>> {
    const results = new Map<string, GeocodingResult | null>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks: string[][] = [];

    for (let i = 0; i < addresses.length; i += concurrencyLimit) {
      chunks.push(addresses.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (address) => {
        const result = await this.geocodeAddress(address);
        results.set(address, result);
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Calculate distance between two addresses
   */
  async getDistanceBetweenAddresses(
    address1: string,
    address2: string
  ): Promise<{ meters: number; coordinates1: Coordinates; coordinates2: Coordinates } | null> {
    const [result1, result2] = await Promise.all([
      this.geocodeAddress(address1),
      this.geocodeAddress(address2),
    ]);

    if (!result1 || !result2) {
      return null;
    }

    const meters = this.calculateHaversineDistance(
      result1.coordinates,
      result2.coordinates
    );

    return {
      meters: Math.round(meters),
      coordinates1: result1.coordinates,
      coordinates2: result2.coordinates,
    };
  }

  // ============ PRIVATE METHODS ============

  /**
   * Parse Mapbox geocoding feature
   */
  private parseGeocodingFeature(feature: any): GeocodingResult {
    const context = feature.context || [];

    const findContext = (id: string) =>
      context.find((c: any) => c.id.startsWith(id))?.text;

    return {
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
      formattedAddress: feature.place_name,
      streetAddress: feature.address
        ? `${feature.address} ${feature.text}`
        : feature.text,
      city: findContext('place') || findContext('locality'),
      state: findContext('region'),
      postalCode: findContext('postcode'),
      country: findContext('country'),
      confidence: feature.relevance || 0.5,
      placeId: feature.id,
    };
  }

  /**
   * Parse Mapbox reverse geocoding feature
   */
  private parseReverseGeocodingFeature(feature: any): ReverseGeocodingResult {
    const context = feature.context || [];

    const findContext = (id: string) =>
      context.find((c: any) => c.id.startsWith(id))?.text;

    return {
      formattedAddress: feature.place_name,
      streetAddress: feature.address
        ? `${feature.address} ${feature.text}`
        : feature.text,
      city: findContext('place') || findContext('locality'),
      state: findContext('region'),
      postalCode: findContext('postcode'),
      country: findContext('country'),
    };
  }

  /**
   * Normalize address for caching
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Calculate Haversine distance
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
}

export const geocodingService = new GeocodingService();
