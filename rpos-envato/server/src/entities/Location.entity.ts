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

// ============ LOCATION (STORE) ============

export enum LocationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed',
}

export enum LocationType {
  RETAIL_STORE = 'retail_store',
  WAREHOUSE = 'warehouse',
  KIOSK = 'kiosk',
  POP_UP = 'pop_up',
  ONLINE = 'online',
}

@Entity('locations')
@Index(['businessId', 'code'], { unique: true })
@Index(['businessId', 'status'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string; // Short identifier like "STORE001"

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: LocationType, default: LocationType.RETAIL_STORE })
  type!: LocationType;

  @Column({ type: 'enum', enum: LocationStatus, default: LocationStatus.ACTIVE })
  status!: LocationStatus;

  // Address
  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: true })
  addressLine1!: string | null;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country!: string | null;

  // Contact
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  // Operating hours (JSON)
  @Column({ name: 'operating_hours', type: 'jsonb', nullable: true })
  operatingHours!: {
    monday?: { open: string; close: string; closed?: boolean };
    tuesday?: { open: string; close: string; closed?: boolean };
    wednesday?: { open: string; close: string; closed?: boolean };
    thursday?: { open: string; close: string; closed?: boolean };
    friday?: { open: string; close: string; closed?: boolean };
    saturday?: { open: string; close: string; closed?: boolean };
    sunday?: { open: string; close: string; closed?: boolean };
  } | null;

  // Timezone
  @Column({ type: 'varchar', length: 50, default: 'America/New_York' })
  timezone!: string;

  // Coordinates for maps
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  // Tax configuration
  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 4, default: 0 })
  taxRate!: number;

  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId!: string | null;

  // Settings
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean; // Main/HQ location

  @Column({ name: 'accepts_returns', type: 'boolean', default: true })
  acceptsReturns!: boolean;

  @Column({ name: 'can_transfer_stock', type: 'boolean', default: true })
  canTransferStock!: boolean;

  // Inventory settings
  @Column({ name: 'track_inventory', type: 'boolean', default: true })
  trackInventory!: boolean;

  @Column({ name: 'allow_negative_stock', type: 'boolean', default: false })
  allowNegativeStock!: boolean;

  // Manager
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId!: string | null;

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

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager!: User | null;

  @OneToMany(() => LocationInventory, (inv) => inv.location)
  inventory!: LocationInventory[];

  // Helpers
  get fullAddress(): string {
    const parts = [
      this.addressLine1,
      this.addressLine2,
      this.city,
      this.state,
      this.postalCode,
      this.country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  get isOpen(): boolean {
    return this.status === LocationStatus.ACTIVE;
  }
}

// ============ LOCATION INVENTORY ============

@Entity('location_inventory')
@Index(['locationId', 'productId'], { unique: true })
@Index(['productId'])
export class LocationInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer', default: 0 })
  quantity!: number;

  @Column({ name: 'reserved_quantity', type: 'integer', default: 0 })
  reservedQuantity!: number;

  @Column({ name: 'min_stock', type: 'integer', default: 0 })
  minStock!: number;

  @Column({ name: 'max_stock', type: 'integer', nullable: true })
  maxStock!: number | null;

  @Column({ name: 'reorder_point', type: 'integer', nullable: true })
  reorderPoint!: number | null;

  @Column({ name: 'reorder_quantity', type: 'integer', nullable: true })
  reorderQuantity!: number | null;

  // Bin/shelf location within store
  @Column({ name: 'bin_location', type: 'varchar', length: 50, nullable: true })
  binLocation!: string | null;

  @Column({ name: 'last_counted_at', type: 'timestamp with time zone', nullable: true })
  lastCountedAt!: Date | null;

  @Column({ name: 'last_restocked_at', type: 'timestamp with time zone', nullable: true })
  lastRestockedAt!: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => Location, (loc) => loc.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // Helpers
  get availableQuantity(): number {
    return Math.max(0, this.quantity - this.reservedQuantity);
  }

  get isLowStock(): boolean {
    return this.quantity <= this.minStock;
  }

  get needsReorder(): boolean {
    return this.reorderPoint !== null && this.quantity <= this.reorderPoint;
  }
}

// ============ STOCK TRANSFER ============

export enum TransferStatus {
  DRAFT = 'draft',
  PENDING = 'pending',         // Awaiting approval
  APPROVED = 'approved',       // Approved, ready to ship
  IN_TRANSIT = 'in_transit',   // Shipped
  RECEIVED = 'received',       // Received at destination
  COMPLETED = 'completed',     // Fully processed
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

@Entity('stock_transfers')
@Index(['businessId', 'transferNumber'], { unique: true })
@Index(['fromLocationId'])
@Index(['toLocationId'])
@Index(['status'])
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transfer_number', type: 'varchar', length: 50 })
  transferNumber!: string;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.DRAFT })
  status!: TransferStatus;

  // Reason/notes
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Shipping info
  @Column({ name: 'shipping_method', type: 'varchar', length: 100, nullable: true })
  shippingMethod!: string | null;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber!: string | null;

  @Column({ name: 'expected_arrival', type: 'timestamp with time zone', nullable: true })
  expectedArrival!: Date | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'approved_at', type: 'timestamp with time zone', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamp with time zone', nullable: true })
  shippedAt!: Date | null;

  @Column({ name: 'received_at', type: 'timestamp with time zone', nullable: true })
  receivedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'from_location_id', type: 'uuid' })
  fromLocationId!: string;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_location_id' })
  fromLocation!: Location;

  @Column({ name: 'to_location_id', type: 'uuid' })
  toLocationId!: string;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_location_id' })
  toLocation!: Location;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy!: User | null;

  @Column({ name: 'received_by_id', type: 'uuid', nullable: true })
  receivedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy!: User | null;

  @OneToMany(() => StockTransferItem, (item) => item.transfer, { cascade: true })
  items!: StockTransferItem[];
}

@Entity('stock_transfer_items')
@Index(['transferId'])
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'quantity_requested', type: 'integer' })
  quantityRequested!: number;

  @Column({ name: 'quantity_shipped', type: 'integer', default: 0 })
  quantityShipped!: number;

  @Column({ name: 'quantity_received', type: 'integer', default: 0 })
  quantityReceived!: number;

  // Cost tracking
  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitCost!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Relations
  @Column({ name: 'transfer_id', type: 'uuid' })
  transferId!: string;

  @ManyToOne(() => StockTransfer, (transfer) => transfer.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer!: StockTransfer;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // Helpers
  get isFullyReceived(): boolean {
    return this.quantityReceived >= this.quantityShipped;
  }

  get discrepancy(): number {
    return this.quantityShipped - this.quantityReceived;
  }
}
