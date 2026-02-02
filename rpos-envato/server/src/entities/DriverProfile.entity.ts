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
import { User } from './User.entity';
import { DriverStatus, VehicleType } from '../types/enums';

/**
 * Working hours configuration for a driver
 */
export interface WorkingHoursConfig {
  monday?: { start: string; end: string } | null;
  tuesday?: { start: string; end: string } | null;
  wednesday?: { start: string; end: string } | null;
  thursday?: { start: string; end: string } | null;
  friday?: { start: string; end: string } | null;
  saturday?: { start: string; end: string } | null;
  sunday?: { start: string; end: string } | null;
}

@Entity('driver_profiles')
@Index(['businessId', 'status'])
@Index(['businessId', 'userId'], { unique: true })
export class DriverProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Link to user account
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Multi-tenant support
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Driver availability status
  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.OFFLINE })
  status!: DriverStatus;

  // Vehicle type for routing optimization
  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType, default: VehicleType.CAR })
  vehicleType!: VehicleType;

  // Current location tracking
  @Column({ name: 'current_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  currentLatitude!: number | null;

  @Column({ name: 'current_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  currentLongitude!: number | null;

  @Column({ name: 'last_location_update', type: 'timestamp with time zone', nullable: true })
  lastLocationUpdate!: Date | null;

  // Active delivery tracking
  @Column({ name: 'active_delivery_id', type: 'uuid', nullable: true })
  activeDeliveryId!: string | null;

  // Performance metrics
  @Column({ name: 'deliveries_today', type: 'integer', default: 0 })
  deliveriesToday!: number;

  @Column({ name: 'total_deliveries', type: 'integer', default: 0 })
  totalDeliveries!: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  averageRating!: number;

  @Column({ name: 'total_ratings', type: 'integer', default: 0 })
  totalRatings!: number;

  // Schedule configuration
  @Column({ name: 'working_hours', type: 'jsonb', nullable: true })
  workingHours!: WorkingHoursConfig | null;

  // Concurrent delivery limit
  @Column({ name: 'max_concurrent_deliveries', type: 'integer', default: 1 })
  maxConcurrentDeliveries!: number;

  // Account status
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods
  get isAvailable(): boolean {
    return this.status === DriverStatus.AVAILABLE && this.enabled;
  }

  get hasActiveDelivery(): boolean {
    return !!this.activeDeliveryId;
  }

  get hasLocation(): boolean {
    return this.currentLatitude !== null && this.currentLongitude !== null;
  }

  /**
   * Check if driver is within their working hours
   */
  isWithinWorkingHours(date: Date = new Date()): boolean {
    if (!this.workingHours) return true; // No schedule = always available

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[date.getDay()] as keyof WorkingHoursConfig;
    const daySchedule = this.workingHours[dayName];

    if (!daySchedule) return false; // Day not scheduled

    const currentTime = date.toTimeString().slice(0, 5); // "HH:MM" format
    return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
  }
}
