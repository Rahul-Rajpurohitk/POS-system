import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkValidation } from '../middlewares/validator.middleware';
import { auth } from '../middlewares/auth.middleware';
import * as syncController from '../controllers/sync.controller';

const router = Router();

router.use(auth);

// Client registration
router.post(
  '/register',
  [
    body('deviceId').optional().isString(),
    body('deviceInfo').optional().isObject(),
    body('pushToken').optional().isString(),
  ],
  checkValidation,
  syncController.registerClient
);

// Unregister client
router.delete('/unregister', syncController.unregisterClient);

// Get client info
router.get('/client-info', syncController.getClientInfo);

// Sync statistics
router.get(
  '/stats',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  checkValidation,
  syncController.getSyncStats
);

// Full sync - get all data for offline
router.get(
  '/full',
  [
    query('entities').optional().isString(),
    query('locationId').optional().isUUID(),
  ],
  checkValidation,
  syncController.fullSync
);

// Delta updates - get changes since last sync
router.get(
  '/delta',
  [
    query('since').isISO8601().withMessage('Timestamp required'),
    query('entities').optional().isString(),
  ],
  checkValidation,
  syncController.getDeltaUpdates
);

// Queue items for sync
router.post(
  '/queue',
  [
    body('items').isArray({ min: 1 }).withMessage('Items required'),
    body('items.*.entityType').notEmpty().withMessage('Entity type required'),
    body('items.*.operation').isIn(['create', 'update', 'delete']).withMessage('Operation required'),
    body('items.*.data').isObject().withMessage('Data required'),
  ],
  checkValidation,
  syncController.queueSync
);

// Process sync queue
router.post(
  '/process',
  [
    body('conflictResolution').optional().isIn(['client_wins', 'server_wins', 'merge', 'manual']),
    body('batchSize').optional().isInt({ min: 1, max: 100 }),
  ],
  checkValidation,
  syncController.processSync
);

// Get sync status
router.get('/status', syncController.getSyncStatus);

// Get conflicts
router.get('/conflicts', syncController.getConflicts);

// Resolve conflict
router.post(
  '/conflicts/:itemId/resolve',
  [
    param('itemId').notEmpty(),
    body('resolution').isIn(['use_client', 'use_server', 'use_merged']).withMessage('Resolution required'),
    body('mergedData').optional().isObject(),
  ],
  checkValidation,
  syncController.resolveConflict
);

// Acknowledge sync
router.post(
  '/acknowledge',
  [
    body('syncTimestamp').isISO8601().withMessage('Sync timestamp required'),
    body('entityTypes').optional().isArray(),
  ],
  checkValidation,
  syncController.acknowledgSync
);

// Clear queue
router.delete(
  '/queue',
  [query('status').optional().isString()],
  checkValidation,
  syncController.clearQueue
);

// Retry failed items
router.post(
  '/retry',
  [body('itemIds').optional().isArray()],
  checkValidation,
  syncController.retryFailed
);

export default router;
