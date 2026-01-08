import { Log } from '../models/Log.model';
import { LogType } from '../types/enums';

// Audit event types for comprehensive tracking
export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_LOGIN_FAILED = 'user.login_failed',
  USER_PASSWORD_CHANGED = 'user.password_changed',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_CHANGED = 'user.role_changed',

  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_COMPLETED = 'order.completed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_ITEM_ADDED = 'order.item_added',
  ORDER_ITEM_REMOVED = 'order.item_removed',
  ORDER_ITEM_MODIFIED = 'order.item_modified',
  ORDER_DISCOUNT_APPLIED = 'order.discount_applied',

  // Payment events
  PAYMENT_PROCESSED = 'payment.processed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_VOIDED = 'payment.voided',
  PAYMENT_REFUNDED = 'payment.refunded',
  SPLIT_PAYMENT_PROCESSED = 'payment.split_processed',

  // Refund events
  REFUND_REQUESTED = 'refund.requested',
  REFUND_APPROVED = 'refund.approved',
  REFUND_REJECTED = 'refund.rejected',
  REFUND_PROCESSED = 'refund.processed',

  // Inventory events
  INVENTORY_ADJUSTED = 'inventory.adjusted',
  INVENTORY_RESERVED = 'inventory.reserved',
  INVENTORY_RELEASED = 'inventory.released',
  INVENTORY_COUNT = 'inventory.count',
  STOCK_LOW_ALERT = 'inventory.low_stock',
  STOCK_OUT_ALERT = 'inventory.out_of_stock',

  // Product events
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  PRODUCT_PRICE_CHANGED = 'product.price_changed',

  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',

  // Cash drawer events
  CASH_DRAWER_OPENED = 'cash_drawer.opened',
  CASH_DRAWER_COUNTED = 'cash_drawer.counted',
  CASH_IN = 'cash_drawer.cash_in',
  CASH_OUT = 'cash_drawer.cash_out',

  // System events
  SYSTEM_STARTUP = 'system.startup',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  SYSTEM_ERROR = 'system.error',
  CONFIG_CHANGED = 'system.config_changed',
}

// Audit log entry structure
export interface AuditLogEntry {
  eventType: AuditEventType;
  businessId: string;
  userId?: string;
  userName?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Query options for retrieving audit logs
export interface AuditQueryOptions {
  businessId: string;
  eventTypes?: AuditEventType[];
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    try {
      const logEntry = new Log({
        business: entry.businessId,
        user: entry.userId,
        type: this.mapEventTypeToLogType(entry.eventType),
        action: entry.action,
        description: entry.description,
        metadata: {
          eventType: entry.eventType,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          userName: entry.userName,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          ...entry.metadata,
        },
        createdAt: new Date(),
      });

      await logEntry.save();
    } catch (error) {
      // Don't let audit logging failures break the main flow
      console.error('Audit log error:', error);
    }
  }

  /**
   * Log user authentication event
   */
  async logAuth(
    eventType: AuditEventType,
    businessId: string,
    userId: string | undefined,
    userName: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'user',
      resourceId: userId,
      action: eventType.split('.')[1],
      description: `User ${userName} - ${eventType.split('.')[1]}`,
      metadata,
    });
  }

  /**
   * Log order event
   */
  async logOrder(
    eventType: AuditEventType,
    businessId: string,
    userId: string,
    userName: string,
    orderId: string,
    orderNumber: string,
    details?: {
      previousValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'order',
      resourceId: orderId,
      action: eventType.split('.')[1],
      description: `Order #${orderNumber} - ${eventType.split('.')[1]}`,
      previousValue: details?.previousValue,
      newValue: details?.newValue,
      metadata: details?.metadata,
    });
  }

  /**
   * Log payment event
   */
  async logPayment(
    eventType: AuditEventType,
    businessId: string,
    userId: string,
    userName: string,
    paymentId: string,
    orderId: string,
    amount: number,
    method: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'payment',
      resourceId: paymentId,
      action: eventType.split('.')[1],
      description: `Payment of ${amount} via ${method} - ${eventType.split('.')[1]}`,
      metadata: {
        orderId,
        amount,
        method,
        ...metadata,
      },
    });
  }

  /**
   * Log refund event
   */
  async logRefund(
    eventType: AuditEventType,
    businessId: string,
    userId: string,
    userName: string,
    refundId: string,
    orderId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'refund',
      resourceId: refundId,
      action: eventType.split('.')[1],
      description: `Refund of ${amount} for order - ${reason}`,
      metadata: {
        orderId,
        amount,
        reason,
        ...metadata,
      },
    });
  }

  /**
   * Log inventory event
   */
  async logInventory(
    eventType: AuditEventType,
    businessId: string,
    userId: string,
    userName: string,
    productId: string,
    productName: string,
    previousStock: number,
    newStock: number,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'inventory',
      resourceId: productId,
      action: eventType.split('.')[1],
      description: `${productName} stock: ${previousStock} → ${newStock}`,
      previousValue: { stock: previousStock },
      newValue: { stock: newStock },
      metadata: {
        productName,
        adjustment: newStock - previousStock,
        reason,
        ...metadata,
      },
    });
  }

  /**
   * Log product event
   */
  async logProduct(
    eventType: AuditEventType,
    businessId: string,
    userId: string,
    userName: string,
    productId: string,
    productName: string,
    details?: {
      previousValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'product',
      resourceId: productId,
      action: eventType.split('.')[1],
      description: `Product ${productName} - ${eventType.split('.')[1]}`,
      previousValue: details?.previousValue,
      newValue: details?.newValue,
      metadata: details?.metadata,
    });
  }

  /**
   * Log cash drawer event
   */
  async logCashDrawer(
    eventType: AuditEventType,
    businessId: string,
    userId: string,
    userName: string,
    amount?: number,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      businessId,
      userId,
      userName,
      resourceType: 'cash_drawer',
      action: eventType.split('.')[1],
      description: amount
        ? `Cash drawer - ${eventType.split('.')[1]}: ${amount}`
        : `Cash drawer - ${eventType.split('.')[1]}`,
      metadata: {
        amount,
        reason,
        ...metadata,
      },
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<{
    logs: any[];
    total: number;
    hasMore: boolean;
  }> {
    const query: any = { business: options.businessId };

    if (options.eventTypes && options.eventTypes.length > 0) {
      query['metadata.eventType'] = { $in: options.eventTypes };
    }

    if (options.userId) {
      query.user = options.userId;
    }

    if (options.resourceType) {
      query['metadata.resourceType'] = options.resourceType;
    }

    if (options.resourceId) {
      query['metadata.resourceId'] = options.resourceId;
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const [logs, total] = await Promise.all([
      Log.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('user', 'name email')
        .lean(),
      Log.countDocuments(query),
    ]);

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(
    businessId: string,
    resourceType: string,
    resourceId: string
  ): Promise<any[]> {
    const result = await this.query({
      businessId,
      resourceType,
      resourceId,
      limit: 100,
    });

    return result.logs;
  }

  /**
   * Get user activity log
   */
  async getUserActivity(
    businessId: string,
    userId: string,
    days = 30
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.query({
      businessId,
      userId,
      startDate,
      limit: 500,
    });

    return result.logs;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalEvents: number;
      byEventType: Record<string, number>;
      byUser: Array<{ userId: string; userName: string; eventCount: number }>;
      byResourceType: Record<string, number>;
    };
    securityEvents: any[];
    financialEvents: any[];
  }> {
    const allLogs = await Log.find({
      business: businessId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('user', 'name email')
      .lean();

    // Categorize events
    const byEventType: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};
    const userCounts: Record<string, { userId: string; userName: string; count: number }> = {};
    const securityEvents: any[] = [];
    const financialEvents: any[] = [];

    for (const log of allLogs) {
      const eventType = log.metadata?.eventType || 'unknown';
      const resourceType = log.metadata?.resourceType || 'unknown';
      const userId = log.user?._id?.toString() || 'system';
      const userName = (log.user as any)?.name || 'System';

      // Count by event type
      byEventType[eventType] = (byEventType[eventType] || 0) + 1;

      // Count by resource type
      byResourceType[resourceType] = (byResourceType[resourceType] || 0) + 1;

      // Count by user
      if (!userCounts[userId]) {
        userCounts[userId] = { userId, userName, count: 0 };
      }
      userCounts[userId].count++;

      // Security events
      if (
        eventType.startsWith('user.login') ||
        eventType.startsWith('user.password') ||
        eventType.startsWith('user.role')
      ) {
        securityEvents.push(log);
      }

      // Financial events
      if (
        eventType.startsWith('payment.') ||
        eventType.startsWith('refund.') ||
        eventType.startsWith('cash_drawer.')
      ) {
        financialEvents.push(log);
      }
    }

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: allLogs.length,
        byEventType,
        byUser: Object.values(userCounts)
          .map((u) => ({ userId: u.userId, userName: u.userName, eventCount: u.count }))
          .sort((a, b) => b.eventCount - a.eventCount),
        byResourceType,
      },
      securityEvents: securityEvents.slice(0, 100),
      financialEvents: financialEvents.slice(0, 100),
    };
  }

  // Helper to map new event types to existing LogType enum
  private mapEventTypeToLogType(eventType: AuditEventType): LogType {
    if (eventType.startsWith('order.created')) return LogType.NEW_ORDER;
    if (eventType.startsWith('order.completed') || eventType.startsWith('payment.')) return LogType.ORDER_PAID;
    if (eventType.startsWith('refund.')) return LogType.ORDER_REFUNDED;
    if (eventType.startsWith('order.cancelled')) return LogType.ORDER_CANCELLED;
    if (eventType.startsWith('inventory.')) return LogType.INVENTORY_ADJUSTED;
    if (eventType.startsWith('product.created')) return LogType.NEW_PRODUCT;
    if (eventType.startsWith('product.')) return LogType.EDIT_PRODUCT;
    return LogType.EDIT_PRODUCT; // Default
  }
}

export const auditService = new AuditService();
