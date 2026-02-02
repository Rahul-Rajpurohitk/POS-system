import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { driverService } from '../services/driver.service';
import { deliveryService } from '../services/delivery.service';
import { deliveryRealtimeService } from '../services/delivery-realtime.service';
import { routingService } from '../services/routing.service';
import { DriverStatus, DeliveryStatus } from '../types/enums';

// ============ DRIVER PROFILE MANAGEMENT (POS Admin) ============

/**
 * Get all drivers for business
 * GET /drivers
 */
export const getDrivers = asyncHandler(async (req: Request, res: Response) => {
  const { status, enabled } = req.query;

  const drivers = await driverService.getDriversByBusiness(
    req.business!,
    status as DriverStatus | undefined,
    enabled !== undefined ? enabled === 'true' : undefined
  );

  res.json({
    success: true,
    data: drivers,
  });
});

/**
 * Get single driver
 * GET /drivers/:id
 */
export const getDriver = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.getDriverById(req.params.id, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found',
    });
  }

  res.json({
    success: true,
    data: driver,
  });
});

/**
 * Create driver profile
 * POST /drivers
 */
export const createDriver = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.createDriver({
    ...req.body,
    businessId: req.business!,
  });

  res.status(201).json({
    success: true,
    data: driver,
    message: 'Driver profile created',
  });
});

/**
 * Update driver profile
 * PUT /drivers/:id
 */
export const updateDriver = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.updateDriver(req.params.id, req.business!, req.body);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found',
    });
  }

  res.json({
    success: true,
    data: driver,
    message: 'Driver profile updated',
  });
});

/**
 * Delete/disable driver
 * DELETE /drivers/:id
 */
export const deleteDriver = asyncHandler(async (req: Request, res: Response) => {
  const success = await driverService.deleteDriver(req.params.id, req.business!);

  if (!success) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found',
    });
  }

  res.json({
    success: true,
    message: 'Driver profile deleted',
  });
});

/**
 * Get available drivers (for assignment)
 * GET /drivers/available
 */
export const getAvailableDrivers = asyncHandler(async (req: Request, res: Response) => {
  const drivers = await driverService.getAvailableDrivers(req.business!);

  res.json({
    success: true,
    data: drivers,
  });
});

// ============ DRIVER APP ENDPOINTS ============

/**
 * Get current driver's profile (for driver app)
 * GET /driver/me
 */
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  res.json({
    success: true,
    data: driver,
  });
});

/**
 * Update driver status (online/offline/busy)
 * POST /driver/status
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  const updated = await driverService.updateStatus(driver.id, status);

  // Handle real-time notifications
  if (status === DriverStatus.AVAILABLE) {
    await deliveryRealtimeService.handleDriverOnline(
      req.headers['x-socket-id'] as string || '',
      driver.id,
      req.business!
    );
  } else if (status === DriverStatus.OFFLINE) {
    await deliveryRealtimeService.handleDriverOffline(
      req.headers['x-socket-id'] as string || '',
      driver.id,
      req.business!
    );
  }

  res.json({
    success: true,
    data: updated,
    message: `Status updated to ${status}`,
  });
});

/**
 * Update driver location
 * POST /driver/location
 */
export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, heading, speed } = req.body;
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  // Update driver location
  await driverService.updateLocation(driver.id, latitude, longitude);

  // Update delivery location if driver has active delivery
  if (driver.activeDeliveryId) {
    const delivery = await deliveryService.getDeliveryById(driver.activeDeliveryId, req.business!);

    if (delivery) {
      // Calculate new ETA
      const eta = await routingService.updateLiveETA(
        delivery.id,
        { latitude, longitude },
        { latitude: delivery.deliveryLatitude!, longitude: delivery.deliveryLongitude! },
        driver.vehicleType
      );

      // Update delivery with location (with throttling)
      await deliveryRealtimeService.updateDriverLocation(
        delivery.id,
        req.business!,
        delivery.trackingToken,
        { latitude, longitude, heading, speed },
        eta.estimatedArrival
      );

      // Update delivery location record
      await deliveryService.updateDriverLocation(
        delivery.id,
        latitude,
        longitude
      );

      // Update delivery ETA
      await deliveryService.updateDeliveryETA(
        delivery.id,
        eta.estimatedArrival,
        eta.durationSeconds
      );
    }
  }

  res.json({
    success: true,
    message: 'Location updated',
  });
});

/**
 * Get driver's active delivery
 * GET /driver/delivery/active
 */
export const getActiveDelivery = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  if (!driver.activeDeliveryId) {
    return res.json({
      success: true,
      data: null,
    });
  }

  const delivery = await deliveryService.getDeliveryById(driver.activeDeliveryId, req.business!);

  res.json({
    success: true,
    data: delivery,
  });
});

/**
 * Get driver's delivery history
 * GET /driver/deliveries
 */
export const getDeliveryHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  const result = await deliveryService.getDriverDeliveries(
    driver.id,
    req.business!,
    Number(page),
    Number(limit)
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
 * Update delivery status (driver action)
 * POST /driver/delivery/:id/status
 */
export const updateDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  // Verify driver is assigned to this delivery
  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  if (!delivery || delivery.driverId !== driver.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized for this delivery',
    });
  }

  const result = await deliveryService.updateStatus(req.params.id, status, req.business!);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  res.json({
    success: true,
    data: result.delivery,
    message: `Status updated to ${status}`,
  });
});

/**
 * Complete delivery with proof
 * POST /driver/delivery/:id/complete
 */
export const completeDelivery = asyncHandler(async (req: Request, res: Response) => {
  const { photoUrl, notes } = req.body;
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  // Verify driver is assigned to this delivery
  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  if (!delivery || delivery.driverId !== driver.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized for this delivery',
    });
  }

  const result = await deliveryService.completeDelivery(
    req.params.id,
    photoUrl,
    req.business!
  );

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  // Update driver stats
  await driverService.incrementDeliveryCount(driver.id);

  // Clear driver's active delivery
  await driverService.clearActiveDelivery(driver.id);

  // Clear throttle state
  deliveryRealtimeService.clearThrottleState(req.params.id);

  res.json({
    success: true,
    data: result.delivery,
    message: 'Delivery completed successfully',
  });
});

/**
 * Report delivery issue
 * POST /driver/delivery/:id/issue
 */
export const reportIssue = asyncHandler(async (req: Request, res: Response) => {
  const { issueType, description } = req.body;
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  // Verify driver is assigned to this delivery
  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  if (!delivery || delivery.driverId !== driver.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized for this delivery',
    });
  }

  // For now, just log the issue
  // In production, this would create a support ticket or notification
  console.log(`Delivery issue reported: ${req.params.id}`, {
    driverId: driver.id,
    issueType,
    description,
  });

  res.json({
    success: true,
    message: 'Issue reported successfully',
  });
});

/**
 * Get route to destination
 * GET /driver/delivery/:id/route
 */
export const getDeliveryRoute = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  const delivery = await deliveryService.getDeliveryById(req.params.id, req.business!);

  if (!delivery || delivery.driverId !== driver.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized for this delivery',
    });
  }

  if (!driver.currentLatitude || !driver.currentLongitude) {
    return res.status(400).json({
      success: false,
      message: 'Driver location not available',
    });
  }

  // Determine destination based on delivery status
  let destination: { latitude: number; longitude: number };

  if (delivery.status === DeliveryStatus.ASSIGNED || delivery.status === DeliveryStatus.PICKING_UP) {
    // Route to pickup (store)
    destination = {
      latitude: delivery.pickupLatitude,
      longitude: delivery.pickupLongitude,
    };
  } else {
    // Route to delivery (customer)
    destination = {
      latitude: delivery.deliveryLatitude!,
      longitude: delivery.deliveryLongitude!,
    };
  }

  const route = await routingService.calculateRoute(
    { latitude: driver.currentLatitude, longitude: driver.currentLongitude },
    destination,
    driver.vehicleType
  );

  const eta = await routingService.calculateETA(
    { latitude: driver.currentLatitude, longitude: driver.currentLongitude },
    destination,
    driver.vehicleType
  );

  res.json({
    success: true,
    data: {
      route,
      eta,
      destination,
      destinationType: delivery.status === DeliveryStatus.ASSIGNED || delivery.status === DeliveryStatus.PICKING_UP
        ? 'pickup'
        : 'delivery',
    },
  });
});

/**
 * Get driver statistics
 * GET /driver/stats
 */
export const getDriverStats = asyncHandler(async (req: Request, res: Response) => {
  const driver = await driverService.getDriverByUserId(req.userId!, req.business!);

  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver profile not found',
    });
  }

  // Get delivery stats
  const stats = await deliveryService.getDriverStats(driver.id, req.business!);

  res.json({
    success: true,
    data: {
      totalDeliveries: driver.totalDeliveries,
      deliveriesToday: driver.deliveriesToday,
      averageRating: driver.averageRating,
      ...stats,
    },
  });
});
