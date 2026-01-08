import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import orderService from '../services/order.service';
import logService from '../services/log.service';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';

/**
 * Get all orders (paginated)
 * GET /orders
 */
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await orderService.getOrders(req.business!, Number(page), Number(limit));

  res.json({
    success: true,
    data: result.orders,
    pagination: {
      total: result.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(result.total / Number(limit)),
    },
  });
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
    couponId: req.body.coupon,
    customerId: req.body.customer,
    guestName: req.body.guest?.name,
    guestEmail: req.body.guest?.email,
    guestPhone: req.body.guest?.phone,
    guestAddress: req.body.guest?.address,
  });

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
 */
export const editOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await orderService.updateOrder(id, req.business!, {
    items: req.body.items,
    couponId: req.body.coupon,
    customerId: req.body.customer,
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.json({
    success: true,
    message: 'Order updated successfully',
    data: order,
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

  res.json({
    success: true,
    data: order,
  });
});

export default {
  getOrders,
  syncOrders,
  addOrder,
  editOrder,
  deleteOrder,
  getOrder,
};
