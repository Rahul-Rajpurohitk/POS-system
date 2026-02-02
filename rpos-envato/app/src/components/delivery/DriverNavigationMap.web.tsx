/**
 * DriverNavigationMap - Turn-by-turn navigation view for drivers
 *
 * Unlike the POS eagle-view, this provides:
 * - 3D tilted perspective (like Google Maps navigation)
 * - Map rotates with driver heading
 * - Auto-follows driver position
 * - Turn-by-turn instruction display
 * - Distance to next turn
 * - Prominent ETA display
 *
 * Vehicle type can be changed:
 * - Before starting the trip (full selection)
 * - During trip (limited, with confirmation)
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import {
  Navigation2, Clock, MapPin, ArrowUp, ArrowLeft, ArrowRight,
  RotateCw, ChevronUp, AlertCircle, Sun, Moon, Zap,
} from '@tamagui/lucide-icons';
import { MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '@/config/maps';
import type { Coordinate } from './DeliveryMap';
import type { RouteStep } from '@/services/navigation/routingEngine';

import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';

// Inject CSS
const injectDriverMapCSS = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('driver-nav-map-css')) return;

  const leafletLink = document.createElement('link');
  leafletLink.id = 'driver-nav-map-css';
  leafletLink.rel = 'stylesheet';
  leafletLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  leafletLink.crossOrigin = '';
  document.head.appendChild(leafletLink);

  const style = document.createElement('style');
  style.id = 'driver-nav-custom-css';
  style.textContent = `
    .driver-map-container .leaflet-container {
      background: #1a1a2e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .driver-map-container .leaflet-control-container {
      display: none !important;
    }
    .driver-marker {
      background: transparent !important;
      border: none !important;
    }
    .driver-arrow {
      transition: transform 0.3s ease-out;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
    .destination-pulse::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #10B981;
      animation: pulse-ring 2s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
};

// Vehicle types
export type VehicleType = 'walking' | 'bicycle' | 'motorcycle' | 'car' | 'transit';

// Navigation tiles - optimized for driving
const DRIVER_TILES = {
  // Mapbox Navigation Day
  day: {
    url: `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
    attribution: '© Mapbox',
  },
  // Mapbox Navigation Night
  night: {
    url: `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
    attribution: '© Mapbox',
  },
  // CartoDB Dark Matter (fallback)
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
  },
};

// Colors for driver view
const DRIVER_COLORS = {
  route: '#4F8EF7',        // Bright blue route
  routePassed: '#94A3B8',  // Gray for passed portion
  nextTurn: '#F59E0B',     // Yellow for next turn highlight
  destination: '#10B981', // Green destination
  driver: '#FFFFFF',       // White driver arrow
};

// Create driver arrow marker (directional)
const createDriverArrow = (heading: number = 0) => {
  return L.divIcon({
    className: 'driver-marker',
    html: `
      <div class="driver-arrow" style="
        width: 48px;
        height: 48px;
        position: relative;
        transform: rotate(${heading}deg);
      ">
        <!-- Outer glow -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 56px;
          height: 56px;
          background: radial-gradient(circle, rgba(79, 142, 247, 0.4) 0%, transparent 70%);
          border-radius: 50%;
        "></div>
        <!-- Arrow body -->
        <svg width="48" height="48" viewBox="0 0 48 48" style="position: absolute; top: 0; left: 0;">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
            </filter>
          </defs>
          <!-- Navigation arrow shape -->
          <path
            d="M24 4 L36 40 L24 32 L12 40 Z"
            fill="${DRIVER_COLORS.driver}"
            stroke="#4F8EF7"
            stroke-width="2"
            filter="url(#shadow)"
          />
        </svg>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Create destination marker
const createDestinationMarker = () => {
  return L.divIcon({
    className: 'driver-marker',
    html: `
      <div class="destination-pulse" style="
        width: 32px;
        height: 32px;
        position: relative;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background: ${DRIVER_COLORS.destination};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
          z-index: 1;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" style="transform: rotate(45deg);">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Map controller for navigation mode
const DriverMapController = ({
  driverLocation,
  heading,
  isNavigating,
  destination,
}: {
  driverLocation: Coordinate;
  heading: number;
  isNavigating: boolean;
  destination?: Coordinate;
}) => {
  const map = useMap();
  const prevLocation = useRef<Coordinate | null>(null);

  useEffect(() => {
    if (isNavigating && driverLocation) {
      // Navigation mode: follow driver, rotate map with heading
      const targetLatLng = L.latLng(driverLocation.latitude, driverLocation.longitude);

      // Smooth pan to driver position
      map.panTo(targetLatLng, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.5,
      });

      // Note: Leaflet doesn't support map rotation natively
      // For true rotation, would need Mapbox GL JS
      // Here we rotate the driver marker instead

      prevLocation.current = driverLocation;
    } else if (destination && driverLocation) {
      // Overview mode: fit both points
      const bounds = L.latLngBounds([
        [driverLocation.latitude, driverLocation.longitude],
        [destination.latitude, destination.longitude],
      ]);
      map.fitBounds(bounds, { padding: [80, 80], animate: true });
    }
  }, [driverLocation, heading, isNavigating, destination, map]);

  return null;
};

// Maneuver icons
const ManeuverIcon = ({ type, size = 24 }: { type: string; size?: number }) => {
  const iconMap: Record<string, React.ReactNode> = {
    'turn-left': <ArrowLeft size={size} color="white" />,
    'turn-right': <ArrowRight size={size} color="white" />,
    'continue': <ArrowUp size={size} color="white" />,
    'arrive': <MapPin size={size} color="white" />,
    'depart': <Navigation2 size={size} color="white" />,
    'roundabout': <RotateCw size={size} color="white" />,
  };
  return iconMap[type] || <ChevronUp size={size} color="white" />;
};

export interface DriverNavigationMapProps {
  // Locations
  driverLocation: Coordinate;
  destination: Coordinate;
  pickupLocation?: Coordinate; // Store/pickup point

  // Driver state
  heading?: number; // 0-360 degrees
  speed?: number; // km/h or mph

  // Route
  route?: Coordinate[];
  steps?: RouteStep[];
  currentStepIndex?: number;

  // Trip state
  tripState: 'idle' | 'preview' | 'navigating' | 'arrived';
  vehicleType: VehicleType;
  onVehicleTypeChange?: (type: VehicleType) => void;

  // Route info
  etaMinutes?: number;
  distanceRemaining?: string;
  distanceToNextTurn?: string;

  // Callbacks
  onStartTrip?: () => void;
  onEndTrip?: () => void;
  onRecenter?: () => void;
  onThemeToggle?: () => void;

  // Display
  isDarkMode?: boolean;
  showThemeToggle?: boolean;
  height?: number | string;
}

export function DriverNavigationMap({
  driverLocation,
  destination,
  pickupLocation,
  heading = 0,
  speed,
  route,
  steps,
  currentStepIndex = 0,
  tripState,
  vehicleType,
  onVehicleTypeChange,
  etaMinutes,
  distanceRemaining,
  distanceToNextTurn,
  onStartTrip,
  onEndTrip,
  onRecenter,
  onThemeToggle,
  isDarkMode = false,
  showThemeToggle = true,
  height = '100%',
}: DriverNavigationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [confirmVehicleChange, setConfirmVehicleChange] = useState<VehicleType | null>(null);

  // Current and next step
  const currentStep = steps?.[currentStepIndex];
  const nextStep = steps?.[currentStepIndex + 1];

  // Can change vehicle type
  const canChangeVehicle = tripState === 'idle' || tripState === 'preview';
  const canChangeVehicleDuringTrip = tripState === 'navigating'; // With confirmation

  // Inject CSS
  useEffect(() => {
    injectDriverMapCSS();
  }, []);

  // Handle vehicle type change
  const handleVehicleChange = (type: VehicleType) => {
    if (tripState === 'navigating') {
      // During trip - ask for confirmation
      setConfirmVehicleChange(type);
    } else {
      // Before trip - change immediately
      onVehicleTypeChange?.(type);
      setShowVehicleSelector(false);
    }
  };

  const confirmVehicleChangeAction = () => {
    if (confirmVehicleChange) {
      onVehicleTypeChange?.(confirmVehicleChange);
      setConfirmVehicleChange(null);
      setShowVehicleSelector(false);
    }
  };

  // Choose tile layer
  const tileLayer = isDarkMode ? DRIVER_TILES.night : DRIVER_TILES.day;

  // Zoom level based on trip state
  const zoomLevel = tripState === 'navigating' ? 17 : 14;

  return (
    <div
      className="driver-map-container"
      style={{
        width: '100%',
        height: typeof height === 'number' ? height : '100%',
        position: 'relative',
        borderRadius: 0,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#1a1a2e' : '#f8fafc',
      }}
    >
      <MapContainer
        center={[driverLocation.latitude, driverLocation.longitude]}
        zoom={zoomLevel}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        ref={(map) => {
          if (map) mapRef.current = map;
        }}
      >
        <TileLayer url={tileLayer.url} attribution={tileLayer.attribution} />

        <DriverMapController
          driverLocation={driverLocation}
          heading={heading}
          isNavigating={tripState === 'navigating'}
          destination={destination}
        />

        {/* Route line */}
        {route && route.length > 1 && (
          <Polyline
            positions={route.map((c) => [c.latitude, c.longitude] as [number, number])}
            color={DRIVER_COLORS.route}
            weight={6}
            opacity={1}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Pickup marker */}
        {pickupLocation && tripState !== 'navigating' && (
          <Marker
            position={[pickupLocation.latitude, pickupLocation.longitude]}
            icon={L.divIcon({
              className: 'driver-marker',
              html: `<div style="width:24px;height:24px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          />
        )}

        {/* Destination marker */}
        <Marker
          position={[destination.latitude, destination.longitude]}
          icon={createDestinationMarker()}
        />

        {/* Driver marker */}
        <Marker
          position={[driverLocation.latitude, driverLocation.longitude]}
          icon={createDriverArrow(heading)}
        />
      </MapContainer>

      {/* === NAVIGATION UI OVERLAYS === */}

      {/* Top: Turn-by-turn instruction (only when navigating) */}
      {tripState === 'navigating' && currentStep && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)',
            padding: '16px 20px',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            zIndex: 1000,
          }}
        >
          {/* Next turn distance + icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: '#4F8EF7',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ManeuverIcon type={currentStep.maneuver} size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'white' }}>
                {distanceToNextTurn || '0 ft'}
              </div>
              <div style={{ fontSize: 16, color: '#9CA3AF', marginTop: 2 }}>
                {currentStep.instruction}
              </div>
            </div>
          </div>

          {/* Lane guidance (placeholder) */}
          {nextStep && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 13,
                color: '#9CA3AF',
              }}
            >
              Then: {nextStep.instruction}
            </div>
          )}
        </div>
      )}

      {/* Bottom panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: isDarkMode
            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
            : 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: isDarkMode
            ? '0 -4px 20px rgba(0,0,0,0.4)'
            : '0 -4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Vehicle type selector bar */}
        {(canChangeVehicle || showVehicleSelector) && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {(['walking', 'bicycle', 'motorcycle', 'car'] as VehicleType[]).map((type) => {
              const isSelected = vehicleType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleVehicleChange(type)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: isSelected
                      ? '#3B82F6'
                      : isDarkMode
                      ? '#334155'
                      : '#F3F4F6',
                    color: isSelected ? 'white' : isDarkMode ? '#94a3b8' : '#6B7280',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {type === 'walking' && '🚶'}
                    {type === 'bicycle' && '🚴'}
                    {type === 'motorcycle' && '🏍️'}
                    {type === 'car' && '🚗'}
                  </span>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ETA and distance */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: isDarkMode ? '#f1f5f9' : '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {etaMinutes ? `${etaMinutes} min` : '--'}
                {tripState === 'navigating' && (
                  <Zap size={20} color="#10B981" style={{ marginLeft: 4 }} />
                )}
              </div>
              <div style={{ fontSize: 14, color: isDarkMode ? '#94a3b8' : '#6B7280' }}>
                {distanceRemaining || 'Calculating...'}
              </div>
            </div>

            {/* Action button */}
            {tripState === 'preview' && (
              <button
                onClick={onStartTrip}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <Navigation2 size={20} />
                Start Trip
              </button>
            )}

            {tripState === 'navigating' && (
              <button
                onClick={onEndTrip}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                }}
              >
                End Trip
              </button>
            )}

            {tripState === 'arrived' && (
              <div
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MapPin size={20} />
                Arrived
              </div>
            )}
          </div>

          {/* Speed indicator (when navigating) */}
          {tripState === 'navigating' && speed !== undefined && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 16px',
                background: isDarkMode ? '#334155' : '#f1f5f9',
                borderRadius: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: isDarkMode ? '#f1f5f9' : '#111827',
                }}
              >
                {Math.round(speed)}
              </span>
              <span style={{ color: isDarkMode ? '#94a3b8' : '#6B7280' }}>mph</span>
            </div>
          )}
        </div>
      </div>

      {/* Map control buttons */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: tripState === 'navigating' ? 160 : 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 1000,
        }}
      >
        {/* Theme toggle button */}
        {showThemeToggle && onThemeToggle && (
          <button
            onClick={onThemeToggle}
            style={{
              width: 48,
              height: 48,
              background: isDarkMode
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
              border: isDarkMode ? '2px solid #475569' : '2px solid #e2e8f0',
              borderRadius: 24,
              boxShadow: isDarkMode
                ? '0 4px 12px rgba(0,0,0,0.4)'
                : '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun size={22} color="#fbbf24" />
            ) : (
              <Moon size={22} color="#64748b" />
            )}
          </button>
        )}

        {/* Recenter button (when navigating) */}
        {tripState === 'navigating' && (
          <button
            onClick={onRecenter}
            style={{
              width: 48,
              height: 48,
              background: isDarkMode
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'white',
              border: isDarkMode ? '2px solid #475569' : 'none',
              borderRadius: 24,
              boxShadow: isDarkMode
                ? '0 4px 12px rgba(0,0,0,0.4)'
                : '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Navigation2 size={24} color="#3B82F6" />
          </button>
        )}
      </div>

      {/* Vehicle change confirmation modal */}
      {confirmVehicleChange && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: isDarkMode
                ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                : 'white',
              borderRadius: 16,
              padding: 24,
              margin: 20,
              maxWidth: 320,
              boxShadow: isDarkMode
                ? '0 20px 40px rgba(0,0,0,0.5)'
                : '0 20px 40px rgba(0,0,0,0.2)',
              border: isDarkMode ? '1px solid #334155' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={24} color="#F59E0B" />
              </div>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: isDarkMode ? '#f1f5f9' : '#111827',
                }}
              >
                Change Vehicle?
              </span>
            </div>
            <p
              style={{
                color: isDarkMode ? '#94a3b8' : '#6B7280',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Changing vehicle type will recalculate your route. This may affect your ETA.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmVehicleChange(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isDarkMode ? '#334155' : '#F3F4F6',
                  color: isDarkMode ? '#94a3b8' : '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmVehicleChangeAction}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                }}
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverNavigationMap;
