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

@Entity('products')
@Index(['businessId', 'sku'], { unique: true })
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
}
