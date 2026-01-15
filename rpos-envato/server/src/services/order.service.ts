import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order.entity';
import { OrderItem } from '../entities/OrderItem.entity';
import { Product } from '../entities/Product.entity';
import { Coupon } from '../entities/Coupon.entity';
import { CouponType } from '../types/enums';
import { OrderJob } from '../queues/jobs/OrderJob';
import { InventoryJob } from '../queues/jobs/InventoryJob';

export interface CreateOrderParams {
  businessId: string;
  createdById: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  couponId?: string;
  customerId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
}

export interface OrderItemWithProduct {
  product: Product;
  quantity: number;
}

/**
 * Order Service - Handles order business logic
 */
export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private productRepository = AppDataSource.getRepository(Product);
  private couponRepository = AppDataSource.getRepository(Coupon);

  /**
   * Validate and get order products with stock check
   */
  async getOrderProducts(
    items: Array<{ productId: string; quantity: number }>,
    businessId: string
  ): Promise<OrderItemWithProduct[]> {
    const carts: OrderItemWithProduct[] = [];

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, businessId, enabled: true },
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`${product.name} is currently out of stock`);
      }

      carts.push({ product, quantity: item.quantity });
    }

    return carts;
  }

  /**
   * Get coupon by ID with validation
   */
  async getOrderCoupon(couponId: string, businessId: string): Promise<Coupon | null> {
    const coupon = await this.couponRepository.findOne({
      where: { id: couponId, businessId, enabled: true },
    });

    if (coupon && coupon.isExpired) {
      return null; // Expired coupon
    }

    return coupon;
  }

  /**
   * Calculate order discount based on coupon
   */
  calculateDiscount(coupon: Coupon | null, subTotal: number): number {
    if (!coupon) return 0;

    if (coupon.type === CouponType.FIXED) {
      return Math.min(Number(coupon.amount), subTotal);
    } else {
      return (subTotal * Number(coupon.amount)) / 100;
    }
  }

  /**
   * Get next order number for a business
   */
  async getNextOrderNumber(businessId: string): Promise<number> {
    const lastOrder = await this.orderRepository.findOne({
      where: { businessId },
      order: { number: 'DESC' },
    });

    return lastOrder ? lastOrder.number + 1 : 1;
  }

  /**
   * Create a new order
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const {
      businessId,
      createdById,
      items,
      couponId,
      customerId,
      guestName,
      guestEmail,
      guestPhone,
      guestAddress,
    } = params;

    // Validate and get products
    const carts = await this.getOrderProducts(items, businessId);

    // Calculate subtotal
    const subTotal = carts.reduce((sum, cart) => {
      return sum + Number(cart.product.sellingPrice) * cart.quantity;
    }, 0);

    // Get coupon and calculate discount
    let discount = 0;
    if (couponId) {
      const coupon = await this.getOrderCoupon(couponId, businessId);
      discount = this.calculateDiscount(coupon, subTotal);
    }

    // Calculate total
    const total = subTotal - discount;

    // Get next order number
    const orderNumber = await this.getNextOrderNumber(businessId);

    // Create order using transaction
    return AppDataSource.transaction(async (manager) => {
      // Create order
      const order = manager.create(Order, {
        number: orderNumber,
        businessId,
        createdById,
        customerId: customerId || null,
        couponId: couponId || null,
        guestName: guestName || null,
        guestEmail: guestEmail || null,
        guestPhone: guestPhone || null,
        guestAddress: guestAddress || null,
        subTotal,
        discount,
        total,
      });

      const savedOrder = await manager.save(order);

      // Create order items
      const orderItems = carts.map((cart) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: cart.product.id,
          quantity: cart.quantity,
          unitPrice: Number(cart.product.sellingPrice),
          lineTotal: Number(cart.product.sellingPrice) * cart.quantity,
        })
      );

      await manager.save(orderItems);

      // Dispatch async job for inventory update and notifications
      await OrderJob.processOrder({
        orderId: savedOrder.id,
        businessId,
        items: carts.map((cart) => ({
          productId: cart.product.id,
          quantity: cart.quantity,
          unitPrice: Number(cart.product.sellingPrice),
        })),
        customerId,
        couponId,
      });

      // Return the saved order - we'll fetch relations separately if needed
      return savedOrder;
    });
  }

  /**
   * Update an existing order
   */
  async updateOrder(
    orderId: string,
    businessId: string,
    params: Partial<CreateOrderParams>
  ): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items'],
    });

    if (!order) {
      return null;
    }

    // If items are being updated, restore old inventory first
    if (params.items && order.items) {
      await InventoryJob.restoreInventory({
        orderId,
        businessId,
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }

    // Recalculate with new items
    const items = params.items || order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const carts = await this.getOrderProducts(items, businessId);

    const subTotal = carts.reduce((sum, cart) => {
      return sum + Number(cart.product.sellingPrice) * cart.quantity;
    }, 0);

    const couponId = params.couponId ?? order.couponId;
    let discount = 0;
    if (couponId) {
      const coupon = await this.getOrderCoupon(couponId, businessId);
      discount = this.calculateDiscount(coupon, subTotal);
    }

    const total = subTotal - discount;

    // Update order
    return AppDataSource.transaction(async (manager) => {
      // Update order
      await manager.update(Order, orderId, {
        customerId: params.customerId ?? order.customerId,
        couponId: couponId || null,
        subTotal,
        discount,
        total,
      });

      // If items changed, delete old and create new
      if (params.items) {
        await manager.delete(OrderItem, { orderId });

        const orderItems = carts.map((cart) =>
          manager.create(OrderItem, {
            orderId,
            productId: cart.product.id,
            quantity: cart.quantity,
            unitPrice: Number(cart.product.sellingPrice),
            lineTotal: Number(cart.product.sellingPrice) * cart.quantity,
          })
        );

        await manager.save(orderItems);

        // Dispatch inventory update for new items
        await OrderJob.processOrder({
          orderId,
          businessId,
          items: carts.map((cart) => ({
            productId: cart.product.id,
            quantity: cart.quantity,
            unitPrice: Number(cart.product.sellingPrice),
          })),
        });
      }

      return this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      });
    });
  }

  /**
   * Delete an order and restore inventory
   */
  async deleteOrder(orderId: string, businessId: string): Promise<boolean> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items'],
    });

    if (!order) {
      return false;
    }

    // Restore inventory
    if (order.items && order.items.length > 0) {
      await InventoryJob.restoreInventory({
        orderId,
        businessId,
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }

    // Delete order (cascade deletes items)
    await this.orderRepository.delete(orderId);

    return true;
  }

  /**
   * Get order by ID with relations
   */
  async getOrderById(orderId: string, businessId: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
    });
  }

  /**
   * Get all orders for a business with pagination
   */
  async getOrders(
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: Order[]; total: number }> {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { businessId },
      relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { orders, total };
  }

  /**
   * Sync all orders for a business (for mobile app)
   */
  async syncOrders(businessId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { businessId },
      relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }
}

export default new OrderService();
