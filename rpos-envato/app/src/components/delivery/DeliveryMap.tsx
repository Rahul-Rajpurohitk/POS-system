/**
 * DeliveryMap - Cross-platform map component for delivery tracking
 *
 * Uses Mapbox GL JS for web platform with full interactive maps.
 * Native platforms use a styled placeholder with marker visualization.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Store, MapPin, Navigation, Truck, User } from '@tamagui/lucide-icons';
import { MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '@/config/maps';

// Types
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface MapMarker {
  id: string;
  coordinate: Coordinate;
  type: 'store' | 'driver' | 'customer' | 'pickup' | 'delivery';
  label?: string;
  info?: string;
}

export interface RouteSegment {
  id: string;
  coordinates: Coordinate[];
  color?: string;
  isCompleted?: boolean;
}

export interface DeliveryMapProps {
  center?: Coordinate;
  zoom?: number;
  storeLocation?: Coordinate;
  storeName?: string;
  driverMarkers?: MapMarker[];
  customerMarkers?: MapMarker[];
  route?: RouteSegment[];
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: (coordinate: Coordinate) => void;
  showUserLocation?: boolean;
  mapStyle?: keyof typeof MAP_CONFIG.styles;
  height?: number | string;
  showZoomControls?: boolean;
  isLoading?: boolean;
}

// Marker icon component for native
const MarkerIcon = ({
  type,
  size = 'md',
}: {
  type: MapMarker['type'];
  size?: 'sm' | 'md' | 'lg';
}) => {
  const colors = MAP_CONFIG.markers;
  const color = colors[type] || colors.store;
  const dimensions = { sm: 24, md: 32, lg: 40 }[size];
  const iconSize = { sm: 12, md: 16, lg: 20 }[size];

  const Icon = {
    store: Store,
    driver: Truck,
    customer: User,
    pickup: MapPin,
    delivery: Navigation,
  }[type];

  return (
    <YStack
      width={dimensions}
      height={dimensions}
      borderRadius={dimensions / 2}
      backgroundColor={color}
      alignItems="center"
      justifyContent="center"
      borderWidth={2}
      borderColor="white"
    >
      <Icon size={iconSize} color="white" />
    </YStack>
  );
};

// Web Mapbox Static Image Component (no WebWorker issues)
const WebMapboxMap = ({
  center,
  zoom = MAP_CONFIG.zoom.initial,
  storeLocation,
  storeName,
  driverMarkers = [],
  customerMarkers = [],
}: DeliveryMapProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Calculate center
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (storeLocation) return storeLocation;
    return MAP_CONFIG.defaultCenter;
  }, [center, storeLocation]);

  // Build Mapbox Static Image URL with markers
  const mapImageUrl = useMemo(() => {
    const lon = mapCenter.longitude;
    const lat = mapCenter.latitude;

    // Build marker overlays
    const markers: string[] = [];

    // Store marker (blue pin)
    if (storeLocation) {
      markers.push(`pin-l-home+3B82F6(${storeLocation.longitude},${storeLocation.latitude})`);
    }

    // Customer markers (green)
    customerMarkers.slice(0, 5).forEach((m) => {
      markers.push(`pin-s-c+10B981(${m.coordinate.longitude},${m.coordinate.latitude})`);
    });

    // Driver markers (orange)
    driverMarkers.slice(0, 5).forEach((m) => {
      markers.push(`pin-s-car+F59E0B(${m.coordinate.longitude},${m.coordinate.latitude})`);
    });

    const overlays = markers.length > 0 ? markers.join(',') + '/' : '';

    // Static Image API URL
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlays}${lon},${lat},${zoom},0/800x600@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  }, [mapCenter, storeLocation, customerMarkers, driverMarkers, zoom]);


  return (
    <YStack flex={1} position="relative">
      {/* Map Image */}
      <img
        src={mapImageUrl}
        alt="Delivery Map"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 8,
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
      />

      {/* Loading overlay */}
      {!imageLoaded && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="#E8F4F8"
          justifyContent="center"
          alignItems="center"
          borderRadius="$2"
        >
          <Spinner size="large" color={MAP_CONFIG.markers.store} />
          <Text color="#6B7280" marginTop="$2">Loading map...</Text>
        </YStack>
      )}

      {/* Store info overlay */}
      {storeName && (
        <YStack
          position="absolute"
          top={12}
          left={12}
          backgroundColor="white"
          borderRadius="$2"
          padding="$2"
          borderWidth={1}
          borderColor="#E5E7EB"
        >
          <XStack alignItems="center" gap="$2">
            <YStack
              width={28}
              height={28}
              borderRadius={14}
              backgroundColor={MAP_CONFIG.markers.store}
              alignItems="center"
              justifyContent="center"
            >
              <Store size={14} color="white" />
            </YStack>
            <Text fontSize={12} fontWeight="600" color="#111827">{storeName}</Text>
          </XStack>
        </YStack>
      )}


      {/* Delivery counts */}
      {(driverMarkers.length > 0 || customerMarkers.length > 0) && (
        <YStack
          position="absolute"
          bottom={12}
          left={12}
          backgroundColor="white"
          paddingHorizontal="$2.5"
          paddingVertical="$1.5"
          borderRadius="$2"
          borderWidth={1}
          borderColor="#E5E7EB"
        >
          <XStack alignItems="center" gap="$3">
            {driverMarkers.length > 0 && (
              <XStack alignItems="center" gap="$1">
                <Truck size={14} color={MAP_CONFIG.markers.driver} />
                <Text fontSize={11} fontWeight="600" color="#374151">{driverMarkers.length}</Text>
              </XStack>
            )}
            {customerMarkers.length > 0 && (
              <XStack alignItems="center" gap="$1">
                <User size={14} color={MAP_CONFIG.markers.customer} />
                <Text fontSize={11} fontWeight="600" color="#374151">{customerMarkers.length}</Text>
              </XStack>
            )}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
};

// Native placeholder component
const NativePlaceholder = ({
  storeLocation,
  storeName,
  driverMarkers = [],
  customerMarkers = [],
}: DeliveryMapProps) => {
  const mapCenter = storeLocation || MAP_CONFIG.defaultCenter;

  return (
    <YStack flex={1} backgroundColor="#E8F4F8" position="relative">
      {/* Grid pattern background */}
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} opacity={0.15}>
        {[...Array(25)].map((_, i) => (
          <YStack key={`h-${i}`} position="absolute" top={`${i * 4}%`} left={0} right={0} height={1} backgroundColor="#7CB9E8" />
        ))}
        {[...Array(25)].map((_, i) => (
          <YStack key={`v-${i}`} position="absolute" left={`${i * 4}%`} top={0} bottom={0} width={1} backgroundColor="#7CB9E8" />
        ))}
      </YStack>

      {/* Center marker */}
      <YStack flex={1} justifyContent="center" alignItems="center">
        <YStack alignItems="center">
          <YStack
            width={56}
            height={56}
            borderRadius={28}
            backgroundColor={MAP_CONFIG.markers.store}
            alignItems="center"
            justifyContent="center"
            borderWidth={4}
            borderColor="white"
          >
            <Store size={28} color="white" />
          </YStack>
          {storeName && (
            <YStack
              marginTop="$2"
              backgroundColor="white"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$2"
              borderWidth={1}
              borderColor="#E5E7EB"
            >
              <Text fontSize={12} fontWeight="600" color="#111827">{storeName}</Text>
            </YStack>
          )}
        </YStack>
      </YStack>

      {/* Driver markers */}
      {driverMarkers.slice(0, 3).map((marker, index) => (
        <YStack
          key={marker.id}
          position="absolute"
          top={`${30 + index * 15}%`}
          left={`${20 + index * 25}%`}
        >
          <MarkerIcon type="driver" size="sm" />
        </YStack>
      ))}

      {/* Customer markers */}
      {customerMarkers.slice(0, 3).map((marker, index) => (
        <YStack
          key={marker.id}
          position="absolute"
          bottom={`${25 + index * 10}%`}
          right={`${15 + index * 20}%`}
        >
          <MarkerIcon type="customer" size="sm" />
        </YStack>
      ))}

    </YStack>
  );
};

// Main DeliveryMap Component
export function DeliveryMap(props: DeliveryMapProps) {
  const { isLoading, height = '100%', storeLocation, center } = props;

  const mapCenter = center || storeLocation || MAP_CONFIG.defaultCenter;

  if (isLoading) {
    return (
      <YStack flex={1} height={height} backgroundColor="#E8F4F8" justifyContent="center" alignItems="center">
        <Spinner size="large" color={MAP_CONFIG.markers.store} />
        <Text color="#6B7280" marginTop="$2">Loading map...</Text>
      </YStack>
    );
  }

  // If no coordinates available
  if (!mapCenter || (mapCenter.latitude === 0 && mapCenter.longitude === 0)) {
    return (
      <YStack flex={1} height={height} backgroundColor="#E8F4F8" justifyContent="center" alignItems="center" padding="$4">
        <MarkerIcon type="store" size="lg" />
        <Text color="#6B7280" marginTop="$3" textAlign="center" fontSize={14} fontWeight="500">
          Store Location Not Set
        </Text>
        <Text color="#9CA3AF" marginTop="$1" textAlign="center" fontSize={12}>
          Configure your store address in Settings to see the map
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} height={height} overflow="hidden" borderRadius="$2" position="relative">
      {Platform.OS === 'web' ? (
        <WebMapboxMap {...props} />
      ) : (
        <NativePlaceholder {...props} />
      )}

      {/* Coordinates display */}
      <YStack
        position="absolute"
        bottom={Platform.OS === 'web' ? 12 : 80}
        right={12}
        backgroundColor="rgba(255,255,255,0.95)"
        paddingHorizontal="$2"
        paddingVertical="$1"
        borderRadius="$1"
        zIndex={100}
      >
        <Text fontSize={9} color="#9CA3AF">
          {mapCenter.latitude.toFixed(4)}, {mapCenter.longitude.toFixed(4)}
        </Text>
      </YStack>
    </YStack>
  );
}

export default DeliveryMap;
