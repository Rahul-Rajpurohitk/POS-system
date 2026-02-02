import { Log, ILog } from '../models/Log.model';
import { LogType } from '../types/enums';
import { User } from '../entities/User.entity';
import { Product } from '../entities/Product.entity';
import { Order } from '../entities/Order.entity';

/**
 * Log Service - Handles activity logging (using MongoDB)
 */
export class LogService {
  /**
   * Helper to pad order number
   */
  private zeroPad(num: number, places: number = 6): string {
    return String(num).padStart(places, '0');
  }

  /**
   * Create log for new product
   */
  async createNewProduct(product: Product, user: User): Promise<ILog> {
    const content = `<p><b>${user.firstName}</b> created <b>${product.name}</b>.</p>`;

    const log = new Log({
      type: LogType.NEW_PRODUCT,
      userId: user.id,
      userName: user.fullName,
      payload: { productId: product.id },
      businessId: user.businessId,
      content,
    });

    return log.save();
  }

  /**
   * Create log for product edit
   */
  async editProduct(product: Product, user: User): Promise<ILog> {
    const content = `<p><b>${user.firstName}</b> changed <b>${product.name}</b>.</p>`;

    const log = new Log({
      type: LogType.EDIT_PRODUCT,
      userId: user.id,
      userName: user.fullName,
      payload: { productId: product.id },
      businessId: user.businessId,
      content,
    });

    return log.save();
  }

  /**
   * Create log for new order
   */
  async createNewOrder(order: Order, user: User): Promise<ILog> {
    const content = `<p><b>${user.firstName}</b> created order <b>${this.zeroPad(order.number)}</b>.</p>`;

    const log = new Log({
      type: LogType.NEW_ORDER,
      userId: user.id,
      userName: user.fullName,
      payload: { orderId: order.id },
      businessId: user.businessId,
      content,
    });

    return log.save();
  }

  /**
   * Get logs for a business
   */
  async getBusinessLogs(
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: ILog[]; total: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      Log.find({ businessId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Log.countDocuments({ businessId }),
    ]);

    return { logs, total };
  }

  /**
   * Get logs for a product
   */
  async getProductLogs(
    productId: string,
    businessId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: ILog[]; total: number }> {
    const skip = (page - 1) * limit;

    const query = {
      businessId,
      'payload.productId': productId,
    };

    const [logs, total] = await Promise.all([
      Log.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Log.countDocuments(query),
    ]);

    return { logs, total };
  }

  /**
   * Get logs for an order
   */
  async getOrderLogs(orderId: string, businessId: string): Promise<ILog[]> {
    return Log.find({
      businessId,
      'payload.orderId': orderId,
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get recent activity for a business
   */
  async getRecentActivity(businessId: string, limit: number = 10): Promise<ILog[]> {
    return Log.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Create log for order cancellation/void
   */
  async logOrderCancelled(order: Order, user: User): Promise<ILog> {
    const content = `<p><b>${user.firstName}</b> voided order <b>${this.zeroPad(order.number)}</b>.</p>`;

    const log = new Log({
      type: LogType.ORDER_CANCELLED,
      userId: user.id,
      userName: user.fullName,
      payload: { orderId: order.id, orderNumber: order.number },
      businessId: user.businessId,
      content,
    });

    return log.save();
  }

  /**
   * Create log for order refund
   */
  async logOrderRefunded(order: Order, user: User, amount: number): Promise<ILog> {
    const content = `<p><b>${user.firstName}</b> refunded <b>$${amount.toFixed(2)}</b> for order <b>${this.zeroPad(order.number)}</b>.</p>`;

    const log = new Log({
      type: LogType.ORDER_REFUNDED,
      userId: user.id,
      userName: user.fullName,
      payload: { orderId: order.id, orderNumber: order.number, amount },
      businessId: user.businessId,
      content,
    });

    return log.save();
  }

  /**
   * Create log for order payment
   */
  async logOrderPaid(order: Order, user: User, amount: number): Promise<ILog> {
    const content = `<p><b>${user.firstName}</b> completed payment of <b>$${amount.toFixed(2)}</b> for order <b>${this.zeroPad(order.number)}</b>.</p>`;

    const log = new Log({
      type: LogType.ORDER_PAID,
      userId: user.id,
      userName: user.fullName,
      payload: { orderId: order.id, orderNumber: order.number, amount },
      businessId: user.businessId,
      content,
    });

    return log.save();
  }
}

export default new LogService();
