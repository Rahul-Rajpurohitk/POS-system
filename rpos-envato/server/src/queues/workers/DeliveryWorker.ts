import { Job } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES } from '../constants';
import {
  OrderTimeoutData,
  OrderReminderData,
  AssignDriverData,
  UpdateETAData,
  DeliveryCompletedData,
  DeliveryCancelledData,
} from '../jobs/DeliveryJob';
import { onlineOrderQueueService } from '../../services/online-order-queue.service';
import { driverAssignmentService } from '../../services/driver-assignment.service';
import { deliveryService } from '../../services/delivery.service';
import { NotificationJob } from '../jobs/NotificationJob';

type DeliveryJobData =
  | OrderTimeoutData
  | OrderReminderData
  | AssignDriverData
  | UpdateETAData
  | DeliveryCompletedData
  | DeliveryCancelledData;

/**
 * Delivery Worker - Processes delivery-related jobs
 */
export class DeliveryWorker {
  /**
   * Initialize the delivery worker
   */
  static async initialize(): Promise<void> {
    const queue = QueueFactory.getProvider();

    await queue.registerWorker<DeliveryJobData>(
      QUEUE_NAMES.DELIVERY,
      async (job: Job<DeliveryJobData>) => {
        console.log(`[DeliveryWorker] Processing job: ${job.name} (${job.id})`);

        try {
          switch (job.name) {
            case JOB_NAMES.ONLINE_ORDER_TIMEOUT:
              await DeliveryWorker.handleOrderTimeout(job as Job<OrderTimeoutData>);
              break;

            case JOB_NAMES.ONLINE_ORDER_REMINDER:
              await DeliveryWorker.handleOrderReminder(job as Job<OrderReminderData>);
              break;

            case JOB_NAMES.ASSIGN_DRIVER:
              await DeliveryWorker.handleAssignDriver(job as Job<AssignDriverData>);
              break;

            case JOB_NAMES.UPDATE_DELIVERY_ETA:
              await DeliveryWorker.handleUpdateETA(job as Job<UpdateETAData>);
              break;

            case JOB_NAMES.DELIVERY_COMPLETED:
              await DeliveryWorker.handleDeliveryCompleted(job as Job<DeliveryCompletedData>);
              break;

            case JOB_NAMES.DELIVERY_CANCELLED:
              await DeliveryWorker.handleDeliveryCancelled(job as Job<DeliveryCancelledData>);
              break;

            default:
              console.warn(`[DeliveryWorker] Unknown job: ${job.name}`);
          }
        } catch (error) {
          console.error(`[DeliveryWorker] Error processing job ${job.name}:`, error);
          throw error;
        }
      },
      3 // concurrency
    );

    console.log('[DeliveryWorker] Initialized');
  }

  /**
   * Handle order timeout (15-minute window expired)
   */
  private static async handleOrderTimeout(job: Job<OrderTimeoutData>): Promise<void> {
    const { queueEntryId, orderId, businessId } = job.data;

    await job.updateProgress(10);

    console.log(`[DeliveryWorker] Processing order timeout for ${queueEntryId}`);

    // Expire the order
    const expiredEntry = await onlineOrderQueueService.expireOrder(queueEntryId);

    await job.updateProgress(50);

    if (expiredEntry) {
      // Send notification to customer about order cancellation
      // In a real implementation, you'd fetch customer details and send email/SMS
      console.log(`[DeliveryWorker] Order ${orderId} expired and cancelled`);
    }

    await job.updateProgress(100);
  }

  /**
   * Handle order reminder
   */
  private static async handleOrderReminder(job: Job<OrderReminderData>): Promise<void> {
    const { queueEntryId, businessId, isUrgent } = job.data;

    await job.updateProgress(50);

    console.log(`[DeliveryWorker] Sending ${isUrgent ? 'urgent' : 'normal'} reminder for ${queueEntryId}`);

    await onlineOrderQueueService.sendReminder(queueEntryId, isUrgent);

    await job.updateProgress(100);
  }

  /**
   * Handle driver assignment
   */
  private static async handleAssignDriver(job: Job<AssignDriverData>): Promise<void> {
    const { deliveryId, businessId, autoAssign } = job.data;

    await job.updateProgress(10);

    console.log(`[DeliveryWorker] Processing driver assignment for delivery ${deliveryId}`);

    if (autoAssign) {
      const result = await driverAssignmentService.autoAssignDriver(deliveryId, businessId);

      await job.updateProgress(80);

      if (result.assigned) {
        console.log(`[DeliveryWorker] Auto-assigned driver ${result.driverName} to delivery ${deliveryId}`);
      } else {
        console.log(`[DeliveryWorker] Could not auto-assign driver: ${result.reason}`);
      }
    }

    await job.updateProgress(100);
  }

  /**
   * Handle ETA update
   */
  private static async handleUpdateETA(job: Job<UpdateETAData>): Promise<void> {
    const {
      deliveryId,
      driverLatitude,
      driverLongitude,
      destinationLatitude,
      destinationLongitude,
    } = job.data;

    await job.updateProgress(20);

    // In a full implementation, this would call a routing service (Mapbox/OSRM)
    // For now, estimate based on straight-line distance
    const distance = DeliveryWorker.calculateDistance(
      driverLatitude,
      driverLongitude,
      destinationLatitude,
      destinationLongitude
    );

    await job.updateProgress(60);

    // Estimate ~3 min per km average speed
    const estimatedSeconds = Math.round((distance / 1000) * 180);
    const estimatedArrival = new Date(Date.now() + estimatedSeconds * 1000);

    await deliveryService.updateDeliveryETA(deliveryId, estimatedArrival, estimatedSeconds);

    await job.updateProgress(100);

    console.log(`[DeliveryWorker] Updated ETA for delivery ${deliveryId}: ${estimatedSeconds}s`);
  }

  /**
   * Handle delivery completion
   */
  private static async handleDeliveryCompleted(job: Job<DeliveryCompletedData>): Promise<void> {
    const { deliveryId, businessId, driverId } = job.data;

    await job.updateProgress(20);

    console.log(`[DeliveryWorker] Processing delivery completion for ${deliveryId}`);

    // Get delivery details for notification
    const delivery = await deliveryService.getDeliveryById(deliveryId, businessId);

    await job.updateProgress(50);

    if (delivery) {
      // Send delivery completion notification to customer
      // In real implementation, send SMS/push notification
      console.log(`[DeliveryWorker] Delivery ${deliveryId} completed. Customer: ${delivery.customerName}`);
    }

    await job.updateProgress(100);
  }

  /**
   * Handle delivery cancellation
   */
  private static async handleDeliveryCancelled(job: Job<DeliveryCancelledData>): Promise<void> {
    const { deliveryId, businessId, reason } = job.data;

    await job.updateProgress(20);

    console.log(`[DeliveryWorker] Processing delivery cancellation for ${deliveryId}`);

    // Get delivery details for notification
    const delivery = await deliveryService.getDeliveryById(deliveryId, businessId);

    await job.updateProgress(50);

    if (delivery) {
      // Send cancellation notification to customer
      console.log(`[DeliveryWorker] Delivery ${deliveryId} cancelled. Reason: ${reason || 'Unknown'}`);
    }

    await job.updateProgress(100);
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export default DeliveryWorker;
