import { IQueueProvider } from './interfaces/IQueueProvider';
import { BullMQProvider } from './providers/BullMQProvider';
import { SQSProvider } from './providers/SQSProvider';
import { QueueProvider } from '../types/enums';
import { QUEUE_NAMES } from './constants';

/**
 * Queue Factory - Creates and manages the queue provider instance
 *
 * Usage:
 *   const queue = QueueFactory.getProvider();
 *   await queue.addJob('orders', 'process-order', { orderId: '123' });
 *
 * Configuration via environment variable:
 *   QUEUE_PROVIDER=bullmq  (default, for local development)
 *   QUEUE_PROVIDER=sqs     (for AWS production)
 */
export class QueueFactory {
  private static instance: IQueueProvider | null = null;
  private static initialized: boolean = false;

  /**
   * Get the queue provider instance (singleton)
   */
  static getProvider(type?: QueueProvider): IQueueProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType =
      type ?? (process.env.QUEUE_PROVIDER as QueueProvider) ?? QueueProvider.BULLMQ;

    switch (providerType) {
      case QueueProvider.SQS:
        this.instance = new SQSProvider();
        break;
      case QueueProvider.BULLMQ:
      default:
        this.instance = new BullMQProvider();
        break;
    }

    console.log(`Queue provider initialized: ${providerType}`);
    return this.instance;
  }

  /**
   * Initialize all queues
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const provider = this.getProvider();

    // Create all queues
    for (const queueName of Object.values(QUEUE_NAMES)) {
      await provider.createQueue(queueName);
      console.log(`Queue created: ${queueName}`);
    }

    this.initialized = true;
    console.log('All queues initialized');
  }

  /**
   * Check if queue system is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Close the queue provider and clean up resources
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      this.initialized = false;
      console.log('Queue provider closed');
    }
  }

  /**
   * Get job counts for all queues
   */
  static async getAllJobCounts(): Promise<Record<string, any>> {
    const provider = this.getProvider();
    const counts: Record<string, any> = {};

    for (const queueName of Object.values(QUEUE_NAMES)) {
      try {
        counts[queueName] = await provider.getJobCounts(queueName);
      } catch (error) {
        counts[queueName] = { error: 'Failed to get counts' };
      }
    }

    return counts;
  }
}

export default QueueFactory;
