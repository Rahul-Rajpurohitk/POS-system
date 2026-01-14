import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider, Theme } from 'tamagui';

import config from './tamagui.config';
import { queryClient } from '@/services/api/queryClient';
import { useSettingsStore, useAuthStore, useSyncStore } from '@/store';
import { RootNavigator } from '@/navigation';

function AppContent() {
  const systemColorScheme = useColorScheme();
  const { settings } = useSettingsStore();
  const isDark = settings.isDarkMode ?? systemColorScheme === 'dark';

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

function AppLoader() {
  const [isReady, setIsReady] = useState(false);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateSync = useSyncStore((state) => state.hydrate);

  useEffect(() => {
    async function prepare() {
      try {
        // Hydrate stores (no-op on web, but needed for native)
        await Promise.all([
          hydrateSettings(),
          hydrateAuth(),
          hydrateSync(),
        ]);
      } catch (e) {
        console.warn('Hydration error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, [hydrateSettings, hydrateAuth, hydrateSync]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return <AppContent />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppLoader />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
