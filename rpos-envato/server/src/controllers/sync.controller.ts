import { Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { AuthenticatedRequest } from '../types';
import { offlineSyncService, ConflictResolution } from '../services/offline-sync.service';

/**
 * Queue items for sync
 * POST /sync/queue
 */
export const queueSync = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { items } = req.body;
  const clientId = req.headers['x-client-id'] as string || req.userId!;

  const queueId = await offlineSyncService.queueSync(clientId, items);

  res.status(201).json({
    success: true,
    message: 'Items queued for sync',
    data: { queueId },
  });
});

/**
 * Process sync queue
 * POST /sync/process
 */
export const processSync = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;
  const { conflictResolution, batchSize } = req.body;

  const results = await offlineSyncService.processQueue(clientId, req.businessId!, {
    conflictResolution: conflictResolution as ConflictResolution,
    batchSize,
  });

  res.json({
    success: true,
    message: 'Sync processing complete',
    data: {
      results,
      summary: {
        total: results.length,
        success: results.filter((r) => r.status === 'success').length,
        failed: results.filter((r) => r.status === 'failed').length,
        conflicts: results.filter((r) => r.status === 'conflict').length,
      },
    },
  });
});

/**
 * Get sync queue status
 * GET /sync/status
 */
export const getSyncStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;

  const status = await offlineSyncService.getQueueStatus(clientId);

  res.json({
    success: true,
    data: status,
  });
});

/**
 * Get pending conflicts
 * GET /sync/conflicts
 */
export const getConflicts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;

  const conflicts = await offlineSyncService.getPendingConflicts(clientId);

  res.json({
    success: true,
    data: conflicts,
  });
});

/**
 * Resolve conflict manually
 * POST /sync/conflicts/:itemId/resolve
 */
export const resolveConflict = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;
  const { resolution, mergedData } = req.body;

  const result = await offlineSyncService.resolveConflictManually(
    clientId,
    req.params.itemId,
    resolution,
    mergedData
  );

  res.json({
    success: true,
    message: 'Conflict resolved',
    data: result,
  });
});

/**
 * Get delta updates since last sync
 * GET /sync/delta
 */
export const getDeltaUpdates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const lastSyncTimestamp = req.query.since
    ? new Date(req.query.since as string)
    : new Date(0);
  const entityTypes = req.query.entities
    ? (req.query.entities as string).split(',')
    : undefined;

  const updates = await offlineSyncService.getDeltaUpdates(
    req.businessId!,
    lastSyncTimestamp,
    entityTypes
  );

  res.json({
    success: true,
    data: updates,
  });
});

/**
 * Full sync - get all data for offline use
 * GET /sync/full
 */
export const fullSync = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const entityTypes = req.query.entities
    ? (req.query.entities as string).split(',')
    : ['products', 'categories', 'customers', 'coupons'];
  const locationId = req.query.locationId as string;

  const data = await offlineSyncService.getFullSyncData(req.businessId!, entityTypes, locationId);

  res.json({
    success: true,
    data: {
      ...data,
      syncTimestamp: new Date().toISOString(),
    },
  });
});

/**
 * Register client for sync
 * POST /sync/register
 */
export const registerClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { deviceInfo, deviceId, pushToken } = req.body;
  const clientId = req.headers['x-client-id'] as string || deviceId || req.userId!;

  const registration = await offlineSyncService.registerClient({
    clientId,
    userId: req.userId!,
    businessId: req.businessId!,
    deviceInfo,
    pushToken,
  });

  res.status(201).json({
    success: true,
    message: 'Client registered for sync',
    data: registration,
  });
});

/**
 * Unregister client
 * DELETE /sync/unregister
 */
export const unregisterClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;

  await offlineSyncService.unregisterClient(clientId);

  res.json({
    success: true,
    message: 'Client unregistered',
  });
});

/**
 * Get client sync info
 * GET /sync/client-info
 */
export const getClientInfo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;

  const info = await offlineSyncService.getClientInfo(clientId);

  if (!info) {
    return res.status(404).json({
      success: false,
      message: 'Client not registered',
    });
  }

  res.json({
    success: true,
    data: info,
  });
});

/**
 * Acknowledge sync completion
 * POST /sync/acknowledge
 */
export const acknowledgSync = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;
  const { syncTimestamp, entityTypes } = req.body;

  await offlineSyncService.acknowledgeSyncComplete(clientId, new Date(syncTimestamp), entityTypes);

  res.json({
    success: true,
    message: 'Sync acknowledged',
  });
});

/**
 * Clear sync queue
 * DELETE /sync/queue
 */
export const clearQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;
  const { status } = req.query;

  await offlineSyncService.clearQueue(clientId, status as string);

  res.json({
    success: true,
    message: 'Queue cleared',
  });
});

/**
 * Retry failed sync items
 * POST /sync/retry
 */
export const retryFailed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clientId = req.headers['x-client-id'] as string || req.userId!;
  const { itemIds } = req.body;

  const results = await offlineSyncService.retryFailedItems(clientId, req.businessId!, itemIds);

  res.json({
    success: true,
    message: 'Retry complete',
    data: results,
  });
});

/**
 * Get sync statistics
 * GET /sync/stats
 */
export const getSyncStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = await offlineSyncService.getSyncStatistics(req.businessId!, {
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: stats,
  });
});

export default {
  queueSync,
  processSync,
  getSyncStatus,
  getConflicts,
  resolveConflict,
  getDeltaUpdates,
  fullSync,
  registerClient,
  unregisterClient,
  getClientInfo,
  acknowledgSync,
  clearQueue,
  retryFailed,
  getSyncStats,
};
