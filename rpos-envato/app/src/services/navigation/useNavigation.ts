/**
 * useNavigation Hook
 *
 * React hook for navigation and routing functionality.
 * Provides easy access to route calculation, tracking, and navigation state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  calculateRoute,
  compareRoutes,
  formatDuration,
  formatDistance,
  calculateETA,
  VehicleType,
  Coordinate,
  RouteResult,
  RouteOptions,
} from './routingEngine';

export interface NavigationState {
  // Route data
  route: RouteResult | null;
  alternativeRoutes: RouteResult[];
  allVehicleRoutes: Map<VehicleType, RouteResult>;

  // Display data
  coordinates: Coordinate[];
  etaMinutes: number | null;
  etaTime: Date | null;
  distanceText: string | null;
  durationText: string | null;

  // State
  isLoading: boolean;
  error: string | null;
  vehicleType: VehicleType;
  isNavigating: boolean;
}

export interface UseNavigationOptions {
  vehicleType?: VehicleType;
  autoCalculate?: boolean;
  showAlternatives?: boolean;
  compareVehicles?: boolean;
  useImperialUnits?: boolean;
}

export interface UseNavigationResult extends NavigationState {
  // Actions
  calculateRoute: (
    origin: Coordinate,
    destination: Coordinate,
    options?: RouteOptions
  ) => Promise<void>;
  setVehicleType: (type: VehicleType) => void;
  selectAlternativeRoute: (index: number) => void;
  clearRoute: () => void;
  startNavigation: () => void;
  stopNavigation: () => void;

  // Utilities
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
}

export function useNavigation(options: UseNavigationOptions = {}): UseNavigationResult {
  const {
    vehicleType: initialVehicleType = 'car',
    showAlternatives = false,
    compareVehicles = false,
    useImperialUnits = true,
  } = options;

  // State
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteResult[]>([]);
  const [allVehicleRoutes, setAllVehicleRoutes] = useState<Map<VehicleType, RouteResult>>(
    new Map()
  );
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialVehicleType);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Refs for current origin/destination
  const originRef = useRef<Coordinate | null>(null);
  const destinationRef = useRef<Coordinate | null>(null);

  // Derived values
  const coordinates = route?.coordinates ?? [];
  const etaMinutes = route ? Math.round(route.duration / 60) : null;
  const etaTime = route ? calculateETA(route.duration) : null;
  const distanceText = route ? formatDistance(route.distance, useImperialUnits) : null;
  const durationText = route ? formatDuration(route.duration) : null;

  // Calculate route
  const doCalculateRoute = useCallback(
    async (origin: Coordinate, destination: Coordinate, routeOptions?: RouteOptions) => {
      setIsLoading(true);
      setError(null);

      originRef.current = origin;
      destinationRef.current = destination;

      try {
        // Get main route (with alternatives if requested)
        const routes = await calculateRoute(origin, destination, vehicleType, {
          ...routeOptions,
          alternatives: showAlternatives,
        });

        if (routes.length === 0) {
          throw new Error('No routes found');
        }

        setRoute(routes[0]);
        setAlternativeRoutes(routes.slice(1));

        // Compare vehicles if requested
        if (compareVehicles) {
          const comparison = await compareRoutes(origin, destination);
          setAllVehicleRoutes(comparison);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Route calculation failed';
        setError(message);
        setRoute(null);
        setAlternativeRoutes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [vehicleType, showAlternatives, compareVehicles]
  );

  // Recalculate when vehicle type changes
  useEffect(() => {
    if (originRef.current && destinationRef.current && route) {
      doCalculateRoute(originRef.current, destinationRef.current);
    }
  }, [vehicleType]);

  // Select alternative route
  const selectAlternativeRoute = useCallback(
    (index: number) => {
      if (index >= 0 && index < alternativeRoutes.length) {
        const newRoute = alternativeRoutes[index];
        const oldRoute = route;

        setRoute(newRoute);
        setAlternativeRoutes([
          ...(oldRoute ? [oldRoute] : []),
          ...alternativeRoutes.filter((_, i) => i !== index),
        ]);
      }
    },
    [route, alternativeRoutes]
  );

  // Clear route
  const clearRoute = useCallback(() => {
    setRoute(null);
    setAlternativeRoutes([]);
    setAllVehicleRoutes(new Map());
    setError(null);
    originRef.current = null;
    destinationRef.current = null;
  }, []);

  // Start/stop navigation
  const startNavigation = useCallback(() => {
    if (route) {
      setIsNavigating(true);
    }
  }, [route]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  // Format utilities with units preference
  const formatDistanceWithUnits = useCallback(
    (meters: number) => formatDistance(meters, useImperialUnits),
    [useImperialUnits]
  );

  return {
    // State
    route,
    alternativeRoutes,
    allVehicleRoutes,
    coordinates,
    etaMinutes,
    etaTime,
    distanceText,
    durationText,
    isLoading,
    error,
    vehicleType,
    isNavigating,

    // Actions
    calculateRoute: doCalculateRoute,
    setVehicleType,
    selectAlternativeRoute,
    clearRoute,
    startNavigation,
    stopNavigation,

    // Utilities
    formatDistance: formatDistanceWithUnits,
    formatDuration,
  };
}

export default useNavigation;
