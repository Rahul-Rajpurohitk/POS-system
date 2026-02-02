/**
 * NavigationMap - Minimal, navigation-focused map for delivery tracking
 *
 * Clean interface like Uber/DoorDash showing only:
 * - Streets and roads (driveable/walkable paths)
 * - Route visualization
 * - Essential markers (store, driver, customer)
 *
 * Designed for real-time driver navigation and tracking.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Store, Truck, User, Navigation2, Clock, Sun, Moon } from '@tamagui/lucide-icons';
import { MAP_CONFIG, MAPBOX_ACCESS_TOKEN, TRANSIT_CONFIG } from '@/config/maps';
import type { Coordinate, MapMarker, RouteSegment } from './DeliveryMap';
import type { TransitLeg } from '@/services/navigation/routingEngine';

import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  useMap,
} from 'react-leaflet';

// Inject minimal CSS for Leaflet
const injectMapCSS = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('nav-map-css')) return;

  // Leaflet base CSS
  const leafletLink = document.createElement('link');
  leafletLink.id = 'nav-map-css';
  leafletLink.rel = 'stylesheet';
  leafletLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  leafletLink.crossOrigin = '';
  document.head.appendChild(leafletLink);

  // Custom minimal styles
  const style = document.createElement('style');
  style.id = 'nav-map-custom-css';
  style.textContent = `
    /* Map container z-index management */
    .nav-map-container {
      position: relative;
      z-index: 1;
    }
    .nav-map-container .leaflet-container {
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 1 !important;
    }
    /* Ensure all Leaflet panes stay within the map's z-index context */
    .nav-map-container .leaflet-pane {
      z-index: 1 !important;
    }
    .nav-map-container .leaflet-tile-pane {
      z-index: 1 !important;
    }
    .nav-map-container .leaflet-overlay-pane {
      z-index: 2 !important;
    }
    .nav-map-container .leaflet-shadow-pane {
      z-index: 3 !important;
    }
    .nav-map-container .leaflet-marker-pane {
      z-index: 4 !important;
    }
    .nav-map-container .leaflet-tooltip-pane {
      z-index: 5 !important;
    }
    .nav-map-container .leaflet-popup-pane {
      z-index: 6 !important;
    }
    .nav-map-container .leaflet-control-container {
      display: none !important;
    }
    .nav-marker {
      background: transparent !important;
      border: none !important;
    }
    .nav-marker-pulse {
      animation: nav-pulse 2s ease-in-out infinite;
    }
    @keyframes nav-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .driver-marker-moving {
      transition: transform 0.5s ease-out;
    }
    /* Floating overlay container - must be above map */
    .floating-overlay-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      pointer-events: none;
    }
    .floating-overlay-container > * {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
};

// Vehicle types for routing
export type VehicleType = 'walking' | 'bicycle' | 'car' | 'motorcycle' | 'transit';

// Navigation-focused tile layers (minimal, road-focused)
const NAV_TILES = {
  // Light mode tiles
  light: {
    // Mapbox Navigation Day - optimized for driving
    navigation: {
      url: `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
      attribution: '© Mapbox',
    },
    // Mapbox Light - clean, minimal
    mapbox: {
      url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
      attribution: '© Mapbox',
    },
    // CartoDB with labels - clean but readable
    minimal: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '© CARTO',
    },
  },
  // Dark mode tiles
  dark: {
    // Mapbox Navigation Night - optimized for night driving
    navigation: {
      url: `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
      attribution: '© Mapbox',
    },
    // Mapbox Dark - clean dark mode
    mapbox: {
      url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
      attribution: '© Mapbox',
    },
    // CartoDB Dark Matter - clean dark mode
    minimal: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© CARTO',
    },
  },
};

// Marker colors - minimal palette
const MARKER_COLORS = {
  store: '#000000',      // Black - origin point
  driver: '#3B82F6',     // Blue - active/moving
  customer: '#10B981',   // Green - destination
  route: '#3B82F6',      // Blue route line
  routeAlt: '#94A3B8',   // Gray for alternative routes
  // Transit mode colors
  transit: {
    walk: '#6B7280',     // Gray - walking segments
    bus: '#10B981',      // Green - bus
    subway: '#3B82F6',   // Blue - subway/metro
    rail: '#8B5CF6',     // Purple - train/rail
    tram: '#F59E0B',     // Yellow - tram
    ferry: '#06B6D4',    // Cyan - ferry
  },
};

// Create minimal marker icons
const createNavMarker = (
  type: 'store' | 'driver' | 'customer',
  isActive: boolean = false,
  heading?: number
) => {
  const colors = {
    store: { bg: '#000000', icon: 'white' },
    driver: { bg: '#3B82F6', icon: 'white' },
    customer: { bg: '#10B981', icon: 'white' },
  };

  const { bg, icon } = colors[type];
  const size = type === 'driver' ? 44 : 36;

  // SVG icons - minimal and clean
  const icons = {
    store: `<circle cx="12" cy="12" r="4" fill="${icon}"/>`,
    driver: heading !== undefined
      ? `<path d="M12 2L8 10h8L12 2z" fill="${icon}" transform="rotate(${heading}, 12, 12)"/>`
      : `<circle cx="12" cy="12" r="5" fill="${icon}"/>`,
    customer: `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${icon}"/>`,
  };

  return L.divIcon({
    className: `nav-marker ${isActive ? 'nav-marker-pulse' : ''} ${type === 'driver' ? 'driver-marker-moving' : ''}`,
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bg};
        border-radius: ${type === 'customer' ? '50% 50% 50% 0' : '50%'};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ${type === 'customer' ? 'transform: rotate(-45deg);' : ''}
      ">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          style="${type === 'customer' ? 'transform: rotate(45deg);' : ''}"
        >
          ${icons[type]}
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, type === 'customer' ? size : size / 2],
  });
};

// Map controller for smooth animations
const MapController = ({
  center,
  zoom,
  route,
  followDriver,
  driverLocation,
}: {
  center: Coordinate;
  zoom: number;
  route?: Coordinate[];
  followDriver?: boolean;
  driverLocation?: Coordinate;
}) => {
  const map = useMap();
  const prevDriverLocation = useRef<Coordinate | null>(null);

  useEffect(() => {
    if (followDriver && driverLocation) {
      // Smooth pan to driver location
      map.panTo([driverLocation.latitude, driverLocation.longitude], {
        animate: true,
        duration: 0.5,
      });
      prevDriverLocation.current = driverLocation;
    } else if (route && route.length > 1) {
      // Fit route in view with padding
      const bounds = L.latLngBounds(
        route.map((c) => [c.latitude, c.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    } else {
      map.setView([center.latitude, center.longitude], zoom, { animate: true });
    }
  }, [center, zoom, route, followDriver, driverLocation, map]);

  return null;
};

// Ref handle for external map control
export interface NavigationMapRef {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  fitRoute: () => void;
  getZoom: () => number | null;
}

export interface NavigationMapProps {
  // Core locations
  storeLocation: Coordinate;
  customerLocation?: Coordinate;
  driverLocation?: Coordinate;
  driverHeading?: number; // Direction driver is facing (0-360)

  // Route
  route?: Coordinate[];
  alternativeRoutes?: Coordinate[][];
  transitLegs?: TransitLeg[];  // For transit mode - colored segments
  isRouteActive?: boolean;

  // Delivery zone
  deliveryRadiusMeters?: number; // Circular delivery zone radius in meters

  // Display options
  vehicleType?: VehicleType;
  showETA?: boolean;
  etaMinutes?: number;
  distanceText?: string;

  // Theming
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  showThemeToggle?: boolean;

  // Behavior
  followDriver?: boolean;
  height?: number | string;
  isLoading?: boolean;

  // Callbacks
  onMapReady?: () => void;
  onDriverClick?: () => void;
  onCustomerClick?: () => void;
  onMarkerPress?: (marker: { id: string; type: string }) => void;
}

export const NavigationMap = forwardRef<NavigationMapRef, NavigationMapProps>(function NavigationMap({
  storeLocation,
  customerLocation,
  driverLocation,
  driverHeading,
  route,
  alternativeRoutes,
  transitLegs,
  isRouteActive = true,
  deliveryRadiusMeters,
  vehicleType = 'car',
  showETA = true,
  etaMinutes,
  distanceText,
  isDarkMode = false,
  onThemeToggle,
  showThemeToggle = true,
  followDriver = false,
  height = '100%',
  isLoading,
  onMapReady,
  onDriverClick,
  onCustomerClick,
  onMarkerPress,
}, ref) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Inject CSS on mount
  useEffect(() => {
    injectMapCSS();
  }, []);

  // Expose map control methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (mapRef.current) {
        mapRef.current.zoomIn(1, { animate: true });
      }
    },
    zoomOut: () => {
      if (mapRef.current) {
        mapRef.current.zoomOut(1, { animate: true });
      }
    },
    recenter: () => {
      if (mapRef.current && storeLocation) {
        mapRef.current.setView(
          [storeLocation.latitude, storeLocation.longitude],
          15,
          { animate: true }
        );
      }
    },
    fitRoute: () => {
      if (mapRef.current && route && route.length > 1) {
        const bounds = L.latLngBounds(
          route.map((c) => [c.latitude, c.longitude] as [number, number])
        );
        mapRef.current.fitBounds(bounds, { padding: [60, 60], animate: true });
      }
    },
    getZoom: () => {
      return mapRef.current?.getZoom() ?? null;
    },
  }), [storeLocation, route]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (driverLocation && followDriver) return driverLocation;
    if (route && route.length > 0) {
      // Center of route
      const lats = route.map((c) => c.latitude);
      const lngs = route.map((c) => c.longitude);
      return {
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      };
    }
    return storeLocation;
  }, [storeLocation, driverLocation, route, followDriver]);

  // Calculate zoom based on route
  const mapZoom = useMemo(() => {
    if (followDriver && driverLocation) return 17; // Close zoom when following
    if (route && route.length > 1) return 14; // Route view
    return 15; // Default
  }, [followDriver, driverLocation, route]);

  // Handle map ready
  const handleMapReady = useCallback(() => {
    setMapReady(true);
    onMapReady?.();
  }, [onMapReady]);

  // Get appropriate tile layer based on theme
  // Use dark.mapbox (dark-v11) instead of dark.navigation to avoid traffic colors
  const tileLayer = isDarkMode
    ? NAV_TILES.dark.mapbox
    : NAV_TILES.light.minimal;

  if (isLoading) {
    return (
      <YStack
        flex={1}
        height={height}
        backgroundColor={isDarkMode ? '#0f172a' : '#F8FAFC'}
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="large" color="#3B82F6" />
      </YStack>
    );
  }

  return (
    <div
      className="nav-map-container"
      style={{
        width: '100%',
        height: typeof height === 'number' ? height : '100%',
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#0f172a' : '#F8FAFC',
      }}
    >
      <MapContainer
        center={[mapCenter.latitude, mapCenter.longitude]}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        minZoom={3}
        maxZoom={19}
        // Constrain map bounds to prevent dragging into void
        maxBounds={[[-85.051129, -180], [85.051129, 180]]}
        maxBoundsViscosity={1.0}
        // Smooth scrolling
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        // Touch handling
        tap={true}
        touchZoom={true}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
            // Set max bounds programmatically for proper containment
            map.setMaxBounds([[-85.051129, -180], [85.051129, 180]]);
            handleMapReady();
          }
        }}
      >
        {/* Clean tile layer - switches between light and dark mode */}
        <TileLayer
          url={tileLayer.url}
          attribution={tileLayer.attribution}
        />

        <MapController
          center={mapCenter}
          zoom={mapZoom}
          route={route}
          followDriver={followDriver}
          driverLocation={driverLocation}
        />

        {/* Alternative routes (gray, behind main route) */}
        {alternativeRoutes?.map((altRoute, index) => (
          <Polyline
            key={`alt-route-${index}`}
            positions={altRoute.map((c) => [c.latitude, c.longitude] as [number, number])}
            color={MARKER_COLORS.routeAlt}
            weight={4}
            opacity={0.5}
            dashArray="8, 8"
          />
        ))}

        {/* Main route - or transit legs if available */}
        {vehicleType === 'transit' && transitLegs && transitLegs.length > 0 ? (
          // Render transit legs with different colors per mode
          transitLegs.map((leg, index) => {
            const legColor = MARKER_COLORS.transit[leg.mode] || MARKER_COLORS.transit.bus;
            const isWalking = leg.mode === 'walk';

            return (
              <Polyline
                key={`transit-leg-${index}`}
                positions={leg.coordinates.map((c) => [c.latitude, c.longitude] as [number, number])}
                color={legColor}
                weight={isWalking ? 3 : 5}
                opacity={isRouteActive ? 1 : 0.6}
                lineCap="round"
                lineJoin="round"
                dashArray={isWalking ? '6, 8' : undefined}
              />
            );
          })
        ) : (
          // Regular route
          route && route.length > 1 && (
            <Polyline
              positions={route.map((c) => [c.latitude, c.longitude] as [number, number])}
              color={MARKER_COLORS.route}
              weight={5}
              opacity={isRouteActive ? 1 : 0.6}
              lineCap="round"
              lineJoin="round"
            />
          )
        )}

        {/* Delivery zone circle - rendered behind markers */}
        {deliveryRadiusMeters && deliveryRadiusMeters > 0 && (
          <Circle
            center={[storeLocation.latitude, storeLocation.longitude]}
            radius={deliveryRadiusMeters}
            pathOptions={{
              color: isDarkMode ? '#3B82F6' : '#3B82F6',
              fillColor: isDarkMode ? '#3B82F6' : '#3B82F6',
              fillOpacity: 0.08,
              weight: 2,
              opacity: 0.6,
              dashArray: '8, 6',
            }}
          />
        )}

        {/* Store marker */}
        <Marker
          position={[storeLocation.latitude, storeLocation.longitude]}
          icon={createNavMarker('store')}
        />

        {/* Customer marker */}
        {customerLocation && (
          <Marker
            position={[customerLocation.latitude, customerLocation.longitude]}
            icon={createNavMarker('customer')}
            eventHandlers={{
              click: () => onCustomerClick?.(),
            }}
          />
        )}

        {/* Driver marker */}
        {driverLocation && (
          <Marker
            position={[driverLocation.latitude, driverLocation.longitude]}
            icon={createNavMarker('driver', true, driverHeading)}
            eventHandlers={{
              click: () => onDriverClick?.(),
            }}
          />
        )}
      </MapContainer>

      {/* Theme toggle button - top left */}
      {showThemeToggle && onThemeToggle && (
        <button
          onClick={onThemeToggle}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: 44,
            height: 44,
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
            border: isDarkMode ? '2px solid #475569' : '2px solid #e2e8f0',
            borderRadius: 22,
            boxShadow: isDarkMode
              ? '0 4px 12px rgba(0,0,0,0.4)'
              : '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 1001,
          }}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun size={20} color="#fbbf24" />
          ) : (
            <Moon size={20} color="#64748b" />
          )}
        </button>
      )}

      {/* ETA/Distance overlay - minimal, bottom center */}
      {showETA && (etaMinutes !== undefined || distanceText) && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isDarkMode
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'white',
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'white',
            borderRadius: 24,
            padding: '10px 20px',
            boxShadow: isDarkMode
              ? '0 4px 16px rgba(0,0,0,0.4)'
              : '0 2px 12px rgba(0,0,0,0.15)',
            border: isDarkMode ? '1px solid #475569' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 1000,
          }}
        >
          {etaMinutes !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#3B82F6" />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: isDarkMode ? '#f1f5f9' : '#111827',
                }}
              >
                {etaMinutes} min
              </span>
            </div>
          )}
          {distanceText && (
            <span
              style={{
                fontSize: 14,
                color: isDarkMode ? '#94a3b8' : '#6B7280',
              }}
            >
              {distanceText}
            </span>
          )}
        </div>
      )}

      {/* Vehicle type indicator - subtle, top right */}
      {vehicleType && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: isDarkMode
              ? 'rgba(30, 41, 59, 0.95)'
              : 'rgba(255,255,255,0.95)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            color: isDarkMode ? '#94a3b8' : '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            zIndex: 1000,
            border: isDarkMode ? '1px solid #475569' : 'none',
          }}
        >
          {vehicleType === 'walking' && '🚶'}
          {vehicleType === 'bicycle' && '🚴'}
          {vehicleType === 'car' && '🚗'}
          {vehicleType === 'motorcycle' && '🏍️'}
          {vehicleType === 'transit' && '🚌'}
          <span style={{ textTransform: 'capitalize' }}>{vehicleType}</span>
        </div>
      )}

      {/* Transit route info - shows legs when in transit mode */}
      {vehicleType === 'transit' && transitLegs && transitLegs.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: 16,
            right: 16,
            backgroundColor: isDarkMode ? '#1e293b' : 'white',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: isDarkMode
              ? '0 4px 16px rgba(0,0,0,0.4)'
              : '0 2px 12px rgba(0,0,0,0.12)',
            border: isDarkMode ? '1px solid #334155' : 'none',
            zIndex: 1000,
          }}
        >
          {/* Transit steps timeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
            {transitLegs.map((leg, index) => {
              const modeColor = MARKER_COLORS.transit[leg.mode] || MARKER_COLORS.transit.bus;
              const modeEmoji = {
                walk: '🚶',
                bus: '🚌',
                subway: '🚇',
                rail: '🚆',
                tram: '🚊',
                ferry: '⛴️',
              }[leg.mode] || '🚌';

              return (
                <React.Fragment key={`transit-info-${index}`}>
                  {/* Transit leg */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: leg.mode === 'walk' ? 40 : 60,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: `${modeColor}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                      }}
                    >
                      {modeEmoji}
                    </div>
                    {leg.lineName && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: modeColor,
                          marginTop: 2,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {leg.lineName}
                      </span>
                    )}
                    {leg.numStops && (
                      <span style={{ fontSize: 9, color: '#9CA3AF' }}>
                        {leg.numStops} stops
                      </span>
                    )}
                  </div>

                  {/* Connector line (except after last leg) */}
                  {index < transitLegs.length - 1 && (
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        backgroundColor: '#E5E7EB',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default NavigationMap;
