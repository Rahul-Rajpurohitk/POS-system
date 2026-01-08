import { JobData } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../constants';

// Job Data Types
export interface ProcessOrderData extends JobData {
  orderId: string;
  businessId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  customerId?: string;
  couponId?: string;
}

export interface CalculateOrderTotalsData extends JobData {
  orderId: string;
  subTotal: number;
  discount: number;
  tax: number;
}

/**
 * Order Processing Jobs
 */
export class OrderJob {
  /**
   * Dispatch a process order job
   */
  static async processOrder(data: ProcessOrderData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ORDERS,
      JOB_NAMES.PROCESS_ORDER,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 1, // High priority
      }
    );
  }

  /**
   * Dispatch a calculate order totals job
   */
  static async calculateTotals(data: CalculateOrderTotalsData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ORDERS,
      JOB_NAMES.CALCULATE_ORDER_TOTALS,
      data,
      DEFAULT_JOB_OPTIONS
    );
  }

  /**
   * Dispatch multiple order processing jobs
   */
  static async processBulkOrders(orders: ProcessOrderData[]): Promise<string[]> {
    const queue = QueueFactory.getProvider();
    return queue.addBulkJobs(
      QUEUE_NAMES.ORDERS,
      orders.map((data) => ({
        name: JOB_NAMES.PROCESS_ORDER,
        data,
        options: {
          ...DEFAULT_JOB_OPTIONS,
          priority: 1,
        },
      }))
    );
  }
}

export default OrderJob;
