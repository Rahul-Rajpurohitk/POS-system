import { Job } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES } from '../constants';
import {
  UpdateInventoryData,
  LowStockAlertData,
  RestoreInventoryData,
} from '../jobs/InventoryJob';
import { NotificationJob } from '../jobs/NotificationJob';
import { AppDataSource } from '../../config/database';
import { Product } from '../../entities/Product.entity';
import { User } from '../../entities/User.entity';
import { Role } from '../../types/enums';

type InventoryJobData = UpdateInventoryData | LowStockAlertData | RestoreInventoryData;

const LOW_STOCK_THRESHOLD = 10;

/**
 * Inventory Worker - Processes inventory-related jobs
 */
export class InventoryWorker {
  /**
   * Initialize the inventory worker
   */
  static async initialize(): Promise<void> {
    const queue = QueueFactory.getProvider();

    await queue.registerWorker<InventoryJobData>(
      QUEUE_NAMES.INVENTORY,
      async (job: Job<InventoryJobData>) => {
        console.log(`[InventoryWorker] Processing job: ${job.name} (${job.id})`);

        switch (job.name) {
          case JOB_NAMES.UPDATE_INVENTORY:
            await InventoryWorker.updateInventory(job as Job<UpdateInventoryData>);
            break;
          case JOB_NAMES.LOW_STOCK_ALERT:
            await InventoryWorker.sendLowStockAlert(job as Job<LowStockAlertData>);
            break;
          case JOB_NAMES.RESTORE_INVENTORY:
            await InventoryWorker.restoreInventory(job as Job<RestoreInventoryData>);
            break;
          default:
            console.warn(`[InventoryWorker] Unknown job: ${job.name}`);
        }
      },
      3 // concurrency
    );

    console.log('[InventoryWorker] Initialized');
  }

  /**
   * Update product inventory
   */
  private static async updateInventory(job: Job<UpdateInventoryData>): Promise<void> {
    const { productId, businessId, quantityChange, reason } = job.data;

    await job.updateProgress(25);

    const productRepository = AppDataSource.getRepository(Product);

    // Update quantity
    await productRepository
      .createQueryBuilder()
      .update(Product)
      .set({
        quantity: () => `quantity + ${quantityChange}`,
      })
      .where('id = :id AND business_id = :businessId', { id: productId, businessId })
      .execute();

    await job.updateProgress(50);

    // Check for low stock
    const product = await productRepository.findOne({
      where: { id: productId },
    });

    if (product && product.quantity <= LOW_STOCK_THRESHOLD) {
      // Dispatch low stock alert
      await NotificationJob.sendLowStockNotification({
        businessId,
        managerEmail: '', // Will be resolved in notification worker
        products: [
          {
            id: product.id,
            name: product.name,
            currentQuantity: product.quantity,
            threshold: LOW_STOCK_THRESHOLD,
          },
        ],
      });
    }

    await job.updateProgress(100);
    console.log(
      `[InventoryWorker] Inventory updated for product ${productId}: ${quantityChange} (${reason})`
    );
  }

  /**
   * Send low stock alert
   */
  private static async sendLowStockAlert(job: Job<LowStockAlertData>): Promise<void> {
    const { productId, productName, businessId, currentQuantity, threshold } = job.data;

    await job.updateProgress(25);

    // Find manager email for the business
    const userRepository = AppDataSource.getRepository(User);
    const manager = await userRepository.findOne({
      where: {
        businessId,
        role: Role.MANAGER,
        enabled: true,
      },
    });

    if (manager?.email) {
      await NotificationJob.sendEmail({
        to: manager.email,
        subject: `Low Stock Alert: ${productName}`,
        text: `The product "${productName}" is running low on stock.\n\nCurrent quantity: ${currentQuantity}\nThreshold: ${threshold}\n\nPlease restock soon.`,
      });
    }

    await job.updateProgress(100);
    console.log(`[InventoryWorker] Low stock alert sent for product ${productId}`);
  }

  /**
   * Restore inventory (for order cancellation)
   */
  private static async restoreInventory(job: Job<RestoreInventoryData>): Promise<void> {
    const { orderId, businessId, items } = job.data;

    await job.updateProgress(10);

    const productRepository = AppDataSource.getRepository(Product);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Restore quantity
      await productRepository
        .createQueryBuilder()
        .update(Product)
        .set({
          quantity: () => `quantity + ${item.quantity}`,
          soldQuantity: () => `sold_quantity - ${item.quantity}`,
        })
        .where('id = :id AND business_id = :businessId', {
          id: item.productId,
          businessId,
        })
        .execute();

      await job.updateProgress(10 + ((i + 1) / items.length) * 90);
    }

    console.log(`[InventoryWorker] Inventory restored for cancelled order ${orderId}`);
  }
}

export default InventoryWorker;
