import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider, Theme } from 'tamagui';
import NetInfo from '@react-native-community/netinfo';

import config from './tamagui.config';
import { queryClient } from '@/services/api/queryClient';
import { RootNavigator } from '@/navigation';
import { useSettingsStore, useSyncStore, useAuthStore } from '@/store';
import { startSyncListener } from '@/services/sync';

function AppContent() {
  const systemColorScheme = useColorScheme();
  const { settings, hydrate: hydrateSettings } = useSettingsStore();
  const { hydrate: hydrateSyncStore, setOnline } = useSyncStore();
  const { hydrate: hydrateAuth } = useAuthStore();

  // Hydrate stores on mount
  useEffect(() => {
    const hydrateStores = async () => {
      await hydrateSettings();
      await hydrateAuth();
      await hydrateSyncStore();
    };

    hydrateStores();
  }, []);

  // Start sync listener for offline queue
  useEffect(() => {
    const cleanup = startSyncListener();
    return cleanup;
  }, []);

  // Monitor network status
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Set initial status
      setOnline(navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // For native platforms (iOS/Android), use NetInfo
      const unsubscribe = NetInfo.addEventListener(state => {
        setOnline(state.isConnected ?? true);
      });

      // Check initial network state
      NetInfo.fetch().then(state => {
        setOnline(state.isConnected ?? true);
      });

      return () => unsubscribe();
    }
  }, [setOnline]);

  // Determine theme
  const isDark = settings.darkMode ?? systemColorScheme === 'dark';

  return (
    <TamaguiProvider config={config}>
      <Theme name={isDark ? 'dark' : 'light'}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#1a1a1a' : '#ffffff'}
        />
        <RootNavigator />
      </Theme>
    </TamaguiProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
