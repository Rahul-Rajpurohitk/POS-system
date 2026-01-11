// ============ CORE TYPES ============

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

// ============ ABC CLASSIFICATION ============

export type ABCCategory = 'A' | 'B' | 'C';

export interface ABCClassification {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  quantitySold: number;
  revenue: number;
  profit: number;
  cumulativeRevenue: number;
  cumulativePercentage: number;
  classification: ABCCategory;
}

export interface ABCAnalysisSummary {
  totalProducts: number;
  totalRevenue: number;
  categoryA: {
    count: number;
    revenue: number;
    percentage: number;
  };
  categoryB: {
    count: number;
    revenue: number;
    percentage: number;
  };
  categoryC: {
    count: number;
    revenue: number;
    percentage: number;
  };
  products: ABCClassification[];
}

// ============ RFM SEGMENTATION ============

export type RFMSegment =
  | 'Champions'
  | 'Loyal Customers'
  | 'Potential Loyalists'
  | 'New Customers'
  | 'Promising'
  | 'Need Attention'
  | 'About to Sleep'
  | 'At Risk'
  | 'Cannot Lose'
  | 'Hibernating'
  | 'Lost';

export interface RFMScore {
  recency: number;
  frequency: number;
  monetary: number;
}

export interface CustomerRFM {
  customerId: string;
  customerName: string;
  customerEmail: string;
  daysSinceLastPurchase: number;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  rfmScore: RFMScore;
  rfmScoreString: string;
  segment: RFMSegment;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
}

export interface RFMSegmentDistribution {
  segment: RFMSegment;
  count: number;
  percentage: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export interface RFMAnalysisSummary {
  totalCustomers: number;
  analyzedCustomers: number;
  segmentDistribution: RFMSegmentDistribution[];
  customers: CustomerRFM[];
}

// ============ SALES FORECASTING ============

export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface SalesForecast {
  date: string;
  predictedRevenue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ForecastResult {
  historicalData: DailySalesData[];
  forecast: SalesForecast[];
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
  movingAverage7Day: number;
  movingAverage30Day: number;
  seasonalPattern: {
    bestDays: string[];
    worstDays: string[];
  };
}

// ============ PEAK HOURS ANALYSIS ============

export interface HourlyMetrics {
  hour: number;
  avgRevenue: number;
  avgOrders: number;
  avgOrderValue: number;
  totalRevenue: number;
  totalOrders: number;
  dataPoints: number;
}

export interface PeakHoursAnalysis {
  hourlyData: HourlyMetrics[];
  peakHours: number[];
  slowHours: number[];
  busiestHour: number;
  slowestHour: number;
  averageHourlyRevenue: number;
  averageHourlyOrders: number;
  recommendation: string;
}

// ============ STAFF PERFORMANCE ============

export interface StaffPerformanceMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  itemsSold: number;
  salesPerHour: number;
  transactionsPerShift: number;
  conversionRate: number;
  rank: number;
  percentOfTopPerformer: number;
  vsTeamAverage: number;
  totalHoursWorked: number;
  averageTransactionTime: number;
}

export interface StaffPerformanceSummary {
  period: DateRange;
  totalStaff: number;
  totalSales: number;
  totalOrders: number;
  averageSalesPerStaff: number;
  topPerformer: StaffPerformanceMetrics | null;
  staff: StaffPerformanceMetrics[];
}

// ============ INVENTORY INTELLIGENCE ============

export type InventoryTrend = 'fast_moving' | 'normal' | 'slow_moving' | 'dead_stock';

export interface InventoryIntelligence {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  avgDailySales: number;
  avgWeeklySales: number;
  salesVelocity: InventoryTrend;
  daysUntilStockout: number | null;
  estimatedStockoutDate: string | null;
  reorderPoint: number;
  suggestedReorderQty: number;
  needsReorder: boolean;
  stockValue: number;
  potentialRevenue: number;
  turnoverRate: number;
  daysOfInventory: number;
}

export interface InventoryIntelligenceSummary {
  totalProducts: number;
  totalStockValue: number;
  averageTurnoverRate: number;
  alerts: {
    outOfStock: number;
    lowStock: number;
    overstocked: number;
    deadStock: number;
  };
  products: InventoryIntelligence[];
}

// ============ REVENUE TRENDS ============

export interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  customers: number;
  newCustomers: number;
}

export interface WeekdayAnalysis {
  dayOfWeek: number;
  dayName: string;
  avgRevenue: number;
  avgOrders: number;
  percentage: number;
}

export interface RevenueTrendsSummary {
  period: DateRange;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  dailyTrend: RevenueTrendData[];
  weekdayAnalysis: WeekdayAnalysis[];
  revenueGrowth: number;
  orderGrowth: number;
  aovGrowth: number;
  projectedMonthEndRevenue: number;
  projectedMonthEndOrders: number;
}

// ============ CUSTOMER COHORTS ============

export interface CohortData {
  cohortMonth: string;
  totalCustomers: number;
  retentionByMonth: number[];
}

export interface CohortAnalysisSummary {
  cohorts: CohortData[];
  overallRetentionRate: number;
  averageLifetimeValue: number;
  averagePurchaseFrequency: number;
  churnRate: number;
}

// ============ ENHANCED DASHBOARD ============

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'gift_card' | 'split';

export interface DashboardComparison {
  revenue: number;
  orders: number;
  percentChange: number;
}

export interface DashboardInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
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
  quantity: number;
  revenue: number;
}

export interface EnhancedDashboardSummary {
  realTimeMetrics: {
    todaySales: number;
    todayOrders: number;
    todayCustomers: number;
    currentHourSales: number;
    lastOrderTime: string | null;
  };
  comparisons: {
    vsYesterday: DashboardComparison;
    vsLastWeek: DashboardComparison;
    vsLastMonth: DashboardComparison;
  };
  topProducts: TopProduct[];
  insights: DashboardInsight[];
  hourlyBreakdown: HourlyMetrics[];
  paymentMethods: PaymentMethodBreakdown[];
}

// ============ API RESPONSE TYPES ============

export interface AnalyticsApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ProductPerformanceResponse {
  period: DateRange;
  abcClassification: ABCAnalysisSummary;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

export interface CacheStatusResponse {
  businessId: string;
  missingCaches: string[];
  allCached: boolean;
  timestamp: string;
}
