import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create Query Client with sensible defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Persisted query storage key
const QUERY_CACHE_KEY = 'pos-query-cache';

// Save query cache to AsyncStorage
export async function persistQueryCache(): Promise<void> {
  try {
    const cache = queryClient.getQueryCache().getAll();
    const serializable = cache
      .filter((query) => query.state.status === 'success')
      .map((query) => ({
        queryKey: query.queryKey,
        state: query.state,
      }));

    await AsyncStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('Failed to persist query cache:', error);
  }
}

// Restore query cache from AsyncStorage
export async function restoreQueryCache(): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(QUERY_CACHE_KEY);
    if (cached) {
      const queries = JSON.parse(cached);
      queries.forEach(
        ({ queryKey, state }: { queryKey: unknown[]; state: unknown }) => {
          queryClient.setQueryData(queryKey, state);
        }
      );
    }
  } catch (error) {
    console.warn('Failed to restore query cache:', error);
  }
}

// Clear query cache
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await AsyncStorage.removeItem(QUERY_CACHE_KEY);
}
