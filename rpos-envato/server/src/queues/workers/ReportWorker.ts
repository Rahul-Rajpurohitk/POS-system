import { Job } from '../interfaces/IQueueProvider';
import { QueueFactory } from '../QueueFactory';
import { QUEUE_NAMES, JOB_NAMES } from '../constants';
import { GenerateReportData, TopProductsReportData } from '../jobs/ReportJob';
import { AppDataSource } from '../../config/database';
import { Order } from '../../entities/Order.entity';
import { Product } from '../../entities/Product.entity';
import moment from 'moment';

type ReportJobData = GenerateReportData | TopProductsReportData;

/**
 * Report Worker - Processes report generation jobs
 */
export class ReportWorker {
  /**
   * Initialize the report worker
   */
  static async initialize(): Promise<void> {
    const queue = QueueFactory.getProvider();

    await queue.registerWorker<ReportJobData>(
      QUEUE_NAMES.REPORTS,
      async (job: Job<ReportJobData>) => {
        console.log(`[ReportWorker] Processing job: ${job.name} (${job.id})`);

        switch (job.name) {
          case JOB_NAMES.GENERATE_DAILY_REPORT:
            await ReportWorker.generateDailyReport(job as Job<GenerateReportData>);
            break;
          case JOB_NAMES.GENERATE_WEEKLY_REPORT:
            await ReportWorker.generateWeeklyReport(job as Job<GenerateReportData>);
            break;
          case JOB_NAMES.GENERATE_MONTHLY_REPORT:
            await ReportWorker.generateMonthlyReport(job as Job<GenerateReportData>);
            break;
          case JOB_NAMES.GENERATE_TOP_PRODUCTS_REPORT:
            await ReportWorker.generateTopProductsReport(job as Job<TopProductsReportData>);
            break;
          default:
            console.warn(`[ReportWorker] Unknown job: ${job.name}`);
        }
      },
      2 // Lower concurrency for report generation
    );

    console.log('[ReportWorker] Initialized');
  }

  /**
   * Generate daily sales report
   */
  private static async generateDailyReport(job: Job<GenerateReportData>): Promise<void> {
    const { businessId, date } = job.data;
    const reportDate = date ? moment(date) : moment();

    await job.updateProgress(10);

    const orderRepository = AppDataSource.getRepository(Order);

    const startOfDay = reportDate.startOf('day').toDate();
    const endOfDay = reportDate.endOf('day').toDate();

    const orders = await orderRepository
      .createQueryBuilder('order')
      .where('order.business_id = :businessId', { businessId })
      .andWhere('order.created_at >= :startOfDay', { startOfDay })
      .andWhere('order.created_at <= :endOfDay', { endOfDay })
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .getMany();

    await job.updateProgress(50);

    const report = {
      date: reportDate.format('YYYY-MM-DD'),
      businessId,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
      totalDiscount: orders.reduce((sum, o) => sum + Number(o.discount), 0),
      averageOrderValue:
        orders.length > 0
          ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length
          : 0,
      orders: orders.map((o) => ({
        id: o.id,
        number: o.formattedNumber,
        total: o.total,
        itemCount: o.items?.length || 0,
        createdAt: o.createdAt,
      })),
    };

    await job.updateProgress(100);

    // In a real implementation, you might:
    // - Store the report in a reports table
    // - Send the report via email
    // - Upload to S3

    console.log(`[ReportWorker] Daily report generated for ${reportDate.format('YYYY-MM-DD')}`);
    console.log(`  - Total orders: ${report.totalOrders}`);
    console.log(`  - Total revenue: ${report.totalRevenue}`);
  }

  /**
   * Generate weekly sales report
   */
  private static async generateWeeklyReport(job: Job<GenerateReportData>): Promise<void> {
    const { businessId, startDate } = job.data;
    const weekStart = startDate ? moment(startDate).startOf('week') : moment().startOf('week');
    const weekEnd = weekStart.clone().endOf('week');

    await job.updateProgress(10);

    const orderRepository = AppDataSource.getRepository(Order);

    const dailySales = await orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.created_at)", 'date')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.total)', 'revenue')
      .where('order.business_id = :businessId', { businessId })
      .andWhere('order.created_at >= :weekStart', { weekStart: weekStart.toDate() })
      .andWhere('order.created_at <= :weekEnd', { weekEnd: weekEnd.toDate() })
      .groupBy("DATE_TRUNC('day', order.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    await job.updateProgress(100);

    console.log(
      `[ReportWorker] Weekly report generated for ${weekStart.format('YYYY-MM-DD')} to ${weekEnd.format('YYYY-MM-DD')}`
    );
    console.log(`  - Days with sales: ${dailySales.length}`);
  }

  /**
   * Generate monthly sales report
   */
  private static async generateMonthlyReport(job: Job<GenerateReportData>): Promise<void> {
    const { businessId, date } = job.data;
    const reportMonth = date ? moment(date) : moment();
    const monthStart = reportMonth.startOf('month').toDate();
    const monthEnd = reportMonth.endOf('month').toDate();

    await job.updateProgress(10);

    const orderRepository = AppDataSource.getRepository(Order);

    const monthlySummary = await orderRepository
      .createQueryBuilder('order')
      .select('COUNT(*)', 'totalOrders')
      .addSelect('SUM(order.total)', 'totalRevenue')
      .addSelect('SUM(order.discount)', 'totalDiscount')
      .addSelect('AVG(order.total)', 'averageOrderValue')
      .where('order.business_id = :businessId', { businessId })
      .andWhere('order.created_at >= :monthStart', { monthStart })
      .andWhere('order.created_at <= :monthEnd', { monthEnd })
      .getRawOne();

    await job.updateProgress(100);

    console.log(`[ReportWorker] Monthly report generated for ${reportMonth.format('YYYY-MM')}`);
    console.log(`  - Total orders: ${monthlySummary?.totalOrders || 0}`);
    console.log(`  - Total revenue: ${monthlySummary?.totalRevenue || 0}`);
  }

  /**
   * Generate top products report
   */
  private static async generateTopProductsReport(
    job: Job<TopProductsReportData>
  ): Promise<void> {
    const { businessId, limit = 20 } = job.data;

    await job.updateProgress(10);

    const productRepository = AppDataSource.getRepository(Product);

    const topProducts = await productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.sku',
        'product.soldQuantity',
        'product.soldAmount',
        'product.profit',
      ])
      .where('product.business_id = :businessId', { businessId })
      .orderBy('product.soldQuantity', 'DESC')
      .limit(limit)
      .getMany();

    await job.updateProgress(100);

    console.log(`[ReportWorker] Top products report generated`);
    console.log(`  - Products analyzed: ${topProducts.length}`);
  }
}

export default ReportWorker;
