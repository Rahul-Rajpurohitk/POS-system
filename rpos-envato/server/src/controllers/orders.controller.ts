import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import orderService from '../services/order.service';
import logService from '../services/log.service';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { OrderStatus, RefundReason } from '../types/enums';
import * as crypto from 'crypto';

/**
 * Generate ETag from data for cache validation
 */
const generateETag = (data: any): string => {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
};

/**
 * Set cache headers for order responses
 */
const setCacheHeaders = (res: Response, etag: string, maxAge: number = 0) => {
  res.set({
    'ETag': etag,
    'Cache-Control': maxAge > 0 ? `private, max-age=${maxAge}` : 'private, no-cache, must-revalidate',
    'Last-Modified': new Date().toUTCString(),
  });
};

/**
 * Get all orders (paginated with filters)
 * GET /orders
 * Query params: page, limit, dateRange, status, paymentMethod, orderType, search
 */
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    dateRange,
    status,
    paymentMethod,
    orderType,
    search,
  } = req.query;

  const filters = {
    dateRange: dateRange as 'today' | 'yesterday' | 'week' | 'month' | 'all' | undefined,
    status: status as string | undefined,
    paymentMethod: paymentMethod as string | undefined,
    orderType: orderType as string | undefined,
    search: search as string | undefined,
  };

  const result = await orderService.getOrders(req.business!, Number(page), Number(limit), filters);

  const responseData = {
    success: true,
    data: result.orders,
    pagination: {
      total: result.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(result.total / Number(limit)),
    },
  };

  // Generate ETag for cache validation
  const etag = generateETag(responseData.data);

  // Check If-None-Match header for conditional request
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    return res.status(304).end();
  }

  setCacheHeaders(res, etag, 5); // 5 second cache for orders list
  res.json(responseData);
});

/**
 * Sync all orders (for mobile app)
 * GET /orders/sync
 */
export const syncOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.syncOrders(req.business!);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Create new order
 * POST /orders
 */
export const addOrder = asyncHandler(async (req: Request, res: Response) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  const order = await orderService.createOrder({
    businessId: req.business!,
    createdById: req.userId!,
    items: req.body.items,
    couponId: req.body.couponId || req.body.coupon,
    customerId: req.body.customerId || req.body.customer,
    guestName: req.body.guest?.name,
    guestEmail: req.body.guest?.email,
    guestPhone: req.body.guest?.phone,
    guestAddress: req.body.guest?.address,
    status: req.body.status, // Support initial status (OPEN for saved orders)
    paymentMethod: req.body.paymentMethod,
    orderType: req.body.orderType,
  });

  if (!order) {
    return res.status(500).json({ message: 'Failed to create order' });
  }

  // Create log entry
  await logService.createNewOrder(order, user);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

/**
 * Update order
 * PUT /orders/:id
 * Supports updating items, customer, coupon, status, and payment method
 */
export const editOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { items, customerId, couponId, status, paymentMethod } = req.body;

  // First update the order items/customer/coupon
  const order = await orderService.updateOrder(id, req.business!, {
    items,
    couponId: couponId || req.body.coupon,
    customerId: customerId || req.body.customer,
    paymentMethod,
  });

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // If status is being changed (e.g., OPEN -> COMPLETED), update it
  let finalOrder = order;
  if (status && status !== order.status) {
    const statusResult = await orderService.updateOrderStatus(id, req.business!, status, req.userId);
    if (statusResult) {
      finalOrder = statusResult;
    }
  }

  // Invalidate cache by setting no-store header
  res.set({
    'Cache-Control': 'no-store',
    'X-Order-Updated': new Date().toISOString(),
  });

  res.json({
    success: true,
    message: status === 'completed' ? 'Order completed successfully' : 'Order updated successfully',
    data: finalOrder,
  });
});

/**
 * Delete order
 * DELETE /orders/:id
 */
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await orderService.deleteOrder(id, req.business!);

  if (!result) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.json({
    success: true,
    message: 'Order deleted successfully',
  });
});

/**
 * Get order by ID
 * GET /orders/:id
 */
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await orderService.getOrderById(id, req.business!);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const responseData = {
    success: true,
    data: order,
  };

  // Generate ETag for cache validation
  const etag = generateETag(order);

  // Check If-None-Match header for conditional request
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    return res.status(304).end();
  }

  setCacheHeaders(res, etag, 10); // 10 second cache for single order
  res.json(responseData);
});

/**
 * Get order statistics
 * GET /orders/stats
 * Query params: dateRange (today, week, month, all)
 */
export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const { dateRange } = req.query;
  const stats = await orderService.getOrderStats(
    req.business!,
    dateRange as 'today' | 'yesterday' | 'week' | 'month' | 'all' | undefined
  );

  const responseData = {
    success: true,
    data: stats,
  };

  // Generate ETag for cache validation
  const etag = generateETag(stats);

  // Check If-None-Match header for conditional request
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    return res.status(304).end();
  }

  setCacheHeaders(res, etag, 30); // 30 second cache for stats
  res.json(responseData);
});

/**
 * Get recent orders
 * GET /orders/recent
 */
export const getRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const orders = await orderService.getRecentOrders(req.business!, Number(limit));

  const responseData = {
    success: true,
    data: orders,
  };

  // Generate ETag for cache validation
  const etag = generateETag(orders);

  // Check If-None-Match header for conditional request
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    return res.status(304).end();
  }

  setCacheHeaders(res, etag, 5); // 5 second cache for recent orders
  res.json(responseData);
});

/**
 * Get orders by customer
 * GET /orders/customer/:customerId
 */
export const getCustomerOrders = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;

  const orders = await orderService.getCustomerOrders(req.business!, customerId);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Void/Cancel an order
 * POST /orders/:id/void
 */
export const voidOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  try {
    const order = await orderService.voidOrder(id, req.business!, req.userId!, reason);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Log the void action
    await logService.logOrderCancelled(order, user);

    res.json({
      success: true,
      message: 'Order voided successfully',
      data: order,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to void order',
    });
  }
});

/**
 * Process refund for an order
 * POST /orders/:id/refund
 */
export const refundOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, reason, notes, restoreInventory = true, itemIds } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid refund amount is required' });
  }

  try {
    const order = await orderService.refundOrder(id, req.business!, req.userId!, {
      amount: Number(amount),
      reason: reason || RefundReason.CUSTOMER_REQUEST,
      notes,
      restoreInventory,
      itemIds,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Log the refund action
    await logService.logOrderRefunded(order, user, amount);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: order,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process refund',
    });
  }
});

/**
 * Update order status
 * PATCH /orders/:id/status
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !Object.values(OrderStatus).includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Valid status is required',
      validStatuses: Object.values(OrderStatus),
    });
  }

  const order = await orderService.updateOrderStatus(id, req.business!, status, req.userId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order,
  });
});

/**
 * Process product exchange
 * POST /orders/:id/exchange
 * Handles returning items and exchanging for new products
 */
export const exchangeOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    returnItems,      // Items being returned: { itemId, quantity }[]
    exchangeItems,    // New products: { productId, quantity }[]
    refundAmount,     // Amount to refund (if return > exchange)
    additionalPayment, // Amount customer pays (if exchange > return)
    reason,
    notes,
    destination,      // Refund destination: 'original' | 'store_credit' | 'cash'
  } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  try {
    const result = await orderService.processExchange(id, req.business!, req.userId!, {
      returnItems,
      exchangeItems,
      refundAmount: Number(refundAmount) || 0,
      additionalPayment: Number(additionalPayment) || 0,
      reason: reason || RefundReason.CUSTOMER_REQUEST,
      notes,
      destination,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'Exchange processed successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process exchange',
    });
  }
});

export default {
  getOrders,
  syncOrders,
  addOrder,
  editOrder,
  deleteOrder,
  getOrder,
  getOrderStats,
  getRecentOrders,
  getCustomerOrders,
  voidOrder,
  refundOrder,
  exchangeOrder,
  updateOrderStatus,
};
