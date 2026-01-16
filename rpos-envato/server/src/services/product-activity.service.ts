import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { AppDataSource } from '../config/database';
import { ProductActivity, ProductActivityType } from '../entities/ProductActivity.entity';

/**
 * ProductActivityService
 *
 * Handles all product activity tracking operations:
 * - Recording changes to products (audit trail)
 * - Querying activity history
 * - Generating activity reports
 */

export interface CreateActivityDTO {
  businessId: string;
  productId: string;
  type: ProductActivityType;
  action: string;
  description?: string;
  changes?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  userId?: string;
}

export interface ActivityQuery {
  businessId: string;
  productId?: string;
  type?: ProductActivityType | ProductActivityType[];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityResponse {
  activities: ProductActivity[];
  total: number;
}

class ProductActivityService {
  private activityRepository: Repository<ProductActivity>;

  constructor() {
    this.activityRepository = AppDataSource.getRepository(ProductActivity);
  }

  /**
   * Record a new product activity
   */
  async recordActivity(data: CreateActivityDTO): Promise<ProductActivity> {
    const activity = this.activityRepository.create({
      businessId: data.businessId,
      productId: data.productId,
      type: data.type,
      action: data.action,
      description: data.description || null,
      changes: data.changes || null,
      metadata: data.metadata || null,
      userId: data.userId || null,
    });

    return this.activityRepository.save(activity);
  }

  /**
   * Get activity history with filters
   */
  async getActivities(query: ActivityQuery): Promise<ActivityResponse> {
    const where: any = { businessId: query.businessId };

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.type) {
      where.type = Array.isArray(query.type) ? query.type : query.type;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(query.startDate, query.endDate);
    } else if (query.startDate) {
      where.createdAt = MoreThanOrEqual(query.startDate);
    } else if (query.endDate) {
      where.createdAt = LessThanOrEqual(query.endDate);
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    const [activities, total] = await this.activityRepository.findAndCount({
      where,
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    return { activities, total };
  }

  /**
   * Get recent activity for a product
   */
  async getProductActivity(
    businessId: string,
    productId: string,
    limit: number = 10
  ): Promise<ProductActivity[]> {
    return this.activityRepository.find({
      where: { businessId, productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Record product creation
   */
  async recordProductCreated(
    businessId: string,
    productId: string,
    productName: string,
    userId?: string
  ): Promise<ProductActivity> {
    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.CREATED,
      action: 'Product created',
      description: `Product "${productName}" was created`,
      userId,
    });
  }

  /**
   * Record product update
   */
  async recordProductUpdated(
    businessId: string,
    productId: string,
    changes: Record<string, { old: any; new: any }>,
    userId?: string
  ): Promise<ProductActivity> {
    const changedFields = Object.keys(changes);
    const description = changedFields.length > 0
      ? `Updated: ${changedFields.join(', ')}`
      : 'Product updated';

    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.UPDATED,
      action: 'Product updated',
      description,
      changes: {
        fields: changedFields,
        ...changes,
      },
      userId,
    });
  }

  /**
   * Record price change specifically
   */
  async recordPriceChange(
    businessId: string,
    productId: string,
    oldPrice: number,
    newPrice: number,
    priceType: 'selling' | 'purchase',
    userId?: string
  ): Promise<ProductActivity> {
    const description = priceType === 'selling'
      ? `Selling price changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`
      : `Purchase price changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`;

    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.PRICE_CHANGED,
      action: 'Price changed',
      description,
      changes: {
        field: priceType === 'selling' ? 'sellingPrice' : 'purchasePrice',
        oldValue: oldPrice,
        newValue: newPrice,
      },
      userId,
    });
  }

  /**
   * Record stock adjustment activity
   */
  async recordStockChange(
    businessId: string,
    productId: string,
    previousStock: number,
    newStock: number,
    adjustmentType: string,
    userId?: string
  ): Promise<ProductActivity> {
    const difference = newStock - previousStock;
    const action = difference > 0 ? `Stock adjusted (+${difference})` : `Stock adjusted (${difference})`;
    const description = `Stock changed from ${previousStock} to ${newStock} via ${adjustmentType}`;

    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.STOCK_ADJUSTED,
      action,
      description,
      changes: {
        field: 'quantity',
        oldValue: previousStock,
        newValue: newStock,
        difference,
        adjustmentType,
      },
      userId,
    });
  }

  /**
   * Record category change
   */
  async recordCategoryChange(
    businessId: string,
    productId: string,
    oldCategory: string | null,
    newCategory: string | null,
    userId?: string
  ): Promise<ProductActivity> {
    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.CATEGORY_CHANGED,
      action: 'Category changed',
      description: `Category changed from "${oldCategory || 'None'}" to "${newCategory || 'None'}"`,
      changes: {
        field: 'category',
        oldValue: oldCategory,
        newValue: newCategory,
      },
      userId,
    });
  }

  /**
   * Record partner availability change
   */
  async recordPartnerChange(
    businessId: string,
    productId: string,
    partner: string,
    enabled: boolean,
    userId?: string
  ): Promise<ProductActivity> {
    const type = enabled ? ProductActivityType.PARTNER_ENABLED : ProductActivityType.PARTNER_DISABLED;
    const action = enabled ? `Enabled on ${partner}` : `Disabled on ${partner}`;

    return this.recordActivity({
      businessId,
      productId,
      type,
      action,
      description: `Product ${enabled ? 'enabled' : 'disabled'} on ${partner}`,
      metadata: { partner, enabled },
      userId,
    });
  }

  /**
   * Record supplier change
   */
  async recordSupplierChange(
    businessId: string,
    productId: string,
    oldSupplier: string | null,
    newSupplier: string | null,
    userId?: string
  ): Promise<ProductActivity> {
    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.SUPPLIER_CHANGED,
      action: 'Supplier changed',
      description: `Default supplier changed from "${oldSupplier || 'None'}" to "${newSupplier || 'None'}"`,
      changes: {
        field: 'defaultSupplierId',
        oldValue: oldSupplier,
        newValue: newSupplier,
      },
      userId,
    });
  }

  /**
   * Record product deletion
   */
  async recordProductDeleted(
    businessId: string,
    productId: string,
    productName: string,
    userId?: string
  ): Promise<ProductActivity> {
    return this.recordActivity({
      businessId,
      productId,
      type: ProductActivityType.DELETED,
      action: 'Product deleted',
      description: `Product "${productName}" was deleted`,
      userId,
    });
  }
}

export const productActivityService = new ProductActivityService();
