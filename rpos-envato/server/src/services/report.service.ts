import { Repository, Between, In, LessThan, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order, OrderStatus } from '../entities/Order.entity';
import { OrderItem } from '../entities/OrderItem.entity';
import { Product } from '../entities/Product.entity';
import { Category } from '../entities/Category.entity';
import { Customer } from '../entities/Customer.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/Payment.entity';
import { Refund } from '../entities/Refund.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/Supplier.entity';
import { LocationInventory } from '../entities/Location.entity';

// Report Types
export type ReportFormat = 'json' | 'csv' | 'excel' | 'pdf';
export type ReportPeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface ReportFilters {
  businessId: string;
  period?: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
  locationId?: string;
  categoryId?: string;
  customerId?: string;
  userId?: string;
}

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalTax: number;
    totalDiscount: number;
    netSales: number;
    totalRefunds: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  };
  salesByDate: Array<{ date: string; sales: number; orders: number; profit: number }>;
  salesByHour: Array<{ hour: number; sales: number; orders: number }>;
  salesByCategory: Array<{ categoryId: string; categoryName: string; sales: number; quantity: number; profit: number }>;
  salesByPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  topProducts: Array<{ productId: string; productName: string; quantity: number; sales: number; profit: number }>;
  topCustomers: Array<{ customerId: string; customerName: string; orders: number; totalSpent: number }>;
}

export interface InventoryReportData {
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
  };
  byCategory: Array<{ categoryId: string; categoryName: string; productCount: number; totalQuantity: number; totalValue: number }>;
  lowStockItems: Array<{ productId: string; productName: string; sku: string; quantity: number; minStock: number; reorderPoint: number }>;
  expiringItems: Array<{ productId: string; productName: string; batchNumber: string; quantity: number; expirationDate: Date; daysUntilExpiry: number }>;
  inventoryMovement: Array<{ productId: string; productName: string; sold: number; received: number; adjusted: number; transferred: number }>;
}

export interface CustomerReportData {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageCustomerValue: number;
    repeatPurchaseRate: number;
  };
  bySegment: Array<{ segment: string; count: number; totalSpent: number; avgOrderValue: number }>;
  topCustomers: Array<{ customerId: string; name: string; email: string; orders: number; totalSpent: number; lastOrderDate: Date }>;
  acquisitionTrend: Array<{ date: string; newCustomers: number }>;
}

/**
 * PDF Generator - Creates valid PDF files following PDF 1.4 specification
 * Implements a simple but complete PDF structure with text and table support
 */
class PDFGenerator {
  private objects: string[] = [];
  private content: string[] = [];
  private yPosition: number = 800; // Start from top (792 is letter height)
  private pageWidth: number = 612; // Letter width in points
  private pageHeight: number = 792; // Letter height in points
  private margin: number = 50;
  private currentPage: number = 1;
  private pages: Array<{ content: string[] }> = [{ content: [] }];

  /**
   * Add text to the PDF
   */
  addText(text: string, fontSize: number, bold: boolean): void {
    this.checkNewPage(fontSize + 5);

    const escapedText = this.escapeText(text);
    const fontName = bold ? '/F2' : '/F1';

    this.pages[this.currentPage - 1].content.push(
      'BT',
      `${fontName} ${fontSize} Tf`,
      `${this.margin} ${this.yPosition} Td`,
      `(${escapedText}) Tj`,
      'ET'
    );

    this.yPosition -= (fontSize + 5);
  }

  /**
   * Add vertical space
   */
  addVerticalSpace(points: number): void {
    this.yPosition -= points;
    this.checkNewPage(20);
  }

  /**
   * Add a table row
   */
  addTableRow(cells: string[], isHeader: boolean): void {
    this.checkNewPage(20);

    const cellWidth = (this.pageWidth - 2 * this.margin) / cells.length;
    const fontSize = isHeader ? 10 : 9;
    const fontName = isHeader ? '/F2' : '/F1';

    // Draw row background for headers
    if (isHeader) {
      this.pages[this.currentPage - 1].content.push(
        'q',
        '0.29 0.56 0.85 rg', // Blue background
        `${this.margin} ${this.yPosition - 4} ${this.pageWidth - 2 * this.margin} 16 re`,
        'f',
        'Q'
      );
    }

    // Draw cell text
    for (let i = 0; i < cells.length; i++) {
      const x = this.margin + (i * cellWidth) + 5;
      const escapedText = this.escapeText(cells[i].substring(0, 25)); // Truncate long text

      this.pages[this.currentPage - 1].content.push(
        'BT',
        isHeader ? '1 1 1 rg' : '0 0 0 rg', // White text for header, black for data
        `${fontName} ${fontSize} Tf`,
        `${x} ${this.yPosition} Td`,
        `(${escapedText}) Tj`,
        'ET'
      );
    }

    // Draw cell borders
    this.pages[this.currentPage - 1].content.push(
      'q',
      '0.8 0.8 0.8 RG', // Light gray border
      '0.5 w',
      `${this.margin} ${this.yPosition - 4} ${this.pageWidth - 2 * this.margin} 16 re`,
      'S',
      'Q'
    );

    this.yPosition -= 18;
  }

  /**
   * Check if we need a new page
   */
  private checkNewPage(requiredSpace: number): void {
    if (this.yPosition < this.margin + requiredSpace) {
      this.currentPage++;
      this.pages.push({ content: [] });
      this.yPosition = this.pageHeight - this.margin;
    }
  }

  /**
   * Escape special PDF characters
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ''); // Remove non-ASCII chars for safety
  }

  /**
   * Generate the PDF buffer
   */
  generate(): Buffer {
    const objects: string[] = [];
    let objectNumber = 1;

    // Object 1: Catalog
    objects.push(
      `${objectNumber} 0 obj`,
      '<< /Type /Catalog /Pages 2 0 R >>',
      'endobj'
    );
    objectNumber++;

    // Object 2: Pages (parent)
    const pageRefs = this.pages.map((_, i) => `${i + 4} 0 R`).join(' ');
    objects.push(
      `${objectNumber} 0 obj`,
      `<< /Type /Pages /Kids [${pageRefs}] /Count ${this.pages.length} >>`,
      'endobj'
    );
    objectNumber++;

    // Object 3: Font resources
    objects.push(
      `${objectNumber} 0 obj`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      'endobj'
    );
    const font1Ref = objectNumber;
    objectNumber++;

    objects.push(
      `${objectNumber} 0 obj`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      'endobj'
    );
    const font2Ref = objectNumber;
    objectNumber++;

    // Generate page objects
    const contentRefs: number[] = [];
    for (let i = 0; i < this.pages.length; i++) {
      const contentRef = objectNumber + this.pages.length + i;
      contentRefs.push(contentRef);

      objects.push(
        `${objectNumber} 0 obj`,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] ` +
        `/Contents ${contentRef} 0 R /Resources << /Font << /F1 ${font1Ref} 0 R /F2 ${font2Ref} 0 R >> >> >>`,
        'endobj'
      );
      objectNumber++;
    }

    // Generate content streams for each page
    for (let i = 0; i < this.pages.length; i++) {
      const contentStream = this.pages[i].content.join('\n');
      const streamLength = contentStream.length;

      objects.push(
        `${objectNumber} 0 obj`,
        `<< /Length ${streamLength} >>`,
        'stream',
        contentStream,
        'endstream',
        'endobj'
      );
      objectNumber++;
    }

    // Build the PDF file
    const header = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
    const body = objects.join('\n') + '\n';

    // Calculate xref offsets
    const xrefOffset = header.length + body.length;
    const xrefEntries = ['0000000000 65535 f '];

    let offset = header.length;
    for (let i = 0; i < objects.length; i += 3) { // Each object is 3 lines: number, content, endobj
      const entry = offset.toString().padStart(10, '0') + ' 00000 n ';
      xrefEntries.push(entry);
      offset += objects.slice(i, i + 3).join('\n').length + 1; // +1 for newline
    }

    const xref = [
      'xref',
      `0 ${xrefEntries.length}`,
      ...xrefEntries
    ].join('\n');

    const trailer = [
      'trailer',
      `<< /Size ${xrefEntries.length} /Root 1 0 R >>`,
      'startxref',
      xrefOffset.toString(),
      '%%EOF'
    ].join('\n');

    const pdfContent = header + body + xref + '\n' + trailer;
    return Buffer.from(pdfContent, 'binary');
  }
}

class ReportService {
  private orderRepository: Repository<Order>;
  private orderItemRepository: Repository<OrderItem>;
  private productRepository: Repository<Product>;
  private categoryRepository: Repository<Category>;
  private customerRepository: Repository<Customer>;
  private paymentRepository: Repository<Payment>;
  private refundRepository: Repository<Refund>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.orderItemRepository = AppDataSource.getRepository(OrderItem);
    this.productRepository = AppDataSource.getRepository(Product);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.refundRepository = AppDataSource.getRepository(Refund);
  }

  // ============ DATE HELPERS ============

  private getDateRange(period: ReportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;

      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;

      case 'this_week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        break;

      case 'last_week':
        const lastWeekDayOfWeek = now.getDay();
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDayOfWeek - 1, 23, 59, 59, 999);
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6, 0, 0, 0, 0);
        break;

      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;

      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;

      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;

      case 'custom':
        if (!customStart || !customEnd) {
          throw new Error('Custom period requires start and end dates');
        }
        start = customStart;
        end = customEnd;
        break;

      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    return { start, end };
  }

  // ============ SALES REPORT ============

  async generateSalesReport(filters: ReportFilters): Promise<SalesReportData> {
    const { start, end } = this.getDateRange(
      filters.period || 'this_month',
      filters.startDate,
      filters.endDate
    );

    const completedStatuses = [OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.PICKED_UP];

    // Base query builder for orders
    const ordersQb = this.orderRepository
      .createQueryBuilder('o')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end });

    if (filters.locationId) {
      ordersQb.andWhere('o.locationId = :locationId', { locationId: filters.locationId });
    }

    // Summary calculations
    const summaryRaw = await ordersQb
      .clone()
      .select([
        'COUNT(o.id) as totalOrders',
        'COALESCE(SUM(o.total), 0) as totalSales',
        'COALESCE(AVG(o.total), 0) as avgOrderValue',
        'COALESCE(SUM(o.taxAmount), 0) as totalTax',
        'COALESCE(SUM(o.discountAmount), 0) as totalDiscount',
      ])
      .getRawOne();

    // Get refunds
    const refundsRaw = await this.refundRepository
      .createQueryBuilder('r')
      .innerJoin('r.order', 'o')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('r.status = :status', { status: 'completed' })
      .andWhere('r.createdAt BETWEEN :start AND :end', { start, end })
      .select('COALESCE(SUM(r.amount), 0) as totalRefunds')
      .getRawOne();

    // Calculate cost and profit from order items
    const profitRaw = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'COALESCE(SUM(oi.quantity * oi.costPrice), 0) as totalCost',
      ])
      .getRawOne();

    const totalSales = parseFloat(summaryRaw?.totalSales || '0');
    const totalCost = parseFloat(profitRaw?.totalCost || '0');
    const totalRefunds = parseFloat(refundsRaw?.totalRefunds || '0');
    const netSales = totalSales - totalRefunds;
    const grossProfit = netSales - totalCost;

    // Sales by date
    const salesByDateRaw = await ordersQb
      .clone()
      .select([
        "DATE(o.createdAt) as date",
        'COUNT(o.id) as orders',
        'COALESCE(SUM(o.total), 0) as sales',
      ])
      .groupBy('DATE(o.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Sales by hour
    const salesByHourRaw = await ordersQb
      .clone()
      .select([
        "EXTRACT(HOUR FROM o.createdAt) as hour",
        'COUNT(o.id) as orders',
        'COALESCE(SUM(o.total), 0) as sales',
      ])
      .groupBy("EXTRACT(HOUR FROM o.createdAt)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Sales by category
    const salesByCategoryRaw = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .leftJoin('p.category', 'c')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'p.categoryId as categoryId',
        'c.name as categoryName',
        'SUM(oi.quantity) as quantity',
        'SUM(oi.total) as sales',
        'SUM(oi.total) - SUM(oi.quantity * oi.costPrice) as profit',
      ])
      .groupBy('p.categoryId')
      .addGroupBy('c.name')
      .orderBy('sales', 'DESC')
      .getRawMany();

    // Sales by payment method
    const salesByPaymentRaw = await this.paymentRepository
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('p.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'p.method as method',
        'COUNT(p.id) as count',
        'SUM(p.amountApplied) as amount',
      ])
      .groupBy('p.method')
      .orderBy('amount', 'DESC')
      .getRawMany();

    // Top products
    const topProductsRaw = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.status IN (:...statuses)', { statuses: completedStatuses })
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'oi.productId as productId',
        'p.name as productName',
        'SUM(oi.quantity) as quantity',
        'SUM(oi.total) as sales',
        'SUM(oi.total) - SUM(oi.quantity * oi.costPrice) as profit',
      ])
      .groupBy('oi.productId')
      .addGroupBy('p.name')
      .orderBy('quantity', 'DESC')
      .limit(20)
      .getRawMany();

    // Top customers
    const topCustomersRaw = await ordersQb
      .clone()
      .andWhere('o.customerId IS NOT NULL')
      .innerJoin('o.customer', 'c')
      .select([
        'o.customerId as customerId',
        "CONCAT(c.firstName, ' ', c.lastName) as customerName",
        'COUNT(o.id) as orders',
        'SUM(o.total) as totalSpent',
      ])
      .groupBy('o.customerId')
      .addGroupBy('c.firstName')
      .addGroupBy('c.lastName')
      .orderBy('totalSpent', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      summary: {
        totalSales,
        totalOrders: parseInt(summaryRaw?.totalOrders || '0'),
        averageOrderValue: parseFloat(summaryRaw?.avgOrderValue || '0'),
        totalTax: parseFloat(summaryRaw?.totalTax || '0'),
        totalDiscount: parseFloat(summaryRaw?.totalDiscount || '0'),
        netSales,
        totalRefunds,
        totalCost,
        grossProfit,
        profitMargin: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
      },
      salesByDate: salesByDateRaw.map((r) => ({
        date: r.date,
        sales: parseFloat(r.sales),
        orders: parseInt(r.orders),
        profit: 0, // Would need additional calculation
      })),
      salesByHour: salesByHourRaw.map((r) => ({
        hour: parseInt(r.hour),
        sales: parseFloat(r.sales),
        orders: parseInt(r.orders),
      })),
      salesByCategory: salesByCategoryRaw.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName || 'Uncategorized',
        sales: parseFloat(r.sales),
        quantity: parseInt(r.quantity),
        profit: parseFloat(r.profit || '0'),
      })),
      salesByPaymentMethod: salesByPaymentRaw.map((r) => ({
        method: r.method,
        amount: parseFloat(r.amount),
        count: parseInt(r.count),
      })),
      topProducts: topProductsRaw.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        quantity: parseInt(r.quantity),
        sales: parseFloat(r.sales),
        profit: parseFloat(r.profit || '0'),
      })),
      topCustomers: topCustomersRaw.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName,
        orders: parseInt(r.orders),
        totalSpent: parseFloat(r.totalSpent),
      })),
    };
  }

  // ============ INVENTORY REPORT ============

  async generateInventoryReport(filters: ReportFilters): Promise<InventoryReportData> {
    // Get all products
    const productsQb = this.productRepository
      .createQueryBuilder('p')
      .where('p.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('p.enabled = true');

    if (filters.categoryId) {
      productsQb.andWhere('p.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    const products = await productsQb.getMany();

    // Get inventory if multi-location
    const inventoryQb = AppDataSource.getRepository(LocationInventory)
      .createQueryBuilder('inv')
      .innerJoin('inv.location', 'loc')
      .where('loc.businessId = :businessId', { businessId: filters.businessId });

    if (filters.locationId) {
      inventoryQb.andWhere('inv.locationId = :locationId', { locationId: filters.locationId });
    }

    const inventoryStats = await inventoryQb
      .select([
        'SUM(inv.quantity) as totalQuantity',
        'COUNT(CASE WHEN inv.quantity <= inv.minStock AND inv.quantity > 0 THEN 1 END) as lowStockCount',
        'COUNT(CASE WHEN inv.quantity <= 0 THEN 1 END) as outOfStockCount',
      ])
      .getRawOne();

    // Calculate inventory value
    const valueRaw = await inventoryQb
      .clone()
      .innerJoin(Product, 'p', 'p.id = inv.productId')
      .select('SUM(inv.quantity * p.costPrice) as totalValue')
      .getRawOne();

    // By category
    const byCategoryRaw = await inventoryQb
      .clone()
      .innerJoin(Product, 'p', 'p.id = inv.productId')
      .leftJoin(Category, 'c', 'c.id = p.categoryId')
      .select([
        'p.categoryId as categoryId',
        'c.name as categoryName',
        'COUNT(DISTINCT inv.productId) as productCount',
        'SUM(inv.quantity) as totalQuantity',
        'SUM(inv.quantity * p.costPrice) as totalValue',
      ])
      .groupBy('p.categoryId')
      .addGroupBy('c.name')
      .getRawMany();

    // Low stock items
    const lowStockRaw = await inventoryQb
      .clone()
      .innerJoin(Product, 'p', 'p.id = inv.productId')
      .where('inv.quantity <= inv.minStock')
      .andWhere('inv.quantity > 0')
      .select([
        'inv.productId as productId',
        'p.name as productName',
        'p.sku as sku',
        'inv.quantity as quantity',
        'inv.minStock as minStock',
        'inv.reorderPoint as reorderPoint',
      ])
      .orderBy('inv.quantity', 'ASC')
      .limit(50)
      .getRawMany();

    return {
      summary: {
        totalProducts: products.length,
        totalValue: parseFloat(valueRaw?.totalValue || '0'),
        lowStockCount: parseInt(inventoryStats?.lowStockCount || '0'),
        outOfStockCount: parseInt(inventoryStats?.outOfStockCount || '0'),
        expiringSoonCount: 0, // Would need batch data
      },
      byCategory: byCategoryRaw.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName || 'Uncategorized',
        productCount: parseInt(r.productCount),
        totalQuantity: parseInt(r.totalQuantity),
        totalValue: parseFloat(r.totalValue || '0'),
      })),
      lowStockItems: lowStockRaw.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        quantity: parseInt(r.quantity),
        minStock: parseInt(r.minStock),
        reorderPoint: parseInt(r.reorderPoint || '0'),
      })),
      expiringItems: [], // Would need batch data
      inventoryMovement: [], // Would need historical data
    };
  }

  // ============ CUSTOMER REPORT ============

  async generateCustomerReport(filters: ReportFilters): Promise<CustomerReportData> {
    const { start, end } = this.getDateRange(
      filters.period || 'this_month',
      filters.startDate,
      filters.endDate
    );

    // Total customers
    const totalCustomers = await this.customerRepository.count({
      where: { businessId: filters.businessId },
    });

    // New customers in period
    const newCustomers = await this.customerRepository.count({
      where: {
        businessId: filters.businessId,
        createdAt: Between(start, end),
      },
    });

    // Customers with orders (returning)
    const returningCustomersRaw = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.customerId IS NOT NULL')
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
      .select('COUNT(DISTINCT o.customerId) as count')
      .getRawOne();

    // Average customer value
    const avgValueRaw = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.customerId IS NOT NULL')
      .andWhere('o.status IN (:...statuses)', { statuses: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] })
      .select([
        'o.customerId as customerId',
        'SUM(o.total) as totalSpent',
      ])
      .groupBy('o.customerId')
      .getRawMany();

    const avgCustomerValue = avgValueRaw.length > 0
      ? avgValueRaw.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0) / avgValueRaw.length
      : 0;

    // Top customers
    const topCustomersRaw = await this.orderRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .where('o.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('o.customerId IS NOT NULL')
      .andWhere('o.status IN (:...statuses)', { statuses: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] })
      .select([
        'o.customerId as customerId',
        "CONCAT(c.firstName, ' ', c.lastName) as name",
        'c.email as email',
        'COUNT(o.id) as orders',
        'SUM(o.total) as totalSpent',
        'MAX(o.createdAt) as lastOrderDate',
      ])
      .groupBy('o.customerId')
      .addGroupBy('c.firstName')
      .addGroupBy('c.lastName')
      .addGroupBy('c.email')
      .orderBy('totalSpent', 'DESC')
      .limit(50)
      .getRawMany();

    // Acquisition trend (new customers per day)
    const acquisitionRaw = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.businessId = :businessId', { businessId: filters.businessId })
      .andWhere('c.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'DATE(c.createdAt) as date',
        'COUNT(c.id) as newCustomers',
      ])
      .groupBy('DATE(c.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      summary: {
        totalCustomers,
        newCustomers,
        returningCustomers: parseInt(returningCustomersRaw?.count || '0'),
        averageCustomerValue: avgCustomerValue,
        repeatPurchaseRate: totalCustomers > 0
          ? (parseInt(returningCustomersRaw?.count || '0') / totalCustomers) * 100
          : 0,
      },
      bySegment: [], // Would need customer segmentation logic
      topCustomers: topCustomersRaw.map((r) => ({
        customerId: r.customerId,
        name: r.name,
        email: r.email,
        orders: parseInt(r.orders),
        totalSpent: parseFloat(r.totalSpent),
        lastOrderDate: r.lastOrderDate,
      })),
      acquisitionTrend: acquisitionRaw.map((r) => ({
        date: r.date,
        newCustomers: parseInt(r.newCustomers),
      })),
    };
  }

  // ============ EXPORT FUNCTIONS ============

  async exportToCSV(data: any[], columns: Array<{ key: string; header: string }>): Promise<string> {
    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      columns.map((c) => {
        const value = row[c.key];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  async exportToExcel(data: any, sheetName: string): Promise<Buffer> {
    // Generate proper XLSX format (Office Open XML SpreadsheetML)
    // XLSX is a ZIP file containing XML files

    const worksheetXml = this.generateWorksheetXml(data);
    const workbookXml = this.generateWorkbookXml(sheetName);
    const contentTypesXml = this.generateContentTypesXml();
    const relsXml = this.generateRelsXml();
    const workbookRelsXml = this.generateWorkbookRelsXml();
    const stylesXml = this.generateStylesXml();

    // Create a simple ZIP structure manually
    // In production, you'd use a library like archiver or jszip
    const zipBuffer = await this.createXlsxZip({
      '[Content_Types].xml': contentTypesXml,
      '_rels/.rels': relsXml,
      'xl/_rels/workbook.xml.rels': workbookRelsXml,
      'xl/workbook.xml': workbookXml,
      'xl/worksheets/sheet1.xml': worksheetXml,
      'xl/styles.xml': stylesXml,
    });

    return zipBuffer;
  }

  private generateWorksheetXml(data: any): string {
    const rows: string[] = [];
    let rowIndex = 1;

    // Helper to escape XML
    const escapeXml = (str: string): string => {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    // Helper to convert column index to Excel column letter
    const colLetter = (index: number): string => {
      let result = '';
      while (index >= 0) {
        result = String.fromCharCode((index % 26) + 65) + result;
        index = Math.floor(index / 26) - 1;
      }
      return result;
    };

    // Generate summary section
    if (data.summary) {
      rows.push(`<row r="${rowIndex}"><c r="A${rowIndex}" t="inlineStr"><is><t>Summary</t></is></c></row>`);
      rowIndex++;

      const summaryEntries = Object.entries(data.summary);
      for (const [key, value] of summaryEntries) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const formattedValue = typeof value === 'number'
          ? (key.includes('Margin') || key.includes('Rate') ? value.toFixed(2) + '%' : value.toLocaleString())
          : String(value);

        rows.push(`<row r="${rowIndex}">
          <c r="A${rowIndex}" t="inlineStr"><is><t>${escapeXml(formattedKey)}</t></is></c>
          <c r="B${rowIndex}" t="inlineStr"><is><t>${escapeXml(formattedValue)}</t></is></c>
        </row>`);
        rowIndex++;
      }
      rowIndex++; // Empty row after summary
    }

    // Generate tables for each data section
    const sections = [
      { key: 'salesByDate', title: 'Sales by Date' },
      { key: 'salesByCategory', title: 'Sales by Category' },
      { key: 'salesByPaymentMethod', title: 'Payment Methods' },
      { key: 'topProducts', title: 'Top Products' },
      { key: 'topCustomers', title: 'Top Customers' },
      { key: 'byCategory', title: 'Inventory by Category' },
      { key: 'lowStockItems', title: 'Low Stock Items' },
      { key: 'acquisitionTrend', title: 'Customer Acquisition' },
    ];

    for (const section of sections) {
      const sectionData = data[section.key];
      if (!sectionData || !Array.isArray(sectionData) || sectionData.length === 0) continue;

      // Section title
      rows.push(`<row r="${rowIndex}"><c r="A${rowIndex}" t="inlineStr" s="1"><is><t>${escapeXml(section.title)}</t></is></c></row>`);
      rowIndex++;

      // Headers
      const headers = Object.keys(sectionData[0]);
      const headerCells = headers.map((header, i) => {
        const formattedHeader = header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `<c r="${colLetter(i)}${rowIndex}" t="inlineStr" s="2"><is><t>${escapeXml(formattedHeader)}</t></is></c>`;
      }).join('');
      rows.push(`<row r="${rowIndex}">${headerCells}</row>`);
      rowIndex++;

      // Data rows
      for (const item of sectionData) {
        const cells = headers.map((header, i) => {
          const value = item[header];
          if (typeof value === 'number') {
            return `<c r="${colLetter(i)}${rowIndex}"><v>${value}</v></c>`;
          } else if (value instanceof Date) {
            return `<c r="${colLetter(i)}${rowIndex}" t="inlineStr"><is><t>${escapeXml(value.toLocaleDateString())}</t></is></c>`;
          } else {
            return `<c r="${colLetter(i)}${rowIndex}" t="inlineStr"><is><t>${escapeXml(String(value ?? ''))}</t></is></c>`;
          }
        }).join('');
        rows.push(`<row r="${rowIndex}">${cells}</row>`);
        rowIndex++;
      }
      rowIndex++; // Empty row between sections
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows.join('\n')}</sheetData>
</worksheet>`;
  }

  private generateWorkbookXml(sheetName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${sheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  }

  private generateContentTypesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  }

  private generateRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private generateWorkbookRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private generateStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4A90D9"/></patternFill></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="3">
    <xf/>
    <xf fontId="1" fillId="0" borderId="0"/>
    <xf fontId="2" fillId="2" borderId="0"/>
  </cellXfs>
</styleSheet>`;
  }

  private async createXlsxZip(files: Record<string, string>): Promise<Buffer> {
    // Simple ZIP implementation for XLSX
    // ZIP file format: local file headers + file data + central directory + end of central directory

    const entries: Array<{ name: string; data: Buffer; offset: number }> = [];
    const parts: Buffer[] = [];
    let offset = 0;

    // Create local file headers and data
    for (const [name, content] of Object.entries(files)) {
      const nameBuffer = Buffer.from(name, 'utf8');
      const dataBuffer = Buffer.from(content, 'utf8');

      // Local file header
      const localHeader = Buffer.alloc(30 + nameBuffer.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4); // Version needed to extract
      localHeader.writeUInt16LE(0, 6); // General purpose bit flag
      localHeader.writeUInt16LE(0, 8); // Compression method (0 = stored)
      localHeader.writeUInt16LE(0, 10); // File last modification time
      localHeader.writeUInt16LE(0, 12); // File last modification date
      localHeader.writeUInt32LE(this.crc32(dataBuffer), 14); // CRC-32
      localHeader.writeUInt32LE(dataBuffer.length, 18); // Compressed size
      localHeader.writeUInt32LE(dataBuffer.length, 22); // Uncompressed size
      localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
      localHeader.writeUInt16LE(0, 28); // Extra field length
      nameBuffer.copy(localHeader, 30);

      entries.push({ name, data: dataBuffer, offset });
      parts.push(localHeader);
      parts.push(dataBuffer);
      offset += localHeader.length + dataBuffer.length;
    }

    const centralDirOffset = offset;

    // Create central directory
    for (const entry of entries) {
      const nameBuffer = Buffer.from(entry.name, 'utf8');
      const centralHeader = Buffer.alloc(46 + nameBuffer.length);

      centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
      centralHeader.writeUInt16LE(20, 4); // Version made by
      centralHeader.writeUInt16LE(20, 6); // Version needed to extract
      centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
      centralHeader.writeUInt16LE(0, 10); // Compression method
      centralHeader.writeUInt16LE(0, 12); // File last modification time
      centralHeader.writeUInt16LE(0, 14); // File last modification date
      centralHeader.writeUInt32LE(this.crc32(entry.data), 16); // CRC-32
      centralHeader.writeUInt32LE(entry.data.length, 20); // Compressed size
      centralHeader.writeUInt32LE(entry.data.length, 24); // Uncompressed size
      centralHeader.writeUInt16LE(nameBuffer.length, 28); // File name length
      centralHeader.writeUInt16LE(0, 30); // Extra field length
      centralHeader.writeUInt16LE(0, 32); // File comment length
      centralHeader.writeUInt16LE(0, 34); // Disk number start
      centralHeader.writeUInt16LE(0, 36); // Internal file attributes
      centralHeader.writeUInt32LE(0, 38); // External file attributes
      centralHeader.writeUInt32LE(entry.offset, 42); // Relative offset of local header
      nameBuffer.copy(centralHeader, 46);

      parts.push(centralHeader);
      offset += centralHeader.length;
    }

    const centralDirSize = offset - centralDirOffset;

    // End of central directory
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0); // End of central directory signature
    endRecord.writeUInt16LE(0, 4); // Disk number
    endRecord.writeUInt16LE(0, 6); // Disk with central directory
    endRecord.writeUInt16LE(entries.length, 8); // Entries on this disk
    endRecord.writeUInt16LE(entries.length, 10); // Total entries
    endRecord.writeUInt32LE(centralDirSize, 12); // Central directory size
    endRecord.writeUInt32LE(centralDirOffset, 16); // Central directory offset
    endRecord.writeUInt16LE(0, 20); // Comment length

    parts.push(endRecord);

    return Buffer.concat(parts);
  }

  private crc32(data: Buffer): number {
    // CRC-32 implementation
    const crcTable: number[] = [];
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      crcTable[i] = crc >>> 0;
    }

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  async exportToPDF(
    reportTitle: string,
    data: SalesReportData | InventoryReportData | CustomerReportData,
    businessName: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Buffer> {
    // Generate a valid PDF file using PDF specification
    const pdf = new PDFGenerator();

    // Add header
    pdf.addText(reportTitle, 24, true);
    pdf.addText(businessName, 14, true);
    pdf.addText(`Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 10, false);
    pdf.addText(`Generated: ${new Date().toLocaleString()}`, 10, false);
    pdf.addVerticalSpace(20);

    // Add summary section
    if ((data as any).summary) {
      pdf.addText('Summary', 16, true);
      pdf.addVerticalSpace(10);

      const summary = (data as any).summary;
      for (const [key, value] of Object.entries(summary)) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const formattedValue = typeof value === 'number'
          ? (key.includes('Margin') || key.includes('Rate')
              ? `${(value as number).toFixed(2)}%`
              : `$${(value as number).toLocaleString()}`)
          : String(value);
        pdf.addText(`${formattedKey}: ${formattedValue}`, 10, false);
      }
      pdf.addVerticalSpace(20);
    }

    // Add tables for major sections
    const tableConfigs = [
      { key: 'topProducts', title: 'Top Products', columns: ['productName', 'quantity', 'sales', 'profit'] },
      { key: 'salesByCategory', title: 'Sales by Category', columns: ['categoryName', 'quantity', 'sales', 'profit'] },
      { key: 'topCustomers', title: 'Top Customers', columns: ['customerName', 'orders', 'totalSpent'] },
      { key: 'lowStockItems', title: 'Low Stock Items', columns: ['productName', 'sku', 'quantity', 'minStock'] },
    ];

    for (const config of tableConfigs) {
      const tableData = (data as any)[config.key];
      if (tableData && Array.isArray(tableData) && tableData.length > 0) {
        pdf.addText(config.title, 14, true);
        pdf.addVerticalSpace(10);

        // Table header
        const headers = config.columns.map(c =>
          c.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        );
        pdf.addTableRow(headers, true);

        // Table rows (limit to top 10 for PDF)
        for (const item of tableData.slice(0, 10)) {
          const row = config.columns.map(col => {
            const val = item[col];
            if (typeof val === 'number') {
              return col.includes('sales') || col.includes('profit') || col.includes('Spent')
                ? `$${val.toLocaleString()}`
                : val.toString();
            }
            return String(val ?? '');
          });
          pdf.addTableRow(row, false);
        }
        pdf.addVerticalSpace(20);
      }
    }

    return pdf.generate();
  }

  // ============ SCHEDULED REPORTS ============

  async generateScheduledReport(
    reportType: 'sales' | 'inventory' | 'customer',
    businessId: string,
    period: ReportPeriod,
    format: ReportFormat
  ): Promise<{ data: any; file?: Buffer; mimeType: string; filename: string }> {
    let reportData: any;
    let columns: Array<{ key: string; header: string }> = [];

    const filters: ReportFilters = { businessId, period };

    switch (reportType) {
      case 'sales':
        reportData = await this.generateSalesReport(filters);
        columns = [
          { key: 'date', header: 'Date' },
          { key: 'sales', header: 'Sales' },
          { key: 'orders', header: 'Orders' },
        ];
        break;

      case 'inventory':
        reportData = await this.generateInventoryReport(filters);
        columns = [
          { key: 'productId', header: 'Product ID' },
          { key: 'productName', header: 'Product Name' },
          { key: 'quantity', header: 'Quantity' },
        ];
        break;

      case 'customer':
        reportData = await this.generateCustomerReport(filters);
        columns = [
          { key: 'customerId', header: 'Customer ID' },
          { key: 'name', header: 'Name' },
          { key: 'totalSpent', header: 'Total Spent' },
        ];
        break;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    let file: Buffer | undefined;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        file = Buffer.from(await this.exportToCSV(reportData.salesByDate || reportData.topCustomers || reportData.lowStockItems || [], columns), 'utf-8');
        mimeType = 'text/csv';
        filename = `${reportType}-report-${timestamp}.csv`;
        break;

      case 'excel':
        // Pass the full report data to generate a comprehensive Excel file
        file = await this.exportToExcel(reportData, `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${reportType}-report-${timestamp}.xlsx`;
        break;

      case 'pdf':
        const { start, end } = this.getDateRange(period);
        file = await this.exportToPDF(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, reportData, 'Business Name', { start, end });
        mimeType = 'application/pdf';
        filename = `${reportType}-report-${timestamp}.pdf`;
        break;

      default:
        mimeType = 'application/json';
        filename = `${reportType}-report-${timestamp}.json`;
    }

    return { data: reportData, file, mimeType, filename };
  }

  // ============ COMPARISON REPORTS ============

  async generateComparisonReport(
    businessId: string,
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date }
  ): Promise<{
    period1: SalesReportData;
    period2: SalesReportData;
    changes: {
      salesChange: number;
      ordersChange: number;
      avgOrderChange: number;
      profitChange: number;
    };
  }> {
    const filters1: ReportFilters = {
      businessId,
      period: 'custom',
      startDate: period1.start,
      endDate: period1.end,
    };

    const filters2: ReportFilters = {
      businessId,
      period: 'custom',
      startDate: period2.start,
      endDate: period2.end,
    };

    const [report1, report2] = await Promise.all([
      this.generateSalesReport(filters1),
      this.generateSalesReport(filters2),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      period1: report1,
      period2: report2,
      changes: {
        salesChange: calculateChange(report2.summary.totalSales, report1.summary.totalSales),
        ordersChange: calculateChange(report2.summary.totalOrders, report1.summary.totalOrders),
        avgOrderChange: calculateChange(report2.summary.averageOrderValue, report1.summary.averageOrderValue),
        profitChange: calculateChange(report2.summary.grossProfit, report1.summary.grossProfit),
      },
    };
  }

  /**
   * Compare two periods (alias for generateComparisonReport)
   * Called from reports controller
   */
  async comparePeriods(
    businessId: string,
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date },
    locationId?: string
  ): Promise<{
    period1: SalesReportData;
    period2: SalesReportData;
    changes: {
      salesChange: number;
      ordersChange: number;
      avgOrderChange: number;
      profitChange: number;
    };
  }> {
    // Use the existing comparison method with optional location filter
    const filters1: ReportFilters = {
      businessId,
      period: 'custom',
      startDate: period1.start,
      endDate: period1.end,
      locationId,
    };

    const filters2: ReportFilters = {
      businessId,
      period: 'custom',
      startDate: period2.start,
      endDate: period2.end,
      locationId,
    };

    const [report1, report2] = await Promise.all([
      this.generateSalesReport(filters1),
      this.generateSalesReport(filters2),
    ]);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      period1: report1,
      period2: report2,
      changes: {
        salesChange: calculateChange(report2.summary.totalSales, report1.summary.totalSales),
        ordersChange: calculateChange(report2.summary.totalOrders, report1.summary.totalOrders),
        avgOrderChange: calculateChange(report2.summary.averageOrderValue, report1.summary.averageOrderValue),
        profitChange: calculateChange(report2.summary.grossProfit, report1.summary.grossProfit),
      },
    };
  }
}

export const reportService = new ReportService();
