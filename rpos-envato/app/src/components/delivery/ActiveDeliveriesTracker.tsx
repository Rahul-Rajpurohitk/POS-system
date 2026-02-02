/**
 * ActiveDeliveriesTracker - POS dashboard component for tracking all active deliveries
 *
 * Features:
 * - Real-time map with all driver locations
 * - Delivery status cards with ETA
 * - Quick actions (call driver, view details)
 * - Status filters
 * - Auto-refresh
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Dimensions, Linking } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner, Avatar } from 'tamagui';
import {
  MapPin,
  Clock,
  Phone,
  Truck,
  Store,
  User,
  Navigation,
  ChevronRight,
  RefreshCw,
  Package,
  CheckCircle,
  AlertTriangle,
  Timer,
  Zap,
  Eye,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { DeliveryStatusBadge } from '@/components/driver';
// Import directly to avoid require cycle
import { NavigationMap } from './NavigationMap.web';
import type { Coordinate } from './DeliveryMap';
import { useActiveDeliveries } from '@/features/delivery/hooks';
import { formatDistance, formatDuration } from '@/hooks';
import type { Delivery, DeliveryStatus } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActiveDeliveriesTrackerProps {
  storeLocation?: Coordinate;
  onSelectDelivery?: (delivery: Delivery) => void;
  onAssignDriver?: (delivery: Delivery) => void;
  showMap?: boolean;
  maxHeight?: number;
}

// Status filter options
const STATUS_FILTERS: { key: DeliveryStatus | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '$primary' },
  { key: 'pending', label: 'Pending', color: '$warning' },
  { key: 'accepted', label: 'Accepted', color: '$info' },
  { key: 'assigned', label: 'Assigned', color: '$primary' },
  { key: 'picking_up', label: 'Picking Up', color: '$warning' },
  { key: 'on_the_way', label: 'On the Way', color: '$success' },
];

// Compact delivery card for the list
function DeliveryCard({
  delivery,
  onSelect,
  onCall,
  onAssign,
}: {
  delivery: Delivery;
  onSelect: () => void;
  onCall: () => void;
  onAssign?: () => void;
}) {
  const needsDriver = ['pending', 'accepted'].includes(delivery.status);
  const isActive = ['picking_up', 'picked_up', 'on_the_way', 'nearby'].includes(delivery.status);

  // Calculate time since created
  const getTimeSince = () => {
    const created = new Date(delivery.createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  // Calculate ETA remaining
  const getETARemaining = () => {
    if (!delivery.estimatedArrival) return null;
    const eta = new Date(delivery.estimatedArrival);
    const now = new Date();
    const diff = Math.max(0, Math.floor((eta.getTime() - now.getTime()) / 60000));
    return diff;
  };

  const etaRemaining = getETARemaining();

  return (
    <Card
      padding="$3"
      marginBottom="$2"
      pressStyle={{ scale: 0.99, opacity: 0.9 }}
      animation="quick"
      onPress={onSelect}
    >
      <XStack alignItems="flex-start" gap="$3">
        {/* Status Indicator */}
        <YStack alignItems="center" gap="$1">
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor={needsDriver ? '$warningBackground' : isActive ? '$successBackground' : '$primaryBackground'}
            alignItems="center"
            justifyContent="center"
          >
            {needsDriver ? (
              <AlertTriangle size={22} color="$warning" />
            ) : isActive ? (
              <Truck size={22} color="$success" />
            ) : (
              <Package size={22} color="$primary" />
            )}
          </YStack>
          {etaRemaining !== null && isActive && (
            <Text fontSize={10} fontWeight="bold" color={etaRemaining <= 5 ? '$error' : '$success'}>
              {etaRemaining}min
            </Text>
          )}
        </YStack>

        {/* Content */}
        <YStack flex={1}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1}>
              <XStack alignItems="center" gap="$2">
                <Text fontSize={15} fontWeight="600">
                  #{delivery.order?.orderNumber || delivery.orderId.slice(-6)}
                </Text>
                <DeliveryStatusBadge status={delivery.status} size="sm" />
              </XStack>
              <Text fontSize={13} color="$colorSecondary" marginTop="$1">
                {delivery.customerName}
              </Text>
            </YStack>
            <Text fontSize={11} color="$colorSecondary">
              {getTimeSince()}
            </Text>
          </XStack>

          {/* Address */}
          <XStack alignItems="center" gap="$1" marginTop="$2">
            <MapPin size={12} color="$colorSecondary" />
            <Text fontSize={12} color="$colorSecondary" numberOfLines={1} flex={1}>
              {delivery.deliveryAddress}
            </Text>
          </XStack>

          {/* Driver info or Assign button */}
          <XStack marginTop="$2" justifyContent="space-between" alignItems="center">
            {delivery.driver ? (
              <XStack alignItems="center" gap="$2">
                <Avatar circular size="$2">
                  <Avatar.Fallback backgroundColor="$primary">
                    <Text color="white" fontSize={10}>
                      {delivery.driver.user?.firstName?.charAt(0) || 'D'}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>
                <Text fontSize={12}>
                  {delivery.driver.user?.firstName || 'Driver'}
                </Text>
                <Button
                  size="icon"
                  variant="ghost"
                  padding="$1"
                  onPress={() => onCall()}
                >
                  <Phone size={14} color="$primary" />
                </Button>
              </XStack>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                backgroundColor="$warningBackground"
                onPress={() => onAssign?.()}
              >
                <User size={14} color="$warning" />
                <Text fontSize={12} color="$warning" marginLeft="$1">
                  Assign Driver
                </Text>
              </Button>
            )}

            <XStack alignItems="center" gap="$2">
              {delivery.distanceMeters && (
                <XStack alignItems="center" gap="$1">
                  <Navigation size={12} color="$colorSecondary" />
                  <Text fontSize={11} color="$colorSecondary">
                    {formatDistance(delivery.distanceMeters)}
                  </Text>
                </XStack>
              )}
              <ChevronRight size={16} color="$colorSecondary" />
            </XStack>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}

// Summary stats row
function DeliveryStats({
  deliveries,
}: {
  deliveries: Delivery[];
}) {
  const stats = useMemo(() => {
    const pending = deliveries.filter((d) => ['pending', 'accepted'].includes(d.status)).length;
    const inProgress = deliveries.filter((d) =>
      ['assigned', 'picking_up', 'picked_up', 'on_the_way', 'nearby'].includes(d.status)
    ).length;
    const avgETA = deliveries
      .filter((d) => d.estimatedDurationSeconds)
      .reduce((sum, d) => sum + (d.estimatedDurationSeconds || 0), 0) / (deliveries.length || 1);

    return { pending, inProgress, avgETA: Math.round(avgETA / 60) };
  }, [deliveries]);

  return (
    <XStack gap="$3" marginBottom="$3">
      <Card flex={1} padding="$3" alignItems="center" backgroundColor="$warningBackground">
        <AlertTriangle size={20} color="$warning" />
        <Text fontSize={20} fontWeight="bold" marginTop="$1">
          {stats.pending}
        </Text>
        <Text fontSize={11} color="$colorSecondary">Need Driver</Text>
      </Card>
      <Card flex={1} padding="$3" alignItems="center" backgroundColor="$successBackground">
        <Truck size={20} color="$success" />
        <Text fontSize={20} fontWeight="bold" marginTop="$1">
          {stats.inProgress}
        </Text>
        <Text fontSize={11} color="$colorSecondary">In Progress</Text>
      </Card>
      <Card flex={1} padding="$3" alignItems="center" backgroundColor="$primaryBackground">
        <Timer size={20} color="$primary" />
        <Text fontSize={20} fontWeight="bold" marginTop="$1">
          {stats.avgETA}m
        </Text>
        <Text fontSize={11} color="$colorSecondary">Avg ETA</Text>
      </Card>
    </XStack>
  );
}

export function ActiveDeliveriesTracker({
  storeLocation,
  onSelectDelivery,
  onAssignDriver,
  showMap = true,
  maxHeight,
}: ActiveDeliveriesTrackerProps) {
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const { data: deliveries, isLoading, refetch, isRefetching } = useActiveDeliveries();

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    if (statusFilter === 'all') return deliveries;
    return deliveries.filter((d) => d.status === statusFilter);
  }, [deliveries, statusFilter]);

  // Prepare map markers
  const mapMarkers = useMemo(() => {
    if (!deliveries) return [];

    const markers: Array<{
      id: string;
      position: Coordinate;
      type: 'driver' | 'store' | 'customer';
      label?: string;
    }> = [];

    // Store location
    if (storeLocation) {
      markers.push({
        id: 'store',
        position: storeLocation,
        type: 'store',
        label: 'Store',
      });
    }

    // Delivery destinations and driver locations
    deliveries.forEach((d) => {
      if (d.deliveryLatitude && d.deliveryLongitude) {
        markers.push({
          id: `delivery-${d.id}`,
          position: {
            latitude: d.deliveryLatitude,
            longitude: d.deliveryLongitude,
          },
          type: 'customer',
          label: d.customerName,
        });
      }

      if (d.driver?.currentLatitude && d.driver?.currentLongitude) {
        markers.push({
          id: `driver-${d.id}`,
          position: {
            latitude: d.driver.currentLatitude,
            longitude: d.driver.currentLongitude,
          },
          type: 'driver',
          label: d.driver.user?.firstName || 'Driver',
        });
      }
    });

    return markers;
  }, [deliveries, storeLocation]);

  const handleCallDriver = useCallback((delivery: Delivery) => {
    // Try driver's phone from user profile or delivery customer phone as fallback
    const phone = (delivery.driver?.user as any)?.phone || delivery.customerPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  }, []);

  if (isLoading) {
    return (
      <Card padding="$6" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$3" color="$colorSecondary">
          Loading active deliveries...
        </Text>
      </Card>
    );
  }

  if (!deliveries?.length) {
    return (
      <Card padding="$6" alignItems="center">
        <YStack
          width={60}
          height={60}
          borderRadius={30}
          backgroundColor="$backgroundPress"
          alignItems="center"
          justifyContent="center"
          marginBottom="$3"
        >
          <CheckCircle size={30} color="$success" />
        </YStack>
        <Text fontSize={16} fontWeight="600">
          No Active Deliveries
        </Text>
        <Text fontSize={13} color="$colorSecondary" textAlign="center" marginTop="$1">
          All deliveries have been completed or there are no pending orders.
        </Text>
      </Card>
    );
  }

  return (
    <YStack maxHeight={maxHeight}>
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <Text fontSize={18} fontWeight="bold">
            Active Deliveries
          </Text>
          <YStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            backgroundColor="$primaryBackground"
            borderRadius="$2"
          >
            <Text fontSize={12} fontWeight="600" color="$primary">
              {deliveries.length}
            </Text>
          </YStack>
        </XStack>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            size={16}
            color="$colorSecondary"
            style={{ transform: [{ rotate: isRefetching ? '360deg' : '0deg' }] }}
          />
        </Button>
      </XStack>

      {/* Stats Summary */}
      <DeliveryStats deliveries={deliveries} />

      {/* Map View (Collapsible) */}
      {showMap && (
        <Card
          marginBottom="$3"
          padding={0}
          overflow="hidden"
          height={isMapExpanded ? 300 : 150}
          animation="quick"
        >
          <NavigationMap
            storeLocation={storeLocation || { latitude: 37.7749, longitude: -122.4194 }}
            customerLocation={
              filteredDeliveries[0]?.deliveryLatitude && filteredDeliveries[0]?.deliveryLongitude
                ? {
                    latitude: filteredDeliveries[0].deliveryLatitude,
                    longitude: filteredDeliveries[0].deliveryLongitude,
                  }
                : undefined
            }
            driverLocation={
              filteredDeliveries[0]?.driver?.currentLatitude && filteredDeliveries[0]?.driver?.currentLongitude
                ? {
                    latitude: filteredDeliveries[0].driver.currentLatitude,
                    longitude: filteredDeliveries[0].driver.currentLongitude,
                  }
                : undefined
            }
            height={isMapExpanded ? 300 : 150}
          />
          <Button
            position="absolute"
            bottom="$2"
            right="$2"
            size="sm"
            variant="secondary"
            backgroundColor="$background"
            onPress={() => setIsMapExpanded(!isMapExpanded)}
          >
            <Eye size={14} />
            <Text fontSize={11} marginLeft="$1">
              {isMapExpanded ? 'Collapse' : 'Expand'}
            </Text>
          </Button>
        </Card>
      )}

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        marginBottom="$2"
      >
        <XStack gap="$2">
          {STATUS_FILTERS.map((filter) => {
            const isSelected = statusFilter === filter.key;
            const count =
              filter.key === 'all'
                ? deliveries.length
                : deliveries.filter((d) => d.status === filter.key).length;

            return (
              <Button
                key={filter.key}
                size="sm"
                variant={isSelected ? 'primary' : 'secondary'}
                onPress={() => setStatusFilter(filter.key)}
                paddingHorizontal="$3"
              >
                <Text
                  color={isSelected ? 'white' : '$color'}
                  fontSize={12}
                >
                  {filter.label}
                </Text>
                <Text
                  color={isSelected ? 'white' : '$colorSecondary'}
                  fontSize={11}
                  marginLeft="$1"
                >
                  ({count})
                </Text>
              </Button>
            );
          })}
        </XStack>
      </ScrollView>

      {/* Delivery List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredDeliveries.map((delivery) => (
          <DeliveryCard
            key={delivery.id}
            delivery={delivery}
            onSelect={() => onSelectDelivery?.(delivery)}
            onCall={() => handleCallDriver(delivery)}
            onAssign={() => onAssignDriver?.(delivery)}
          />
        ))}
      </ScrollView>
    </YStack>
  );
}

export default ActiveDeliveriesTracker;
