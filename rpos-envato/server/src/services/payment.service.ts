import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Payment, Order, Refund } from '../entities';
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  RefundStatus,
  RefundReason,
  TaxType,
} from '../types/enums';
import { v4 as uuidv4 } from 'uuid';

// DTOs
export interface ProcessPaymentDTO {
  orderId: string;
  businessId: string;
  processedById: string;
  method: PaymentMethod;
  amountTendered: number;
  tipAmount?: number;
  // Card-specific
  transactionId?: string;
  cardLastFour?: string;
  cardBrand?: string;
  // Gift card
  giftCardCode?: string;
  // Metadata
  metadata?: Record<string, any>;
}

export interface SplitPaymentDTO {
  orderId: string;
  businessId: string;
  processedById: string;
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

export interface ProcessRefundDTO {
  orderId: string;
  businessId: string;
  requestedById: string;
  reason: RefundReason;
  reasonNotes?: string;
  amount?: number; // Full refund if not specified
  refundMethod?: PaymentMethod;
  refundedItems?: Array<{ orderItemId: string; quantity: number; amount: number }>;
  restoreInventory?: boolean;
}

export interface CalculateTotalsDTO {
  subTotal: number;
  discount: number;
  taxType: TaxType;
  taxRate: number;
  tipAmount?: number;
}

export interface TotalsResult {
  subTotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  tipAmount: number;
  grandTotal: number;
}

class PaymentService {
  private paymentRepository: Repository<Payment>;
  private orderRepository: Repository<Order>;
  private refundRepository: Repository<Refund>;

  constructor() {
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.orderRepository = AppDataSource.getRepository(Order);
    this.refundRepository = AppDataSource.getRepository(Refund);
  }

  /**
   * Calculate order totals with proper tax handling
   */
  calculateTotals(dto: CalculateTotalsDTO): TotalsResult {
    const { subTotal, discount, taxType, taxRate, tipAmount = 0 } = dto;

    // Calculate discounted amount
    const discountedSubTotal = Math.max(0, subTotal - discount);

    let taxableAmount: number;
    let taxAmount: number;
    let total: number;

    switch (taxType) {
      case TaxType.INCLUSIVE:
        // Tax is included in the price, extract it
        taxableAmount = discountedSubTotal / (1 + taxRate);
        taxAmount = discountedSubTotal - taxableAmount;
        total = discountedSubTotal;
        break;

      case TaxType.EXCLUSIVE:
        // Tax is added on top
        taxableAmount = discountedSubTotal;
        taxAmount = discountedSubTotal * taxRate;
        total = discountedSubTotal + taxAmount;
        break;

      case TaxType.EXEMPT:
      default:
        taxableAmount = discountedSubTotal;
        taxAmount = 0;
        total = discountedSubTotal;
        break;
    }

    // Round to 2 decimal places
    taxableAmount = this.round(taxableAmount);
    taxAmount = this.round(taxAmount);
    total = this.round(total);

    const grandTotal = this.round(total + tipAmount);

    return {
      subTotal: this.round(subTotal),
      discount: this.round(discount),
      taxableAmount,
      taxAmount,
      total,
      tipAmount: this.round(tipAmount),
      grandTotal,
    };
  }

  /**
   * Process a single payment for an order
   */
  async processPayment(dto: ProcessPaymentDTO): Promise<Payment> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // Get order with lock to prevent race conditions
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: dto.orderId })
        .andWhere('order.businessId = :businessId', { businessId: dto.businessId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      // Validate order can accept payment
      if (!this.canAcceptPayment(order)) {
        throw new Error(`Order cannot accept payment in status: ${order.status}`);
      }

      // Calculate change for cash payments
      const amountDue = Number(order.amountDue);
      const amountTendered = Number(dto.amountTendered);
      const tipAmount = Number(dto.tipAmount || 0);

      let amountApplied: number;
      let changeAmount = 0;

      if (dto.method === PaymentMethod.CASH) {
        // For cash, calculate change
        amountApplied = Math.min(amountTendered, amountDue + tipAmount);
        changeAmount = Math.max(0, amountTendered - (amountDue + tipAmount));
      } else {
        // For card/digital payments, exact amount
        amountApplied = Math.min(amountTendered, amountDue);
      }

      // Generate unique reference ID for idempotency
      const referenceId = this.generateReferenceId('PAY');

      // Create payment record
      const payment = manager.create(Payment, {
        referenceId,
        orderId: dto.orderId,
        businessId: dto.businessId,
        processedById: dto.processedById,
        method: dto.method,
        status: this.getInitialPaymentStatus(dto.method),
        amountTendered: this.round(amountTendered),
        amountApplied: this.round(amountApplied),
        changeAmount: this.round(changeAmount),
        tipAmount: this.round(tipAmount),
        transactionId: dto.transactionId || null,
        cardLastFour: dto.cardLastFour || null,
        cardBrand: dto.cardBrand || null,
        giftCardCode: dto.giftCardCode || null,
        metadata: dto.metadata || null,
      });

      await manager.save(payment);

      // Update order payment tracking
      const newAmountPaid = this.round(Number(order.amountPaid) + amountApplied);
      const newAmountDue = this.round(Number(order.total) - newAmountPaid);
      const newTipAmount = this.round(Number(order.tipAmount) + tipAmount);

      order.amountPaid = newAmountPaid;
      order.amountDue = Math.max(0, newAmountDue);
      order.tipAmount = newTipAmount;
      order.changeDue = this.round(changeAmount);

      // Update order status based on payment
      if (order.amountDue <= 0) {
        order.status = OrderStatus.PROCESSING;
      } else if (order.status === OrderStatus.DRAFT) {
        order.status = OrderStatus.PENDING;
      }

      await manager.save(order);

      // For card payments, mark as captured immediately (simulating successful processing)
      // In real implementation, this would be after card processor confirmation
      if (payment.method !== PaymentMethod.CASH && payment.status === PaymentStatus.AUTHORIZED) {
        payment.status = PaymentStatus.CAPTURED;
        await manager.save(payment);
      }

      return payment;
    });
  }

  /**
   * Process split payment (multiple payment methods)
   */
  async processSplitPayment(dto: SplitPaymentDTO): Promise<Payment[]> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: dto.orderId })
        .andWhere('order.businessId = :businessId', { businessId: dto.businessId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      if (!this.canAcceptPayment(order)) {
        throw new Error(`Order cannot accept payment in status: ${order.status}`);
      }

      const payments: Payment[] = [];
      let totalApplied = 0;
      let totalChange = 0;
      let totalTips = 0;

      for (const paymentData of dto.payments) {
        const referenceId = this.generateReferenceId('PAY');
        const amountTendered = Number(paymentData.amount);
        const tipAmount = Number(paymentData.tipAmount || 0);
        const remainingDue = Number(order.total) - totalApplied;

        let amountApplied: number;
        let changeAmount = 0;

        if (paymentData.method === PaymentMethod.CASH) {
          amountApplied = Math.min(amountTendered, remainingDue + tipAmount);
          changeAmount = Math.max(0, amountTendered - (remainingDue + tipAmount));
        } else {
          amountApplied = Math.min(amountTendered, remainingDue);
        }

        const payment = manager.create(Payment, {
          referenceId,
          orderId: dto.orderId,
          businessId: dto.businessId,
          processedById: dto.processedById,
          method: paymentData.method,
          status: this.getInitialPaymentStatus(paymentData.method),
          amountTendered: this.round(amountTendered),
          amountApplied: this.round(amountApplied),
          changeAmount: this.round(changeAmount),
          tipAmount: this.round(tipAmount),
          transactionId: paymentData.transactionId || null,
          cardLastFour: paymentData.cardLastFour || null,
          cardBrand: paymentData.cardBrand || null,
          giftCardCode: paymentData.giftCardCode || null,
        });

        await manager.save(payment);

        if (payment.method !== PaymentMethod.CASH && payment.status === PaymentStatus.AUTHORIZED) {
          payment.status = PaymentStatus.CAPTURED;
          await manager.save(payment);
        }

        payments.push(payment);
        totalApplied += amountApplied;
        totalChange += changeAmount;
        totalTips += tipAmount;
      }

      // Update order
      order.amountPaid = this.round(totalApplied);
      order.amountDue = this.round(Math.max(0, Number(order.total) - totalApplied));
      order.tipAmount = this.round(totalTips);
      order.changeDue = this.round(totalChange);

      if (order.amountDue <= 0) {
        order.status = OrderStatus.PROCESSING;
      } else if (order.status === OrderStatus.DRAFT) {
        order.status = OrderStatus.PENDING;
      }

      await manager.save(order);

      return payments;
    });
  }

  /**
   * Process a refund for an order
   */
  async processRefund(dto: ProcessRefundDTO): Promise<Refund> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: dto.orderId })
        .andWhere('order.businessId = :businessId', { businessId: dto.businessId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      if (!this.canRefund(order)) {
        throw new Error(`Order cannot be refunded in status: ${order.status}`);
      }

      // Get original payment for the order
      const originalPayment = await manager.getRepository(Payment).findOne({
        where: { orderId: dto.orderId, status: PaymentStatus.CAPTURED },
        order: { createdAt: 'DESC' },
      });

      // Determine refund amount
      const maxRefundable = Number(order.amountPaid);
      const refundAmount = dto.amount
        ? Math.min(Number(dto.amount), maxRefundable)
        : maxRefundable;

      if (refundAmount <= 0) {
        throw new Error('Invalid refund amount');
      }

      // Determine refund method
      const refundMethod = dto.refundMethod || originalPayment?.method || PaymentMethod.CASH;

      // Generate unique reference
      const referenceId = this.generateReferenceId('REF');

      // Create refund record
      const refund = manager.create(Refund, {
        referenceId,
        orderId: dto.orderId,
        businessId: dto.businessId,
        requestedById: dto.requestedById,
        originalPaymentId: originalPayment?.id || null,
        status: RefundStatus.PENDING,
        reason: dto.reason,
        reasonNotes: dto.reasonNotes || null,
        amount: this.round(refundAmount),
        refundMethod,
        refundedItems: dto.refundedItems || null,
        restoreInventory: dto.restoreInventory !== false,
      });

      await manager.save(refund);

      // For cash refunds, process immediately
      // For card refunds, would need to call payment processor
      if (refundMethod === PaymentMethod.CASH) {
        refund.status = RefundStatus.PROCESSED;
        refund.processedAt = new Date();
        await manager.save(refund);

        // Update order
        order.amountPaid = this.round(Number(order.amountPaid) - refundAmount);

        const isFullRefund = refundAmount >= maxRefundable;
        order.status = isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED;

        await manager.save(order);

        // Update original payment status if applicable
        if (originalPayment) {
          originalPayment.status = isFullRefund
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED;
          await manager.save(originalPayment);
        }
      }

      return refund;
    });
  }

  /**
   * Complete an order after all processing is done
   */
  async completeOrder(orderId: string, businessId: string): Promise<Order> {
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

      if (order.amountDue > 0) {
        throw new Error('Cannot complete order with outstanding balance');
      }

      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();

      await manager.save(order);

      return order;
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, businessId: string): Promise<Order> {
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

      if (![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ON_HOLD].includes(order.status)) {
        throw new Error(`Cannot cancel order in status: ${order.status}`);
      }

      // If any payments were made, they need to be voided/refunded first
      if (Number(order.amountPaid) > 0) {
        throw new Error('Cannot cancel order with payments. Process refund first.');
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();

      await manager.save(order);

      return order;
    });
  }

  /**
   * Get payment history for an order
   */
  async getOrderPayments(orderId: string, businessId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { orderId, businessId },
      order: { createdAt: 'DESC' },
      relations: ['processedBy'],
    });
  }

  /**
   * Get refund history for an order
   */
  async getOrderRefunds(orderId: string, businessId: string): Promise<Refund[]> {
    return this.refundRepository.find({
      where: { orderId, businessId },
      order: { createdAt: 'DESC' },
      relations: ['requestedBy', 'approvedBy'],
    });
  }

  /**
   * Void a pending payment
   */
  async voidPayment(paymentId: string, businessId: string): Promise<Payment> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { id: paymentId, businessId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (![PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(payment.status)) {
        throw new Error(`Cannot void payment in status: ${payment.status}`);
      }

      payment.status = PaymentStatus.VOIDED;
      await manager.save(payment);

      // Update order amounts
      const order = await manager.getRepository(Order).findOne({
        where: { id: payment.orderId },
      });

      if (order) {
        order.amountPaid = this.round(Number(order.amountPaid) - Number(payment.amountApplied));
        order.amountDue = this.round(Number(order.total) - Number(order.amountPaid));
        await manager.save(order);
      }

      return payment;
    });
  }

  // Helper methods

  private canAcceptPayment(order: Order): boolean {
    return [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ON_HOLD].includes(order.status);
  }

  private canRefund(order: Order): boolean {
    return (
      [OrderStatus.COMPLETED, OrderStatus.PROCESSING, OrderStatus.PARTIALLY_REFUNDED].includes(
        order.status
      ) && Number(order.amountPaid) > 0
    );
  }

  private getInitialPaymentStatus(method: PaymentMethod): PaymentStatus {
    switch (method) {
      case PaymentMethod.CASH:
        return PaymentStatus.CAPTURED;
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
      case PaymentMethod.MOBILE_PAYMENT:
        return PaymentStatus.AUTHORIZED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private generateReferenceId(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const paymentService = new PaymentService();
