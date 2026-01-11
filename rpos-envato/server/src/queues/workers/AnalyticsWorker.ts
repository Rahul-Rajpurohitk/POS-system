import { Job } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES } from '../constants';
import { AnalyticsJobData, RefreshAnalyticsData, WarmCacheData } from '../jobs/AnalyticsJob';
import { advancedAnalyticsService } from '../../services/analytics-advanced.service';
import { analyticsCacheService } from '../../services/analytics-cache.service';
import { realtimeService } from '../../services/realtime.service';

type AnalyticsWorkerJobData = AnalyticsJobData | RefreshAnalyticsData | WarmCacheData;

/**
 * Analytics Worker - Processes analytics background jobs
 * Handles cache refresh, warming, and invalidation
 */
export class AnalyticsWorker {
  /**
   * Initialize the analytics worker
   */
  static async initialize(): Promise<void> {
    const queue = QueueFactory.getProvider();

    await queue.registerWorker<AnalyticsWorkerJobData>(
      QUEUE_NAMES.ANALYTICS,
      async (job: Job<AnalyticsWorkerJobData>) => {
        console.log(`[AnalyticsWorker] Processing job: ${job.name} (${job.id})`);

        try {
          switch (job.name) {
            case JOB_NAMES.REFRESH_ABC_CLASSIFICATION:
              await AnalyticsWorker.refreshABCClassification(job as Job<RefreshAnalyticsData>);
              break;
            case JOB_NAMES.REFRESH_RFM_SEGMENTATION:
              await AnalyticsWorker.refreshRFMSegmentation(job as Job<RefreshAnalyticsData>);
              break;
            case JOB_NAMES.REFRESH_PEAK_HOURS:
              await AnalyticsWorker.refreshPeakHours(job as Job<RefreshAnalyticsData>);
              break;
            case JOB_NAMES.REFRESH_INVENTORY_INTELLIGENCE:
              await AnalyticsWorker.refreshInventoryIntelligence(job as Job<RefreshAnalyticsData>);
              break;
            case JOB_NAMES.REFRESH_CUSTOMER_COHORTS:
              await AnalyticsWorker.refreshCustomerCohorts(job as Job<RefreshAnalyticsData>);
              break;
            case JOB_NAMES.WARM_ANALYTICS_CACHE:
              await AnalyticsWorker.warmAnalyticsCache(job as Job<WarmCacheData>);
              break;
            case JOB_NAMES.INVALIDATE_TIME_SENSITIVE:
              await AnalyticsWorker.invalidateTimeSensitive(job as Job<AnalyticsJobData>);
              break;
            default:
              console.warn(`[AnalyticsWorker] Unknown job: ${job.name}`);
          }
        } catch (error) {
          console.error(`[AnalyticsWorker] Error processing ${job.name}:`, error);
          throw error; // Re-throw to trigger retry
        }
      },
      3 // Moderate concurrency for analytics processing
    );

    console.log('[AnalyticsWorker] Initialized');
  }

  /**
   * Refresh ABC Classification cache
   */
  private static async refreshABCClassification(job: Job<RefreshAnalyticsData>): Promise<void> {
    const { businessId, force } = job.data;
    const startTime = Date.now();

    await job.updateProgress(10);

    // Invalidate existing cache if force refresh
    if (force) {
      await analyticsCacheService.invalidateABCClassification(businessId);
    }

    await job.updateProgress(30);

    // Compute and cache new data
    const result = await advancedAnalyticsService.getABCClassification(businessId, undefined, false);

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    console.log(`[AnalyticsWorker] ABC Classification refreshed for ${businessId}`);
    console.log(`  - Products analyzed: ${result.totalProducts}`);
    console.log(`  - Category A: ${result.categoryA.count} products (${result.categoryA.percentage.toFixed(1)}%)`);
    console.log(`  - Duration: ${duration}ms`);

    // Notify connected clients of updated analytics
    await AnalyticsWorker.notifyAnalyticsUpdate(businessId, 'abc-classification');
  }

  /**
   * Refresh RFM Segmentation cache
   */
  private static async refreshRFMSegmentation(job: Job<RefreshAnalyticsData>): Promise<void> {
    const { businessId, force } = job.data;
    const startTime = Date.now();

    await job.updateProgress(10);

    if (force) {
      await analyticsCacheService.invalidateRFMSegmentation(businessId);
    }

    await job.updateProgress(30);

    const result = await advancedAnalyticsService.getRFMSegmentation(businessId, false);

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    console.log(`[AnalyticsWorker] RFM Segmentation refreshed for ${businessId}`);
    console.log(`  - Customers analyzed: ${result.analyzedCustomers}`);
    console.log(`  - Segments: ${result.segmentDistribution.length}`);
    console.log(`  - Duration: ${duration}ms`);

    await AnalyticsWorker.notifyAnalyticsUpdate(businessId, 'rfm-segmentation');
  }

  /**
   * Refresh Peak Hours Analysis cache
   */
  private static async refreshPeakHours(job: Job<RefreshAnalyticsData>): Promise<void> {
    const { businessId, force } = job.data;
    const startTime = Date.now();

    await job.updateProgress(10);

    if (force) {
      await analyticsCacheService.invalidatePeakHours(businessId);
    }

    await job.updateProgress(30);

    const result = await advancedAnalyticsService.getPeakHoursAnalysis(businessId, false);

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    console.log(`[AnalyticsWorker] Peak Hours Analysis refreshed for ${businessId}`);
    console.log(`  - Busiest hour: ${result.busiestHour}:00`);
    console.log(`  - Peak hours: ${result.peakHours.map(h => `${h}:00`).join(', ')}`);
    console.log(`  - Duration: ${duration}ms`);

    await AnalyticsWorker.notifyAnalyticsUpdate(businessId, 'peak-hours');
  }

  /**
   * Refresh Inventory Intelligence cache
   */
  private static async refreshInventoryIntelligence(job: Job<RefreshAnalyticsData>): Promise<void> {
    const { businessId, force } = job.data;
    const startTime = Date.now();

    await job.updateProgress(10);

    if (force) {
      await analyticsCacheService.invalidateInventoryIntelligence(businessId);
    }

    await job.updateProgress(30);

    const result = await advancedAnalyticsService.getInventoryIntelligence(businessId, false);

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    console.log(`[AnalyticsWorker] Inventory Intelligence refreshed for ${businessId}`);
    console.log(`  - Products analyzed: ${result.totalProducts}`);
    console.log(`  - Needs reorder: ${result.alerts.lowStock}`);
    console.log(`  - Dead stock: ${result.alerts.deadStock}`);
    console.log(`  - Duration: ${duration}ms`);

    await AnalyticsWorker.notifyAnalyticsUpdate(businessId, 'inventory-intelligence');
  }

  /**
   * Refresh Customer Cohorts cache
   */
  private static async refreshCustomerCohorts(job: Job<RefreshAnalyticsData>): Promise<void> {
    const { businessId, force } = job.data;
    const startTime = Date.now();

    await job.updateProgress(10);

    if (force) {
      await analyticsCacheService.invalidateCustomerCohorts(businessId);
    }

    await job.updateProgress(30);

    const result = await advancedAnalyticsService.getCustomerCohorts(businessId, false);

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    console.log(`[AnalyticsWorker] Customer Cohorts refreshed for ${businessId}`);
    console.log(`  - Cohorts analyzed: ${result.cohorts.length}`);
    console.log(`  - Overall retention: ${(result.overallRetentionRate * 100).toFixed(1)}%`);
    console.log(`  - Duration: ${duration}ms`);

    await AnalyticsWorker.notifyAnalyticsUpdate(businessId, 'customer-cohorts');
  }

  /**
   * Warm analytics cache by pre-computing all metrics
   */
  private static async warmAnalyticsCache(job: Job<WarmCacheData>): Promise<void> {
    const { businessId, types } = job.data;
    const startTime = Date.now();

    await job.updateProgress(5);

    const allTypes = ['abc', 'rfm', 'peak-hours', 'inventory', 'cohorts'];
    const typesToWarm = types && types.length > 0 ? types : allTypes;

    let completed = 0;
    const total = typesToWarm.length;

    for (const type of typesToWarm) {
      try {
        switch (type) {
          case 'abc':
            await advancedAnalyticsService.getABCClassification(businessId, undefined, false);
            break;
          case 'rfm':
            await advancedAnalyticsService.getRFMSegmentation(businessId, false);
            break;
          case 'peak-hours':
            await advancedAnalyticsService.getPeakHoursAnalysis(businessId, false);
            break;
          case 'inventory':
            await advancedAnalyticsService.getInventoryIntelligence(businessId, false);
            break;
          case 'cohorts':
            await advancedAnalyticsService.getCustomerCohorts(businessId, false);
            break;
        }
        completed++;
        await job.updateProgress(5 + (completed / total) * 95);
      } catch (error) {
        console.error(`[AnalyticsWorker] Failed to warm ${type} cache:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AnalyticsWorker] Cache warming complete for ${businessId}`);
    console.log(`  - Types warmed: ${completed}/${total}`);
    console.log(`  - Duration: ${duration}ms`);
  }

  /**
   * Invalidate time-sensitive caches (dashboard, staff performance)
   */
  private static async invalidateTimeSensitive(job: Job<AnalyticsJobData>): Promise<void> {
    const { businessId } = job.data;

    await job.updateProgress(10);

    await analyticsCacheService.invalidateTimeSensitive(businessId);

    await job.updateProgress(100);

    console.log(`[AnalyticsWorker] Time-sensitive cache invalidated for ${businessId}`);

    // Notify dashboard to refresh
    await AnalyticsWorker.notifyAnalyticsUpdate(businessId, 'dashboard');
  }

  /**
   * Notify connected clients of analytics updates
   */
  private static async notifyAnalyticsUpdate(
    businessId: string,
    analyticsType: string
  ): Promise<void> {
    try {
      realtimeService.emitToBusiness(businessId, 'analytics:updated', {
        type: analyticsType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Non-critical - just log the error
      console.warn(`[AnalyticsWorker] Failed to emit analytics update:`, error);
    }
  }
}

export default AnalyticsWorker;
