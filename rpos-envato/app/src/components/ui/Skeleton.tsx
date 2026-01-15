import React, { useEffect } from 'react';
import { YStack, XStack, styled, GetProps } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const SkeletonBase = styled(YStack, {
  backgroundColor: '$borderColor',
  borderRadius: '$2',
  overflow: 'hidden',
});

type SkeletonBaseProps = GetProps<typeof SkeletonBase>;

interface SkeletonProps extends SkeletonBaseProps {
  width?: number | string;
  height?: number | string;
}

/**
 * Animated skeleton placeholder for loading states
 */
export function Skeleton({ width = '100%', height = 20, ...props }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ width: width as number, height: height as number }, animatedStyle]}>
      <SkeletonBase width="100%" height="100%" {...props} />
    </Animated.View>
  );
}

interface SkeletonTextProps {
  lines?: number;
  width?: number | string;
  lineHeight?: number;
  gap?: number;
}

/**
 * Multi-line text skeleton for loading paragraphs
 */
export function SkeletonText({ lines = 3, width = '100%', lineHeight = 16, gap = 8 }: SkeletonTextProps) {
  return (
    <YStack gap={gap}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : width}
          height={lineHeight}
        />
      ))}
    </YStack>
  );
}

interface SkeletonCardProps {
  hasAvatar?: boolean;
  lines?: number;
}

/**
 * Card skeleton for list items
 */
export function SkeletonCard({ hasAvatar = true, lines = 2 }: SkeletonCardProps) {
  return (
    <YStack
      backgroundColor="$cardBackground"
      padding="$4"
      borderRadius="$3"
      gap="$3"
    >
      <XStack gap="$3" alignItems="center">
        {hasAvatar && (
          <Skeleton width={48} height={48} borderRadius={24} />
        )}
        <YStack flex={1} gap="$2">
          <Skeleton width="70%" height={20} />
          {lines > 1 && <Skeleton width="50%" height={14} />}
        </YStack>
      </XStack>
      {lines > 2 && (
        <YStack gap="$2">
          <Skeleton width="100%" height={14} />
          <Skeleton width="80%" height={14} />
        </YStack>
      )}
    </YStack>
  );
}

interface SkeletonListProps {
  count?: number;
  hasAvatar?: boolean;
  gap?: number;
}

/**
 * List of skeleton cards for loading lists
 */
export function SkeletonList({ count = 5, hasAvatar = true, gap = 12 }: SkeletonListProps) {
  return (
    <YStack gap={gap}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} hasAvatar={hasAvatar} />
      ))}
    </YStack>
  );
}

interface SkeletonTableRowProps {
  columns?: number;
}

/**
 * Table row skeleton for tabular data
 */
export function SkeletonTableRow({ columns = 4 }: SkeletonTableRowProps) {
  return (
    <XStack
      backgroundColor="$cardBackground"
      padding="$3"
      borderRadius="$2"
      gap="$3"
      alignItems="center"
    >
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton
          key={index}
          flex={index === 0 ? 2 : 1}
          height={16}
        />
      ))}
    </XStack>
  );
}

/**
 * Dashboard stat card skeleton
 */
export function SkeletonStatCard() {
  return (
    <YStack
      backgroundColor="$cardBackground"
      padding="$4"
      borderRadius="$3"
      gap="$2"
      minWidth={150}
    >
      <Skeleton width={40} height={40} borderRadius={8} />
      <Skeleton width="50%" height={14} />
      <Skeleton width="80%" height={28} />
    </YStack>
  );
}
