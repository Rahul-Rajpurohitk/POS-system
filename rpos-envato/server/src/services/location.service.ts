import { EntityManager, Repository, In, Not } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  Location,
  LocationInventory,
  StockTransfer,
  StockTransferItem,
  LocationStatus,
  LocationType,
  TransferStatus,
} from '../entities/Location.entity';
import { Product } from '../entities/Product.entity';

// DTOs
export interface CreateLocationDTO {
  businessId: string;
  code: string;
  name: string;
  description?: string;
  type?: LocationType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  operatingHours?: Location['operatingHours'];
  timezone?: string;
  taxRate?: number;
  taxId?: string;
  isPrimary?: boolean;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  managerId?: string;
}

export interface UpdateLocationDTO {
  name?: string;
  description?: string;
  type?: LocationType;
  status?: LocationStatus;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  operatingHours?: Location['operatingHours'];
  timezone?: string;
  taxRate?: number;
  taxId?: string;
  isPrimary?: boolean;
  acceptsReturns?: boolean;
  canTransferStock?: boolean;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  managerId?: string;
}

export interface CreateTransferDTO {
  businessId: string;
  fromLocationId: string;
  toLocationId: string;
  createdById: string;
  reason?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantityRequested: number;
    unitCost?: number;
    notes?: string;
  }>;
}

export interface InventoryAdjustmentDTO {
  locationId: string;
  productId: string;
  quantityChange: number;
  reason: string;
  performedById: string;
}

class LocationService {
  private locationRepository: Repository<Location>;
  private inventoryRepository: Repository<LocationInventory>;
  private transferRepository: Repository<StockTransfer>;
  private transferItemRepository: Repository<StockTransferItem>;

  constructor() {
    this.locationRepository = AppDataSource.getRepository(Location);
    this.inventoryRepository = AppDataSource.getRepository(LocationInventory);
    this.transferRepository = AppDataSource.getRepository(StockTransfer);
    this.transferItemRepository = AppDataSource.getRepository(StockTransferItem);
  }

  // ============ LOCATION CRUD ============

  async createLocation(dto: CreateLocationDTO): Promise<Location> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // If this is the first location or marked as primary, ensure only one primary
      if (dto.isPrimary) {
        await manager.update(Location, { businessId: dto.businessId, isPrimary: true }, { isPrimary: false });
      }

      const location = manager.create(Location, {
        ...dto,
        status: LocationStatus.ACTIVE,
      });

      return manager.save(location);
    });
  }

  async updateLocation(locationId: string, businessId: string, dto: UpdateLocationDTO): Promise<Location> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const location = await manager.findOne(Location, {
        where: { id: locationId, businessId },
      });

      if (!location) {
        throw new Error('Location not found');
      }

      // If setting as primary, unset other primaries
      if (dto.isPrimary && !location.isPrimary) {
        await manager.update(Location, { businessId, isPrimary: true }, { isPrimary: false });
      }

      Object.assign(location, dto);
      return manager.save(location);
    });
  }

  async getLocation(locationId: string, businessId: string): Promise<Location | null> {
    return this.locationRepository.findOne({
      where: { id: locationId, businessId },
      relations: ['manager'],
    });
  }

  async getLocations(
    businessId: string,
    options?: {
      status?: LocationStatus;
      type?: LocationType;
      includeInventory?: boolean;
    }
  ): Promise<Location[]> {
    const where: any = { businessId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.type) {
      where.type = options.type;
    }

    return this.locationRepository.find({
      where,
      relations: options?.includeInventory ? ['inventory', 'manager'] : ['manager'],
      order: { isPrimary: 'DESC', name: 'ASC' },
    });
  }

  async deleteLocation(locationId: string, businessId: string): Promise<void> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId, businessId },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    if (location.isPrimary) {
      throw new Error('Cannot delete primary location');
    }

    // Check for pending transfers
    const pendingTransfers = await this.transferRepository.count({
      where: [
        { fromLocationId: locationId, status: Not(In([TransferStatus.COMPLETED, TransferStatus.CANCELLED])) },
        { toLocationId: locationId, status: Not(In([TransferStatus.COMPLETED, TransferStatus.CANCELLED])) },
      ],
    });

    if (pendingTransfers > 0) {
      throw new Error('Cannot delete location with pending transfers');
    }

    await this.locationRepository.remove(location);
  }

  // ============ LOCATION INVENTORY ============

  async getLocationInventory(
    locationId: string,
    options?: {
      lowStockOnly?: boolean;
      productIds?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: LocationInventory[]; total: number }> {
    const qb = this.inventoryRepository
      .createQueryBuilder('inv')
      .where('inv.locationId = :locationId', { locationId });

    if (options?.lowStockOnly) {
      qb.andWhere('inv.quantity <= inv.minStock');
    }

    if (options?.productIds?.length) {
      qb.andWhere('inv.productId IN (:...productIds)', { productIds: options.productIds });
    }

    const total = await qb.getCount();

    if (options?.limit) {
      qb.limit(options.limit);
    }
    if (options?.offset) {
      qb.offset(options.offset);
    }

    qb.orderBy('inv.quantity', 'ASC');

    const items = await qb.getMany();

    return { items, total };
  }

  async updateLocationInventory(
    locationId: string,
    productId: string,
    updates: Partial<Pick<LocationInventory, 'minStock' | 'maxStock' | 'reorderPoint' | 'reorderQuantity' | 'binLocation'>>
  ): Promise<LocationInventory> {
    let inventory = await this.inventoryRepository.findOne({
      where: { locationId, productId },
    });

    if (!inventory) {
      inventory = this.inventoryRepository.create({
        locationId,
        productId,
        quantity: 0,
        ...updates,
      });
    } else {
      Object.assign(inventory, updates);
    }

    return this.inventoryRepository.save(inventory);
  }

  async adjustInventory(dto: InventoryAdjustmentDTO): Promise<LocationInventory> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      let inventory = await manager
        .getRepository(LocationInventory)
        .createQueryBuilder('inv')
        .setLock('pessimistic_write')
        .where('inv.locationId = :locationId', { locationId: dto.locationId })
        .andWhere('inv.productId = :productId', { productId: dto.productId })
        .getOne();

      const location = await manager.findOne(Location, { where: { id: dto.locationId } });

      if (!inventory) {
        if (dto.quantityChange < 0 && !location?.allowNegativeStock) {
          throw new Error('Cannot create inventory with negative quantity');
        }

        inventory = manager.create(LocationInventory, {
          locationId: dto.locationId,
          productId: dto.productId,
          quantity: dto.quantityChange,
        });
      } else {
        const newQuantity = inventory.quantity + dto.quantityChange;

        if (newQuantity < 0 && !location?.allowNegativeStock) {
          throw new Error('Insufficient stock for adjustment');
        }

        inventory.quantity = newQuantity;
      }

      return manager.save(inventory);
    });
  }

  async performStockCount(
    locationId: string,
    counts: Array<{ productId: string; countedQuantity: number }>,
    performedById: string
  ): Promise<{ updated: number; discrepancies: Array<{ productId: string; expected: number; counted: number }> }> {
    const discrepancies: Array<{ productId: string; expected: number; counted: number }> = [];
    let updated = 0;

    await AppDataSource.transaction(async (manager: EntityManager) => {
      for (const count of counts) {
        let inventory = await manager.findOne(LocationInventory, {
          where: { locationId, productId: count.productId },
        });

        if (!inventory) {
          inventory = manager.create(LocationInventory, {
            locationId,
            productId: count.productId,
            quantity: count.countedQuantity,
            lastCountedAt: new Date(),
          });
        } else {
          if (inventory.quantity !== count.countedQuantity) {
            discrepancies.push({
              productId: count.productId,
              expected: inventory.quantity,
              counted: count.countedQuantity,
            });
          }
          inventory.quantity = count.countedQuantity;
          inventory.lastCountedAt = new Date();
        }

        await manager.save(inventory);
        updated++;
      }
    });

    return { updated, discrepancies };
  }

  async getInventoryAcrossLocations(
    businessId: string,
    productId: string
  ): Promise<Array<{ location: Location; inventory: LocationInventory | null }>> {
    const locations = await this.locationRepository.find({
      where: { businessId, status: LocationStatus.ACTIVE },
    });

    const result = [];

    for (const location of locations) {
      const inventory = await this.inventoryRepository.findOne({
        where: { locationId: location.id, productId },
      });

      result.push({ location, inventory });
    }

    return result;
  }

  async getTotalInventory(businessId: string, productId: string): Promise<number> {
    const locations = await this.locationRepository.find({
      where: { businessId, status: LocationStatus.ACTIVE, trackInventory: true },
    });

    if (locations.length === 0) return 0;

    const result = await this.inventoryRepository
      .createQueryBuilder('inv')
      .select('SUM(inv.quantity)', 'total')
      .where('inv.locationId IN (:...locationIds)', { locationIds: locations.map((l) => l.id) })
      .andWhere('inv.productId = :productId', { productId })
      .getRawOne();

    return parseInt(result?.total || '0');
  }

  // ============ STOCK TRANSFERS ============

  async createTransfer(dto: CreateTransferDTO): Promise<StockTransfer> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // Validate locations
      const [fromLocation, toLocation] = await Promise.all([
        manager.findOne(Location, { where: { id: dto.fromLocationId, businessId: dto.businessId } }),
        manager.findOne(Location, { where: { id: dto.toLocationId, businessId: dto.businessId } }),
      ]);

      if (!fromLocation || !toLocation) {
        throw new Error('Invalid source or destination location');
      }

      if (!fromLocation.canTransferStock) {
        throw new Error('Source location cannot transfer stock');
      }

      if (fromLocation.id === toLocation.id) {
        throw new Error('Source and destination must be different locations');
      }

      // Generate transfer number
      const transferNumber = await this.generateTransferNumber(manager, dto.businessId);

      // Create transfer
      const transfer = manager.create(StockTransfer, {
        transferNumber,
        businessId: dto.businessId,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        createdById: dto.createdById,
        reason: dto.reason,
        notes: dto.notes,
        status: TransferStatus.DRAFT,
      });

      await manager.save(transfer);

      // Create transfer items
      for (const item of dto.items) {
        const transferItem = manager.create(StockTransferItem, {
          transferId: transfer.id,
          productId: item.productId,
          quantityRequested: item.quantityRequested,
          unitCost: item.unitCost,
          notes: item.notes,
        });

        await manager.save(transferItem);
      }

      // Load items
      transfer.items = await manager.find(StockTransferItem, { where: { transferId: transfer.id } });

      return transfer;
    });
  }

  async submitTransfer(transferId: string, businessId: string): Promise<StockTransfer> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const transfer = await manager.findOne(StockTransfer, {
        where: { id: transferId, businessId },
        relations: ['items'],
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.DRAFT) {
        throw new Error('Only draft transfers can be submitted');
      }

      // Validate stock availability
      for (const item of transfer.items) {
        const inventory = await manager.findOne(LocationInventory, {
          where: { locationId: transfer.fromLocationId, productId: item.productId },
        });

        const availableQty = inventory ? inventory.availableQuantity : 0;

        if (availableQty < item.quantityRequested) {
          throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableQty}, Requested: ${item.quantityRequested}`);
        }
      }

      transfer.status = TransferStatus.PENDING;
      return manager.save(transfer);
    });
  }

  async approveTransfer(transferId: string, businessId: string, approvedById: string): Promise<StockTransfer> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const transfer = await manager.findOne(StockTransfer, {
        where: { id: transferId, businessId },
        relations: ['items'],
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.PENDING) {
        throw new Error('Only pending transfers can be approved');
      }

      // Reserve stock at source location
      for (const item of transfer.items) {
        const inventory = await manager
          .getRepository(LocationInventory)
          .createQueryBuilder('inv')
          .setLock('pessimistic_write')
          .where('inv.locationId = :locationId', { locationId: transfer.fromLocationId })
          .andWhere('inv.productId = :productId', { productId: item.productId })
          .getOne();

        if (!inventory || inventory.availableQuantity < item.quantityRequested) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        inventory.reservedQuantity += item.quantityRequested;
        await manager.save(inventory);
      }

      transfer.status = TransferStatus.APPROVED;
      transfer.approvedById = approvedById;
      transfer.approvedAt = new Date();

      return manager.save(transfer);
    });
  }

  async shipTransfer(
    transferId: string,
    businessId: string,
    shippingInfo: { shippingMethod?: string; trackingNumber?: string; expectedArrival?: Date }
  ): Promise<StockTransfer> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const transfer = await manager.findOne(StockTransfer, {
        where: { id: transferId, businessId },
        relations: ['items'],
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.APPROVED) {
        throw new Error('Only approved transfers can be shipped');
      }

      // Deduct stock from source location
      for (const item of transfer.items) {
        const inventory = await manager
          .getRepository(LocationInventory)
          .createQueryBuilder('inv')
          .setLock('pessimistic_write')
          .where('inv.locationId = :locationId', { locationId: transfer.fromLocationId })
          .andWhere('inv.productId = :productId', { productId: item.productId })
          .getOne();

        if (inventory) {
          inventory.quantity -= item.quantityRequested;
          inventory.reservedQuantity -= item.quantityRequested;
          await manager.save(inventory);
        }

        // Update shipped quantity
        item.quantityShipped = item.quantityRequested;
        await manager.save(item);
      }

      transfer.status = TransferStatus.IN_TRANSIT;
      transfer.shippedAt = new Date();
      transfer.shippingMethod = shippingInfo.shippingMethod || null;
      transfer.trackingNumber = shippingInfo.trackingNumber || null;
      transfer.expectedArrival = shippingInfo.expectedArrival || null;

      return manager.save(transfer);
    });
  }

  async receiveTransfer(
    transferId: string,
    businessId: string,
    receivedById: string,
    receivedItems: Array<{ productId: string; quantityReceived: number; notes?: string }>
  ): Promise<StockTransfer> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const transfer = await manager.findOne(StockTransfer, {
        where: { id: transferId, businessId },
        relations: ['items'],
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new Error('Only in-transit transfers can be received');
      }

      // Process received items
      for (const received of receivedItems) {
        const item = transfer.items.find((i) => i.productId === received.productId);
        if (!item) continue;

        item.quantityReceived = received.quantityReceived;
        if (received.notes) {
          item.notes = received.notes;
        }
        await manager.save(item);

        // Add to destination inventory
        let destInventory = await manager.findOne(LocationInventory, {
          where: { locationId: transfer.toLocationId, productId: received.productId },
        });

        if (!destInventory) {
          destInventory = manager.create(LocationInventory, {
            locationId: transfer.toLocationId,
            productId: received.productId,
            quantity: received.quantityReceived,
            lastRestockedAt: new Date(),
          });
        } else {
          destInventory.quantity += received.quantityReceived;
          destInventory.lastRestockedAt = new Date();
        }

        await manager.save(destInventory);
      }

      transfer.status = TransferStatus.RECEIVED;
      transfer.receivedById = receivedById;
      transfer.receivedAt = new Date();

      return manager.save(transfer);
    });
  }

  async completeTransfer(transferId: string, businessId: string): Promise<StockTransfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id: transferId, businessId },
      relations: ['items'],
    });

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== TransferStatus.RECEIVED) {
      throw new Error('Only received transfers can be completed');
    }

    transfer.status = TransferStatus.COMPLETED;
    transfer.completedAt = new Date();

    return this.transferRepository.save(transfer);
  }

  async cancelTransfer(transferId: string, businessId: string, reason?: string): Promise<StockTransfer> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const transfer = await manager.findOne(StockTransfer, {
        where: { id: transferId, businessId },
        relations: ['items'],
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if ([TransferStatus.COMPLETED, TransferStatus.CANCELLED].includes(transfer.status)) {
        throw new Error('Transfer cannot be cancelled');
      }

      // If approved but not shipped, release reserved stock
      if (transfer.status === TransferStatus.APPROVED) {
        for (const item of transfer.items) {
          const inventory = await manager
            .getRepository(LocationInventory)
            .createQueryBuilder('inv')
            .setLock('pessimistic_write')
            .where('inv.locationId = :locationId', { locationId: transfer.fromLocationId })
            .andWhere('inv.productId = :productId', { productId: item.productId })
            .getOne();

          if (inventory) {
            inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - item.quantityRequested);
            await manager.save(inventory);
          }
        }
      }

      transfer.status = TransferStatus.CANCELLED;
      if (reason) {
        transfer.notes = transfer.notes ? `${transfer.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
      }

      return manager.save(transfer);
    });
  }

  async getTransfer(transferId: string, businessId: string): Promise<StockTransfer | null> {
    return this.transferRepository.findOne({
      where: { id: transferId, businessId },
      relations: ['items', 'fromLocation', 'toLocation', 'createdBy', 'approvedBy', 'receivedBy'],
    });
  }

  async getTransfers(
    businessId: string,
    options?: {
      status?: TransferStatus;
      fromLocationId?: string;
      toLocationId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transfers: StockTransfer[]; total: number }> {
    const qb = this.transferRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fromLocation', 'from')
      .leftJoinAndSelect('t.toLocation', 'to')
      .where('t.businessId = :businessId', { businessId });

    if (options?.status) {
      qb.andWhere('t.status = :status', { status: options.status });
    }

    if (options?.fromLocationId) {
      qb.andWhere('t.fromLocationId = :fromLocationId', { fromLocationId: options.fromLocationId });
    }

    if (options?.toLocationId) {
      qb.andWhere('t.toLocationId = :toLocationId', { toLocationId: options.toLocationId });
    }

    const total = await qb.getCount();

    qb.orderBy('t.createdAt', 'DESC');

    if (options?.limit) {
      qb.limit(options.limit);
    }
    if (options?.offset) {
      qb.offset(options.offset);
    }

    const transfers = await qb.getMany();

    return { transfers, total };
  }

  async getPendingTransfersForLocation(locationId: string): Promise<{
    incoming: StockTransfer[];
    outgoing: StockTransfer[];
  }> {
    const pendingStatuses = [TransferStatus.PENDING, TransferStatus.APPROVED, TransferStatus.IN_TRANSIT];

    const [incoming, outgoing] = await Promise.all([
      this.transferRepository.find({
        where: { toLocationId: locationId, status: In(pendingStatuses) },
        relations: ['fromLocation', 'items'],
        order: { createdAt: 'DESC' },
      }),
      this.transferRepository.find({
        where: { fromLocationId: locationId, status: In(pendingStatuses) },
        relations: ['toLocation', 'items'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    return { incoming, outgoing };
  }

  // ============ HELPERS ============

  private async generateTransferNumber(manager: EntityManager, businessId: string): Promise<string> {
    const date = new Date();
    const prefix = `TRF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const lastTransfer = await manager
      .getRepository(StockTransfer)
      .createQueryBuilder('t')
      .where('t.businessId = :businessId', { businessId })
      .andWhere('t.transferNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.transferNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTransfer) {
      const lastSeq = parseInt(lastTransfer.transferNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  async getLocationStatistics(locationId: string): Promise<{
    totalProducts: number;
    totalQuantity: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingIncoming: number;
    pendingOutgoing: number;
  }> {
    const [inventoryStats, pendingTransfers] = await Promise.all([
      this.inventoryRepository
        .createQueryBuilder('inv')
        .select([
          'COUNT(inv.id) as totalProducts',
          'COALESCE(SUM(inv.quantity), 0) as totalQuantity',
          'COUNT(CASE WHEN inv.quantity <= inv.minStock AND inv.quantity > 0 THEN 1 END) as lowStockCount',
          'COUNT(CASE WHEN inv.quantity <= 0 THEN 1 END) as outOfStockCount',
        ])
        .where('inv.locationId = :locationId', { locationId })
        .getRawOne(),
      this.getPendingTransfersForLocation(locationId),
    ]);

    return {
      totalProducts: parseInt(inventoryStats?.totalProducts || '0'),
      totalQuantity: parseInt(inventoryStats?.totalQuantity || '0'),
      lowStockCount: parseInt(inventoryStats?.lowStockCount || '0'),
      outOfStockCount: parseInt(inventoryStats?.outOfStockCount || '0'),
      pendingIncoming: pendingTransfers.incoming.length,
      pendingOutgoing: pendingTransfers.outgoing.length,
    };
  }
}

export const locationService = new LocationService();
