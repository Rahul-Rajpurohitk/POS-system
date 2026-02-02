import { get } from './client';

export interface ReportsSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  percentChange?: {
    sales: number;
    orders: number;
    customers: number;
  };
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  itemCount: number;
  createdAt: string;
  customerName?: string;
}

interface SalesReportResponse {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  salesByPeriod?: Array<{
    period: string;
    sales: number;
    orders: number;
  }>;
}

interface TopProductsResponse {
  products: TopProduct[];
}

interface DailyReportResponse {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  newCustomers: number;
  recentOrders: RecentOrder[];
}

export type ReportPeriod = 'today' | 'week' | 'month' | 'all';

function getDateRange(period: ReportPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
      // Return a date far in the past to get all records
      startDate = new Date(2000, 0, 1);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate,
  };
}

export const reportsApi = {
  /**
   * Get sales summary for a period
   */
  getSalesSummary: async (period: ReportPeriod): Promise<ReportsSummary> => {
    const { startDate, endDate } = getDateRange(period);
    const response = await get<SalesReportResponse>(
      `/reports/sales?startDate=${startDate}&endDate=${endDate}`
    );

    return {
      totalSales: response.totalSales || 0,
      totalOrders: response.totalOrders || 0,
      averageOrderValue: response.averageOrderValue || 0,
      totalCustomers: response.totalCustomers || 0,
    };
  },

  /**
   * Get top selling products
   */
  getTopProducts: async (
    period: ReportPeriod,
    limit = 5
  ): Promise<TopProduct[]> => {
    const { startDate, endDate } = getDateRange(period);
    const response = await get<TopProductsResponse>(
      `/reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=${limit}`
    );
    return response.products || [];
  },

  /**
   * Get daily report with recent orders
   */
  getDailyReport: async (date?: string): Promise<DailyReportResponse> => {
    const queryDate = date || new Date().toISOString().split('T')[0];
    return get<DailyReportResponse>(`/reports/daily?date=${queryDate}`);
  },

  /**
   * Get weekly report
   */
  getWeeklyReport: async () => {
    return get<{
      totalSales: number;
      totalOrders: number;
      averageOrderValue: number;
      dailyBreakdown: Array<{
        date: string;
        sales: number;
        orders: number;
      }>;
    }>('/reports/weekly');
  },

  /**
   * Get monthly report
   */
  getMonthlyReport: async (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return get<{
      totalSales: number;
      totalOrders: number;
      averageOrderValue: number;
      weeklyBreakdown: Array<{
        week: number;
        sales: number;
        orders: number;
      }>;
    }>(`/reports/monthly${query}`);
  },
};

export default reportsApi;
