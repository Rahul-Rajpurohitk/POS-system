import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order.entity';
import { OrderItem } from '../entities/OrderItem.entity';
import { Product } from '../entities/Product.entity';
import { Coupon } from '../entities/Coupon.entity';
import { CouponType, OrderStatus, RefundReason, PaymentMethod } from '../types/enums';
import { OrderJob } from '../queues/jobs/OrderJob';
import { InventoryJob } from '../queues/jobs/InventoryJob';
import { Between, MoreThanOrEqual } from 'typeorm';

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
  status?: OrderStatus; // Initial status (defaults to COMPLETED, use OPEN for saved orders)
  paymentMethod?: string;
  orderType?: string;
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
      status = OrderStatus.COMPLETED,
      paymentMethod,
      orderType,
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
        status, // Use provided status or default to COMPLETED
        paymentMethod: paymentMethod || null,
        orderType: orderType || null,
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
      // Build update data with optional payment method
      const updateData: Partial<Order> = {
        customerId: params.customerId ?? order.customerId,
        couponId: couponId || null,
        subTotal,
        discount,
        total,
      };

      // Update payment method if provided
      if (params.paymentMethod) {
        updateData.paymentMethod = params.paymentMethod as PaymentMethod;
      }

      await manager.update(Order, orderId, updateData);

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
   * Get all orders for a business with pagination and filters
   */
  async getOrders(
    businessId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
      status?: string;
      paymentMethod?: string;
      orderType?: string;
      search?: string;
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.coupon', 'coupon')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .where('order.businessId = :businessId', { businessId });

    // Apply date range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filters.dateRange) {
        case 'today':
          queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: today });
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          queryBuilder.andWhere('order.createdAt >= :startDate AND order.createdAt < :endDate', {
            startDate: yesterday,
            endDate: today,
          });
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: weekAgo });
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: monthAgo });
          break;
      }
    }

    // Apply status filter
    // Note: status is a PostgreSQL enum, so we cast to text for comparison
    if (filters?.status && filters.status !== 'all') {
      queryBuilder.andWhere('CAST("order"."status" AS TEXT) = :status', { status: filters.status.toLowerCase() });
    }

    // Apply payment method filter
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      if (filters.paymentMethod === 'card') {
        queryBuilder.andWhere('(order.paymentMethod = :creditCard OR order.paymentMethod = :debitCard)', {
          creditCard: 'credit_card',
          debitCard: 'debit_card',
        });
      } else if (filters.paymentMethod === 'mobile') {
        queryBuilder.andWhere('(order.paymentMethod = :mobilePayment OR order.paymentMethod = :qrCode)', {
          mobilePayment: 'mobile_payment',
          qrCode: 'qr_code',
        });
      } else {
        queryBuilder.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod: filters.paymentMethod });
      }
    }

    // Apply order type filter
    if (filters?.orderType && filters.orderType !== 'all') {
      queryBuilder.andWhere('order.orderType = :orderType', { orderType: filters.orderType });
    }

    // Apply search filter
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(CAST(order.number AS TEXT)) LIKE :search OR LOWER(customer.name) LIKE :search OR LOWER(order.guestName) LIKE :search)',
        { search: searchTerm }
      );
    }

    // Apply pagination and ordering
    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

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

  /**
   * Get order statistics for dashboard
   * Optionally accepts a date range filter for consistent stats
   */
  async getOrderStats(businessId: string, dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all'): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersToday: number;
    revenueToday: number;
    completedToday: number;
    pendingOrders: number;
    openOrders: number;
    cancelledOrders: number;
    ordersByStatus: Record<string, number>;
  }> {
    // Get start of today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate date filter based on range
    let dateFilter: Date | null = null;
    let dateFilterEnd: Date | null = null; // For 'yesterday' which needs both start and end
    switch (dateRange) {
      case 'today':
        dateFilter = today;
        break;
      case 'yesterday':
        dateFilter = new Date(today);
        dateFilter.setDate(dateFilter.getDate() - 1);
        dateFilterEnd = today; // Yesterday ends at start of today
        break;
      case 'week':
        dateFilter = new Date(today);
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case 'month':
        dateFilter = new Date(today);
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      default:
        dateFilter = null; // all time
    }

    // Get filtered orders
    const whereClause: any = { businessId };
    if (dateFilter) {
      if (dateFilterEnd) {
        // For 'yesterday', filter between start and end
        whereClause.createdAt = Between(dateFilter, dateFilterEnd);
      } else {
        whereClause.createdAt = MoreThanOrEqual(dateFilter);
      }
    }

    const filteredOrders = await this.orderRepository.find({
      where: whereClause,
      select: ['id', 'total', 'status', 'createdAt'],
    });

    // Calculate stats for filtered period
    const totalOrders = filteredOrders.length;

    // Revenue and average ONLY from completed orders
    const completedOrders = filteredOrders.filter(o => o.status === OrderStatus.COMPLETED);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Today's orders (always relative to today)
    const todayOrders = filteredOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= today;
    });

    const ordersToday = todayOrders.length;
    const todayCompleted = todayOrders.filter(o => o.status === OrderStatus.COMPLETED);
    const revenueToday = todayCompleted.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const completedToday = todayCompleted.length;

    // Order status counts
    const pendingOrders = filteredOrders.filter(
      o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PROCESSING
    ).length;

    const openOrders = filteredOrders.filter(o => o.status === OrderStatus.OPEN).length;

    const cancelledOrders = filteredOrders.filter(
      o => o.status === OrderStatus.CANCELLED ||
           o.status === OrderStatus.REFUNDED ||
           o.status === OrderStatus.PARTIALLY_REFUNDED
    ).length;

    // Orders by status
    const ordersByStatus: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const status = o.status || 'unknown';
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersToday,
      revenueToday,
      completedToday,
      pendingOrders,
      openOrders,
      cancelledOrders,
      ordersByStatus,
    };
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(businessId: string, limit: number = 10): Promise<Order[]> {
    return this.orderRepository.find({
      where: { businessId },
      relations: ['items', 'items.product', 'customer', 'createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get orders by customer ID
   */
  async getCustomerOrders(businessId: string, customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { businessId, customerId },
      relations: ['items', 'items.product', 'coupon', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Void/Cancel an order
   * Restores inventory and marks order as cancelled
   */
  async voidOrder(
    orderId: string,
    businessId: string,
    userId: string,
    reason?: string
  ): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items'],
    });

    if (!order) {
      return null;
    }

    // Check if order can be voided
    if (!order.canBeCancelled) {
      throw new Error(`Order cannot be voided. Current status: ${order.status}`);
    }

    return AppDataSource.transaction(async (manager) => {
      // Restore inventory for all items
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          await manager.increment(
            Product,
            { id: item.productId },
            'quantity',
            item.quantity
          );
        }
      }

      // Update order status
      await manager.update(Order, orderId, {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        notes: reason ? `Voided: ${reason}` : order.notes,
      });

      return this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      });
    });
  }

  /**
   * Process a refund for an order
   */
  async refundOrder(
    orderId: string,
    businessId: string,
    userId: string,
    params: {
      amount: number;
      reason: RefundReason;
      notes?: string;
      restoreInventory?: boolean;
      itemIds?: string[]; // For partial refunds - specific items to refund
    }
  ): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      return null;
    }

    // Check if order can be refunded
    if (!order.canBeRefunded) {
      throw new Error(`Order cannot be refunded. Current status: ${order.status}`);
    }

    const { amount, reason, notes, restoreInventory = true, itemIds } = params;

    // Validate refund amount
    const maxRefundable = Number(order.amountPaid);
    if (amount <= 0 || amount > maxRefundable) {
      throw new Error(`Invalid refund amount. Maximum refundable: ${maxRefundable}`);
    }

    const isFullRefund = amount >= Number(order.total);

    return AppDataSource.transaction(async (manager) => {
      // Restore inventory if requested
      if (restoreInventory) {
        const itemsToRestore = itemIds
          ? order.items.filter(item => itemIds.includes(item.id))
          : order.items;

        for (const item of itemsToRestore) {
          await manager.increment(
            Product,
            { id: item.productId },
            'quantity',
            item.quantity
          );
        }
      }

      // Update order
      const newStatus = isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED;
      const refundNote = `Refund: $${amount.toFixed(2)} - ${reason}${notes ? ` - ${notes}` : ''}`;

      await manager.update(Order, orderId, {
        status: newStatus,
        amountPaid: Number(order.amountPaid) - amount,
        notes: order.notes ? `${order.notes}\n${refundNote}` : refundNote,
      });

      return this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      });
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    businessId: string,
    status: OrderStatus,
    userId?: string
  ): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
    });

    if (!order) {
      return null;
    }

    const updateData: Partial<Order> = { status };

    // Set timestamps based on status
    if (status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    await this.orderRepository.update(orderId, updateData);

    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
    });
  }

  /**
   * Process product exchange
   * Returns items from original order and creates new order with exchange items
   */
  async processExchange(
    orderId: string,
    businessId: string,
    userId: string,
    params: {
      returnItems?: Array<{ itemId: string; quantity: number }>;
      exchangeItems?: Array<{ productId: string; quantity: number }>;
      refundAmount: number;
      additionalPayment: number;
      reason: RefundReason;
      notes?: string;
      destination?: string;
    }
  ): Promise<{ originalOrder: Order; exchangeOrder?: Order }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
      relations: ['items', 'items.product', 'customer'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const { returnItems, exchangeItems, refundAmount, additionalPayment, reason, notes, destination } = params;

    return AppDataSource.transaction(async (manager) => {
      // 1. Process returns - restore inventory for returned items
      if (returnItems && returnItems.length > 0) {
        for (const returnItem of returnItems) {
          const orderItem = order.items.find(i => i.id === returnItem.itemId);
          if (orderItem) {
            // Restore inventory
            await manager.increment(
              Product,
              { id: orderItem.productId },
              'quantity',
              returnItem.quantity
            );
          }
        }
      }

      // 2. Update original order with refund info
      const refundNote = `Exchange processed: ${reason}${notes ? ` - ${notes}` : ''}. ` +
        `Refund: $${refundAmount.toFixed(2)}, Additional Payment: $${additionalPayment.toFixed(2)}`;

      await manager.update(Order, orderId, {
        status: OrderStatus.PARTIALLY_REFUNDED,
        notes: order.notes ? `${order.notes}\n${refundNote}` : refundNote,
        amountPaid: Number(order.amountPaid) - refundAmount + additionalPayment,
      });

      // 3. Create new order for exchange items (if any)
      let newExchangeOrder: Order | undefined;

      if (exchangeItems && exchangeItems.length > 0) {
        // Validate and get exchange products
        const exchangeCarts = await this.getOrderProducts(exchangeItems, businessId);

        // Calculate totals
        const exchangeSubTotal = exchangeCarts.reduce((sum, cart) => {
          return sum + Number(cart.product.sellingPrice) * cart.quantity;
        }, 0);

        // Get next order number
        const nextOrderNumber = await this.getNextOrderNumber(businessId);

        // Create exchange order
        const exchangeOrder = manager.create(Order, {
          number: nextOrderNumber,
          businessId,
          createdById: userId,
          customerId: order.customerId,
          subTotal: exchangeSubTotal,
          discount: 0,
          total: exchangeSubTotal,
          amountPaid: exchangeSubTotal, // Paid via exchange credit + additional payment
          status: OrderStatus.COMPLETED,
          notes: `Exchange order from Order #${order.number}`,
        });

        const savedExchangeOrder = await manager.save(exchangeOrder);

        // Create order items
        const newOrderItems = exchangeCarts.map((cart) =>
          manager.create(OrderItem, {
            orderId: savedExchangeOrder.id,
            productId: cart.product.id,
            quantity: cart.quantity,
            unitPrice: Number(cart.product.sellingPrice),
            lineTotal: Number(cart.product.sellingPrice) * cart.quantity,
          })
        );

        await manager.save(newOrderItems);

        // Reduce inventory for exchange items
        for (const cart of exchangeCarts) {
          await manager.decrement(
            Product,
            { id: cart.product.id },
            'quantity',
            cart.quantity
          );
        }

        newExchangeOrder = await this.orderRepository.findOne({
          where: { id: savedExchangeOrder.id },
          relations: ['items', 'items.product', 'customer', 'createdBy'],
        }) || undefined;
      }

      // 4. Return updated orders
      const updatedOriginalOrder = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      });

      return {
        originalOrder: updatedOriginalOrder!,
        exchangeOrder: newExchangeOrder,
      };
    });
  }
}

export default new OrderService();
