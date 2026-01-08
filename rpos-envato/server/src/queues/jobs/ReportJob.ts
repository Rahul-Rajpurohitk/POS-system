import { JobData } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../constants';

// Job Data Types
export interface GenerateReportData extends JobData {
  businessId: string;
  date?: string; // ISO date string
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export interface TopProductsReportData extends JobData {
  businessId: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Report Generation Jobs
 */
export class ReportJob {
  /**
   * Dispatch a daily report generation job
   */
  static async generateDailyReport(data: GenerateReportData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.REPORTS,
      JOB_NAMES.GENERATE_DAILY_REPORT,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5, // Lower priority than order processing
      }
    );
  }

  /**
   * Dispatch a weekly report generation job
   */
  static async generateWeeklyReport(data: GenerateReportData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.REPORTS,
      JOB_NAMES.GENERATE_WEEKLY_REPORT,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      }
    );
  }

  /**
   * Dispatch a monthly report generation job
   */
  static async generateMonthlyReport(data: GenerateReportData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.REPORTS,
      JOB_NAMES.GENERATE_MONTHLY_REPORT,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      }
    );
  }

  /**
   * Dispatch a top products report generation job
   */
  static async generateTopProductsReport(data: TopProductsReportData): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.REPORTS,
      JOB_NAMES.GENERATE_TOP_PRODUCTS_REPORT,
      {
        ...data,
        limit: data.limit ?? 20,
      },
      {
        ...DEFAULT_JOB_OPTIONS,
        priority: 5,
      }
    );
  }

  /**
   * Schedule a daily report (runs at specified time)
   */
  static async scheduleDailyReport(
    data: GenerateReportData,
    delayMs: number
  ): Promise<string> {
    const queue = QueueFactory.getProvider();
    return queue.addJob(
      QUEUE_NAMES.REPORTS,
      JOB_NAMES.GENERATE_DAILY_REPORT,
      data,
      {
        ...DEFAULT_JOB_OPTIONS,
        delay: delayMs,
        priority: 10,
      }
    );
  }
}

export default ReportJob;
