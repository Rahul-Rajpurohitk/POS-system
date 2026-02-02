import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { Business } from './Business.entity';
import { Order } from './Order.entity';
import { User } from './User.entity';
import { OnlineOrderQueueStatus } from '../types/enums';

// Default timeout in minutes for order acceptance
const DEFAULT_ACCEPTANCE_TIMEOUT_MINUTES = 15;

@Entity('online_order_queue')
@Index(['businessId', 'status'])
@Index(['expiresAt'])
export class OnlineOrderQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Link to order
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  // Multi-tenant support
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Queue status
  @Column({ type: 'enum', enum: OnlineOrderQueueStatus, default: OnlineOrderQueueStatus.PENDING })
  status!: OnlineOrderQueueStatus;

  // Expiration time (default 15 minutes from creation)
  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  // Acceptance tracking
  @Column({ name: 'accepted_at', type: 'timestamp with time zone', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'accepted_by_id', type: 'uuid', nullable: true })
  acceptedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accepted_by_id' })
  acceptedBy!: User | null;

  // Rejection tracking
  @Column({ name: 'rejected_at', type: 'timestamp with time zone', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'rejected_by_id', type: 'uuid', nullable: true })
  rejectedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy!: User | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  // Reminder tracking
  @Column({ name: 'reminder_count', type: 'integer', default: 0 })
  reminderCount!: number;

  @Column({ name: 'last_reminder_at', type: 'timestamp with time zone', nullable: true })
  lastReminderAt!: Date | null;

  // Creation timestamp
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Set expiration before insert
  @BeforeInsert()
  setExpiration(): void {
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + DEFAULT_ACCEPTANCE_TIMEOUT_MINUTES * 60 * 1000);
    }
  }

  // Helper methods

  /**
   * Check if the queue entry has expired
   */
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the queue entry is still pending
   */
  get isPending(): boolean {
    return this.status === OnlineOrderQueueStatus.PENDING && !this.isExpired;
  }

  /**
   * Get remaining time in seconds
   */
  get remainingSeconds(): number {
    const diff = this.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }

  /**
   * Get remaining time in minutes (rounded up)
   */
  get remainingMinutes(): number {
    return Math.ceil(this.remainingSeconds / 60);
  }

  /**
   * Get remaining time as formatted string
   */
  get remainingTimeFormatted(): string {
    const seconds = this.remainingSeconds;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Check if should send reminder (at 10 min and 2 min remaining)
   */
  shouldSendReminder(): boolean {
    const remaining = this.remainingMinutes;

    // First reminder at 10 minutes remaining (5 min after creation)
    if (remaining <= 10 && remaining > 2 && this.reminderCount === 0) {
      return true;
    }

    // Urgent reminder at 2 minutes remaining
    if (remaining <= 2 && this.reminderCount === 1) {
      return true;
    }

    return false;
  }

  /**
   * Mark as accepted
   */
  accept(userId: string): void {
    this.status = OnlineOrderQueueStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.acceptedById = userId;
  }

  /**
   * Mark as rejected
   */
  reject(userId: string, reason?: string): void {
    this.status = OnlineOrderQueueStatus.REJECTED;
    this.rejectedAt = new Date();
    this.rejectedById = userId;
    this.rejectionReason = reason || null;
  }

  /**
   * Mark as expired
   */
  expire(): void {
    this.status = OnlineOrderQueueStatus.EXPIRED;
  }

  /**
   * Increment reminder count
   */
  recordReminder(): void {
    this.reminderCount++;
    this.lastReminderAt = new Date();
  }
}
