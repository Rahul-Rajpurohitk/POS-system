import { Repository, Between, MoreThanOrEqual, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order, OrderItem, Payment, Product, Customer, User, Shift } from '../entities';
import { OrderStatus, PaymentStatus, PaymentMethod, ReportPeriod } from '../types/enums';
import {
  DateRange,
  ABCAnalysisSummary,
  ABCClassification,
  RFMAnalysisSummary,
  CustomerRFM,
  RFMSegment,
  RFM_SEGMENT_RULES,
  DEFAULT_RFM_SEGMENT,
  ForecastResult,
  PeakHoursAnalysis,
  HourlyMetrics,
  StaffPerformanceSummary,
  StaffPerformanceMetrics,
  InventoryIntelligenceSummary,
  InventoryIntelligence,
  RevenueTrendsSummary,
  RevenueTrendData,
  WeekdayAnalysis,
  CohortAnalysisSummary,
  CohortData,
  EnhancedDashboardSummary,
} from '../types/analytics.types';
import {
  round,
  mean,
  percentageChange,
  classifyABC,
  calculateRFMQuintiles,
  generateForecast,
  detectTrend,
  calculateReorderPoint,
  calculateReorderQuantity,
  calculateDaysUntilStockout,
  calculateTurnoverRate,
  getDayName,
  formatDate,
  projectMonthEndRevenue,
  getDaysInCurrentMonth,
  getCurrentDayOfMonth,
  simpleMovingAverage,
} from '../utils/analytics.utils';
import { analyticsCacheService } from './analytics-cache.service';
import { analyticsService, DateRange as BaseDateRange } from './analytics.service';

/**
 * Advanced Analytics Service
 * Provides sophisticated analytics calculations including ABC classification,
 * RFM segmentation, forecasting, and predictive insights.
 */
class AdvancedAnalyticsService {
  private orderRepository: Repository<Order>;
  private orderItemRepository: Repository<OrderItem>;
  private paymentRepository: Repository<Payment>;
  private productRepository: Repository<Product>;
  private customerRepository: Repository<Customer>;
  private userRepository: Repository<User>;
  private shiftRepository: Repository<Shift>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.orderItemRepository = AppDataSource.getRepository(OrderItem);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.productRepository = AppDataSource.getRepository(Product);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.userRepository = AppDataSource.getRepository(User);
    this.shiftRepository = AppDataSource.getRepository(Shift);
  }

  // ============ ABC CLASSIFICATION ============

  /**
   * Get ABC (Pareto) classification of products
   * A: Top 80% of revenue, B: Next 15%, C: Remaining 5%
   */
  async getABCClassification(
    businessId: string,
    dateRange?: DateRange,
    useCache = true
  ): Promise<ABCAnalysisSummary> {
    // Check cache first
    if (useCache) {
      const cached = await analyticsCacheService.getABCClassification(businessId);
      if (cached) return cached;
    }

    // Default to last 90 days if no range specified
    const range = dateRange || this.getLast90Days();
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    // Get product sales data
    const salesData = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'product.id as "productId"',
        'product.name as "productName"',
        'product.sku as sku',
        'category.name as "categoryName"',
        'SUM(item.quantity) as "quantitySold"',
        'SUM(item.lineTotal) as revenue',
        'SUM((item.unitPrice - COALESCE(product.purchasePrice, 0)) * item.quantity) as profit',
      ])
      .innerJoin('item.product', 'product')
      .leftJoin('product.category', 'category')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: range.startDate,
        end: range.endDate,
      })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.sku')
      .addGroupBy('category.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    const totalRevenue = salesData.reduce((sum, p) => sum + parseFloat(p.revenue || '0'), 0);

    // Classify products
    const classifications = classifyABC(
      salesData.map(p => ({ id: p.productId, revenue: parseFloat(p.revenue || '0') }))
    );

    // Build result with cumulative data
    let cumulativeRevenue = 0;
    const products: ABCClassification[] = salesData.map(p => {
      const revenue = parseFloat(p.revenue || '0');
      cumulativeRevenue += revenue;
      const classification = classifications.get(p.productId) || 'C';

      return {
        productId: p.productId,
        productName: p.productName,
        sku: p.sku,
        categoryName: p.categoryName,
        quantitySold: parseInt(p.quantitySold || '0'),
        revenue: round(revenue),
        profit: round(parseFloat(p.profit || '0')),
        cumulativeRevenue: round(cumulativeRevenue),
        cumulativePercentage: totalRevenue > 0 ? round((cumulativeRevenue / totalRevenue) * 100) : 0,
        classification,
      };
    });

    // Calculate category summaries
    const categoryA = products.filter(p => p.classification === 'A');
    const categoryB = products.filter(p => p.classification === 'B');
    const categoryC = products.filter(p => p.classification === 'C');

    const result: ABCAnalysisSummary = {
      totalProducts: products.length,
      totalRevenue: round(totalRevenue),
      categoryA: {
        count: categoryA.length,
        revenue: round(categoryA.reduce((sum, p) => sum + p.revenue, 0)),
        percentage: round((categoryA.length / products.length) * 100) || 0,
      },
      categoryB: {
        count: categoryB.length,
        revenue: round(categoryB.reduce((sum, p) => sum + p.revenue, 0)),
        percentage: round((categoryB.length / products.length) * 100) || 0,
      },
      categoryC: {
        count: categoryC.length,
        revenue: round(categoryC.reduce((sum, p) => sum + p.revenue, 0)),
        percentage: round((categoryC.length / products.length) * 100) || 0,
      },
      products,
    };

    // Cache the result
    await analyticsCacheService.setABCClassification(businessId, result);

    return result;
  }

  // ============ RFM SEGMENTATION ============

  /**
   * Get RFM segmentation for all customers
   */
  async getRFMSegmentation(
    businessId: string,
    useCache = true
  ): Promise<RFMAnalysisSummary> {
    // Check cache first
    if (useCache) {
      const cached = await analyticsCacheService.getRFMSegmentation(businessId);
      if (cached) return cached;
    }

    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];
    const now = new Date();

    // Get customer purchase data
    const customerData = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'customer.id as "customerId"',
        'customer.name as "customerName"',
        'customer.email as "customerEmail"',
        'COUNT(order.id) as "totalOrders"',
        'SUM(order.total) as "totalSpend"',
        'MAX(order.createdAt) as "lastPurchaseDate"',
        'MIN(order.createdAt) as "firstPurchaseDate"',
      ])
      .innerJoin('order.customer', 'customer')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .groupBy('customer.id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.email')
      .having('COUNT(order.id) > 0')
      .getRawMany();

    if (customerData.length === 0) {
      return {
        totalCustomers: 0,
        analyzedCustomers: 0,
        segmentDistribution: [],
        customers: [],
      };
    }

    // Calculate RFM values for each customer
    const allRecencies: number[] = [];
    const allFrequencies: number[] = [];
    const allMonetaries: number[] = [];

    const customerMetrics = customerData.map(c => {
      const lastPurchase = new Date(c.lastPurchaseDate);
      const daysSinceLast = Math.floor(
        (now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalOrders = parseInt(c.totalOrders);
      const totalSpend = parseFloat(c.totalSpend);

      allRecencies.push(daysSinceLast);
      allFrequencies.push(totalOrders);
      allMonetaries.push(totalSpend);

      return {
        ...c,
        daysSinceLast,
        totalOrders,
        totalSpend,
      };
    });

    // Calculate RFM scores for each customer
    const customers: CustomerRFM[] = customerMetrics.map(c => {
      const rfmScore = calculateRFMQuintiles(
        { recency: c.daysSinceLast, frequency: c.totalOrders, monetary: c.totalSpend },
        { recencies: allRecencies, frequencies: allFrequencies, monetaries: allMonetaries }
      );

      const rfmScoreString = `${rfmScore.recency}${rfmScore.frequency}${rfmScore.monetary}`;
      const segment = this.getRFMSegment(rfmScoreString);

      return {
        customerId: c.customerId,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        daysSinceLastPurchase: c.daysSinceLast,
        totalOrders: c.totalOrders,
        totalSpend: round(c.totalSpend),
        averageOrderValue: round(c.totalSpend / c.totalOrders),
        rfmScore,
        rfmScoreString,
        segment,
        firstPurchaseDate: new Date(c.firstPurchaseDate),
        lastPurchaseDate: new Date(c.lastPurchaseDate),
      };
    });

    // Calculate segment distribution
    const segmentCounts = new Map<RFMSegment, { count: number; revenue: number }>();
    for (const customer of customers) {
      const existing = segmentCounts.get(customer.segment) || { count: 0, revenue: 0 };
      segmentCounts.set(customer.segment, {
        count: existing.count + 1,
        revenue: existing.revenue + customer.totalSpend,
      });
    }

    const segmentDistribution = Array.from(segmentCounts.entries())
      .map(([segment, data]) => ({
        segment,
        count: data.count,
        percentage: round((data.count / customers.length) * 100),
        totalRevenue: round(data.revenue),
        avgOrderValue: round(data.revenue / data.count),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const result: RFMAnalysisSummary = {
      totalCustomers: await this.customerRepository.count({ where: { businessId } }),
      analyzedCustomers: customers.length,
      segmentDistribution,
      customers,
    };

    // Cache the result
    await analyticsCacheService.setRFMSegmentation(businessId, result);

    return result;
  }

  private getRFMSegment(rfmScore: string): RFMSegment {
    return RFM_SEGMENT_RULES[rfmScore] || DEFAULT_RFM_SEGMENT;
  }

  // ============ SALES FORECASTING ============

  /**
   * Get sales forecast
   */
  async getSalesForecast(
    businessId: string,
    daysAhead = 14,
    useCache = true
  ): Promise<ForecastResult> {
    // Check cache
    if (useCache) {
      const cached = await analyticsCacheService.getForecast(businessId, daysAhead);
      if (cached) return cached;
    }

    // Get last 90 days of daily sales
    const range = this.getLast90Days();
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    const dailySales = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'DATE(order.createdAt) as date',
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: range.startDate,
        end: range.endDate,
      })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const historicalData = dailySales.map(d => ({
      date: formatDate(new Date(d.date)),
      revenue: round(parseFloat(d.revenue)),
      orders: parseInt(d.orders),
    }));

    // Generate forecast
    const forecast = generateForecast(
      historicalData.map(d => ({ date: d.date, value: d.revenue })),
      daysAhead
    );

    // Detect overall trend
    const revenueValues = historicalData.map(d => d.revenue);
    const trend = detectTrend(revenueValues);

    // Calculate moving averages
    const ma7 = simpleMovingAverage(revenueValues, 7);
    const ma30 = simpleMovingAverage(revenueValues, 30);

    // Analyze day-of-week patterns
    const dayPatterns = new Map<string, number[]>();
    for (const d of historicalData) {
      const dayOfWeek = new Date(d.date).getDay();
      const dayName = getDayName(dayOfWeek);
      if (!dayPatterns.has(dayName)) {
        dayPatterns.set(dayName, []);
      }
      dayPatterns.get(dayName)!.push(d.revenue);
    }

    const dayAverages = Array.from(dayPatterns.entries())
      .map(([day, revenues]) => ({ day, avg: mean(revenues) }))
      .sort((a, b) => b.avg - a.avg);

    const result: ForecastResult = {
      historicalData,
      forecast: forecast.map(f => ({
        date: f.date,
        predictedRevenue: f.predicted,
        lowerBound: f.lowerBound,
        upperBound: f.upperBound,
        confidence: f.confidence,
      })),
      trend: trend.direction,
      trendPercentage: round(trend.percentage),
      movingAverage7Day: round(ma7[ma7.length - 1] || 0),
      movingAverage30Day: round(ma30[ma30.length - 1] || 0),
      seasonalPattern: {
        bestDays: dayAverages.slice(0, 2).map(d => d.day),
        worstDays: dayAverages.slice(-2).map(d => d.day),
      },
    };

    // Cache the result
    await analyticsCacheService.setForecast(businessId, daysAhead, result);

    return result;
  }

  // ============ PEAK HOURS ANALYSIS ============

  /**
   * Analyze peak hours for optimal staffing
   */
  async getPeakHoursAnalysis(
    businessId: string,
    useCache = true
  ): Promise<PeakHoursAnalysis> {
    // Check cache
    if (useCache) {
      const cached = await analyticsCacheService.getPeakHours(businessId);
      if (cached) return cached;
    }

    // Analyze last 30 days
    const range = this.getLast30Days();
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    const hourlyData = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'EXTRACT(HOUR FROM order.createdAt) as hour',
        'DATE(order.createdAt) as date',
        'COUNT(order.id) as orders',
        'COALESCE(SUM(order.total), 0) as revenue',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: range.startDate,
        end: range.endDate,
      })
      .groupBy('EXTRACT(HOUR FROM order.createdAt)')
      .addGroupBy('DATE(order.createdAt)')
      .getRawMany();

    // Aggregate by hour
    const hourAggregates = new Map<number, { revenues: number[]; orders: number[] }>();
    for (let h = 0; h < 24; h++) {
      hourAggregates.set(h, { revenues: [], orders: [] });
    }

    for (const row of hourlyData) {
      const hour = parseInt(row.hour);
      const agg = hourAggregates.get(hour)!;
      agg.revenues.push(parseFloat(row.revenue));
      agg.orders.push(parseInt(row.orders));
    }

    // Calculate averages
    const hourlyMetrics: HourlyMetrics[] = [];
    let totalAvgRevenue = 0;
    let totalAvgOrders = 0;

    for (let h = 0; h < 24; h++) {
      const agg = hourAggregates.get(h)!;
      const avgRevenue = mean(agg.revenues);
      const avgOrders = mean(agg.orders);
      const avgOrderValue = avgOrders > 0 ? avgRevenue / avgOrders : 0;

      hourlyMetrics.push({
        hour: h,
        avgRevenue: round(avgRevenue),
        avgOrders: round(avgOrders),
        avgOrderValue: round(avgOrderValue),
        totalRevenue: round(agg.revenues.reduce((a, b) => a + b, 0)),
        totalOrders: agg.orders.reduce((a, b) => a + b, 0),
        dataPoints: agg.revenues.length,
      });

      totalAvgRevenue += avgRevenue;
      totalAvgOrders += avgOrders;
    }

    const overallAvgRevenue = totalAvgRevenue / 24;
    const overallAvgOrders = totalAvgOrders / 24;

    // Identify peak and slow hours
    const peakThreshold = overallAvgRevenue * 1.2; // 120% of average
    const slowThreshold = overallAvgRevenue * 0.8; // 80% of average

    const peakHours = hourlyMetrics
      .filter(h => h.avgRevenue >= peakThreshold)
      .map(h => h.hour);

    const slowHours = hourlyMetrics
      .filter(h => h.avgRevenue <= slowThreshold && h.avgRevenue > 0)
      .map(h => h.hour);

    const busiestHour = hourlyMetrics.reduce(
      (max, h) => (h.avgRevenue > max.avgRevenue ? h : max),
      hourlyMetrics[0]
    ).hour;

    const slowestHour = hourlyMetrics
      .filter(h => h.avgRevenue > 0)
      .reduce(
        (min, h) => (h.avgRevenue < min.avgRevenue ? h : min),
        hourlyMetrics.find(h => h.avgRevenue > 0) || hourlyMetrics[0]
      ).hour;

    // Generate recommendation
    let recommendation = '';
    if (peakHours.length > 0) {
      const peakTimes = peakHours.map(h => `${h}:00`).join(', ');
      recommendation = `Peak business hours are ${peakTimes}. Consider scheduling additional staff during these times.`;
    }
    if (slowHours.length > 0 && slowHours.length < 12) {
      const slowTimes = slowHours.map(h => `${h}:00`).join(', ');
      recommendation += ` Slow periods at ${slowTimes} may allow for reduced staffing or inventory tasks.`;
    }

    const result: PeakHoursAnalysis = {
      hourlyData: hourlyMetrics,
      peakHours,
      slowHours,
      busiestHour,
      slowestHour,
      averageHourlyRevenue: round(overallAvgRevenue),
      averageHourlyOrders: round(overallAvgOrders),
      recommendation: recommendation.trim(),
    };

    // Cache the result
    await analyticsCacheService.setPeakHours(businessId, result);

    return result;
  }

  // ============ STAFF PERFORMANCE ============

  /**
   * Get staff performance metrics
   */
  async getStaffPerformance(
    businessId: string,
    period: ReportPeriod = ReportPeriod.THIS_MONTH,
    useCache = true
  ): Promise<StaffPerformanceSummary> {
    // Check cache
    if (useCache) {
      const cached = await analyticsCacheService.getStaffPerformance(businessId, period);
      if (cached) return cached;
    }

    const dateRange = analyticsService.getDateRange(period);
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    // Get sales data by staff
    const staffSales = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'user.id as "userId"',
        'user.firstName as "firstName"',
        'user.lastName as "lastName"',
        'user.email as "userEmail"',
        'user.role as role',
        'COUNT(order.id) as "orderCount"',
        'COALESCE(SUM(order.total), 0) as "totalSales"',
        'COALESCE(SUM(order.subTotal), 0) as "itemsValue"',
      ])
      .innerJoin('order.createdBy', 'user')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('user.id')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.email')
      .addGroupBy('user.role')
      .orderBy('"totalSales"', 'DESC')
      .getRawMany();

    // Get items sold per staff
    const staffItems = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'user.id as "userId"',
        'SUM(item.quantity) as "itemsSold"',
      ])
      .innerJoin('item.order', 'order')
      .innerJoin('order.createdBy', 'user')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('user.id')
      .getRawMany();

    const itemsMap = new Map(staffItems.map(s => [s.userId, parseInt(s.itemsSold)]));

    // Calculate totals
    const totalSales = staffSales.reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
    const totalOrders = staffSales.reduce((sum, s) => sum + parseInt(s.orderCount), 0);
    const topSales = staffSales.length > 0 ? parseFloat(staffSales[0].totalSales) : 0;
    const avgSales = staffSales.length > 0 ? totalSales / staffSales.length : 0;

    // Build staff metrics
    const staff: StaffPerformanceMetrics[] = staffSales.map((s, index) => {
      const sales = parseFloat(s.totalSales);
      const orders = parseInt(s.orderCount);

      return {
        userId: s.userId,
        userName: `${s.firstName} ${s.lastName}`.trim(),
        userEmail: s.userEmail,
        role: s.role,
        totalSales: round(sales),
        orderCount: orders,
        averageOrderValue: orders > 0 ? round(sales / orders) : 0,
        itemsSold: itemsMap.get(s.userId) || 0,
        salesPerHour: 0, // Would need shift data
        transactionsPerShift: 0, // Would need shift data
        conversionRate: 0, // Would need traffic data
        rank: index + 1,
        percentOfTopPerformer: topSales > 0 ? round((sales / topSales) * 100) : 0,
        vsTeamAverage: avgSales > 0 ? round(((sales - avgSales) / avgSales) * 100) : 0,
        totalHoursWorked: 0, // Would need shift data
        averageTransactionTime: 0, // Would need more detailed timing
      };
    });

    const result: StaffPerformanceSummary = {
      period: dateRange,
      totalStaff: staff.length,
      totalSales: round(totalSales),
      totalOrders,
      averageSalesPerStaff: round(avgSales),
      topPerformer: staff.length > 0 ? staff[0] : null,
      staff,
    };

    // Cache the result
    await analyticsCacheService.setStaffPerformance(businessId, period, result);

    return result;
  }

  // ============ INVENTORY INTELLIGENCE ============

  /**
   * Get intelligent inventory insights with reorder predictions
   */
  async getInventoryIntelligence(
    businessId: string,
    useCache = true
  ): Promise<InventoryIntelligenceSummary> {
    // Check cache
    if (useCache) {
      const cached = await analyticsCacheService.getInventoryIntelligence(businessId);
      if (cached) return cached;
    }

    // Get all active products
    const products = await this.productRepository.find({
      where: { businessId, enabled: true },
      relations: ['category'],
    });

    // Get sales velocity for last 30 days
    const range = this.getLast30Days();
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    const salesData = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'product.id as "productId"',
        'SUM(item.quantity) as "totalSold"',
        'COUNT(DISTINCT DATE(order.createdAt)) as "salesDays"',
      ])
      .innerJoin('item.product', 'product')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: range.startDate,
        end: range.endDate,
      })
      .groupBy('product.id')
      .getRawMany();

    const salesMap = new Map(
      salesData.map(s => [
        s.productId,
        {
          totalSold: parseInt(s.totalSold),
          salesDays: parseInt(s.salesDays),
        },
      ])
    );

    // Calculate intelligence for each product
    let totalStockValue = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let overstocked = 0;
    let deadStock = 0;

    const productIntelligence: InventoryIntelligence[] = products.map(product => {
      const sales = salesMap.get(product.id) || { totalSold: 0, salesDays: 0 };
      const avgDailySales = sales.salesDays > 0 ? sales.totalSold / 30 : 0;
      const avgWeeklySales = avgDailySales * 7;

      const currentStock = product.quantity;
      const stockValue = currentStock * (product.purchasePrice || 0);
      totalStockValue += stockValue;

      // Determine sales velocity
      let salesVelocity: 'fast_moving' | 'normal' | 'slow_moving' | 'dead_stock';
      if (avgDailySales >= 5) {
        salesVelocity = 'fast_moving';
      } else if (avgDailySales >= 1) {
        salesVelocity = 'normal';
      } else if (avgDailySales > 0) {
        salesVelocity = 'slow_moving';
      } else {
        salesVelocity = 'dead_stock';
        deadStock++;
      }

      // Calculate days until stockout
      const daysUntilStockout = calculateDaysUntilStockout(currentStock, avgDailySales);

      // Calculate reorder recommendations
      const reorderPoint = calculateReorderPoint(avgDailySales, 7); // 7 day lead time
      const suggestedReorderQty = calculateReorderQuantity(avgDailySales);
      const needsReorder = currentStock <= reorderPoint && avgDailySales > 0;

      // Update counters
      if (currentStock === 0) {
        outOfStock++;
      } else if (needsReorder) {
        lowStock++;
      } else if (daysUntilStockout && daysUntilStockout > 90) {
        overstocked++;
      }

      // Calculate turnover rate (annualized)
      const annualSales = avgDailySales * 365;
      const avgInventory = currentStock / 2; // Simplified
      const turnoverRate = calculateTurnoverRate(
        annualSales * (product.purchasePrice || 0),
        avgInventory * (product.purchasePrice || 0)
      );

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        categoryName: product.category?.name || null,
        currentStock,
        reservedStock: 0, // Would need cache service integration
        availableStock: currentStock,
        avgDailySales: round(avgDailySales),
        avgWeeklySales: round(avgWeeklySales),
        salesVelocity,
        daysUntilStockout,
        estimatedStockoutDate: daysUntilStockout
          ? formatDate(new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000))
          : null,
        reorderPoint: Math.ceil(reorderPoint),
        suggestedReorderQty: Math.ceil(suggestedReorderQty),
        needsReorder,
        stockValue: round(stockValue),
        potentialRevenue: round(currentStock * product.sellingPrice),
        turnoverRate: round(turnoverRate),
        daysOfInventory: avgDailySales > 0 ? Math.ceil(currentStock / avgDailySales) : 999,
      };
    });

    // Sort by urgency (needs reorder first, then by days until stockout)
    productIntelligence.sort((a, b) => {
      if (a.needsReorder !== b.needsReorder) {
        return a.needsReorder ? -1 : 1;
      }
      const aDays = a.daysUntilStockout ?? 999;
      const bDays = b.daysUntilStockout ?? 999;
      return aDays - bDays;
    });

    const avgTurnover = mean(productIntelligence.map(p => p.turnoverRate));

    const result: InventoryIntelligenceSummary = {
      totalProducts: products.length,
      totalStockValue: round(totalStockValue),
      averageTurnoverRate: round(avgTurnover),
      alerts: {
        outOfStock,
        lowStock,
        overstocked,
        deadStock,
      },
      products: productIntelligence,
    };

    // Cache the result
    await analyticsCacheService.setInventoryIntelligence(businessId, result);

    return result;
  }

  // ============ REVENUE TRENDS ============

  /**
   * Get detailed revenue trends with projections
   */
  async getRevenueTrends(
    businessId: string,
    period: ReportPeriod = ReportPeriod.THIS_MONTH,
    useCache = true
  ): Promise<RevenueTrendsSummary> {
    // Check cache
    if (useCache) {
      const cached = await analyticsCacheService.getRevenueTrends(businessId, period);
      if (cached) return cached;
    }

    const dateRange = analyticsService.getDateRange(period);
    const previousRange = this.getPreviousPeriodRange(dateRange);
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    // Get daily data for current period
    const dailyData = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'DATE(order.createdAt) as date',
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
        'COUNT(DISTINCT order.customerId) as customers',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Get previous period totals for comparison
    const previousTotals = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: previousRange.startDate,
        end: previousRange.endDate,
      })
      .getRawOne();

    // Get new customers in period
    const newCustomersData = await this.customerRepository
      .createQueryBuilder('customer')
      .select('DATE(customer.createdAt) as date')
      .addSelect('COUNT(customer.id) as count')
      .where('customer.businessId = :businessId', { businessId })
      .andWhere('customer.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('DATE(customer.createdAt)')
      .getRawMany();

    const newCustomersMap = new Map(
      newCustomersData.map(d => [formatDate(new Date(d.date)), parseInt(d.count)])
    );

    // Build daily trend
    const dailyTrend: RevenueTrendData[] = dailyData.map(d => ({
      date: formatDate(new Date(d.date)),
      revenue: round(parseFloat(d.revenue)),
      orders: parseInt(d.orders),
      averageOrderValue: parseInt(d.orders) > 0
        ? round(parseFloat(d.revenue) / parseInt(d.orders))
        : 0,
      customers: parseInt(d.customers),
      newCustomers: newCustomersMap.get(formatDate(new Date(d.date))) || 0,
    }));

    // Analyze by day of week
    const weekdayData = new Map<number, { revenues: number[]; orders: number[] }>();
    for (let i = 0; i < 7; i++) {
      weekdayData.set(i, { revenues: [], orders: [] });
    }

    for (const d of dailyTrend) {
      const dayOfWeek = new Date(d.date).getDay();
      const data = weekdayData.get(dayOfWeek)!;
      data.revenues.push(d.revenue);
      data.orders.push(d.orders);
    }

    const totalWeeklyRevenue = dailyTrend.reduce((sum, d) => sum + d.revenue, 0);

    const weekdayAnalysis: WeekdayAnalysis[] = Array.from(weekdayData.entries())
      .map(([day, data]) => ({
        dayOfWeek: day,
        dayName: getDayName(day),
        avgRevenue: round(mean(data.revenues)),
        avgOrders: round(mean(data.orders)),
        percentage: totalWeeklyRevenue > 0
          ? round((data.revenues.reduce((a, b) => a + b, 0) / totalWeeklyRevenue) * 100)
          : 0,
      }))
      .sort((a, b) => b.avgRevenue - a.avgRevenue);

    // Calculate totals and growth
    const totalRevenue = dailyTrend.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dailyTrend.reduce((sum, d) => sum + d.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const prevRevenue = parseFloat(previousTotals?.revenue || '0');
    const prevOrders = parseInt(previousTotals?.orders || '0');
    const prevAOV = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    // Project month end
    const daysElapsed = getCurrentDayOfMonth();
    const daysInMonth = getDaysInCurrentMonth();
    const projectedRevenue = projectMonthEndRevenue(totalRevenue, daysElapsed, daysInMonth);
    const projectedOrders = projectMonthEndRevenue(totalOrders, daysElapsed, daysInMonth);

    const result: RevenueTrendsSummary = {
      period: dateRange,
      totalRevenue: round(totalRevenue),
      totalOrders,
      averageOrderValue: round(avgOrderValue),
      dailyTrend,
      weekdayAnalysis,
      revenueGrowth: percentageChange(totalRevenue, prevRevenue),
      orderGrowth: percentageChange(totalOrders, prevOrders),
      aovGrowth: percentageChange(avgOrderValue, prevAOV),
      projectedMonthEndRevenue: round(projectedRevenue),
      projectedMonthEndOrders: Math.round(projectedOrders),
    };

    // Cache the result
    await analyticsCacheService.setRevenueTrends(businessId, period, result);

    return result;
  }

  // ============ ENHANCED DASHBOARD ============

  /**
   * Get enhanced dashboard with real-time metrics, comparisons, and insights
   */
  async getEnhancedDashboard(
    businessId: string,
    useCache = true
  ): Promise<EnhancedDashboardSummary> {
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];
    const now = new Date();

    // Get today's date range (start of day to now)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = now;

    // Get current hour range
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const currentHourEnd = now;

    // Get yesterday's range
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);

    // Get last week same day range
    const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(todayEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get last month same day range
    const lastMonthStart = new Date(todayStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(todayEnd);
    lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);

    // Fetch today's metrics
    const todayMetrics = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
        'COUNT(DISTINCT order.customerId) as customers',
        'MAX(order.createdAt) as "lastOrderTime"',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: todayStart,
        end: todayEnd,
      })
      .getRawOne();

    // Fetch current hour sales
    const currentHourMetrics = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total), 0) as revenue')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: currentHourStart,
        end: currentHourEnd,
      })
      .getRawOne();

    // Fetch yesterday's metrics for comparison
    const yesterdayMetrics = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: yesterdayStart,
        end: yesterdayEnd,
      })
      .getRawOne();

    // Fetch last week same day metrics
    const lastWeekMetrics = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: lastWeekStart,
        end: lastWeekEnd,
      })
      .getRawOne();

    // Fetch last month same day metrics
    const lastMonthMetrics = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COALESCE(SUM(order.total), 0) as revenue',
        'COUNT(order.id) as orders',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: lastMonthStart,
        end: lastMonthEnd,
      })
      .getRawOne();

    // Get top products today
    const topProductsData = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'product.id as id',
        'product.name as name',
        'SUM(item.quantity) as quantity',
        'SUM(item.lineTotal) as revenue',
      ])
      .innerJoin('item.product', 'product')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: todayStart,
        end: todayEnd,
      })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany();

    // Get hourly breakdown for today
    const hourlyData = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'EXTRACT(HOUR FROM order.createdAt) as hour',
        'COUNT(order.id) as orders',
        'COALESCE(SUM(order.total), 0) as revenue',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: todayStart,
        end: todayEnd,
      })
      .groupBy('EXTRACT(HOUR FROM order.createdAt)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Build hourly breakdown (fill all 24 hours)
    const hourlyBreakdown: HourlyMetrics[] = [];
    for (let h = 0; h < 24; h++) {
      const hourData = hourlyData.find(d => parseInt(d.hour) === h);
      const revenue = hourData ? parseFloat(hourData.revenue) : 0;
      const orders = hourData ? parseInt(hourData.orders) : 0;
      hourlyBreakdown.push({
        hour: h,
        avgRevenue: round(revenue),
        avgOrders: round(orders),
        avgOrderValue: orders > 0 ? round(revenue / orders) : 0,
        totalRevenue: round(revenue),
        totalOrders: orders,
        dataPoints: 1,
      });
    }

    // Get payment methods distribution
    const paymentData = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.method as method',
        'COUNT(payment.id) as count',
        'COALESCE(SUM(payment.amountApplied), 0) as amount',
      ])
      .innerJoin('payment.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('payment.status = :status', { status: PaymentStatus.CAPTURED })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: todayStart,
        end: todayEnd,
      })
      .groupBy('payment.method')
      .getRawMany();

    const totalPayments = paymentData.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const paymentMethods = paymentData.map(p => ({
      method: p.method as PaymentMethod,
      count: parseInt(p.count),
      amount: round(parseFloat(p.amount)),
      percentage: totalPayments > 0 ? round((parseFloat(p.amount) / totalPayments) * 100) : 0,
    }));

    // Parse metrics
    const todayRevenue = parseFloat(todayMetrics?.revenue || '0');
    const todayOrders = parseInt(todayMetrics?.orders || '0');
    const todayCustomers = parseInt(todayMetrics?.customers || '0');
    const currentHourSales = parseFloat(currentHourMetrics?.revenue || '0');
    const lastOrderTime = todayMetrics?.lastOrderTime ? new Date(todayMetrics.lastOrderTime) : null;

    const yesterdayRevenue = parseFloat(yesterdayMetrics?.revenue || '0');
    const yesterdayOrders = parseInt(yesterdayMetrics?.orders || '0');

    const lastWeekRevenue = parseFloat(lastWeekMetrics?.revenue || '0');
    const lastWeekOrders = parseInt(lastWeekMetrics?.orders || '0');

    const lastMonthRevenue = parseFloat(lastMonthMetrics?.revenue || '0');
    const lastMonthOrders = parseInt(lastMonthMetrics?.orders || '0');

    // Generate insights
    const insights = this.generateDashboardInsights(
      todayRevenue,
      todayOrders,
      yesterdayRevenue,
      yesterdayOrders,
      lastWeekRevenue,
      topProductsData
    );

    const result: EnhancedDashboardSummary = {
      realTimeMetrics: {
        todaySales: round(todayRevenue),
        todayOrders,
        todayCustomers,
        currentHourSales: round(currentHourSales),
        lastOrderTime,
      },
      comparisons: {
        vsYesterday: {
          revenue: round(yesterdayRevenue),
          orders: yesterdayOrders,
          percentChange: percentageChange(todayRevenue, yesterdayRevenue),
        },
        vsLastWeek: {
          revenue: round(lastWeekRevenue),
          orders: lastWeekOrders,
          percentChange: percentageChange(todayRevenue, lastWeekRevenue),
        },
        vsLastMonth: {
          revenue: round(lastMonthRevenue),
          orders: lastMonthOrders,
          percentChange: percentageChange(todayRevenue, lastMonthRevenue),
        },
      },
      topProducts: topProductsData.map(p => ({
        id: p.id,
        name: p.name,
        quantity: parseInt(p.quantity),
        revenue: round(parseFloat(p.revenue)),
      })),
      insights,
      hourlyBreakdown,
      paymentMethods,
    };

    return result;
  }

  /**
   * Generate dashboard insights based on metrics
   */
  private generateDashboardInsights(
    todayRevenue: number,
    todayOrders: number,
    yesterdayRevenue: number,
    yesterdayOrders: number,
    lastWeekRevenue: number,
    topProducts: Array<{ name: string; revenue: string }>
  ): Array<{ type: 'positive' | 'negative' | 'neutral'; title: string; description: string; metric?: string }> {
    const insights: Array<{ type: 'positive' | 'negative' | 'neutral'; title: string; description: string; metric?: string }> = [];

    // Revenue comparison insight
    const revenueChangeVsYesterday = percentageChange(todayRevenue, yesterdayRevenue);
    if (revenueChangeVsYesterday > 10) {
      insights.push({
        type: 'positive',
        title: 'Strong Day',
        description: `Revenue is up ${revenueChangeVsYesterday.toFixed(1)}% compared to yesterday`,
        metric: `+${revenueChangeVsYesterday.toFixed(1)}%`,
      });
    } else if (revenueChangeVsYesterday < -10) {
      insights.push({
        type: 'negative',
        title: 'Slow Day',
        description: `Revenue is down ${Math.abs(revenueChangeVsYesterday).toFixed(1)}% compared to yesterday`,
        metric: `${revenueChangeVsYesterday.toFixed(1)}%`,
      });
    }

    // Week over week comparison
    const revenueChangeVsLastWeek = percentageChange(todayRevenue, lastWeekRevenue);
    if (revenueChangeVsLastWeek > 20) {
      insights.push({
        type: 'positive',
        title: 'Weekly Growth',
        description: `Revenue is up ${revenueChangeVsLastWeek.toFixed(1)}% vs same day last week`,
        metric: `+${revenueChangeVsLastWeek.toFixed(1)}%`,
      });
    }

    // Top product insight
    if (topProducts.length > 0) {
      insights.push({
        type: 'neutral',
        title: 'Top Seller',
        description: `${topProducts[0].name} is leading sales today`,
        metric: `$${parseFloat(topProducts[0].revenue).toFixed(2)}`,
      });
    }

    // Order count insight
    if (todayOrders > yesterdayOrders && todayOrders > 0) {
      insights.push({
        type: 'positive',
        title: 'Order Volume Up',
        description: `${todayOrders} orders today vs ${yesterdayOrders} yesterday`,
      });
    }

    // If no orders yet today
    if (todayOrders === 0) {
      insights.push({
        type: 'neutral',
        title: 'No Orders Yet',
        description: 'No completed orders recorded today',
      });
    }

    return insights;
  }

  // ============ CUSTOMER COHORT ANALYSIS ============

  /**
   * Get customer cohort analysis for retention tracking
   */
  async getCustomerCohorts(
    businessId: string,
    useCache = true
  ): Promise<CohortAnalysisSummary> {
    // Check cache
    if (useCache) {
      const cached = await analyticsCacheService.getCustomerCohorts(businessId);
      if (cached) return cached;
    }

    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    // Get first purchase date per customer (cohort assignment)
    const customerFirstPurchase = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.customerId as "customerId"',
        'MIN(order.createdAt) as "firstPurchaseDate"',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.customerId IS NOT NULL')
      .groupBy('order.customerId')
      .getRawMany();

    if (customerFirstPurchase.length === 0) {
      return {
        cohorts: [],
        overallRetentionRate: 0,
        averageLifetimeValue: 0,
        averagePurchaseFrequency: 0,
        churnRate: 100,
      };
    }

    // Assign customers to cohorts (by month of first purchase)
    const customerCohorts = new Map<string, string[]>(); // cohortMonth -> customerIds[]
    for (const c of customerFirstPurchase) {
      const firstDate = new Date(c.firstPurchaseDate);
      const cohortMonth = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`;
      if (!customerCohorts.has(cohortMonth)) {
        customerCohorts.set(cohortMonth, []);
      }
      customerCohorts.get(cohortMonth)!.push(c.customerId);
    }

    // Get all customer orders
    const allOrders = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.customerId as "customerId"',
        'order.createdAt as "orderDate"',
        'order.total as total',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.customerId IS NOT NULL')
      .orderBy('order.createdAt', 'ASC')
      .getRawMany();

    // Group orders by customer
    const ordersByCustomer = new Map<string, Array<{ date: Date; total: number }>>();
    for (const o of allOrders) {
      if (!ordersByCustomer.has(o.customerId)) {
        ordersByCustomer.set(o.customerId, []);
      }
      ordersByCustomer.get(o.customerId)!.push({
        date: new Date(o.orderDate),
        total: parseFloat(o.total),
      });
    }

    // Calculate cohort retention
    const now = new Date();
    const cohorts: CohortData[] = [];
    let totalRetained = 0;
    let totalCustomers = 0;
    let totalLifetimeValue = 0;
    let totalPurchases = 0;

    // Sort cohorts by month
    const sortedCohortMonths = Array.from(customerCohorts.keys()).sort();

    for (const cohortMonth of sortedCohortMonths) {
      const customerIds = customerCohorts.get(cohortMonth)!;
      const cohortSize = customerIds.length;
      totalCustomers += cohortSize;

      // Calculate months since cohort start
      const [year, month] = cohortMonth.split('-').map(Number);
      const cohortStartDate = new Date(year, month - 1, 1);
      const monthsSinceCohort = Math.floor(
        (now.getTime() - cohortStartDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      // Calculate retention for each subsequent month
      const retentionByMonth: number[] = [];
      for (let m = 0; m <= Math.min(monthsSinceCohort, 11); m++) {
        const periodStart = new Date(year, month - 1 + m, 1);
        const periodEnd = new Date(year, month + m, 0, 23, 59, 59);

        let activeCustomers = 0;
        for (const customerId of customerIds) {
          const orders = ordersByCustomer.get(customerId) || [];
          const hasOrderInPeriod = orders.some(
            o => o.date >= periodStart && o.date <= periodEnd
          );
          if (hasOrderInPeriod) {
            activeCustomers++;
          }
        }

        const retentionRate = cohortSize > 0 ? round((activeCustomers / cohortSize) * 100) : 0;
        retentionByMonth.push(retentionRate);

        // Track overall retention (month 1+)
        if (m === 1 && activeCustomers > 0) {
          totalRetained += activeCustomers;
        }
      }

      // Calculate LTV and frequency for this cohort
      for (const customerId of customerIds) {
        const orders = ordersByCustomer.get(customerId) || [];
        totalLifetimeValue += orders.reduce((sum, o) => sum + o.total, 0);
        totalPurchases += orders.length;
      }

      cohorts.push({
        cohortMonth,
        totalCustomers: cohortSize,
        retentionByMonth,
      });
    }

    // Calculate overall metrics
    const overallRetentionRate = totalCustomers > 0
      ? round((totalRetained / totalCustomers) * 100)
      : 0;
    const averageLifetimeValue = totalCustomers > 0
      ? round(totalLifetimeValue / totalCustomers)
      : 0;
    const averagePurchaseFrequency = totalCustomers > 0
      ? round(totalPurchases / totalCustomers, 1)
      : 0;
    const churnRate = 100 - overallRetentionRate;

    const result: CohortAnalysisSummary = {
      cohorts: cohorts.slice(-12), // Last 12 months
      overallRetentionRate,
      averageLifetimeValue,
      averagePurchaseFrequency,
      churnRate: round(churnRate),
    };

    // Cache the result
    await analyticsCacheService.setCustomerCohorts(businessId, result);

    return result;
  }

  // ============ HELPER METHODS ============

  private getLast30Days(): DateRange {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: now };
  }

  private getLast90Days(): DateRange {
    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: now };
  }

  private getPreviousPeriodRange(current: DateRange): DateRange {
    const duration = current.endDate.getTime() - current.startDate.getTime();
    return {
      startDate: new Date(current.startDate.getTime() - duration),
      endDate: new Date(current.startDate.getTime() - 1),
    };
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
