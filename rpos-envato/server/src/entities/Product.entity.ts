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
import { Category } from './Category.entity';
import { Supplier } from './Supplier.entity';

@Entity('products')
@Index(['businessId', 'sku'], { unique: true })
@Index(['businessId', 'brand'])
@Index(['businessId', 'primaryBarcode'])
@Index(['businessId', 'defaultSupplierId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  name!: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  sku!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'integer', default: 0 })
  quantity!: number;

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice!: number;

  @Column({ name: 'purchase_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice!: number;

  @Column({ type: 'text', array: true, default: '{}' })
  images!: string[];

  // Selling Info (flattened from MongoDB embedded document)
  @Column({ name: 'sold_quantity', type: 'integer', default: 0 })
  soldQuantity!: number;

  @Column({ name: 'sold_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  soldAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  profit!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  // Partner-Ready Fields: Sourcing & Brand
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand!: string | null;

  @Column({ name: 'primary_barcode', type: 'varchar', length: 100, nullable: true })
  primaryBarcode!: string | null;

  @Column({ name: 'tax_class', type: 'varchar', length: 50, default: 'standard' })
  taxClass!: string;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 20, default: 'each' })
  unitOfMeasure!: string;

  // Partner-Ready Fields: Shipping Dimensions
  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  weight!: number | null;

  @Column({ name: 'weight_unit', type: 'varchar', length: 10, default: 'kg' })
  weightUnit!: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  length!: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  width!: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  height!: number | null;

  @Column({ name: 'dimension_unit', type: 'varchar', length: 10, default: 'cm' })
  dimensionUnit!: string;

  // ============ Case/Pack Configuration ============
  // Enables case-based ordering for liquor stores, wholesale, etc.

  // Pack configuration (optional mid-tier, e.g., 6-pack)
  @Column({ name: 'pack_size', type: 'integer', nullable: true })
  packSize!: number | null;  // Units per pack (e.g., 6)

  @Column({ name: 'pack_unit_name', type: 'varchar', length: 30, nullable: true })
  packUnitName!: string | null;  // e.g., "6-pack", "box", "dozen"

  // Case configuration (primary bulk unit)
  @Column({ name: 'case_size', type: 'integer', nullable: true })
  caseSize!: number | null;  // Units per case (e.g., 24) OR packs per case if packSize set

  @Column({ name: 'case_unit_name', type: 'varchar', length: 30, nullable: true })
  caseUnitName!: string | null;  // e.g., "case", "carton", "pallet"

  // Case-based pricing
  @Column({ name: 'case_purchase_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  casePurchasePrice!: number | null;  // Cost to buy one case

  @Column({ name: 'case_selling_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  caseSellingPrice!: number | null;  // Price to sell one case (wholesale)

  // Pack-based pricing (optional)
  @Column({ name: 'pack_purchase_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  packPurchasePrice!: number | null;

  @Column({ name: 'pack_selling_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  packSellingPrice!: number | null;

  // Sales configuration
  @Column({ name: 'allow_unit_sales', type: 'boolean', default: true })
  allowUnitSales!: boolean;  // Can sell individual units?

  @Column({ name: 'allow_pack_sales', type: 'boolean', default: false })
  allowPackSales!: boolean;  // Can sell packs?

  @Column({ name: 'allow_case_sales', type: 'boolean', default: false })
  allowCaseSales!: boolean;  // Can sell cases?

  // Ordering configuration
  @Column({ name: 'min_order_quantity', type: 'integer', default: 1 })
  minOrderQuantity!: number;  // Minimum units for ordering

  @Column({ name: 'order_in_cases_only', type: 'boolean', default: false })
  orderInCasesOnly!: boolean;  // Force case-based ordering from suppliers

  // Partner-Ready Fields: Partner Availability (JSONB for flexibility)
  @Column({ name: 'partner_availability', type: 'jsonb', default: '{}' })
  partnerAvailability!: Record<string, boolean>;

  // Partner-Ready Fields: Tags for flexible categorization
  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  // Partner-Ready Fields: Default Supplier
  @Column({ name: 'default_supplier_id', type: 'uuid', nullable: true })
  defaultSupplierId!: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_supplier_id' })
  defaultSupplier!: Supplier | null;

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

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  // Calculate profit per unit
  get profitPerUnit(): number {
    return Number(this.sellingPrice) - Number(this.purchasePrice);
  }

  // Check if low stock (threshold can be configured)
  isLowStock(threshold: number = 10): boolean {
    return this.quantity <= threshold;
  }

  // ============ Case/Pack Helper Methods ============

  /**
   * Calculate total units per case
   * If packSize is set, caseSize represents packs per case
   */
  get unitsPerCase(): number {
    if (!this.caseSize) return 1;
    if (this.packSize) {
      // Case contains packs: caseSize = packs per case
      return this.caseSize * this.packSize;
    }
    // Case contains units directly
    return this.caseSize;
  }

  /**
   * Calculate units per pack
   */
  get unitsPerPack(): number {
    return this.packSize || 1;
  }

  /**
   * Get effective case purchase price (calculated if not explicitly set)
   */
  get effectiveCasePurchasePrice(): number {
    if (this.casePurchasePrice) return Number(this.casePurchasePrice);
    return Number(this.purchasePrice) * this.unitsPerCase;
  }

  /**
   * Get effective case selling price (calculated if not explicitly set)
   */
  get effectiveCaseSellingPrice(): number {
    if (this.caseSellingPrice) return Number(this.caseSellingPrice);
    return Number(this.sellingPrice) * this.unitsPerCase;
  }

  /**
   * Get effective pack purchase price
   */
  get effectivePackPurchasePrice(): number {
    if (this.packPurchasePrice) return Number(this.packPurchasePrice);
    return Number(this.purchasePrice) * this.unitsPerPack;
  }

  /**
   * Get effective pack selling price
   */
  get effectivePackSellingPrice(): number {
    if (this.packSellingPrice) return Number(this.packSellingPrice);
    return Number(this.sellingPrice) * this.unitsPerPack;
  }

  /**
   * Calculate how many full cases are in stock
   */
  get stockInCases(): number {
    return Math.floor(this.quantity / this.unitsPerCase);
  }

  /**
   * Calculate remaining units after full cases
   */
  get stockRemainder(): number {
    return this.quantity % this.unitsPerCase;
  }

  /**
   * Calculate how many full packs are in stock
   */
  get stockInPacks(): number {
    return Math.floor(this.quantity / this.unitsPerPack);
  }

  /**
   * Calculate case profit margin percentage
   */
  get caseProfitMargin(): number {
    const cost = this.effectiveCasePurchasePrice;
    const price = this.effectiveCaseSellingPrice;
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  }

  /**
   * Check if product has case configuration
   */
  get hasCaseConfig(): boolean {
    return this.caseSize !== null && this.caseSize > 0;
  }

  /**
   * Check if product has pack configuration
   */
  get hasPackConfig(): boolean {
    return this.packSize !== null && this.packSize > 0;
  }
}
