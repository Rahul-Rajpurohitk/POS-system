import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { YStack, XStack, styled } from 'tamagui';
import { Card } from '@/components/ui';

// ============================================
// Animated Skeleton Base
// ============================================

const SkeletonBase = styled(YStack, {
  backgroundColor: '$backgroundPress',
  overflow: 'hidden',
});

function AnimatedSkeleton({ children }: { children: React.ReactNode }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
}

// ============================================
// Skeleton Components
// ============================================

export function SkeletonBox({
  width,
  height,
  borderRadius = '$2',
}: {
  width: number | string;
  height: number;
  borderRadius?: string;
}) {
  return (
    <AnimatedSkeleton>
      <SkeletonBase
        width={width}
        height={height}
        borderRadius={borderRadius as any}
      />
    </AnimatedSkeleton>
  );
}

export function SkeletonText({
  width = '100%',
  lines = 1,
}: {
  width?: number | string;
  lines?: number;
}) {
  return (
    <YStack gap="$1">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 && lines > 1 ? '70%' : width}
          height={14}
          borderRadius="$1"
        />
      ))}
    </YStack>
  );
}

// ============================================
// Order Notification Skeleton
// ============================================

export function OnlineOrderNotificationSkeleton() {
  return (
    <Card padding="$3" marginBottom="$2">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap="$2">
          {/* Order number */}
          <SkeletonBox width={120} height={18} />
          {/* Customer name */}
          <SkeletonBox width={150} height={14} />
          {/* Address */}
          <SkeletonBox width="90%" height={14} />
          {/* Items and total */}
          <XStack gap="$4" marginTop="$1">
            <SkeletonBox width={80} height={12} />
            <SkeletonBox width={60} height={12} />
          </XStack>
        </YStack>

        {/* Timer */}
        <SkeletonBox width={60} height={40} borderRadius="$3" />
      </XStack>

      {/* Action buttons */}
      <XStack gap="$2" marginTop="$3">
        <SkeletonBox width="30%" height={36} borderRadius="$3" />
        <SkeletonBox width="30%" height={36} borderRadius="$3" />
        <SkeletonBox width="30%" height={36} borderRadius="$3" />
      </XStack>
    </Card>
  );
}

// ============================================
// Delivery Card Skeleton
// ============================================

export function DeliveryCardSkeleton() {
  return (
    <Card padding="$3" marginBottom="$3">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
        <YStack flex={1} gap="$1">
          <SkeletonBox width={140} height={18} />
          <SkeletonBox width={100} height={12} />
        </YStack>
        <SkeletonBox width={70} height={24} borderRadius="$2" />
      </XStack>

      {/* Customer & Address */}
      <YStack
        backgroundColor="$backgroundPress"
        padding="$2"
        borderRadius="$2"
        marginBottom="$3"
        gap="$2"
      >
        <XStack alignItems="center" gap="$2">
          <SkeletonBox width={14} height={14} borderRadius="$1" />
          <SkeletonBox width={120} height={14} />
        </XStack>
        <XStack alignItems="flex-start" gap="$2">
          <SkeletonBox width={14} height={14} borderRadius="$1" />
          <SkeletonBox width="80%" height={14} />
        </XStack>
      </YStack>

      {/* Driver section */}
      <XStack
        alignItems="center"
        gap="$2"
        marginBottom="$3"
        padding="$2"
        backgroundColor="$backgroundPress"
        borderRadius="$2"
      >
        <SkeletonBox width={32} height={32} borderRadius="$10" />
        <YStack flex={1} gap="$1">
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width={80} height={12} />
        </YStack>
      </XStack>

      {/* Actions */}
      <XStack gap="$2">
        <SkeletonBox width="45%" height={36} borderRadius="$3" />
        <SkeletonBox width="45%" height={36} borderRadius="$3" />
      </XStack>
    </Card>
  );
}

// ============================================
// Stats Card Skeleton
// ============================================

export function StatsCardSkeleton() {
  return (
    <Card flex={1} padding="$3" alignItems="center">
      <SkeletonBox width={24} height={24} borderRadius="$2" />
      <SkeletonBox width={40} height={24} borderRadius="$2" />
      <SkeletonBox width={60} height={12} borderRadius="$1" />
    </Card>
  );
}

// ============================================
// Driver Card Skeleton
// ============================================

export function DriverCardSkeleton() {
  return (
    <Card padding="$3" marginBottom="$2">
      <XStack alignItems="center" gap="$3">
        {/* Avatar */}
        <SkeletonBox width={48} height={48} borderRadius="$10" />

        {/* Info */}
        <YStack flex={1} gap="$1">
          <SkeletonBox width={120} height={16} />
          <XStack gap="$2">
            <SkeletonBox width={60} height={12} />
            <SkeletonBox width={80} height={12} />
          </XStack>
        </YStack>

        {/* Score badge */}
        <SkeletonBox width={40} height={40} borderRadius="$2" />
      </XStack>
    </Card>
  );
}

// ============================================
// Panel Skeletons
// ============================================

export function OnlineOrdersPanelSkeleton() {
  return (
    <YStack>
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <SkeletonBox width={40} height={40} borderRadius="$2" />
          <YStack gap="$1">
            <SkeletonBox width={100} height={16} />
            <SkeletonBox width={60} height={12} />
          </YStack>
        </XStack>
      </XStack>

      {/* Order cards */}
      <OnlineOrderNotificationSkeleton />
      <OnlineOrderNotificationSkeleton />
    </YStack>
  );
}

export function ActiveDeliveriesPanelSkeleton() {
  return (
    <YStack flex={1}>
      {/* Stats Row */}
      <XStack gap="$2" marginBottom="$4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </XStack>

      {/* Delivery cards */}
      <DeliveryCardSkeleton />
      <DeliveryCardSkeleton />
      <DeliveryCardSkeleton />
    </YStack>
  );
}

export function DriverListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <YStack gap="$1">
      {Array.from({ length: count }).map((_, i) => (
        <DriverCardSkeleton key={i} />
      ))}
    </YStack>
  );
}

// ============================================
// Export all
// ============================================

export const Skeletons = {
  Box: SkeletonBox,
  Text: SkeletonText,
  OnlineOrderNotification: OnlineOrderNotificationSkeleton,
  DeliveryCard: DeliveryCardSkeleton,
  StatsCard: StatsCardSkeleton,
  DriverCard: DriverCardSkeleton,
  OnlineOrdersPanel: OnlineOrdersPanelSkeleton,
  ActiveDeliveriesPanel: ActiveDeliveriesPanelSkeleton,
  DriverList: DriverListSkeleton,
};

export default Skeletons;
