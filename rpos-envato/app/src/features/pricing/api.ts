import { apiClient } from '@/services/api/client';

// Types
export type PriceChangeType =
  | 'selling_price'
  | 'purchase_price'
  | 'case_selling_price'
  | 'case_purchase_price'
  | 'pack_selling_price'
  | 'pack_purchase_price';

export type PriceChangeReason =
  | 'manual'
  | 'supplier_update'
  | 'promotion'
  | 'cost_increase'
  | 'cost_decrease'
  | 'margin_adjustment'
  | 'market_rate'
  | 'bulk_update'
  | 'import'
  | 'initial';

export interface PriceHistory {
  id: string;
  productId: string;
  priceType: PriceChangeType;
  oldPrice: number | null;
  newPrice: number;
  priceChange: number;
  percentChange: number | null;
  oldMargin: number | null;
  newMargin: number | null;
  marginChange: number | null;
  costAtChange: number | null;
  reason: PriceChangeReason;
  notes: string | null;
  supplierId: string | null;
  purchaseOrderId: string | null;
  changedById: string | null;
  createdAt: string;
  effectiveDate: string | null;
  changedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  supplier?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface MarginTrend {
  currentMargin: number;
  avgMargin: number;
  minMargin: number;
  maxMargin: number;
  trend: 'up' | 'down' | 'stable';
  marginChange: number;
  history: Array<{ date: string; margin: number }>;
}

export interface CostTrend {
  currentCost: number;
  avgCost: number;
  minCost: number;
  maxCost: number;
  trend: 'up' | 'down' | 'stable';
  totalIncrease: number;
  totalDecrease: number;
  history: Array<{ date: string; cost: number }>;
}

export interface MarginAlert {
  productId: string;
  productName: string;
  sku: string;
  originalMargin: number;
  currentMargin: number;
  marginLoss: number;
  daysSinceChange: number;
}

export interface PriceVolatilityReport {
  totalPriceChanges: number;
  productsWithPriceChanges: number;
  avgPriceChange: number;
  topIncreases: Array<{
    product: { id: string; name: string; sku: string };
    change: number;
    percent: number;
  }>;
  topDecreases: Array<{
    product: { id: string; name: string; sku: string };
    change: number;
    percent: number;
  }>;
}

// API Functions

/**
 * Get price history for a product
 */
export const getProductPriceHistory = async (
  productId: string,
  options?: {
    priceType?: PriceChangeType;
    limit?: number;
  }
): Promise<{ history: PriceHistory[] }> => {
  const params = new URLSearchParams();
  if (options?.priceType) params.append('priceType', options.priceType);
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await apiClient.get<{ history: PriceHistory[] }>(
    `/api/price-history/product/${productId}?${params}`
  );
  return response.data;
};

/**
 * Get margin trend for a product
 */
export const getProductMarginTrend = async (
  productId: string,
  days: number = 90
): Promise<MarginTrend> => {
  const response = await apiClient.get<MarginTrend>(
    `/api/price-history/product/${productId}/margin-trend?days=${days}`
  );
  return response.data;
};

/**
 * Get cost trend for a product
 */
export const getProductCostTrend = async (
  productId: string,
  days: number = 90
): Promise<CostTrend> => {
  const response = await apiClient.get<CostTrend>(
    `/api/price-history/product/${productId}/cost-trend?days=${days}`
  );
  return response.data;
};

/**
 * Get recent price changes for a product
 */
export const getRecentPriceChanges = async (
  productId: string,
  limit: number = 10
): Promise<{ changes: PriceHistory[] }> => {
  const response = await apiClient.get<{ changes: PriceHistory[] }>(
    `/api/price-history/product/${productId}/recent?limit=${limit}`
  );
  return response.data;
};

/**
 * Get price volatility report
 */
export const getPriceVolatilityReport = async (
  days: number = 30
): Promise<PriceVolatilityReport> => {
  const response = await apiClient.get<PriceVolatilityReport>(
    `/api/price-history/volatility-report?days=${days}`
  );
  return response.data;
};

/**
 * Get margin erosion alerts
 */
export const getMarginAlerts = async (
  threshold: number = 5
): Promise<{ alerts: MarginAlert[] }> => {
  const response = await apiClient.get<{ alerts: MarginAlert[] }>(
    `/api/price-history/margin-alerts?threshold=${threshold}`
  );
  return response.data;
};

/**
 * Get cost changes report
 */
export const getCostChanges = async (days: number = 30) => {
  const response = await apiClient.get(
    `/api/price-history/cost-changes?days=${days}`
  );
  return response.data;
};
