import { Job } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES } from '../constants';
import { ProcessOrderData, CalculateOrderTotalsData } from '../jobs/OrderJob';
import { InventoryJob } from '../jobs/InventoryJob';
import { NotificationJob } from '../jobs/NotificationJob';
import { AppDataSource } from '../../config/database';
import { Product } from '../../entities/Product.entity';
import { Order } from '../../entities/Order.entity';
import { Customer } from '../../entities/Customer.entity';

type OrderJobData = ProcessOrderData | CalculateOrderTotalsData;

/**
 * Order Worker - Processes order-related jobs
 */
export class OrderWorker {
  /**
   * Initialize the order worker
   */
  static async initialize(): Promise<void> {
    const queue = QueueFactory.getProvider();

    await queue.registerWorker<OrderJobData>(
      QUEUE_NAMES.ORDERS,
      async (job: Job<OrderJobData>) => {
        console.log(`[OrderWorker] Processing job: ${job.name} (${job.id})`);

        switch (job.name) {
          case JOB_NAMES.PROCESS_ORDER:
            await OrderWorker.processOrder(job as Job<ProcessOrderData>);
            break;
          case JOB_NAMES.CALCULATE_ORDER_TOTALS:
            await OrderWorker.calculateTotals(job as Job<CalculateOrderTotalsData>);
            break;
          default:
            console.warn(`[OrderWorker] Unknown job: ${job.name}`);
        }
      },
      5 // concurrency
    );

    console.log('[OrderWorker] Initialized');
  }

  /**
   * Process a new order
   */
  private static async processOrder(job: Job<ProcessOrderData>): Promise<void> {
    const { orderId, businessId, items, customerId } = job.data;

    await job.updateProgress(10);

    const productRepository = AppDataSource.getRepository(Product);
    const orderRepository = AppDataSource.getRepository(Order);

    // Get the order
    const order = await orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    await job.updateProgress(20);

    // Process inventory updates for each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Dispatch inventory update job
      await InventoryJob.updateInventory({
        productId: item.productId,
        businessId,
        quantityChange: -item.quantity,
        reason: `Order #${order.formattedNumber}`,
        orderId,
      });

      // Update product selling info
      await productRepository
        .createQueryBuilder()
        .update(Product)
        .set({
          soldQuantity: () => `sold_quantity + ${item.quantity}`,
          soldAmount: () => `sold_amount + ${item.quantity * item.unitPrice}`,
          profit: () => `profit + (${item.quantity} * (selling_price - purchase_price))`,
        })
        .where('id = :id', { id: item.productId })
        .execute();

      await job.updateProgress(20 + ((i + 1) / items.length) * 60);
    }

    await job.updateProgress(85);

    // Send order confirmation if customer email exists
    if (customerId) {
      const customerRepository = AppDataSource.getRepository(Customer);
      const customer = await customerRepository.findOne({ where: { id: customerId } });

      if (customer?.email) {
        await NotificationJob.sendOrderConfirmation({
          orderId,
          businessId,
          customerEmail: customer.email,
          customerName: customer.name,
          orderNumber: order.formattedNumber,
          total: Number(order.total),
          items: items.map((item) => ({
            name: item.productId, // Should be resolved to product name
            quantity: item.quantity,
            price: item.unitPrice,
          })),
        });
      }
    }

    await job.updateProgress(100);
    console.log(`[OrderWorker] Order ${orderId} processed successfully`);
  }

  /**
   * Calculate order totals
   */
  private static async calculateTotals(job: Job<CalculateOrderTotalsData>): Promise<void> {
    const { orderId, subTotal, discount, tax } = job.data;

    await job.updateProgress(50);

    const orderRepository = AppDataSource.getRepository(Order);
    const total = subTotal - discount + (subTotal * tax) / 100;

    await orderRepository.update(orderId, {
      subTotal,
      discount,
      total,
    });

    await job.updateProgress(100);
    console.log(`[OrderWorker] Order ${orderId} totals calculated`);
  }
}

export default OrderWorker;
