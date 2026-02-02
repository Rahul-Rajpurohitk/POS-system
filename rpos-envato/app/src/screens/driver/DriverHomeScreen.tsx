import React, { useEffect } from 'react';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { RefreshCw, Bell, AlertCircle } from '@tamagui/lucide-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import {
  DriverStatusToggle,
  DeliveryCard,
  DriverStatsCard,
} from '@/components/driver';
import { useDriverStore } from '@/store/driverStore';
import { useAuthStore } from '@/store';
import {
  useDriverProfile,
  useDriverStats,
  useActiveDelivery,
  useUpdateDriverStatus,
} from '@/features/driver/hooks';
import { useLocationTracking } from '@/hooks';
import type { DriverTabScreenProps } from '@/navigation/types';
import type { DriverStatus, DeliveryStatus } from '@/types';

export default function DriverHomeScreen({
  navigation,
}: DriverTabScreenProps<'DriverHome'>) {
  const { user } = useAuthStore();
  const { status, isOnline, profile } = useDriverStore();

  // Queries
  const {
    data: driverProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useDriverProfile();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useDriverStats();

  const {
    data: activeDelivery,
    isLoading: deliveryLoading,
    refetch: refetchDelivery,
  } = useActiveDelivery();

  // Mutations
  const updateStatus = useUpdateDriverStatus();

  // Location tracking
  const {
    isTracking,
    hasPermission,
    error: locationError,
    startTracking,
    stopTracking,
    requestPermission,
  } = useLocationTracking();

  // Start/stop location tracking based on online status
  useEffect(() => {
    if (isOnline && !isTracking) {
      startTracking();
    } else if (!isOnline && isTracking) {
      stopTracking();
    }
  }, [isOnline, isTracking, startTracking, stopTracking]);

  const handleStatusToggle = async (goOnline: boolean) => {
    if (goOnline && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    const newStatus: DriverStatus = goOnline ? 'available' : 'offline';
    updateStatus.mutate(newStatus);
  };

  const handleBreak = () => {
    updateStatus.mutate('on_break');
  };

  const handleRefresh = () => {
    refetchProfile();
    refetchStats();
    refetchDelivery();
  };

  const handleNavigate = () => {
    if (activeDelivery) {
      navigation.navigate('DeliveryMap', { deliveryId: activeDelivery.id });
    }
  };

  const handleCall = () => {
    // TODO: Implement phone call
    if (activeDelivery?.customerPhone) {
      // Linking.openURL(`tel:${activeDelivery.customerPhone}`);
    }
  };

  const handleUpdateStatus = (newStatus: DeliveryStatus) => {
    // This is handled in the DeliveryCard component
    // Will navigate to appropriate screen based on status
  };

  const isLoading = profileLoading || statsLoading || deliveryLoading;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$4" gap="$4">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize={24} fontWeight="bold">
                Hi, {user?.firstName || 'Driver'}
              </Text>
              <Text fontSize={14} color="$colorSecondary">
                Let's make some deliveries!
              </Text>
            </YStack>
            <XStack gap="$2">
              <Button
                size="icon"
                variant="ghost"
                onPress={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner size="small" />
                ) : (
                  <RefreshCw size={20} />
                )}
              </Button>
              <Button size="icon" variant="ghost">
                <Bell size={20} />
              </Button>
            </XStack>
          </XStack>

          {/* Location Permission Warning */}
          {!hasPermission && (
            <Card padding="$3" backgroundColor="$warningBackground">
              <XStack alignItems="center" gap="$2">
                <AlertCircle size={20} color="$warning" />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$warning">
                    Location Permission Required
                  </Text>
                  <Text fontSize={12} color="$colorSecondary">
                    Enable location to receive deliveries
                  </Text>
                </YStack>
                <Button size="sm" onPress={requestPermission}>
                  Enable
                </Button>
              </XStack>
            </Card>
          )}

          {/* Location Error */}
          {locationError && (
            <Card padding="$3" backgroundColor="$errorBackground">
              <XStack alignItems="center" gap="$2">
                <AlertCircle size={20} color="$error" />
                <Text fontSize={14} color="$error" flex={1}>
                  {locationError}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Status Toggle */}
          <DriverStatusToggle
            status={status}
            onToggle={handleStatusToggle}
            onBreak={handleBreak}
            isLoading={updateStatus.isPending}
            deliveriesToday={stats?.deliveriesToday || profile?.deliveriesToday || 0}
          />

          {/* Active Delivery */}
          {activeDelivery && (
            <YStack>
              <Text fontSize={16} fontWeight="600" marginBottom="$2">
                Active Delivery
              </Text>
              <DeliveryCard
                delivery={activeDelivery}
                isActive
                onNavigate={handleNavigate}
                onCall={handleCall}
                onUpdateStatus={handleUpdateStatus}
              />
            </YStack>
          )}

          {/* No Active Delivery Message */}
          {!activeDelivery && isOnline && (
            <Card padding="$6" alignItems="center">
              <Text fontSize={48} marginBottom="$2">
                🚗
              </Text>
              <Text fontSize={16} fontWeight="600" textAlign="center">
                Waiting for deliveries
              </Text>
              <Text fontSize={14} color="$colorSecondary" textAlign="center">
                You'll be notified when a new delivery is assigned
              </Text>
            </Card>
          )}

          {/* Offline Message */}
          {!isOnline && !activeDelivery && (
            <Card padding="$6" alignItems="center">
              <Text fontSize={48} marginBottom="$2">
                😴
              </Text>
              <Text fontSize={16} fontWeight="600" textAlign="center">
                You're offline
              </Text>
              <Text fontSize={14} color="$colorSecondary" textAlign="center">
                Go online to start receiving deliveries
              </Text>
            </Card>
          )}

          {/* Stats */}
          {stats && (
            <YStack>
              <Text fontSize={16} fontWeight="600" marginBottom="$2">
                Your Stats
              </Text>
              <DriverStatsCard stats={stats} showEarnings />
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
