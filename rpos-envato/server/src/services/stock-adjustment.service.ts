import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  StockAdjustment,
  StockAdjustmentType,
  StockAdjustmentStatus,
} from '../entities/StockAdjustment.entity';
import { Product } from '../entities/Product.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/Supplier.entity';

/**
 * StockAdjustmentService
 *
 * Handles all inventory tracking operations:
 * - Creating stock adjustments (manual, from PO receiving, from sales)
 * - Querying stock history for a product
 * - Generating adjustment reports
 */

// DTOs
export interface CreateStockAdjustmentDTO {
  businessId: string;
  productId: string;
  type: StockAdjustmentType;
  quantity: number; // Positive = add, Negative = remove
  reason?: string;
  notes?: string;
  unitCost?: number;
  supplierId?: string;
  purchaseOrderId?: string;
  orderId?: string;
  locationId?: string;
  createdById?: string;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: Date;
}

export interface StockAdjustmentQuery {
  businessId: string;
  productId?: string;
  type?: StockAdjustmentType | StockAdjustmentType[];
  startDate?: Date;
  endDate?: Date;
  supplierId?: string;
  locationId?: string;
  limit?: number;
  offset?: number;
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
  purchaseOrder: PurchaseOrder | null;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
}

class StockAdjustmentService {
  private adjustmentRepository: Repository<StockAdjustment>;
  private productRepository: Repository<Product>;
  private purchaseOrderRepository: Repository<PurchaseOrder>;

  constructor() {
    this.adjustmentRepository = AppDataSource.getRepository(StockAdjustment);
    this.productRepository = AppDataSource.getRepository(Product);
    this.purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
  }

  /**
   * Create a stock adjustment and update product quantity
   */
  async createAdjustment(data: CreateStockAdjustmentDTO): Promise<StockAdjustment> {
    const product = await this.productRepository.findOne({
      where: { id: data.productId, businessId: data.businessId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const previousStock = product.quantity;
    const newStock = previousStock + data.quantity;

    if (newStock < 0) {
      throw new Error('Cannot reduce stock below zero');
    }

    // Generate reference number
    const count = await this.adjustmentRepository.count({
      where: { businessId: data.businessId },
    });
    const referenceNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Create adjustment record
    const adjustment = this.adjustmentRepository.create({
      ...data,
      referenceNumber,
      previousStock,
      newStock,
      totalCost: data.unitCost ? data.unitCost * Math.abs(data.quantity) : null,
      status: StockAdjustmentStatus.COMPLETED,
    });

    // Update product quantity
    product.quantity = newStock;

    // Save both
    await this.productRepository.save(product);
    const savedAdjustment = await this.adjustmentRepository.save(adjustment);

    return this.adjustmentRepository.findOne({
      where: { id: savedAdjustment.id },
      relations: ['product', 'supplier', 'createdBy', 'purchaseOrder'],
    }) as Promise<StockAdjustment>;
  }

  /**
   * Get stock adjustments for a product
   */
  async getStockHistory(query: StockAdjustmentQuery): Promise<StockHistoryResponse> {
    const where: any = { businessId: query.businessId };

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.type) {
      where.type = Array.isArray(query.type) ? In(query.type) : query.type;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(query.startDate, query.endDate);
    } else if (query.startDate) {
      where.createdAt = MoreThanOrEqual(query.startDate);
    } else if (query.endDate) {
      where.createdAt = LessThanOrEqual(query.endDate);
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    const [adjustments, total] = await this.adjustmentRepository.findAndCount({
      where,
      relations: ['supplier', 'createdBy', 'purchaseOrder'],
      order: { createdAt: 'DESC' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    // Calculate summary
    let totalAdded = 0;
    let totalRemoved = 0;

    adjustments.forEach((adj) => {
      if (adj.quantity > 0) {
        totalAdded += adj.quantity;
      } else {
        totalRemoved += Math.abs(adj.quantity);
      }
    });

    return {
      adjustments,
      total,
      summary: {
        totalAdded,
        totalRemoved,
        netChange: totalAdded - totalRemoved,
      },
    };
  }

  /**
   * Get the last batch order (purchase order) for a product
   */
  async getLastBatchOrder(businessId: string, productId: string): Promise<LastBatchOrderResponse | null> {
    // Find the most recent completed purchase order containing this product
    const lastPO = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .innerJoin('po.items', 'item')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .where('po.businessId = :businessId', { businessId })
      .andWhere('item.productId = :productId', { productId })
      .andWhere('po.status IN (:...statuses)', {
        statuses: [
          PurchaseOrderStatus.RECEIVED,
          PurchaseOrderStatus.COMPLETED,
          PurchaseOrderStatus.PARTIAL_RECEIVED,
        ],
      })
      .orderBy('po.receivedAt', 'DESC')
      .getOne();

    if (!lastPO) {
      return null;
    }

    // Get the item details
    const item = lastPO.items?.find((i) => i.productId === productId);

    return {
      purchaseOrder: lastPO,
      receivedQuantity: item?.quantityReceived || 0,
      unitCost: item ? Number(item.unitCost) : 0,
      totalCost: item ? Number(item.unitCost) * (item.quantityReceived || 0) : 0,
    };
  }

  /**
   * Get recent stock adjustments for a product (for activity display)
   */
  async getRecentActivity(
    businessId: string,
    productId: string,
    limit: number = 10
  ): Promise<StockAdjustment[]> {
    return this.adjustmentRepository.find({
      where: { businessId, productId },
      relations: ['supplier', 'createdBy'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Record a sale adjustment (called when an order is completed)
   */
  async recordSale(
    businessId: string,
    productId: string,
    quantity: number,
    orderId: string,
    createdById?: string
  ): Promise<StockAdjustment> {
    return this.createAdjustment({
      businessId,
      productId,
      type: StockAdjustmentType.SALE,
      quantity: -quantity, // Negative for sales
      orderId,
      createdById,
      reason: 'Sale',
    });
  }

  /**
   * Record a return adjustment (called when a return is processed)
   */
  async recordReturn(
    businessId: string,
    productId: string,
    quantity: number,
    orderId: string,
    createdById?: string,
    reason?: string
  ): Promise<StockAdjustment> {
    return this.createAdjustment({
      businessId,
      productId,
      type: StockAdjustmentType.RETURN,
      quantity: quantity, // Positive for returns
      orderId,
      createdById,
      reason: reason || 'Customer return',
    });
  }

  /**
   * Record receiving from purchase order
   */
  async recordPurchaseOrderReceiving(
    businessId: string,
    productId: string,
    quantity: number,
    purchaseOrderId: string,
    supplierId: string,
    unitCost: number,
    createdById?: string,
    batchInfo?: { batchNumber?: string; lotNumber?: string; expirationDate?: Date }
  ): Promise<StockAdjustment> {
    return this.createAdjustment({
      businessId,
      productId,
      type: StockAdjustmentType.PURCHASE_ORDER,
      quantity: quantity, // Positive for receiving
      purchaseOrderId,
      supplierId,
      unitCost,
      createdById,
      reason: 'Purchase order received',
      ...batchInfo,
    });
  }

  /**
   * Record receiving stock in cases
   * For case-based ordering (liquor stores, wholesale, etc.)
   *
   * Example: Receive 5 cases of wine, 12 bottles per case, $120/case
   * - orderQuantity: 5
   * - unitsPerCase: 12
   * - caseCost: 120
   * - Total units added: 60
   * - Unit cost: $10/bottle
   */
  async recordCaseReceiving(data: {
    businessId: string;
    productId: string;
    caseQuantity: number;      // Number of cases received
    unitsPerCase: number;      // Units in each case
    caseCost: number;          // Cost per case
    supplierId?: string;
    purchaseOrderId?: string;
    batchNumber?: string;
    lotNumber?: string;
    expirationDate?: Date;
    createdById?: string;
    notes?: string;
  }): Promise<StockAdjustment> {
    const product = await this.productRepository.findOne({
      where: { id: data.productId, businessId: data.businessId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate total units and unit cost
    const totalUnits = data.caseQuantity * data.unitsPerCase;
    const unitCost = data.caseCost / data.unitsPerCase;
    const totalCost = data.caseCost * data.caseQuantity;

    const previousStock = product.quantity;
    const newStock = previousStock + totalUnits;

    // Generate reference number
    const count = await this.adjustmentRepository.count({
      where: { businessId: data.businessId },
    });
    const referenceNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Create adjustment with case tracking info
    const adjustment = this.adjustmentRepository.create({
      businessId: data.businessId,
      productId: data.productId,
      referenceNumber,
      type: StockAdjustmentType.PURCHASE_ORDER,
      status: StockAdjustmentStatus.COMPLETED,
      quantity: totalUnits,
      previousStock,
      newStock,
      unitCost,
      totalCost,
      // Case tracking fields
      orderUnitType: 'case' as const,
      orderQuantity: data.caseQuantity,
      unitsPerOrderUnit: data.unitsPerCase,
      orderUnitCost: data.caseCost,
      // Optional fields
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
      batchNumber: data.batchNumber,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate,
      createdById: data.createdById,
      reason: `Received ${data.caseQuantity} case${data.caseQuantity > 1 ? 's' : ''} (${totalUnits} units)`,
      notes: data.notes,
    });

    // Update product quantity
    product.quantity = newStock;

    // Save both
    await this.productRepository.save(product);
    const savedAdjustment = await this.adjustmentRepository.save(adjustment);

    return this.adjustmentRepository.findOne({
      where: { id: savedAdjustment.id },
      relations: ['product', 'supplier', 'createdBy', 'purchaseOrder'],
    }) as Promise<StockAdjustment>;
  }

  /**
   * Record receiving stock in packs
   * For pack-based ordering (e.g., 6-packs)
   */
  async recordPackReceiving(data: {
    businessId: string;
    productId: string;
    packQuantity: number;      // Number of packs received
    unitsPerPack: number;      // Units in each pack
    packCost: number;          // Cost per pack
    supplierId?: string;
    purchaseOrderId?: string;
    batchNumber?: string;
    lotNumber?: string;
    expirationDate?: Date;
    createdById?: string;
    notes?: string;
  }): Promise<StockAdjustment> {
    const product = await this.productRepository.findOne({
      where: { id: data.productId, businessId: data.businessId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate total units and unit cost
    const totalUnits = data.packQuantity * data.unitsPerPack;
    const unitCost = data.packCost / data.unitsPerPack;
    const totalCost = data.packCost * data.packQuantity;

    const previousStock = product.quantity;
    const newStock = previousStock + totalUnits;

    // Generate reference number
    const count = await this.adjustmentRepository.count({
      where: { businessId: data.businessId },
    });
    const referenceNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Create adjustment with pack tracking info
    const adjustment = this.adjustmentRepository.create({
      businessId: data.businessId,
      productId: data.productId,
      referenceNumber,
      type: StockAdjustmentType.PURCHASE_ORDER,
      status: StockAdjustmentStatus.COMPLETED,
      quantity: totalUnits,
      previousStock,
      newStock,
      unitCost,
      totalCost,
      // Pack tracking fields
      orderUnitType: 'pack' as const,
      orderQuantity: data.packQuantity,
      unitsPerOrderUnit: data.unitsPerPack,
      orderUnitCost: data.packCost,
      // Optional fields
      supplierId: data.supplierId,
      purchaseOrderId: data.purchaseOrderId,
      batchNumber: data.batchNumber,
      lotNumber: data.lotNumber,
      expirationDate: data.expirationDate,
      createdById: data.createdById,
      reason: `Received ${data.packQuantity} pack${data.packQuantity > 1 ? 's' : ''} (${totalUnits} units)`,
      notes: data.notes,
    });

    // Update product quantity
    product.quantity = newStock;

    // Save both
    await this.productRepository.save(product);
    const savedAdjustment = await this.adjustmentRepository.save(adjustment);

    return this.adjustmentRepository.findOne({
      where: { id: savedAdjustment.id },
      relations: ['product', 'supplier', 'createdBy', 'purchaseOrder'],
    }) as Promise<StockAdjustment>;
  }

  /**
   * Get stock adjustment statistics for a product
   */
  async getProductStockStats(businessId: string, productId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const adjustments = await this.adjustmentRepository.find({
      where: {
        businessId,
        productId,
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Calculate average daily sales
    const salesAdjustments = adjustments.filter(
      (a) => a.type === StockAdjustmentType.SALE
    );
    const totalSold = salesAdjustments.reduce((sum, a) => sum + Math.abs(a.quantity), 0);
    const avgDailySales = totalSold / days;

    // Calculate stock received
    const receivingAdjustments = adjustments.filter(
      (a) => a.type === StockAdjustmentType.PURCHASE_ORDER
    );
    const totalReceived = receivingAdjustments.reduce((sum, a) => sum + a.quantity, 0);

    return {
      avgDailySales,
      totalSold,
      totalReceived,
      adjustmentCount: adjustments.length,
      salesCount: salesAdjustments.length,
      receivingCount: receivingAdjustments.length,
    };
  }
}

export const stockAdjustmentService = new StockAdjustmentService();
