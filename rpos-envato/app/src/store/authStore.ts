import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Staff, AuthState } from '@/types';

interface AuthStore extends AuthState {
  // Staff management
  staffs: Staff[];

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
}

export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      staffs: [],

      // Auth actions
      setAuth: (user, token) =>
        set((state) => {
          state.user = user;
          state.token = token;
          state.isAuthenticated = true;
        }),

      updateUser: (userData) =>
        set((state) => {
          if (state.user) {
            Object.assign(state.user, userData);
          }
        }),

      setToken: (token) =>
        set((state) => {
          state.token = token;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          state.staffs = [];
        }),

      // Staff actions
      setStaffs: (staffs) =>
        set((state) => {
          state.staffs = staffs;
        }),

      addStaff: (staff) =>
        set((state) => {
          state.staffs.push(staff);
        }),

      updateStaff: (id, data) =>
        set((state) => {
          const index = state.staffs.findIndex((s) => s.id === id);
          if (index !== -1) {
            Object.assign(state.staffs[index], data);
          }
        }),

      removeStaff: (id) =>
        set((state) => {
          state.staffs = state.staffs.filter((s) => s.id !== id);
        }),
    })),
    {
      name: 'pos-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        staffs: state.staffs,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: AuthStore) => state.user;
export const selectToken = (state: AuthStore) => state.token;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectStaffs = (state: AuthStore) => state.staffs;
