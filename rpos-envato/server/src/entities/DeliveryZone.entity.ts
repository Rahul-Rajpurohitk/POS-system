import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './Business.entity';
import { DeliveryZoneType } from '../types/enums';

/**
 * Polygon coordinate point
 */
export interface PolygonPoint {
  lat: number;
  lng: number;
}

@Entity('delivery_zones')
@Index(['businessId', 'enabled'])
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant support
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Zone identification
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 7, default: '#3B82F6' })
  color!: string;

  // Zone type
  @Column({ name: 'zone_type', type: 'enum', enum: DeliveryZoneType, default: DeliveryZoneType.RADIUS })
  zoneType!: DeliveryZoneType;

  // For radius-based zones (circle from store location)
  @Column({ name: 'center_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  centerLatitude!: number | null;

  @Column({ name: 'center_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  centerLongitude!: number | null;

  @Column({ name: 'radius_meters', type: 'integer', nullable: true })
  radiusMeters!: number | null;

  // For polygon-based zones (custom shape)
  @Column({ name: 'polygon_coordinates', type: 'jsonb', nullable: true })
  polygonCoordinates!: PolygonPoint[] | null;

  // Pricing Configuration
  @Column({ name: 'base_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseFee!: number;

  @Column({ name: 'per_km_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  perKmFee!: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount!: number;

  @Column({ name: 'free_delivery_threshold', type: 'decimal', precision: 10, scale: 2, nullable: true })
  freeDeliveryThreshold!: number | null;

  // Time Estimates (shown to customer before ordering)
  @Column({ name: 'estimated_min_minutes', type: 'integer', default: 15 })
  estimatedMinMinutes!: number;

  @Column({ name: 'estimated_max_minutes', type: 'integer', default: 45 })
  estimatedMaxMinutes!: number;

  // Priority (higher = checked first for overlapping zones)
  @Column({ type: 'integer', default: 0 })
  priority!: number;

  // Status
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods

  /**
   * Check if a point is within this zone
   */
  containsPoint(lat: number, lng: number): boolean {
    if (this.zoneType === DeliveryZoneType.RADIUS) {
      return this.isWithinRadius(lat, lng);
    } else {
      return this.isWithinPolygon(lat, lng);
    }
  }

  /**
   * Check if point is within radius (using Haversine formula)
   */
  private isWithinRadius(lat: number, lng: number): boolean {
    if (!this.centerLatitude || !this.centerLongitude || !this.radiusMeters) {
      return false;
    }

    const distance = this.calculateDistance(
      this.centerLatitude,
      this.centerLongitude,
      lat,
      lng
    );

    return distance <= this.radiusMeters;
  }

  /**
   * Check if point is within polygon (ray casting algorithm)
   */
  private isWithinPolygon(lat: number, lng: number): boolean {
    if (!this.polygonCoordinates || this.polygonCoordinates.length < 3) {
      return false;
    }

    let inside = false;
    const polygon = this.polygonCoordinates;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Calculate distance between two points in meters (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
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

  /**
   * Calculate delivery fee for a given distance
   */
  calculateDeliveryFee(distanceKm: number, orderAmount: number): number {
    // Free delivery if order exceeds threshold
    if (this.freeDeliveryThreshold && orderAmount >= this.freeDeliveryThreshold) {
      return 0;
    }

    return Number(this.baseFee) + (distanceKm * Number(this.perKmFee));
  }

  /**
   * Get estimated delivery time range as string
   */
  get estimatedTimeRange(): string {
    return `${this.estimatedMinMinutes}-${this.estimatedMaxMinutes} min`;
  }

  /**
   * Get radius in kilometers
   */
  get radiusKm(): number | null {
    return this.radiusMeters ? this.radiusMeters / 1000 : null;
  }
}
