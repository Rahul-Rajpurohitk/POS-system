import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './Business.entity';
import { Customer } from './Customer.entity';
import { Coupon } from './Coupon.entity';
import { User } from './User.entity';
import { OrderItem } from './OrderItem.entity';
import { OrderStatus, TaxType } from '../types/enums';

@Entity('orders')
@Index(['businessId', 'number'], { unique: true })
@Index(['businessId', 'status'])
@Index(['businessId', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer', default: 0 })
  number!: number;

  // Order Status & Lifecycle
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status!: OrderStatus;

  // Guest information (when no customer account)
  @Column({ name: 'guest_name', type: 'varchar', length: 255, nullable: true })
  guestName!: string | null;

  @Column({ name: 'guest_email', type: 'varchar', length: 255, nullable: true })
  guestEmail!: string | null;

  @Column({ name: 'guest_phone', type: 'varchar', length: 50, nullable: true })
  guestPhone!: string | null;

  @Column({ name: 'guest_address', type: 'text', nullable: true })
  guestAddress!: string | null;

  // Pricing breakdown
  @Column({ name: 'sub_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount!: number;

  // Tax Configuration
  @Column({ name: 'tax_type', type: 'enum', enum: TaxType, default: TaxType.EXCLUSIVE })
  taxType!: TaxType;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 4, default: 0 })
  taxRate!: number; // e.g., 0.0825 for 8.25%

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount!: number;

  // Final amounts
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: number;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountDue!: number;

  @Column({ name: 'change_due', type: 'decimal', precision: 12, scale: 2, default: 0 })
  changeDue!: number;

  // Tip (optional)
  @Column({ name: 'tip_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  tipAmount!: number;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt!: Date | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  @Column({ name: 'coupon_id', type: 'uuid', nullable: true })
  couponId!: string | null;

  @ManyToOne(() => Coupon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coupon_id' })
  coupon!: Coupon | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItem[];

  // Get formatted order number (zero-padded)
  get formattedNumber(): string {
    return String(this.number).padStart(6, '0');
  }

  // Check if order has a registered customer
  get hasCustomer(): boolean {
    return !!this.customerId;
  }

  // Check if order has guest information
  get hasGuest(): boolean {
    return !!(this.guestName || this.guestEmail || this.guestPhone);
  }

  // Status helper methods
  get isDraft(): boolean {
    return this.status === OrderStatus.DRAFT;
  }

  get isPending(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  get isCompleted(): boolean {
    return this.status === OrderStatus.COMPLETED;
  }

  get isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }

  get isRefunded(): boolean {
    return this.status === OrderStatus.REFUNDED || this.status === OrderStatus.PARTIALLY_REFUNDED;
  }

  get isPaid(): boolean {
    return this.amountDue <= 0 && this.amountPaid > 0;
  }

  get canBeModified(): boolean {
    return this.status === OrderStatus.DRAFT || this.status === OrderStatus.PENDING;
  }

  get canBeCancelled(): boolean {
    return [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ON_HOLD].includes(this.status);
  }

  get canBeRefunded(): boolean {
    return this.status === OrderStatus.COMPLETED && this.amountPaid > 0;
  }
}
