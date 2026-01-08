import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { cacheService } from './cache.service';

// ============ SYNC TYPES ============

export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum SyncStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CONFLICT = 'conflict',
}

export enum ConflictResolution {
  CLIENT_WINS = 'client_wins',      // Offline changes override server
  SERVER_WINS = 'server_wins',      // Server changes override offline
  MERGE = 'merge',                  // Attempt to merge changes
  MANUAL = 'manual',                // Require manual resolution
}

export interface SyncItem {
  id: string;
  clientId: string;               // Device/client identifier
  businessId: string;
  entityType: string;             // 'order', 'product', 'customer', etc.
  entityId: string;               // ID of the entity being synced
  operation: SyncOperation;
  data: Record<string, any>;      // The data to sync
  clientTimestamp: Date;          // When the change was made offline
  serverTimestamp?: Date;         // When processed by server
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  conflictData?: Record<string, any>; // Server data if conflict
  resolvedBy?: string;            // User who resolved conflict
  resolvedAt?: Date;
  version: number;                // Optimistic locking version
  checksum?: string;              // For data integrity
  priority: number;               // Higher = process first
}

export interface SyncBatch {
  batchId: string;
  clientId: string;
  businessId: string;
  items: SyncItem[];
  createdAt: Date;
  processedAt?: Date;
  status: SyncStatus;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  conflictItems: number;
}

export interface SyncResult {
  itemId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  status: SyncStatus;
  serverEntityId?: string;        // New ID if server assigned different one
  serverVersion?: number;
  errorMessage?: string;
  conflictData?: Record<string, any>;
}

export interface SyncConfig {
  conflictResolution: ConflictResolution;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  priorityEntities: string[];     // Entities to sync first
}

// ============ REDIS KEY PATTERNS ============

const SYNC_KEYS = {
  QUEUE: 'pos:sync:queue:',           // Sorted set: pos:sync:queue:{clientId}
  ITEM: 'pos:sync:item:',             // Hash: pos:sync:item:{itemId}
  PROCESSING: 'pos:sync:processing:', // Set: pos:sync:processing:{clientId}
  BATCH: 'pos:sync:batch:',           // Hash: pos:sync:batch:{batchId}
  CLIENT_BATCHES: 'pos:sync:client:', // Set: pos:sync:client:{clientId}:batches
  LOCK: 'pos:sync:lock:',             // Lock: pos:sync:lock:{clientId}
};

// TTL values in seconds
const SYNC_TTL = {
  ITEM: 7 * 24 * 60 * 60,      // 7 days for sync items
  BATCH: 24 * 60 * 60,          // 24 hours for batch metadata
  PROCESSING: 30 * 60,          // 30 minutes for processing flag
  LOCK: 5 * 60,                 // 5 minutes for locks
};

// ============ SYNC SERVICE ============

class OfflineSyncService {
  // Fallback in-memory storage when Redis is unavailable
  private fallbackSyncQueue: Map<string, SyncItem[]> = new Map();
  private fallbackProcessingBatches: Set<string> = new Set();

  private defaultConfig: SyncConfig = {
    conflictResolution: ConflictResolution.SERVER_WINS,
    maxRetries: 3,
    retryDelayMs: 5000,
    batchSize: 50,
    priorityEntities: ['order', 'payment', 'inventory'],
  };

  // ============ QUEUE MANAGEMENT ============

  /**
   * Add items to sync queue with Redis persistence
   */
  async queueSync(clientId: string, items: Omit<SyncItem, 'id' | 'status' | 'retryCount'>[]): Promise<string> {
    const batchId = uuidv4();
    const queueItems: SyncItem[] = items.map((item, index) => ({
      ...item,
      id: uuidv4(),
      status: SyncStatus.PENDING,
      retryCount: 0,
      priority: this.calculatePriority(item.entityType, item.operation, index),
    }));

    // Sort by priority (higher first)
    queueItems.sort((a, b) => b.priority - a.priority);

    // Try Redis first, fallback to in-memory if unavailable
    if (cacheService.connected) {
      await this.persistQueueItems(clientId, batchId, queueItems);
    } else {
      // Fallback to in-memory storage
      const existingQueue = this.fallbackSyncQueue.get(clientId) || [];
      this.fallbackSyncQueue.set(clientId, [...existingQueue, ...queueItems]);
    }

    return batchId;
  }

  /**
   * Persist queue items to Redis
   */
  private async persistQueueItems(clientId: string, batchId: string, items: SyncItem[]): Promise<void> {
    const queueKey = `${SYNC_KEYS.QUEUE}${clientId}`;

    // Create batch metadata
    const batch: SyncBatch = {
      batchId,
      clientId,
      businessId: items[0]?.businessId || '',
      items: [],
      createdAt: new Date(),
      status: SyncStatus.PENDING,
      totalItems: items.length,
      processedItems: 0,
      failedItems: 0,
      conflictItems: 0,
    };

    // Store batch metadata
    await cacheService.set(`${SYNC_KEYS.BATCH}${batchId}`, batch, SYNC_TTL.BATCH);

    // Store each item and add to sorted set queue
    for (const item of items) {
      const itemKey = `${SYNC_KEYS.ITEM}${item.id}`;

      // Store item data with TTL
      await cacheService.set(itemKey, item, SYNC_TTL.ITEM);

      // Add to sorted set with priority as score (negated for descending order)
      await cacheService.zadd(queueKey, -item.priority, item.id);
    }

    // Set queue expiry
    await cacheService.expire(queueKey, SYNC_TTL.ITEM);
  }

  /**
   * Get queue items from Redis
   */
  private async getQueueItems(clientId: string, statusFilter?: SyncStatus): Promise<SyncItem[]> {
    if (!cacheService.connected) {
      const queue = this.fallbackSyncQueue.get(clientId) || [];
      return statusFilter ? queue.filter(i => i.status === statusFilter) : queue;
    }

    const queueKey = `${SYNC_KEYS.QUEUE}${clientId}`;

    // Get all item IDs from sorted set (ordered by priority)
    const itemIds = await cacheService.zrangebyscore(queueKey, '-inf', '+inf');

    if (itemIds.length === 0) return [];

    // Fetch all items
    const itemKeys = itemIds.map(id => `${SYNC_KEYS.ITEM}${id}`);
    const items = await cacheService.mget<SyncItem>(itemKeys);

    // Filter out nulls and apply status filter
    const validItems = items.filter((item): item is SyncItem => item !== null);

    return statusFilter
      ? validItems.filter(i => i.status === statusFilter)
      : validItems;
  }

  /**
   * Update a sync item in Redis
   */
  private async updateSyncItem(item: SyncItem): Promise<void> {
    if (!cacheService.connected) {
      // Update in fallback queue
      const queue = this.fallbackSyncQueue.get(item.clientId) || [];
      const index = queue.findIndex(i => i.id === item.id);
      if (index >= 0) {
        queue[index] = item;
      }
      return;
    }

    const itemKey = `${SYNC_KEYS.ITEM}${item.id}`;
    await cacheService.set(itemKey, item, SYNC_TTL.ITEM);
  }

  /**
   * Remove a sync item from Redis
   */
  private async removeSyncItem(clientId: string, itemId: string): Promise<void> {
    if (!cacheService.connected) {
      const queue = this.fallbackSyncQueue.get(clientId) || [];
      this.fallbackSyncQueue.set(clientId, queue.filter(i => i.id !== itemId));
      return;
    }

    const queueKey = `${SYNC_KEYS.QUEUE}${clientId}`;
    const itemKey = `${SYNC_KEYS.ITEM}${itemId}`;

    await cacheService.zrem(queueKey, itemId);
    await cacheService.del(itemKey);
  }

  /**
   * Check if client is currently processing
   */
  private async isProcessing(clientId: string): Promise<boolean> {
    if (!cacheService.connected) {
      return this.fallbackProcessingBatches.has(clientId);
    }

    const processingKey = `${SYNC_KEYS.PROCESSING}${clientId}`;
    const value = await cacheService.get<boolean>(processingKey);
    return value === true;
  }

  /**
   * Set processing state for a client
   */
  private async setProcessing(clientId: string, processing: boolean): Promise<void> {
    if (!cacheService.connected) {
      if (processing) {
        this.fallbackProcessingBatches.add(clientId);
      } else {
        this.fallbackProcessingBatches.delete(clientId);
      }
      return;
    }

    const processingKey = `${SYNC_KEYS.PROCESSING}${clientId}`;
    if (processing) {
      await cacheService.set(processingKey, true, SYNC_TTL.PROCESSING);
    } else {
      await cacheService.del(processingKey);
    }
  }

  /**
   * Process sync queue for a client with Redis persistence
   * Enforces tenant isolation by validating businessId on all items
   */
  async processQueue(clientId: string, businessId: string, config?: Partial<SyncConfig>): Promise<SyncResult[]> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const results: SyncResult[] = [];

    // CRITICAL: Validate businessId is provided for tenant isolation
    if (!businessId) {
      throw new Error('Business ID is required for sync processing');
    }

    // Check if already processing (distributed-safe)
    if (await this.isProcessing(clientId)) {
      throw new Error('Sync already in progress for this client');
    }

    // Try to acquire processing lock
    const lockResult = await cacheService.acquireLock(`sync:${clientId}`, SYNC_TTL.LOCK * 1000);
    if (!lockResult.acquired && cacheService.connected) {
      throw new Error('Could not acquire sync lock - another process may be syncing');
    }

    await this.setProcessing(clientId, true);

    try {
      // Get pending items from Redis or fallback
      let pendingItems = await this.getQueueItems(clientId, SyncStatus.PENDING);

      // TENANT ISOLATION: Filter items to only process those belonging to this business
      // This prevents a compromised client from processing another business's data
      pendingItems = pendingItems.filter(item => {
        if (item.businessId !== businessId) {
          console.warn(`Sync item ${item.id} rejected: businessId mismatch (expected: ${businessId}, got: ${item.businessId})`);
          return false;
        }
        return true;
      });

      // Process in batches
      const batches = this.chunkArray(pendingItems, mergedConfig.batchSize);

      for (const batch of batches) {
        const batchResults = await this.processBatch(batch, clientId, mergedConfig);
        results.push(...batchResults);
      }

      // Clean up completed items
      for (const result of results) {
        if (result.status === SyncStatus.COMPLETED) {
          await this.removeSyncItem(clientId, result.itemId);
        }
      }

    } finally {
      await this.setProcessing(clientId, false);

      // Release lock if acquired
      if (lockResult.acquired && cacheService.connected) {
        await cacheService.releaseLock(`sync:${clientId}`, lockResult.lockId);
      }
    }

    return results;
  }

  /**
   * Process a batch of sync items with Redis persistence
   */
  private async processBatch(items: SyncItem[], clientId: string, config: SyncConfig): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const item of items) {
      try {
        item.status = SyncStatus.PROCESSING;
        await this.updateSyncItem(item);

        const result = await this.processItem(item, config);
        results.push(result);

        // Update item status based on result
        item.status = result.status;
        item.serverTimestamp = new Date();
        await this.updateSyncItem(item);

      } catch (error: any) {
        item.status = SyncStatus.FAILED;
        item.errorMessage = error.message;
        item.retryCount += 1;

        if (item.retryCount < config.maxRetries) {
          item.status = SyncStatus.PENDING; // Queue for retry
        }

        // Persist the failure state
        await this.updateSyncItem(item);

        results.push({
          itemId: item.id,
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          status: SyncStatus.FAILED,
          errorMessage: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Process a single sync item
   */
  private async processItem(item: SyncItem, config: SyncConfig): Promise<SyncResult> {
    // Check for conflicts first
    const conflict = await this.checkConflict(item);

    if (conflict) {
      const resolution = await this.resolveConflict(item, conflict, config.conflictResolution);
      if (!resolution.resolved) {
        return {
          itemId: item.id,
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          status: SyncStatus.CONFLICT,
          conflictData: conflict,
        };
      }
      // Use resolved data
      item.data = resolution.data;
    }

    // Apply the operation
    const result = await this.applyOperation(item);

    item.status = SyncStatus.COMPLETED;
    item.serverTimestamp = new Date();

    return result;
  }

  /**
   * Check if there's a conflict with server data
   */
  private async checkConflict(item: SyncItem): Promise<Record<string, any> | null> {
    if (item.operation === SyncOperation.CREATE) {
      return null; // No conflict possible for new items
    }

    // Get current server version
    const repository = this.getRepository(item.entityType);
    if (!repository) return null;

    const serverEntity = await repository.findOne({
      where: { id: item.entityId },
    });

    if (!serverEntity) {
      if (item.operation === SyncOperation.UPDATE) {
        // Entity was deleted on server
        return { deleted: true };
      }
      return null;
    }

    // Check version/timestamp
    const serverVersion = (serverEntity as any).version || 0;
    const serverUpdatedAt = (serverEntity as any).updatedAt;

    if (item.version !== undefined && serverVersion > item.version) {
      return serverEntity;
    }

    if (serverUpdatedAt && item.clientTimestamp < serverUpdatedAt) {
      return serverEntity;
    }

    return null;
  }

  /**
   * Resolve a conflict based on strategy
   */
  private async resolveConflict(
    item: SyncItem,
    serverData: Record<string, any>,
    strategy: ConflictResolution
  ): Promise<{ resolved: boolean; data: Record<string, any> }> {
    switch (strategy) {
      case ConflictResolution.CLIENT_WINS:
        return { resolved: true, data: item.data };

      case ConflictResolution.SERVER_WINS:
        // Don't apply client changes
        item.status = SyncStatus.COMPLETED;
        return { resolved: true, data: serverData };

      case ConflictResolution.MERGE:
        const mergedData = this.mergeData(serverData, item.data);
        return { resolved: true, data: mergedData };

      case ConflictResolution.MANUAL:
      default:
        item.status = SyncStatus.CONFLICT;
        item.conflictData = serverData;
        return { resolved: false, data: item.data };
    }
  }

  /**
   * Merge server and client data
   */
  private mergeData(serverData: Record<string, any>, clientData: Record<string, any>): Record<string, any> {
    const merged = { ...serverData };

    // Simple merge: client values override server for non-null values
    for (const [key, value] of Object.entries(clientData)) {
      if (value !== null && value !== undefined) {
        // Skip system fields
        if (['id', 'createdAt', 'updatedAt', 'version'].includes(key)) {
          continue;
        }
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Apply the sync operation to the database
   * Includes tenant isolation checks to prevent cross-business data access
   */
  private async applyOperation(item: SyncItem): Promise<SyncResult> {
    const repository = this.getRepository(item.entityType);

    if (!repository) {
      throw new Error(`Unknown entity type: ${item.entityType}`);
    }

    // CRITICAL: Ensure businessId is set for tenant isolation
    if (!item.businessId) {
      throw new Error('Business ID is required for sync operations');
    }

    // Ensure the data being synced has the correct businessId
    if (item.data && typeof item.data === 'object') {
      item.data.businessId = item.businessId;
    }

    let serverEntityId = item.entityId;

    switch (item.operation) {
      case SyncOperation.CREATE:
        // Ensure businessId is set on new entities
        const createData = { ...item.data, businessId: item.businessId };
        const created = await repository.save(createData);
        serverEntityId = (created as any).id;
        break;

      case SyncOperation.UPDATE:
        // Verify entity belongs to the same business before updating
        const existingEntity = await repository.findOne({
          where: { id: item.entityId, businessId: item.businessId } as any,
        });
        if (!existingEntity) {
          throw new Error(`Entity ${item.entityId} not found or access denied`);
        }
        await repository.update(item.entityId, { ...item.data, businessId: item.businessId });
        break;

      case SyncOperation.DELETE:
        // Verify entity belongs to the same business before deleting
        const entityToDelete = await repository.findOne({
          where: { id: item.entityId, businessId: item.businessId } as any,
        });
        if (!entityToDelete) {
          throw new Error(`Entity ${item.entityId} not found or access denied`);
        }
        await repository.delete(item.entityId);
        break;
    }

    return {
      itemId: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      status: SyncStatus.COMPLETED,
      serverEntityId,
    };
  }

  // ============ CONFLICT RESOLUTION ============

  /**
   * Get pending conflicts for manual resolution
   */
  async getPendingConflicts(clientId: string): Promise<SyncItem[]> {
    return this.getQueueItems(clientId, SyncStatus.CONFLICT);
  }

  /**
   * Manually resolve a conflict with Redis persistence
   */
  async resolveConflictManually(
    clientId: string,
    itemId: string,
    resolution: 'use_client' | 'use_server' | 'use_merged',
    mergedData?: Record<string, any>,
    resolvedBy?: string
  ): Promise<SyncResult> {
    // Find the item in Redis or fallback
    let item: SyncItem | undefined;

    if (cacheService.connected) {
      item = await cacheService.get<SyncItem>(`${SYNC_KEYS.ITEM}${itemId}`);
    } else {
      const queue = this.fallbackSyncQueue.get(clientId) || [];
      item = queue.find((i) => i.id === itemId);
    }

    if (!item) {
      throw new Error('Sync item not found');
    }

    if (item.status !== SyncStatus.CONFLICT) {
      throw new Error('Item is not in conflict status');
    }

    let dataToUse: Record<string, any>;

    switch (resolution) {
      case 'use_client':
        dataToUse = item.data;
        break;
      case 'use_server':
        dataToUse = item.conflictData!;
        break;
      case 'use_merged':
        if (!mergedData) {
          throw new Error('Merged data required for merge resolution');
        }
        dataToUse = mergedData;
        break;
    }

    item.data = dataToUse;
    item.status = SyncStatus.PENDING;
    item.resolvedBy = resolvedBy;
    item.resolvedAt = new Date();

    // Persist updated item
    await this.updateSyncItem(item);

    // Process the item
    const result = await this.processItem(item, this.defaultConfig);

    // Update final status
    item.status = result.status;
    item.serverTimestamp = new Date();
    await this.updateSyncItem(item);

    // Clean up if completed
    if (result.status === SyncStatus.COMPLETED) {
      await this.removeSyncItem(clientId, itemId);
    }

    return result;
  }

  // ============ DATA DOWNLOAD ============

  /**
   * Get data for offline use
   */
  async getOfflineData(
    businessId: string,
    entityTypes: string[],
    lastSyncTimestamp?: Date
  ): Promise<{
    timestamp: Date;
    data: Record<string, any[]>;
    checksums: Record<string, string>;
  }> {
    const result: Record<string, any[]> = {};
    const checksums: Record<string, string> = {};
    const timestamp = new Date();

    for (const entityType of entityTypes) {
      const repository = this.getRepository(entityType);
      if (!repository) continue;

      let query = repository
        .createQueryBuilder('e')
        .where('e.businessId = :businessId', { businessId });

      if (lastSyncTimestamp) {
        query = query.andWhere('e.updatedAt > :lastSync', { lastSync: lastSyncTimestamp });
      }

      const entities = await query.getMany();
      result[entityType] = entities;
      checksums[entityType] = this.generateChecksum(entities);
    }

    return { timestamp, data: result, checksums };
  }

  /**
   * Get delta updates since last sync
   */
  async getDeltaUpdates(
    businessId: string,
    lastSyncTimestamp: Date,
    entityTypes?: string[]
  ): Promise<{
    timestamp: Date;
    created: Record<string, any[]>;
    updated: Record<string, any[]>;
    deleted: Record<string, string[]>;
  }> {
    const types = entityTypes || ['product', 'category', 'customer', 'coupon'];
    const created: Record<string, any[]> = {};
    const updated: Record<string, any[]> = {};
    const deleted: Record<string, string[]> = {};

    for (const entityType of types) {
      const repository = this.getRepository(entityType);
      if (!repository) continue;

      // Get created items
      const newItems = await repository
        .createQueryBuilder('e')
        .where('e.businessId = :businessId', { businessId })
        .andWhere('e.createdAt > :lastSync', { lastSync: lastSyncTimestamp })
        .getMany();

      created[entityType] = newItems;

      // Get updated items (not including newly created)
      const updatedItems = await repository
        .createQueryBuilder('e')
        .where('e.businessId = :businessId', { businessId })
        .andWhere('e.updatedAt > :lastSync', { lastSync: lastSyncTimestamp })
        .andWhere('e.createdAt <= :lastSync', { lastSync: lastSyncTimestamp })
        .getMany();

      updated[entityType] = updatedItems;

      // Deleted items would need a soft-delete or deletion log
      deleted[entityType] = [];
    }

    return {
      timestamp: new Date(),
      created,
      updated,
      deleted,
    };
  }

  // ============ OFFLINE ORDER PROCESSING ============

  /**
   * Validate offline order for sync
   */
  async validateOfflineOrder(order: Record<string, any>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!order.items || order.items.length === 0) {
      errors.push('Order must have at least one item');
    }

    // Check products exist and have sufficient stock
    for (const item of order.items || []) {
      const product = await this.getRepository('product')?.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        errors.push(`Product ${item.productId} not found`);
        continue;
      }

      // Check stock (warning only, as stock might have changed)
      if ((product as any).stockQuantity < item.quantity) {
        warnings.push(`Product ${(product as any).name} may have insufficient stock`);
      }

      // Check price changes
      if (Math.abs((product as any).sellingPrice - item.price) > 0.01) {
        warnings.push(`Price for ${(product as any).name} has changed on server`);
      }
    }

    // Check customer if provided
    if (order.customerId) {
      const customer = await this.getRepository('customer')?.findOne({
        where: { id: order.customerId },
      });

      if (!customer) {
        warnings.push('Customer not found on server');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============ HELPERS ============

  private getRepository(entityType: string): Repository<any> | null {
    const repositoryMap: Record<string, string> = {
      product: 'Product',
      category: 'Category',
      customer: 'Customer',
      order: 'Order',
      orderItem: 'OrderItem',
      coupon: 'Coupon',
      payment: 'Payment',
      user: 'User',
    };

    const entityName = repositoryMap[entityType.toLowerCase()];
    if (!entityName) return null;

    try {
      return AppDataSource.getRepository(entityName);
    } catch {
      return null;
    }
  }

  private calculatePriority(entityType: string, operation: SyncOperation, index: number): number {
    let priority = 100 - index; // Base priority from order

    // Entity type priority
    const entityPriorities: Record<string, number> = {
      order: 1000,
      payment: 900,
      inventory: 800,
      customer: 500,
      product: 400,
      category: 300,
    };

    priority += entityPriorities[entityType.toLowerCase()] || 0;

    // Operation priority
    if (operation === SyncOperation.CREATE) priority += 50;
    else if (operation === SyncOperation.UPDATE) priority += 30;
    else if (operation === SyncOperation.DELETE) priority += 10;

    return priority;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private generateChecksum(data: any[]): string {
    // Simple checksum based on content
    const content = JSON.stringify(data.map((d) => ({
      id: d.id,
      updatedAt: d.updatedAt,
    })));

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return hash.toString(16);
  }

  // ============ SYNC STATUS ============

  /**
   * Get sync status for a client with Redis support
   */
  async getSyncStatus(clientId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    conflicts: number;
    isProcessing: boolean;
  }> {
    const queue = await this.getQueueItems(clientId);
    const isProcessing = await this.isProcessing(clientId);

    return {
      pending: queue.filter((i) => i.status === SyncStatus.PENDING).length,
      processing: queue.filter((i) => i.status === SyncStatus.PROCESSING).length,
      completed: queue.filter((i) => i.status === SyncStatus.COMPLETED).length,
      failed: queue.filter((i) => i.status === SyncStatus.FAILED).length,
      conflicts: queue.filter((i) => i.status === SyncStatus.CONFLICT).length,
      isProcessing,
    };
  }

  /**
   * Clear sync queue for a client with Redis support
   */
  async clearQueue(clientId: string, statusFilter?: SyncStatus): Promise<void> {
    if (!cacheService.connected) {
      // Fallback to in-memory
      if (statusFilter) {
        const queue = this.fallbackSyncQueue.get(clientId) || [];
        this.fallbackSyncQueue.set(
          clientId,
          queue.filter((i) => i.status !== statusFilter)
        );
      } else {
        this.fallbackSyncQueue.delete(clientId);
      }
      return;
    }

    const queue = await this.getQueueItems(clientId);
    const itemsToRemove = statusFilter
      ? queue.filter(i => i.status === statusFilter)
      : queue;

    // Remove items from Redis
    for (const item of itemsToRemove) {
      await this.removeSyncItem(clientId, item.id);
    }
  }

  /**
   * Retry failed items with Redis support
   */
  async retryFailed(clientId: string): Promise<SyncResult[]> {
    const failedItems = await this.getQueueItems(clientId, SyncStatus.FAILED);
    const retryableItems = failedItems.filter(
      (i) => i.retryCount < this.defaultConfig.maxRetries
    );

    // Reset status to pending
    for (const item of retryableItems) {
      item.status = SyncStatus.PENDING;
      await this.updateSyncItem(item);
    }

    if (retryableItems.length === 0) {
      return [];
    }

    return this.processQueue(clientId, retryableItems[0]?.businessId || '');
  }

  /**
   * Get batch information
   */
  async getBatchInfo(batchId: string): Promise<SyncBatch | null> {
    return cacheService.get<SyncBatch>(`${SYNC_KEYS.BATCH}${batchId}`);
  }

  /**
   * Migrate in-memory data to Redis (for startup sync)
   */
  async migrateToRedis(): Promise<{ migrated: number; errors: number }> {
    if (!cacheService.connected) {
      return { migrated: 0, errors: 0 };
    }

    let migrated = 0;
    let errors = 0;

    for (const [clientId, items] of this.fallbackSyncQueue.entries()) {
      try {
        const batchId = uuidv4();
        await this.persistQueueItems(clientId, batchId, items);
        migrated += items.length;
        this.fallbackSyncQueue.delete(clientId);
      } catch (error) {
        errors += items.length;
        console.error(`Failed to migrate sync queue for client ${clientId}:`, error);
      }
    }

    return { migrated, errors };
  }

  /**
   * Cleanup expired items from Redis
   */
  async cleanupExpired(): Promise<number> {
    if (!cacheService.connected) {
      return 0;
    }

    // In production, expired items are automatically cleaned up by Redis TTL
    // This method can be used for manual cleanup of orphaned data
    let cleaned = 0;

    // Note: Full cleanup would require scanning Redis keys
    // For now, we rely on TTL-based expiration

    return cleaned;
  }
}

export const offlineSyncService = new OfflineSyncService();
