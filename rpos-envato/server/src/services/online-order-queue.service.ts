import { AppDataSource } from '../config/database';
import { OnlineOrderQueue } from '../entities/OnlineOrderQueue.entity';
import { Order } from '../entities/Order.entity';
import { OnlineOrderQueueStatus, OrderStatus, DeliveryStatus } from '../types/enums';
import { realtimeService, RealtimeEvent } from './realtime.service';
import { deliveryService } from './delivery.service';
import { DeliveryJob } from '../queues/jobs/DeliveryJob';
import { LessThan, MoreThan, In } from 'typeorm';

// Configuration
const ACCEPTANCE_TIMEOUT_MINUTES = 15;
const FIRST_REMINDER_MINUTES = 10; // 10 minutes remaining (5 min after creation)
const URGENT_REMINDER_MINUTES = 2;  // 2 minutes remaining (13 min after creation)

export interface CreateQueueEntryParams {
  orderId: string;
  businessId: string;
  timeoutMinutes?: number;
}

export interface AcceptOrderParams {
  queueEntryId: string;
  businessId: string;
  acceptedById: string;
  createDelivery?: {
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    deliveryAddress: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    deliveryInstructions?: string;
    customerName: string;
    customerPhone: string;
    deliveryFee?: number;
    distanceMeters?: number;
    estimatedDurationSeconds?: number;
  };
}

/**
 * Online Order Queue Service - Manages the 15-minute order acceptance window
 */
export class OnlineOrderQueueService {
  private queueRepository = AppDataSource.getRepository(OnlineOrderQueue);
  private orderRepository = AppDataSource.getRepository(Order);

  /**
   * Create a new queue entry for an online order
   * Schedules timeout and reminder jobs
   */
  async createQueueEntry(params: CreateQueueEntryParams): Promise<OnlineOrderQueue> {
    const { orderId, businessId, timeoutMinutes = ACCEPTANCE_TIMEOUT_MINUTES } = params;

    // Verify order exists
    const order = await this.orderRepository.findOne({
      where: { id: orderId, businessId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if queue entry already exists
    const existingEntry = await this.queueRepository.findOne({
      where: { orderId },
    });

    if (existingEntry) {
      throw new Error('Queue entry already exists for this order');
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Create queue entry
    const queueEntry = this.queueRepository.create({
      orderId,
      businessId,
      status: OnlineOrderQueueStatus.PENDING,
      expiresAt,
      reminderCount: 0,
    });

    const savedEntry = await this.queueRepository.save(queueEntry);

    // Update order status to PENDING (online order awaiting acceptance)
    await this.orderRepository.update(orderId, {
      status: OrderStatus.PENDING,
    });

    // Schedule timeout job
    await DeliveryJob.scheduleOrderTimeout({
      queueEntryId: savedEntry.id,
      orderId,
      businessId,
      delayMs: timeoutMinutes * 60 * 1000,
    });

    // Schedule reminders
    // First reminder: 5 minutes after creation (10 min remaining)
    const firstReminderDelay = (timeoutMinutes - FIRST_REMINDER_MINUTES) * 60 * 1000;
    await DeliveryJob.scheduleOrderReminder({
      queueEntryId: savedEntry.id,
      orderId,
      businessId,
      isUrgent: false,
      delayMs: firstReminderDelay,
    });

    // Urgent reminder: 13 minutes after creation (2 min remaining)
    const urgentReminderDelay = (timeoutMinutes - URGENT_REMINDER_MINUTES) * 60 * 1000;
    await DeliveryJob.scheduleOrderReminder({
      queueEntryId: savedEntry.id,
      orderId,
      businessId,
      isUrgent: true,
      delayMs: urgentReminderDelay,
    });

    // Notify POS terminals
    this.emitOrderReceived(businessId, savedEntry, order);

    return savedEntry;
  }

  /**
   * Accept an online order
   */
  async acceptOrder(params: AcceptOrderParams): Promise<{
    queueEntry: OnlineOrderQueue;
    order: Order;
    delivery?: any;
  }> {
    const { queueEntryId, businessId, acceptedById, createDelivery } = params;

    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueEntryId, businessId },
      relations: ['order'],
    });

    if (!queueEntry) {
      throw new Error('Queue entry not found');
    }

    if (queueEntry.status !== OnlineOrderQueueStatus.PENDING) {
      throw new Error(`Order already ${queueEntry.status}`);
    }

    if (queueEntry.isExpired) {
      // Auto-expire if checking after timeout
      await this.expireOrder(queueEntryId);
      throw new Error('Order has expired');
    }

    // Accept the queue entry
    queueEntry.accept(acceptedById);
    await this.queueRepository.save(queueEntry);

    // Update order status to PROCESSING
    await this.orderRepository.update(queueEntry.orderId, {
      status: OrderStatus.PROCESSING,
    });

    const order = await this.orderRepository.findOne({
      where: { id: queueEntry.orderId },
      relations: ['items', 'items.product', 'customer'],
    });

    let delivery;

    // Create delivery if requested
    if (createDelivery) {
      delivery = await deliveryService.createDelivery({
        orderId: queueEntry.orderId,
        businessId,
        ...createDelivery,
      });

      // Update delivery status to ACCEPTED
      await deliveryService.updateDeliveryStatus({
        deliveryId: delivery.id,
        businessId,
        status: DeliveryStatus.ACCEPTED,
      });
    }

    // Emit acceptance event
    this.emitOrderAccepted(businessId, queueEntry, order!);

    return { queueEntry, order: order!, delivery };
  }

  /**
   * Reject an online order
   */
  async rejectOrder(
    queueEntryId: string,
    businessId: string,
    rejectedById: string,
    reason?: string
  ): Promise<OnlineOrderQueue> {
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueEntryId, businessId },
    });

    if (!queueEntry) {
      throw new Error('Queue entry not found');
    }

    if (queueEntry.status !== OnlineOrderQueueStatus.PENDING) {
      throw new Error(`Order already ${queueEntry.status}`);
    }

    // Reject the queue entry
    queueEntry.reject(rejectedById, reason);
    await this.queueRepository.save(queueEntry);

    // Cancel the order
    await this.orderRepository.update(queueEntry.orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      notes: `Rejected: ${reason || 'Store rejected order'}`,
    });

    // Emit rejection event (for customer notification)
    this.emitOrderRejected(businessId, queueEntry);

    return queueEntry;
  }

  /**
   * Expire an order (called by timeout job)
   */
  async expireOrder(queueEntryId: string): Promise<OnlineOrderQueue | null> {
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueEntryId },
    });

    if (!queueEntry) {
      return null;
    }

    if (queueEntry.status !== OnlineOrderQueueStatus.PENDING) {
      // Already processed
      return queueEntry;
    }

    // Expire the queue entry
    queueEntry.expire();
    await this.queueRepository.save(queueEntry);

    // Cancel the order
    await this.orderRepository.update(queueEntry.orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      notes: 'Order expired: Not accepted within time limit',
    });

    // Emit expiration event
    this.emitOrderExpired(queueEntry.businessId, queueEntry);

    return queueEntry;
  }

  /**
   * Send reminder (called by reminder job)
   */
  async sendReminder(queueEntryId: string, isUrgent: boolean): Promise<void> {
    const queueEntry = await this.queueRepository.findOne({
      where: { id: queueEntryId },
      relations: ['order'],
    });

    if (!queueEntry || queueEntry.status !== OnlineOrderQueueStatus.PENDING) {
      return; // No reminder needed
    }

    // Record reminder
    queueEntry.recordReminder();
    await this.queueRepository.save(queueEntry);

    // Emit reminder event
    this.emitOrderReminder(queueEntry.businessId, queueEntry, isUrgent);
  }

  /**
   * Get pending orders for a business
   */
  async getPendingOrders(businessId: string): Promise<OnlineOrderQueue[]> {
    return this.queueRepository.find({
      where: {
        businessId,
        status: OnlineOrderQueueStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['order', 'order.items', 'order.items.product', 'order.customer'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get queue entry by ID
   */
  async getQueueEntryById(queueEntryId: string, businessId: string): Promise<OnlineOrderQueue | null> {
    return this.queueRepository.findOne({
      where: { id: queueEntryId, businessId },
      relations: ['order', 'order.items', 'order.items.product', 'order.customer', 'acceptedBy', 'rejectedBy'],
    });
  }

  /**
   * Get queue entry by order ID
   */
  async getQueueEntryByOrderId(orderId: string): Promise<OnlineOrderQueue | null> {
    return this.queueRepository.findOne({
      where: { orderId },
      relations: ['order'],
    });
  }

  /**
   * Get queue statistics for a business
   */
  async getQueueStats(businessId: string, startDate?: Date, endDate?: Date): Promise<{
    totalReceived: number;
    accepted: number;
    rejected: number;
    expired: number;
    averageAcceptanceTime: number;
    currentPending: number;
  }> {
    const query = this.queueRepository.createQueryBuilder('queue')
      .where('queue.businessId = :businessId', { businessId });

    if (startDate && endDate) {
      query.andWhere('queue.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const entries = await query.getMany();

    const accepted = entries.filter(e => e.status === OnlineOrderQueueStatus.ACCEPTED);
    const rejected = entries.filter(e => e.status === OnlineOrderQueueStatus.REJECTED);
    const expired = entries.filter(e => e.status === OnlineOrderQueueStatus.EXPIRED);
    const pending = entries.filter(e =>
      e.status === OnlineOrderQueueStatus.PENDING && !e.isExpired
    );

    // Calculate average acceptance time (from creation to acceptance)
    const acceptanceTimes = accepted
      .filter(e => e.acceptedAt)
      .map(e => e.acceptedAt!.getTime() - e.createdAt.getTime());

    const averageAcceptanceTime = acceptanceTimes.length > 0
      ? acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length / 1000 // in seconds
      : 0;

    return {
      totalReceived: entries.length,
      accepted: accepted.length,
      rejected: rejected.length,
      expired: expired.length,
      averageAcceptanceTime,
      currentPending: pending.length,
    };
  }

  /**
   * Process expired orders (maintenance job)
   */
  async processExpiredOrders(): Promise<number> {
    const expiredEntries = await this.queueRepository.find({
      where: {
        status: OnlineOrderQueueStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
    });

    for (const entry of expiredEntries) {
      await this.expireOrder(entry.id);
    }

    return expiredEntries.length;
  }

  // ============ REALTIME EVENT EMITTERS ============

  private emitOrderReceived(businessId: string, entry: OnlineOrderQueue, order: Order): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'online_order:received' as RealtimeEvent,
      {
        queueEntryId: entry.id,
        orderId: entry.orderId,
        orderNumber: order.formattedNumber,
        total: Number(order.total),
        expiresAt: entry.expiresAt.toISOString(),
        remainingSeconds: entry.remainingSeconds,
        customerName: order.customer?.name || order.guestName || 'Guest',
        itemCount: order.items?.length || 0,
      }
    );

    // Play alert sound on POS
    realtimeService.broadcastToBusiness(
      businessId,
      'system:alert' as RealtimeEvent,
      {
        type: 'new_online_order',
        message: `New online order #${order.formattedNumber}`,
        urgent: true,
      }
    );
  }

  private emitOrderReminder(businessId: string, entry: OnlineOrderQueue, isUrgent: boolean): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'online_order:reminder' as RealtimeEvent,
      {
        queueEntryId: entry.id,
        orderId: entry.orderId,
        remainingSeconds: entry.remainingSeconds,
        isUrgent,
        message: isUrgent
          ? `URGENT: Order expiring in ${entry.remainingTimeFormatted}!`
          : `Order awaiting acceptance - ${entry.remainingTimeFormatted} remaining`,
      }
    );
  }

  private emitOrderAccepted(businessId: string, entry: OnlineOrderQueue, order: Order): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'online_order:accepted' as RealtimeEvent,
      {
        queueEntryId: entry.id,
        orderId: entry.orderId,
        orderNumber: order.formattedNumber,
        acceptedAt: entry.acceptedAt?.toISOString(),
      }
    );
  }

  private emitOrderRejected(businessId: string, entry: OnlineOrderQueue): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'online_order:rejected' as RealtimeEvent,
      {
        queueEntryId: entry.id,
        orderId: entry.orderId,
        reason: entry.rejectionReason,
      }
    );
  }

  private emitOrderExpired(businessId: string, entry: OnlineOrderQueue): void {
    realtimeService.broadcastToBusiness(
      businessId,
      'online_order:expired' as RealtimeEvent,
      {
        queueEntryId: entry.id,
        orderId: entry.orderId,
      }
    );
  }
}

export const onlineOrderQueueService = new OnlineOrderQueueService();
export default onlineOrderQueueService;
