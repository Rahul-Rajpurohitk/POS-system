import { ReportPeriod, PaymentMethod } from './enums';

// ============ CORE TYPES ============

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsFilters {
  businessId: string;
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
  locationId?: string;
  categoryId?: string;
  customerId?: string;
  userId?: string;
}

// ============ ABC CLASSIFICATION (Pareto Analysis) ============

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
  recency: number;    // 1-5 score
  frequency: number;  // 1-5 score
  monetary: number;   // 1-5 score
}

export interface CustomerRFM {
  customerId: string;
  customerName: string;
  customerEmail: string;

  // Raw values
  daysSinceLastPurchase: number;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;

  // RFM scores (1-5)
  rfmScore: RFMScore;
  rfmScoreString: string;  // e.g., "543"

  // Segment classification
  segment: RFMSegment;

  // Metadata
  firstPurchaseDate: Date;
  lastPurchaseDate: Date;
}

export interface RFMAnalysisSummary {
  totalCustomers: number;
  analyzedCustomers: number;
  segmentDistribution: Array<{
    segment: RFMSegment;
    count: number;
    percentage: number;
    totalRevenue: number;
    avgOrderValue: number;
  }>;
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
    bestDays: string[];   // e.g., ['Friday', 'Saturday']
    worstDays: string[];  // e.g., ['Monday', 'Tuesday']
  };
}

// ============ PEAK HOURS ANALYSIS ============

export interface HourlyMetrics {
  hour: number;              // 0-23
  avgRevenue: number;
  avgOrders: number;
  avgOrderValue: number;
  totalRevenue: number;
  totalOrders: number;
  dataPoints: number;        // Number of days analyzed
}

export interface PeakHoursAnalysis {
  hourlyData: HourlyMetrics[];
  peakHours: number[];       // Hours with >120% of average
  slowHours: number[];       // Hours with <80% of average
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

  // Sales metrics
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  itemsSold: number;

  // Performance indicators
  salesPerHour: number;
  transactionsPerShift: number;
  conversionRate: number;     // If applicable

  // Comparison
  rank: number;
  percentOfTopPerformer: number;
  vsTeamAverage: number;      // Percentage above/below team average

  // Time-based
  totalHoursWorked: number;
  averageTransactionTime: number; // In minutes
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

  // Current stock
  currentStock: number;
  reservedStock: number;
  availableStock: number;

  // Sales velocity
  avgDailySales: number;
  avgWeeklySales: number;
  salesVelocity: InventoryTrend;

  // Predictions
  daysUntilStockout: number | null;  // null if no sales history
  estimatedStockoutDate: string | null;

  // Reorder recommendations
  reorderPoint: number;
  suggestedReorderQty: number;
  needsReorder: boolean;

  // Financial
  stockValue: number;
  potentialRevenue: number;    // If all stock sold at current price

  // Analysis
  turnoverRate: number;        // Annual turnover
  daysOfInventory: number;     // Days of stock on hand
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
  dayOfWeek: number;          // 0-6 (Sunday-Saturday)
  dayName: string;
  avgRevenue: number;
  avgOrders: number;
  percentage: number;         // Of total weekly revenue
}

export interface RevenueTrendsSummary {
  period: DateRange;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;

  // Trends
  dailyTrend: RevenueTrendData[];
  weekdayAnalysis: WeekdayAnalysis[];

  // Growth metrics
  revenueGrowth: number;      // vs previous period
  orderGrowth: number;
  aovGrowth: number;

  // Projections
  projectedMonthEndRevenue: number;
  projectedMonthEndOrders: number;
}

// ============ CUSTOMER COHORT ANALYSIS ============

export interface CohortData {
  cohortMonth: string;        // e.g., "2024-01"
  totalCustomers: number;
  retentionByMonth: number[]; // Percentage retained each subsequent month
}

export interface CohortAnalysisSummary {
  cohorts: CohortData[];
  overallRetentionRate: number;
  averageLifetimeValue: number;
  averagePurchaseFrequency: number;
  churnRate: number;
}

// ============ ENHANCED DASHBOARD ============

export interface EnhancedDashboardSummary {
  // Real-time metrics
  realTimeMetrics: {
    todaySales: number;
    todayOrders: number;
    todayCustomers: number;
    currentHourSales: number;
    lastOrderTime: Date | null;
  };

  // Comparisons
  comparisons: {
    vsYesterday: {
      revenue: number;
      orders: number;
      percentChange: number;
    };
    vsLastWeek: {
      revenue: number;
      orders: number;
      percentChange: number;
    };
    vsLastMonth: {
      revenue: number;
      orders: number;
      percentChange: number;
    };
  };

  // Top performers (today)
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;

  // Quick insights
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    metric?: string;
  }>;

  // Hourly breakdown (today)
  hourlyBreakdown: HourlyMetrics[];

  // Payment method distribution
  paymentMethods: Array<{
    method: PaymentMethod;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

// ============ CACHE KEYS ============

export const ANALYTICS_CACHE_KEYS = {
  DASHBOARD: (businessId: string, period: string) =>
    `analytics:dashboard:${businessId}:${period}`,
  ABC_CLASSIFICATION: (businessId: string) =>
    `analytics:abc:${businessId}`,
  RFM_SEGMENTATION: (businessId: string) =>
    `analytics:rfm:${businessId}`,
  FORECAST: (businessId: string, days: number) =>
    `analytics:forecast:${businessId}:${days}`,
  PEAK_HOURS: (businessId: string) =>
    `analytics:peak:${businessId}`,
  INVENTORY_INTELLIGENCE: (businessId: string) =>
    `analytics:inventory:${businessId}`,
  STAFF_PERFORMANCE: (businessId: string, period: string) =>
    `analytics:staff:${businessId}:${period}`,
  REVENUE_TRENDS: (businessId: string, period: string) =>
    `analytics:revenue:${businessId}:${period}`,
  CUSTOMER_COHORTS: (businessId: string) =>
    `analytics:cohorts:${businessId}`,
} as const;

// ============ CACHE TTLs (in seconds) ============

export const ANALYTICS_CACHE_TTL = {
  DASHBOARD_TODAY: 60,           // 1 minute for real-time feel
  DASHBOARD_HISTORICAL: 3600,    // 1 hour for historical data
  ABC_CLASSIFICATION: 86400,     // 24 hours
  RFM_SEGMENTATION: 86400,       // 24 hours
  FORECAST: 3600,                // 1 hour
  PEAK_HOURS: 86400,             // 24 hours
  INVENTORY_INTELLIGENCE: 1800,  // 30 minutes
  STAFF_PERFORMANCE: 300,        // 5 minutes
  REVENUE_TRENDS: 3600,          // 1 hour
  CUSTOMER_COHORTS: 86400,       // 24 hours
} as const;

// ============ RFM SEGMENTATION RULES ============

export const RFM_SEGMENT_RULES: Record<string, RFMSegment> = {
  // Champions - Best customers
  '555': 'Champions', '554': 'Champions', '545': 'Champions', '544': 'Champions',
  '455': 'Champions', '454': 'Champions', '445': 'Champions',

  // Loyal Customers
  '543': 'Loyal Customers', '444': 'Loyal Customers', '435': 'Loyal Customers',
  '355': 'Loyal Customers', '354': 'Loyal Customers', '345': 'Loyal Customers',
  '344': 'Loyal Customers', '335': 'Loyal Customers',

  // Potential Loyalists
  '553': 'Potential Loyalists', '552': 'Potential Loyalists', '541': 'Potential Loyalists',
  '542': 'Potential Loyalists', '533': 'Potential Loyalists', '532': 'Potential Loyalists',
  '531': 'Potential Loyalists', '452': 'Potential Loyalists', '451': 'Potential Loyalists',
  '442': 'Potential Loyalists', '441': 'Potential Loyalists', '431': 'Potential Loyalists',
  '453': 'Potential Loyalists', '433': 'Potential Loyalists', '432': 'Potential Loyalists',
  '443': 'Potential Loyalists', '434': 'Potential Loyalists',

  // New Customers
  '512': 'New Customers', '511': 'New Customers', '422': 'New Customers',
  '421': 'New Customers', '412': 'New Customers', '411': 'New Customers',
  '311': 'New Customers',

  // Promising
  '525': 'Promising', '524': 'Promising', '523': 'Promising', '522': 'Promising',
  '521': 'Promising', '515': 'Promising', '514': 'Promising', '513': 'Promising',
  '425': 'Promising', '424': 'Promising', '423': 'Promising',
  '414': 'Promising', '413': 'Promising', '415': 'Promising',

  // Need Attention
  '535': 'Need Attention', '534': 'Need Attention', '443': 'Need Attention',
  '434': 'Need Attention', '343': 'Need Attention', '334': 'Need Attention',
  '325': 'Need Attention', '324': 'Need Attention',

  // About to Sleep
  '331': 'About to Sleep', '321': 'About to Sleep', '312': 'About to Sleep',
  '221': 'About to Sleep', '213': 'About to Sleep', '231': 'About to Sleep',

  // At Risk
  '255': 'At Risk', '254': 'At Risk', '245': 'At Risk', '244': 'At Risk',
  '253': 'At Risk', '252': 'At Risk', '243': 'At Risk', '242': 'At Risk',
  '235': 'At Risk', '234': 'At Risk', '225': 'At Risk', '224': 'At Risk',
  '153': 'At Risk', '152': 'At Risk', '145': 'At Risk', '144': 'At Risk',
  '143': 'At Risk', '142': 'At Risk', '135': 'At Risk', '134': 'At Risk',

  // Cannot Lose
  '155': 'Cannot Lose', '154': 'Cannot Lose', '125': 'Cannot Lose',
  '124': 'Cannot Lose', '115': 'Cannot Lose', '114': 'Cannot Lose',

  // Hibernating
  '332': 'Hibernating', '322': 'Hibernating', '233': 'Hibernating',
  '232': 'Hibernating', '223': 'Hibernating', '222': 'Hibernating',
  '132': 'Hibernating', '123': 'Hibernating', '122': 'Hibernating',
  '212': 'Hibernating', '211': 'Hibernating',

  // Lost
  '111': 'Lost', '112': 'Lost', '113': 'Lost', '121': 'Lost',
  '131': 'Lost', '141': 'Lost', '151': 'Lost',
};

// Default segment for unmapped combinations
export const DEFAULT_RFM_SEGMENT: RFMSegment = 'Need Attention';
