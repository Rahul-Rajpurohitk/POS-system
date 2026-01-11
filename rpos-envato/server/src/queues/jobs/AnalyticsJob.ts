import { JobData } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../constants';

// Job Data Types
export interface AnalyticsJobData extends JobData {
  businessId: string;
}

export interface RefreshAnalyticsData extends AnalyticsJobData {
  force?: boolean; // Force refresh even if cache is valid
}

export interface WarmCacheData extends AnalyticsJobData {
  types?: string[]; // Specific cache types to warm
}

/**
 * Analytics Background Jobs
 * Handles scheduled analytics computations and cache management
 */
export class AnalyticsJob {
  /**
   * Dispatch job to refresh ABC classification
   * Should run daily at low-traffic hours (e.g., 3 AM)
   */
  static async refreshABCClassification(data: RefreshAnalyticsData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.REFRESH_ABC_CLASSIFICATION,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 10, // Low priority - background task
      }
    );
  }

  /**
   * Dispatch job to refresh RFM segmentation
   * Should run daily at low-traffic hours
   */
  static async refreshRFMSegmentation(data: RefreshAnalyticsData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.REFRESH_RFM_SEGMENTATION,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 10,
      }
    );
  }

  /**
   * Dispatch job to refresh peak hours analysis
   * Should run daily after business hours
   */
  static async refreshPeakHours(data: RefreshAnalyticsData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.REFRESH_PEAK_HOURS,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 10,
      }
    );
  }

  /**
   * Dispatch job to refresh inventory intelligence
   * Should run more frequently (every 30 minutes) due to stock changes
   */
  static async refreshInventoryIntelligence(data: RefreshAnalyticsData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.REFRESH_INVENTORY_INTELLIGENCE,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 8, // Slightly higher priority
      }
    );
  }

  /**
   * Dispatch job to refresh customer cohorts
   * Should run weekly (Sundays at 3 AM)
   */
  static async refreshCustomerCohorts(data: RefreshAnalyticsData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.REFRESH_CUSTOMER_COHORTS,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 10,
      }
    );
  }

  /**
   * Dispatch job to warm analytics cache
   * Pre-computes all analytics for faster access
   */
  static async warmAnalyticsCache(data: WarmCacheData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.WARM_ANALYTICS_CACHE,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5, // Higher priority for cache warming
      }
    );
  }

  /**
   * Dispatch job to invalidate time-sensitive cache
   * Called after order completion to refresh dashboards
   */
  static async invalidateTimeSensitive(data: AnalyticsJobData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.INVALIDATE_TIME_SENSITIVE,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 3, // High priority for real-time updates
        attempts: 1, // Only try once - cache invalidation is not critical
      }
    );
  }

  /**
   * Schedule daily analytics refresh for a business
   * Sets up delayed jobs for overnight processing
   */
  static async scheduleNightlyRefresh(
    businessId: string,
    delayMs: number
  ): Promise<string[]> {
    const queue = QueueFactory.getProvider();
    const jobIds: string[] = [];

    const data: RefreshAnalyticsData = { businessId, force: true };
    const options = {
      ...DEFAULT_JOB_OPTIONS,
      delay: delayMs,
      priority: 10,
    };

    // Schedule all refresh jobs
    const jobs = [
      { name: JOB_NAMES.REFRESH_ABC_CLASSIFICATION },
      { name: JOB_NAMES.REFRESH_RFM_SEGMENTATION },
      { name: JOB_NAMES.REFRESH_PEAK_HOURS },
      { name: JOB_NAMES.REFRESH_INVENTORY_INTELLIGENCE },
      { name: JOB_NAMES.REFRESH_CUSTOMER_COHORTS },
    ];

    for (const job of jobs) {
      const jobId = await queue.addJob(
        QUEUE_NAMES.ANALYTICS,
        job.name,
        data,
        { ...options, delay: delayMs + jobs.indexOf(job) * 60000 } // Stagger by 1 minute
      );
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Refresh all analytics immediately (for data import scenarios)
   */
  static async refreshAllAnalytics(businessId: string): Promise<string[]> {
    const data: RefreshAnalyticsData = { businessId, force: true };

    const jobIds = await Promise.all([
      this.refreshABCClassification(data),
      this.refreshRFMSegmentation(data),
      this.refreshPeakHours(data),
      this.refreshInventoryIntelligence(data),
      this.refreshCustomerCohorts(data),
    ]);

    return jobIds;
  }
}

export default AnalyticsJob;
