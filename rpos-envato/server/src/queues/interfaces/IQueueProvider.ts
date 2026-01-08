// Queue Provider Interface - Abstraction for different queue implementations
// Currently supports BullMQ (local), designed for easy AWS SQS migration

export interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  priority?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface JobData {
  [key: string]: any;
}

export interface Job<T = JobData> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
  progress(): number;
  updateProgress(progress: number): Promise<void>;
}

export interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface IQueueProvider {
  // Queue Management
  createQueue(name: string): Promise<void>;
  deleteQueue(name: string): Promise<void>;

  // Job Operations
  addJob<T extends JobData>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<string>;

  addBulkJobs<T extends JobData>(
    queueName: string,
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<string[]>;

  // Worker Operations
  registerWorker<T extends JobData>(
    queueName: string,
    processor: (job: Job<T>) => Promise<void>,
    concurrency?: number
  ): Promise<void>;

  // Queue Operations
  pause(queueName: string): Promise<void>;
  resume(queueName: string): Promise<void>;
  getJobCounts(queueName: string): Promise<JobCounts>;

  // Cleanup
  close(): Promise<void>;
}
