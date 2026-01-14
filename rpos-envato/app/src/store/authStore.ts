import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Staff, AuthState } from '@/types';

const AUTH_STORAGE_KEY = 'pos-auth-state';

interface AuthStore extends AuthState {
  // Staff management
  staffs: Staff[];
  _hasHydrated: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  updateUser: (userData: Partial<User>) => void;
  setToken: (token: string) => void;
  logout: () => void;

  // Staff actions
  setStaffs: (staffs: Staff[]) => void;
  addStaff: (staff: Staff) => void;
  updateStaff: (id: string, data: Partial<Staff>) => void;
  removeStaff: (id: string) => void;

  // Hydration
  hydrate: () => Promise<void>;
}

// Helper to persist auth state
const persistAuthState = async (user: User | null, token: string | null) => {
  try {
    if (Platform.OS === 'web') {
      if (user && token) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } else {
      if (user && token) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.warn('Failed to persist auth state:', error);
  }
};

// Store creator function
const createAuthStore = (set: any, get: any) => ({
  // Initial state
  user: null,
  token: null,
  isAuthenticated: false,
  staffs: [],
  _hasHydrated: false,

  // Auth actions
  setAuth: (user: User, token: string) => {
    set({ user, token, isAuthenticated: true });
    persistAuthState(user, token);
  },

  updateUser: (userData: Partial<User>) => {
    set((state: AuthStore) => {
      const updatedUser = state.user ? { ...state.user, ...userData } : null;
      if (updatedUser && state.token) {
        persistAuthState(updatedUser, state.token);
      }
      return { user: updatedUser };
    });
  },

  setToken: (token: string) => {
    set({ token });
    const state = get();
    if (state.user) {
      persistAuthState(state.user, token);
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      staffs: [],
    });
    persistAuthState(null, null);
  },

  // Staff actions
  setStaffs: (staffs: Staff[]) => set({ staffs }),

  addStaff: (staff: Staff) =>
    set((state: AuthStore) => ({
      staffs: [...state.staffs, staff],
    })),

  updateStaff: (id: string, data: Partial<Staff>) =>
    set((state: AuthStore) => ({
      staffs: state.staffs.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    })),

  removeStaff: (id: string) =>
    set((state: AuthStore) => ({
      staffs: state.staffs.filter((s) => s.id !== id),
    })),

  // Hydration - restore state from storage
  hydrate: async () => {
    try {
      let stored: string | null = null;

      if (Platform.OS === 'web') {
        stored = localStorage.getItem(AUTH_STORAGE_KEY);
      } else {
        stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      }

      if (stored) {
        const { user, token } = JSON.parse(stored);
        if (user && token) {
          set({ user, token, isAuthenticated: true, _hasHydrated: true });
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate auth state:', error);
    }
    set({ _hasHydrated: true });
  },
});

// Create store - simple version without middleware for web compatibility
export const useAuthStore = create<AuthStore>()(createAuthStore);

// Selectors
export const selectUser = (state: AuthStore) => state.user;
export const selectToken = (state: AuthStore) => state.token;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectStaffs = (state: AuthStore) => state.staffs;
