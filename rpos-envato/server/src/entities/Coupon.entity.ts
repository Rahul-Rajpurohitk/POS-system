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
import { CouponType } from '../types/enums';

@Entity('coupons')
@Index(['businessId', 'code'], { unique: true })
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  code!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  name!: string;

  @Column({ type: 'enum', enum: CouponType, default: CouponType.FIXED })
  type!: CouponType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount!: number;

  @Column({ name: 'expired_at', type: 'timestamp with time zone', nullable: true })
  expiredAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Check if coupon is expired
  get isExpired(): boolean {
    if (!this.expiredAt) return false;
    return new Date() > this.expiredAt;
  }

  // Check if coupon is valid (enabled and not expired)
  get isValid(): boolean {
    return this.enabled && !this.isExpired;
  }
}
