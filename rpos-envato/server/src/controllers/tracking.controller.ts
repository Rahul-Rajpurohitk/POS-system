import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { deliveryService } from '../services/delivery.service';
import { deliveryRealtimeService } from '../services/delivery-realtime.service';
import { DeliveryStatus } from '../types/enums';

/**
 * Get delivery tracking info (public endpoint)
 * GET /track/:trackingToken
 */
export const getTrackingInfo = asyncHandler(async (req: Request, res: Response) => {
  const { trackingToken } = req.params;

  const delivery = await deliveryService.getDeliveryByTrackingToken(trackingToken);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  // Return limited info for public tracking
  const trackingInfo = {
    id: delivery.id,
    status: delivery.status,
    statusText: getStatusText(delivery.status),

    // Delivery address (customer's)
    deliveryAddress: delivery.deliveryAddress,

    // ETA
    estimatedArrival: delivery.estimatedArrival,

    // Driver info (limited)
    driver: delivery.driver
      ? {
          name: delivery.driver.user?.fullName || 'Your driver',
          vehicleType: delivery.driver.vehicleType,
          rating: delivery.driver.averageRating,
        }
      : null,

    // Location (if driver is assigned and en route)
    currentLocation:
      delivery.driver &&
      delivery.driver.currentLatitude &&
      [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.PICKING_UP,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.ON_THE_WAY,
        DeliveryStatus.NEARBY,
      ].includes(delivery.status as DeliveryStatus)
        ? {
            latitude: delivery.driver.currentLatitude,
            longitude: delivery.driver.currentLongitude,
          }
        : null,

    // Route polyline for map display
    routePolyline:
      delivery.routePolyline &&
      [
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.ON_THE_WAY,
        DeliveryStatus.NEARBY,
      ].includes(delivery.status as DeliveryStatus)
        ? delivery.routePolyline
        : null,

    // Timestamps
    timestamps: {
      created: delivery.createdAt,
      accepted: delivery.acceptedAt,
      assigned: delivery.assignedAt,
      pickedUp: delivery.pickedUpAt,
      delivered: delivery.deliveredAt,
    },

    // Delivery fee and tip
    deliveryFee: delivery.deliveryFee,
    driverTip: delivery.driverTip,
  };

  res.json({
    success: true,
    data: trackingInfo,
  });
});

/**
 * Get current driver location (public endpoint)
 * GET /track/:trackingToken/location
 */
export const getDriverLocation = asyncHandler(async (req: Request, res: Response) => {
  const { trackingToken } = req.params;

  const delivery = await deliveryService.getDeliveryByTrackingToken(trackingToken);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  // Only return location for active deliveries
  const activeStatuses = [
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.PICKING_UP,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.ON_THE_WAY,
    DeliveryStatus.NEARBY,
  ];

  if (!activeStatuses.includes(delivery.status as DeliveryStatus)) {
    return res.json({
      success: true,
      data: null,
      message: 'Location not available for current status',
    });
  }

  // Try to get from cache first (most recent)
  const cachedLocation = await deliveryRealtimeService.getLastKnownLocation(delivery.id);

  if (cachedLocation) {
    return res.json({
      success: true,
      data: {
        latitude: cachedLocation.latitude,
        longitude: cachedLocation.longitude,
        heading: cachedLocation.heading,
        speed: cachedLocation.speed,
        timestamp: cachedLocation.timestamp,
        eta: delivery.estimatedArrival,
      },
    });
  }

  // Fall back to driver's last known location
  if (delivery.driver && delivery.driver.currentLatitude) {
    return res.json({
      success: true,
      data: {
        latitude: delivery.driver.currentLatitude,
        longitude: delivery.driver.currentLongitude,
        timestamp: delivery.driver.lastLocationUpdate?.getTime() || Date.now(),
        eta: delivery.estimatedArrival,
      },
    });
  }

  res.json({
    success: true,
    data: null,
    message: 'Driver location not available',
  });
});

/**
 * Rate delivery and driver (public endpoint)
 * POST /track/:trackingToken/rate
 */
export const rateDelivery = asyncHandler(async (req: Request, res: Response) => {
  const { trackingToken } = req.params;
  const { rating, feedback } = req.body;

  const delivery = await deliveryService.getDeliveryByTrackingToken(trackingToken);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  // Only allow rating completed deliveries
  if (delivery.status !== DeliveryStatus.DELIVERED) {
    return res.status(400).json({
      success: false,
      message: 'Can only rate completed deliveries',
    });
  }

  // Check if already rated
  if (delivery.customerRating) {
    return res.status(400).json({
      success: false,
      message: 'Delivery already rated',
    });
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5',
    });
  }

  try {
    await deliveryService.rateDelivery(trackingToken, rating, feedback || undefined);

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * Update tip amount (public endpoint)
 * POST /track/:trackingToken/tip
 */
export const updateTip = asyncHandler(async (req: Request, res: Response) => {
  const { trackingToken } = req.params;
  const { tipAmount } = req.body;

  const delivery = await deliveryService.getDeliveryByTrackingToken(trackingToken);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  // Only allow tipping before delivery is completed
  const tippableStatuses = [
    DeliveryStatus.ACCEPTED,
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.PICKING_UP,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.ON_THE_WAY,
    DeliveryStatus.NEARBY,
    DeliveryStatus.DELIVERED,
  ];

  if (!tippableStatuses.includes(delivery.status as DeliveryStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot update tip for current delivery status',
    });
  }

  if (tipAmount < 0) {
    return res.status(400).json({
      success: false,
      message: 'Tip amount cannot be negative',
    });
  }

  await deliveryService.updateTip(delivery.id, tipAmount, delivery.businessId);

  res.json({
    success: true,
    message: 'Tip updated successfully',
  });
});

/**
 * Get status history (public endpoint)
 * GET /track/:trackingToken/history
 */
export const getStatusHistory = asyncHandler(async (req: Request, res: Response) => {
  const { trackingToken } = req.params;

  const delivery = await deliveryService.getDeliveryByTrackingToken(trackingToken);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  // Build status history from timestamps
  const history: Array<{ status: string; timestamp: Date | null; description: string }> = [];

  history.push({
    status: 'CREATED',
    timestamp: delivery.createdAt,
    description: 'Order placed',
  });

  if (delivery.acceptedAt) {
    history.push({
      status: 'ACCEPTED',
      timestamp: delivery.acceptedAt,
      description: 'Order accepted by store',
    });
  }

  if (delivery.assignedAt) {
    history.push({
      status: 'ASSIGNED',
      timestamp: delivery.assignedAt,
      description: 'Driver assigned',
    });
  }

  if (delivery.pickedUpAt) {
    history.push({
      status: 'PICKED_UP',
      timestamp: delivery.pickedUpAt,
      description: 'Order picked up by driver',
    });
  }

  if (delivery.deliveredAt) {
    history.push({
      status: 'DELIVERED',
      timestamp: delivery.deliveredAt,
      description: 'Order delivered',
    });
  }

  // Add current status if not in history
  if (!history.find((h) => h.status === delivery.status.toUpperCase())) {
    history.push({
      status: delivery.status.toUpperCase(),
      timestamp: delivery.updatedAt,
      description: getStatusText(delivery.status),
    });
  }

  res.json({
    success: true,
    data: history,
  });
});

/**
 * Contact driver (public endpoint - limited)
 * POST /track/:trackingToken/contact
 */
export const contactDriver = asyncHandler(async (req: Request, res: Response) => {
  const { trackingToken } = req.params;
  const { message } = req.body;

  const delivery = await deliveryService.getDeliveryByTrackingToken(trackingToken);

  if (!delivery) {
    return res.status(404).json({
      success: false,
      message: 'Delivery not found',
    });
  }

  if (!delivery.driver) {
    return res.status(400).json({
      success: false,
      message: 'No driver assigned yet',
    });
  }

  // In a real implementation, this would send a push notification to the driver
  // or use a messaging service
  console.log(`Customer message for delivery ${delivery.id}:`, message);

  res.json({
    success: true,
    message: 'Message sent to driver',
  });
});

// ============ HELPER FUNCTIONS ============

function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    [DeliveryStatus.PENDING]: 'Order received',
    [DeliveryStatus.ACCEPTED]: 'Store is preparing your order',
    [DeliveryStatus.ASSIGNED]: 'Driver assigned',
    [DeliveryStatus.PICKING_UP]: 'Driver is at the store',
    [DeliveryStatus.PICKED_UP]: 'Driver picked up your order',
    [DeliveryStatus.ON_THE_WAY]: 'On the way to you',
    [DeliveryStatus.NEARBY]: 'Driver is nearby',
    [DeliveryStatus.DELIVERED]: 'Delivered',
    [DeliveryStatus.CANCELLED]: 'Cancelled',
    [DeliveryStatus.FAILED]: 'Delivery failed',
  };

  return statusTexts[status] || status;
}
