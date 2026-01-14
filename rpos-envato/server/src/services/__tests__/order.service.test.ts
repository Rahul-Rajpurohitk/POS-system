// Mock dependencies BEFORE imports
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../queues/jobs/OrderJob', () => ({
  OrderJob: {
    processOrder: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../queues/jobs/InventoryJob', () => ({
  InventoryJob: {
    restoreInventory: jest.fn().mockResolvedValue(undefined),
  },
}));

// Now import after mocks are set up
import { OrderService } from '../order.service';
import { Order } from '../../entities/Order.entity';
import { OrderItem } from '../../entities/OrderItem.entity';
import { Product } from '../../entities/Product.entity';
import { Coupon } from '../../entities/Coupon.entity';
import { CouponType } from '../../types/enums';
import { AppDataSource } from '../../config/database';
import { OrderJob } from '../../queues/jobs/OrderJob';
import { InventoryJob } from '../../queues/jobs/InventoryJob';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: any;
  let mockOrderItemRepository: any;
  let mockProductRepository: any;
  let mockCouponRepository: any;

  // Test data
  const mockProduct: Partial<Product> = {
    id: 'product-uuid-1',
    name: 'Test Product',
    sellingPrice: 29.99,
    quantity: 100,
    businessId: 'business-uuid-123',
    enabled: true,
  };

  const mockProduct2: Partial<Product> = {
    id: 'product-uuid-2',
    name: 'Test Product 2',
    sellingPrice: 49.99,
    quantity: 50,
    businessId: 'business-uuid-123',
    enabled: true,
  };

  const mockCouponFixed: Partial<Coupon> = {
    id: 'coupon-uuid-1',
    code: 'SAVE10',
    type: CouponType.FIXED,
    amount: 10,
    businessId: 'business-uuid-123',
    enabled: true,
    isExpired: false,
  };

  const mockCouponPercent: Partial<Coupon> = {
    id: 'coupon-uuid-2',
    code: 'PERCENT20',
    type: CouponType.PERCENT,
    amount: 20,
    businessId: 'business-uuid-123',
    enabled: true,
    isExpired: false,
  };

  const mockOrder: Partial<Order> = {
    id: 'order-uuid-123',
    number: 1,
    businessId: 'business-uuid-123',
    createdById: 'user-uuid-123',
    subTotal: 79.98,
    discount: 0,
    total: 79.98,
    items: [],
  };

  const mockOrderItem: Partial<OrderItem> = {
    id: 'item-uuid-1',
    orderId: 'order-uuid-123',
    productId: 'product-uuid-1',
    quantity: 2,
    unitPrice: 29.99,
    lineTotal: 59.98,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockOrderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    };

    mockOrderItemRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    };

    mockProductRepository = {
      findOne: jest.fn(),
    };

    mockCouponRepository = {
      findOne: jest.fn(),
    };

    // Setup AppDataSource mock
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Order) return mockOrderRepository;
      if (entity === OrderItem) return mockOrderItemRepository;
      if (entity === Product) return mockProductRepository;
      if (entity === Coupon) return mockCouponRepository;
      return {};
    });

    // Create service instance
    orderService = new OrderService();
  });

  describe('getOrderProducts', () => {
    it('should return products with quantities for valid items', async () => {
      mockProductRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct2);

      const items = [
        { productId: 'product-uuid-1', quantity: 2 },
        { productId: 'product-uuid-2', quantity: 1 },
      ];

      const result = await orderService.getOrderProducts(items, 'business-uuid-123');

      expect(result).toHaveLength(2);
      expect(result[0].product.id).toBe('product-uuid-1');
      expect(result[0].quantity).toBe(2);
      expect(result[1].product.id).toBe('product-uuid-2');
      expect(result[1].quantity).toBe(1);
    });

    it('should throw error for non-existent product', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      const items = [{ productId: 'non-existent', quantity: 1 }];

      await expect(
        orderService.getOrderProducts(items, 'business-uuid-123')
      ).rejects.toThrow('Product not found: non-existent');
    });

    it('should throw error for insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, quantity: 1 };
      mockProductRepository.findOne.mockResolvedValue(lowStockProduct);

      const items = [{ productId: 'product-uuid-1', quantity: 10 }];

      await expect(
        orderService.getOrderProducts(items, 'business-uuid-123')
      ).rejects.toThrow('Test Product is currently out of stock');
    });
  });

  describe('getOrderCoupon', () => {
    it('should return valid coupon', async () => {
      mockCouponRepository.findOne.mockResolvedValue(mockCouponFixed);

      const result = await orderService.getOrderCoupon('coupon-uuid-1', 'business-uuid-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('coupon-uuid-1');
    });

    it('should return null for expired coupon', async () => {
      const expiredCoupon = { ...mockCouponFixed, isExpired: true };
      mockCouponRepository.findOne.mockResolvedValue(expiredCoupon);

      const result = await orderService.getOrderCoupon('coupon-uuid-1', 'business-uuid-123');

      expect(result).toBeNull();
    });

    it('should return null for non-existent coupon', async () => {
      mockCouponRepository.findOne.mockResolvedValue(null);

      const result = await orderService.getOrderCoupon('non-existent', 'business-uuid-123');

      expect(result).toBeNull();
    });
  });

  describe('calculateDiscount', () => {
    it('should return 0 for null coupon', () => {
      const result = orderService.calculateDiscount(null, 100);
      expect(result).toBe(0);
    });

    it('should calculate fixed discount correctly', () => {
      const result = orderService.calculateDiscount(mockCouponFixed as Coupon, 100);
      expect(result).toBe(10);
    });

    it('should cap fixed discount at subtotal', () => {
      const largeCoupon = { ...mockCouponFixed, amount: 200 } as Coupon;
      const result = orderService.calculateDiscount(largeCoupon, 50);
      expect(result).toBe(50); // Can't discount more than subtotal
    });

    it('should calculate percentage discount correctly', () => {
      const result = orderService.calculateDiscount(mockCouponPercent as Coupon, 100);
      expect(result).toBe(20); // 20% of 100
    });

    it('should calculate percentage discount for various amounts', () => {
      const result = orderService.calculateDiscount(mockCouponPercent as Coupon, 79.98);
      expect(result).toBeCloseTo(15.996, 2); // 20% of 79.98
    });
  });

  describe('getNextOrderNumber', () => {
    it('should return 1 for first order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      const result = await orderService.getNextOrderNumber('business-uuid-123');

      expect(result).toBe(1);
    });

    it('should increment from last order number', async () => {
      mockOrderRepository.findOne.mockResolvedValue({ number: 42 });

      const result = await orderService.getNextOrderNumber('business-uuid-123');

      expect(result).toBe(43);
    });
  });

  describe('createOrder', () => {
    it('should create order with items successfully', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockOrderRepository.findOne.mockResolvedValueOnce(null); // For getNextOrderNumber

      const savedOrder = {
        ...mockOrder,
        id: 'new-order-id',
        items: [mockOrderItem],
      };

      const mockManager = {
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
        save: jest.fn().mockResolvedValue({ id: 'new-order-id', ...mockOrder }),
      };

      (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockManager);
        return savedOrder;
      });

      mockOrderRepository.findOne.mockResolvedValue(savedOrder);

      const result = await orderService.createOrder({
        businessId: 'business-uuid-123',
        createdById: 'user-uuid-123',
        items: [{ productId: 'product-uuid-1', quantity: 2 }],
      });

      expect(result).toBeDefined();
      expect(OrderJob.processOrder).toHaveBeenCalled();
    });

    it('should apply coupon discount when provided', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockCouponRepository.findOne.mockResolvedValue(mockCouponFixed);
      mockOrderRepository.findOne.mockResolvedValueOnce(null); // For getNextOrderNumber

      const mockManager = {
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
        save: jest.fn().mockResolvedValue({ id: 'new-order-id' }),
      };

      (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockManager);
        return { id: 'new-order-id', discount: 10 };
      });

      mockOrderRepository.findOne.mockResolvedValue({ id: 'new-order-id', discount: 10 });

      const result = await orderService.createOrder({
        businessId: 'business-uuid-123',
        createdById: 'user-uuid-123',
        items: [{ productId: 'product-uuid-1', quantity: 2 }],
        couponId: 'coupon-uuid-1',
      });

      expect(result).toBeDefined();
    });

    it('should support guest checkout', async () => {
      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockOrderRepository.findOne.mockResolvedValueOnce(null);

      const mockManager = {
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
        save: jest.fn().mockResolvedValue({ id: 'new-order-id' }),
      };

      (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockManager);
        return { id: 'new-order-id', guestName: 'Guest User' };
      });

      mockOrderRepository.findOne.mockResolvedValue({
        id: 'new-order-id',
        guestName: 'Guest User',
        guestEmail: 'guest@example.com',
      });

      const result = await orderService.createOrder({
        businessId: 'business-uuid-123',
        createdById: 'user-uuid-123',
        items: [{ productId: 'product-uuid-1', quantity: 1 }],
        guestName: 'Guest User',
        guestEmail: 'guest@example.com',
      });

      expect(result).toBeDefined();
      expect(result.guestName).toBe('Guest User');
    });
  });

  describe('updateOrder', () => {
    it('should return null for non-existent order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      const result = await orderService.updateOrder(
        'non-existent',
        'business-uuid-123',
        { customerId: 'customer-uuid' }
      );

      expect(result).toBeNull();
    });

    it('should update order with new items', async () => {
      const existingOrder = {
        ...mockOrder,
        items: [mockOrderItem],
      };
      mockOrderRepository.findOne.mockResolvedValueOnce(existingOrder);
      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const mockManager = {
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
        save: jest.fn().mockResolvedValue([]),
      };

      (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockManager);
        return existingOrder;
      });

      mockOrderRepository.findOne.mockResolvedValue(existingOrder);

      const result = await orderService.updateOrder(
        'order-uuid-123',
        'business-uuid-123',
        { items: [{ productId: 'product-uuid-1', quantity: 3 }] }
      );

      expect(InventoryJob.restoreInventory).toHaveBeenCalled();
      expect(OrderJob.processOrder).toHaveBeenCalled();
    });
  });

  describe('deleteOrder', () => {
    it('should return false for non-existent order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      const result = await orderService.deleteOrder('non-existent', 'business-uuid-123');

      expect(result).toBe(false);
    });

    it('should delete order and restore inventory', async () => {
      const orderWithItems = {
        ...mockOrder,
        items: [mockOrderItem],
      };
      mockOrderRepository.findOne.mockResolvedValue(orderWithItems);
      mockOrderRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await orderService.deleteOrder('order-uuid-123', 'business-uuid-123');

      expect(result).toBe(true);
      expect(InventoryJob.restoreInventory).toHaveBeenCalledWith({
        orderId: 'order-uuid-123',
        businessId: 'business-uuid-123',
        items: [{ productId: 'product-uuid-1', quantity: 2 }],
      });
      expect(mockOrderRepository.delete).toHaveBeenCalledWith('order-uuid-123');
    });

    it('should delete order without inventory restore if no items', async () => {
      const orderWithoutItems = { ...mockOrder, items: [] };
      mockOrderRepository.findOne.mockResolvedValue(orderWithoutItems);
      mockOrderRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await orderService.deleteOrder('order-uuid-123', 'business-uuid-123');

      expect(result).toBe(true);
      expect(InventoryJob.restoreInventory).not.toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order with relations', async () => {
      const orderWithRelations = {
        ...mockOrder,
        items: [mockOrderItem],
        customer: { id: 'customer-uuid', name: 'Test Customer' },
      };
      mockOrderRepository.findOne.mockResolvedValue(orderWithRelations);

      const result = await orderService.getOrderById('order-uuid-123', 'business-uuid-123');

      expect(result).toBeDefined();
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-uuid-123', businessId: 'business-uuid-123' },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
      });
    });

    it('should return null for non-existent order', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      const result = await orderService.getOrderById('non-existent', 'business-uuid-123');

      expect(result).toBeNull();
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-2', number: 2 }];
      mockOrderRepository.findAndCount.mockResolvedValue([orders, 25]);

      const result = await orderService.getOrders('business-uuid-123', 1, 20);

      expect(result.orders).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith({
        where: { businessId: 'business-uuid-123' },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle pagination correctly', async () => {
      mockOrderRepository.findAndCount.mockResolvedValue([[], 0]);

      await orderService.getOrders('business-uuid-123', 3, 10);

      expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        })
      );
    });

    it('should use default pagination values', async () => {
      mockOrderRepository.findAndCount.mockResolvedValue([[], 0]);

      await orderService.getOrders('business-uuid-123');

      expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });
  });

  describe('syncOrders', () => {
    it('should return all orders for sync', async () => {
      const orders = [mockOrder, { ...mockOrder, id: 'order-2' }];
      mockOrderRepository.find.mockResolvedValue(orders);

      const result = await orderService.syncOrders('business-uuid-123');

      expect(result).toHaveLength(2);
      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { businessId: 'business-uuid-123' },
        relations: ['items', 'items.product', 'customer', 'coupon', 'createdBy'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no orders', async () => {
      mockOrderRepository.find.mockResolvedValue([]);

      const result = await orderService.syncOrders('business-uuid-123');

      expect(result).toHaveLength(0);
    });
  });
});
