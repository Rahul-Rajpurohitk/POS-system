import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './Order.entity';
import { Product } from './Product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  // Snapshot of price at time of order (important for historical accuracy)
  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 12, scale: 2 })
  lineTotal!: number;

  // Relations
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
