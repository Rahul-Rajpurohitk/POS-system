/**
 * AnimatedCapsule - Enterprise-grade expandable capsule component
 *
 * Features:
 * - Spring-based expand/collapse animations
 * - Horizontal and vertical expansion modes
 * - Gesture-driven interactions
 * - Smooth backdrop blur effects
 * - Professional micro-interactions
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

// Spring configuration for smooth, professional animations
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

// Faster spring for quick interactions
const QUICK_SPRING = {
  damping: 22,
  stiffness: 300,
  mass: 0.6,
};

// Expansion direction types
export type ExpansionDirection = 'down' | 'up' | 'left' | 'right';

export interface AnimatedCapsuleProps {
  // Core props
  isExpanded: boolean;
  onToggle: () => void;

  // Expansion configuration
  direction?: ExpansionDirection;
  collapsedHeight?: number;
  expandedHeight?: number;
  collapsedWidth?: number;
  expandedWidth?: number;

  // Content
  collapsedContent: React.ReactNode;
  expandedContent: React.ReactNode;

  // Styling
  backgroundColor?: string;
  expandedBackgroundColor?: string;
  borderRadius?: number;
  shadowIntensity?: 'light' | 'medium' | 'heavy';
  accentColor?: string;

  // Animation options
  animationSpeed?: 'slow' | 'normal' | 'fast';

  // Additional styling
  style?: ViewStyle;
  containerStyle?: ViewStyle;

  // Callbacks
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;

  // Accessibility
  accessibilityLabel?: string;
  testID?: string;
}

// Shadow presets
const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
};

export function AnimatedCapsule({
  isExpanded,
  onToggle,
  direction = 'down',
  collapsedHeight = 48,
  expandedHeight = 200,
  collapsedWidth,
  expandedWidth,
  collapsedContent,
  expandedContent,
  backgroundColor = '#FFFFFF',
  expandedBackgroundColor,
  borderRadius = 24,
  shadowIntensity = 'medium',
  accentColor = '#3B82F6',
  animationSpeed = 'normal',
  style,
  containerStyle,
  onAnimationStart,
  onAnimationComplete,
  accessibilityLabel,
  testID,
}: AnimatedCapsuleProps) {
  // Animation progress (0 = collapsed, 1 = expanded)
  const progress = useSharedValue(isExpanded ? 1 : 0);
  const contentOpacity = useSharedValue(isExpanded ? 1 : 0);
  const scale = useSharedValue(1);

  // Determine if horizontal or vertical expansion
  const isHorizontal = direction === 'left' || direction === 'right';

  // Animation speed multiplier
  const speedMultiplier = useMemo(() => {
    switch (animationSpeed) {
      case 'slow': return 1.5;
      case 'fast': return 0.6;
      default: return 1;
    }
  }, [animationSpeed]);

  // Update animation when isExpanded changes
  useEffect(() => {
    if (onAnimationStart) {
      runOnJS(onAnimationStart)();
    }

    // Animate progress
    progress.value = withSpring(isExpanded ? 1 : 0, {
      ...SPRING_CONFIG,
      stiffness: SPRING_CONFIG.stiffness / speedMultiplier,
    });

    // Animate content opacity with slight delay for expand, immediate for collapse
    if (isExpanded) {
      contentOpacity.value = withTiming(1, {
        duration: 200 * speedMultiplier,
        easing: Easing.out(Easing.cubic),
      }, () => {
        if (onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      });
    } else {
      contentOpacity.value = withTiming(0, {
        duration: 100 * speedMultiplier,
        easing: Easing.in(Easing.cubic),
      }, () => {
        if (onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      });
    }
  }, [isExpanded, speedMultiplier, onAnimationStart, onAnimationComplete]);

  // Press feedback animation
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, QUICK_SPRING);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, QUICK_SPRING);
  }, []);

  // Main container animated style
  const containerAnimatedStyle = useAnimatedStyle(() => {
    // Calculate dimensions based on direction
    let height, width;

    if (isHorizontal) {
      height = collapsedHeight;
      width = collapsedWidth
        ? interpolate(progress.value, [0, 1], [collapsedWidth, expandedWidth || collapsedWidth * 2])
        : undefined;
    } else {
      height = interpolate(
        progress.value,
        [0, 1],
        [collapsedHeight, expandedHeight],
        Extrapolate.CLAMP
      );
      width = collapsedWidth;
    }

    // Calculate border radius animation (slightly reduce when expanded)
    const animatedBorderRadius = interpolate(
      progress.value,
      [0, 1],
      [borderRadius, Math.max(borderRadius * 0.8, 16)],
      Extrapolate.CLAMP
    );

    // Background color interpolation would need color interpolation library
    // For now, we'll use the expanded color when progress > 0.5

    return {
      height,
      width,
      borderRadius: animatedBorderRadius,
      transform: [{ scale: scale.value }],
    };
  }, [collapsedHeight, expandedHeight, collapsedWidth, expandedWidth, borderRadius, isHorizontal]);

  // Collapsed content animated style
  const collapsedAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        progress.value,
        [0, 0.3],
        [1, 0],
        Extrapolate.CLAMP
      ),
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: progress.value < 0.5 ? 1 : 0,
    };
  }, []);

  // Expanded content animated style
  const expandedAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: progress.value >= 0.5 ? 1 : 0,
    };
  }, []);

  // Indicator dot/chevron animation
  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const rotation = isHorizontal
      ? interpolate(progress.value, [0, 1], [0, direction === 'right' ? 180 : -180])
      : interpolate(progress.value, [0, 1], [0, direction === 'down' ? 180 : -180]);

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  }, [direction, isHorizontal]);

  // Get shadow style
  const shadowStyle = SHADOWS[shadowIntensity];

  // Computed background color
  const bgColor = isExpanded && expandedBackgroundColor
    ? expandedBackgroundColor
    : backgroundColor;

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      testID={testID}
      style={containerStyle}
    >
      <Animated.View
        style={[
          styles.container,
          shadowStyle,
          { backgroundColor: bgColor },
          containerAnimatedStyle,
          style,
        ]}
      >
        {/* Collapsed Content */}
        <Animated.View style={[styles.contentWrapper, collapsedAnimatedStyle]}>
          {collapsedContent}
        </Animated.View>

        {/* Expanded Content */}
        <Animated.View style={[styles.contentWrapper, expandedAnimatedStyle]}>
          {expandedContent}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// Simpler capsule for basic expand/collapse with icon
export interface SimpleCapsuleProps {
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedContent: React.ReactNode;
  accentColor?: string;
  expandedHeight?: number;
}

export function SimpleCapsule({
  icon,
  label,
  value,
  isExpanded,
  onToggle,
  expandedContent,
  accentColor = '#3B82F6',
  expandedHeight = 180,
}: SimpleCapsuleProps) {
  return (
    <AnimatedCapsule
      isExpanded={isExpanded}
      onToggle={onToggle}
      collapsedHeight={44}
      expandedHeight={expandedHeight}
      borderRadius={22}
      accentColor={accentColor}
      collapsedContent={
        <XStack
          flex={1}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$3"
        >
          <XStack alignItems="center" gap="$2">
            {icon}
            <Text fontSize={13} fontWeight="600" color="#374151">
              {label}
            </Text>
          </XStack>
          {value !== undefined && (
            <XStack
              backgroundColor={`${accentColor}15`}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={12}
            >
              <Text fontSize={12} fontWeight="600" color={accentColor}>
                {value}
              </Text>
            </XStack>
          )}
        </XStack>
      }
      expandedContent={
        <YStack flex={1} padding="$3">
          {/* Header in expanded state */}
          <XStack alignItems="center" gap="$2" marginBottom="$3">
            {icon}
            <Text fontSize={14} fontWeight="600" color="#111827">
              {label}
            </Text>
          </XStack>
          {/* Expanded content */}
          {expandedContent}
        </YStack>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    // Hardware acceleration for smooth animations
    ...(Platform.OS === 'web' ? {
      willChange: 'transform, height, width',
      backfaceVisibility: 'hidden',
    } : {}),
  },
  contentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default AnimatedCapsule;
