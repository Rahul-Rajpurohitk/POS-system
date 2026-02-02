import { Queue, Worker, Job as BullJob, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
  IQueueProvider,
  JobOptions,
  JobData,
  Job,
  JobCounts,
} from '../interfaces/IQueueProvider';
import { redisConfig } from '../../config/redis';

export class BullMQProvider implements IQueueProvider {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private connection: Redis;

  constructor() {
    this.connection = new Redis(redisConfig);

    this.connection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.connection.on('connect', () => {
      console.log('Redis connected for BullMQ');
    });
  }

  async createQueue(name: string): Promise<void> {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      });

      this.queues.set(name, queue);

      // Create queue events for monitoring
      const queueEvents = new QueueEvents(name, {
        connection: this.connection.duplicate(),
      });

      queueEvents.on('completed', ({ jobId }) => {
        console.log(`[${name}] Job ${jobId} completed`);
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`[${name}] Job ${jobId} failed:`, failedReason);
      });

      this.queueEvents.set(name, queueEvents);
    }
  }

  async deleteQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.obliterate({ force: true });
      await queue.close();
      this.queues.delete(name);
    }

    const worker = this.workers.get(name);
    if (worker) {
      await worker.close();
      this.workers.delete(name);
    }

    const events = this.queueEvents.get(name);
    if (events) {
      await events.close();
      this.queueEvents.delete(name);
    }
  }

  async addJob<T extends JobData>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found. Create it first.`);
    }

    const job = await queue.add(jobName, data, {
      jobId: options?.jobId,
      delay: options?.delay,
      attempts: options?.attempts ?? 3,
      backoff: options?.backoff,
      priority: options?.priority,
      removeOnComplete: options?.removeOnComplete ?? 100,
      removeOnFail: options?.removeOnFail ?? 1000,
    });

    return job.id!;
  }

  async addBulkJobs<T extends JobData>(
    queueName: string,
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<string[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found. Create it first.`);
    }

    const bullJobs = await queue.addBulk(
      jobs.map((job) => ({
        name: job.name,
        data: job.data,
        opts: {
          delay: job.options?.delay,
          attempts: job.options?.attempts ?? 3,
          backoff: job.options?.backoff,
          priority: job.options?.priority,
          removeOnComplete: job.options?.removeOnComplete ?? 100,
          removeOnFail: job.options?.removeOnFail ?? 1000,
        },
      }))
    );

    return bullJobs.map((job) => job.id!);
  }

  async registerWorker<T extends JobData>(
    queueName: string,
    processor: (job: Job<T>) => Promise<void>,
    concurrency: number = 5
  ): Promise<void> {
    // Close existing worker if any
    const existingWorker = this.workers.get(queueName);
    if (existingWorker) {
      await existingWorker.close();
    }

    const worker = new Worker<T>(
      queueName,
      async (bullJob: BullJob<T>) => {
        // Wrap BullJob to match our interface
        const wrappedJob: Job<T> = {
          id: bullJob.id!,
          name: bullJob.name,
          data: bullJob.data,
          attemptsMade: bullJob.attemptsMade,
          progress: () => bullJob.progress as number,
          updateProgress: async (progress: number) => {
            await bullJob.updateProgress(progress);
          },
        };

        await processor(wrappedJob);
      },
      {
        connection: this.connection.duplicate(),
        concurrency,
      }
    );

    worker.on('failed', (job, err) => {
      console.error(`[${queueName}] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
    });

    worker.on('completed', (job) => {
      console.log(`[${queueName}] Job ${job.id} completed successfully`);
    });

    worker.on('error', (err) => {
      console.error(`[${queueName}] Worker error:`, err);
    });

    this.workers.set(queueName, worker);
    console.log(`[${queueName}] Worker registered with concurrency ${concurrency}`);
  }

  async pause(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      console.log(`[${queueName}] Queue paused`);
    }
  }

  async resume(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      console.log(`[${queueName}] Queue resumed`);
    }
  }

  async getJobCounts(queueName: string): Promise<JobCounts> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const counts = await queue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return false;
    }

    await job.remove();
    console.log(`[${queueName}] Job ${jobId} removed`);
    return true;
  }

  async getJob<T extends JobData>(queueName: string, jobId: string): Promise<Job<T> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const bullJob = await queue.getJob(jobId);
    if (!bullJob) {
      return null;
    }

    return {
      id: bullJob.id!,
      name: bullJob.name,
      data: bullJob.data as T,
      attemptsMade: bullJob.attemptsMade,
      progress: () => bullJob.progress as number,
      updateProgress: async (progress: number) => {
        await bullJob.updateProgress(progress);
      },
    };
  }

  async close(): Promise<void> {
    console.log('Closing BullMQ provider...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`[${name}] Worker closed`);
    }
    this.workers.clear();

    // Close all queue events
    for (const [name, events] of this.queueEvents) {
      await events.close();
    }
    this.queueEvents.clear();

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`[${name}] Queue closed`);
    }
    this.queues.clear();

    // Close Redis connection
    await this.connection.quit();
    console.log('Redis connection closed');
  }
}
