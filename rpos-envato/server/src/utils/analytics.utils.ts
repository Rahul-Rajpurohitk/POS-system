/**
 * Analytics Utility Functions
 * Statistical calculations for forecasting, trends, and analysis
 */

// ============ BASIC STATISTICS ============

/**
 * Calculate the mean (average) of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate the standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate variance
 */
export function variance(values: number[]): number {
  const stdDev = standardDeviation(values);
  return stdDev * stdDev;
}

/**
 * Calculate percentile value
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate quintile (1-5) for a value within a dataset
 */
export function calculateQuintile(value: number, values: number[], ascending = true): number {
  const sorted = [...values].sort((a, b) => ascending ? a - b : b - a);
  const position = sorted.indexOf(value);

  if (position === -1) {
    // Value not in array, find where it would be
    const insertPos = sorted.findIndex(v => (ascending ? v >= value : v <= value));
    const pos = insertPos === -1 ? sorted.length : insertPos;
    const quintile = Math.ceil(((pos + 1) / sorted.length) * 5);
    return Math.min(5, Math.max(1, quintile));
  }

  const quintile = Math.ceil(((position + 1) / sorted.length) * 5);
  return Math.min(5, Math.max(1, quintile));
}

/**
 * Calculate RFM quintile scores for a customer
 */
export function calculateRFMQuintiles(
  customerValue: { recency: number; frequency: number; monetary: number },
  allValues: { recencies: number[]; frequencies: number[]; monetaries: number[] }
): { recency: number; frequency: number; monetary: number } {
  // For recency, lower is better (more recent = higher score)
  const recencyScore = calculateQuintile(
    customerValue.recency,
    allValues.recencies,
    false // descending - lower recency = higher score
  );

  // For frequency and monetary, higher is better
  const frequencyScore = calculateQuintile(
    customerValue.frequency,
    allValues.frequencies,
    true
  );

  const monetaryScore = calculateQuintile(
    customerValue.monetary,
    allValues.monetaries,
    true
  );

  return {
    recency: recencyScore,
    frequency: frequencyScore,
    monetary: monetaryScore,
  };
}

// ============ MOVING AVERAGES ============

/**
 * Calculate Simple Moving Average (SMA)
 */
export function simpleMovingAverage(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function exponentialMovingAverage(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const multiplier = 2 / (period + 1);
  const result: number[] = [];

  // Start with SMA for first value
  const firstSMA = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(firstSMA);

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    const ema = (values[i] - result[result.length - 1]) * multiplier + result[result.length - 1];
    result.push(ema);
  }

  return result;
}

// ============ LINEAR REGRESSION ============

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
}

/**
 * Calculate linear regression (least squares method)
 */
export function linearRegression(xValues: number[], yValues: number[]): LinearRegressionResult {
  const n = xValues.length;

  if (n === 0 || n !== yValues.length) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      predict: () => 0,
    };
  }

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);

  const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

  return {
    slope: isNaN(slope) ? 0 : slope,
    intercept: isNaN(intercept) ? 0 : intercept,
    rSquared: isNaN(rSquared) ? 0 : Math.max(0, Math.min(1, rSquared)),
    predict: (x: number) => slope * x + intercept,
  };
}

// ============ FORECASTING ============

export interface ForecastPoint {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

/**
 * Generate sales forecast using moving average + trend
 */
export function generateForecast(
  historicalData: Array<{ date: string; value: number }>,
  daysAhead: number,
  confidenceLevel = 0.95
): ForecastPoint[] {
  if (historicalData.length < 7) {
    // Not enough data for reliable forecast
    return [];
  }

  const values = historicalData.map(d => d.value);

  // Calculate 7-day moving average
  const ma7 = simpleMovingAverage(values, 7);

  // Detect trend using linear regression on recent 30 days
  const recentDays = Math.min(30, values.length);
  const xValues = Array.from({ length: recentDays }, (_, i) => i);
  const yValues = values.slice(-recentDays);
  const regression = linearRegression(xValues, yValues);

  // Calculate standard deviation for confidence intervals
  const stdDev = standardDeviation(values);

  // Z-score for confidence level (95% = 1.96)
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;

  // Generate forecast
  const forecast: ForecastPoint[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const lastMA = ma7.length > 0 ? ma7[ma7.length - 1] : mean(values);

  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    // Predict using MA + trend
    const trendAdjustment = regression.slope * i;
    const predicted = Math.max(0, lastMA + trendAdjustment);

    // Wider confidence interval further into future
    const uncertaintyMultiplier = 1 + (i * 0.1); // 10% more uncertain per day
    const margin = zScore * stdDev * uncertaintyMultiplier;

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: round(predicted),
      lowerBound: round(Math.max(0, predicted - margin)),
      upperBound: round(predicted + margin),
      confidence: round(Math.max(0.5, 1 - (i * 0.02))), // Decreasing confidence
    });
  }

  return forecast;
}

/**
 * Detect trend direction from data
 */
export function detectTrend(
  values: number[]
): { direction: 'increasing' | 'stable' | 'decreasing'; percentage: number } {
  if (values.length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  const xValues = Array.from({ length: values.length }, (_, i) => i);
  const regression = linearRegression(xValues, values);

  const meanValue = mean(values);
  const percentageChange = meanValue !== 0
    ? (regression.slope / meanValue) * 100 * values.length
    : 0;

  if (percentageChange > 5) {
    return { direction: 'increasing', percentage: percentageChange };
  } else if (percentageChange < -5) {
    return { direction: 'decreasing', percentage: percentageChange };
  } else {
    return { direction: 'stable', percentage: percentageChange };
  }
}

// ============ ABC CLASSIFICATION ============

/**
 * Classify products using ABC/Pareto analysis
 * A: Top 80% of revenue (typically 20% of products)
 * B: Next 15% of revenue (typically 30% of products)
 * C: Remaining 5% of revenue (typically 50% of products)
 */
export function classifyABC(
  products: Array<{ id: string; revenue: number }>,
  thresholds = { A: 0.8, B: 0.95 }
): Map<string, 'A' | 'B' | 'C'> {
  const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);

  const classifications = new Map<string, 'A' | 'B' | 'C'>();
  let cumulativeRevenue = 0;

  for (const product of sorted) {
    cumulativeRevenue += product.revenue;
    const cumulativePercentage = totalRevenue > 0
      ? cumulativeRevenue / totalRevenue
      : 0;

    if (cumulativePercentage <= thresholds.A) {
      classifications.set(product.id, 'A');
    } else if (cumulativePercentage <= thresholds.B) {
      classifications.set(product.id, 'B');
    } else {
      classifications.set(product.id, 'C');
    }
  }

  return classifications;
}

// ============ INVENTORY CALCULATIONS ============

/**
 * Calculate reorder point based on lead time and safety stock
 */
export function calculateReorderPoint(
  avgDailySales: number,
  leadTimeDays: number,
  safetyStockDays = 7
): number {
  return Math.ceil(avgDailySales * (leadTimeDays + safetyStockDays));
}

/**
 * Calculate suggested reorder quantity (Economic Order Quantity simplified)
 */
export function calculateReorderQuantity(
  avgDailySales: number,
  targetStockDays = 30
): number {
  return Math.ceil(avgDailySales * targetStockDays);
}

/**
 * Calculate days until stockout
 */
export function calculateDaysUntilStockout(
  currentStock: number,
  avgDailySales: number
): number | null {
  if (avgDailySales <= 0) return null;
  return Math.floor(currentStock / avgDailySales);
}

/**
 * Calculate inventory turnover rate (annual)
 */
export function calculateTurnoverRate(
  costOfGoodsSold: number,
  averageInventoryValue: number
): number {
  if (averageInventoryValue <= 0) return 0;
  return costOfGoodsSold / averageInventoryValue;
}

// ============ DATE UTILITIES ============

/**
 * Get day name from day number (0 = Sunday)
 */
export function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

/**
 * Get short day name
 */
export function getShortDayName(dayNumber: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNumber] || '???';
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range for a period
 */
export function getDateRangeForPeriod(
  period: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: yesterday,
        endDate: new Date(today.getTime() - 1),
      };
    }

    case 'this_week': {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      return {
        startDate: startOfWeek,
        endDate: now,
      };
    }

    case 'last_week': {
      const dayOfWeek = now.getDay();
      const endOfLastWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000 - 1);
      const startOfLastWeek = new Date(endOfLastWeek.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      return {
        startDate: startOfLastWeek,
        endDate: endOfLastWeek,
      };
    }

    case 'this_month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };

    case 'last_month': {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return {
        startDate: firstOfLastMonth,
        endDate: lastOfLastMonth,
      };
    }

    default:
      return { startDate: today, endDate: now };
  }
}

// ============ ROUNDING & FORMATTING ============

/**
 * Round to 2 decimal places
 */
export function round(value: number, decimals = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Format number as currency
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${round(value, decimals)}%`;
}

/**
 * Calculate percentage change
 */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round(((current - previous) / previous) * 100);
}

// ============ GROWTH PROJECTIONS ============

/**
 * Project end-of-month revenue based on current trajectory
 */
export function projectMonthEndRevenue(
  currentRevenue: number,
  daysElapsed: number,
  totalDaysInMonth: number
): number {
  if (daysElapsed === 0) return 0;
  const dailyAverage = currentRevenue / daysElapsed;
  return round(dailyAverage * totalDaysInMonth);
}

/**
 * Get number of days in current month
 */
export function getDaysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * Get current day of month
 */
export function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}
