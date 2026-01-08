import { JobData } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../constants';

// Job Data Types
export interface UpdateInventoryData extends JobData {
  productId: string;
  businessId: string;
  quantityChange: number; // Negative for deduction, positive for addition
  reason: string;
  orderId?: string;
}

export interface LowStockAlertData extends JobData {
  productId: string;
  productName: string;
  businessId: string;
  currentQuantity: number;
  threshold: number;
}

export interface RestoreInventoryData extends JobData {
  orderId: string;
  businessId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

/**
 * Inventory Management Jobs
 */
export class InventoryJob {
  /**
   * Dispatch an inventory update job
   */
  static async updateInventory(data: UpdateInventoryData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.INVENTORY,
      JOB_NAMES.UPDATE_INVENTORY,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 2,
      }
    );
  }

  /**
   * Dispatch a low stock alert job
   */
  static async lowStockAlert(data: LowStockAlertData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.INVENTORY,
      JOB_NAMES.LOW_STOCK_ALERT,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 3,
      }
    );
  }

  /**
   * Dispatch a restore inventory job (for order cancellation)
   */
  static async restoreInventory(data: RestoreInventoryData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.INVENTORY,
      JOB_NAMES.RESTORE_INVENTORY,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 1,
      }
    );
  }

  /**
   * Dispatch bulk inventory updates
   */
  static async updateBulkInventory(items: UpdateInventoryData[]): Promise<string[]> {
    const queue = QueueFactory.getProvider();
    return queue.addBulkJobs(
      QUEUE_NAMES.INVENTORY,
      items.map((data) => ({
        name: JOB_NAMES.UPDATE_INVENTORY,
        data,
        options: DEFAULT_JOB_OPTIONS,
      }))
    );
  }
}

export default InventoryJob;
