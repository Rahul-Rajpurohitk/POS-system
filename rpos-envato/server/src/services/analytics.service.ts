import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order, OrderItem, Payment, Product, Customer, Refund } from '../entities';
import { OrderStatus, PaymentMethod, PaymentStatus, ReportPeriod } from '../types/enums';

// DTOs
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardSummary {
  sales: SalesSummary;
  orders: OrdersSummary;
  payments: PaymentsSummary;
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  hourlyBreakdown: HourlySales[];
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  totalDiscount: number;
  totalTips: number;
  netRevenue: number;
  comparisonPeriod: {
    revenue: number;
    orders: number;
    percentChange: number;
  };
}

export interface OrdersSummary {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  refunded: number;
  averageItemsPerOrder: number;
}

export interface PaymentsSummary {
  byMethod: PaymentMethodBreakdown[];
  totalRefunds: number;
  refundRate: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  count: number;
  amount: number;
  percentage: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  itemCount: number;
  status: OrderStatus;
  createdAt: Date;
}

export interface HourlySales {
  hour: number;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  period: DateRange;
  summary: SalesSummary;
  dailyBreakdown: DailySales[];
  categoryBreakdown: CategorySales[];
}

export interface DailySales {
  date: string;
  orders: number;
  revenue: number;
  averageOrder: number;
}

export interface CategorySales {
  categoryId: string;
  categoryName: string;
  itemsSold: number;
  revenue: number;
  percentage: number;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  status: 'low' | 'out_of_stock' | 'critical';
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: CustomerSpending[];
  averageLifetimeValue: number;
}

export interface CustomerSpending {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: Date;
}

class AnalyticsService {
  private orderRepository: Repository<Order>;
  private orderItemRepository: Repository<OrderItem>;
  private paymentRepository: Repository<Payment>;
  private productRepository: Repository<Product>;
  private customerRepository: Repository<Customer>;
  private refundRepository: Repository<Refund>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.orderItemRepository = AppDataSource.getRepository(OrderItem);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.productRepository = AppDataSource.getRepository(Product);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.refundRepository = AppDataSource.getRepository(Refund);
  }

  /**
   * Get date range from report period
   */
  getDateRange(period: ReportPeriod, customStart?: Date, customEnd?: Date): DateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case ReportPeriod.TODAY:
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        };

      case ReportPeriod.YESTERDAY: {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          startDate: yesterday,
          endDate: new Date(today.getTime() - 1),
        };
      }

      case ReportPeriod.THIS_WEEK: {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        return {
          startDate: startOfWeek,
          endDate: now,
        };
      }

      case ReportPeriod.LAST_WEEK: {
        const dayOfWeek = now.getDay();
        const endOfLastWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000 - 1);
        const startOfLastWeek = new Date(endOfLastWeek.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
        return {
          startDate: startOfLastWeek,
          endDate: endOfLastWeek,
        };
      }

      case ReportPeriod.THIS_MONTH:
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now,
        };

      case ReportPeriod.LAST_MONTH: {
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return {
          startDate: firstOfLastMonth,
          endDate: lastOfLastMonth,
        };
      }

      case ReportPeriod.THIS_QUARTER: {
        const quarter = Math.floor(now.getMonth() / 3);
        return {
          startDate: new Date(now.getFullYear(), quarter * 3, 1),
          endDate: now,
        };
      }

      case ReportPeriod.LAST_QUARTER: {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return {
          startDate: new Date(year, lastQuarter * 3, 1),
          endDate: new Date(year, lastQuarter * 3 + 3, 0, 23, 59, 59),
        };
      }

      case ReportPeriod.THIS_YEAR:
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: now,
        };

      case ReportPeriod.LAST_YEAR:
        return {
          startDate: new Date(now.getFullYear() - 1, 0, 1),
          endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
        };

      case ReportPeriod.CUSTOM:
        if (!customStart || !customEnd) {
          throw new Error('Custom period requires start and end dates');
        }
        return { startDate: customStart, endDate: customEnd };

      default:
        return { startDate: today, endDate: now };
    }
  }

  /**
   * Get dashboard summary for a business
   */
  async getDashboardSummary(
    businessId: string,
    period: ReportPeriod = ReportPeriod.TODAY
  ): Promise<DashboardSummary> {
    const dateRange = this.getDateRange(period);
    const previousRange = this.getPreviousPeriodRange(dateRange);

    const [
      salesSummary,
      ordersSummary,
      paymentsSummary,
      topProducts,
      recentOrders,
      hourlyBreakdown,
    ] = await Promise.all([
      this.getSalesSummary(businessId, dateRange, previousRange),
      this.getOrdersSummary(businessId, dateRange),
      this.getPaymentsSummary(businessId, dateRange),
      this.getTopProducts(businessId, dateRange, 10),
      this.getRecentOrders(businessId, 10),
      this.getHourlySales(businessId, dateRange),
    ]);

    return {
      sales: salesSummary,
      orders: ordersSummary,
      payments: paymentsSummary,
      topProducts,
      recentOrders,
      hourlyBreakdown,
    };
  }

  /**
   * Get sales summary with comparison
   */
  async getSalesSummary(
    businessId: string,
    dateRange: DateRange,
    previousRange?: DateRange
  ): Promise<SalesSummary> {
    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED];

    // Current period
    const currentOrders = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'COUNT(order.id) as orderCount',
        'COALESCE(SUM(order.total), 0) as totalRevenue',
        'COALESCE(SUM(order.taxAmount), 0) as totalTax',
        'COALESCE(SUM(order.discount), 0) as totalDiscount',
        'COALESCE(SUM(order.tipAmount), 0) as totalTips',
        'COALESCE(AVG(order.total), 0) as averageOrder',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .getRawOne();

    // Previous period for comparison
    let comparison = { revenue: 0, orders: 0, percentChange: 0 };

    if (previousRange) {
      const prevOrders = await this.orderRepository
        .createQueryBuilder('order')
        .select([
          'COUNT(order.id) as orderCount',
          'COALESCE(SUM(order.total), 0) as totalRevenue',
        ])
        .where('order.businessId = :businessId', { businessId })
        .andWhere('order.status IN (:...statuses)', { statuses: completedStatuses })
        .andWhere('order.createdAt BETWEEN :start AND :end', {
          start: previousRange.startDate,
          end: previousRange.endDate,
        })
        .getRawOne();

      const prevRevenue = parseFloat(prevOrders?.totalRevenue || '0');
      const currentRevenue = parseFloat(currentOrders?.totalRevenue || '0');

      comparison = {
        revenue: prevRevenue,
        orders: parseInt(prevOrders?.orderCount || '0'),
        percentChange:
          prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      };
    }

    const totalRevenue = parseFloat(currentOrders?.totalRevenue || '0');
    const totalTax = parseFloat(currentOrders?.totalTax || '0');
    const totalDiscount = parseFloat(currentOrders?.totalDiscount || '0');
    const totalTips = parseFloat(currentOrders?.totalTips || '0');

    return {
      totalRevenue: this.round(totalRevenue),
      totalOrders: parseInt(currentOrders?.orderCount || '0'),
      averageOrderValue: this.round(parseFloat(currentOrders?.averageOrder || '0')),
      totalTax: this.round(totalTax),
      totalDiscount: this.round(totalDiscount),
      totalTips: this.round(totalTips),
      netRevenue: this.round(totalRevenue - totalTax),
      comparisonPeriod: {
        revenue: this.round(comparison.revenue),
        orders: comparison.orders,
        percentChange: this.round(comparison.percentChange),
      },
    };
  }

  /**
   * Get orders summary
   */
  async getOrdersSummary(businessId: string, dateRange: DateRange): Promise<OrdersSummary> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.status as status',
        'COUNT(order.id) as count',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('order.status')
      .getRawMany();

    const statusCounts = orders.reduce(
      (acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      },
      {} as Record<string, number>
    );

    // Average items per order
    const avgItems = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .select('AVG(item.quantity)', 'avgItems')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .getRawOne();

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    return {
      total,
      completed: statusCounts[OrderStatus.COMPLETED] || 0,
      pending: statusCounts[OrderStatus.PENDING] || 0,
      cancelled: statusCounts[OrderStatus.CANCELLED] || 0,
      refunded:
        (statusCounts[OrderStatus.REFUNDED] || 0) +
        (statusCounts[OrderStatus.PARTIALLY_REFUNDED] || 0),
      averageItemsPerOrder: this.round(parseFloat(avgItems?.avgItems || '0')),
    };
  }

  /**
   * Get payments breakdown by method
   */
  async getPaymentsSummary(businessId: string, dateRange: DateRange): Promise<PaymentsSummary> {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.method as method',
        'COUNT(payment.id) as count',
        'SUM(payment.amountApplied) as amount',
      ])
      .where('payment.businessId = :businessId', { businessId })
      .andWhere('payment.status = :status', { status: PaymentStatus.CAPTURED })
      .andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('payment.method')
      .getRawMany();

    const totalAmount = payments.reduce(
      (sum, p) => sum + parseFloat(p.amount || '0'),
      0
    );

    const byMethod: PaymentMethodBreakdown[] = payments.map((p) => ({
      method: p.method,
      count: parseInt(p.count),
      amount: this.round(parseFloat(p.amount || '0')),
      percentage: totalAmount > 0
        ? this.round((parseFloat(p.amount || '0') / totalAmount) * 100)
        : 0,
    }));

    // Get refunds
    const refundData = await this.refundRepository
      .createQueryBuilder('refund')
      .select('SUM(refund.amount)', 'totalRefunds')
      .where('refund.businessId = :businessId', { businessId })
      .andWhere('refund.status = :status', { status: 'processed' })
      .andWhere('refund.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .getRawOne();

    const totalRefunds = parseFloat(refundData?.totalRefunds || '0');

    return {
      byMethod,
      totalRefunds: this.round(totalRefunds),
      refundRate: totalAmount > 0 ? this.round((totalRefunds / totalAmount) * 100) : 0,
    };
  }

  /**
   * Get top selling products
   */
  async getTopProducts(
    businessId: string,
    dateRange: DateRange,
    limit = 10
  ): Promise<TopProduct[]> {
    const products = await this.orderItemRepository
      .createQueryBuilder('item')
      .select([
        'product.id as id',
        'product.name as name',
        'product.sku as sku',
        'SUM(item.quantity) as quantitySold',
        'SUM(item.total) as revenue',
        'SUM((item.unitPrice - product.costPrice) * item.quantity) as profit',
      ])
      .innerJoin('item.product', 'product')
      .innerJoin('item.order', 'order')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.sku')
      .orderBy('quantitySold', 'DESC')
      .limit(limit)
      .getRawMany();

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      quantitySold: parseInt(p.quantitySold || '0'),
      revenue: this.round(parseFloat(p.revenue || '0')),
      profit: this.round(parseFloat(p.profit || '0')),
    }));
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(businessId: string, limit = 10): Promise<RecentOrder[]> {
    const orders = await this.orderRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['customer', 'items'],
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: String(order.number),
      customerName: order.customer?.name || order.guestName || 'Walk-in Customer',
      total: this.round(Number(order.total)),
      itemCount: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      status: order.status,
      createdAt: order.createdAt,
    }));
  }

  /**
   * Get hourly sales breakdown
   */
  async getHourlySales(businessId: string, dateRange: DateRange): Promise<HourlySales[]> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'EXTRACT(HOUR FROM order.createdAt) as hour',
        'COUNT(order.id) as orders',
        'COALESCE(SUM(order.total), 0) as revenue',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Fill in missing hours with zeros
    const hourlyData: HourlySales[] = [];
    for (let h = 0; h < 24; h++) {
      const found = result.find((r) => parseInt(r.hour) === h);
      hourlyData.push({
        hour: h,
        orders: found ? parseInt(found.orders) : 0,
        revenue: found ? this.round(parseFloat(found.revenue)) : 0,
      });
    }

    return hourlyData;
  }

  /**
   * Get daily sales breakdown
   */
  async getDailySales(businessId: string, dateRange: DateRange): Promise<DailySales[]> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'DATE(order.createdAt) as date',
        'COUNT(order.id) as orders',
        'COALESCE(SUM(order.total), 0) as revenue',
        'COALESCE(AVG(order.total), 0) as averageOrder',
      ])
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      orders: parseInt(r.orders),
      revenue: this.round(parseFloat(r.revenue)),
      averageOrder: this.round(parseFloat(r.averageOrder)),
    }));
  }

  /**
   * Get inventory alerts
   */
  async getInventoryAlerts(businessId: string): Promise<InventoryAlert[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.sku',
        'product.stock',
        'product.minStock',
      ])
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .andWhere('product.stock <= product.minStock')
      .orderBy('product.stock', 'ASC')
      .getMany();

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      currentStock: p.stock,
      minStock: p.minStock,
      status: p.stock === 0 ? 'out_of_stock' : p.stock <= p.minStock / 2 ? 'critical' : 'low',
    }));
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(
    businessId: string,
    dateRange: DateRange
  ): Promise<CustomerAnalytics> {
    // Total customers
    const totalCustomers = await this.customerRepository.count({
      where: { businessId },
    });

    // New customers in period
    const newCustomers = await this.customerRepository.count({
      where: {
        businessId,
        createdAt: Between(dateRange.startDate, dateRange.endDate),
      },
    });

    // Customers who made orders in period
    const customersWithOrders = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerId)', 'count')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.customerId IS NOT NULL')
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .getRawOne();

    // Top customers by spending
    const topCustomers = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'customer.id as id',
        'customer.name as name',
        'customer.email as email',
        'SUM(order.total) as totalSpent',
        'COUNT(order.id) as orderCount',
        'MAX(order.createdAt) as lastOrderDate',
      ])
      .innerJoin('order.customer', 'customer')
      .where('order.businessId = :businessId', { businessId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .groupBy('customer.id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.email')
      .orderBy('totalSpent', 'DESC')
      .limit(10)
      .getRawMany();

    // Average lifetime value
    const avgLtv = await this.orderRepository
      .createQueryBuilder('order')
      .select('AVG(customerTotal.total)', 'avgLtv')
      .from((subQuery) => {
        return subQuery
          .select('SUM(order.total)', 'total')
          .from(Order, 'order')
          .where('order.businessId = :businessId')
          .andWhere('order.customerId IS NOT NULL')
          .andWhere('order.status IN (:...statuses)')
          .groupBy('order.customerId');
      }, 'customerTotal')
      .setParameters({
        businessId,
        statuses: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_REFUNDED],
      })
      .getRawOne();

    return {
      totalCustomers,
      newCustomers,
      returningCustomers: parseInt(customersWithOrders?.count || '0'),
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        totalSpent: this.round(parseFloat(c.totalSpent || '0')),
        orderCount: parseInt(c.orderCount),
        lastOrderDate: new Date(c.lastOrderDate),
      })),
      averageLifetimeValue: this.round(parseFloat(avgLtv?.avgLtv || '0')),
    };
  }

  /**
   * Get category sales breakdown
   */
  async getCategorySales(
    businessId: string,
    dateRange: DateRange
  ): Promise<CategorySales[]> {
    const result = await this.orderItemRepository
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
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    const totalRevenue = result.reduce(
      (sum, r) => sum + parseFloat(r.revenue || '0'),
      0
    );

    return result.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      itemsSold: parseInt(r.itemsSold || '0'),
      revenue: this.round(parseFloat(r.revenue || '0')),
      percentage:
        totalRevenue > 0
          ? this.round((parseFloat(r.revenue || '0') / totalRevenue) * 100)
          : 0,
    }));
  }

  // Helper methods

  private getPreviousPeriodRange(current: DateRange): DateRange {
    const duration = current.endDate.getTime() - current.startDate.getTime();
    return {
      startDate: new Date(current.startDate.getTime() - duration),
      endDate: new Date(current.startDate.getTime() - 1),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

export const analyticsService = new AnalyticsService();
