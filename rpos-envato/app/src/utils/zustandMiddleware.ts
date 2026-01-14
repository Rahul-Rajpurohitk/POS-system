import { Platform } from 'react-native';
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

// On web, we skip persist/immer middleware due to ESM compatibility issues
// On native (iOS/Android), we use them normally

type PopArgument<T extends (...a: never[]) => unknown> = T extends (
  ...a: [...infer A, infer _]
) => infer R
  ? (...a: A) => R
  : never;

// Helper to conditionally apply middleware only on native platforms
export function createPlatformStore<T>(
  nativeCreator: () => any,
  webCreator: StateCreator<T>
): StateCreator<T> {
  if (Platform.OS === 'web') {
    return webCreator;
  }
  return nativeCreator() as StateCreator<T>;
}

// Simple in-memory storage for web (no persistence)
export const webStorage = {
  state: {} as Record<string, any>,
  getItem: (name: string) => webStorage.state[name] || null,
  setItem: (name: string, value: any) => { webStorage.state[name] = value; },
  removeItem: (name: string) => { delete webStorage.state[name]; },
};
