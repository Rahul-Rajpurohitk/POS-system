import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './Business.entity';
import { User } from './User.entity';

export enum EODReportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
  DISCREPANCY = 'discrepancy',
}

@Entity('eod_reports')
@Index(['businessId', 'reportDate'], { unique: true })
@Index(['businessId', 'status'])
export class EODReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_date', type: 'date' })
  reportDate!: Date;

  @Column({ type: 'enum', enum: EODReportStatus, default: EODReportStatus.PENDING })
  status!: EODReportStatus;

  // Sales Summary
  @Column({ name: 'gross_sales', type: 'decimal', precision: 14, scale: 2, default: 0 })
  grossSales!: number;

  @Column({ name: 'total_discounts', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalDiscounts!: number;

  @Column({ name: 'total_refunds', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalRefunds!: number;

  @Column({ name: 'net_sales', type: 'decimal', precision: 14, scale: 2, default: 0 })
  netSales!: number;

  @Column({ name: 'total_tax', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalTax!: number;

  @Column({ name: 'total_tips', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalTips!: number;

  // Transaction Counts
  @Column({ name: 'transaction_count', type: 'integer', default: 0 })
  transactionCount!: number;

  @Column({ name: 'refund_count', type: 'integer', default: 0 })
  refundCount!: number;

  @Column({ name: 'void_count', type: 'integer', default: 0 })
  voidCount!: number;

  @Column({ name: 'cancelled_count', type: 'integer', default: 0 })
  cancelledCount!: number;

  // Average metrics
  @Column({ name: 'average_transaction', type: 'decimal', precision: 12, scale: 2, default: 0 })
  averageTransaction!: number;

  @Column({ name: 'items_sold', type: 'integer', default: 0 })
  itemsSold!: number;

  @Column({ name: 'average_items_per_transaction', type: 'decimal', precision: 8, scale: 2, default: 0 })
  averageItemsPerTransaction!: number;

  // Payment Method Breakdown (JSON)
  @Column({ name: 'payment_breakdown', type: 'jsonb', nullable: true })
  paymentBreakdown!: {
    cash: { count: number; amount: number };
    creditCard: { count: number; amount: number };
    debitCard: { count: number; amount: number };
    mobilePayment: { count: number; amount: number };
    giftCard: { count: number; amount: number };
    storeCredit: { count: number; amount: number };
    other: { count: number; amount: number };
  } | null;

  // Cash Drawer Reconciliation
  @Column({ name: 'opening_cash', type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingCash!: number;

  @Column({ name: 'cash_sales', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashSales!: number;

  @Column({ name: 'cash_refunds', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashRefunds!: number;

  @Column({ name: 'cash_in', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashIn!: number;

  @Column({ name: 'cash_out', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashOut!: number;

  @Column({ name: 'expected_cash', type: 'decimal', precision: 12, scale: 2, default: 0 })
  expectedCash!: number;

  @Column({ name: 'actual_cash', type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualCash!: number | null;

  @Column({ name: 'cash_variance', type: 'decimal', precision: 12, scale: 2, nullable: true })
  cashVariance!: number | null;

  // Shift Summary (JSON array)
  @Column({ name: 'shifts_summary', type: 'jsonb', nullable: true })
  shiftsSummary!: Array<{
    shiftId: string;
    shiftNumber: number;
    userId: string;
    userName: string;
    openedAt: string;
    closedAt: string;
    totalSales: number;
    cashVariance: number;
  }> | null;

  // Category Sales Breakdown (JSON)
  @Column({ name: 'category_breakdown', type: 'jsonb', nullable: true })
  categoryBreakdown!: Array<{
    categoryId: string;
    categoryName: string;
    itemsSold: number;
    revenue: number;
    percentage: number;
  }> | null;

  // Top Products (JSON)
  @Column({ name: 'top_products', type: 'jsonb', nullable: true })
  topProducts!: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }> | null;

  // Hourly Sales (JSON)
  @Column({ name: 'hourly_sales', type: 'jsonb', nullable: true })
  hourlySales!: Array<{
    hour: number;
    transactions: number;
    revenue: number;
  }> | null;

  // Inventory Snapshot
  @Column({ name: 'inventory_value_start', type: 'decimal', precision: 14, scale: 2, nullable: true })
  inventoryValueStart!: number | null;

  @Column({ name: 'inventory_value_end', type: 'decimal', precision: 14, scale: 2, nullable: true })
  inventoryValueEnd!: number | null;

  @Column({ name: 'low_stock_items', type: 'integer', default: 0 })
  lowStockItems!: number;

  @Column({ name: 'out_of_stock_items', type: 'integer', default: 0 })
  outOfStockItems!: number;

  // Customer Metrics
  @Column({ name: 'unique_customers', type: 'integer', default: 0 })
  uniqueCustomers!: number;

  @Column({ name: 'new_customers', type: 'integer', default: 0 })
  newCustomers!: number;

  @Column({ name: 'repeat_customers', type: 'integer', default: 0 })
  repeatCustomers!: number;

  // Notes & Review
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'reviewed_notes', type: 'text', nullable: true })
  reviewedNotes!: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamp with time zone', nullable: true })
  reviewedAt!: Date | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'generated_by_id', type: 'uuid', nullable: true })
  generatedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generated_by_id' })
  generatedBy!: User | null;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy!: User | null;

  // Helpers
  get hasDiscrepancy(): boolean {
    return this.cashVariance !== null && Math.abs(Number(this.cashVariance)) > 1;
  }

  get profitMargin(): number {
    if (Number(this.grossSales) === 0) return 0;
    return ((Number(this.netSales) / Number(this.grossSales)) * 100);
  }
}
