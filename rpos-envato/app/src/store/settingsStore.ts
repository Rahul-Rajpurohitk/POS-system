import { create } from 'zustand';
import type { AppSettings, Language, Currency, PrinterDevice } from '@/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface SettingsStore {
  settings: AppSettings;
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

  // Hydration
  hydrate: () => Promise<void>;
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

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  settings: defaultSettings,
  notifications: [],
  unreadCount: 0,

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  setLanguage: (language) =>
    set((state) => ({
      settings: { ...state.settings, language },
    })),

  setCurrency: (currency) =>
    set((state) => ({
      settings: { ...state.settings, currency },
    })),

  setTax: (tax) =>
    set((state) => ({
      settings: { ...state.settings, tax },
    })),

  setStoreName: (name) =>
    set((state) => ({
      settings: { ...state.settings, storeName: name },
    })),

  toggleDarkMode: () =>
    set((state) => ({
      settings: { ...state.settings, isDarkMode: !state.settings.isDarkMode },
    })),

  setDarkMode: (isDark) =>
    set((state) => ({
      settings: { ...state.settings, isDarkMode: isDark },
    })),

  setOfflineMode: (isOffline) =>
    set((state) => ({
      settings: { ...state.settings, isOfflineMode: isOffline },
    })),

  setConnectedPrinter: (device) =>
    set((state) => ({
      settings: { ...state.settings, connectedPrinter: device || undefined },
    })),

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  hydrate: async () => {
    // No-op for web
  },
}));

// Selectors
export const selectSettings = (state: SettingsStore) => state.settings;
export const selectIsDarkMode = (state: SettingsStore) => state.settings.isDarkMode;
export const selectIsOfflineMode = (state: SettingsStore) => state.settings.isOfflineMode;
export const selectCurrency = (state: SettingsStore) => state.settings.currency;
export const selectTax = (state: SettingsStore) => state.settings.tax;
export const selectNotifications = (state: SettingsStore) => state.notifications;
export const selectUnreadCount = (state: SettingsStore) => state.unreadCount;
