import { EntityManager, Repository, In, LessThan, Between } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  Supplier,
  SupplierProduct,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderReceiving,
  PurchaseOrderReceivingItem,
  SupplierPayment,
  SupplierStatus,
  PurchaseOrderStatus,
  SupplierPaymentStatus,
  SupplierPaymentMethod,
} from '../entities/Supplier.entity';
import { LocationInventory } from '../entities/Location.entity';
import { ProductBatch, BatchStatus } from '../entities/Barcode.entity';

// DTOs
export interface CreateSupplierDTO {
  businessId: string;
  code: string;
  name: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  paymentTerms?: Supplier['paymentTerms'];
  currency?: string;
  creditLimit?: number;
  defaultLeadTimeDays?: number;
  minOrderAmount?: number;
  notes?: string;
}

export interface CreatePurchaseOrderDTO {
  businessId: string;
  supplierId: string;
  createdById: string;
  orderDate?: Date;
  expectedDelivery?: Date;
  shipToLocationId?: string;
  shippingMethod?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantityOrdered: number;
    unitCost: number;
    taxRate?: number;
    discountPercent?: number;
    supplierSku?: string;
    notes?: string;
  }>;
}

export interface ReceivePurchaseOrderDTO {
  purchaseOrderId: string;
  businessId: string;
  receivedById: string;
  locationId?: string;
  receivedDate?: Date;
  deliveryNote?: string;
  carrier?: string;
  qualityCheckPassed?: boolean;
  qualityNotes?: string;
  notes?: string;
  items: Array<{
    purchaseOrderItemId: string;
    productId: string;
    quantityReceived: number;
    quantityRejected?: number;
    rejectionReason?: string;
    batchNumber?: string;
    lotNumber?: string;
    expirationDate?: Date;
    binLocation?: string;
    notes?: string;
  }>;
}

class SupplierService {
  private supplierRepository: Repository<Supplier>;
  private supplierProductRepository: Repository<SupplierProduct>;
  private purchaseOrderRepository: Repository<PurchaseOrder>;
  private purchaseOrderItemRepository: Repository<PurchaseOrderItem>;
  private receivingRepository: Repository<PurchaseOrderReceiving>;
  private paymentRepository: Repository<SupplierPayment>;

  constructor() {
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    this.supplierProductRepository = AppDataSource.getRepository(SupplierProduct);
    this.purchaseOrderRepository = AppDataSource.getRepository(PurchaseOrder);
    this.purchaseOrderItemRepository = AppDataSource.getRepository(PurchaseOrderItem);
    this.receivingRepository = AppDataSource.getRepository(PurchaseOrderReceiving);
    this.paymentRepository = AppDataSource.getRepository(SupplierPayment);
  }

  // ============ SUPPLIER CRUD ============

  async createSupplier(dto: CreateSupplierDTO): Promise<Supplier> {
    // Check for duplicate code
    const existing = await this.supplierRepository.findOne({
      where: { businessId: dto.businessId, code: dto.code },
    });

    if (existing) {
      throw new Error('Supplier code already exists');
    }

    const supplier = this.supplierRepository.create({
      ...dto,
      status: SupplierStatus.ACTIVE,
    });

    return this.supplierRepository.save(supplier);
  }

  async updateSupplier(supplierId: string, businessId: string, updates: Partial<CreateSupplierDTO>): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId, businessId },
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    Object.assign(supplier, updates);
    return this.supplierRepository.save(supplier);
  }

  async getSupplier(supplierId: string, businessId: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({
      where: { id: supplierId, businessId },
    });
  }

  async getSuppliers(
    businessId: string,
    options?: { status?: SupplierStatus; search?: string; limit?: number; offset?: number }
  ): Promise<{ suppliers: Supplier[]; total: number }> {
    const qb = this.supplierRepository
      .createQueryBuilder('s')
      .where('s.businessId = :businessId', { businessId });

    if (options?.status) {
      qb.andWhere('s.status = :status', { status: options.status });
    }

    if (options?.search) {
      qb.andWhere('(s.name ILIKE :search OR s.code ILIKE :search OR s.email ILIKE :search)', {
        search: `%${options.search}%`,
      });
    }

    const total = await qb.getCount();

    qb.orderBy('s.name', 'ASC');

    if (options?.limit) qb.limit(options.limit);
    if (options?.offset) qb.offset(options.offset);

    const suppliers = await qb.getMany();

    return { suppliers, total };
  }

  async deleteSupplier(supplierId: string, businessId: string): Promise<void> {
    // Check for existing POs
    const hasPOs = await this.purchaseOrderRepository.count({
      where: { supplierId, businessId },
    });

    if (hasPOs > 0) {
      // Soft delete - just mark as inactive
      await this.supplierRepository.update({ id: supplierId, businessId }, { status: SupplierStatus.INACTIVE });
    } else {
      await this.supplierRepository.delete({ id: supplierId, businessId });
    }
  }

  // ============ SUPPLIER PRODUCTS ============

  async linkProductToSupplier(
    supplierId: string,
    productId: string,
    data: {
      supplierSku?: string;
      supplierProductName?: string;
      unitCost: number;
      minOrderQuantity?: number;
      packSize?: number;
      leadTimeDays?: number;
      isPreferred?: boolean;
    }
  ): Promise<SupplierProduct> {
    let link = await this.supplierProductRepository.findOne({
      where: { supplierId, productId },
    });

    if (link) {
      Object.assign(link, data, { priceUpdatedAt: new Date() });
    } else {
      link = this.supplierProductRepository.create({
        supplierId,
        productId,
        ...data,
        priceUpdatedAt: new Date(),
      });
    }

    // If setting as preferred, unset others
    if (data.isPreferred) {
      await this.supplierProductRepository.update(
        { productId, isPreferred: true },
        { isPreferred: false }
      );
    }

    return this.supplierProductRepository.save(link);
  }

  async getProductSuppliers(productId: string): Promise<SupplierProduct[]> {
    return this.supplierProductRepository.find({
      where: { productId, isActive: true },
      relations: ['supplier'],
      order: { isPreferred: 'DESC', unitCost: 'ASC' },
    });
  }

  async getPreferredSupplier(productId: string): Promise<SupplierProduct | null> {
    return this.supplierProductRepository.findOne({
      where: { productId, isPreferred: true, isActive: true },
      relations: ['supplier'],
    });
  }

  // ============ PURCHASE ORDERS ============

  async createPurchaseOrder(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: dto.supplierId, businessId: dto.businessId },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Generate PO number
      const orderNumber = await this.generatePONumber(manager, dto.businessId);

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      const itemsData = dto.items.map((item) => {
        const itemSubtotal = item.quantityOrdered * item.unitCost;
        const itemDiscount = item.discountPercent ? (itemSubtotal * item.discountPercent) / 100 : 0;
        const itemTaxable = itemSubtotal - itemDiscount;
        const itemTax = item.taxRate ? (itemTaxable * item.taxRate) / 100 : 0;
        const lineTotal = itemTaxable + itemTax;

        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalTax += itemTax;

        return {
          ...item,
          discountAmount: itemDiscount,
          taxAmount: itemTax,
          lineTotal,
        };
      });

      const total = subtotal - totalDiscount + totalTax;

      // Calculate payment due date
      let paymentDueDate: Date | null = null;
      if (supplier.paymentDueDays >= 0) {
        paymentDueDate = new Date(dto.orderDate || new Date());
        paymentDueDate.setDate(paymentDueDate.getDate() + supplier.paymentDueDays);
      }

      // Create PO
      const purchaseOrder = manager.create(PurchaseOrder, {
        orderNumber,
        businessId: dto.businessId,
        supplierId: dto.supplierId,
        createdById: dto.createdById,
        status: PurchaseOrderStatus.DRAFT,
        orderDate: dto.orderDate || new Date(),
        expectedDelivery: dto.expectedDelivery,
        shipToLocationId: dto.shipToLocationId,
        shippingMethod: dto.shippingMethod,
        notes: dto.notes,
        subtotal,
        taxAmount: totalTax,
        discountAmount: totalDiscount,
        total,
        currency: supplier.currency,
        paymentDueDate,
        paymentStatus: 'unpaid',
      });

      await manager.save(purchaseOrder);

      // Create items
      for (const itemData of itemsData) {
        const poItem = manager.create(PurchaseOrderItem, {
          purchaseOrderId: purchaseOrder.id,
          productId: itemData.productId,
          quantityOrdered: itemData.quantityOrdered,
          unitCost: itemData.unitCost,
          taxRate: itemData.taxRate || 0,
          taxAmount: itemData.taxAmount,
          discountPercent: itemData.discountPercent || 0,
          discountAmount: itemData.discountAmount,
          lineTotal: itemData.lineTotal,
          supplierSku: itemData.supplierSku,
          notes: itemData.notes,
        });

        await manager.save(poItem);
      }

      // Load and return with items
      return manager.findOne(PurchaseOrder, {
        where: { id: purchaseOrder.id },
        relations: ['items', 'supplier'],
      }) as Promise<PurchaseOrder>;
    });
  }

  async submitPurchaseOrder(purchaseOrderId: string, businessId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, businessId },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error('Only draft purchase orders can be submitted');
    }

    po.status = PurchaseOrderStatus.PENDING_APPROVAL;
    return this.purchaseOrderRepository.save(po);
  }

  async approvePurchaseOrder(purchaseOrderId: string, businessId: string, approvedById: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, businessId },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new Error('Only pending purchase orders can be approved');
    }

    po.status = PurchaseOrderStatus.APPROVED;
    po.approvedById = approvedById;
    po.approvedAt = new Date();

    return this.purchaseOrderRepository.save(po);
  }

  async sendPurchaseOrder(purchaseOrderId: string, businessId: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, businessId },
      relations: ['supplier'],
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.APPROVED) {
      throw new Error('Only approved purchase orders can be sent');
    }

    po.status = PurchaseOrderStatus.SENT;
    po.sentAt = new Date();

    // Update supplier's last order date
    await this.supplierRepository.update({ id: po.supplierId }, { lastOrderAt: new Date() });

    return this.purchaseOrderRepository.save(po);
  }

  async receivePurchaseOrder(dto: ReceivePurchaseOrderDTO): Promise<PurchaseOrderReceiving> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const po = await manager.findOne(PurchaseOrder, {
        where: { id: dto.purchaseOrderId, businessId: dto.businessId },
        relations: ['items'],
      });

      if (!po) {
        throw new Error('Purchase order not found');
      }

      if (![PurchaseOrderStatus.SENT, PurchaseOrderStatus.ACKNOWLEDGED, PurchaseOrderStatus.PARTIAL_RECEIVED].includes(po.status)) {
        throw new Error('Purchase order cannot be received in current status');
      }

      // Generate receiving number
      const receivingNumber = await this.generateReceivingNumber(manager, dto.businessId);

      // Create receiving record
      const receiving = manager.create(PurchaseOrderReceiving, {
        receivingNumber,
        businessId: dto.businessId,
        purchaseOrderId: dto.purchaseOrderId,
        receivedById: dto.receivedById,
        locationId: dto.locationId,
        receivedDate: dto.receivedDate || new Date(),
        deliveryNote: dto.deliveryNote,
        carrier: dto.carrier,
        qualityCheckPassed: dto.qualityCheckPassed ?? true,
        qualityNotes: dto.qualityNotes,
        notes: dto.notes,
      });

      await manager.save(receiving);

      // Process items
      for (const itemDto of dto.items) {
        const poItem = po.items.find((i) => i.id === itemDto.purchaseOrderItemId);
        if (!poItem) continue;

        // Create receiving item
        const receivingItem = manager.create(PurchaseOrderReceivingItem, {
          receivingId: receiving.id,
          purchaseOrderItemId: itemDto.purchaseOrderItemId,
          productId: itemDto.productId,
          quantityReceived: itemDto.quantityReceived,
          quantityRejected: itemDto.quantityRejected || 0,
          rejectionReason: itemDto.rejectionReason,
          batchNumber: itemDto.batchNumber,
          lotNumber: itemDto.lotNumber,
          expirationDate: itemDto.expirationDate,
          binLocation: itemDto.binLocation,
          notes: itemDto.notes,
        });

        await manager.save(receivingItem);

        // Update PO item quantity
        poItem.quantityReceived += itemDto.quantityReceived;
        await manager.save(poItem);

        // Update inventory
        if (dto.locationId && itemDto.quantityReceived > 0) {
          let inventory = await manager.findOne(LocationInventory, {
            where: { locationId: dto.locationId, productId: itemDto.productId },
          });

          if (!inventory) {
            inventory = manager.create(LocationInventory, {
              locationId: dto.locationId,
              productId: itemDto.productId,
              quantity: itemDto.quantityReceived,
              lastRestockedAt: new Date(),
            });
          } else {
            inventory.quantity += itemDto.quantityReceived;
            inventory.lastRestockedAt = new Date();
          }

          if (itemDto.binLocation) {
            inventory.binLocation = itemDto.binLocation;
          }

          await manager.save(inventory);
        }

        // Create batch if batch number provided
        if (itemDto.batchNumber && itemDto.quantityReceived > 0) {
          const batch = manager.create(ProductBatch, {
            businessId: dto.businessId,
            productId: itemDto.productId,
            batchNumber: itemDto.batchNumber,
            lotNumber: itemDto.lotNumber,
            manufactureDate: null,
            expirationDate: itemDto.expirationDate,
            receivedDate: dto.receivedDate || new Date(),
            initialQuantity: itemDto.quantityReceived,
            currentQuantity: itemDto.quantityReceived,
            unitCost: poItem.unitCost,
            supplierId: po.supplierId,
            purchaseOrderId: po.id,
            locationId: dto.locationId,
            storageLocation: itemDto.binLocation,
            status: BatchStatus.AVAILABLE,
          });

          await manager.save(batch);
        }
      }

      // Check if PO is fully received
      const allReceived = po.items.every((item) => item.quantityReceived >= item.quantityOrdered - item.quantityCancelled);

      if (allReceived) {
        po.status = PurchaseOrderStatus.RECEIVED;
        po.receivedAt = new Date();
      } else {
        po.status = PurchaseOrderStatus.PARTIAL_RECEIVED;
      }

      await manager.save(po);

      return receiving;
    });
  }

  async cancelPurchaseOrder(purchaseOrderId: string, businessId: string, reason?: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, businessId },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if ([PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.CANCELLED].includes(po.status)) {
      throw new Error('Purchase order cannot be cancelled');
    }

    po.status = PurchaseOrderStatus.CANCELLED;
    if (reason) {
      po.internalNotes = po.internalNotes ? `${po.internalNotes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    }

    return this.purchaseOrderRepository.save(po);
  }

  async getPurchaseOrder(purchaseOrderId: string, businessId: string): Promise<PurchaseOrder | null> {
    return this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId, businessId },
      relations: ['items', 'supplier', 'createdBy', 'approvedBy', 'receivings'],
    });
  }

  async getPurchaseOrders(
    businessId: string,
    options?: {
      status?: PurchaseOrderStatus;
      supplierId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: PurchaseOrder[]; total: number }> {
    const qb = this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .where('po.businessId = :businessId', { businessId });

    if (options?.status) {
      qb.andWhere('po.status = :status', { status: options.status });
    }

    if (options?.supplierId) {
      qb.andWhere('po.supplierId = :supplierId', { supplierId: options.supplierId });
    }

    if (options?.startDate) {
      qb.andWhere('po.orderDate >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      qb.andWhere('po.orderDate <= :endDate', { endDate: options.endDate });
    }

    const total = await qb.getCount();

    qb.orderBy('po.createdAt', 'DESC');

    if (options?.limit) qb.limit(options.limit);
    if (options?.offset) qb.offset(options.offset);

    const orders = await qb.getMany();

    return { orders, total };
  }

  // ============ PAYMENTS ============

  async recordPayment(
    businessId: string,
    supplierId: string,
    data: {
      amount: number;
      method: SupplierPaymentMethod;
      paymentDate: Date;
      purchaseOrderId?: string;
      referenceNumber?: string;
      notes?: string;
      processedById: string;
    }
  ): Promise<SupplierPayment> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: supplierId, businessId },
      });

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber(manager, businessId);

      const payment = manager.create(SupplierPayment, {
        paymentNumber,
        businessId,
        supplierId,
        purchaseOrderId: data.purchaseOrderId,
        method: data.method,
        status: SupplierPaymentStatus.COMPLETED,
        amount: data.amount,
        currency: supplier.currency,
        paymentDate: data.paymentDate,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        processedById: data.processedById,
      });

      await manager.save(payment);

      // Update supplier balance
      supplier.currentBalance = Number(supplier.currentBalance) - data.amount;
      await manager.save(supplier);

      // Update PO payment status if linked
      if (data.purchaseOrderId) {
        const po = await manager.findOne(PurchaseOrder, {
          where: { id: data.purchaseOrderId },
        });

        if (po) {
          po.amountPaid = Number(po.amountPaid) + data.amount;

          if (po.amountPaid >= Number(po.total)) {
            po.paymentStatus = 'paid';
            if (po.status === PurchaseOrderStatus.RECEIVED) {
              po.status = PurchaseOrderStatus.COMPLETED;
              po.completedAt = new Date();
            }
          } else if (po.amountPaid > 0) {
            po.paymentStatus = 'partial';
          }

          await manager.save(po);
        }
      }

      return payment;
    });
  }

  async getSupplierPayments(
    businessId: string,
    supplierId?: string,
    options?: { startDate?: Date; endDate?: Date; limit?: number; offset?: number }
  ): Promise<{ payments: SupplierPayment[]; total: number }> {
    const qb = this.paymentRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.supplier', 'supplier')
      .leftJoinAndSelect('p.purchaseOrder', 'po')
      .where('p.businessId = :businessId', { businessId });

    if (supplierId) {
      qb.andWhere('p.supplierId = :supplierId', { supplierId });
    }

    if (options?.startDate) {
      qb.andWhere('p.paymentDate >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      qb.andWhere('p.paymentDate <= :endDate', { endDate: options.endDate });
    }

    const total = await qb.getCount();

    qb.orderBy('p.paymentDate', 'DESC');

    if (options?.limit) qb.limit(options.limit);
    if (options?.offset) qb.offset(options.offset);

    const payments = await qb.getMany();

    return { payments, total };
  }

  // ============ ANALYTICS ============

  async getSupplierStatistics(businessId: string, supplierId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    outstandingBalance: number;
    onTimeDeliveryRate: number;
    lastOrderDate: Date | null;
    topProducts: Array<{ productId: string; totalOrdered: number; totalCost: number }>;
  }> {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId, businessId },
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const ordersStats = await this.purchaseOrderRepository
      .createQueryBuilder('po')
      .select([
        'COUNT(po.id) as totalOrders',
        'COALESCE(SUM(po.total), 0) as totalSpent',
        'AVG(po.total) as avgOrderValue',
      ])
      .where('po.supplierId = :supplierId', { supplierId })
      .andWhere('po.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED],
      })
      .getRawOne();

    // Calculate on-time delivery rate (simplified)
    const deliveredOrders = await this.purchaseOrderRepository.count({
      where: {
        supplierId,
        status: In([PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.COMPLETED]),
      },
    });

    // Get top products ordered from this supplier
    const topProducts = await this.purchaseOrderItemRepository
      .createQueryBuilder('poi')
      .select([
        'poi.productId as productId',
        'SUM(poi.quantityOrdered) as totalOrdered',
        'SUM(poi.lineTotal) as totalCost',
      ])
      .innerJoin('poi.purchaseOrder', 'po')
      .where('po.supplierId = :supplierId', { supplierId })
      .groupBy('poi.productId')
      .orderBy('totalOrdered', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalOrders: parseInt(ordersStats?.totalOrders || '0'),
      totalSpent: parseFloat(ordersStats?.totalSpent || '0'),
      averageOrderValue: parseFloat(ordersStats?.avgOrderValue || '0'),
      outstandingBalance: Number(supplier.currentBalance),
      onTimeDeliveryRate: deliveredOrders > 0 ? 100 : 0, // Simplified
      lastOrderDate: supplier.lastOrderAt,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        totalOrdered: parseInt(p.totalOrdered),
        totalCost: parseFloat(p.totalCost),
      })),
    };
  }

  async getOverduePurchaseOrders(businessId: string): Promise<PurchaseOrder[]> {
    const today = new Date();

    return this.purchaseOrderRepository.find({
      where: {
        businessId,
        paymentStatus: In(['unpaid', 'partial']),
        paymentDueDate: LessThan(today),
        status: In([PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.COMPLETED]),
      },
      relations: ['supplier'],
      order: { paymentDueDate: 'ASC' },
    });
  }

  async getReorderSuggestions(
    businessId: string,
    locationId?: string
  ): Promise<Array<{
    productId: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQuantity: number;
    preferredSupplier: Supplier | null;
    lastCost: number | null;
  }>> {
    // Get products at or below reorder point
    const qb = AppDataSource.getRepository(LocationInventory)
      .createQueryBuilder('inv')
      .where('inv.quantity <= inv.reorderPoint')
      .andWhere('inv.reorderPoint IS NOT NULL');

    if (locationId) {
      qb.andWhere('inv.locationId = :locationId', { locationId });
    }

    const lowStockItems = await qb.getMany();

    const suggestions = [];

    for (const item of lowStockItems) {
      // Get preferred supplier
      const supplierProduct = await this.getPreferredSupplier(item.productId);

      suggestions.push({
        productId: item.productId,
        currentStock: item.quantity,
        reorderPoint: item.reorderPoint!,
        suggestedQuantity: item.reorderQuantity || (item.reorderPoint! * 2),
        preferredSupplier: supplierProduct?.supplier || null,
        lastCost: supplierProduct?.unitCost || null,
      });
    }

    return suggestions;
  }

  // ============ HELPERS ============

  private async generatePONumber(manager: EntityManager, businessId: string): Promise<string> {
    const date = new Date();
    const prefix = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const last = await manager
      .getRepository(PurchaseOrder)
      .createQueryBuilder('po')
      .where('po.businessId = :businessId', { businessId })
      .andWhere('po.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.orderNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (last) {
      const lastSeq = parseInt(last.orderNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateReceivingNumber(manager: EntityManager, businessId: string): Promise<string> {
    const date = new Date();
    const prefix = `RCV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const last = await manager
      .getRepository(PurchaseOrderReceiving)
      .createQueryBuilder('r')
      .where('r.businessId = :businessId', { businessId })
      .andWhere('r.receivingNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.receivingNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (last) {
      const lastSeq = parseInt(last.receivingNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  private async generatePaymentNumber(manager: EntityManager, businessId: string): Promise<string> {
    const date = new Date();
    const prefix = `PAY-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const last = await manager
      .getRepository(SupplierPayment)
      .createQueryBuilder('p')
      .where('p.businessId = :businessId', { businessId })
      .andWhere('p.paymentNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('p.paymentNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (last) {
      const lastSeq = parseInt(last.paymentNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
}

export const supplierService = new SupplierService();
