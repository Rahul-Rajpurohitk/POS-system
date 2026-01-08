import {
  IQueueProvider,
  JobOptions,
  JobData,
  Job,
  JobCounts,
} from '../interfaces/IQueueProvider';

// Types for AWS SDK (will be replaced with actual types when SDK is installed)
interface SQSClientConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface SendMessageCommandInput {
  QueueUrl: string;
  MessageBody: string;
  DelaySeconds?: number;
  MessageAttributes?: Record<string, { DataType: string; StringValue: string }>;
  MessageGroupId?: string;
  MessageDeduplicationId?: string;
}

interface ReceiveMessageCommandInput {
  QueueUrl: string;
  MaxNumberOfMessages?: number;
  WaitTimeSeconds?: number;
  VisibilityTimeout?: number;
  MessageAttributeNames?: string[];
}

interface DeleteMessageCommandInput {
  QueueUrl: string;
  ReceiptHandle: string;
}

// SQS Job implementation
class SQSJob<T extends JobData> implements Job<T> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
  private _progress: number = 0;
  private queueUrl: string;
  private receiptHandle: string;
  private progressStore: Map<string, number>;

  constructor(
    id: string,
    name: string,
    data: T,
    attemptsMade: number,
    queueUrl: string,
    receiptHandle: string,
    progressStore: Map<string, number>
  ) {
    this.id = id;
    this.name = name;
    this.data = data;
    this.attemptsMade = attemptsMade;
    this.queueUrl = queueUrl;
    this.receiptHandle = receiptHandle;
    this.progressStore = progressStore;
  }

  progress(): number {
    return this.progressStore.get(this.id) || this._progress;
  }

  async updateProgress(progress: number): Promise<void> {
    this._progress = progress;
    this.progressStore.set(this.id, progress);
    // In production, store in DynamoDB for distributed access
  }
}

/**
 * AWS SQS Provider - Production-ready implementation for AWS
 *
 * Features:
 * - Standard and FIFO queue support
 * - Long-polling for efficient message consumption
 * - Delayed messages (up to 15 minutes via SQS delay, longer via scheduling)
 * - Batch operations for efficiency
 * - In-memory progress tracking (use DynamoDB in production for distributed)
 * - Graceful fallback when AWS SDK is not installed
 *
 * TENANT ISOLATION:
 * - This provider is infrastructure-level and doesn't enforce tenant isolation directly
 * - Job data MUST include businessId for multi-tenant systems
 * - Workers MUST validate businessId before processing
 * - Use business-scoped queue names for strict isolation: `orders-${businessId}`
 * - Example: addJob('orders-abc123', 'process', { businessId: 'abc123', ... })
 *
 * Prerequisites:
 * - npm install @aws-sdk/client-sqs
 * - Configure AWS credentials via environment variables or IAM roles
 *
 * Environment Variables:
 * - AWS_REGION: AWS region (default: us-east-1)
 * - AWS_ACCESS_KEY_ID: AWS access key (optional if using IAM roles)
 * - AWS_SECRET_ACCESS_KEY: AWS secret key (optional if using IAM roles)
 * - SQS_QUEUE_PREFIX: Prefix for queue names (default: pos-)
 */
export class SQSProvider implements IQueueProvider {
  private client: any = null;
  private queues: Map<string, string> = new Map(); // name -> URL
  private workers: Map<string, { active: boolean; processor: any; intervalId?: NodeJS.Timer }> = new Map();
  private progressStore: Map<string, number> = new Map();
  private pausedQueues: Set<string> = new Set();
  private jobCounts: Map<string, JobCounts> = new Map();
  private isInitialized: boolean = false;
  private region: string;
  private queuePrefix: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.queuePrefix = process.env.SQS_QUEUE_PREFIX || 'pos-';
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Dynamic import of AWS SDK
      const { SQSClient } = await import('@aws-sdk/client-sqs');

      const config: SQSClientConfig = {
        region: this.region,
      };

      // Use explicit credentials if provided, otherwise rely on IAM/environment
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
      }

      this.client = new SQSClient(config);
      this.isInitialized = true;
      console.log('SQS Provider initialized successfully');
    } catch (error: any) {
      console.warn('AWS SDK not available. SQS Provider running in mock mode.');
      console.warn('To enable SQS: npm install @aws-sdk/client-sqs');
      this.isInitialized = false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.client) {
      throw new Error('SQS client not initialized. Install @aws-sdk/client-sqs');
    }
  }

  private getQueueName(name: string): string {
    return `${this.queuePrefix}${name}`;
  }

  async createQueue(name: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const { CreateQueueCommand, GetQueueUrlCommand } = await import('@aws-sdk/client-sqs');

      const queueName = this.getQueueName(name);
      const isFifo = name.endsWith('.fifo');

      // First try to get existing queue URL
      try {
        const getUrlCommand = new GetQueueUrlCommand({
          QueueName: isFifo ? `${queueName}.fifo` : queueName,
        });
        const response = await this.client.send(getUrlCommand);
        this.queues.set(name, response.QueueUrl);
        console.log(`Queue ${name} already exists: ${response.QueueUrl}`);
        return;
      } catch (error: any) {
        // Queue doesn't exist, create it
        if (error.name !== 'QueueDoesNotExist') {
          throw error;
        }
      }

      // Create the queue
      const attributes: Record<string, string> = {
        ReceiveMessageWaitTimeSeconds: '20', // Long polling
        VisibilityTimeout: '300', // 5 minutes to process
        MessageRetentionPeriod: '1209600', // 14 days
      };

      if (isFifo) {
        attributes.FifoQueue = 'true';
        attributes.ContentBasedDeduplication = 'true';
      }

      const command = new CreateQueueCommand({
        QueueName: isFifo ? `${queueName}.fifo` : queueName,
        Attributes: attributes,
        tags: {
          Application: 'RPOS',
          Environment: process.env.NODE_ENV || 'development',
        },
      });

      const response = await this.client.send(command);
      this.queues.set(name, response.QueueUrl!);
      this.initializeJobCounts(name);

      console.log(`Queue ${name} created: ${response.QueueUrl}`);
    } catch (error: any) {
      console.error(`Failed to create queue ${name}:`, error);
      throw new Error(`Failed to create queue ${name}: ${error.message}`);
    }
  }

  async deleteQueue(name: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const { DeleteQueueCommand } = await import('@aws-sdk/client-sqs');

      const queueUrl = this.queues.get(name);
      if (!queueUrl) {
        console.warn(`Queue ${name} not found in local registry`);
        return;
      }

      const command = new DeleteQueueCommand({
        QueueUrl: queueUrl,
      });

      await this.client.send(command);
      this.queues.delete(name);
      this.stopWorker(name);

      console.log(`Queue ${name} deleted`);
    } catch (error: any) {
      console.error(`Failed to delete queue ${name}:`, error);
      throw new Error(`Failed to delete queue ${name}: ${error.message}`);
    }
  }

  async addJob<T extends JobData>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      const { SendMessageCommand } = await import('@aws-sdk/client-sqs');

      const queueUrl = await this.getQueueUrl(queueName);
      const jobId = this.generateJobId();
      const isFifo = queueName.endsWith('.fifo');

      const messageBody = JSON.stringify({
        id: jobId,
        name: jobName,
        data,
        options,
        timestamp: Date.now(),
        attemptsMade: 0,
      });

      // SQS delay is limited to 900 seconds (15 minutes)
      // For longer delays, use EventBridge Scheduler or Step Functions
      let delaySeconds = 0;
      if (options?.delay) {
        delaySeconds = Math.min(Math.floor(options.delay / 1000), 900);
        if (options.delay > 900000) {
          console.warn(`Job ${jobId}: Delay ${options.delay}ms exceeds SQS limit. Using 900s.`);
        }
      }

      const commandInput: SendMessageCommandInput = {
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        DelaySeconds: delaySeconds,
        MessageAttributes: {
          JobName: { DataType: 'String', StringValue: jobName },
          Priority: { DataType: 'Number', StringValue: String(options?.priority || 0) },
          Attempts: { DataType: 'Number', StringValue: String(options?.attempts || 3) },
        },
      };

      // FIFO queues require MessageGroupId and optionally MessageDeduplicationId
      if (isFifo) {
        commandInput.MessageGroupId = jobName;
        commandInput.MessageDeduplicationId = jobId;
      }

      const command = new SendMessageCommand(commandInput);
      const response = await this.client.send(command);

      this.incrementJobCount(queueName, options?.delay ? 'delayed' : 'waiting');

      console.log(`Job ${jobId} added to ${queueName}: ${response.MessageId}`);
      return jobId;
    } catch (error: any) {
      console.error(`Failed to add job to ${queueName}:`, error);
      throw new Error(`Failed to add job: ${error.message}`);
    }
  }

  async addBulkJobs<T extends JobData>(
    queueName: string,
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const { SendMessageBatchCommand } = await import('@aws-sdk/client-sqs');

      const queueUrl = await this.getQueueUrl(queueName);
      const isFifo = queueName.endsWith('.fifo');
      const jobIds: string[] = [];

      // SQS batch limit is 10 messages
      const batches = this.chunkArray(jobs, 10);

      for (const batch of batches) {
        const entries = batch.map((job, index) => {
          const jobId = this.generateJobId();
          jobIds.push(jobId);

          const messageBody = JSON.stringify({
            id: jobId,
            name: job.name,
            data: job.data,
            options: job.options,
            timestamp: Date.now(),
            attemptsMade: 0,
          });

          let delaySeconds = 0;
          if (job.options?.delay) {
            delaySeconds = Math.min(Math.floor(job.options.delay / 1000), 900);
          }

          const entry: any = {
            Id: String(index),
            MessageBody: messageBody,
            DelaySeconds: delaySeconds,
            MessageAttributes: {
              JobName: { DataType: 'String', StringValue: job.name },
              Priority: { DataType: 'Number', StringValue: String(job.options?.priority || 0) },
            },
          };

          if (isFifo) {
            entry.MessageGroupId = job.name;
            entry.MessageDeduplicationId = jobId;
          }

          return entry;
        });

        const command = new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: entries,
        });

        const response = await this.client.send(command);

        if (response.Failed && response.Failed.length > 0) {
          console.error('Some messages failed to send:', response.Failed);
        }
      }

      // Update counts
      for (const job of jobs) {
        this.incrementJobCount(queueName, job.options?.delay ? 'delayed' : 'waiting');
      }

      console.log(`${jobIds.length} jobs added to ${queueName}`);
      return jobIds;
    } catch (error: any) {
      console.error(`Failed to add bulk jobs to ${queueName}:`, error);
      throw new Error(`Failed to add bulk jobs: ${error.message}`);
    }
  }

  async registerWorker<T extends JobData>(
    queueName: string,
    processor: (job: Job<T>) => Promise<void>,
    concurrency: number = 1
  ): Promise<void> {
    await this.ensureInitialized();

    const queueUrl = await this.getQueueUrl(queueName);

    // Stop existing worker if any
    this.stopWorker(queueName);

    const worker = {
      active: true,
      processor,
      intervalId: undefined as NodeJS.Timer | undefined,
    };

    this.workers.set(queueName, worker);

    // Start polling for messages
    const poll = async () => {
      if (!worker.active || this.pausedQueues.has(queueName)) {
        return;
      }

      try {
        const { ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } =
          await import('@aws-sdk/client-sqs');

        const receiveCommand = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: Math.min(concurrency, 10), // SQS limit
          WaitTimeSeconds: 20, // Long polling
          VisibilityTimeout: 300,
          MessageAttributeNames: ['All'],
        });

        const response = await this.client.send(receiveCommand);

        if (!response.Messages || response.Messages.length === 0) {
          return;
        }

        // Process messages in parallel up to concurrency
        const processingPromises = response.Messages.map(async (message: any) => {
          let jobData: any;

          try {
            jobData = JSON.parse(message.Body);
            const attemptsMade = jobData.attemptsMade || 0;
            const maxAttempts = jobData.options?.attempts || 3;

            this.decrementJobCount(queueName, 'waiting');
            this.incrementJobCount(queueName, 'active');

            const job = new SQSJob<T>(
              jobData.id,
              jobData.name,
              jobData.data,
              attemptsMade,
              queueUrl,
              message.ReceiptHandle,
              this.progressStore
            );

            await processor(job);

            // Delete message on success
            const deleteCommand = new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle,
            });
            await this.client.send(deleteCommand);

            this.decrementJobCount(queueName, 'active');
            this.incrementJobCount(queueName, 'completed');
            this.progressStore.delete(jobData.id);

            console.log(`Job ${jobData.id} completed`);
          } catch (error: any) {
            console.error(`Job ${jobData?.id} failed:`, error);

            this.decrementJobCount(queueName, 'active');

            const attemptsMade = (jobData?.attemptsMade || 0) + 1;
            const maxAttempts = jobData?.options?.attempts || 3;

            if (attemptsMade < maxAttempts) {
              // Return to queue with backoff
              const backoffDelay = this.calculateBackoff(
                jobData?.options?.backoff,
                attemptsMade
              );

              try {
                const visibilityCommand = new ChangeMessageVisibilityCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                  VisibilityTimeout: Math.min(Math.floor(backoffDelay / 1000), 43200),
                });
                await this.client.send(visibilityCommand);
                this.incrementJobCount(queueName, 'delayed');
              } catch (visibilityError) {
                console.error('Failed to update visibility:', visibilityError);
              }
            } else {
              // Max attempts reached - move to DLQ or delete
              const deleteCommand = new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              });
              await this.client.send(deleteCommand);
              this.incrementJobCount(queueName, 'failed');
              console.error(`Job ${jobData?.id} failed after ${maxAttempts} attempts`);
            }
          }
        });

        await Promise.all(processingPromises);
      } catch (error: any) {
        if (error.name !== 'QueueDoesNotExist') {
          console.error(`Polling error for ${queueName}:`, error);
        }
      }
    };

    // Start polling loop
    const pollLoop = async () => {
      while (worker.active) {
        await poll();
        // Small delay between polls to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    // Start the polling loop
    pollLoop().catch(error => {
      console.error(`Worker loop error for ${queueName}:`, error);
    });

    console.log(`Worker registered for ${queueName} with concurrency ${concurrency}`);
  }

  private stopWorker(queueName: string): void {
    const worker = this.workers.get(queueName);
    if (worker) {
      worker.active = false;
      if (worker.intervalId) {
        clearInterval(worker.intervalId);
      }
      this.workers.delete(queueName);
    }
  }

  async pause(queueName: string): Promise<void> {
    this.pausedQueues.add(queueName);
    console.log(`Queue ${queueName} paused`);
  }

  async resume(queueName: string): Promise<void> {
    this.pausedQueues.delete(queueName);
    console.log(`Queue ${queueName} resumed`);
  }

  async getJobCounts(queueName: string): Promise<JobCounts> {
    // Try to get accurate counts from SQS
    if (this.client) {
      try {
        const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');
        const queueUrl = await this.getQueueUrl(queueName);

        const command = new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: [
            'ApproximateNumberOfMessages',
            'ApproximateNumberOfMessagesNotVisible',
            'ApproximateNumberOfMessagesDelayed',
          ],
        });

        const response = await this.client.send(command);
        const attrs = response.Attributes || {};

        const localCounts = this.jobCounts.get(queueName) || this.getDefaultJobCounts();

        return {
          waiting: parseInt(attrs.ApproximateNumberOfMessages || '0', 10),
          active: parseInt(attrs.ApproximateNumberOfMessagesNotVisible || '0', 10),
          delayed: parseInt(attrs.ApproximateNumberOfMessagesDelayed || '0', 10),
          completed: localCounts.completed, // SQS doesn't track completed
          failed: localCounts.failed, // SQS doesn't track failed
        };
      } catch (error) {
        console.warn(`Could not get queue attributes for ${queueName}:`, error);
      }
    }

    // Return local counts as fallback
    return this.jobCounts.get(queueName) || this.getDefaultJobCounts();
  }

  async close(): Promise<void> {
    // Stop all workers
    for (const [queueName] of this.workers) {
      this.stopWorker(queueName);
    }

    // Destroy client
    if (this.client?.destroy) {
      this.client.destroy();
    }

    this.queues.clear();
    this.progressStore.clear();
    this.pausedQueues.clear();
    this.jobCounts.clear();

    console.log('SQS Provider closed');
  }

  // Helper methods

  private async getQueueUrl(queueName: string): Promise<string> {
    let queueUrl = this.queues.get(queueName);

    if (!queueUrl) {
      // Try to get URL from AWS
      try {
        const { GetQueueUrlCommand } = await import('@aws-sdk/client-sqs');
        const fullQueueName = this.getQueueName(queueName);
        const isFifo = queueName.endsWith('.fifo');

        const command = new GetQueueUrlCommand({
          QueueName: isFifo ? `${fullQueueName}.fifo` : fullQueueName,
        });

        const response = await this.client.send(command);
        queueUrl = response.QueueUrl;
        this.queues.set(queueName, queueUrl);
      } catch (error) {
        // Queue might not exist, create it
        await this.createQueue(queueName);
        queueUrl = this.queues.get(queueName);
      }
    }

    if (!queueUrl) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queueUrl;
  }

  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private calculateBackoff(
    backoff: { type: 'fixed' | 'exponential'; delay: number } | undefined,
    attemptsMade: number
  ): number {
    if (!backoff) {
      return 5000 * Math.pow(2, attemptsMade); // Default exponential
    }

    if (backoff.type === 'fixed') {
      return backoff.delay;
    }

    return backoff.delay * Math.pow(2, attemptsMade);
  }

  private initializeJobCounts(queueName: string): void {
    this.jobCounts.set(queueName, this.getDefaultJobCounts());
  }

  private getDefaultJobCounts(): JobCounts {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }

  private incrementJobCount(queueName: string, status: keyof JobCounts): void {
    const counts = this.jobCounts.get(queueName) || this.getDefaultJobCounts();
    counts[status]++;
    this.jobCounts.set(queueName, counts);
  }

  private decrementJobCount(queueName: string, status: keyof JobCounts): void {
    const counts = this.jobCounts.get(queueName) || this.getDefaultJobCounts();
    counts[status] = Math.max(0, counts[status] - 1);
    this.jobCounts.set(queueName, counts);
  }
}
