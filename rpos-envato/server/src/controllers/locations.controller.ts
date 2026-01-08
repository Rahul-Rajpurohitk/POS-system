import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { locationService } from '../services/location.service';

/**
 * Create a new location
 * POST /locations
 */
export const createLocation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const location = await locationService.createLocation({
    businessId: req.businessId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Location created successfully',
    data: location,
  });
});

/**
 * Get all locations
 * GET /locations
 */
export const getLocations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const type = req.query.type as string;

  const result = await locationService.getLocations(req.businessId!, {
    page,
    limit,
    status,
    type,
  });

  res.json({
    success: true,
    data: result.locations,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get location by ID
 * GET /locations/:id
 */
export const getLocation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const location = await locationService.getLocationById(req.params.id, req.businessId!);

  if (!location) {
    return res.status(404).json({
      success: false,
      message: 'Location not found',
    });
  }

  res.json({
    success: true,
    data: location,
  });
});

/**
 * Update location
 * PUT /locations/:id
 */
export const updateLocation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const location = await locationService.updateLocation(req.params.id, req.businessId!, req.body);

  res.json({
    success: true,
    message: 'Location updated successfully',
    data: location,
  });
});

/**
 * Delete location
 * DELETE /locations/:id
 */
export const deleteLocation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await locationService.deleteLocation(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Location deleted successfully',
  });
});

/**
 * Get location inventory
 * GET /locations/:id/inventory
 */
export const getLocationInventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const lowStock = req.query.lowStock === 'true';

  const result = await locationService.getLocationInventory(req.params.id, req.businessId!, {
    page,
    limit,
    lowStock,
  });

  res.json({
    success: true,
    data: result.inventory,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Update inventory for a product at a location
 * PUT /locations/:id/inventory/:productId
 */
export const updateInventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { quantity, reorderPoint, reorderQuantity } = req.body;

  const inventory = await locationService.updateLocationInventory(
    req.params.id,
    req.params.productId,
    req.businessId!,
    { quantity, reorderPoint, reorderQuantity }
  );

  res.json({
    success: true,
    message: 'Inventory updated successfully',
    data: inventory,
  });
});

// Stock Transfer endpoints

/**
 * Create stock transfer
 * POST /locations/transfers
 */
export const createTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfer = await locationService.createTransfer({
    businessId: req.businessId!,
    createdById: req.userId!,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Stock transfer created successfully',
    data: transfer,
  });
});

/**
 * Get all transfers
 * GET /locations/transfers
 */
export const getTransfers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const fromLocationId = req.query.fromLocation as string;
  const toLocationId = req.query.toLocation as string;

  const result = await locationService.getTransfers(req.businessId!, {
    page,
    limit,
    status,
    fromLocationId,
    toLocationId,
  });

  res.json({
    success: true,
    data: result.transfers,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
});

/**
 * Get transfer by ID
 * GET /locations/transfers/:id
 */
export const getTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfer = await locationService.getTransferById(req.params.id, req.businessId!);

  if (!transfer) {
    return res.status(404).json({
      success: false,
      message: 'Transfer not found',
    });
  }

  res.json({
    success: true,
    data: transfer,
  });
});

/**
 * Submit transfer for approval
 * POST /locations/transfers/:id/submit
 */
export const submitTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfer = await locationService.submitTransfer(req.params.id, req.businessId!);

  res.json({
    success: true,
    message: 'Transfer submitted for approval',
    data: transfer,
  });
});

/**
 * Approve transfer
 * POST /locations/transfers/:id/approve
 */
export const approveTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfer = await locationService.approveTransfer(req.params.id, req.businessId!, req.userId!);

  res.json({
    success: true,
    message: 'Transfer approved',
    data: transfer,
  });
});

/**
 * Reject transfer
 * POST /locations/transfers/:id/reject
 */
export const rejectTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const transfer = await locationService.rejectTransfer(req.params.id, req.businessId!, req.userId!, reason);

  res.json({
    success: true,
    message: 'Transfer rejected',
    data: transfer,
  });
});

/**
 * Ship transfer
 * POST /locations/transfers/:id/ship
 */
export const shipTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { trackingNumber, carrier, estimatedArrival, shippedItems } = req.body;

  const transfer = await locationService.shipTransfer(req.params.id, req.businessId!, {
    trackingNumber,
    carrier,
    estimatedArrival,
    shippedItems,
  });

  res.json({
    success: true,
    message: 'Transfer shipped',
    data: transfer,
  });
});

/**
 * Receive transfer
 * POST /locations/transfers/:id/receive
 */
export const receiveTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { receivedItems } = req.body;

  const transfer = await locationService.receiveTransfer(
    req.params.id,
    req.businessId!,
    req.userId!,
    receivedItems
  );

  res.json({
    success: true,
    message: 'Transfer received',
    data: transfer,
  });
});

/**
 * Cancel transfer
 * POST /locations/transfers/:id/cancel
 */
export const cancelTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const transfer = await locationService.cancelTransfer(req.params.id, req.businessId!, reason);

  res.json({
    success: true,
    message: 'Transfer cancelled',
    data: transfer,
  });
});

export default {
  createLocation,
  getLocations,
  getLocation,
  updateLocation,
  deleteLocation,
  getLocationInventory,
  updateInventory,
  createTransfer,
  getTransfers,
  getTransfer,
  submitTransfer,
  approveTransfer,
  rejectTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,
};
