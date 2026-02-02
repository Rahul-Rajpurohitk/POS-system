import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { randomBytes } from 'crypto';
import { Business } from './Business.entity';
import { Order } from './Order.entity';
import { DriverProfile } from './DriverProfile.entity';
import { DeliveryStatus } from '../types/enums';

/**
 * Location point with timestamp for tracking history
 */
export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}

@Entity('deliveries')
@Index(['businessId', 'status'])
@Index(['businessId', 'driverId'])
@Index(['orderId'], { unique: true })
@Index(['trackingToken'], { unique: true })
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Link to order
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  // Multi-tenant support
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Assigned driver (nullable until assigned)
  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => DriverProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverProfile | null;

  // Delivery status
  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status!: DeliveryStatus;

  // Pickup Location (Store)
  @Column({ name: 'pickup_address', type: 'text' })
  pickupAddress!: string;

  @Column({ name: 'pickup_latitude', type: 'decimal', precision: 10, scale: 8 })
  pickupLatitude!: number;

  @Column({ name: 'pickup_longitude', type: 'decimal', precision: 11, scale: 8 })
  pickupLongitude!: number;

  // Delivery Location (Customer)
  @Column({ name: 'delivery_address', type: 'text' })
  deliveryAddress!: string;

  @Column({ name: 'delivery_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  deliveryLatitude!: number | null;

  @Column({ name: 'delivery_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  deliveryLongitude!: number | null;

  @Column({ name: 'delivery_instructions', type: 'text', nullable: true })
  deliveryInstructions!: string | null;

  // Customer Contact Information
  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName!: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50 })
  customerPhone!: string;

  // Public tracking token (no auth required)
  @Column({ name: 'tracking_token', type: 'varchar', length: 64 })
  trackingToken!: string;

  // Distance and Time Estimates
  @Column({ name: 'distance_meters', type: 'integer', nullable: true })
  distanceMeters!: number | null;

  @Column({ name: 'estimated_duration_seconds', type: 'integer', nullable: true })
  estimatedDurationSeconds!: number | null;

  @Column({ name: 'estimated_arrival', type: 'timestamp with time zone', nullable: true })
  estimatedArrival!: Date | null;

  // Fees
  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee!: number;

  @Column({ name: 'driver_tip', type: 'decimal', precision: 10, scale: 2, default: 0 })
  driverTip!: number;

  // Lifecycle Timestamps
  @Column({ name: 'accepted_at', type: 'timestamp with time zone', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'assigned_at', type: 'timestamp with time zone', nullable: true })
  assignedAt!: Date | null;

  @Column({ name: 'picked_up_at', type: 'timestamp with time zone', nullable: true })
  pickedUpAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  // Proof of Delivery
  @Column({ name: 'delivery_photo', type: 'varchar', length: 500, nullable: true })
  deliveryPhoto!: string | null;

  @Column({ name: 'signature_image', type: 'varchar', length: 500, nullable: true })
  signatureImage!: string | null;

  // Customer Rating & Feedback
  @Column({ name: 'customer_rating', type: 'integer', nullable: true })
  customerRating!: number | null;

  @Column({ name: 'customer_feedback', type: 'text', nullable: true })
  customerFeedback!: string | null;

  // Route data
  @Column({ name: 'route_polyline', type: 'text', nullable: true })
  routePolyline!: string | null;

  @Column({ name: 'location_history', type: 'jsonb', default: '[]' })
  locationHistory!: LocationPoint[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Generate tracking token before insert
  @BeforeInsert()
  generateTrackingToken(): void {
    if (!this.trackingToken) {
      this.trackingToken = randomBytes(32).toString('hex');
    }
  }

  // Helper methods
  get isActive(): boolean {
    return ![DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED, DeliveryStatus.FAILED].includes(this.status);
  }

  get isCompleted(): boolean {
    return this.status === DeliveryStatus.DELIVERED;
  }

  get hasDriver(): boolean {
    return !!this.driverId;
  }

  get estimatedMinutesRemaining(): number | null {
    if (!this.estimatedArrival) return null;
    const now = new Date();
    const diff = this.estimatedArrival.getTime() - now.getTime();
    return Math.max(0, Math.round(diff / 60000));
  }

  get distanceKm(): number | null {
    return this.distanceMeters ? this.distanceMeters / 1000 : null;
  }

  /**
   * Get the public tracking URL
   */
  getTrackingUrl(baseUrl: string): string {
    return `${baseUrl}/track/${this.trackingToken}`;
  }

  /**
   * Add a location point to history
   */
  addLocationPoint(lat: number, lng: number, accuracy?: number): void {
    this.locationHistory.push({
      lat,
      lng,
      timestamp: Date.now(),
      accuracy,
    });
  }
}
