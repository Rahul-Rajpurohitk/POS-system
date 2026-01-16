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
import { Product } from './Product.entity';
import { User } from './User.entity';
import { Supplier } from './Supplier.entity';
import { PurchaseOrder } from './Supplier.entity';

/**
 * PriceHistory Entity
 *
 * Tracks ALL price changes for complete audit trail and analysis:
 * - Selling price changes (manual, promotions)
 * - Purchase price changes (cost increases from suppliers)
 * - Case/pack price changes
 * - Margin tracking over time
 *
 * Enables:
 * - Price volatility reports
 * - Margin erosion alerts
 * - Cost trend analysis
 * - Supplier negotiation insights
 */

export enum PriceChangeType {
  SELLING_PRICE = 'selling_price',
  PURCHASE_PRICE = 'purchase_price',
  CASE_SELLING_PRICE = 'case_selling_price',
  CASE_PURCHASE_PRICE = 'case_purchase_price',
  PACK_SELLING_PRICE = 'pack_selling_price',
  PACK_PURCHASE_PRICE = 'pack_purchase_price',
}

export enum PriceChangeReason {
  MANUAL = 'manual',                     // User changed price manually
  SUPPLIER_UPDATE = 'supplier_update',   // Supplier cost changed
  PROMOTION = 'promotion',               // Promotional pricing
  COST_INCREASE = 'cost_increase',       // Supplier cost increase
  COST_DECREASE = 'cost_decrease',       // Supplier cost decrease
  MARGIN_ADJUSTMENT = 'margin_adjustment', // Adjusting margin
  MARKET_RATE = 'market_rate',           // Market rate adjustment
  BULK_UPDATE = 'bulk_update',           // Bulk price update
  IMPORT = 'import',                     // From data import
  INITIAL = 'initial',                   // Initial price setup
}

@Entity('price_history')
@Index(['businessId', 'productId'])
@Index(['businessId', 'createdAt'])
@Index(['productId', 'priceType', 'createdAt'])
@Index(['businessId', 'priceType', 'createdAt'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Business relation
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Product relation
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  // Price change details
  @Column({ name: 'price_type', type: 'varchar', length: 30 })
  priceType!: PriceChangeType;

  @Column({ name: 'old_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  oldPrice!: number | null;

  @Column({ name: 'new_price', type: 'decimal', precision: 12, scale: 2 })
  newPrice!: number;

  @Column({ name: 'price_change', type: 'decimal', precision: 12, scale: 2 })
  priceChange!: number;  // newPrice - oldPrice

  @Column({ name: 'percent_change', type: 'decimal', precision: 8, scale: 2, nullable: true })
  percentChange!: number | null;  // (change / oldPrice) * 100

  // Margin tracking (for selling price changes)
  @Column({ name: 'old_margin', type: 'decimal', precision: 8, scale: 2, nullable: true })
  oldMargin!: number | null;  // Old profit margin %

  @Column({ name: 'new_margin', type: 'decimal', precision: 8, scale: 2, nullable: true })
  newMargin!: number | null;  // New profit margin %

  @Column({ name: 'margin_change', type: 'decimal', precision: 8, scale: 2, nullable: true })
  marginChange!: number | null;  // Change in margin points

  // Cost at time of change (for calculating margin on selling price changes)
  @Column({ name: 'cost_at_change', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costAtChange!: number | null;

  // Reason & context
  @Column({ type: 'varchar', length: 30, default: 'manual' })
  reason!: PriceChangeReason;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Supplier info (if cost change from PO or supplier update)
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier | null;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder | null;

  // Who made the change
  @Column({ name: 'changed_by_id', type: 'uuid', nullable: true })
  changedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Effective date (when price actually takes effect, may differ from createdAt)
  @Column({ name: 'effective_date', type: 'timestamp with time zone', nullable: true })
  effectiveDate!: Date | null;

  // ============ Helper Methods ============

  /**
   * Check if this was a price increase
   */
  get isIncrease(): boolean {
    return this.priceChange > 0;
  }

  /**
   * Check if this was a price decrease
   */
  get isDecrease(): boolean {
    return this.priceChange < 0;
  }

  /**
   * Check if margin improved (for selling price changes)
   */
  get marginImproved(): boolean {
    return (this.marginChange ?? 0) > 0;
  }

  /**
   * Get formatted price change string
   */
  get formattedChange(): string {
    const sign = this.priceChange >= 0 ? '+' : '';
    return `${sign}$${this.priceChange.toFixed(2)}`;
  }

  /**
   * Get formatted percent change string
   */
  get formattedPercentChange(): string {
    if (this.percentChange === null) return 'N/A';
    const sign = this.percentChange >= 0 ? '+' : '';
    return `${sign}${this.percentChange.toFixed(1)}%`;
  }
}
