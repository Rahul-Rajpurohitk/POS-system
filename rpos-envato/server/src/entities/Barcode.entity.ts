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
import { Business } from './Business.entity';
import { Product } from './Product.entity';

// ============ BARCODE TYPES ============

export enum BarcodeType {
  UPC_A = 'upc_a',           // 12 digits - US/Canada retail
  UPC_E = 'upc_e',           // 8 digits - compressed UPC
  EAN_13 = 'ean_13',         // 13 digits - International
  EAN_8 = 'ean_8',           // 8 digits - Small products
  CODE_39 = 'code_39',       // Alphanumeric - Industrial
  CODE_128 = 'code_128',     // High density - Logistics
  ITF_14 = 'itf_14',         // 14 digits - Cartons/pallets
  QR_CODE = 'qr_code',       // 2D - Mobile scanning
  DATA_MATRIX = 'data_matrix', // 2D - Small items
  PDF_417 = 'pdf_417',       // 2D - ID cards, tickets
  INTERNAL = 'internal',     // Store's internal code
  CUSTOM = 'custom',         // Custom format
}

export enum BarcodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

// ============ PRODUCT BARCODE ============

@Entity('product_barcodes')
@Index(['businessId', 'barcode'], { unique: true })
@Index(['productId'])
@Index(['type'])
export class ProductBarcode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  barcode!: string;

  @Column({ type: 'enum', enum: BarcodeType, default: BarcodeType.EAN_13 })
  type!: BarcodeType;

  @Column({ type: 'enum', enum: BarcodeStatus, default: BarcodeStatus.ACTIVE })
  status!: BarcodeStatus;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  // For variant-specific barcodes (e.g., different sizes)
  @Column({ name: 'variant_name', type: 'varchar', length: 100, nullable: true })
  variantName!: string | null; // e.g., "Large", "Red", "Pack of 6"

  @Column({ name: 'variant_sku', type: 'varchar', length: 50, nullable: true })
  variantSku!: string | null;

  // Unit info (for multi-pack barcodes)
  @Column({ name: 'unit_quantity', type: 'integer', default: 1 })
  unitQuantity!: number; // e.g., 6 for "Pack of 6"

  // Price override for this specific barcode/variant
  @Column({ name: 'price_override', type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceOverride!: number | null;

  @Column({ name: 'cost_override', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costOverride!: number | null;

  // Manufacturer info
  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer!: string | null;

  @Column({ name: 'manufacturer_part_number', type: 'varchar', length: 100, nullable: true })
  manufacturerPartNumber!: string | null;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

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

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}

// ============ SKU CONFIGURATION ============

export enum SKUFormat {
  SEQUENTIAL = 'sequential',       // 00001, 00002, ...
  CATEGORY_PREFIX = 'category_prefix', // ELEC-00001
  CUSTOM_PATTERN = 'custom_pattern', // User-defined pattern
}

@Entity('sku_configurations')
@Index(['businessId'], { unique: true })
export class SKUConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: SKUFormat, default: SKUFormat.SEQUENTIAL })
  format!: SKUFormat;

  // For sequential
  @Column({ name: 'next_sequence', type: 'integer', default: 1 })
  nextSequence!: number;

  @Column({ name: 'sequence_padding', type: 'integer', default: 5 })
  sequencePadding!: number; // 5 = 00001

  // Prefix/suffix
  @Column({ type: 'varchar', length: 20, nullable: true })
  prefix!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  suffix!: string | null;

  // For category prefix format
  @Column({ name: 'category_code_length', type: 'integer', default: 4 })
  categoryCodeLength!: number;

  // For custom pattern
  @Column({ name: 'custom_pattern', type: 'varchar', length: 100, nullable: true })
  customPattern!: string | null; // e.g., "{CAT}-{YEAR}{SEQ:4}"

  // Allow manual SKU override
  @Column({ name: 'allow_manual', type: 'boolean', default: true })
  allowManual!: boolean;

  // Require unique SKU
  @Column({ name: 'require_unique', type: 'boolean', default: true })
  requireUnique!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}

// ============ BATCH/LOT TRACKING ============

export enum BatchStatus {
  AVAILABLE = 'available',
  LOW_STOCK = 'low_stock',
  EXPIRED = 'expired',
  RECALLED = 'recalled',
  DEPLETED = 'depleted',
}

@Entity('product_batches')
@Index(['businessId', 'batchNumber'], { unique: true })
@Index(['productId'])
@Index(['expirationDate'])
@Index(['status'])
export class ProductBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 50 })
  batchNumber!: string;

  @Column({ name: 'lot_number', type: 'varchar', length: 50, nullable: true })
  lotNumber!: string | null;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.AVAILABLE })
  status!: BatchStatus;

  // Dates
  @Column({ name: 'manufacture_date', type: 'date', nullable: true })
  manufactureDate!: Date | null;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate!: Date | null;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate!: Date;

  // Quantity
  @Column({ name: 'initial_quantity', type: 'integer' })
  initialQuantity!: number;

  @Column({ name: 'current_quantity', type: 'integer' })
  currentQuantity!: number;

  @Column({ name: 'reserved_quantity', type: 'integer', default: 0 })
  reservedQuantity!: number;

  // Cost tracking
  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitCost!: number | null;

  // Supplier info
  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  // Location (if multi-location)
  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId!: string | null;

  // Storage info
  @Column({ name: 'storage_location', type: 'varchar', length: 100, nullable: true })
  storageLocation!: string | null; // Bin/shelf location

  // Notes
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

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

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  // Helpers
  get availableQuantity(): number {
    return Math.max(0, this.currentQuantity - this.reservedQuantity);
  }

  get isExpired(): boolean {
    return this.expirationDate !== null && new Date() > this.expirationDate;
  }

  get daysUntilExpiration(): number | null {
    if (!this.expirationDate) return null;
    const now = new Date();
    const diff = this.expirationDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

// ============ BARCODE SCAN LOG ============

export enum ScanType {
  SALE = 'sale',
  INVENTORY_CHECK = 'inventory_check',
  STOCK_COUNT = 'stock_count',
  RECEIVING = 'receiving',
  TRANSFER = 'transfer',
  RETURN = 'return',
  PRICE_CHECK = 'price_check',
  LOOKUP = 'lookup',
}

@Entity('barcode_scan_logs')
@Index(['businessId', 'scannedAt'])
@Index(['productId'])
@Index(['scannedBy'])
export class BarcodeScanLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'barcode_scanned', type: 'varchar', length: 100 })
  barcodeScanned!: string;

  @Column({ name: 'barcode_type', type: 'enum', enum: BarcodeType, nullable: true })
  barcodeType!: BarcodeType | null;

  @Column({ name: 'scan_type', type: 'enum', enum: ScanType })
  scanType!: ScanType;

  // Was it successful?
  @Column({ name: 'matched', type: 'boolean' })
  matched!: boolean;

  // If matched, which product?
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @Column({ name: 'product_barcode_id', type: 'uuid', nullable: true })
  productBarcodeId!: string | null;

  // Context
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId!: string | null;

  // Scanner info
  @Column({ name: 'scanner_device', type: 'varchar', length: 100, nullable: true })
  scannerDevice!: string | null;

  @Column({ name: 'scanned_by', type: 'uuid', nullable: true })
  scannedBy!: string | null;

  @Column({ name: 'scanned_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  scannedAt!: Date;

  // IP for audit
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;
}
