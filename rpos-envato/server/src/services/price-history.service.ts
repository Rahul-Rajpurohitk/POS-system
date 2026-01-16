import { Repository, MoreThanOrEqual, Between, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  PriceHistory,
  PriceChangeType,
  PriceChangeReason,
} from '../entities/PriceHistory.entity';
import { Product } from '../entities/Product.entity';

/**
 * PriceHistoryService
 *
 * Handles price tracking and analysis:
 * - Recording price changes
 * - Margin trend analysis
 * - Cost trend analysis
 * - Price volatility reports
 * - Margin erosion alerts
 */

// DTOs
export interface RecordPriceChangeDTO {
  businessId: string;
  productId: string;
  priceType: PriceChangeType;
  oldPrice: number | null;
  newPrice: number;
  reason?: PriceChangeReason;
  notes?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  changedById?: string;
  effectiveDate?: Date;
  costAtChange?: number; // For calculating margin on selling price changes
}

export interface PriceHistoryQuery {
  businessId: string;
  productId?: string;
  priceType?: PriceChangeType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface MarginTrend {
  currentMargin: number;
  avgMargin: number;
  minMargin: number;
  maxMargin: number;
  trend: 'up' | 'down' | 'stable';
  marginChange: number;
  history: Array<{ date: Date; margin: number }>;
}

export interface CostTrend {
  currentCost: number;
  avgCost: number;
  minCost: number;
  maxCost: number;
  trend: 'up' | 'down' | 'stable';
  totalIncrease: number;
  totalDecrease: number;
  history: Array<{ date: Date; cost: number }>;
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

class PriceHistoryService {
  private priceHistoryRepository: Repository<PriceHistory>;
  private productRepository: Repository<Product>;

  constructor() {
    this.priceHistoryRepository = AppDataSource.getRepository(PriceHistory);
    this.productRepository = AppDataSource.getRepository(Product);
  }

  /**
   * Record a price change
   */
  async recordPriceChange(data: RecordPriceChangeDTO): Promise<PriceHistory> {
    // Calculate price change
    const priceChange = data.oldPrice !== null
      ? data.newPrice - data.oldPrice
      : 0;

    // Calculate percent change
    const percentChange = data.oldPrice && data.oldPrice !== 0
      ? ((priceChange / data.oldPrice) * 100)
      : null;

    // Calculate margins for selling price changes
    let oldMargin: number | null = null;
    let newMargin: number | null = null;
    let marginChange: number | null = null;
    let costAtChange = data.costAtChange;

    if (data.priceType === PriceChangeType.SELLING_PRICE && costAtChange) {
      // Margin = ((price - cost) / price) * 100
      if (data.oldPrice && data.oldPrice > 0) {
        oldMargin = ((data.oldPrice - costAtChange) / data.oldPrice) * 100;
      }
      if (data.newPrice > 0) {
        newMargin = ((data.newPrice - costAtChange) / data.newPrice) * 100;
      }
      if (oldMargin !== null && newMargin !== null) {
        marginChange = newMargin - oldMargin;
      }
    }

    // If costAtChange not provided, try to get from product
    if (!costAtChange && (
      data.priceType === PriceChangeType.SELLING_PRICE ||
      data.priceType === PriceChangeType.CASE_SELLING_PRICE
    )) {
      const product = await this.productRepository.findOne({
        where: { id: data.productId, businessId: data.businessId },
      });
      if (product) {
        costAtChange = Number(product.purchasePrice);
        // Recalculate margins
        if (data.oldPrice && data.oldPrice > 0) {
          oldMargin = ((data.oldPrice - costAtChange) / data.oldPrice) * 100;
        }
        if (data.newPrice > 0) {
          newMargin = ((data.newPrice - costAtChange) / data.newPrice) * 100;
        }
        if (oldMargin !== null && newMargin !== null) {
          marginChange = newMargin - oldMargin;
        }
      }
    }

    const priceHistory = this.priceHistoryRepository.create({
      businessId: data.businessId,
      productId: data.productId,
      priceType: data.priceType,
      oldPrice: data.oldPrice,
      newPrice: data.newPrice,
      priceChange,
      percentChange,
      oldMargin,
      newMargin,
      marginChange,
      costAtChange,
      reason: data.reason || PriceChangeReason.MANUAL,
      notes: data.notes,
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
      changedById: data.changedById,
      effectiveDate: data.effectiveDate || new Date(),
    });

    return this.priceHistoryRepository.save(priceHistory);
  }

  /**
   * Get price history for a product
   */
  async getProductPriceHistory(query: PriceHistoryQuery): Promise<PriceHistory[]> {
    const where: any = { businessId: query.businessId };

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.priceType) {
      where.priceType = query.priceType;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(query.startDate, query.endDate);
    } else if (query.startDate) {
      where.createdAt = MoreThanOrEqual(query.startDate);
    } else if (query.endDate) {
      where.createdAt = LessThanOrEqual(query.endDate);
    }

    return this.priceHistoryRepository.find({
      where,
      relations: ['product', 'supplier', 'changedBy'],
      order: { createdAt: 'DESC' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });
  }

  /**
   * Get margin trend for a product
   */
  async getMarginTrend(
    businessId: string,
    productId: string,
    days: number = 90
  ): Promise<MarginTrend> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get product for current data
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate current margin
    const purchasePrice = Number(product.purchasePrice);
    const sellingPrice = Number(product.sellingPrice);
    const currentMargin = sellingPrice > 0
      ? ((sellingPrice - purchasePrice) / sellingPrice) * 100
      : 0;

    // Get selling price history
    const history = await this.priceHistoryRepository.find({
      where: {
        businessId,
        productId,
        priceType: PriceChangeType.SELLING_PRICE,
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Extract margins from history
    const margins: number[] = [];
    const marginHistory: Array<{ date: Date; margin: number }> = [];

    history.forEach((h) => {
      if (h.newMargin !== null) {
        margins.push(h.newMargin);
        marginHistory.push({
          date: h.createdAt,
          margin: h.newMargin,
        });
      }
    });

    // Add current margin to history if we have any history
    if (margins.length === 0) {
      margins.push(currentMargin);
    }
    marginHistory.push({
      date: new Date(),
      margin: currentMargin,
    });

    // Calculate statistics
    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    const minMargin = Math.min(...margins);
    const maxMargin = Math.max(...margins);

    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    const marginChange = margins.length > 1
      ? currentMargin - margins[0]
      : 0;

    if (marginChange > 2) {
      trend = 'up';
    } else if (marginChange < -2) {
      trend = 'down';
    }

    return {
      currentMargin,
      avgMargin,
      minMargin,
      maxMargin,
      trend,
      marginChange,
      history: marginHistory,
    };
  }

  /**
   * Get cost trend for a product
   */
  async getCostTrend(
    businessId: string,
    productId: string,
    days: number = 90
  ): Promise<CostTrend> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get product for current data
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const currentCost = Number(product.purchasePrice);

    // Get purchase price history
    const history = await this.priceHistoryRepository.find({
      where: {
        businessId,
        productId,
        priceType: PriceChangeType.PURCHASE_PRICE,
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Extract costs from history
    const costs: number[] = [];
    const costHistory: Array<{ date: Date; cost: number }> = [];
    let totalIncrease = 0;
    let totalDecrease = 0;

    history.forEach((h) => {
      costs.push(Number(h.newPrice));
      costHistory.push({
        date: h.createdAt,
        cost: Number(h.newPrice),
      });

      if (h.priceChange > 0) {
        totalIncrease += h.priceChange;
      } else {
        totalDecrease += Math.abs(h.priceChange);
      }
    });

    // Add current cost
    if (costs.length === 0) {
      costs.push(currentCost);
    }
    costHistory.push({
      date: new Date(),
      cost: currentCost,
    });

    // Calculate statistics
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    const costChange = costs.length > 1
      ? currentCost - costs[0]
      : 0;
    const percentChange = costs[0] > 0
      ? (costChange / costs[0]) * 100
      : 0;

    if (percentChange > 5) {
      trend = 'up';
    } else if (percentChange < -5) {
      trend = 'down';
    }

    return {
      currentCost,
      avgCost,
      minCost,
      maxCost,
      trend,
      totalIncrease,
      totalDecrease,
      history: costHistory,
    };
  }

  /**
   * Get margin erosion alerts
   * Products where margin has decreased by more than threshold
   */
  async getMarginErosionAlerts(
    businessId: string,
    thresholdPercent: number = 5
  ): Promise<MarginAlert[]> {
    const days90Ago = new Date();
    days90Ago.setDate(days90Ago.getDate() - 90);

    // Get all products
    const products = await this.productRepository.find({
      where: { businessId, enabled: true },
    });

    const alerts: MarginAlert[] = [];

    for (const product of products) {
      // Get oldest price history entry in last 90 days
      const oldestHistory = await this.priceHistoryRepository.findOne({
        where: {
          businessId,
          productId: product.id,
          priceType: PriceChangeType.SELLING_PRICE,
          createdAt: MoreThanOrEqual(days90Ago),
        },
        order: { createdAt: 'ASC' },
      });

      if (!oldestHistory || oldestHistory.oldMargin === null) {
        continue;
      }

      // Calculate current margin
      const purchasePrice = Number(product.purchasePrice);
      const sellingPrice = Number(product.sellingPrice);
      const currentMargin = sellingPrice > 0
        ? ((sellingPrice - purchasePrice) / sellingPrice) * 100
        : 0;

      const originalMargin = oldestHistory.oldMargin;
      const marginLoss = originalMargin - currentMargin;

      if (marginLoss >= thresholdPercent) {
        const daysSinceChange = Math.floor(
          (new Date().getTime() - oldestHistory.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        alerts.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          originalMargin,
          currentMargin,
          marginLoss,
          daysSinceChange,
        });
      }
    }

    // Sort by margin loss (highest first)
    return alerts.sort((a, b) => b.marginLoss - a.marginLoss);
  }

  /**
   * Get price volatility report for business
   */
  async getPriceVolatilityReport(businessId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all price changes in period
    const changes = await this.priceHistoryRepository.find({
      where: {
        businessId,
        createdAt: MoreThanOrEqual(startDate),
      },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });

    // Calculate statistics
    const productIds = new Set(changes.map((c) => c.productId));
    const totalPriceChanges = changes.length;
    const productsWithPriceChanges = productIds.size;

    // Calculate average price change
    const priceChanges = changes.map((c) => Math.abs(c.priceChange));
    const avgPriceChange = priceChanges.length > 0
      ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
      : 0;

    // Get top increases and decreases
    const increases = changes
      .filter((c) => c.priceChange > 0)
      .sort((a, b) => b.priceChange - a.priceChange)
      .slice(0, 10)
      .map((c) => ({
        product: c.product,
        change: c.priceChange,
        percent: c.percentChange || 0,
      }));

    const decreases = changes
      .filter((c) => c.priceChange < 0)
      .sort((a, b) => a.priceChange - b.priceChange)
      .slice(0, 10)
      .map((c) => ({
        product: c.product,
        change: c.priceChange,
        percent: c.percentChange || 0,
      }));

    return {
      totalPriceChanges,
      productsWithPriceChanges,
      avgPriceChange,
      topIncreases: increases,
      topDecreases: decreases,
    };
  }

  /**
   * Get recent price changes for a product
   */
  async getRecentPriceChanges(
    businessId: string,
    productId: string,
    limit: number = 10
  ): Promise<PriceHistory[]> {
    return this.priceHistoryRepository.find({
      where: { businessId, productId },
      relations: ['changedBy', 'supplier'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get business-wide cost changes
   */
  async getCostChanges(businessId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const changes = await this.priceHistoryRepository.find({
      where: {
        businessId,
        priceType: PriceChangeType.PURCHASE_PRICE,
        createdAt: MoreThanOrEqual(startDate),
      },
      relations: ['product', 'supplier'],
      order: { createdAt: 'DESC' },
    });

    // Calculate totals
    let totalIncreased = 0;
    let totalDecreased = 0;
    let countIncreased = 0;
    let countDecreased = 0;

    changes.forEach((c) => {
      if (c.priceChange > 0) {
        totalIncreased += c.priceChange;
        countIncreased++;
      } else {
        totalDecreased += Math.abs(c.priceChange);
        countDecreased++;
      }
    });

    return {
      changes,
      totalIncreased,
      totalDecreased,
      countIncreased,
      countDecreased,
      netChange: totalIncreased - totalDecreased,
    };
  }
}

export const priceHistoryService = new PriceHistoryService();
