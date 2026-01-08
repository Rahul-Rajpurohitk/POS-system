import { EntityManager, Repository, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product, OrderItem } from '../entities';
import { InventoryAdjustmentType } from '../types/enums';
import { v4 as uuidv4 } from 'uuid';
import { auditService, AuditEventType } from './audit.service';

// DTOs
export interface StockReservation {
  reservationId: string;
  productId: string;
  quantity: number;
  expiresAt: Date;
  orderId?: string;
}

export interface InventoryAdjustment {
  productId: string;
  quantity: number; // Positive for increase, negative for decrease
  type: InventoryAdjustmentType;
  reason?: string;
  referenceId?: string; // Order ID, transfer ID, etc.
  adjustedBy: string;
  adjustedByName?: string; // User name for audit logging
}

export interface StockCheckResult {
  productId: string;
  available: boolean;
  requestedQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
}

export interface BulkStockCheck {
  items: Array<{ productId: string; quantity: number }>;
  allAvailable: boolean;
  results: StockCheckResult[];
}

// In-memory reservation store (would use Redis in production)
const reservations = new Map<string, StockReservation>();

class InventoryService {
  private productRepository: Repository<Product>;
  private readonly RESERVATION_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    // Clean up expired reservations periodically
    setInterval(() => this.cleanupExpiredReservations(), 60 * 1000);
  }

  /**
   * Check stock availability for multiple items
   */
  async checkStockAvailability(
    businessId: string,
    items: Array<{ productId: string; quantity: number }>
  ): Promise<BulkStockCheck> {
    const results: StockCheckResult[] = [];

    for (const item of items) {
      const result = await this.checkSingleStock(businessId, item.productId, item.quantity);
      results.push(result);
    }

    return {
      items,
      allAvailable: results.every((r) => r.available),
      results,
    };
  }

  /**
   * Check stock for a single product
   */
  async checkSingleStock(
    businessId: string,
    productId: string,
    requestedQuantity: number
  ): Promise<StockCheckResult> {
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
    });

    if (!product) {
      return {
        productId,
        available: false,
        requestedQuantity,
        availableQuantity: 0,
        reservedQuantity: 0,
      };
    }

    const reservedQuantity = this.getReservedQuantity(productId);
    const availableQuantity = Math.max(0, product.stock - reservedQuantity);

    return {
      productId,
      available: availableQuantity >= requestedQuantity,
      requestedQuantity,
      availableQuantity,
      reservedQuantity,
    };
  }

  /**
   * Reserve stock for an order (prevents overselling)
   * Uses database locking to prevent race conditions
   */
  async reserveStock(
    businessId: string,
    items: Array<{ productId: string; quantity: number }>,
    orderId?: string
  ): Promise<{ success: boolean; reservationIds: string[]; errors: string[] }> {
    const reservationIds: string[] = [];
    const errors: string[] = [];

    return AppDataSource.transaction(async (manager: EntityManager) => {
      for (const item of items) {
        // Lock the product row for update
        const product = await manager
          .getRepository(Product)
          .createQueryBuilder('product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: item.productId })
          .andWhere('product.businessId = :businessId', { businessId })
          .getOne();

        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          continue;
        }

        const reservedQuantity = this.getReservedQuantity(item.productId);
        const availableQuantity = product.stock - reservedQuantity;

        if (availableQuantity < item.quantity) {
          errors.push(
            `Insufficient stock for ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`
          );
          continue;
        }

        // Create reservation
        const reservationId = uuidv4();
        const reservation: StockReservation = {
          reservationId,
          productId: item.productId,
          quantity: item.quantity,
          expiresAt: new Date(Date.now() + this.RESERVATION_TTL),
          orderId,
        };

        reservations.set(reservationId, reservation);
        reservationIds.push(reservationId);
      }

      if (errors.length > 0 && reservationIds.length > 0) {
        // Rollback partial reservations if any errors
        reservationIds.forEach((id) => reservations.delete(id));
        return { success: false, reservationIds: [], errors };
      }

      return {
        success: errors.length === 0,
        reservationIds,
        errors,
      };
    });
  }

  /**
   * Confirm stock reservation and deduct from inventory
   * Called when payment is successful
   */
  async confirmReservation(
    reservationIds: string[],
    adjustedBy: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    return AppDataSource.transaction(async (manager: EntityManager) => {
      for (const reservationId of reservationIds) {
        const reservation = reservations.get(reservationId);

        if (!reservation) {
          errors.push(`Reservation ${reservationId} not found or expired`);
          continue;
        }

        // Lock and update product
        const product = await manager
          .getRepository(Product)
          .createQueryBuilder('product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: reservation.productId })
          .getOne();

        if (!product) {
          errors.push(`Product ${reservation.productId} not found`);
          reservations.delete(reservationId);
          continue;
        }

        // Double-check stock (in case of edge cases)
        if (product.stock < reservation.quantity) {
          errors.push(`Insufficient stock for product ${product.name}`);
          reservations.delete(reservationId);
          continue;
        }

        // Deduct stock
        product.stock -= reservation.quantity;
        product.soldQuantity = (product.soldQuantity || 0) + reservation.quantity;

        await manager.save(product);

        // Remove reservation
        reservations.delete(reservationId);
      }

      return {
        success: errors.length === 0,
        errors,
      };
    });
  }

  /**
   * Release stock reservation (cancel order or timeout)
   */
  releaseReservation(reservationIds: string[]): void {
    reservationIds.forEach((id) => reservations.delete(id));
  }

  /**
   * Release all reservations for an order
   */
  releaseOrderReservations(orderId: string): void {
    for (const [id, reservation] of reservations.entries()) {
      if (reservation.orderId === orderId) {
        reservations.delete(id);
      }
    }
  }

  /**
   * Adjust inventory with locking
   */
  async adjustInventory(
    businessId: string,
    adjustments: InventoryAdjustment[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    return AppDataSource.transaction(async (manager: EntityManager) => {
      for (const adjustment of adjustments) {
        const product = await manager
          .getRepository(Product)
          .createQueryBuilder('product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: adjustment.productId })
          .andWhere('product.businessId = :businessId', { businessId })
          .getOne();

        if (!product) {
          errors.push(`Product ${adjustment.productId} not found`);
          continue;
        }

        const newStock = product.stock + adjustment.quantity;

        // Prevent negative stock (unless it's a damage/theft audit)
        if (newStock < 0 && ![InventoryAdjustmentType.DAMAGE, InventoryAdjustmentType.THEFT, InventoryAdjustmentType.AUDIT].includes(adjustment.type)) {
          errors.push(
            `Cannot reduce stock below 0 for ${product.name}. Current: ${product.stock}, Adjustment: ${adjustment.quantity}`
          );
          continue;
        }

        product.stock = Math.max(0, newStock);

        // Update sold quantity for sales
        if (adjustment.type === InventoryAdjustmentType.SALE) {
          product.soldQuantity = (product.soldQuantity || 0) + Math.abs(adjustment.quantity);
        }

        // Update sold quantity for returns (decrease)
        if (adjustment.type === InventoryAdjustmentType.RETURN) {
          product.soldQuantity = Math.max(0, (product.soldQuantity || 0) - Math.abs(adjustment.quantity));
        }

        await manager.save(product);

        // Log the adjustment to audit trail
        await auditService.logInventory(
          AuditEventType.INVENTORY_ADJUSTED,
          businessId,
          adjustment.adjustedBy,
          adjustment.adjustedByName || 'System',
          adjustment.productId,
          product.name,
          product.stock - adjustment.quantity, // previous stock
          product.stock, // new stock
          adjustment.reason || this.getAdjustmentReasonText(adjustment.type),
          {
            adjustmentType: adjustment.type,
            referenceId: adjustment.referenceId,
            quantityChanged: adjustment.quantity,
          }
        );
      }

      return {
        success: errors.length === 0,
        errors,
      };
    });
  }

  /**
   * Get human-readable reason text for adjustment type
   */
  private getAdjustmentReasonText(type: InventoryAdjustmentType): string {
    const reasons: Record<InventoryAdjustmentType, string> = {
      [InventoryAdjustmentType.SALE]: 'Sale transaction',
      [InventoryAdjustmentType.RETURN]: 'Customer return',
      [InventoryAdjustmentType.PURCHASE]: 'Purchase/Restock',
      [InventoryAdjustmentType.TRANSFER_IN]: 'Transfer received',
      [InventoryAdjustmentType.TRANSFER_OUT]: 'Transfer sent',
      [InventoryAdjustmentType.DAMAGE]: 'Damaged goods',
      [InventoryAdjustmentType.THEFT]: 'Theft/Loss',
      [InventoryAdjustmentType.AUDIT]: 'Inventory audit adjustment',
      [InventoryAdjustmentType.CORRECTION]: 'Manual correction',
      [InventoryAdjustmentType.EXPIRED]: 'Expired goods',
    };
    return reasons[type] || 'Stock adjustment';
  }

  /**
   * Restore inventory for refund/return
   */
  async restoreInventory(
    businessId: string,
    items: Array<{ productId: string; quantity: number }>,
    adjustedBy: string,
    referenceId?: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const adjustments: InventoryAdjustment[] = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity, // Positive to add back
      type: InventoryAdjustmentType.RETURN,
      referenceId,
      adjustedBy,
    }));

    return this.adjustInventory(businessId, adjustments);
  }

  /**
   * Deduct inventory after order completion
   */
  async deductInventory(
    businessId: string,
    orderItems: OrderItem[],
    adjustedBy: string,
    orderId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const adjustments: InventoryAdjustment[] = orderItems.map((item) => ({
      productId: item.productId,
      quantity: -item.quantity, // Negative to deduct
      type: InventoryAdjustmentType.SALE,
      referenceId: orderId,
      adjustedBy,
    }));

    return this.adjustInventory(businessId, adjustments);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(businessId: string): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.enabled = :enabled', { enabled: true })
      .andWhere('product.stock <= product.minStock')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts(businessId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: {
        businessId,
        enabled: true,
        stock: LessThanOrEqual(0),
      },
      order: { name: 'ASC' },
    });
  }

  /**
   * Bulk stock update
   */
  async bulkUpdateStock(
    businessId: string,
    updates: Array<{ productId: string; stock: number }>,
    adjustedBy: string,
    adjustedByName?: string
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    return AppDataSource.transaction(async (manager: EntityManager) => {
      for (const update of updates) {
        const product = await manager
          .getRepository(Product)
          .createQueryBuilder('product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: update.productId })
          .andWhere('product.businessId = :businessId', { businessId })
          .getOne();

        if (!product) {
          errors.push(`Product ${update.productId} not found`);
          continue;
        }

        const previousStock = product.stock;
        product.stock = Math.max(0, update.stock);
        await manager.save(product);

        updated++;

        // Log to audit trail
        await auditService.logInventory(
          AuditEventType.INVENTORY_ADJUSTED,
          businessId,
          adjustedBy,
          adjustedByName || 'System',
          update.productId,
          product.name,
          previousStock,
          product.stock,
          'Bulk stock update',
          {
            adjustmentType: InventoryAdjustmentType.AUDIT,
            bulkUpdate: true,
            difference: product.stock - previousStock,
          }
        );
      }

      return { success: true, updated, errors };
    });
  }

  /**
   * Stock count / inventory audit
   */
  async performStockCount(
    businessId: string,
    counts: Array<{ productId: string; countedStock: number }>,
    countedBy: string,
    countedByName?: string
  ): Promise<{
    success: boolean;
    discrepancies: Array<{
      productId: string;
      productName: string;
      systemStock: number;
      countedStock: number;
      difference: number;
    }>;
  }> {
    const discrepancies: Array<{
      productId: string;
      productName: string;
      systemStock: number;
      countedStock: number;
      difference: number;
    }> = [];

    return AppDataSource.transaction(async (manager: EntityManager) => {
      for (const count of counts) {
        const product = await manager
          .getRepository(Product)
          .createQueryBuilder('product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: count.productId })
          .andWhere('product.businessId = :businessId', { businessId })
          .getOne();

        if (!product) {
          continue;
        }

        const difference = count.countedStock - product.stock;

        if (difference !== 0) {
          discrepancies.push({
            productId: product.id,
            productName: product.name,
            systemStock: product.stock,
            countedStock: count.countedStock,
            difference,
          });
        }

        // Update to counted value
        const previousStock = product.stock;
        product.stock = count.countedStock;
        await manager.save(product);

        // Log to audit trail
        await auditService.logInventory(
          AuditEventType.INVENTORY_COUNT,
          businessId,
          countedBy,
          countedByName || 'System',
          product.id,
          product.name,
          previousStock,
          count.countedStock,
          difference !== 0 ? `Stock count discrepancy: ${difference > 0 ? '+' : ''}${difference}` : 'Stock count verified',
          {
            adjustmentType: InventoryAdjustmentType.AUDIT,
            stockCount: true,
            hasDiscrepancy: difference !== 0,
            discrepancyAmount: difference,
            systemStock: previousStock,
            countedStock: count.countedStock,
          }
        );
      }

      return { success: true, discrepancies };
    });
  }

  // Private helpers

  private getReservedQuantity(productId: string): number {
    let reserved = 0;
    const now = Date.now();

    for (const reservation of reservations.values()) {
      if (
        reservation.productId === productId &&
        reservation.expiresAt.getTime() > now
      ) {
        reserved += reservation.quantity;
      }
    }

    return reserved;
  }

  private cleanupExpiredReservations(): void {
    const now = Date.now();
    for (const [id, reservation] of reservations.entries()) {
      if (reservation.expiresAt.getTime() <= now) {
        reservations.delete(id);
      }
    }
  }
}

export const inventoryService = new InventoryService();
