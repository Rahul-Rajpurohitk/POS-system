import { create } from 'zustand';
import type {
  ID,
  Order,
  Product,
  Customer,
  Coupon,
  Category,
  SyncQueue,
} from '@/types';

interface SyncStore {
  // Queue state
  queue: SyncQueue;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncErrors: string[];
  isOnline: boolean;

  // Queue actions
  addOrderToQueue: (order: Order) => void;
  addProductToQueue: (product: Product) => void;
  addCustomerToQueue: (customer: Customer) => void;
  addCouponToQueue: (coupon: Coupon) => void;
  addCategoryToQueue: (category: Category) => void;

  // Delete tracking
  markProductDeleted: (id: ID) => void;
  markCustomerDeleted: (id: ID) => void;
  markCouponDeleted: (id: ID) => void;
  markCategoryDeleted: (id: ID) => void;
  markStaffDeleted: (id: ID) => void;

  // Queue management
  removeFromQueue: <T extends keyof Omit<SyncQueue, 'deletedIds'>>(
    type: T,
    id: ID
  ) => void;
  clearDeletedId: (type: keyof SyncQueue['deletedIds'], id: ID) => void;
  clearQueue: () => void;
  getQueueCount: () => number;

  // Sync status
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncAt: (timestamp: string) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  setOnline: (isOnline: boolean) => void;

  // Get pending items for sync
  getPendingOrders: () => Order[];
  getPendingProducts: () => Product[];
  getPendingCustomers: () => Customer[];
  getPendingCoupons: () => Coupon[];
  getPendingCategories: () => Category[];

  // Hydration
  hydrate: () => Promise<void>;
}

const emptyQueue: SyncQueue = {
  orders: [],
  products: [],
  customers: [],
  coupons: [],
  categories: [],
  deletedIds: {
    products: [],
    customers: [],
    coupons: [],
    categories: [],
    staffs: [],
  },
};

export const useSyncStore = create<SyncStore>()((set, get) => ({
  // Initial state
  queue: emptyQueue,
  isSyncing: false,
  lastSyncAt: null,
  syncErrors: [],
  isOnline: true,

  // Add to queue actions
  addOrderToQueue: (order) =>
    set((state) => {
      const exists = state.queue.orders.some((o) => o.id === order.id);
      if (!exists) {
        return {
          queue: {
            ...state.queue,
            orders: [...state.queue.orders, order],
          },
        };
      } else {
        return {
          queue: {
            ...state.queue,
            orders: state.queue.orders.map((o) =>
              o.id === order.id ? order : o
            ),
          },
        };
      }
    }),

  addProductToQueue: (product) =>
    set((state) => {
      const exists = state.queue.products.some((p) => p.id === product.id);
      if (!exists) {
        return {
          queue: {
            ...state.queue,
            products: [...state.queue.products, product],
          },
        };
      } else {
        return {
          queue: {
            ...state.queue,
            products: state.queue.products.map((p) =>
              p.id === product.id ? product : p
            ),
          },
        };
      }
    }),

  addCustomerToQueue: (customer) =>
    set((state) => {
      const exists = state.queue.customers.some((c) => c.id === customer.id);
      if (!exists) {
        return {
          queue: {
            ...state.queue,
            customers: [...state.queue.customers, customer],
          },
        };
      } else {
        return {
          queue: {
            ...state.queue,
            customers: state.queue.customers.map((c) =>
              c.id === customer.id ? customer : c
            ),
          },
        };
      }
    }),

  addCouponToQueue: (coupon) =>
    set((state) => {
      const exists = state.queue.coupons.some((c) => c.id === coupon.id);
      if (!exists) {
        return {
          queue: {
            ...state.queue,
            coupons: [...state.queue.coupons, coupon],
          },
        };
      } else {
        return {
          queue: {
            ...state.queue,
            coupons: state.queue.coupons.map((c) =>
              c.id === coupon.id ? coupon : c
            ),
          },
        };
      }
    }),

  addCategoryToQueue: (category) =>
    set((state) => {
      const exists = state.queue.categories.some((c) => c.id === category.id);
      if (!exists) {
        return {
          queue: {
            ...state.queue,
            categories: [...state.queue.categories, category],
          },
        };
      } else {
        return {
          queue: {
            ...state.queue,
            categories: state.queue.categories.map((c) =>
              c.id === category.id ? category : c
            ),
          },
        };
      }
    }),

  // Mark deleted
  markProductDeleted: (id) =>
    set((state) => {
      if (state.queue.deletedIds.products.includes(id)) {
        return state;
      }
      return {
        queue: {
          ...state.queue,
          deletedIds: {
            ...state.queue.deletedIds,
            products: [...state.queue.deletedIds.products, id],
          },
        },
      };
    }),

  markCustomerDeleted: (id) =>
    set((state) => {
      if (state.queue.deletedIds.customers.includes(id)) {
        return state;
      }
      return {
        queue: {
          ...state.queue,
          deletedIds: {
            ...state.queue.deletedIds,
            customers: [...state.queue.deletedIds.customers, id],
          },
        },
      };
    }),

  markCouponDeleted: (id) =>
    set((state) => {
      if (state.queue.deletedIds.coupons.includes(id)) {
        return state;
      }
      return {
        queue: {
          ...state.queue,
          deletedIds: {
            ...state.queue.deletedIds,
            coupons: [...state.queue.deletedIds.coupons, id],
          },
        },
      };
    }),

  markCategoryDeleted: (id) =>
    set((state) => {
      if (state.queue.deletedIds.categories.includes(id)) {
        return state;
      }
      return {
        queue: {
          ...state.queue,
          deletedIds: {
            ...state.queue.deletedIds,
            categories: [...state.queue.deletedIds.categories, id],
          },
        },
      };
    }),

  markStaffDeleted: (id) =>
    set((state) => {
      if (state.queue.deletedIds.staffs.includes(id)) {
        return state;
      }
      return {
        queue: {
          ...state.queue,
          deletedIds: {
            ...state.queue.deletedIds,
            staffs: [...state.queue.deletedIds.staffs, id],
          },
        },
      };
    }),

  // Queue management
  removeFromQueue: (type, id) =>
    set((state) => {
      const queue = state.queue[type] as Array<{ id: ID }>;
      return {
        queue: {
          ...state.queue,
          [type]: queue.filter((item) => item.id !== id),
        },
      };
    }),

  clearDeletedId: (type, id) =>
    set((state) => ({
      queue: {
        ...state.queue,
        deletedIds: {
          ...state.queue.deletedIds,
          [type]: state.queue.deletedIds[type].filter(
            (deletedId) => deletedId !== id
          ),
        },
      },
    })),

  clearQueue: () =>
    set({
      queue: emptyQueue,
      syncErrors: [],
    }),

  getQueueCount: () => {
    const { queue } = get();
    const itemCount =
      queue.orders.length +
      queue.products.length +
      queue.customers.length +
      queue.coupons.length +
      queue.categories.length;

    const deletedCount = Object.values(queue.deletedIds).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    return itemCount + deletedCount;
  },

  // Sync status
  setSyncing: (isSyncing) => set({ isSyncing }),

  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),

  addSyncError: (error) =>
    set((state) => ({
      syncErrors: [...state.syncErrors, error],
    })),

  clearSyncErrors: () => set({ syncErrors: [] }),

  setOnline: (isOnline) => set({ isOnline }),

  // Get pending items (items with local- prefix or editing status)
  getPendingOrders: () => {
    const { queue } = get();
    return queue.orders.filter(
      (o) => o.id.startsWith('local-') || o.syncStatus === 'pending'
    );
  },

  getPendingProducts: () => {
    const { queue } = get();
    return queue.products.filter(
      (p) =>
        p.id.startsWith('local-') ||
        p.status === 'editing' ||
        p.syncStatus === 'pending'
    );
  },

  getPendingCustomers: () => {
    const { queue } = get();
    return queue.customers.filter(
      (c) =>
        c.id.startsWith('local-') ||
        c.status === 'editing' ||
        c.syncStatus === 'pending'
    );
  },

  getPendingCoupons: () => {
    const { queue } = get();
    return queue.coupons.filter(
      (c) =>
        c.id.startsWith('local-') ||
        c.status === 'editing' ||
        c.syncStatus === 'pending'
    );
  },

  getPendingCategories: () => {
    const { queue } = get();
    return queue.categories.filter(
      (c) =>
        c.id.startsWith('local-') ||
        c.status === 'editing' ||
        c.syncStatus === 'pending'
    );
  },

  // Hydration stub for web
  hydrate: async () => {
    // No-op for web - on native, persistence would be handled differently
  },
}));

// Selectors
export const selectSyncQueue = (state: SyncStore) => state.queue;
export const selectIsSyncing = (state: SyncStore) => state.isSyncing;
export const selectSyncErrors = (state: SyncStore) => state.syncErrors;
export const selectQueueCount = (state: SyncStore) => state.getQueueCount();
export const selectIsOnline = (state: SyncStore) => state.isOnline;
