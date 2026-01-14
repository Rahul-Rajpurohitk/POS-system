// Mock dependencies BEFORE imports
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AnalyticsService, RecentOrder } from '../analytics.service';
import { Order } from '../../entities/Order.entity';
import { OrderItem } from '../../entities/OrderItem.entity';
import { Payment } from '../../entities/Payment.entity';
import { Product } from '../../entities/Product.entity';
import { Customer } from '../../entities/Customer.entity';
import { Refund } from '../../entities/Refund.entity';
import { OrderStatus, ReportPeriod } from '../../types/enums';
import { AppDataSource } from '../../config/database';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockOrderRepository: any;
  let mockOrderItemRepository: any;
  let mockPaymentRepository: any;
  let mockProductRepository: any;
  let mockCustomerRepository: any;
  let mockRefundRepository: any;

  // Test data - DEV-66: Recent orders with orderNumber and itemCount
  const mockOrderWithItems = {
    id: 'order-uuid-1',
    number: 1140,
    total: 152.89,
    status: OrderStatus.COMPLETED,
    createdAt: new Date('2026-01-11T20:24:00Z'),
    customer: { id: 'cust-1', name: 'John Smith' },
    guestName: null,
    items: [
      { id: 'item-1', quantity: 3, product: { name: 'Product A' } },
      { id: 'item-2', quantity: 6, product: { name: 'Product B' } },
    ],
  };

  const mockOrderWithGuest = {
    id: 'order-uuid-2',
    number: 1141,
    total: 95.44,
    status: OrderStatus.COMPLETED,
    createdAt: new Date('2026-01-11T19:30:00Z'),
    customer: null,
    guestName: 'Guest User',
    items: [
      { id: 'item-3', quantity: 4, product: { name: 'Product C' } },
    ],
  };

  const mockOrderNoCustomer = {
    id: 'order-uuid-3',
    number: 1142,
    total: 50.00,
    status: OrderStatus.PENDING,
    createdAt: new Date('2026-01-11T18:00:00Z'),
    customer: null,
    guestName: null,
    items: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockOrderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
        from: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
      })),
    };

    mockOrderItemRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      })),
    };

    mockPaymentRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      })),
    };

    mockProductRepository = {
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    mockCustomerRepository = {
      count: jest.fn(),
    };

    mockRefundRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      })),
    };

    // Setup AppDataSource mock
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Order) return mockOrderRepository;
      if (entity === OrderItem) return mockOrderItemRepository;
      if (entity === Payment) return mockPaymentRepository;
      if (entity === Product) return mockProductRepository;
      if (entity === Customer) return mockCustomerRepository;
      if (entity === Refund) return mockRefundRepository;
      return {};
    });

    // Create service instance
    analyticsService = new AnalyticsService();
  });

  describe('getRecentOrders - DEV-66', () => {
    it('should return recent orders with correct fields', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithItems, mockOrderWithGuest]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result).toHaveLength(2);
      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { businessId: 'business-uuid-123' },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['customer', 'items'],
      });
    });

    it('should return orderNumber as string (not just "number")', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithItems]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].orderNumber).toBe('1140');
      expect(typeof result[0].orderNumber).toBe('string');
    });

    it('should calculate itemCount from items array quantities', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithItems]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      // 3 + 6 = 9 items total
      expect(result[0].itemCount).toBe(9);
    });

    it('should return customerName from customer relation', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithItems]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].customerName).toBe('John Smith');
    });

    it('should fallback to guestName when no customer', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithGuest]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].customerName).toBe('Guest User');
    });

    it('should use "Walk-in Customer" when no customer or guestName', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderNoCustomer]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].customerName).toBe('Walk-in Customer');
    });

    it('should return itemCount of 0 for orders with no items', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderNoCustomer]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].itemCount).toBe(0);
    });

    it('should return order status for badge display', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithItems, mockOrderNoCustomer]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].status).toBe(OrderStatus.COMPLETED);
      expect(result[1].status).toBe(OrderStatus.PENDING);
    });

    it('should round total to 2 decimal places', async () => {
      const orderWithDecimal = {
        ...mockOrderWithItems,
        total: 152.8912345,
      };
      mockOrderRepository.find.mockResolvedValue([orderWithDecimal]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].total).toBe(152.89);
    });

    it('should use default limit of 10', async () => {
      mockOrderRepository.find.mockResolvedValue([]);

      await analyticsService.getRecentOrders('business-uuid-123');

      expect(mockOrderRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should return empty array when no orders exist', async () => {
      mockOrderRepository.find.mockResolvedValue([]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should include createdAt for date display', async () => {
      mockOrderRepository.find.mockResolvedValue([mockOrderWithItems]);

      const result = await analyticsService.getRecentOrders('business-uuid-123', 5);

      expect(result[0].createdAt).toEqual(mockOrderWithItems.createdAt);
    });
  });

  describe('getDateRange - DEV-69 Period Selector', () => {
    it('should return correct range for TODAY', () => {
      const result = analyticsService.getDateRange(ReportPeriod.TODAY);

      const today = new Date();
      expect(result.startDate.getDate()).toBe(today.getDate());
      expect(result.endDate.getDate()).toBe(today.getDate());
    });

    it('should return correct range for THIS_WEEK', () => {
      const result = analyticsService.getDateRange(ReportPeriod.THIS_WEEK);

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.startDate.getTime()).toBeLessThan(result.endDate.getTime());
    });

    it('should return correct range for THIS_MONTH', () => {
      const result = analyticsService.getDateRange(ReportPeriod.THIS_MONTH);

      const now = new Date();
      expect(result.startDate.getMonth()).toBe(now.getMonth());
      expect(result.startDate.getDate()).toBe(1);
    });

    it('should throw error for CUSTOM period without dates', () => {
      expect(() => {
        analyticsService.getDateRange(ReportPeriod.CUSTOM);
      }).toThrow('Custom period requires start and end dates');
    });

    it('should accept custom dates for CUSTOM period', () => {
      const customStart = new Date('2026-01-01');
      const customEnd = new Date('2026-01-31');

      const result = analyticsService.getDateRange(ReportPeriod.CUSTOM, customStart, customEnd);

      expect(result.startDate).toEqual(customStart);
      expect(result.endDate).toEqual(customEnd);
    });
  });

  describe('getInventoryAlerts - DEV-68 Stock Status', () => {
    it('should return products with low stock', async () => {
      const lowStockProducts = [
        { id: 'prod-1', name: 'Product A', sku: 'SKU-001', stock: 5, minStock: 10 },
        { id: 'prod-2', name: 'Product B', sku: 'SKU-002', stock: 0, minStock: 10 },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockProducts),
      };
      mockProductRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await analyticsService.getInventoryAlerts('business-uuid-123');

      expect(result).toHaveLength(2);
    });

    it('should mark out_of_stock when stock is 0', async () => {
      const outOfStockProduct = [
        { id: 'prod-1', name: 'Product A', sku: 'SKU-001', stock: 0, minStock: 10 },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(outOfStockProduct),
      };
      mockProductRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await analyticsService.getInventoryAlerts('business-uuid-123');

      expect(result[0].status).toBe('out_of_stock');
    });

    it('should mark critical when stock is at or below half of minStock', async () => {
      const criticalProduct = [
        { id: 'prod-1', name: 'Product A', sku: 'SKU-001', stock: 3, minStock: 10 },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(criticalProduct),
      };
      mockProductRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await analyticsService.getInventoryAlerts('business-uuid-123');

      expect(result[0].status).toBe('critical');
    });

    it('should mark low when stock is above half but at/below minStock', async () => {
      const lowStockProduct = [
        { id: 'prod-1', name: 'Product A', sku: 'SKU-001', stock: 8, minStock: 10 },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockProduct),
      };
      mockProductRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await analyticsService.getInventoryAlerts('business-uuid-123');

      expect(result[0].status).toBe('low');
    });
  });

  describe('getSalesSummary - DEV-69 Dashboard Stats', () => {
    it('should calculate sales metrics correctly', async () => {
      const mockSalesData = {
        orderCount: '10',
        totalRevenue: '1500.00',
        totalTax: '150.00',
        totalDiscount: '50.00',
        totalTips: '25.00',
        averageOrder: '150.00',
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockSalesData),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dateRange = { startDate: new Date(), endDate: new Date() };
      const result = await analyticsService.getSalesSummary('business-uuid-123', dateRange);

      expect(result.totalRevenue).toBe(1500);
      expect(result.totalOrders).toBe(10);
      expect(result.averageOrderValue).toBe(150);
      expect(result.totalTax).toBe(150);
      expect(result.totalDiscount).toBe(50);
    });

    it('should calculate comparison percentChange', async () => {
      const currentData = {
        orderCount: '10',
        totalRevenue: '1500.00',
        totalTax: '0',
        totalDiscount: '0',
        totalTips: '0',
        averageOrder: '150.00',
      };

      const previousData = {
        orderCount: '8',
        totalRevenue: '1000.00',
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn()
          .mockResolvedValueOnce(currentData)
          .mockResolvedValueOnce(previousData),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dateRange = { startDate: new Date(), endDate: new Date() };
      const previousRange = { startDate: new Date(), endDate: new Date() };
      const result = await analyticsService.getSalesSummary('business-uuid-123', dateRange, previousRange);

      // (1500 - 1000) / 1000 * 100 = 50%
      expect(result.comparisonPeriod.percentChange).toBe(50);
    });

    it('should return zero values when no orders exist', async () => {
      const mockEmptyData = {
        orderCount: '0',
        totalRevenue: null,
        totalTax: null,
        totalDiscount: null,
        totalTips: null,
        averageOrder: null,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockEmptyData),
      };
      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dateRange = { startDate: new Date(), endDate: new Date() };
      const result = await analyticsService.getSalesSummary('business-uuid-123', dateRange);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });
  });
});
