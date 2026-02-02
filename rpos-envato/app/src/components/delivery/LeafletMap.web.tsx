/**
 * LeafletMap - Interactive map component for web using Leaflet
 *
 * Provides full interactivity: pan, zoom, clickable markers, route visualization
 * Uses OpenStreetMap tiles (free) with Mapbox for routing
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import {
  Store,
  Truck,
  User,
  MapPin,
  Navigation,
  Maximize2,
  Minimize2,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
} from '@tamagui/lucide-icons';
import { MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '@/config/maps';
import type { Coordinate, MapMarker, RouteSegment, DeliveryMapProps } from './DeliveryMap';

import L from 'leaflet';

// Inject Leaflet CSS dynamically (Metro doesn't handle CSS imports)
const injectLeafletCSS = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('leaflet-css')) return;

  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);
};
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (type: MapMarker['type'], isActive: boolean = false) => {
  const colors = MAP_CONFIG.markers;
  const color = colors[type] || colors.store;
  const size = isActive ? 40 : 32;

  const iconSvg = {
    store: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`,
    driver: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
    customer: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    pickup: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    delivery: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        ${isActive ? 'animation: pulse 1.5s infinite;' : ''}
      ">
        ${iconSvg[type]}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Map controller component for programmatic control
interface MapControllerProps {
  center: Coordinate;
  zoom: number;
  onMapClick?: (coord: Coordinate) => void;
  fitBoundsMarkers?: Coordinate[];
}

const MapController = ({ center, zoom, onMapClick, fitBoundsMarkers }: MapControllerProps) => {
  const map = useMap();

  useEffect(() => {
    if (fitBoundsMarkers && fitBoundsMarkers.length > 1) {
      const bounds = L.latLngBounds(
        fitBoundsMarkers.map((c) => [c.latitude, c.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([center.latitude, center.longitude], zoom);
    }
  }, [center, zoom, fitBoundsMarkers, map]);

  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      }
    },
  });

  return null;
};

// Tile layer options
const TILE_LAYERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  light: {
    url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
  },
  dark: {
    url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
  },
  satellite: {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`,
    attribution: '&copy; Mapbox, &copy; OpenStreetMap',
  },
};

export interface LeafletMapProps extends DeliveryMapProps {
  onRouteRequest?: (from: Coordinate, to: Coordinate) => void;
  activeMarkerId?: string;
  showControls?: boolean;
  enableFullscreen?: boolean;
}

export function LeafletMap({
  center,
  zoom = MAP_CONFIG.zoom.initial,
  storeLocation,
  storeName,
  driverMarkers = [],
  customerMarkers = [],
  route = [],
  onMarkerPress,
  onMapPress,
  showUserLocation = false,
  mapStyle = 'streets',
  height = '100%',
  showZoomControls = true,
  isLoading,
  onRouteRequest,
  activeMarkerId,
  showControls = true,
  enableFullscreen = true,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [currentStyle, setCurrentStyle] = useState<keyof typeof TILE_LAYERS>('streets');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mapCenter = center || storeLocation || MAP_CONFIG.defaultCenter;

  // Inject Leaflet CSS on mount
  useEffect(() => {
    injectLeafletCSS();
  }, []);

  // Get user location
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.warn('Geolocation error:', error),
        { enableHighAccuracy: true }
      );
    }
  }, [showUserLocation]);

  // Collect all markers for bounds fitting
  const allMarkerCoords: Coordinate[] = [];
  if (storeLocation) allMarkerCoords.push(storeLocation);
  driverMarkers.forEach((m) => allMarkerCoords.push(m.coordinate));
  customerMarkers.forEach((m) => allMarkerCoords.push(m.coordinate));

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Center on user location
  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.latitude, userLocation.longitude], 16);
    }
  }, [userLocation]);

  // Fit bounds to all markers
  const fitAllMarkers = useCallback(() => {
    if (allMarkerCoords.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(
        allMarkerCoords.map((c) => [c.latitude, c.longitude] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [allMarkerCoords]);

  if (isLoading) {
    return (
      <YStack
        flex={1}
        height={height}
        backgroundColor="#E8F4F8"
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="large" color={MAP_CONFIG.markers.store} />
        <Text color="#6B7280" marginTop="$2">
          Loading map...
        </Text>
      </YStack>
    );
  }

  if (!mapCenter || (mapCenter.latitude === 0 && mapCenter.longitude === 0)) {
    return (
      <YStack
        flex={1}
        height={height}
        backgroundColor="#E8F4F8"
        justifyContent="center"
        alignItems="center"
        padding="$4"
      >
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor={MAP_CONFIG.markers.store}
          alignItems="center"
          justifyContent="center"
        >
          <Store size={20} color="white" />
        </YStack>
        <Text color="#6B7280" marginTop="$3" textAlign="center" fontSize={14} fontWeight="500">
          Store Location Not Set
        </Text>
        <Text color="#9CA3AF" marginTop="$1" textAlign="center" fontSize={12}>
          Configure your store address in Settings to see the map
        </Text>
      </YStack>
    );
  }

  const tileLayer = TILE_LAYERS[currentStyle] || TILE_LAYERS.streets;

  return (
    <div ref={containerRef} style={{ width: '100%', height: typeof height === 'number' ? height : '100%', position: 'relative' }}>
      {/* Add pulse animation CSS */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .leaflet-container {
          font-family: inherit;
          border-radius: 8px;
        }
        .custom-marker {
          background: transparent;
          border: none;
        }
      `}</style>

      <MapContainer
        center={[mapCenter.latitude, mapCenter.longitude]}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
        zoomControl={false}
        minZoom={3}
        maxZoom={19}
        // Constrain map bounds to prevent dragging into void
        maxBounds={[[-85.051129, -180], [85.051129, 180]]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
            // Set max bounds programmatically for proper containment
            map.setMaxBounds([[-85.051129, -180], [85.051129, 180]]);
          }
        }}
      >
        <TileLayer url={tileLayer.url} attribution={tileLayer.attribution} />

        <MapController
          center={mapCenter}
          zoom={zoom}
          onMapClick={onMapPress}
          fitBoundsMarkers={allMarkerCoords.length > 1 ? allMarkerCoords : undefined}
        />

        {/* Zoom controls */}
        {showZoomControls && <ZoomControl position="bottomright" />}

        {/* Store marker */}
        {storeLocation && (
          <Marker
            position={[storeLocation.latitude, storeLocation.longitude]}
            icon={createCustomIcon('store')}
          >
            <Popup>
              <div style={{ padding: '4px', minWidth: '150px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: MAP_CONFIG.markers.store,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Store size={12} color="white" />
                  </span>
                  {storeName || 'Store'}
                </strong>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
                  {storeLocation.latitude.toFixed(6)}, {storeLocation.longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver markers */}
        {driverMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.coordinate.latitude, marker.coordinate.longitude]}
            icon={createCustomIcon('driver', marker.id === activeMarkerId)}
            eventHandlers={{
              click: () => onMarkerPress?.(marker),
            }}
          >
            <Popup>
              <div style={{ padding: '4px', minWidth: '150px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: MAP_CONFIG.markers.driver,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Truck size={12} color="white" />
                  </span>
                  {marker.label || 'Driver'}
                </strong>
                {marker.info && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>{marker.info}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Customer markers */}
        {customerMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.coordinate.latitude, marker.coordinate.longitude]}
            icon={createCustomIcon('customer', marker.id === activeMarkerId)}
            eventHandlers={{
              click: () => onMarkerPress?.(marker),
            }}
          >
            <Popup>
              <div style={{ padding: '4px', minWidth: '150px' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: MAP_CONFIG.markers.customer,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User size={12} color="white" />
                  </span>
                  {marker.label || 'Customer'}
                </strong>
                {marker.info && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>{marker.info}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: `
                <div style="
                  width: 16px;
                  height: 16px;
                  background-color: #4285F4;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3), 0 2px 6px rgba(0,0,0,0.3);
                "></div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>Your location</Popup>
          </Marker>
        )}

        {/* Route polylines */}
        {route.map((segment) => (
          <Polyline
            key={segment.id}
            positions={segment.coordinates.map((c) => [c.latitude, c.longitude] as [number, number])}
            color={segment.isCompleted ? MAP_CONFIG.route.completedColor : segment.color || MAP_CONFIG.route.lineColor}
            weight={MAP_CONFIG.route.lineWidth}
            opacity={MAP_CONFIG.route.lineOpacity}
          />
        ))}
      </MapContainer>

      {/* Custom controls overlay */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Store info card */}
          {storeName && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: '8px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: MAP_CONFIG.markers.store,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={14} color="white" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{storeName}</span>
            </div>
          )}

          {/* Delivery counts */}
          {(driverMarkers.length > 0 || customerMarkers.length > 0) && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: '6px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {driverMarkers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Truck size={14} color={MAP_CONFIG.markers.driver} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {driverMarkers.length}
                  </span>
                </div>
              )}
              {customerMarkers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={14} color={MAP_CONFIG.markers.customer} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {customerMarkers.length}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right side controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Layer switcher */}
        <button
          onClick={() => {
            const styles: (keyof typeof TILE_LAYERS)[] = ['streets', 'light', 'dark', 'satellite'];
            const currentIndex = styles.indexOf(currentStyle);
            setCurrentStyle(styles[(currentIndex + 1) % styles.length]);
          }}
          style={{
            width: 36,
            height: 36,
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
          title="Switch map style"
        >
          <Layers size={18} color="#6B7280" />
        </button>

        {/* Fullscreen toggle */}
        {enableFullscreen && (
          <button
            onClick={toggleFullscreen}
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} color="#6B7280" /> : <Maximize2 size={18} color="#6B7280" />}
          </button>
        )}

        {/* Center on user */}
        {showUserLocation && userLocation && (
          <button
            onClick={centerOnUser}
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
            title="Center on my location"
          >
            <Crosshair size={18} color="#4285F4" />
          </button>
        )}

        {/* Fit all markers */}
        {allMarkerCoords.length > 1 && (
          <button
            onClick={fitAllMarkers}
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
            title="Fit all markers"
          >
            <MapPin size={18} color="#6B7280" />
          </button>
        )}
      </div>

      {/* Coordinates display */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 60,
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 10,
          color: '#9CA3AF',
          zIndex: 1000,
        }}
      >
        {mapCenter.latitude.toFixed(4)}, {mapCenter.longitude.toFixed(4)}
      </div>
    </div>
  );
}

export default LeafletMap;
