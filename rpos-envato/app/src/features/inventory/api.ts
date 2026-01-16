import { apiClient } from '@/services/api/client';

// Types
export type StockAdjustmentType =
  | 'purchase_order'
  | 'sale'
  | 'return'
  | 'damage'
  | 'loss'
  | 'count'
  | 'transfer_in'
  | 'transfer_out'
  | 'write_off'
  | 'initial'
  | 'correction';

export interface StockAdjustment {
  id: string;
  referenceNumber: string | null;
  type: StockAdjustmentType;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number | null;
  totalCost: number | null;
  reason: string | null;
  notes: string | null;
  batchNumber: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  createdAt: string;
  adjustmentDate: string;
  productId: string;
  supplierId: string | null;
  purchaseOrderId: string | null;
  orderId: string | null;
  supplier?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
}

export interface BatchOrder {
  id: string;
  orderNumber: string;
  status: string;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  total: number;
  orderDate: string;
  receivedAt: string | null;
  items?: Array<{
    productId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }>;
}

export interface StockHistoryResponse {
  adjustments: StockAdjustment[];
  total: number;
  summary: {
    totalAdded: number;
    totalRemoved: number;
    netChange: number;
  };
}

export interface LastBatchOrderResponse {
  purchaseOrder: BatchOrder | null;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
}

export interface StockStats {
  avgDailySales: number;
  totalSold: number;
  totalReceived: number;
  adjustmentCount: number;
  salesCount: number;
  receivingCount: number;
}

export interface CreateStockAdjustmentRequest {
  productId: string;
  type: StockAdjustmentType;
  quantity: number;
  reason?: string;
  notes?: string;
  unitCost?: number;
  supplierId?: string;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
}

// API Functions

/**
 * Get stock history for a product
 */
export const getProductStockHistory = async (
  productId: string,
  limit?: number
): Promise<StockHistoryResponse> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());

  const response = await apiClient.get<StockHistoryResponse>(
    `/api/stock-adjustments/product/${productId}?${params}`
  );
  return response.data;
};

/**
 * Get recent activity for a product
 */
export const getProductRecentActivity = async (
  productId: string,
  limit: number = 10
): Promise<{ adjustments: StockAdjustment[] }> => {
  const response = await apiClient.get<{ adjustments: StockAdjustment[] }>(
    `/api/stock-adjustments/product/${productId}/recent?limit=${limit}`
  );
  return response.data;
};

/**
 * Get the last batch order for a product
 */
export const getProductLastBatchOrder = async (
  productId: string
): Promise<LastBatchOrderResponse> => {
  const response = await apiClient.get<LastBatchOrderResponse>(
    `/api/stock-adjustments/product/${productId}/last-batch-order`
  );
  return response.data;
};

/**
 * Get stock statistics for a product
 */
export const getProductStockStats = async (
  productId: string,
  days: number = 30
): Promise<StockStats> => {
  const response = await apiClient.get<StockStats>(
    `/api/stock-adjustments/product/${productId}/stats?days=${days}`
  );
  return response.data;
};

/**
 * Create a stock adjustment
 */
export const createStockAdjustment = async (
  data: CreateStockAdjustmentRequest
): Promise<StockAdjustment> => {
  const response = await apiClient.post<StockAdjustment>('/api/stock-adjustments', data);
  return response.data;
};

/**
 * Record damage/loss
 */
export const recordDamage = async (
  productId: string,
  quantity: number,
  reason?: string,
  notes?: string
): Promise<StockAdjustment> => {
  const response = await apiClient.post<StockAdjustment>('/api/stock-adjustments/damage', {
    productId,
    quantity,
    reason,
    notes,
  });
  return response.data;
};

/**
 * Record inventory count adjustment
 */
export const recordInventoryCount = async (
  productId: string,
  newQuantity: number,
  reason?: string,
  notes?: string
): Promise<StockAdjustment> => {
  const response = await apiClient.post<StockAdjustment>('/api/stock-adjustments/count', {
    productId,
    newQuantity,
    reason,
    notes,
  });
  return response.data;
};

// ============ Product Activity Types ============

export type ProductActivityType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'price_changed'
  | 'stock_adjusted'
  | 'category_changed'
  | 'partner_enabled'
  | 'partner_disabled'
  | 'barcode_scanned'
  | 'supplier_changed'
  | 'tag_added'
  | 'tag_removed'
  | 'image_added'
  | 'image_removed'
  | 'archived'
  | 'restored';

export interface ProductActivity {
  id: string;
  productId: string;
  type: ProductActivityType;
  action: string;
  description: string | null;
  changes: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
  } | null;
  metadata: Record<string, any> | null;
  userId: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ProductActivityResponse {
  activities: ProductActivity[];
  total?: number;
}

/**
 * Get activity history for a product
 */
export const getProductActivity = async (
  productId: string,
  limit: number = 20
): Promise<ProductActivityResponse> => {
  const response = await apiClient.get<ProductActivityResponse>(
    `/api/product-activities/product/${productId}?limit=${limit}`
  );
  return response.data;
};
