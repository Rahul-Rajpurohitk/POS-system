import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useDriverStore } from '@/store/driverStore';
import { useUpdateDriverLocation } from '@/features/driver/hooks';
import type { LocationUpdate } from '@/types';

export interface LocationTrackingConfig {
  /** Minimum time between updates in milliseconds (default: 5000) */
  minInterval?: number;
  /** Minimum distance in meters to trigger update (default: 10) */
  minDistance?: number;
  /** High accuracy mode (default: true for drivers) */
  highAccuracy?: boolean;
  /** Enable background tracking (default: true) */
  enableBackground?: boolean;
  /** Show activity indicator while tracking (default: true) */
  showsBackgroundLocationIndicator?: boolean;
}

export interface UseLocationTrackingResult {
  /** Current location */
  location: LocationUpdate | null;
  /** Whether tracking is active */
  isTracking: boolean;
  /** Whether location permission is granted */
  hasPermission: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Start tracking */
  startTracking: () => Promise<void>;
  /** Stop tracking */
  stopTracking: () => void;
  /** Request permission */
  requestPermission: () => Promise<boolean>;
  /** Get current location once */
  getCurrentLocation: () => Promise<LocationUpdate | null>;
}

const DEFAULT_CONFIG: Required<LocationTrackingConfig> = {
  minInterval: 5000,
  minDistance: 10,
  highAccuracy: true,
  enableBackground: true,
  showsBackgroundLocationIndicator: true,
};

/**
 * Hook for tracking driver location with background support
 */
export function useLocationTracking(
  config?: LocationTrackingConfig
): UseLocationTrackingResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Store hooks
  const { currentLocation, isTrackingLocation, setCurrentLocation, setIsTrackingLocation } =
    useDriverStore();

  // API mutation
  const updateLocationMutation = useUpdateDriverLocation();

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Request foreground permission first
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        setError('Foreground location permission denied');
        setHasPermission(false);
        return false;
      }

      // Request background permission for continuous tracking
      if (mergedConfig.enableBackground && Platform.OS !== 'web') {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();

        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission denied - tracking will pause when app is backgrounded');
        }
      }

      setHasPermission(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to request location permission');
      setHasPermission(false);
      return false;
    }
  }, [mergedConfig.enableBackground]);

  /**
   * Get current location once
   */
  const getCurrentLocation = useCallback(async (): Promise<LocationUpdate | null> => {
    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: mergedConfig.highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      });

      const update: LocationUpdate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading ?? undefined,
        speed: location.coords.speed ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };

      setCurrentLocation(update);
      return update;
    } catch (err: any) {
      setError(err.message || 'Failed to get current location');
      return null;
    }
  }, [hasPermission, mergedConfig.highAccuracy, requestPermission, setCurrentLocation]);

  /**
   * Handle location update
   */
  const handleLocationUpdate = useCallback(
    async (location: Location.LocationObject) => {
      const now = Date.now();

      // Throttle updates based on minInterval
      if (now - lastUpdateTime.current < mergedConfig.minInterval) {
        return;
      }

      lastUpdateTime.current = now;

      const update: LocationUpdate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading ?? undefined,
        speed: location.coords.speed ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };

      // Update local store
      setCurrentLocation(update);

      // Send to server
      try {
        await updateLocationMutation.mutateAsync({
          latitude: update.latitude,
          longitude: update.longitude,
          heading: update.heading,
          speed: update.speed,
        });
      } catch (err) {
        console.warn('Failed to send location update:', err);
      }
    },
    [mergedConfig.minInterval, setCurrentLocation, updateLocationMutation]
  );

  /**
   * Start location tracking
   */
  const startTracking = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return;
      }

      // Stop any existing subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: mergedConfig.highAccuracy
            ? Location.Accuracy.High
            : Location.Accuracy.Balanced,
          timeInterval: mergedConfig.minInterval,
          distanceInterval: mergedConfig.minDistance,
          mayShowUserSettingsDialog: true,
        },
        handleLocationUpdate
      );

      setIsTrackingLocation(true);

      // Get initial location immediately
      await getCurrentLocation();
    } catch (err: any) {
      setError(err.message || 'Failed to start location tracking');
      setIsTrackingLocation(false);
    }
  }, [
    hasPermission,
    requestPermission,
    mergedConfig.highAccuracy,
    mergedConfig.minInterval,
    mergedConfig.minDistance,
    handleLocationUpdate,
    setIsTrackingLocation,
    getCurrentLocation,
  ]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback((): void => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTrackingLocation(false);
  }, [setIsTrackingLocation]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isTrackingLocation
      ) {
        // App came to foreground - ensure tracking is active
        if (!locationSubscription.current) {
          startTracking();
        }
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isTrackingLocation, startTracking]);

  /**
   * Check permission on mount
   */
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    checkPermission();
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return {
    location: currentLocation,
    isTracking: isTrackingLocation,
    hasPermission,
    error,
    startTracking,
    stopTracking,
    requestPermission,
    getCurrentLocation,
  };
}

/**
 * Calculate distance between two coordinates (in meters)
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration in seconds for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default useLocationTracking;
