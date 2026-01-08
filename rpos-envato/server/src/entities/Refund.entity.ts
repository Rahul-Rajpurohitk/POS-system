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
import { Order } from './Order.entity';
import { Payment } from './Payment.entity';
import { Business } from './Business.entity';
import { User } from './User.entity';
import { RefundStatus, RefundReason, PaymentMethod } from '../types/enums';

@Entity('refunds')
@Index(['businessId', 'createdAt'])
@Index(['orderId'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique reference for idempotency
  @Column({ name: 'reference_id', type: 'varchar', length: 100, unique: true })
  referenceId!: string;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ type: 'enum', enum: RefundReason })
  reason!: RefundReason;

  @Column({ name: 'reason_notes', type: 'text', nullable: true })
  reasonNotes!: string | null;

  // Refund amount
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  // Method used for refund (same as original or different)
  @Column({ name: 'refund_method', type: 'enum', enum: PaymentMethod })
  refundMethod!: PaymentMethod;

  // Transaction ID from payment processor (for card refunds)
  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId!: string | null;

  // Items being refunded (JSON array of item IDs and quantities)
  @Column({ name: 'refunded_items', type: 'jsonb', nullable: true })
  refundedItems!: Array<{ orderItemId: string; quantity: number; amount: number }> | null;

  // Whether to restore inventory
  @Column({ name: 'restore_inventory', type: 'boolean', default: true })
  restoreInventory!: boolean;

  // Failure reason (if failed)
  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamp with time zone', nullable: true })
  processedAt!: Date | null;

  // Relations
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'original_payment_id', type: 'uuid', nullable: true })
  originalPaymentId!: string | null;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'original_payment_id' })
  originalPayment!: Payment | null;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'requested_by_id', type: 'uuid' })
  requestedById!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy!: User;

  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy!: User | null;

  // Helper methods
  get isFullRefund(): boolean {
    return !this.refundedItems || this.refundedItems.length === 0;
  }

  get isProcessed(): boolean {
    return this.status === RefundStatus.PROCESSED;
  }
}
