import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { supplierService } from '../services/supplier.service';

/**
 * Create a new supplier
 * POST /suppliers
 */
export const createSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const supplier = await supplierService.createSupplier({
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: supplier,
  });
});

/**
 * Get all suppliers
 * GET /suppliers
 */
export const getSuppliers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const result = await supplierService.getSuppliers(req.businessId!, {
    page,
    limit,
    status,
    search,
  });

  res.json({
    success: true,
    data: result.suppliers,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get supplier by ID
 * GET /suppliers/:id
 */
export const getSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const supplier = await supplierService.getSupplierById(req.params.id, req.businessId!);

  if (!supplier) {
    return res.status(404).json({
      success: false,
      message: 'Supplier not found',
    });
  }

  res.json({
    success: true,
    data: supplier,
  });
});

/**
 * Update supplier
 * PUT /suppliers/:id
 */
export const updateSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Supplier updated successfully',
    data: supplier,
  });
});

/**
 * Delete supplier
 * DELETE /suppliers/:id
 */
export const deleteSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await supplierService.deleteSupplier(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Supplier deleted successfully',
  });
});

/**
 * Get supplier products
 * GET /suppliers/:id/products
 */
export const getSupplierProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const products = await supplierService.getSupplierProducts(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: products,
  });
});

/**
 * Link product to supplier
 * POST /suppliers/:id/products
 */
export const linkProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { productId, supplierSKU, cost, leadTimeDays, minimumOrderQuantity, isPreferred } = req.body;

  const supplierProduct = await supplierService.linkProductToSupplier({
    businessId: req.businessId!,
    supplierId: req.params.id,
    productId,
    supplierSKU,
    cost,
    leadTimeDays,
    minimumOrderQuantity,
    isPreferred,
  });

  res.status(201).json({
    success: true,
    message: 'Product linked to supplier',
    data: supplierProduct,
  });
});

/**
 * Update supplier product
 * PUT /suppliers/:id/products/:productId
 */
export const updateSupplierProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const supplierProduct = await supplierService.updateSupplierProduct(
    req.params.id,
    req.params.productId,
    req.businessId!,
    req.body
  );

  res.json({
    success: true,
    message: 'Supplier product updated',
    data: supplierProduct,
  });
});

/**
 * Remove product from supplier
 * DELETE /suppliers/:id/products/:productId
 */
export const unlinkProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await supplierService.unlinkProductFromSupplier(req.params.id, req.params.productId, req.businessId!);

  res.json({
    success: true,
    message: 'Product unlinked from supplier',
  });
});

// Purchase Order endpoints

/**
 * Create purchase order
 * POST /suppliers/purchase-orders
 */
export const createPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const purchaseOrder = await supplierService.createPurchaseOrder({
    businessId: req.businessId!,
    createdById: req.userId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Purchase order created successfully',
    data: purchaseOrder,
  });
});

/**
 * Get all purchase orders
 * GET /suppliers/purchase-orders
 */
export const getPurchaseOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const supplierId = req.query.supplierId as string;
  const locationId = req.query.locationId as string;

  const result = await supplierService.getPurchaseOrders(req.businessId!, {
    page,
    limit,
    status,
    supplierId,
    locationId,
  });

  res.json({
    success: true,
    data: result.orders,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get purchase order by ID
 * GET /suppliers/purchase-orders/:id
 */
export const getPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const order = await supplierService.getPurchaseOrderById(req.params.id, req.businessId!);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Purchase order not found',
    });
  }

  res.json({
    success: true,
    data: order,
  });
});

/**
 * Update purchase order
 * PUT /suppliers/purchase-orders/:id
 */
export const updatePurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const order = await supplierService.updatePurchaseOrder(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Purchase order updated',
    data: order,
  });
});

/**
 * Submit purchase order for approval
 * POST /suppliers/purchase-orders/:id/submit
 */
export const submitPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const order = await supplierService.submitPurchaseOrder(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Purchase order submitted for approval',
    data: order,
  });
});

/**
 * Approve purchase order
 * POST /suppliers/purchase-orders/:id/approve
 */
export const approvePurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const order = await supplierService.approvePurchaseOrder(req.params.id, req.businessId!, req.userId!);

  res.json({
    success: true,
    message: 'Purchase order approved',
    data: order,
  });
});

/**
 * Send purchase order to supplier
 * POST /suppliers/purchase-orders/:id/send
 */
export const sendPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sendMethod, sendToEmail } = req.body;

  const order = await supplierService.sendPurchaseOrder(req.params.id, req.businessId!, {
    sendMethod,
    sendToEmail,
  });

  res.json({
    success: true,
    message: 'Purchase order sent to supplier',
    data: order,
  });
});

/**
 * Receive purchase order items
 * POST /suppliers/purchase-orders/:id/receive
 */
export const receivePurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { items, receivingNotes } = req.body;

  const receiving = await supplierService.receivePurchaseOrder({
    businessId: req.businessId!,
    purchaseOrderId: req.params.id,
    receivedById: req.userId!,
    items,
    receivingNotes,
  });

  res.json({
    success: true,
    message: 'Purchase order items received',
    data: receiving,
  });
});

/**
 * Cancel purchase order
 * POST /suppliers/purchase-orders/:id/cancel
 */
export const cancelPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;

  const order = await supplierService.cancelPurchaseOrder(req.params.id, req.businessId!, reason);

  res.json({
    success: true,
    message: 'Purchase order cancelled',
    data: order,
  });
});

/**
 * Get receiving history for a purchase order
 * GET /suppliers/purchase-orders/:id/receiving
 */
export const getReceivingHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const history = await supplierService.getReceivingHistory(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: history,
  });
});

// Supplier Payments

/**
 * Record supplier payment
 * POST /suppliers/:id/payments
 */
export const recordPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const payment = await supplierService.recordPayment(req.businessId!, req.params.id, {
    ...req.body,
    recordedById: req.userId,
  });

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: payment,
  });
});

/**
 * Get supplier payments
 * GET /suppliers/:id/payments
 */
export const getSupplierPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await supplierService.getSupplierPayments(req.params.id, req.businessId!, {
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.payments,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get supplier balance
 * GET /suppliers/:id/balance
 */
export const getSupplierBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const balance = await supplierService.getSupplierBalance(req.params.id, req.businessId!);

  res.json({
    success: true,
    data: balance,
  });
});

/**
 * Get reorder suggestions
 * GET /suppliers/reorder-suggestions
 */
export const getReorderSuggestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const locationId = req.query.locationId as string;

  const suggestions = await supplierService.getReorderSuggestions(req.businessId!, locationId);

  res.json({
    success: true,
    data: suggestions,
  });
});

export default {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  linkProduct,
  updateSupplierProduct,
  unlinkProduct,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getReceivingHistory,
  recordPayment,
  getSupplierPayments,
  getSupplierBalance,
  getReorderSuggestions,
};
