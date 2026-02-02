import { AppDataSource } from '../config/database';
import { DeliveryZone, PolygonPoint } from '../entities/DeliveryZone.entity';
import { DeliveryZoneType } from '../types/enums';

export interface CreateDeliveryZoneParams {
  businessId: string;
  name: string;
  color?: string;
  zoneType: DeliveryZoneType;
  // For radius zones
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  // For polygon zones
  polygonCoordinates?: PolygonPoint[];
  // Pricing
  baseFee: number;
  perKmFee?: number;
  minOrderAmount?: number;
  freeDeliveryThreshold?: number;
  // Time estimates
  estimatedMinMinutes?: number;
  estimatedMaxMinutes?: number;
  priority?: number;
}

export interface UpdateDeliveryZoneParams {
  name?: string;
  color?: string;
  // For radius zones
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  // For polygon zones
  polygonCoordinates?: PolygonPoint[];
  // Pricing
  baseFee?: number;
  perKmFee?: number;
  minOrderAmount?: number;
  freeDeliveryThreshold?: number;
  // Time estimates
  estimatedMinMinutes?: number;
  estimatedMaxMinutes?: number;
  priority?: number;
  enabled?: boolean;
}

export interface DeliveryQuote {
  deliverable: boolean;
  zone?: DeliveryZone;
  deliveryFee: number;
  estimatedTimeRange: string;
  distanceKm?: number;
  reason?: string;
}

/**
 * Delivery Zone Service - Manages delivery zones and fee calculation
 */
export class DeliveryZoneService {
  private zoneRepository = AppDataSource.getRepository(DeliveryZone);

  /**
   * Create a new delivery zone
   */
  async createZone(params: CreateDeliveryZoneParams): Promise<DeliveryZone> {
    const {
      businessId,
      name,
      color = '#3B82F6',
      zoneType,
      centerLatitude,
      centerLongitude,
      radiusMeters,
      polygonCoordinates,
      baseFee,
      perKmFee = 0,
      minOrderAmount = 0,
      freeDeliveryThreshold,
      estimatedMinMinutes = 15,
      estimatedMaxMinutes = 45,
      priority = 0,
    } = params;

    // Validate zone type parameters
    if (zoneType === DeliveryZoneType.RADIUS) {
      if (!centerLatitude || !centerLongitude || !radiusMeters) {
        throw new Error('Radius zone requires centerLatitude, centerLongitude, and radiusMeters');
      }
    } else if (zoneType === DeliveryZoneType.POLYGON) {
      if (!polygonCoordinates || polygonCoordinates.length < 3) {
        throw new Error('Polygon zone requires at least 3 coordinates');
      }
    }

    const zone = this.zoneRepository.create({
      businessId,
      name,
      color,
      zoneType,
      centerLatitude: centerLatitude || null,
      centerLongitude: centerLongitude || null,
      radiusMeters: radiusMeters || null,
      polygonCoordinates: polygonCoordinates || null,
      baseFee,
      perKmFee,
      minOrderAmount,
      freeDeliveryThreshold: freeDeliveryThreshold || null,
      estimatedMinMinutes,
      estimatedMaxMinutes,
      priority,
      enabled: true,
    });

    return this.zoneRepository.save(zone);
  }

  /**
   * Get zone by ID
   */
  async getZoneById(zoneId: string, businessId: string): Promise<DeliveryZone | null> {
    return this.zoneRepository.findOne({
      where: { id: zoneId, businessId },
    });
  }

  /**
   * Get all zones for a business
   */
  async getBusinessZones(
    businessId: string,
    options?: { enabledOnly?: boolean }
  ): Promise<DeliveryZone[]> {
    const { enabledOnly = false } = options || {};

    const query = this.zoneRepository.createQueryBuilder('zone')
      .where('zone.businessId = :businessId', { businessId });

    if (enabledOnly) {
      query.andWhere('zone.enabled = :enabled', { enabled: true });
    }

    return query.orderBy('zone.priority', 'DESC').getMany();
  }

  /**
   * Update a delivery zone
   */
  async updateZone(
    zoneId: string,
    businessId: string,
    params: UpdateDeliveryZoneParams
  ): Promise<DeliveryZone | null> {
    const zone = await this.zoneRepository.findOne({
      where: { id: zoneId, businessId },
    });

    if (!zone) {
      return null;
    }

    // Build update object
    const updateData: Partial<DeliveryZone> = {};

    if (params.name !== undefined) updateData.name = params.name;
    if (params.color !== undefined) updateData.color = params.color;
    if (params.centerLatitude !== undefined) updateData.centerLatitude = params.centerLatitude;
    if (params.centerLongitude !== undefined) updateData.centerLongitude = params.centerLongitude;
    if (params.radiusMeters !== undefined) updateData.radiusMeters = params.radiusMeters;
    if (params.polygonCoordinates !== undefined) updateData.polygonCoordinates = params.polygonCoordinates;
    if (params.baseFee !== undefined) updateData.baseFee = params.baseFee;
    if (params.perKmFee !== undefined) updateData.perKmFee = params.perKmFee;
    if (params.minOrderAmount !== undefined) updateData.minOrderAmount = params.minOrderAmount;
    if (params.freeDeliveryThreshold !== undefined) updateData.freeDeliveryThreshold = params.freeDeliveryThreshold;
    if (params.estimatedMinMinutes !== undefined) updateData.estimatedMinMinutes = params.estimatedMinMinutes;
    if (params.estimatedMaxMinutes !== undefined) updateData.estimatedMaxMinutes = params.estimatedMaxMinutes;
    if (params.priority !== undefined) updateData.priority = params.priority;
    if (params.enabled !== undefined) updateData.enabled = params.enabled;

    await this.zoneRepository.update(zoneId, updateData);

    return this.getZoneById(zoneId, businessId);
  }

  /**
   * Delete a delivery zone
   */
  async deleteZone(zoneId: string, businessId: string): Promise<boolean> {
    const result = await this.zoneRepository.delete({ id: zoneId, businessId });
    return (result.affected || 0) > 0;
  }

  /**
   * Check if an address is deliverable and get quote
   */
  async checkDeliverability(
    businessId: string,
    latitude: number,
    longitude: number,
    orderAmount: number,
    storeLatitude?: number,
    storeLongitude?: number
  ): Promise<DeliveryQuote> {
    // Get all enabled zones, sorted by priority
    const zones = await this.getBusinessZones(businessId, { enabledOnly: true });

    if (zones.length === 0) {
      return {
        deliverable: false,
        deliveryFee: 0,
        estimatedTimeRange: '',
        reason: 'No delivery zones configured',
      };
    }

    // Find the first zone that contains the point (highest priority first)
    for (const zone of zones) {
      if (zone.containsPoint(latitude, longitude)) {
        // Check minimum order amount
        if (orderAmount < Number(zone.minOrderAmount)) {
          return {
            deliverable: false,
            zone,
            deliveryFee: 0,
            estimatedTimeRange: zone.estimatedTimeRange,
            reason: `Minimum order amount is $${Number(zone.minOrderAmount).toFixed(2)}`,
          };
        }

        // Calculate distance if store coordinates provided
        let distanceKm: number | undefined;
        let deliveryFee = Number(zone.baseFee);

        if (storeLatitude && storeLongitude) {
          const distance = this.calculateDistance(
            storeLatitude,
            storeLongitude,
            latitude,
            longitude
          );
          distanceKm = distance / 1000;

          // Add per-km fee
          deliveryFee = zone.calculateDeliveryFee(distanceKm, orderAmount);
        }

        return {
          deliverable: true,
          zone,
          deliveryFee,
          estimatedTimeRange: zone.estimatedTimeRange,
          distanceKm,
        };
      }
    }

    return {
      deliverable: false,
      deliveryFee: 0,
      estimatedTimeRange: '',
      reason: 'Address is outside delivery area',
    };
  }

  /**
   * Get delivery fee for an order
   */
  async calculateDeliveryFee(
    businessId: string,
    deliveryLatitude: number,
    deliveryLongitude: number,
    storeLatitude: number,
    storeLongitude: number,
    orderAmount: number
  ): Promise<{ fee: number; zone?: DeliveryZone; distanceKm: number }> {
    const quote = await this.checkDeliverability(
      businessId,
      deliveryLatitude,
      deliveryLongitude,
      orderAmount,
      storeLatitude,
      storeLongitude
    );

    if (!quote.deliverable) {
      throw new Error(quote.reason || 'Address not deliverable');
    }

    return {
      fee: quote.deliveryFee,
      zone: quote.zone,
      distanceKm: quote.distanceKm || 0,
    };
  }

  /**
   * Get zone that contains a point (for display purposes)
   */
  async findZoneForPoint(
    businessId: string,
    latitude: number,
    longitude: number
  ): Promise<DeliveryZone | null> {
    const zones = await this.getBusinessZones(businessId, { enabledOnly: true });

    for (const zone of zones) {
      if (zone.containsPoint(latitude, longitude)) {
        return zone;
      }
    }

    return null;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const deliveryZoneService = new DeliveryZoneService();
export default deliveryZoneService;
