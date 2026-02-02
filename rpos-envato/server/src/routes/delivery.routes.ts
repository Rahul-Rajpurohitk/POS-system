import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { staff, manager } from '../middlewares';
import { createLimiter, readLimiter } from '../middlewares/rateLimit.middleware';
import { catchAsync } from '../middlewares/errorHandler.middleware';
import * as deliveryController from '../controllers/delivery.controller';

const router = Router();

// ============ ONLINE ORDER QUEUE ============

// GET /delivery/queue - Get pending online orders
router.get('/queue', staff, readLimiter, catchAsync(deliveryController.getOrderQueue));

// POST /delivery/queue/:queueEntryId/accept - Accept online order
router.post(
  '/queue/:queueEntryId/accept',
  staff,
  createLimiter,
  [param('queueEntryId').isUUID().withMessage('Invalid queue entry ID')],
  checkValidation,
  catchAsync(deliveryController.acceptOnlineOrder)
);

// POST /delivery/queue/:queueEntryId/reject - Reject online order
router.post(
  '/queue/:queueEntryId/reject',
  manager,
  createLimiter,
  [
    param('queueEntryId').isUUID().withMessage('Invalid queue entry ID'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  checkValidation,
  catchAsync(deliveryController.rejectOnlineOrder)
);

// ============ DELIVERY ZONES ============

// GET /delivery/zones - List all delivery zones
router.get('/zones', staff, readLimiter, catchAsync(deliveryController.getZones));

// GET /delivery/zones/:id - Get single zone
router.get(
  '/zones/:id',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid zone ID')],
  checkValidation,
  catchAsync(deliveryController.getZone)
);

// POST /delivery/zones - Create delivery zone
router.post(
  '/zones',
  manager,
  createLimiter,
  [
    body('name').notEmpty().withMessage('Zone name is required'),
    body('zoneType').isIn(['radius', 'polygon']).withMessage('Invalid zone type'),
    body('centerLatitude')
      .if(body('zoneType').equals('radius'))
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('centerLongitude')
      .if(body('zoneType').equals('radius'))
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('radiusMeters')
      .if(body('zoneType').equals('radius'))
      .isInt({ min: 100 })
      .withMessage('Radius must be at least 100 meters'),
    body('baseFee').optional().isFloat({ min: 0 }).withMessage('Base fee must be non-negative'),
    body('perKmFee').optional().isFloat({ min: 0 }).withMessage('Per km fee must be non-negative'),
  ],
  checkValidation,
  catchAsync(deliveryController.createZone)
);

// PUT /delivery/zones/:id - Update delivery zone
router.put(
  '/zones/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid zone ID')],
  checkValidation,
  catchAsync(deliveryController.updateZone)
);

// DELETE /delivery/zones/:id - Delete delivery zone
router.delete(
  '/zones/:id',
  manager,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid zone ID')],
  checkValidation,
  catchAsync(deliveryController.deleteZone)
);

// POST /delivery/zones/check - Check if address is deliverable
router.post(
  '/zones/check',
  staff,
  readLimiter,
  [
    body('address').optional().isString().withMessage('Address must be a string'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('orderTotal').optional().isFloat({ min: 0 }).withMessage('Order total must be non-negative'),
  ],
  checkValidation,
  catchAsync(deliveryController.checkDeliverability)
);

// ============ ADDRESS & ROUTING ============

// POST /delivery/geocode - Geocode address
router.post(
  '/geocode',
  staff,
  readLimiter,
  [body('address').notEmpty().withMessage('Address is required')],
  checkValidation,
  catchAsync(deliveryController.geocodeAddress)
);

// GET /delivery/address/suggest - Address autocomplete
router.get(
  '/address/suggest',
  staff,
  readLimiter,
  [query('query').notEmpty().withMessage('Query is required')],
  checkValidation,
  catchAsync(deliveryController.getAddressSuggestions)
);

// POST /delivery/route - Calculate route
router.post(
  '/route',
  staff,
  readLimiter,
  [
    body('origin').isObject().withMessage('Origin is required'),
    body('origin.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid origin latitude'),
    body('origin.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid origin longitude'),
    body('destination').isObject().withMessage('Destination is required'),
    body('destination.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid destination latitude'),
    body('destination.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid destination longitude'),
    body('vehicleType').optional().isString().withMessage('Invalid vehicle type'),
  ],
  checkValidation,
  catchAsync(deliveryController.calculateRoute)
);

// ============ DELIVERY MANAGEMENT ============

// GET /delivery/stats - Get delivery statistics
router.get('/stats', staff, readLimiter, catchAsync(deliveryController.getDeliveryStats));

// GET /delivery/drivers/available - Get available drivers
router.get('/drivers/available', staff, readLimiter, catchAsync(deliveryController.getAvailableDrivers));

// GET /delivery/active - Get active deliveries
router.get('/active', staff, readLimiter, catchAsync(deliveryController.getActiveDeliveries));

// GET /delivery - List all deliveries (paginated)
router.get(
  '/',
  staff,
  readLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isString().withMessage('Invalid status'),
  ],
  checkValidation,
  catchAsync(deliveryController.getDeliveries)
);

// GET /delivery/:id - Get single delivery
router.get(
  '/:id',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid delivery ID')],
  checkValidation,
  catchAsync(deliveryController.getDelivery)
);

// GET /delivery/:id/drivers - Get driver suggestions
router.get(
  '/:id/drivers',
  staff,
  readLimiter,
  [param('id').isUUID().withMessage('Invalid delivery ID')],
  checkValidation,
  catchAsync(deliveryController.getDriverSuggestions)
);

// POST /delivery/:id/assign - Assign driver
router.post(
  '/:id/assign',
  staff,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid delivery ID'),
    body('driverId').isUUID().withMessage('Driver ID is required'),
  ],
  checkValidation,
  catchAsync(deliveryController.assignDriver)
);

// POST /delivery/:id/auto-assign - Auto-assign best driver
router.post(
  '/:id/auto-assign',
  staff,
  createLimiter,
  [param('id').isUUID().withMessage('Invalid delivery ID')],
  checkValidation,
  catchAsync(deliveryController.autoAssignDriver)
);

// POST /delivery/:id/cancel - Cancel delivery
router.post(
  '/:id/cancel',
  manager,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid delivery ID'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  checkValidation,
  catchAsync(deliveryController.cancelDelivery)
);

// PATCH /delivery/:id/status - Update delivery status
router.patch(
  '/:id/status',
  staff,
  createLimiter,
  [
    param('id').isUUID().withMessage('Invalid delivery ID'),
    body('status')
      .isIn(['pending', 'accepted', 'assigned', 'picking_up', 'picked_up', 'on_the_way', 'nearby', 'delivered', 'cancelled', 'failed'])
      .withMessage('Invalid status'),
  ],
  checkValidation,
  catchAsync(deliveryController.updateDeliveryStatus)
);

export default router;
