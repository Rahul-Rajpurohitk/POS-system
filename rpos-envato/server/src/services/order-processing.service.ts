import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order, OrderItem, Product, Payment } from '../entities';
import { OrderStatus, PaymentMethod, PaymentStatus, TaxType } from '../types/enums';
import { inventoryService } from './inventory.service';
import { paymentService } from './payment.service';
import { cacheService } from './cache.service';
import { realtimeService, RealtimeEvent } from './realtime.service';
import { auditService, AuditEventType } from './audit.service';
import { shiftService } from './shift.service';
import { CashMovementType } from '../entities/Shift.entity';
import { QueueFactory } from '../queues/QueueFactory';
import { v4 as uuidv4 } from 'uuid';

// DTOs
export interface CreateOrderDTO {
  businessId: string;
  userId: string;
  userName: string;
  terminalId?: string;
  customerId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  taxType: TaxType;
  taxRate: number;
  notes?: string;
  items: CreateOrderItemDTO[];
  couponId?: string;
}

export interface CreateOrderItemDTO {
  productId: string;
  quantity: number;
  notes?: string;
  modifiers?: any[];
}

export interface ProcessOrderPaymentDTO {
  orderId: string;
  businessId: string;
  userId: string;
  userName: string;
  shiftId?: string;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    tipAmount?: number;
    transactionId?: string;
    cardLastFour?: string;
    cardBrand?: string;
    giftCardCode?: string;
  }>;
}

export interface OrderResult {
  order: Order;
  reservationIds?: string[];
}

/**
 * Unified Order Processing Service
 * Coordinates all systems: inventory, payments, queues, real-time, audit
 */
class OrderProcessingService {
  /**
   * Create a new order with stock reservation
   */
  async createOrder(dto: CreateOrderDTO): Promise<OrderResult> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. Validate and fetch products
      const productIds = dto.items.map((item) => item.productId);
      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id IN (:...ids)', { ids: productIds })
        .andWhere('product.businessId = :businessId', { businessId: dto.businessId })
        .andWhere('product.enabled = :enabled', { enabled: true })
        .getMany();

      if (products.length !== productIds.length) {
        throw new Error('Some products not found or disabled');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 2. Check and reserve stock (distributed lock via Redis)
      const stockChecks = dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const stockResult = await inventoryService.checkStockAvailability(
        dto.businessId,
        stockChecks
      );

      if (!stockResult.allAvailable) {
        const unavailable = stockResult.results
          .filter((r) => !r.available)
          .map((r) => {
            const product = productMap.get(r.productId);
            return `${product?.name || r.productId}: requested ${r.requestedQuantity}, available ${r.availableQuantity}`;
          });
        throw new Error(`Insufficient stock: ${unavailable.join(', ')}`);
      }

      // 3. Reserve stock
      const reserveResult = await inventoryService.reserveStock(
        dto.businessId,
        stockChecks,
        uuidv4() // Temporary order ID for reservation
      );

      if (!reserveResult.success) {
        throw new Error(`Stock reservation failed: ${reserveResult.errors.join(', ')}`);
      }

      // 4. Get next order number
      const lastOrder = await manager.getRepository(Order).findOne({
        where: { businessId: dto.businessId },
        order: { number: 'DESC' },
      });
      const orderNumber = (lastOrder?.number || 0) + 1;

      // 5. Calculate order totals
      let subTotal = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const itemDto of dto.items) {
        const product = productMap.get(itemDto.productId)!;
        const unitPrice = Number(product.price);
        const itemTotal = unitPrice * itemDto.quantity;

        subTotal += itemTotal;

        orderItems.push({
          productId: itemDto.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: itemDto.quantity,
          unitPrice,
          discount: 0,
          total: itemTotal,
          notes: itemDto.notes || null,
          modifiers: itemDto.modifiers || null,
        });
      }

      // 6. Calculate tax
      const totals = paymentService.calculateTotals({
        subTotal,
        discount: 0, // Will be applied with coupon
        taxType: dto.taxType,
        taxRate: dto.taxRate,
      });

      // 7. Create order
      const order = manager.create(Order, {
        number: orderNumber,
        businessId: dto.businessId,
        createdById: dto.userId,
        customerId: dto.customerId || null,
        guestName: dto.guestName || null,
        guestEmail: dto.guestEmail || null,
        guestPhone: dto.guestPhone || null,
        guestAddress: dto.guestAddress || null,
        status: OrderStatus.DRAFT,
        subTotal: totals.subTotal,
        discount: totals.discount,
        taxType: dto.taxType,
        taxRate: dto.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        amountPaid: 0,
        amountDue: totals.total,
        notes: dto.notes || null,
        couponId: dto.couponId || null,
      });

      await manager.save(order);

      // 8. Create order items
      for (const itemData of orderItems) {
        const item = manager.create(OrderItem, {
          ...itemData,
          orderId: order.id,
        } as OrderItem);
        await manager.save(item);
      }

      // 9. Emit real-time event
      realtimeService.emitOrderEvent(dto.businessId, RealtimeEvent.ORDER_CREATED, {
        id: order.id,
        number: order.number,
        status: order.status,
        total: Number(order.total),
        itemCount: orderItems.length,
      });

      // 10. Audit log
      await auditService.logOrder(
        AuditEventType.ORDER_CREATED,
        dto.businessId,
        dto.userId,
        dto.userName,
        order.id,
        order.formattedNumber,
        {
          newValue: {
            total: order.total,
            itemCount: orderItems.length,
          },
        }
      );

      return {
        order,
        reservationIds: reserveResult.reservationIds,
      };
    });
  }

  /**
   * Process payment and complete order
   */
  async processPayment(dto: ProcessOrderPaymentDTO): Promise<Order> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. Get order with lock
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('order.items', 'items')
        .where('order.id = :id', { id: dto.orderId })
        .andWhere('order.businessId = :businessId', { businessId: dto.businessId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      if (![OrderStatus.DRAFT, OrderStatus.PENDING].includes(order.status)) {
        throw new Error(`Cannot process payment for order in status: ${order.status}`);
      }

      // 2. Validate payment amounts
      const totalPayment = dto.payments.reduce(
        (sum, p) => sum + p.amount + (p.tipAmount || 0),
        0
      );

      if (totalPayment < Number(order.amountDue)) {
        throw new Error(
          `Insufficient payment. Due: ${order.amountDue}, Received: ${totalPayment}`
        );
      }

      // 3. Process each payment
      const payments: Payment[] = [];
      let totalApplied = 0;
      let totalTips = 0;
      let totalChange = 0;
      let hasCash = false;

      for (const paymentDto of dto.payments) {
        const referenceId = `PAY-${Date.now().toString(36)}-${uuidv4().split('-')[0]}`.toUpperCase();
        const amountDue = Number(order.total) - totalApplied;
        const tipAmount = paymentDto.tipAmount || 0;

        let amountApplied: number;
        let changeAmount = 0;

        if (paymentDto.method === PaymentMethod.CASH) {
          hasCash = true;
          amountApplied = Math.min(paymentDto.amount, amountDue);
          changeAmount = Math.max(0, paymentDto.amount - amountDue);
        } else {
          amountApplied = Math.min(paymentDto.amount, amountDue);
        }

        const payment = manager.create(Payment, {
          referenceId,
          orderId: order.id,
          businessId: dto.businessId,
          processedById: dto.userId,
          method: paymentDto.method,
          status: paymentDto.method === PaymentMethod.CASH
            ? PaymentStatus.CAPTURED
            : PaymentStatus.AUTHORIZED,
          amountTendered: paymentDto.amount,
          amountApplied: this.round(amountApplied),
          changeAmount: this.round(changeAmount),
          tipAmount: this.round(tipAmount),
          transactionId: paymentDto.transactionId || null,
          cardLastFour: paymentDto.cardLastFour || null,
          cardBrand: paymentDto.cardBrand || null,
          giftCardCode: paymentDto.giftCardCode || null,
        });

        await manager.save(payment);

        // Simulate card capture (in real implementation, call payment processor)
        if (payment.status === PaymentStatus.AUTHORIZED) {
          payment.status = PaymentStatus.CAPTURED;
          await manager.save(payment);
        }

        payments.push(payment);
        totalApplied += amountApplied;
        totalTips += tipAmount;
        totalChange += changeAmount;

        // Emit payment event
        realtimeService.emitPaymentEvent(dto.businessId, RealtimeEvent.PAYMENT_RECEIVED, {
          orderId: order.id,
          amount: amountApplied,
          method: paymentDto.method,
        });

        // Audit payment
        await auditService.logPayment(
          AuditEventType.PAYMENT_PROCESSED,
          dto.businessId,
          dto.userId,
          dto.userName,
          payment.id,
          order.id,
          amountApplied,
          paymentDto.method
        );
      }

      // 4. Update order
      order.amountPaid = this.round(totalApplied);
      order.amountDue = this.round(Math.max(0, Number(order.total) - totalApplied));
      order.tipAmount = this.round(totalTips);
      order.changeDue = this.round(totalChange);
      order.status = OrderStatus.PROCESSING;

      await manager.save(order);

      // 5. Record cash movement if there's an active shift
      if (hasCash && dto.shiftId) {
        const cashPayments = dto.payments.filter((p) => p.method === PaymentMethod.CASH);
        const totalCash = cashPayments.reduce((sum, p) => sum + p.amount, 0);

        await shiftService.recordCashMovement({
          shiftId: dto.shiftId,
          userId: dto.userId,
          userName: dto.userName,
          type: CashMovementType.CASH_SALE,
          amount: totalCash - totalChange,
          reason: `Order #${order.formattedNumber}`,
          referenceId: order.id,
        });
      }

      // 6. Confirm stock reservations and deduct inventory
      await inventoryService.deductInventory(
        dto.businessId,
        order.items,
        dto.userId,
        order.id
      );

      // Emit stock updates
      for (const item of order.items) {
        const product = await manager.getRepository(Product).findOne({
          where: { id: item.productId },
        });

        if (product) {
          realtimeService.emitStockUpdate(
            dto.businessId,
            product.id,
            product.name,
            product.stock + item.quantity, // Previous stock
            product.stock, // New stock
            product.minStock
          );
        }
      }

      // 7. Queue background jobs
      const queue = QueueFactory.getQueue();

      // Queue order processing (email receipt, update analytics, etc.)
      await queue.addJob('orders', 'process-order', {
        orderId: order.id,
        businessId: dto.businessId,
        userId: dto.userId,
        action: 'complete',
      });

      // Queue notification
      if (order.guestEmail || order.customerId) {
        await queue.addJob('notifications', 'order-confirmation', {
          orderId: order.id,
          businessId: dto.businessId,
          email: order.guestEmail,
          customerId: order.customerId,
        });
      }

      // 8. Emit order updated event
      realtimeService.emitOrderEvent(dto.businessId, RealtimeEvent.ORDER_UPDATED, {
        id: order.id,
        number: order.number,
        status: order.status,
        total: Number(order.total),
        amountPaid: Number(order.amountPaid),
      });

      return order;
    });
  }

  /**
   * Complete an order (after processing/preparation is done)
   */
  async completeOrder(
    orderId: string,
    businessId: string,
    userId: string,
    userName: string
  ): Promise<Order> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .andWhere('order.businessId = :businessId', { businessId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== OrderStatus.PROCESSING) {
        throw new Error(`Cannot complete order in status: ${order.status}`);
      }

      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();

      await manager.save(order);

      // Emit event
      realtimeService.emitOrderEvent(businessId, RealtimeEvent.ORDER_COMPLETED, {
        id: order.id,
        number: order.number,
        status: order.status,
        total: Number(order.total),
      });

      // Audit log
      await auditService.logOrder(
        AuditEventType.ORDER_COMPLETED,
        businessId,
        userId,
        userName,
        order.id,
        order.formattedNumber
      );

      return order;
    });
  }

  /**
   * Cancel an order and release reservations
   */
  async cancelOrder(
    orderId: string,
    businessId: string,
    userId: string,
    userName: string,
    reason?: string
  ): Promise<Order> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('order.items', 'items')
        .where('order.id = :id', { id: orderId })
        .andWhere('order.businessId = :businessId', { businessId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      if (![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ON_HOLD].includes(order.status)) {
        throw new Error(`Cannot cancel order in status: ${order.status}`);
      }

      if (Number(order.amountPaid) > 0) {
        throw new Error('Cannot cancel order with payments. Process refund first.');
      }

      // Release stock reservations
      inventoryService.releaseOrderReservations(orderId);

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      if (reason) {
        order.notes = `${order.notes || ''}\nCancellation reason: ${reason}`.trim();
      }

      await manager.save(order);

      // Emit event
      realtimeService.emitOrderEvent(businessId, RealtimeEvent.ORDER_CANCELLED, {
        id: order.id,
        number: order.number,
        status: order.status,
        total: Number(order.total),
        reason,
      });

      // Audit log
      await auditService.logOrder(
        AuditEventType.ORDER_CANCELLED,
        businessId,
        userId,
        userName,
        order.id,
        order.formattedNumber,
        { metadata: { reason } }
      );

      return order;
    });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const orderProcessingService = new OrderProcessingService();
