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
import { Location } from './Location.entity';
import { Supplier } from './Supplier.entity';
import { PurchaseOrder } from './Supplier.entity';

/**
 * StockAdjustment Entity
 *
 * Tracks ALL inventory movements for complete audit trail:
 * - Purchase orders (goods received)
 * - Sales (quantity sold through POS)
 * - Returns (customer returns)
 * - Damage/Loss (damaged or lost items)
 * - Inventory counts (adjustments from physical counts)
 * - Transfers (between locations)
 * - Write-offs (expired, obsolete items)
 */

export enum StockAdjustmentType {
  PURCHASE_ORDER = 'purchase_order',     // Received from supplier
  SALE = 'sale',                         // Sold through POS
  RETURN = 'return',                     // Customer return
  DAMAGE = 'damage',                     // Damaged goods
  LOSS = 'loss',                         // Lost/stolen
  COUNT = 'count',                       // Inventory count adjustment
  TRANSFER_IN = 'transfer_in',           // Transferred from another location
  TRANSFER_OUT = 'transfer_out',         // Transferred to another location
  WRITE_OFF = 'write_off',               // Expired/obsolete
  INITIAL = 'initial',                   // Initial stock setup
  CORRECTION = 'correction',             // Manual correction
}

export enum StockAdjustmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('stock_adjustments')
@Index(['businessId', 'productId', 'createdAt'])
@Index(['businessId', 'type', 'createdAt'])
@Index(['productId', 'createdAt'])
@Index(['purchaseOrderId'])
@Index(['orderId'])
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reference_number', type: 'varchar', length: 50, nullable: true })
  referenceNumber!: string | null; // Auto-generated: ADJ-2024-0001

  @Column({ type: 'enum', enum: StockAdjustmentType })
  type!: StockAdjustmentType;

  @Column({ type: 'enum', enum: StockAdjustmentStatus, default: StockAdjustmentStatus.COMPLETED })
  status!: StockAdjustmentStatus;

  // Quantity change (positive = added, negative = removed)
  @Column({ type: 'integer' })
  quantity!: number;

  // Stock levels for audit trail
  @Column({ name: 'previous_stock', type: 'integer' })
  previousStock!: number;

  @Column({ name: 'new_stock', type: 'integer' })
  newStock!: number;

  // Cost tracking (for purchase orders, adjustments)
  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitCost!: number | null;

  @Column({ name: 'total_cost', type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalCost!: number | null;

  // Reason/notes
  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Batch/lot tracking (optional)
  @Column({ name: 'batch_number', type: 'varchar', length: 50, nullable: true })
  batchNumber!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 50, nullable: true })
  lotNumber!: string | null;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate!: Date | null;

  // ============ Case/Pack Tracking ============
  // Tracks how items were ordered/received (by unit, pack, or case)

  @Column({ name: 'order_unit_type', type: 'varchar', length: 20, default: 'unit' })
  orderUnitType!: 'unit' | 'pack' | 'case';  // What unit was ordered in?

  @Column({ name: 'order_quantity', type: 'integer', nullable: true })
  orderQuantity!: number | null;  // Quantity in order units (e.g., 5 cases)

  @Column({ name: 'units_per_order_unit', type: 'integer', nullable: true })
  unitsPerOrderUnit!: number | null;  // Units per case/pack at time of order

  // Cost per order unit (e.g., cost per case)
  @Column({ name: 'order_unit_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  orderUnitCost!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'adjustment_date', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  adjustmentDate!: Date;

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

  // User who made the adjustment
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User | null;

  // Location (for multi-location businesses)
  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId!: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location!: Location | null;

  // Supplier (for purchase orders)
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier | null;

  // Link to purchase order (for receiving)
  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder | null;

  // Link to sales order (for sales/returns)
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  // Transfer details
  @Column({ name: 'transfer_from_location_id', type: 'uuid', nullable: true })
  transferFromLocationId!: string | null;

  @Column({ name: 'transfer_to_location_id', type: 'uuid', nullable: true })
  transferToLocationId!: string | null;
}
