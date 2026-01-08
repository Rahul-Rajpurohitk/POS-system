// Queue System Exports

// Interfaces
export * from './interfaces';

// Constants
export * from './constants';

// Factory
export { QueueFactory } from './QueueFactory';

// Jobs
export * from './jobs';

// Workers
export * from './workers';

// Providers (for advanced usage)
export { BullMQProvider } from './providers/BullMQProvider';
export { SQSProvider } from './providers/SQSProvider';

/**
 * Initialize the queue system
 *
 * Usage in app startup:
 *   import { initializeQueues } from './queues';
 *   await initializeQueues();
 */
export async function initializeQueues(): Promise<void> {
  const { QueueFactory } = await import('./QueueFactory');
  const { initializeWorkers } = await import('./workers');

  // Create all queues
  await QueueFactory.initialize();

  // Initialize all workers
  await initializeWorkers();

  console.log('Queue system fully initialized');
}

/**
 * Shutdown the queue system gracefully
 */
export async function shutdownQueues(): Promise<void> {
  const { QueueFactory } = await import('./QueueFactory');
  await QueueFactory.close();
  console.log('Queue system shut down');
}
