import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './Product.entity';
import { User } from './User.entity';
import { Business } from './Business.entity';

/**
 * ProductActivity Entity
 *
 * Tracks all changes and actions performed on products.
 * This provides a complete audit trail for compliance and history tracking.
 */

export enum ProductActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  PRICE_CHANGED = 'price_changed',
  STOCK_ADJUSTED = 'stock_adjusted',
  CATEGORY_CHANGED = 'category_changed',
  PARTNER_ENABLED = 'partner_enabled',
  PARTNER_DISABLED = 'partner_disabled',
  BARCODE_SCANNED = 'barcode_scanned',
  SUPPLIER_CHANGED = 'supplier_changed',
  TAG_ADDED = 'tag_added',
  TAG_REMOVED = 'tag_removed',
  IMAGE_ADDED = 'image_added',
  IMAGE_REMOVED = 'image_removed',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
}

@Entity('product_activities')
@Index(['businessId', 'productId'])
@Index(['businessId', 'createdAt'])
@Index(['productId', 'createdAt'])
export class ProductActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({
    type: 'enum',
    enum: ProductActivityType,
    default: ProductActivityType.UPDATED,
  })
  type!: ProductActivityType;

  @Column({ type: 'varchar', length: 255 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Store the changes made (for audit purposes)
  @Column({ type: 'jsonb', nullable: true })
  changes!: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
  } | null;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
