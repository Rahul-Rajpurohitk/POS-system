import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { deliveryService } from '../services/delivery.service';
import { deliveryZoneService } from '../services/delivery-zone.service';
import { driverAssignmentService } from '../services/driver-assignment.service';
import { onlineOrderQueueService } from '../services/online-order-queue.service';
import { geocodingService } from '../services/geocoding.service';
import { routingService } from '../services/routing.service';
import { driverService } from '../services/driver.service';
import { DeliveryStatus } from '../types/enums';

// ============ ONLINE ORDER QUEUE ============

/**
 * Get pending online orders in queue
 * GET /delivery/queue
 */
export const getOrderQueue = asyncHandler(async (req: Request, res: Response) => {
  const orders = await onlineOrderQueueService.getPendingOrders(req.business!);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * Accept an online order
 * POST /delivery/queue/:queueEntryId/accept
 */
export const acceptOnlineOrder = asyncHandler(async (req: Request, res: Response) => {
  const { queueEntryId } = req.params;
  const { createDelivery } = req.body;

  try {
    const result = await onlineOrderQueueService.acceptOrder({
      queueEntryId,
      businessId: req.business!,
      acceptedById: req.userId!,
      createDelivery,
    });

    res.json({
      success: true,
      data: {
        queueEntry: result.queueEntry,
        order: result.order,
        delivery: result.delivery,
      },
      message: 'Order accepted successfully',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Reject an online order
 * POST /delivery/queue/:queueEntryId/reject
 */
export const rejectOnlineOrder = asyncHandler(async (req: Request, res: Response) => {
  const { queueEntryId } = req.params;
  const { reason } = req.body;

  try {
    await onlineOrderQueueService.rejectOrder(
      queueEntryId,
      req.business!,
      req.userId!,
      reason
    );

    res.json({
      success: true,
      message: 'Order rejected',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// ============ DELIVERY MANAGEMENT ============

/**
 * Get active deliveries for business
 * GET /delivery/active
 */
export const getActiveDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const deliveries = await deliveryService.getActiveDeliveries(req.business!);

  res.json({
    success: true,
    data: deliveries,
  });
});

/**
 * Get all deliveries (paginated)
 * GET /delivery
 */
export const getDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status } = req.query;

  const result = await deliveryService.getDeliveries(
    req.business!,
    Number(page),
    Number(limit),
    status as DeliveryStatus | undefined
  );

  res.json({
    success: true,
    data: result.deliveries,
    pagination: {
      total: result.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(result.total / Number(limit)),
    },
  });
});

/**
 * Get single delivery by ID
 * GET /delivery/:id
 */
export const getDelivery = asyncHandler(async (req: Request, res: Response) => {
  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  res.json({
    success: true,
    data: delivery,
  });
});

/**
 * Get driver suggestions for a delivery
 * GET /delivery/:id/drivers
 */
export const getDriverSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  if (!delivery.deliveryLatitude || !delivery.deliveryLongitude) {
    return res.status(400).json({
      success: false,
      message: 'Delivery coordinates not set',
    });
  }

  const drivers = await driverAssignmentService.getSuggestedDrivers(
    req.business!,
    delivery.pickupLatitude,
    delivery.pickupLongitude,
    delivery.deliveryLatitude,
    delivery.deliveryLongitude
  );

  res.json({
    success: true,
    data: drivers,
  });
});

/**
 * Assign driver to delivery
 * POST /delivery/:id/assign
 */
export const assignDriver = asyncHandler(async (req: Request, res: Response) => {
  const { driverId } = req.body;

  const result = await deliveryService.assignDriver(req.params.id, driverId, req.business!);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  res.json({
    success: true,
    data: result.delivery,
    message: 'Driver assigned successfully',
  });
});

/**
 * Auto-assign best driver
 * POST /delivery/:id/auto-assign
 */
export const autoAssignDriver = asyncHandler(async (req: Request, res: Response) => {
  const result = await driverAssignmentService.autoAssignDriver(req.params.id, req.business!);

  if (!result.assigned) {
    return res.status(400).json({
      success: false,
      message: result.reason || 'Could not auto-assign driver',
    });
  }

  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  res.json({
    success: true,
    data: delivery,
    assignedDriver: {
      id: result.driverId,
      name: result.driverName,
    },
    message: 'Driver auto-assigned successfully',
  });
});

/**
 * Cancel delivery
 * POST /delivery/:id/cancel
 */
export const cancelDelivery = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;

  const result = await deliveryService.updateStatus(
    req.params.id,
    DeliveryStatus.CANCELLED,
    req.business!
  );

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  res.json({
    success: true,
    message: 'Delivery cancelled',
  });
});

/**
 * Update delivery status
 * PATCH /delivery/:id/status
 */
export const updateDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;

  const result = await deliveryService.updateStatus(
    req.params.id,
    status as DeliveryStatus,
    req.business!
  );

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  res.json({
    success: true,
    data: result.delivery,
    message: 'Delivery status updated',
  });
});

/**
 * Get delivery statistics
 * GET /delivery/stats
 */
export const getDeliveryStats = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  // Parse dates if provided
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const stats = await deliveryService.getDeliveryStats(req.business!, start, end);

  // Also get available driver count
  const availableDrivers = await driverService.getAvailableDrivers(req.business!);

  res.json({
    success: true,
    data: {
      ...stats,
      availableDrivers: availableDrivers.length,
    },
  });
});

/**
 * Get all drivers for the business (with availability status)
 * GET /delivery/drivers/available
 */
export const getAvailableDrivers = asyncHandler(async (req: Request, res: Response) => {
  // Get ALL drivers for the business so POS can see everyone
  const allDrivers = await driverService.getBusinessDrivers(req.business!, { enabledOnly: true });

  // Mark which ones are truly available (within working hours and status = AVAILABLE)
  const now = new Date();
  const driversWithAvailability = allDrivers.map(driver => ({
    ...driver,
    isAvailable: driver.status === 'available' && driver.enabled && driver.isWithinWorkingHours(now),
  }));

  res.json({
    success: true,
    data: driversWithAvailability,
  });
});

// ============ DELIVERY ZONES ============

/**
 * Get all delivery zones
 * GET /delivery/zones
 */
export const getZones = asyncHandler(async (req: Request, res: Response) => {
  const zones = await deliveryZoneService.getBusinessZones(req.business!);

  res.json({
    success: true,
    data: zones,
  });
});

/**
 * Get single zone
 * GET /delivery/zones/:id
 */
export const getZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.getZoneById(req.params.id, req.business!);

  if (!zone) {
    return res.status(404).json({
      success: false,
      message: 'Zone not found',
    });
  }

  res.json({
    success: true,
    data: zone,
  });
});

/**
 * Create delivery zone
 * POST /delivery/zones
 */
export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.createZone({
    ...req.body,
    businessId: req.business!,
  });

  res.status(201).json({
    success: true,
    data: zone,
    message: 'Delivery zone created',
  });
});

/**
 * Update delivery zone
 * PUT /delivery/zones/:id
 */
export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await deliveryZoneService.updateZone(req.params.id, req.business!, req.body);

  if (!zone) {
    return res.status(404).json({
      success: false,
      message: 'Zone not found',
    });
  }

  res.json({
    success: true,
    data: zone,
    message: 'Delivery zone updated',
  });
});

/**
 * Delete delivery zone
 * DELETE /delivery/zones/:id
 */
export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  const success = await deliveryZoneService.deleteZone(req.params.id, req.business!);

  if (!success) {
    return res.status(404).json({
      success: false,
      message: 'Zone not found',
    });
  }

  res.json({
    success: true,
    message: 'Delivery zone deleted',
  });
});

/**
 * Check if address is deliverable
 * POST /delivery/zones/check
 */
export const checkDeliverability = asyncHandler(async (req: Request, res: Response) => {
  const { address, latitude, longitude, orderTotal } = req.body;

  let coords = { latitude, longitude };

  // If address provided, geocode it
  if (address && (!latitude || !longitude)) {
    const validation = await geocodingService.validateDeliveryAddress(
      address,
      req.business!,
      orderTotal
    );

    return res.json({
      success: true,
      data: validation,
    });
  }

  // Check with coordinates
  const result = await deliveryZoneService.checkDeliverability(
    req.business!,
    coords.latitude,
    coords.longitude,
    orderTotal || 0
  );

  res.json({
    success: true,
    data: result,
  });
});

// ============ ADDRESS & ROUTING ============

/**
 * Geocode address
 * POST /delivery/geocode
 */
export const geocodeAddress = asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.body;

  const result = await geocodingService.geocodeAddress(address, req.business!);

  if (!result) {
    return res.status(400).json({
      success: false,
      message: 'Unable to geocode address',
    });
  }

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get address suggestions (autocomplete)
 * GET /delivery/address/suggest
 */
export const getAddressSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { query, latitude, longitude } = req.query;

  if (!query || (query as string).length < 3) {
    return res.json({
      success: true,
      data: [],
    });
  }

  const proximity = latitude && longitude
    ? { latitude: Number(latitude), longitude: Number(longitude) }
    : undefined;

  const suggestions = await geocodingService.getAddressSuggestions(
    query as string,
    proximity,
    5
  );

  res.json({
    success: true,
    data: suggestions,
  });
});

/**
 * Calculate route and ETA
 * POST /delivery/route
 */
export const calculateRoute = asyncHandler(async (req: Request, res: Response) => {
  const { origin, destination, vehicleType } = req.body;

  const route = await routingService.calculateRoute(origin, destination, vehicleType);

  if (!route) {
    return res.status(400).json({
      success: false,
      message: 'Unable to calculate route',
    });
  }

  const eta = await routingService.calculateETA(origin, destination, vehicleType);

  res.json({
    success: true,
    data: {
      route,
      eta,
    },
  });
});
