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
import { User } from './User.entity';

export enum GiftCardStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',     // Fully used
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',    // Temporarily disabled
  CANCELLED = 'cancelled',    // Permanently cancelled
}

export enum GiftCardType {
  PHYSICAL = 'physical',      // Physical card
  DIGITAL = 'digital',        // Email/SMS delivered
  PROMOTIONAL = 'promotional', // Free gift cards for promotions
}

@Entity('gift_cards')
@Index(['businessId', 'code'], { unique: true })
@Index(['businessId', 'status'])
@Index(['customerId'])
export class GiftCard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique card code (typically 16-digit)
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  // PIN for security (optional, typically 4-digit)
  @Column({ type: 'varchar', length: 10, nullable: true })
  pin!: string | null;

  @Column({ type: 'enum', enum: GiftCardType, default: GiftCardType.DIGITAL })
  type!: GiftCardType;

  @Column({ type: 'enum', enum: GiftCardStatus, default: GiftCardStatus.ACTIVE })
  status!: GiftCardStatus;

  // Original value when issued
  @Column({ name: 'initial_value', type: 'decimal', precision: 12, scale: 2 })
  initialValue!: number;

  // Current remaining balance
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance!: number;

  // Currency
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  // Validity
  @Column({ name: 'valid_from', type: 'timestamp with time zone' })
  validFrom!: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt!: Date | null;

  // Optional recipient info (for digital cards)
  @Column({ name: 'recipient_name', type: 'varchar', length: 255, nullable: true })
  recipientName!: string | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail!: string | null;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 50, nullable: true })
  recipientPhone!: string | null;

  // Personal message
  @Column({ type: 'text', nullable: true })
  message!: string | null;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt!: Date | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Customer who owns this card (optional)
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  // Who purchased/issued this card
  @Column({ name: 'issued_by_id', type: 'uuid', nullable: true })
  issuedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'issued_by_id' })
  issuedBy!: User | null;

  // Order ID if purchased
  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  // Transactions
  @OneToMany(() => GiftCardTransaction, (tx) => tx.giftCard)
  transactions!: GiftCardTransaction[];

  // Helpers
  get isExpired(): boolean {
    return this.expiresAt !== null && new Date() > this.expiresAt;
  }

  get isActive(): boolean {
    return this.status === GiftCardStatus.ACTIVE && !this.isExpired && this.balance > 0;
  }

  get usedAmount(): number {
    return Number(this.initialValue) - Number(this.balance);
  }
}

@Entity('gift_card_transactions')
@Index(['giftCardId', 'createdAt'])
export class GiftCardTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: 'issue' | 'redeem' | 'reload' | 'refund' | 'adjustment' | 'expire';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'balance_before', type: 'decimal', precision: 12, scale: 2 })
  balanceBefore!: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2 })
  balanceAfter!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Reference to order (for redemptions)
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @Column({ name: 'gift_card_id', type: 'uuid' })
  giftCardId!: string;

  @ManyToOne(() => GiftCard, (card) => card.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gift_card_id' })
  giftCard!: GiftCard;

  @Column({ name: 'processed_by_id', type: 'uuid', nullable: true })
  processedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy!: User | null;
}
