import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Get pending items for sync
  getPendingOrders: () => Order[];
  getPendingProducts: () => Product[];
  getPendingCustomers: () => Customer[];
  getPendingCoupons: () => Coupon[];
  getPendingCategories: () => Category[];
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

export const useSyncStore = create<SyncStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      queue: emptyQueue,
      isSyncing: false,
      lastSyncAt: null,
      syncErrors: [],

      // Add to queue actions
      addOrderToQueue: (order) =>
        set((state) => {
          // Avoid duplicates
          const exists = state.queue.orders.some((o) => o.id === order.id);
          if (!exists) {
            state.queue.orders.push(order);
          } else {
            // Update existing
            const index = state.queue.orders.findIndex((o) => o.id === order.id);
            state.queue.orders[index] = order;
          }
        }),

      addProductToQueue: (product) =>
        set((state) => {
          const exists = state.queue.products.some((p) => p.id === product.id);
          if (!exists) {
            state.queue.products.push(product);
          } else {
            const index = state.queue.products.findIndex(
              (p) => p.id === product.id
            );
            state.queue.products[index] = product;
          }
        }),

      addCustomerToQueue: (customer) =>
        set((state) => {
          const exists = state.queue.customers.some((c) => c.id === customer.id);
          if (!exists) {
            state.queue.customers.push(customer);
          } else {
            const index = state.queue.customers.findIndex(
              (c) => c.id === customer.id
            );
            state.queue.customers[index] = customer;
          }
        }),

      addCouponToQueue: (coupon) =>
        set((state) => {
          const exists = state.queue.coupons.some((c) => c.id === coupon.id);
          if (!exists) {
            state.queue.coupons.push(coupon);
          } else {
            const index = state.queue.coupons.findIndex(
              (c) => c.id === coupon.id
            );
            state.queue.coupons[index] = coupon;
          }
        }),

      addCategoryToQueue: (category) =>
        set((state) => {
          const exists = state.queue.categories.some(
            (c) => c.id === category.id
          );
          if (!exists) {
            state.queue.categories.push(category);
          } else {
            const index = state.queue.categories.findIndex(
              (c) => c.id === category.id
            );
            state.queue.categories[index] = category;
          }
        }),

      // Mark deleted
      markProductDeleted: (id) =>
        set((state) => {
          if (!state.queue.deletedIds.products.includes(id)) {
            state.queue.deletedIds.products.push(id);
          }
        }),

      markCustomerDeleted: (id) =>
        set((state) => {
          if (!state.queue.deletedIds.customers.includes(id)) {
            state.queue.deletedIds.customers.push(id);
          }
        }),

      markCouponDeleted: (id) =>
        set((state) => {
          if (!state.queue.deletedIds.coupons.includes(id)) {
            state.queue.deletedIds.coupons.push(id);
          }
        }),

      markCategoryDeleted: (id) =>
        set((state) => {
          if (!state.queue.deletedIds.categories.includes(id)) {
            state.queue.deletedIds.categories.push(id);
          }
        }),

      markStaffDeleted: (id) =>
        set((state) => {
          if (!state.queue.deletedIds.staffs.includes(id)) {
            state.queue.deletedIds.staffs.push(id);
          }
        }),

      // Queue management
      removeFromQueue: (type, id) =>
        set((state) => {
          const queue = state.queue[type] as Array<{ id: ID }>;
          state.queue[type] = queue.filter((item) => item.id !== id) as never;
        }),

      clearDeletedId: (type, id) =>
        set((state) => {
          state.queue.deletedIds[type] = state.queue.deletedIds[type].filter(
            (deletedId) => deletedId !== id
          );
        }),

      clearQueue: () =>
        set((state) => {
          state.queue = emptyQueue;
          state.syncErrors = [];
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
      setSyncing: (isSyncing) =>
        set((state) => {
          state.isSyncing = isSyncing;
        }),

      setLastSyncAt: (timestamp) =>
        set((state) => {
          state.lastSyncAt = timestamp;
        }),

      addSyncError: (error) =>
        set((state) => {
          state.syncErrors.push(error);
        }),

      clearSyncErrors: () =>
        set((state) => {
          state.syncErrors = [];
        }),

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
    })),
    {
      name: 'pos-sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selectors
export const selectSyncQueue = (state: SyncStore) => state.queue;
export const selectIsSyncing = (state: SyncStore) => state.isSyncing;
export const selectSyncErrors = (state: SyncStore) => state.syncErrors;
export const selectQueueCount = (state: SyncStore) => state.getQueueCount();
