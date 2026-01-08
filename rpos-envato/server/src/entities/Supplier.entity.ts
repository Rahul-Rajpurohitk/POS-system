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

// ============ SUPPLIER ============

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PENDING_APPROVAL = 'pending_approval',
}

export enum PaymentTerms {
  IMMEDIATE = 'immediate',       // Payment on receipt
  NET_15 = 'net_15',            // Payment due in 15 days
  NET_30 = 'net_30',            // Payment due in 30 days
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  COD = 'cod',                  // Cash on delivery
  PREPAID = 'prepaid',          // Payment before shipment
  CUSTOM = 'custom',
}

@Entity('suppliers')
@Index(['businessId', 'code'], { unique: true })
@Index(['businessId', 'status'])
@Index(['businessId', 'name'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string; // Supplier code like "SUP001"

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'company_name', type: 'varchar', length: 200, nullable: true })
  companyName!: string | null;

  @Column({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  status!: SupplierStatus;

  // Contact info
  @Column({ name: 'contact_name', type: 'varchar', length: 100, nullable: true })
  contactName!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'alt_phone', type: 'varchar', length: 50, nullable: true })
  altPhone!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fax!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

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

  // Tax & Payment
  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId!: string | null;

  @Column({ name: 'payment_terms', type: 'enum', enum: PaymentTerms, default: PaymentTerms.NET_30 })
  paymentTerms!: PaymentTerms;

  @Column({ name: 'custom_payment_days', type: 'integer', nullable: true })
  customPaymentDays!: number | null; // For custom payment terms

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  // Credit
  @Column({ name: 'credit_limit', type: 'decimal', precision: 14, scale: 2, nullable: true })
  creditLimit!: number | null;

  @Column({ name: 'current_balance', type: 'decimal', precision: 14, scale: 2, default: 0 })
  currentBalance!: number; // Outstanding balance

  // Banking info
  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName!: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 50, nullable: true })
  bankAccount!: string | null;

  @Column({ name: 'bank_routing', type: 'varchar', length: 50, nullable: true })
  bankRouting!: string | null;

  // Lead times
  @Column({ name: 'default_lead_time_days', type: 'integer', default: 7 })
  defaultLeadTimeDays!: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderAmount!: number | null;

  // Rating/notes
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating!: number | null; // 0.00 to 5.00

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_order_at', type: 'timestamp with time zone', nullable: true })
  lastOrderAt!: Date | null;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @OneToMany(() => PurchaseOrder, (po) => po.supplier)
  purchaseOrders!: PurchaseOrder[];

  @OneToMany(() => SupplierProduct, (sp) => sp.supplier)
  products!: SupplierProduct[];

  // Helpers
  get fullAddress(): string {
    const parts = [this.addressLine1, this.addressLine2, this.city, this.state, this.postalCode, this.country].filter(Boolean);
    return parts.join(', ');
  }

  get paymentDueDays(): number {
    switch (this.paymentTerms) {
      case PaymentTerms.IMMEDIATE:
      case PaymentTerms.COD:
        return 0;
      case PaymentTerms.PREPAID:
        return -1;
      case PaymentTerms.NET_15:
        return 15;
      case PaymentTerms.NET_30:
        return 30;
      case PaymentTerms.NET_45:
        return 45;
      case PaymentTerms.NET_60:
        return 60;
      case PaymentTerms.NET_90:
        return 90;
      case PaymentTerms.CUSTOM:
        return this.customPaymentDays || 30;
      default:
        return 30;
    }
  }
}

// ============ SUPPLIER PRODUCT MAPPING ============

@Entity('supplier_products')
@Index(['supplierId', 'productId'], { unique: true })
@Index(['productId'])
export class SupplierProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Supplier's product code/SKU
  @Column({ name: 'supplier_sku', type: 'varchar', length: 50, nullable: true })
  supplierSku!: string | null;

  // Supplier's product name (might differ from internal name)
  @Column({ name: 'supplier_product_name', type: 'varchar', length: 255, nullable: true })
  supplierProductName!: string | null;

  // Pricing
  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2 })
  unitCost!: number;

  @Column({ name: 'min_order_quantity', type: 'integer', default: 1 })
  minOrderQuantity!: number;

  @Column({ name: 'pack_size', type: 'integer', default: 1 })
  packSize!: number; // Units per pack

  // Lead time for this specific product
  @Column({ name: 'lead_time_days', type: 'integer', nullable: true })
  leadTimeDays!: number | null;

  // Is this the preferred supplier for this product?
  @Column({ name: 'is_preferred', type: 'boolean', default: false })
  isPreferred!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // Last price update
  @Column({ name: 'price_updated_at', type: 'timestamp with time zone', nullable: true })
  priceUpdatedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Supplier, (s) => s.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;
}

// ============ PURCHASE ORDER ============

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',               // Sent to supplier
  ACKNOWLEDGED = 'acknowledged', // Supplier confirmed
  PARTIAL_RECEIVED = 'partial_received',
  RECEIVED = 'received',       // Fully received
  COMPLETED = 'completed',     // Received and paid
  CANCELLED = 'cancelled',
  CLOSED = 'closed',           // Manually closed
}

@Entity('purchase_orders')
@Index(['businessId', 'orderNumber'], { unique: true })
@Index(['supplierId'])
@Index(['status'])
@Index(['businessId', 'createdAt'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status!: PurchaseOrderStatus;

  // Amounts
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  // Payment tracking
  @Column({ name: 'amount_paid', type: 'decimal', precision: 14, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: 'unpaid' })
  paymentStatus!: 'unpaid' | 'partial' | 'paid' | 'overpaid';

  @Column({ name: 'payment_due_date', type: 'date', nullable: true })
  paymentDueDate!: Date | null;

  // Dates
  @Column({ name: 'order_date', type: 'date' })
  orderDate!: Date;

  @Column({ name: 'expected_delivery', type: 'date', nullable: true })
  expectedDelivery!: Date | null;

  // Shipping
  @Column({ name: 'ship_to_location_id', type: 'uuid', nullable: true })
  shipToLocationId!: string | null;

  @Column({ name: 'shipping_method', type: 'varchar', length: 100, nullable: true })
  shippingMethod!: string | null;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber!: string | null;

  // Reference
  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber!: string | null; // Supplier's reference

  // Notes
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes!: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'approved_at', type: 'timestamp with time zone', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp with time zone', nullable: true })
  sentAt!: Date | null;

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

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Supplier, (s) => s.purchaseOrders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

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

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true })
  items!: PurchaseOrderItem[];

  @OneToMany(() => PurchaseOrderReceiving, (r) => r.purchaseOrder)
  receivings!: PurchaseOrderReceiving[];

  // Helpers
  get amountDue(): number {
    return Math.max(0, Number(this.total) - Number(this.amountPaid));
  }

  get isFullyReceived(): boolean {
    return this.status === PurchaseOrderStatus.RECEIVED || this.status === PurchaseOrderStatus.COMPLETED;
  }
}

// ============ PURCHASE ORDER ITEMS ============

@Entity('purchase_order_items')
@Index(['purchaseOrderId'])
@Index(['productId'])
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Quantities
  @Column({ name: 'quantity_ordered', type: 'integer' })
  quantityOrdered!: number;

  @Column({ name: 'quantity_received', type: 'integer', default: 0 })
  quantityReceived!: number;

  @Column({ name: 'quantity_cancelled', type: 'integer', default: 0 })
  quantityCancelled!: number;

  // Pricing
  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2 })
  unitCost!: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 4, default: 0 })
  taxRate!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 14, scale: 2 })
  lineTotal!: number;

  // Supplier's SKU/info
  @Column({ name: 'supplier_sku', type: 'varchar', length: 50, nullable: true })
  supplierSku!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Relations
  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // Helpers
  get quantityPending(): number {
    return Math.max(0, this.quantityOrdered - this.quantityReceived - this.quantityCancelled);
  }

  get isFullyReceived(): boolean {
    return this.quantityReceived >= this.quantityOrdered - this.quantityCancelled;
  }
}

// ============ PURCHASE ORDER RECEIVING ============

@Entity('purchase_order_receivings')
@Index(['purchaseOrderId'])
@Index(['businessId', 'receivingNumber'], { unique: true })
export class PurchaseOrderReceiving {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'receiving_number', type: 'varchar', length: 50 })
  receivingNumber!: string;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate!: Date;

  // Shipping info
  @Column({ name: 'delivery_note', type: 'varchar', length: 100, nullable: true })
  deliveryNote!: string | null; // Supplier's delivery note number

  @Column({ name: 'carrier', type: 'varchar', length: 100, nullable: true })
  carrier!: string | null;

  // Quality check
  @Column({ name: 'quality_check_passed', type: 'boolean', default: true })
  qualityCheckPassed!: boolean;

  @Column({ name: 'quality_notes', type: 'text', nullable: true })
  qualityNotes!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.receivings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'received_by_id', type: 'uuid' })
  receivedById!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy!: User;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId!: string | null;

  @OneToMany(() => PurchaseOrderReceivingItem, (item) => item.receiving, { cascade: true })
  items!: PurchaseOrderReceivingItem[];
}

// ============ RECEIVING ITEMS ============

@Entity('purchase_order_receiving_items')
@Index(['receivingId'])
@Index(['purchaseOrderItemId'])
export class PurchaseOrderReceivingItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'quantity_received', type: 'integer' })
  quantityReceived!: number;

  @Column({ name: 'quantity_rejected', type: 'integer', default: 0 })
  quantityRejected!: number;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  // Batch info (if batch tracking enabled)
  @Column({ name: 'batch_number', type: 'varchar', length: 50, nullable: true })
  batchNumber!: string | null;

  @Column({ name: 'lot_number', type: 'varchar', length: 50, nullable: true })
  lotNumber!: string | null;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate!: Date | null;

  // Storage location
  @Column({ name: 'bin_location', type: 'varchar', length: 50, nullable: true })
  binLocation!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Relations
  @Column({ name: 'receiving_id', type: 'uuid' })
  receivingId!: string;

  @ManyToOne(() => PurchaseOrderReceiving, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiving_id' })
  receiving!: PurchaseOrderReceiving;

  @Column({ name: 'purchase_order_item_id', type: 'uuid' })
  purchaseOrderItemId!: string;

  @ManyToOne(() => PurchaseOrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_item_id' })
  purchaseOrderItem!: PurchaseOrderItem;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;
}

// ============ SUPPLIER PAYMENT ============

export enum SupplierPaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
  WIRE = 'wire',
  ACH = 'ach',
  OTHER = 'other',
}

export enum SupplierPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('supplier_payments')
@Index(['businessId', 'paymentNumber'], { unique: true })
@Index(['supplierId'])
@Index(['purchaseOrderId'])
export class SupplierPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_number', type: 'varchar', length: 50 })
  paymentNumber!: string;

  @Column({ type: 'enum', enum: SupplierPaymentMethod })
  method!: SupplierPaymentMethod;

  @Column({ type: 'enum', enum: SupplierPaymentStatus, default: SupplierPaymentStatus.PENDING })
  status!: SupplierPaymentStatus;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: Date;

  // Reference
  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber!: string | null; // Check number, transaction ID, etc.

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

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder | null;

  @Column({ name: 'processed_by_id', type: 'uuid' })
  processedById!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy!: User;
}
