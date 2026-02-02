/**
 * useDeliveryRoutes Hook
 *
 * Hook for fetching and managing delivery routes for map visualization.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Coordinate, RouteSegment } from '@/components/delivery/DeliveryMap';
import {
  getRoute,
  getMultiStopRoute,
  routeResultToSegment,
  formatDistance,
  formatDuration,
  calculateETA,
  type RouteOptions,
  type RouteResult,
} from '@/services/routing';

export interface DeliveryRouteInfo {
  segment: RouteSegment;
  distance: number;
  distanceFormatted: string;
  duration: number;
  durationFormatted: string;
  eta: Date;
}

export interface UseDeliveryRoutesOptions {
  autoFetch?: boolean;
  vehicleType?: RouteOptions['vehicleType'];
  useImperialUnits?: boolean;
}

export interface UseDeliveryRoutesResult {
  routes: RouteSegment[];
  routeInfo: DeliveryRouteInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchRoute: (from: Coordinate, to: Coordinate) => Promise<DeliveryRouteInfo | null>;
  fetchMultiStopRoute: (waypoints: Coordinate[]) => Promise<DeliveryRouteInfo | null>;
  clearRoutes: () => void;
  addRoute: (route: RouteSegment) => void;
  removeRoute: (routeId: string) => void;
}

export function useDeliveryRoutes(
  options: UseDeliveryRoutesOptions = {}
): UseDeliveryRoutesResult {
  const { vehicleType = 'car', useImperialUnits = true } = options;

  const [routes, setRoutes] = useState<RouteSegment[]>([]);
  const [routeInfo, setRouteInfo] = useState<DeliveryRouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(
    async (from: Coordinate, to: Coordinate): Promise<DeliveryRouteInfo | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getRoute(from, to, { vehicleType });

        if (!result) {
          setError('Failed to fetch route');
          return null;
        }

        const segment = routeResultToSegment(result, {
          id: `route-${Date.now()}`,
        });

        const info: DeliveryRouteInfo = {
          segment,
          distance: result.distance,
          distanceFormatted: formatDistance(result.distance, useImperialUnits),
          duration: result.duration,
          durationFormatted: formatDuration(result.duration),
          eta: calculateETA(result.duration),
        };

        setRoutes((prev) => [...prev, segment]);
        setRouteInfo(info);

        return info;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch route';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [vehicleType, useImperialUnits]
  );

  const fetchMultiStopRoute = useCallback(
    async (waypoints: Coordinate[]): Promise<DeliveryRouteInfo | null> => {
      if (waypoints.length < 2) {
        setError('Need at least 2 waypoints');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await getMultiStopRoute(waypoints, { vehicleType });

        if (!result) {
          setError('Failed to fetch multi-stop route');
          return null;
        }

        const segment = routeResultToSegment(result, {
          id: `multi-route-${Date.now()}`,
        });

        const info: DeliveryRouteInfo = {
          segment,
          distance: result.distance,
          distanceFormatted: formatDistance(result.distance, useImperialUnits),
          duration: result.duration,
          durationFormatted: formatDuration(result.duration),
          eta: calculateETA(result.duration),
        };

        setRoutes((prev) => [...prev, segment]);
        setRouteInfo(info);

        return info;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch route';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [vehicleType, useImperialUnits]
  );

  const clearRoutes = useCallback(() => {
    setRoutes([]);
    setRouteInfo(null);
    setError(null);
  }, []);

  const addRoute = useCallback((route: RouteSegment) => {
    setRoutes((prev) => [...prev, route]);
  }, []);

  const removeRoute = useCallback((routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }, []);

  return {
    routes,
    routeInfo,
    isLoading,
    error,
    fetchRoute,
    fetchMultiStopRoute,
    clearRoutes,
    addRoute,
    removeRoute,
  };
}

export default useDeliveryRoutes;
