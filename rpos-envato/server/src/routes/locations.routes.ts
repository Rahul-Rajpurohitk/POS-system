import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import { managerOnly } from '../middlewares/role.middleware';
import * as locationsController from '../controllers/locations.controller';

const router = Router();

router.use(auth);

// Location CRUD

// POST /locations - Create location
router.post(
  '/',
  managerOnly,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('type').isIn(['store', 'warehouse', 'distribution_center', 'popup']),
    body('address').optional().isObject(),
  ],
  checkValidation,
  locationsController.createLocation
);

// GET /locations - Get all locations
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'inactive', 'closed']),
    query('type').optional().isIn(['store', 'warehouse', 'distribution_center', 'popup']),
  ],
  checkValidation,
  locationsController.getLocations
);

// GET /locations/:id - Get location by ID
router.get(
  '/:id',
  [param('id').isUUID()],
  checkValidation,
  locationsController.getLocation
);

// PUT /locations/:id - Update location
router.put(
  '/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  locationsController.updateLocation
);

// DELETE /locations/:id - Delete location
router.delete(
  '/:id',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  locationsController.deleteLocation
);

// Inventory

// GET /locations/:id/inventory - Get location inventory
router.get(
  '/:id/inventory',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('lowStock').optional().isBoolean(),
  ],
  checkValidation,
  locationsController.getLocationInventory
);

// PUT /locations/:id/inventory/:productId - Update inventory
router.put(
  '/:id/inventory/:productId',
  [
    param('id').isUUID(),
    param('productId').isUUID(),
    body('quantity').optional().isInt({ min: 0 }),
    body('reorderPoint').optional().isInt({ min: 0 }),
    body('reorderQuantity').optional().isInt({ min: 0 }),
  ],
  checkValidation,
  locationsController.updateInventory
);

// Stock Transfers

// POST /locations/transfers - Create transfer
router.post(
  '/transfers',
  [
    body('fromLocationId').isUUID().withMessage('Source location required'),
    body('toLocationId').isUUID().withMessage('Destination location required'),
    body('items').isArray({ min: 1 }).withMessage('Items required'),
    body('items.*.productId').isUUID(),
    body('items.*.quantity').isInt({ min: 1 }),
  ],
  checkValidation,
  locationsController.createTransfer
);

// GET /locations/transfers - Get all transfers
router.get(
  '/transfers',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('fromLocation').optional().isUUID(),
    query('toLocation').optional().isUUID(),
  ],
  checkValidation,
  locationsController.getTransfers
);

// GET /locations/transfers/:id - Get transfer by ID
router.get(
  '/transfers/:id',
  [param('id').isUUID()],
  checkValidation,
  locationsController.getTransfer
);

// Transfer workflow actions

// POST /locations/transfers/:id/submit - Submit for approval
router.post(
  '/transfers/:id/submit',
  [param('id').isUUID()],
  checkValidation,
  locationsController.submitTransfer
);

// POST /locations/transfers/:id/approve - Approve transfer
router.post(
  '/transfers/:id/approve',
  managerOnly,
  [param('id').isUUID()],
  checkValidation,
  locationsController.approveTransfer
);

// POST /locations/transfers/:id/reject - Reject transfer
router.post(
  '/transfers/:id/reject',
  managerOnly,
  [
    param('id').isUUID(),
    body('reason').notEmpty().withMessage('Reason required'),
  ],
  checkValidation,
  locationsController.rejectTransfer
);

// POST /locations/transfers/:id/ship - Ship transfer
router.post(
  '/transfers/:id/ship',
  [
    param('id').isUUID(),
    body('trackingNumber').optional().isString(),
    body('carrier').optional().isString(),
    body('estimatedArrival').optional().isISO8601(),
  ],
  checkValidation,
  locationsController.shipTransfer
);

// POST /locations/transfers/:id/receive - Receive transfer
router.post(
  '/transfers/:id/receive',
  [
    param('id').isUUID(),
    body('receivedItems').isArray({ min: 1 }),
    body('receivedItems.*.productId').isUUID(),
    body('receivedItems.*.receivedQuantity').isInt({ min: 0 }),
  ],
  checkValidation,
  locationsController.receiveTransfer
);

// POST /locations/transfers/:id/cancel - Cancel transfer
router.post(
  '/transfers/:id/cancel',
  [
    param('id').isUUID(),
    body('reason').notEmpty().withMessage('Reason required'),
  ],
  checkValidation,
  locationsController.cancelTransfer
);

export default router;
