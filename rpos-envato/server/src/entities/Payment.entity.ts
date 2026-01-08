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
import { Order } from './Order.entity';
import { Business } from './Business.entity';
import { User } from './User.entity';
import { PaymentMethod, PaymentStatus } from '../types/enums';

@Entity('payments')
@Index(['businessId', 'createdAt'])
@Index(['orderId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique reference for idempotency
  @Column({ name: 'reference_id', type: 'varchar', length: 100, unique: true })
  referenceId!: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  // Amount tendered by customer
  @Column({ name: 'amount_tendered', type: 'decimal', precision: 12, scale: 2 })
  amountTendered!: number;

  // Actual amount applied to order
  @Column({ name: 'amount_applied', type: 'decimal', precision: 12, scale: 2 })
  amountApplied!: number;

  // Change returned to customer (for cash)
  @Column({ name: 'change_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  changeAmount!: number;

  // Tip amount (if applicable)
  @Column({ name: 'tip_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  tipAmount!: number;

  // Transaction ID from payment processor (for card payments)
  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId!: string | null;

  // Card details (masked for security)
  @Column({ name: 'card_last_four', type: 'varchar', length: 4, nullable: true })
  cardLastFour!: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 50, nullable: true })
  cardBrand!: string | null;

  // Gift card / Store credit reference
  @Column({ name: 'gift_card_code', type: 'varchar', length: 100, nullable: true })
  giftCardCode!: string | null;

  // Failure reason (if failed)
  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  // Metadata for additional info
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'processed_by_id', type: 'uuid' })
  processedById!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy!: User;

  // Helper methods
  get isSuccessful(): boolean {
    return this.status === PaymentStatus.CAPTURED;
  }

  get isCash(): boolean {
    return this.method === PaymentMethod.CASH;
  }

  get isCard(): boolean {
    return this.method === PaymentMethod.CREDIT_CARD || this.method === PaymentMethod.DEBIT_CARD;
  }
}
