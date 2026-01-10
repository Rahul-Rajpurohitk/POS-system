import { useSyncStore } from '@/store';
import { productsApi } from '@/features/products/api';
import { ordersApi } from '@/features/orders/api';
import { categoriesApi } from '@/features/categories/api';
import { customersApi } from '@/features/customers/api';
import { couponsApi } from '@/features/coupons/api';
import type { SyncQueueItem } from '@/store/syncStore';

type EntityType = 'product' | 'order' | 'category' | 'customer' | 'coupon';

interface SyncResult {
  success: boolean;
  localId: string;
  serverId?: string;
  error?: string;
}

const apiMap: Record<EntityType, {
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}> = {
  product: {
    create: productsApi.create,
    update: productsApi.update,
    delete: productsApi.delete,
  },
  order: {
    create: ordersApi.create,
    update: ordersApi.update,
    delete: ordersApi.delete,
  },
  category: {
    create: categoriesApi.create,
    update: categoriesApi.update,
    delete: categoriesApi.delete,
  },
  customer: {
    create: customersApi.create,
    update: customersApi.update,
    delete: customersApi.delete,
  },
  coupon: {
    create: couponsApi.create,
    update: couponsApi.update,
    delete: couponsApi.delete,
  },
};

async function syncItem(item: SyncQueueItem): Promise<SyncResult> {
  const api = apiMap[item.entity as EntityType];

  if (!api) {
    return {
      success: false,
      localId: item.localId || '',
      error: `Unknown entity type: ${item.entity}`,
    };
  }

  try {
    let response;

    switch (item.type) {
      case 'create':
        response = await api.create(item.data);
        return {
          success: true,
          localId: item.localId || '',
          serverId: response.data.id,
        };

      case 'update':
        const { id, ...updateData } = item.data;
        // If it's a local ID, we need to find the server ID first
        if (id?.startsWith('local-')) {
          // This would need to be resolved from a mapping of local -> server IDs
          console.warn('Cannot update item with local ID:', id);
          return {
            success: false,
            localId: item.localId || '',
            error: 'Cannot update local item',
          };
        }
        response = await api.update(id, updateData);
        return {
          success: true,
          localId: item.localId || '',
          serverId: response.data.id,
        };

      case 'delete':
        const deleteId = item.data.id;
        if (deleteId?.startsWith('local-')) {
          // Local-only item, just remove from queue
          return {
            success: true,
            localId: item.localId || '',
          };
        }
        await api.delete(deleteId);
        return {
          success: true,
          localId: item.localId || '',
        };

      default:
        return {
          success: false,
          localId: item.localId || '',
          error: `Unknown operation type: ${item.type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      localId: item.localId || '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const { queue, removeFromQueue, setSyncing } = useSyncStore.getState();

  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  setSyncing(true);

  let synced = 0;
  let failed = 0;
  const localToServerIdMap: Record<string, string> = {};

  for (const item of queue) {
    // Replace local IDs with server IDs in the data
    const resolvedItem = resolveLocalIds(item, localToServerIdMap);

    const result = await syncItem(resolvedItem);

    if (result.success) {
      synced++;
      removeFromQueue(item.id);

      // Store the mapping for future items
      if (result.localId && result.serverId) {
        localToServerIdMap[result.localId] = result.serverId;
      }
    } else {
      failed++;
      console.error('Sync failed for item:', item.id, result.error);

      // If it's a critical error, stop syncing
      if (result.error?.includes('Cannot update local item')) {
        continue;
      }
    }
  }

  setSyncing(false);

  return { synced, failed };
}

function resolveLocalIds(item: SyncQueueItem, idMap: Record<string, string>): SyncQueueItem {
  const resolvedData = { ...item.data };

  // Replace any local IDs in the data with server IDs
  for (const [key, value] of Object.entries(resolvedData)) {
    if (typeof value === 'string' && value.startsWith('local-') && idMap[value]) {
      resolvedData[key] = idMap[value];
    }
  }

  // Handle nested arrays (e.g., order items)
  if (Array.isArray(resolvedData.items)) {
    resolvedData.items = resolvedData.items.map((subItem: any) => {
      const resolved = { ...subItem };
      for (const [key, value] of Object.entries(resolved)) {
        if (typeof value === 'string' && value.startsWith('local-') && idMap[value]) {
          resolved[key] = idMap[value];
        }
      }
      return resolved;
    });
  }

  return { ...item, data: resolvedData };
}

export function startSyncListener() {
  // Listen for network changes and sync when online
  // This would use NetInfo in a real implementation

  const checkAndSync = async () => {
    const { isOnline, queue } = useSyncStore.getState();

    if (isOnline && queue.length > 0) {
      console.log('Network online, syncing queue...');
      const result = await syncQueue();
      console.log('Sync complete:', result);
    }
  };

  // Check every 30 seconds
  const interval = setInterval(checkAndSync, 30000);

  // Initial check
  checkAndSync();

  return () => clearInterval(interval);
}
