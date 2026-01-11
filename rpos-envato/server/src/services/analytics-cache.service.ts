import { cacheService } from './cache.service';
import {
  ANALYTICS_CACHE_KEYS,
  ANALYTICS_CACHE_TTL,
  ABCAnalysisSummary,
  RFMAnalysisSummary,
  ForecastResult,
  PeakHoursAnalysis,
  InventoryIntelligenceSummary,
  StaffPerformanceSummary,
  RevenueTrendsSummary,
  CohortAnalysisSummary,
  EnhancedDashboardSummary,
} from '../types/analytics.types';
import { ReportPeriod } from '../types/enums';

/**
 * Analytics-specific caching service
 * Provides intelligent caching with proper TTLs and invalidation
 */
class AnalyticsCacheService {
  // ============ DASHBOARD ============

  async getDashboard(
    businessId: string,
    period: ReportPeriod
  ): Promise<EnhancedDashboardSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.DASHBOARD(businessId, period);
    return this.get<EnhancedDashboardSummary>(key);
  }

  async setDashboard(
    businessId: string,
    period: ReportPeriod,
    data: EnhancedDashboardSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.DASHBOARD(businessId, period);
    const ttl = period === ReportPeriod.TODAY
      ? ANALYTICS_CACHE_TTL.DASHBOARD_TODAY
      : ANALYTICS_CACHE_TTL.DASHBOARD_HISTORICAL;
    await this.set(key, data, ttl);
  }

  async invalidateDashboard(businessId: string): Promise<void> {
    // Invalidate all period variations
    const periods = Object.values(ReportPeriod);
    await Promise.all(
      periods.map(period =>
        this.delete(ANALYTICS_CACHE_KEYS.DASHBOARD(businessId, period))
      )
    );
  }

  // ============ ABC CLASSIFICATION ============

  async getABCClassification(businessId: string): Promise<ABCAnalysisSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.ABC_CLASSIFICATION(businessId);
    return this.get<ABCAnalysisSummary>(key);
  }

  async setABCClassification(
    businessId: string,
    data: ABCAnalysisSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.ABC_CLASSIFICATION(businessId);
    await this.set(key, data, ANALYTICS_CACHE_TTL.ABC_CLASSIFICATION);
  }

  async invalidateABCClassification(businessId: string): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.ABC_CLASSIFICATION(businessId);
    await this.delete(key);
  }

  // ============ RFM SEGMENTATION ============

  async getRFMSegmentation(businessId: string): Promise<RFMAnalysisSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.RFM_SEGMENTATION(businessId);
    return this.get<RFMAnalysisSummary>(key);
  }

  async setRFMSegmentation(
    businessId: string,
    data: RFMAnalysisSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.RFM_SEGMENTATION(businessId);
    await this.set(key, data, ANALYTICS_CACHE_TTL.RFM_SEGMENTATION);
  }

  async invalidateRFMSegmentation(businessId: string): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.RFM_SEGMENTATION(businessId);
    await this.delete(key);
  }

  // ============ FORECAST ============

  async getForecast(businessId: string, days: number): Promise<ForecastResult | null> {
    const key = ANALYTICS_CACHE_KEYS.FORECAST(businessId, days);
    return this.get<ForecastResult>(key);
  }

  async setForecast(
    businessId: string,
    days: number,
    data: ForecastResult
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.FORECAST(businessId, days);
    await this.set(key, data, ANALYTICS_CACHE_TTL.FORECAST);
  }

  async invalidateForecast(businessId: string): Promise<void> {
    // Invalidate common forecast periods
    const commonDays = [7, 14, 30];
    await Promise.all(
      commonDays.map(days =>
        this.delete(ANALYTICS_CACHE_KEYS.FORECAST(businessId, days))
      )
    );
  }

  // ============ PEAK HOURS ============

  async getPeakHours(businessId: string): Promise<PeakHoursAnalysis | null> {
    const key = ANALYTICS_CACHE_KEYS.PEAK_HOURS(businessId);
    return this.get<PeakHoursAnalysis>(key);
  }

  async setPeakHours(businessId: string, data: PeakHoursAnalysis): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.PEAK_HOURS(businessId);
    await this.set(key, data, ANALYTICS_CACHE_TTL.PEAK_HOURS);
  }

  async invalidatePeakHours(businessId: string): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.PEAK_HOURS(businessId);
    await this.delete(key);
  }

  // ============ INVENTORY INTELLIGENCE ============

  async getInventoryIntelligence(
    businessId: string
  ): Promise<InventoryIntelligenceSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.INVENTORY_INTELLIGENCE(businessId);
    return this.get<InventoryIntelligenceSummary>(key);
  }

  async setInventoryIntelligence(
    businessId: string,
    data: InventoryIntelligenceSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.INVENTORY_INTELLIGENCE(businessId);
    await this.set(key, data, ANALYTICS_CACHE_TTL.INVENTORY_INTELLIGENCE);
  }

  async invalidateInventoryIntelligence(businessId: string): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.INVENTORY_INTELLIGENCE(businessId);
    await this.delete(key);
  }

  // ============ STAFF PERFORMANCE ============

  async getStaffPerformance(
    businessId: string,
    period: ReportPeriod
  ): Promise<StaffPerformanceSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.STAFF_PERFORMANCE(businessId, period);
    return this.get<StaffPerformanceSummary>(key);
  }

  async setStaffPerformance(
    businessId: string,
    period: ReportPeriod,
    data: StaffPerformanceSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.STAFF_PERFORMANCE(businessId, period);
    await this.set(key, data, ANALYTICS_CACHE_TTL.STAFF_PERFORMANCE);
  }

  async invalidateStaffPerformance(businessId: string): Promise<void> {
    const periods = Object.values(ReportPeriod);
    await Promise.all(
      periods.map(period =>
        this.delete(ANALYTICS_CACHE_KEYS.STAFF_PERFORMANCE(businessId, period))
      )
    );
  }

  // ============ REVENUE TRENDS ============

  async getRevenueTrends(
    businessId: string,
    period: ReportPeriod
  ): Promise<RevenueTrendsSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.REVENUE_TRENDS(businessId, period);
    return this.get<RevenueTrendsSummary>(key);
  }

  async setRevenueTrends(
    businessId: string,
    period: ReportPeriod,
    data: RevenueTrendsSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.REVENUE_TRENDS(businessId, period);
    await this.set(key, data, ANALYTICS_CACHE_TTL.REVENUE_TRENDS);
  }

  async invalidateRevenueTrends(businessId: string): Promise<void> {
    const periods = Object.values(ReportPeriod);
    await Promise.all(
      periods.map(period =>
        this.delete(ANALYTICS_CACHE_KEYS.REVENUE_TRENDS(businessId, period))
      )
    );
  }

  // ============ CUSTOMER COHORTS ============

  async getCustomerCohorts(businessId: string): Promise<CohortAnalysisSummary | null> {
    const key = ANALYTICS_CACHE_KEYS.CUSTOMER_COHORTS(businessId);
    return this.get<CohortAnalysisSummary>(key);
  }

  async setCustomerCohorts(
    businessId: string,
    data: CohortAnalysisSummary
  ): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.CUSTOMER_COHORTS(businessId);
    await this.set(key, data, ANALYTICS_CACHE_TTL.CUSTOMER_COHORTS);
  }

  async invalidateCustomerCohorts(businessId: string): Promise<void> {
    const key = ANALYTICS_CACHE_KEYS.CUSTOMER_COHORTS(businessId);
    await this.delete(key);
  }

  // ============ BATCH INVALIDATION ============

  /**
   * Invalidate all analytics cache for a business
   * Use when major data changes occur (e.g., data import)
   */
  async invalidateAllForBusiness(businessId: string): Promise<void> {
    await Promise.all([
      this.invalidateDashboard(businessId),
      this.invalidateABCClassification(businessId),
      this.invalidateRFMSegmentation(businessId),
      this.invalidateForecast(businessId),
      this.invalidatePeakHours(businessId),
      this.invalidateInventoryIntelligence(businessId),
      this.invalidateStaffPerformance(businessId),
      this.invalidateRevenueTrends(businessId),
      this.invalidateCustomerCohorts(businessId),
    ]);
  }

  /**
   * Invalidate time-sensitive cache (dashboard, staff performance, revenue trends)
   * Use when new orders are created
   */
  async invalidateTimeSensitive(businessId: string): Promise<void> {
    await Promise.all([
      this.invalidateDashboard(businessId),
      this.invalidateStaffPerformance(businessId),
      this.invalidateRevenueTrends(businessId),
    ]);
  }

  /**
   * Invalidate inventory-related cache
   * Use when stock levels change
   */
  async invalidateInventoryRelated(businessId: string): Promise<void> {
    await Promise.all([
      this.invalidateInventoryIntelligence(businessId),
      this.invalidateABCClassification(businessId),
    ]);
  }

  /**
   * Invalidate customer-related cache
   * Use when new customers are added or customer data changes
   */
  async invalidateCustomerRelated(businessId: string): Promise<void> {
    await Promise.all([
      this.invalidateRFMSegmentation(businessId),
      this.invalidateCustomerCohorts(businessId),
    ]);
  }

  // ============ CACHE WARMING ============

  /**
   * Check if critical caches exist for a business
   * Returns list of missing cache keys
   */
  async getMissingCaches(businessId: string): Promise<string[]> {
    const missing: string[] = [];

    const checks = [
      { key: ANALYTICS_CACHE_KEYS.ABC_CLASSIFICATION(businessId), name: 'ABC Classification' },
      { key: ANALYTICS_CACHE_KEYS.RFM_SEGMENTATION(businessId), name: 'RFM Segmentation' },
      { key: ANALYTICS_CACHE_KEYS.PEAK_HOURS(businessId), name: 'Peak Hours' },
      { key: ANALYTICS_CACHE_KEYS.INVENTORY_INTELLIGENCE(businessId), name: 'Inventory Intelligence' },
      { key: ANALYTICS_CACHE_KEYS.CUSTOMER_COHORTS(businessId), name: 'Customer Cohorts' },
    ];

    for (const check of checks) {
      const exists = await this.exists(check.key);
      if (!exists) {
        missing.push(check.name);
      }
    }

    return missing;
  }

  // ============ PRIVATE HELPERS ============

  private async get<T>(key: string): Promise<T | null> {
    try {
      const data = await cacheService.get<string>(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Analytics cache get error for ${key}:`, error);
      return null;
    }
  }

  private async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      await cacheService.set(key, JSON.stringify(data), ttlSeconds);
    } catch (error) {
      console.error(`Analytics cache set error for ${key}:`, error);
    }
  }

  private async delete(key: string): Promise<void> {
    try {
      await cacheService.del(key);
    } catch (error) {
      console.error(`Analytics cache delete error for ${key}:`, error);
    }
  }

  private async exists(key: string): Promise<boolean> {
    try {
      const data = await cacheService.get<string>(key);
      return data !== null;
    } catch {
      return false;
    }
  }
}

export const analyticsCacheService = new AnalyticsCacheService();
