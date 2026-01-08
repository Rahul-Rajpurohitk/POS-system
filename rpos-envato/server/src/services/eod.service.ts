import { Repository, Between, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { EODReport, EODReportStatus } from '../entities/EODReport.entity';
import { Order, Payment, Product, Customer, OrderItem } from '../entities';
import { Shift } from '../entities/Shift.entity';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../types/enums';
import { QueueFactory } from '../queues/QueueFactory';

export interface GenerateEODOptions {
  businessId: string;
  reportDate: Date;
  generatedById?: string;
  includeInventorySnapshot?: boolean;
  autoClose?: boolean;
}

export interface EODSummary {
  report: EODReport;
  alerts: EODAlert[];
  comparisons: {
    previousDay: Partial<EODReport> | null;
    weekAverage: Partial<EODReport> | null;
    monthAverage: Partial<EODReport> | null;
  };
}

export interface EODAlert {
  type: 'warning' | 'error' | 'info';
  category: 'cash' | 'inventory' | 'sales' | 'compliance';
  message: string;
  value?: number;
  threshold?: number;
}

class EODService {
  private eodReportRepository: Repository<EODReport>;
  private orderRepository: Repository<Order>;
  private paymentRepository: Repository<Payment>;
  private productRepository: Repository<Product>;
  private customerRepository: Repository<Customer>;
  private shiftRepository: Repository<Shift>;
  private orderItemRepository: Repository<OrderItem>;

  constructor() {
    this.eodReportRepository = AppDataSource.getRepository(EODReport);
    this.orderRepository = AppDataSource.getRepository(Order);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.productRepository = AppDataSource.getRepository(Product);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.shiftRepository = AppDataSource.getRepository(Shift);
    this.orderItemRepository = AppDataSource.getRepository(OrderItem);
  }

  /**
   * Generate End-of-Day report
   */
  async generateReport(options: GenerateEODOptions): Promise<EODSummary> {
    const { businessId, reportDate, generatedById, includeInventorySnapshot = true } = options;

    // Check if report already exists
    const existingReport = await this.eodReportRepository.findOne({
      where: {
        businessId,
        reportDate: this.normalizeDate(reportDate),
      },
    });

    if (existingReport && existingReport.status === EODReportStatus.COMPLETED) {
      throw new Error('EOD report already generated for this date');
    }

    // Set date range for the report day
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Create or update report
    const report = existingReport || this.eodReportRepository.create({
      businessId,
      reportDate: this.normalizeDate(reportDate),
      generatedById,
      status: EODReportStatus.IN_PROGRESS,
    });

    report.status = EODReportStatus.IN_PROGRESS;
    await this.eodReportRepository.save(report);

    try {
      // 1. Calculate sales metrics
      await this.calculateSalesMetrics(report, businessId, startOfDay, endOfDay);

      // 2. Calculate payment breakdown
      await this.calculatePaymentBreakdown(report, businessId, startOfDay, endOfDay);

      // 3. Calculate cash reconciliation
      await this.calculateCashReconciliation(report, businessId, startOfDay, endOfDay);

      // 4. Get shift summaries
      await this.getShiftSummaries(report, businessId, startOfDay, endOfDay);

      // 5. Category breakdown
      await this.calculateCategoryBreakdown(report, businessId, startOfDay, endOfDay);

      // 6. Top products
      await this.getTopProducts(report, businessId, startOfDay, endOfDay);

      // 7. Hourly sales
      await this.calculateHourlySales(report, businessId, startOfDay, endOfDay);

      // 8. Inventory snapshot
      if (includeInventorySnapshot) {
        await this.calculateInventorySnapshot(report, businessId);
      }

      // 9. Customer metrics
      await this.calculateCustomerMetrics(report, businessId, startOfDay, endOfDay);

      // Update status
      report.status = this.determineReportStatus(report);
      report.completedAt = new Date();
      await this.eodReportRepository.save(report);

      // Generate alerts
      const alerts = this.generateAlerts(report);

      // Get comparison data
      const comparisons = await this.getComparisons(businessId, reportDate);

      // Queue report email if configured
      const queue = QueueFactory.getQueue();
      await queue.addJob('notifications', 'eod-report', {
        businessId,
        reportId: report.id,
        reportDate: reportDate.toISOString(),
      });

      return { report, alerts, comparisons };
    } catch (error) {
      report.status = EODReportStatus.PENDING;
      await this.eodReportRepository.save(report);
      throw error;
    }
  }

  /**
   * Calculate sales metrics
   */
  private async calculateSalesMetrics(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    // Completed orders
    const salesData = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.subTotal), 0) as grossSales',
        'COALESCE(SUM(order.discount), 0) as totalDiscounts',
        'COALESCE(SUM(order.taxAmount), 0) as totalTax',
        'COALESCE(SUM(order.tipAmount), 0) as totalTips',
        'COALESCE(SUM(order.total), 0) as netSales',
        'COUNT(order.id) as transactionCount',
        'COALESCE(AVG(order.total), 0) as averageTransaction',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    // Refunds
    const refundData = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as totalRefunds',
        'COUNT(order.id) as refundCount',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status = :status', { status: OrderStatus.REFUNDED })
      .andWhere('order.updatedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    // Cancelled orders
    const cancelledData = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(order.id) as cancelledCount')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status = :status', { status: OrderStatus.CANCELLED })
      .andWhere('order.cancelledAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    // Items sold
    const itemsData = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('COALESCE(SUM(item.quantity), 0) as itemsSold')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    // Update report
    report.grossSales = this.round(parseFloat(salesData?.grossSales || '0'));
    report.totalDiscounts = this.round(parseFloat(salesData?.totalDiscounts || '0'));
    report.totalTax = this.round(parseFloat(salesData?.totalTax || '0'));
    report.totalTips = this.round(parseFloat(salesData?.totalTips || '0'));
    report.netSales = this.round(parseFloat(salesData?.netSales || '0'));
    report.totalRefunds = this.round(parseFloat(refundData?.totalRefunds || '0'));
    report.transactionCount = parseInt(salesData?.transactionCount || '0');
    report.refundCount = parseInt(refundData?.refundCount || '0');
    report.cancelledCount = parseInt(cancelledData?.cancelledCount || '0');
    report.averageTransaction = this.round(parseFloat(salesData?.averageTransaction || '0'));
    report.itemsSold = parseInt(itemsData?.itemsSold || '0');
    report.averageItemsPerTransaction = report.transactionCount > 0
      ? this.round(report.itemsSold / report.transactionCount)
      : 0;
  }

  /**
   * Calculate payment method breakdown
   */
  private async calculatePaymentBreakdown(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.method as method',
        'COUNT(payment.id) as count',
        'COALESCE(SUM(payment.amountApplied), 0) as amount',
      ])
      .where('payment.businessId = :businessId', { businessId })
      .andWhere('payment.status = :status', { status: PaymentStatus.CAPTURED })
      .andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('payment.method')
      .getRawMany();

    const breakdown: any = {
      cash: { count: 0, amount: 0 },
      creditCard: { count: 0, amount: 0 },
      debitCard: { count: 0, amount: 0 },
      mobilePayment: { count: 0, amount: 0 },
      giftCard: { count: 0, amount: 0 },
      storeCredit: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 },
    };

    for (const payment of payments) {
      const count = parseInt(payment.count);
      const amount = this.round(parseFloat(payment.amount));

      switch (payment.method) {
        case PaymentMethod.CASH:
          breakdown.cash = { count, amount };
          break;
        case PaymentMethod.CREDIT_CARD:
          breakdown.creditCard = { count, amount };
          break;
        case PaymentMethod.DEBIT_CARD:
          breakdown.debitCard = { count, amount };
          break;
        case PaymentMethod.MOBILE_PAYMENT:
        case PaymentMethod.QR_CODE:
          breakdown.mobilePayment.count += count;
          breakdown.mobilePayment.amount += amount;
          break;
        case PaymentMethod.GIFT_CARD:
          breakdown.giftCard = { count, amount };
          break;
        case PaymentMethod.STORE_CREDIT:
          breakdown.storeCredit = { count, amount };
          break;
        default:
          breakdown.other.count += count;
          breakdown.other.amount += amount;
      }
    }

    report.paymentBreakdown = breakdown;
    report.cashSales = breakdown.cash.amount;
  }

  /**
   * Calculate cash drawer reconciliation from shifts
   */
  private async calculateCashReconciliation(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    const shifts = await this.shiftRepository.find({
      where: {
        businessId,
        openedAt: Between(startOfDay, endOfDay),
      },
    });

    let openingCash = 0;
    let cashIn = 0;
    let cashOut = 0;
    let expectedCash = 0;
    let actualCash = 0;
    let hasActualCash = false;

    for (const shift of shifts) {
      openingCash += Number(shift.openingFloat);
      cashIn += Number(shift.cashInTotal);
      cashOut += Number(shift.cashOutTotal);
      expectedCash += Number(shift.expectedCash);

      if (shift.actualCash !== null) {
        actualCash += Number(shift.actualCash);
        hasActualCash = true;
      }
    }

    // Get cash refunds
    const cashRefunds = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amountApplied), 0) as amount')
      .where('payment.businessId = :businessId', { businessId })
      .andWhere('payment.method = :method', { method: PaymentMethod.CASH })
      .andWhere('payment.status = :status', { status: PaymentStatus.REFUNDED })
      .andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    report.openingCash = this.round(openingCash);
    report.cashIn = this.round(cashIn);
    report.cashOut = this.round(cashOut);
    report.cashRefunds = this.round(parseFloat(cashRefunds?.amount || '0'));
    report.expectedCash = this.round(expectedCash);
    report.actualCash = hasActualCash ? this.round(actualCash) : null;
    report.cashVariance = hasActualCash
      ? this.round(actualCash - expectedCash)
      : null;
  }

  /**
   * Get shift summaries
   */
  private async getShiftSummaries(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    const shifts = await this.shiftRepository.find({
      where: {
        businessId,
        openedAt: Between(startOfDay, endOfDay),
      },
      relations: ['user'],
      order: { openedAt: 'ASC' },
    });

    report.shiftsSummary = shifts.map((shift) => ({
      shiftId: shift.id,
      shiftNumber: shift.shiftNumber,
      userId: shift.userId,
      userName: shift.user?.name || 'Unknown',
      openedAt: shift.openedAt.toISOString(),
      closedAt: shift.closedAt?.toISOString() || '',
      totalSales: Number(shift.totalSales),
      cashVariance: shift.cashDifference ? Number(shift.cashDifference) : 0,
    }));
  }

  /**
   * Calculate category sales breakdown
   */
  private async calculateCategoryBreakdown(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    const categories = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'category.id as categoryId',
        'category.name as categoryName',
        'SUM(item.quantity) as itemsSold',
        'SUM(item.total) as revenue',
      ])
      .innerJoin('item.product', 'product')
      .innerJoin('product.category', 'category')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    const totalRevenue = categories.reduce(
      (sum, c) => sum + parseFloat(c.revenue || '0'),
      0
    );

    report.categoryBreakdown = categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      itemsSold: parseInt(c.itemsSold || '0'),
      revenue: this.round(parseFloat(c.revenue || '0')),
      percentage: totalRevenue > 0
        ? this.round((parseFloat(c.revenue || '0') / totalRevenue) * 100)
        : 0,
    }));
  }

  /**
   * Get top selling products
   */
  private async getTopProducts(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    const products = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'product.id as productId',
        'product.name as productName',
        'SUM(item.quantity) as quantitySold',
        'SUM(item.total) as revenue',
      ])
      .innerJoin('item.product', 'product')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('quantitySold', 'DESC')
      .limit(20)
      .getRawMany();

    report.topProducts = products.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      quantitySold: parseInt(p.quantitySold || '0'),
      revenue: this.round(parseFloat(p.revenue || '0')),
    }));
  }

  /**
   * Calculate hourly sales
   */
  private async calculateHourlySales(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    const hourly = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'EXTRACT(HOUR FROM order.completedAt) as hour',
        'COUNT(order.id) as transactions',
        'COALESCE(SUM(order.total), 0) as revenue',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Fill all 24 hours
    report.hourlySales = [];
    for (let h = 0; h < 24; h++) {
      const found = hourly.find((x) => parseInt(x.hour) === h);
      report.hourlySales.push({
        hour: h,
        transactions: found ? parseInt(found.transactions) : 0,
        revenue: found ? this.round(parseFloat(found.revenue)) : 0,
      });
    }
  }

  /**
   * Calculate inventory snapshot
   */
  private async calculateInventorySnapshot(
    report: EODReport,
    businessId: string
  ): Promise<void> {
    // Current inventory value
    const inventoryValue = await this.productRepository
      .createQueryBuilder('product')
      .select('SUM(product.stock * product.costPrice)', 'value')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .getRawOne();

    // Low stock count
    const lowStock = await this.productRepository
      .createQueryBuilder('product')
      .select('COUNT(product.id)', 'count')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .andWhere('product.stock <= product.minStock')
      .andWhere('product.stock > 0')
      .getRawOne();

    // Out of stock count
    const outOfStock = await this.productRepository
      .createQueryBuilder('product')
      .select('COUNT(product.id)', 'count')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .andWhere('product.stock <= 0')
      .getRawOne();

    report.inventoryValueEnd = this.round(parseFloat(inventoryValue?.value || '0'));
    report.lowStockItems = parseInt(lowStock?.count || '0');
    report.outOfStockItems = parseInt(outOfStock?.count || '0');
  }

  /**
   * Calculate customer metrics
   */
  private async calculateCustomerMetrics(
    report: EODReport,
    businessId: string,
    startOfDay: Date,
    endOfDay: Date
  ): Promise<void> {
    // Unique customers who made purchases
    const uniqueCustomers = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerId)', 'count')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.customerId IS NOT NULL')
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.completedAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    // New customers (created today)
    const newCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .select('COUNT(customer.id)', 'count')
      .where('customer.businessId = :businessId', { businessId })
      .andWhere('customer.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getRawOne();

    report.uniqueCustomers = parseInt(uniqueCustomers?.count || '0');
    report.newCustomers = parseInt(newCustomers?.count || '0');
    report.repeatCustomers = Math.max(0, report.uniqueCustomers - report.newCustomers);
  }

  /**
   * Determine report status based on data
   */
  private determineReportStatus(report: EODReport): EODReportStatus {
    if (report.cashVariance !== null && Math.abs(Number(report.cashVariance)) > 10) {
      return EODReportStatus.DISCREPANCY;
    }
    return EODReportStatus.COMPLETED;
  }

  /**
   * Generate alerts for the report
   */
  private generateAlerts(report: EODReport): EODAlert[] {
    const alerts: EODAlert[] = [];

    // Cash variance alert
    if (report.cashVariance !== null) {
      const variance = Math.abs(Number(report.cashVariance));
      if (variance > 50) {
        alerts.push({
          type: 'error',
          category: 'cash',
          message: `Significant cash variance of $${variance.toFixed(2)}`,
          value: variance,
          threshold: 50,
        });
      } else if (variance > 10) {
        alerts.push({
          type: 'warning',
          category: 'cash',
          message: `Cash variance of $${variance.toFixed(2)}`,
          value: variance,
          threshold: 10,
        });
      }
    }

    // High refund rate
    if (report.transactionCount > 0) {
      const refundRate = (report.refundCount / report.transactionCount) * 100;
      if (refundRate > 10) {
        alerts.push({
          type: 'warning',
          category: 'sales',
          message: `High refund rate: ${refundRate.toFixed(1)}%`,
          value: refundRate,
          threshold: 10,
        });
      }
    }

    // Low stock alerts
    if (report.outOfStockItems > 0) {
      alerts.push({
        type: 'error',
        category: 'inventory',
        message: `${report.outOfStockItems} items are out of stock`,
        value: report.outOfStockItems,
      });
    }

    if (report.lowStockItems > 5) {
      alerts.push({
        type: 'warning',
        category: 'inventory',
        message: `${report.lowStockItems} items are low on stock`,
        value: report.lowStockItems,
        threshold: 5,
      });
    }

    // Void rate
    if (report.transactionCount > 0 && report.voidCount > 0) {
      const voidRate = (report.voidCount / report.transactionCount) * 100;
      if (voidRate > 5) {
        alerts.push({
          type: 'warning',
          category: 'compliance',
          message: `High void rate: ${voidRate.toFixed(1)}%`,
          value: voidRate,
          threshold: 5,
        });
      }
    }

    return alerts;
  }

  /**
   * Get comparison data for context
   */
  private async getComparisons(
    businessId: string,
    reportDate: Date
  ): Promise<{
    previousDay: Partial<EODReport> | null;
    weekAverage: Partial<EODReport> | null;
    monthAverage: Partial<EODReport> | null;
  }> {
    // Previous day
    const previousDate = new Date(reportDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousDay = await this.eodReportRepository.findOne({
      where: {
        businessId,
        reportDate: this.normalizeDate(previousDate),
        status: In([EODReportStatus.COMPLETED, EODReportStatus.REVIEWED]),
      },
    });

    // Week average (last 7 days)
    const weekStart = new Date(reportDate);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekData = await this.eodReportRepository
      .createQueryBuilder('report')
      .select([
        'AVG(report.netSales) as avgNetSales',
        'AVG(report.transactionCount) as avgTransactions',
        'AVG(report.averageTransaction) as avgTicket',
      ])
      .where('report.businessId = :businessId', { businessId })
      .andWhere('report.reportDate BETWEEN :start AND :end', {
        start: this.normalizeDate(weekStart),
        end: this.normalizeDate(previousDate),
      })
      .andWhere('report.status IN (:...statuses)', {
        statuses: [EODReportStatus.COMPLETED, EODReportStatus.REVIEWED],
      })
      .getRawOne();

    // Month average (last 30 days)
    const monthStart = new Date(reportDate);
    monthStart.setDate(monthStart.getDate() - 30);

    const monthData = await this.eodReportRepository
      .createQueryBuilder('report')
      .select([
        'AVG(report.netSales) as avgNetSales',
        'AVG(report.transactionCount) as avgTransactions',
        'AVG(report.averageTransaction) as avgTicket',
      ])
      .where('report.businessId = :businessId', { businessId })
      .andWhere('report.reportDate BETWEEN :start AND :end', {
        start: this.normalizeDate(monthStart),
        end: this.normalizeDate(previousDate),
      })
      .andWhere('report.status IN (:...statuses)', {
        statuses: [EODReportStatus.COMPLETED, EODReportStatus.REVIEWED],
      })
      .getRawOne();

    return {
      previousDay: previousDay ? {
        netSales: previousDay.netSales,
        transactionCount: previousDay.transactionCount,
        averageTransaction: previousDay.averageTransaction,
      } : null,
      weekAverage: weekData ? {
        netSales: this.round(parseFloat(weekData.avgNetSales || '0')),
        transactionCount: Math.round(parseFloat(weekData.avgTransactions || '0')),
        averageTransaction: this.round(parseFloat(weekData.avgTicket || '0')),
      } : null,
      monthAverage: monthData ? {
        netSales: this.round(parseFloat(monthData.avgNetSales || '0')),
        transactionCount: Math.round(parseFloat(monthData.avgTransactions || '0')),
        averageTransaction: this.round(parseFloat(monthData.avgTicket || '0')),
      } : null,
    };
  }

  /**
   * Get EOD report by date
   */
  async getReport(businessId: string, reportDate: Date): Promise<EODReport | null> {
    return this.eodReportRepository.findOne({
      where: {
        businessId,
        reportDate: this.normalizeDate(reportDate),
      },
      relations: ['generatedBy', 'reviewedBy'],
    });
  }

  /**
   * Review and approve EOD report
   */
  async reviewReport(
    reportId: string,
    reviewedById: string,
    notes?: string,
    actualCash?: number
  ): Promise<EODReport> {
    const report = await this.eodReportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    if (actualCash !== undefined) {
      report.actualCash = actualCash;
      report.cashVariance = this.round(actualCash - Number(report.expectedCash));
    }

    report.status = EODReportStatus.REVIEWED;
    report.reviewedById = reviewedById;
    report.reviewedAt = new Date();
    report.reviewedNotes = notes || null;

    await this.eodReportRepository.save(report);

    return report;
  }

  /**
   * Get recent EOD reports
   */
  async getRecentReports(
    businessId: string,
    limit = 30
  ): Promise<EODReport[]> {
    return this.eodReportRepository.find({
      where: { businessId },
      order: { reportDate: 'DESC' },
      take: limit,
      relations: ['generatedBy'],
    });
  }

  // Helpers

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const eodService = new EODService();
