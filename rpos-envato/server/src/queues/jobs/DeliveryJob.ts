import { JobData } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../constants';

// ============ JOB DATA TYPES ============

export interface OrderTimeoutData extends JobData {
  queueEntryId: string;
  orderId: string;
  businessId: string;
}

export interface OrderReminderData extends JobData {
  queueEntryId: string;
  orderId: string;
  businessId: string;
  isUrgent: boolean;
}

export interface AssignDriverData extends JobData {
  deliveryId: string;
  businessId: string;
  autoAssign?: boolean;
}

export interface UpdateETAData extends JobData {
  deliveryId: string;
  driverLatitude: number;
  driverLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}

export interface DeliveryCompletedData extends JobData {
  deliveryId: string;
  businessId: string;
  driverId: string;
}

export interface DeliveryCancelledData extends JobData {
  deliveryId: string;
  businessId: string;
  reason?: string;
}

/**
 * Delivery Queue Jobs - Handles delivery-related async operations
 */
export class DeliveryJob {
  /**
   * Schedule order timeout (15-minute window)
   */
  static async scheduleOrderTimeout(data: OrderTimeoutData & { delayMs: number }): Promise<string> {
    const { delayMs, ...jobData } = data;
    const queue = QueueFactory.getProvider();

    return queue.addJob(
      QUEUE_NAMES.DELIVERY,
      JOB_NAMES.ONLINE_ORDER_TIMEOUT,
      jobData,
      {
        ...DEFAULT_JOB_OPTIONS,
        delay: delayMs,
        attempts: 1, // No retries for timeout
        jobId: `timeout-${jobData.queueEntryId}`, // Unique job ID for cancellation
      }
    );
  }

  /**
   * Schedule order reminder
   */
  static async scheduleOrderReminder(data: OrderReminderData & { delayMs: number }): Promise<string> {
    const { delayMs, ...jobData } = data;
    const queue = QueueFactory.getProvider();

    return queue.addJob(
      QUEUE_NAMES.DELIVERY,
      JOB_NAMES.ONLINE_ORDER_REMINDER,
      jobData,
      {
        ...DEFAULT_JOB_OPTIONS,
        delay: delayMs,
        attempts: 1,
        jobId: `reminder-${jobData.queueEntryId}-${jobData.isUrgent ? 'urgent' : 'normal'}`,
      }
    );
  }

  /**
   * Dispatch driver assignment job
   */
  static async assignDriver(data: AssignDriverData): Promise<string> {
    const queue = QueueFactory.getProvider();

    return queue.addJob(
      QUEUE_NAMES.DELIVERY,
      JOB_NAMES.ASSIGN_DRIVER,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 1, // High priority
      }
    );
  }

  /**
   * Schedule ETA update job
   */
  static async updateETA(data: UpdateETAData): Promise<string> {
    const queue = QueueFactory.getProvider();

    return queue.addJob(
      QUEUE_NAMES.DELIVERY,
      JOB_NAMES.UPDATE_DELIVERY_ETA,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        attempts: 1,
      }
    );
  }

  /**
   * Process delivery completion
   */
  static async deliveryCompleted(data: DeliveryCompletedData): Promise<string> {
    const queue = QueueFactory.getProvider();

    return queue.addJob(
      QUEUE_NAMES.DELIVERY,
      JOB_NAMES.DELIVERY_COMPLETED,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 2,
      }
    );
  }

  /**
   * Process delivery cancellation
   */
  static async deliveryCancelled(data: DeliveryCancelledData): Promise<string> {
    const queue = QueueFactory.getProvider();

    return queue.addJob(
      QUEUE_NAMES.DELIVERY,
      JOB_NAMES.DELIVERY_CANCELLED,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 2,
      }
    );
  }

  /**
   * Cancel scheduled timeout job (when order is accepted/rejected early)
   */
  static async cancelTimeoutJob(queueEntryId: string): Promise<void> {
    const queue = QueueFactory.getProvider();
    try {
      await queue.removeJob(QUEUE_NAMES.DELIVERY, `timeout-${queueEntryId}`);
    } catch (error) {
      // Job might already be processed or not exist
      console.log(`[DeliveryJob] Could not cancel timeout job for ${queueEntryId}`);
    }
  }

  /**
   * Cancel scheduled reminder jobs
   */
  static async cancelReminderJobs(queueEntryId: string): Promise<void> {
    const queue = QueueFactory.getProvider();
    try {
      await queue.removeJob(QUEUE_NAMES.DELIVERY, `reminder-${queueEntryId}-normal`);
      await queue.removeJob(QUEUE_NAMES.DELIVERY, `reminder-${queueEntryId}-urgent`);
    } catch (error) {
      console.log(`[DeliveryJob] Could not cancel reminder jobs for ${queueEntryId}`);
    }
  }
}

export default DeliveryJob;
