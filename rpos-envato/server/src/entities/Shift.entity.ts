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
import { User } from './User.entity';

export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  SUSPENDED = 'suspended',
}

export enum CashMovementType {
  OPENING_FLOAT = 'opening_float',
  CASH_SALE = 'cash_sale',
  CASH_REFUND = 'cash_refund',
  CASH_IN = 'cash_in',      // Manual cash added
  CASH_OUT = 'cash_out',    // Manual cash removed
  PAY_OUT = 'pay_out',      // Supplier payment, etc.
  DROP = 'drop',            // Cash drop to safe
  CLOSING_COUNT = 'closing_count',
}

@Entity('shifts')
@Index(['businessId', 'status'])
@Index(['userId', 'status'])
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shift_number', type: 'integer' })
  shiftNumber!: number;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status!: ShiftStatus;

  // Opening details
  @Column({ name: 'opening_float', type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingFloat!: number;

  @Column({ name: 'opened_at', type: 'timestamp with time zone' })
  openedAt!: Date;

  // Closing details
  @Column({ name: 'expected_cash', type: 'decimal', precision: 12, scale: 2, default: 0 })
  expectedCash!: number;

  @Column({ name: 'actual_cash', type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualCash!: number | null;

  @Column({ name: 'cash_difference', type: 'decimal', precision: 12, scale: 2, nullable: true })
  cashDifference!: number | null;

  @Column({ name: 'closed_at', type: 'timestamp with time zone', nullable: true })
  closedAt!: Date | null;

  // Sales summary
  @Column({ name: 'total_sales', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSales!: number;

  @Column({ name: 'total_refunds', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRefunds!: number;

  @Column({ name: 'total_discounts', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDiscounts!: number;

  @Column({ name: 'total_tax', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTax!: number;

  @Column({ name: 'total_tips', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTips!: number;

  // Transaction counts
  @Column({ name: 'transaction_count', type: 'integer', default: 0 })
  transactionCount!: number;

  @Column({ name: 'refund_count', type: 'integer', default: 0 })
  refundCount!: number;

  @Column({ name: 'void_count', type: 'integer', default: 0 })
  voidCount!: number;

  // Payment breakdown
  @Column({ name: 'cash_sales', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashSales!: number;

  @Column({ name: 'card_sales', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cardSales!: number;

  @Column({ name: 'other_sales', type: 'decimal', precision: 12, scale: 2, default: 0 })
  otherSales!: number;

  // Cash movements tracking
  @Column({ name: 'cash_in_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashInTotal!: number;

  @Column({ name: 'cash_out_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashOutTotal!: number;

  // Notes
  @Column({ name: 'opening_notes', type: 'text', nullable: true })
  openingNotes!: string | null;

  @Column({ name: 'closing_notes', type: 'text', nullable: true })
  closingNotes!: string | null;

  // Terminal/Register ID (for multi-register setup)
  @Column({ name: 'terminal_id', type: 'varchar', length: 50, nullable: true })
  terminalId!: string | null;

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

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'closed_by_id', type: 'uuid', nullable: true })
  closedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy!: User | null;

  @OneToMany(() => CashMovement, (movement) => movement.shift)
  cashMovements!: CashMovement[];

  // Helpers
  get isOpen(): boolean {
    return this.status === ShiftStatus.OPEN;
  }

  get netSales(): number {
    return Number(this.totalSales) - Number(this.totalRefunds);
  }

  get duration(): number | null {
    if (!this.closedAt) return null;
    return this.closedAt.getTime() - this.openedAt.getTime();
  }
}

@Entity('cash_movements')
@Index(['shiftId', 'createdAt'])
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: CashMovementType })
  type!: CashMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'running_balance', type: 'decimal', precision: 12, scale: 2 })
  runningBalance!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  referenceId!: string | null; // Order ID, etc.

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId!: string;

  @ManyToOne(() => Shift, (shift) => shift.cashMovements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
