import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, Language, Currency, PrinterDevice } from '@/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface SettingsStore {
  // Settings state
  settings: AppSettings;

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  setTax: (tax: number) => void;
  setStoreName: (name: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  setOfflineMode: (isOffline: boolean) => void;
  setConnectedPrinter: (device: PrinterDevice | null) => void;

  // Notification actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const defaultSettings: AppSettings = {
  language: { code: 'en', name: 'English' },
  currency: { code: 'USD', symbol: '$', name: 'US Dollar', isSuffix: false },
  tax: 0,
  storeName: 'My Store',
  isDarkMode: false,
  isOfflineMode: false,
  connectedPrinter: undefined,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      settings: defaultSettings,
      notifications: [],
      unreadCount: 0,

      // Settings actions
      updateSettings: (partial) =>
        set((state) => {
          Object.assign(state.settings, partial);
        }),

      setLanguage: (language) =>
        set((state) => {
          state.settings.language = language;
        }),

      setCurrency: (currency) =>
        set((state) => {
          state.settings.currency = currency;
        }),

      setTax: (tax) =>
        set((state) => {
          state.settings.tax = tax;
        }),

      setStoreName: (name) =>
        set((state) => {
          state.settings.storeName = name;
        }),

      toggleDarkMode: () =>
        set((state) => {
          state.settings.isDarkMode = !state.settings.isDarkMode;
        }),

      setDarkMode: (isDark) =>
        set((state) => {
          state.settings.isDarkMode = isDark;
        }),

      setOfflineMode: (isOffline) =>
        set((state) => {
          state.settings.isOfflineMode = isOffline;
        }),

      setConnectedPrinter: (device) =>
        set((state) => {
          state.settings.connectedPrinter = device ?? undefined;
        }),

      // Notification actions
      setNotifications: (notifications) =>
        set((state) => {
          state.notifications = notifications;
          state.unreadCount = notifications.filter((n) => !n.read).length;
        }),

      addNotification: (notification) =>
        set((state) => {
          state.notifications.unshift(notification);
          if (!notification.read) {
            state.unreadCount += 1;
          }
        }),

      markAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadCount -= 1;
          }
        }),

      markAllAsRead: () =>
        set((state) => {
          state.notifications.forEach((n) => {
            n.read = true;
          });
          state.unreadCount = 0;
        }),

      clearNotifications: () =>
        set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
        }),
    })),
    {
      name: 'pos-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selectors
export const selectSettings = (state: SettingsStore) => state.settings;
export const selectIsDarkMode = (state: SettingsStore) => state.settings.isDarkMode;
export const selectIsOfflineMode = (state: SettingsStore) => state.settings.isOfflineMode;
export const selectCurrency = (state: SettingsStore) => state.settings.currency;
export const selectTax = (state: SettingsStore) => state.settings.tax;
export const selectNotifications = (state: SettingsStore) => state.notifications;
export const selectUnreadCount = (state: SettingsStore) => state.unreadCount;
