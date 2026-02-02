import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DriverProfile,
  Delivery,
  DriverStatus,
  LocationUpdate,
  DriverStats,
} from '@/types';

const DRIVER_STORAGE_KEY = 'pos-driver-state';

interface DriverStore {
  // Profile
  profile: DriverProfile | null;
  isOnline: boolean;
  status: DriverStatus;

  // Active delivery
  activeDelivery: Delivery | null;
  pendingDeliveries: Delivery[];

  // Location
  currentLocation: LocationUpdate | null;
  isTrackingLocation: boolean;

  // Stats
  stats: DriverStats | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Hydration
  _hasHydrated: boolean;

  // Actions - Profile
  setProfile: (profile: DriverProfile) => void;
  updateProfile: (data: Partial<DriverProfile>) => void;
  clearProfile: () => void;

  // Actions - Status
  setStatus: (status: DriverStatus) => void;
  goOnline: () => void;
  goOffline: () => void;
  goOnBreak: () => void;

  // Actions - Delivery
  setActiveDelivery: (delivery: Delivery | null) => void;
  updateActiveDelivery: (data: Partial<Delivery>) => void;
  setPendingDeliveries: (deliveries: Delivery[]) => void;
  addPendingDelivery: (delivery: Delivery) => void;
  removePendingDelivery: (deliveryId: string) => void;

  // Actions - Location
  setCurrentLocation: (location: LocationUpdate) => void;
  setIsTrackingLocation: (isTracking: boolean) => void;

  // Actions - Stats
  setStats: (stats: DriverStats) => void;
  incrementDeliveryCount: () => void;

  // Actions - UI
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Hydration
  hydrate: () => Promise<void>;
}

// Helper to persist driver state
const persistDriverState = async (profile: DriverProfile | null) => {
  try {
    if (Platform.OS === 'web') {
      if (profile) {
        localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify({ profile }));
      } else {
        localStorage.removeItem(DRIVER_STORAGE_KEY);
      }
    } else {
      if (profile) {
        await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify({ profile }));
      } else {
        await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.warn('Failed to persist driver state:', error);
  }
};

const createDriverStore = (set: any, get: any) => ({
  // Initial state
  profile: null,
  isOnline: false,
  status: 'offline' as DriverStatus,
  activeDelivery: null,
  pendingDeliveries: [],
  currentLocation: null,
  isTrackingLocation: false,
  stats: null,
  isLoading: false,
  error: null,
  _hasHydrated: false,

  // Profile actions
  setProfile: (profile: DriverProfile) => {
    set({
      profile,
      status: profile.status,
      isOnline: profile.status === 'available' || profile.status === 'busy',
    });
    persistDriverState(profile);
  },

  updateProfile: (data: Partial<DriverProfile>) => {
    set((state: DriverStore) => {
      const updatedProfile = state.profile ? { ...state.profile, ...data } : null;
      if (updatedProfile) {
        persistDriverState(updatedProfile);
      }
      return {
        profile: updatedProfile,
        status: data.status ?? state.status,
        isOnline: data.status
          ? data.status === 'available' || data.status === 'busy'
          : state.isOnline,
      };
    });
  },

  clearProfile: () => {
    set({
      profile: null,
      isOnline: false,
      status: 'offline' as DriverStatus,
      activeDelivery: null,
      pendingDeliveries: [],
      stats: null,
    });
    persistDriverState(null);
  },

  // Status actions
  setStatus: (status: DriverStatus) => {
    set((state: DriverStore) => {
      const updatedProfile = state.profile ? { ...state.profile, status } : null;
      if (updatedProfile) {
        persistDriverState(updatedProfile);
      }
      return {
        status,
        isOnline: status === 'available' || status === 'busy',
        profile: updatedProfile,
      };
    });
  },

  goOnline: () => {
    const state = get();
    if (state.activeDelivery) {
      state.setStatus('busy');
    } else {
      state.setStatus('available');
    }
  },

  goOffline: () => {
    get().setStatus('offline');
  },

  goOnBreak: () => {
    get().setStatus('on_break');
  },

  // Delivery actions
  setActiveDelivery: (delivery: Delivery | null) => {
    set((state: DriverStore) => ({
      activeDelivery: delivery,
      status: delivery ? 'busy' : (state.isOnline ? 'available' : 'offline'),
    }));
  },

  updateActiveDelivery: (data: Partial<Delivery>) => {
    set((state: DriverStore) => ({
      activeDelivery: state.activeDelivery
        ? { ...state.activeDelivery, ...data }
        : null,
    }));
  },

  setPendingDeliveries: (deliveries: Delivery[]) => {
    set({ pendingDeliveries: deliveries });
  },

  addPendingDelivery: (delivery: Delivery) => {
    set((state: DriverStore) => ({
      pendingDeliveries: [...state.pendingDeliveries, delivery],
    }));
  },

  removePendingDelivery: (deliveryId: string) => {
    set((state: DriverStore) => ({
      pendingDeliveries: state.pendingDeliveries.filter((d) => d.id !== deliveryId),
    }));
  },

  // Location actions
  setCurrentLocation: (location: LocationUpdate) => {
    set({ currentLocation: location });
  },

  setIsTrackingLocation: (isTracking: boolean) => {
    set({ isTrackingLocation: isTracking });
  },

  // Stats actions
  setStats: (stats: DriverStats) => {
    set({ stats });
  },

  incrementDeliveryCount: () => {
    set((state: DriverStore) => ({
      stats: state.stats
        ? {
            ...state.stats,
            totalDeliveries: state.stats.totalDeliveries + 1,
            deliveriesToday: state.stats.deliveriesToday + 1,
          }
        : null,
      profile: state.profile
        ? {
            ...state.profile,
            totalDeliveries: state.profile.totalDeliveries + 1,
            deliveriesToday: state.profile.deliveriesToday + 1,
          }
        : null,
    }));
  },

  // UI actions
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Hydration
  hydrate: async () => {
    try {
      let stored: string | null = null;

      if (Platform.OS === 'web') {
        stored = localStorage.getItem(DRIVER_STORAGE_KEY);
      } else {
        stored = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
      }

      if (stored) {
        const { profile } = JSON.parse(stored);
        if (profile) {
          set({
            profile,
            status: profile.status,
            isOnline: profile.status === 'available' || profile.status === 'busy',
            _hasHydrated: true,
          });
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate driver state:', error);
    }
    set({ _hasHydrated: true });
  },
});

// Create store
export const useDriverStore = create<DriverStore>()(createDriverStore);

// Selectors
export const selectDriverProfile = (state: DriverStore) => state.profile;
export const selectDriverStatus = (state: DriverStore) => state.status;
export const selectIsOnline = (state: DriverStore) => state.isOnline;
export const selectActiveDelivery = (state: DriverStore) => state.activeDelivery;
export const selectPendingDeliveries = (state: DriverStore) => state.pendingDeliveries;
export const selectCurrentLocation = (state: DriverStore) => state.currentLocation;
export const selectDriverStats = (state: DriverStore) => state.stats;
export const selectIsTrackingLocation = (state: DriverStore) => state.isTrackingLocation;
