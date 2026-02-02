/**
 * OrderTrackingScreen - Apple-level delivery tracking with floating capsule UI
 *
 * Design Philosophy:
 * - Strategic positioning based on F-pattern reading
 * - No component overlaps - clear visual hierarchy
 * - Glassmorphism effects for depth
 * - Spring-based micro-interactions
 * - Full map interactivity preserved
 *
 * Layout Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ [Stats Bar - Full Width]                    [Drivers] [⟳] │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                      [+]   │
 * │ ┌─────────┐                                          [-]   │
 * │ │         │           MAP                            [◎]   │
 * │ │ Orders  │                                                │
 * │ │  Panel  │                                                │
 * │ │         │                                                │
 * │ └─────────┘  [🚶 🚴 🚗 🚌]                                 │
 * │                                                            │
 * │         [═══════ Selected Order Panel ═══════]             │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { FlatList, Linking, Alert, Platform, Dimensions, StyleSheet, Pressable } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import {
  MapPin, Truck, Clock, Phone, User, Package, RefreshCw,
  Navigation, CheckCircle, AlertCircle, Store, ChevronDown, ChevronUp,
  X, Target, Users, Play, Send, UserCheck, Zap, MapPinned, Activity,
  ChevronRight, ChevronLeft, LayoutGrid, List, Filter, Plus, Minus, Crosshair,
  Route, Eye, EyeOff, Settings, Locate, Search, Bell, TrendingUp, Timer,
  DollarSign, Award, AlertTriangle, Info, Star, Flame, Calendar,
} from '@tamagui/lucide-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  SlideInLeft,
  SlideOutLeft,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useOrders } from '@/features/orders/hooks';
import { useAppSettings } from '@/features/settings/hooks';
import {
  usePrimaryDeliveryZone,
  useDeliveryStats,
  useAvailableDrivers,
  useUpdateDeliveryStatus,
  useAutoAssignDriver,
  useAssignDriver,
  useDeliveryHistory,
} from '@/features/delivery/hooks';
import { NavigationMap, NavigationMapRef } from '@/components/delivery';
import type { Coordinate, MapMarker } from '@/components/delivery/DeliveryMap';
import { geocodeAddress } from '@/services/geocoding';
import { useNavigation } from '@/services/navigation';
import type { Order, Currency } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// Design System
// ============================================

const COLORS = {
  primary: '#007AFF', // Apple blue
  success: '#34C759', // Apple green
  warning: '#FF9500', // Apple orange
  error: '#FF3B30', // Apple red
  purple: '#AF52DE', // Apple purple
  cyan: '#32ADE6', // Apple cyan
  pink: '#FF2D55', // Apple pink
  indigo: '#5856D6', // Apple indigo

  // Neutral palette
  gray: {
    50: '#F9FAFB',
    100: '#F2F2F7',
    200: '#E5E5EA',
    300: '#D1D1D6',
    400: '#AEAEB2',
    500: '#8E8E93',
    600: '#636366',
    700: '#48484A',
    800: '#3A3A3C',
    900: '#1C1C1E',
  },

  // Glass effects
  glass: {
    light: 'rgba(255, 255, 255, 0.85)',
    medium: 'rgba(255, 255, 255, 0.75)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
};

// Spring configurations (Apple-like)
const SPRING_CONFIG = {
  smooth: { damping: 20, stiffness: 200, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 180, mass: 0.6 },
  quick: { damping: 24, stiffness: 400, mass: 0.5 },
  gentle: { damping: 28, stiffness: 120, mass: 1 },
};

// Shadow presets
const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Status configurations
const DELIVERY_STATUS_CONFIG = {
  pending: { color: COLORS.warning, label: 'Pending', bgColor: '#FFF3E0', icon: '⏳' },
  assigned: { color: COLORS.primary, label: 'Assigned', bgColor: '#E3F2FD', icon: '📋' },
  preparing: { color: COLORS.indigo, label: 'Preparing', bgColor: '#EDE7F6', icon: '👨‍🍳' },
  picked_up: { color: COLORS.purple, label: 'Picked Up', bgColor: '#F3E5F5', icon: '📦' },
  on_the_way: { color: COLORS.warning, label: 'En Route', bgColor: '#FFF8E1', icon: '🚗' },
  nearby: { color: COLORS.cyan, label: 'Nearby', bgColor: '#E0F7FA', icon: '📍' },
  delivered: { color: COLORS.success, label: 'Delivered', bgColor: '#E8F5E9', icon: '✓' },
  open: { color: COLORS.warning, label: 'Open', bgColor: '#FFF3E0', icon: '📝' },
  completed: { color: COLORS.success, label: 'Completed', bgColor: '#E8F5E9', icon: '✓' },
};

type DeliveryStatusFilter = 'active' | 'on_the_way' | 'preparing' | 'delivered';

// Status transitions
const STATUS_TRANSITIONS: Record<string, { next: string; label: string; icon: string }[]> = {
  pending: [{ next: 'preparing', label: 'Start Preparing', icon: 'play' }],
  open: [{ next: 'preparing', label: 'Start Preparing', icon: 'play' }],
  preparing: [{ next: 'assigned', label: 'Ready for Pickup', icon: 'check' }],
  assigned: [{ next: 'picked_up', label: 'Mark Picked Up', icon: 'truck' }],
  picked_up: [{ next: 'on_the_way', label: 'On The Way', icon: 'navigation' }],
  on_the_way: [
    { next: 'nearby', label: 'Nearby', icon: 'mappin' },
    { next: 'delivered', label: 'Delivered', icon: 'check' },
  ],
  nearby: [{ next: 'delivered', label: 'Mark Delivered', icon: 'check' }],
};

// ============================================
// Utility Functions
// ============================================

function formatOrderNumber(order: Order): string {
  const orderNum = order.orderNumber ?? order.number;
  if (orderNum) {
    const numStr = String(orderNum);
    if (numStr.startsWith('ORD-')) return numStr;
    if (/^\d+$/.test(numStr)) return `#${numStr}`;
    return numStr;
  }
  return `#${order.id.slice(-5).toUpperCase()}`;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatCompactTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ============================================
// Floating Glass Capsule Component
// ============================================

interface GlassCapsuleProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  isActive?: boolean;
  accentColor?: string;
}

function GlassCapsule({ children, style, onPress, isActive, accentColor }: GlassCapsuleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.96, SPRING_CONFIG.quick);
  };

  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1, SPRING_CONFIG.quick);
  };

  const content = (
    <Animated.View
      style={[
        styles.glassCapsule,
        isActive && { borderColor: accentColor || COLORS.primary, borderWidth: 2 },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {content}
      </Pressable>
    );
  }

  return content;
}

// ============================================
// Map Control Button
// ============================================

interface MapControlButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  isActive?: boolean;
  size?: 'sm' | 'md';
}

function MapControlButton({ icon, onPress, isActive, size = 'md' }: MapControlButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.9, SPRING_CONFIG.quick); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
    >
      <Animated.View
        style={[
          styles.mapControlButton,
          size === 'sm' && { width: 36, height: 36 },
          isActive && { backgroundColor: COLORS.primary + '15' },
          animatedStyle,
        ]}
      >
        {icon}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// Status Pill Component
// ============================================

interface StatusPillProps {
  label: string;
  count: number;
  color: string;
  isActive: boolean;
  onPress: () => void;
}

function StatusPill({ label, count, color, isActive, onPress }: StatusPillProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, SPRING_CONFIG.quick); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
    >
      <Animated.View
        style={[
          styles.statusPill,
          isActive && { backgroundColor: color + '20', borderColor: color },
          animatedStyle,
        ]}
      >
        <Text fontSize={11} fontWeight={isActive ? '700' : '500'} color={isActive ? color : COLORS.gray[500]}>
          {label}
        </Text>
        <YStack
          backgroundColor={isActive ? color : COLORS.gray[300]}
          paddingHorizontal={6}
          paddingVertical={2}
          borderRadius={10}
          marginLeft={4}
        >
          <Text fontSize={10} fontWeight="700" color={isActive ? 'white' : COLORS.gray[600]}>
            {count}
          </Text>
        </YStack>
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// Compact Order Card
// ============================================

interface CompactOrderCardProps {
  order: Order;
  currency: Currency;
  isSelected: boolean;
  onPress: () => void;
  onUpdateStatus?: (orderId: string, status: string) => void;
  onAssignDriver?: (orderId: string) => void;
  isUpdating?: boolean;
}

function CompactOrderCard({
  order,
  currency,
  isSelected,
  onPress,
  onUpdateStatus,
  onAssignDriver,
  isUpdating,
}: CompactOrderCardProps) {
  const status = order.status || 'pending';
  const statusConfig = DELIVERY_STATUS_CONFIG[status as keyof typeof DELIVERY_STATUS_CONFIG] || DELIVERY_STATUS_CONFIG.pending;
  const customerName = order.customer?.name || order.guestName || 'Guest';
  const customerPhone = order.customer?.phone || order.guestPhone;
  const itemCount = order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
  const total = order.payment?.total || order.total || 0;
  const needsDriver = ['pending', 'open', 'preparing'].includes(status) && !order.driverId;
  const availableTransitions = STATUS_TRANSITIONS[status] || [];

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, SPRING_CONFIG.quick); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
    >
      <Animated.View style={[styles.orderCard, cardStyle]}>
        {/* Selection indicator */}
        <Animated.View style={[styles.orderCardBorder, borderStyle]} />

        {/* Header row */}
        <XStack alignItems="center" justifyContent="space-between" marginBottom={6}>
          <XStack alignItems="center" gap={8}>
            <Text fontSize={14} fontWeight="700" color={COLORS.gray[900]}>
              {formatOrderNumber(order)}
            </Text>
            <XStack
              backgroundColor={statusConfig.bgColor}
              paddingHorizontal={8}
              paddingVertical={3}
              borderRadius={12}
              alignItems="center"
              gap={4}
            >
              <Text fontSize={10}>{statusConfig.icon}</Text>
              <Text fontSize={10} fontWeight="600" color={statusConfig.color}>
                {statusConfig.label}
              </Text>
            </XStack>
          </XStack>
          <Text fontSize={15} fontWeight="700" color={COLORS.gray[900]}>
            {formatCurrency(total, currency)}
          </Text>
        </XStack>

        {/* Customer & items row */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={6} flex={1}>
            <YStack
              width={24}
              height={24}
              borderRadius={12}
              backgroundColor={COLORS.primary + '15'}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={10} fontWeight="600" color={COLORS.primary}>
                {customerName.charAt(0).toUpperCase()}
              </Text>
            </YStack>
            <Text fontSize={12} color={COLORS.gray[700]} numberOfLines={1} flex={1}>
              {customerName}
            </Text>
          </XStack>
          <XStack alignItems="center" gap={8}>
            <XStack alignItems="center" gap={4}>
              <Package size={12} color={COLORS.gray[400]} />
              <Text fontSize={11} color={COLORS.gray[500]}>{itemCount}</Text>
            </XStack>
            <Text fontSize={10} color={COLORS.gray[400]}>
              {formatRelativeTime(order.createdAt)}
            </Text>
          </XStack>
        </XStack>

        {/* Address row - always show if available */}
        {order.deliveryAddress && !isSelected && (
          <XStack alignItems="flex-start" gap={6} marginTop={8}>
            <MapPin size={12} color={COLORS.gray[400]} style={{ marginTop: 2 }} />
            <Text fontSize={11} color={COLORS.gray[500]} numberOfLines={1} flex={1}>
              {order.deliveryAddress}
            </Text>
          </XStack>
        )}

        {/* Action row when selected - minimal */}
        {isSelected && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={styles.orderCardActions}
          >
            <XStack gap={8} alignItems="center">
              {needsDriver && onAssignDriver && (
                <Pressable
                  onPress={() => onAssignDriver(order.id)}
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                >
                  <UserCheck size={12} color="white" />
                  <Text fontSize={10} fontWeight="600" color="white">Assign</Text>
                </Pressable>
              )}
              {availableTransitions.slice(0, 2).map((transition) => (
                <Pressable
                  key={transition.next}
                  onPress={() => !isUpdating && onUpdateStatus?.(order.id, transition.next)}
                  style={[styles.actionButton, transition.next === 'delivered' && styles.actionButtonSuccess]}
                  disabled={isUpdating}
                >
                  <Text fontSize={10} fontWeight="600" color={transition.next === 'delivered' ? COLORS.success : COLORS.gray[600]}>
                    {isUpdating ? '...' : transition.label}
                  </Text>
                </Pressable>
              ))}
              {customerPhone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                  style={styles.callButton}
                >
                  <Phone size={12} color={COLORS.success} />
                </Pressable>
              )}
            </XStack>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// Driver Card (Compact)
// ============================================

interface DriverCardProps {
  driver: any;
  onSelect: () => void;
  isSelected?: boolean;
}

function DriverCard({ driver, onSelect, isSelected }: DriverCardProps) {
  const isOnline = driver.isAvailable || driver.status === 'available';
  const driverName = driver.user?.firstName || driver.user?.name?.split(' ')[0] || 'Driver';
  const scale = useSharedValue(1);

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.95, SPRING_CONFIG.quick); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
      disabled={!isOnline}
    >
      <Animated.View
        style={[
          styles.driverCard,
          isSelected && styles.driverCardSelected,
          !isOnline && styles.driverCardOffline,
          { transform: [{ scale: scale.value }] },
        ]}
      >
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor={isOnline ? COLORS.success + '20' : COLORS.gray[200]}
          alignItems="center"
          justifyContent="center"
          position="relative"
        >
          <Text fontSize={16} fontWeight="600" color={isOnline ? COLORS.success : COLORS.gray[500]}>
            {driverName.charAt(0).toUpperCase()}
          </Text>
          {/* Online indicator */}
          <YStack
            position="absolute"
            bottom={0}
            right={0}
            width={12}
            height={12}
            borderRadius={6}
            backgroundColor={isOnline ? COLORS.success : COLORS.gray[400]}
            borderWidth={2}
            borderColor="white"
          />
        </YStack>
        <YStack flex={1} gap={2}>
          <Text fontSize={13} fontWeight="600" color={COLORS.gray[800]}>
            {driverName}
          </Text>
          <XStack alignItems="center" gap={4}>
            <Text fontSize={11} color={COLORS.gray[500]}>
              {driver.vehicleType === 'bicycle' ? '🚴' : driver.vehicleType === 'motorcycle' ? '🏍️' : '🚗'}
            </Text>
            <Text fontSize={10} color={COLORS.gray[500]}>
              {driver.deliveriesToday || 0} today
            </Text>
          </XStack>
        </YStack>
        {isOnline && (
          <YStack
            backgroundColor={COLORS.success + '15'}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={8}
          >
            <Text fontSize={10} fontWeight="600" color={COLORS.success}>Ready</Text>
          </YStack>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// Expandable Panel Component
// ============================================

interface ExpandablePanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  collapsedHeight?: number;
  expandedHeight?: number;
  headerContent: React.ReactNode;
  expandedContent: React.ReactNode;
  style?: any;
}

function ExpandablePanel({
  isExpanded,
  onToggle,
  collapsedHeight = 56,
  expandedHeight = 400,
  headerContent,
  expandedContent,
  style,
}: ExpandablePanelProps) {
  const animatedHeight = useSharedValue(collapsedHeight);
  const expandProgress = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withSpring(isExpanded ? expandedHeight : collapsedHeight, SPRING_CONFIG.smooth);
    expandProgress.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded, expandedHeight, collapsedHeight]);

  const containerStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg` }],
  }));

  // Calculate content height (total - header)
  const contentHeight = expandedHeight - collapsedHeight;

  return (
    <Animated.View style={[styles.expandablePanel, containerStyle, style]}>
      {/* Header (always visible, clickable to toggle) */}
      <Pressable onPress={onToggle}>
        <XStack
          height={collapsedHeight}
          minHeight={collapsedHeight}
          maxHeight={collapsedHeight}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={16}
          borderBottomWidth={isExpanded ? 1 : 0}
          borderBottomColor={COLORS.gray[100]}
        >
          <XStack flex={1} alignItems="center" gap={12}>
            {headerContent}
          </XStack>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={18} color={COLORS.gray[400]} />
          </Animated.View>
        </XStack>
      </Pressable>

      {/* Expanded content - only shows when expanded */}
      {isExpanded && (
        <Animated.View
          style={[
            {
              height: contentHeight,
              overflow: 'hidden',
            },
            contentStyle
          ]}
        >
          {expandedContent}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================
// Main Screen Component
// ============================================

interface OrderTrackingScreenProps {
  onBack?: () => void;
}

export default function OrderTrackingScreen({ onBack }: OrderTrackingScreenProps) {
  const { settings } = useSettingsStore();
  const { data: appSettings } = useAppSettings();

  // Map ref for external controls
  const mapRef = useRef<NavigationMapRef>(null);

  // UI State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storeCoordinates, setStoreCoordinates] = useState<Coordinate | null>(null);
  const [isGeocodingStore, setIsGeocodingStore] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Panel states
  const [isOrdersPanelExpanded, setIsOrdersPanelExpanded] = useState(true);
  const [isDriversPanelOpen, setIsDriversPanelOpen] = useState(false);
  const [driverAssignOrderId, setDriverAssignOrderId] = useState<string | null>(null);

  // Capsule states
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [showDeliveryZones, setShowDeliveryZones] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlertsCapsule, setShowAlertsCapsule] = useState(true);

  // API Hooks
  const { data: primaryDeliveryZone, zones: allDeliveryZones } = usePrimaryDeliveryZone();
  const { data: deliveryStats } = useDeliveryStats();
  const { data: availableDrivers, isLoading: isLoadingDrivers, refetch: refetchDrivers } = useAvailableDrivers();
  const { data: deliveryHistory, refetch: refetchHistory } = useDeliveryHistory({ status: 'delivered', limit: 50 });
  const { data: ordersData, isLoading, refetch } = useOrders({ limit: 100 });

  // Mutations
  const updateStatusMutation = useUpdateDeliveryStatus();
  const autoAssignMutation = useAutoAssignDriver();
  const assignDriverMutation = useAssignDriver();

  // Delivery radius
  const deliveryRadiusMeters = primaryDeliveryZone?.radiusMeters ?? 8000;

  // Navigation hook - uses 'car' as default, actual vehicle determined by driver assignment
  const navigation = useNavigation({ vehicleType: 'car', showAlternatives: true });

  // Filter delivery orders
  const deliveryOrders = useMemo(() => {
    const allOrders = ordersData ?? [];
    const deliveryTypes = ['delivery', 'doordash', 'uber_eats', 'grubhub', 'postmates', 'deliveroo', 'skip_the_dishes'];

    let filtered = allOrders.filter((order: Order) => {
      const orderType = order.orderType || 'walk_in';
      const isDeliveryType = deliveryTypes.includes(orderType);

      if (statusFilter === 'delivered') {
        return (isDeliveryType || order.isDelivery) && ['completed', 'delivered'].includes(order.status || '');
      }

      const isNotCompleted = !['completed', 'delivered', 'cancelled', 'refunded'].includes(order.status || '');
      return isDeliveryType || (order.isDelivery && isNotCompleted);
    });

    // Zone filter
    if (selectedZoneId && allDeliveryZones) {
      const selectedZone = allDeliveryZones.find(z => z.id === selectedZoneId);
      if (selectedZone?.centerLatitude && selectedZone?.centerLongitude) {
        filtered = filtered.filter((order: Order) => {
          if (!order.deliveryLatitude || !order.deliveryLongitude) return true;
          const distance = calculateDistance(
            selectedZone.centerLatitude,
            selectedZone.centerLongitude,
            order.deliveryLatitude,
            order.deliveryLongitude
          );
          return distance <= selectedZone.radiusMeters;
        });
      }
    }

    // Status filter
    if (statusFilter === 'on_the_way') {
      return filtered.filter((o: Order) => ['on_the_way', 'picked_up', 'nearby'].includes(o.status || ''));
    } else if (statusFilter === 'preparing') {
      return filtered.filter((o: Order) => ['pending', 'open', 'assigned', 'preparing'].includes(o.status || ''));
    } else if (statusFilter === 'delivered') {
      return filtered.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 50);
    }

    return filtered;
  }, [ordersData, statusFilter, selectedZoneId, allDeliveryZones]);

  // Stats calculation
  const stats = useMemo(() => {
    const allOrders = ordersData ?? [];
    const deliveryTypes = ['delivery', 'doordash', 'uber_eats', 'grubhub', 'postmates', 'deliveroo', 'skip_the_dishes'];

    const allDeliveryOrders = allOrders.filter((order: Order) => {
      const orderType = order.orderType || 'walk_in';
      return deliveryTypes.includes(orderType) || order.isDelivery;
    });

    const activeOrders = allDeliveryOrders.filter((o: Order) =>
      !['completed', 'delivered', 'cancelled', 'refunded'].includes(o.status || '')
    );

    const availableCount = availableDrivers?.filter((d: any) => d.isAvailable || d.status === 'available')?.length ?? 0;
    const historyCount = deliveryHistory?.length ?? deliveryStats?.completedToday ?? 0;

    return {
      total: activeOrders.length,
      onTheWay: allDeliveryOrders.filter((o: Order) => ['on_the_way', 'picked_up', 'nearby'].includes(o.status || '')).length,
      preparing: allDeliveryOrders.filter((o: Order) => ['pending', 'open', 'assigned', 'preparing'].includes(o.status || '')).length,
      completedToday: historyCount,
      availableDrivers: availableCount,
      totalDrivers: availableDrivers?.length ?? 0,
    };
  }, [ordersData, deliveryStats, availableDrivers, deliveryHistory]);

  // Store address
  const storeAddress = useMemo(() => {
    const parts = [];
    if (appSettings?.businessAddress) parts.push(appSettings.businessAddress);
    else if (appSettings?.address) parts.push(appSettings.address);
    if (appSettings?.city) parts.push(appSettings.city);
    if (appSettings?.state) parts.push(appSettings.state);
    if (appSettings?.zipCode) parts.push(appSettings.zipCode);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [appSettings]);

  // Geocode store
  useEffect(() => {
    const geocodeStore = async () => {
      if (storeAddress) {
        setIsGeocodingStore(true);
        try {
          const result = await geocodeAddress(storeAddress);
          if (result) {
            setStoreCoordinates({ latitude: result.latitude, longitude: result.longitude });
          }
        } catch (error) {
          console.error('Geocode error:', error);
        } finally {
          setIsGeocodingStore(false);
        }
      }
    };
    geocodeStore();
  }, [storeAddress]);

  // Calculate route when order selected
  useEffect(() => {
    const calculateRoute = async () => {
      if (selectedOrder && storeCoordinates) {
        const customerCoord = selectedOrder.deliveryLatitude && selectedOrder.deliveryLongitude
          ? { latitude: selectedOrder.deliveryLatitude, longitude: selectedOrder.deliveryLongitude }
          : null;
        if (customerCoord) {
          await navigation.calculateRoute(storeCoordinates, customerCoord);
        }
      } else {
        navigation.clearRoute();
      }
    };
    calculateRoute();
  }, [selectedOrder, storeCoordinates]);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchDrivers(), refetchHistory()]);
    setIsRefreshing(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ deliveryId: orderId, status: newStatus });
      refetch();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleAssignDriver = (orderId: string) => {
    setDriverAssignOrderId(orderId);
    setIsDriversPanelOpen(true);
  };

  const handleAutoAssign = async (orderId: string) => {
    try {
      await autoAssignMutation.mutateAsync(orderId);
      setIsDriversPanelOpen(false);
      setDriverAssignOrderId(null);
      refetch();
      refetchDrivers();
    } catch (error) {
      Alert.alert('Error', 'No available drivers');
    }
  };

  const handleSelectDriver = async (driverId: string) => {
    if (!driverAssignOrderId) return;
    try {
      await assignDriverMutation.mutateAsync({ deliveryId: driverAssignOrderId, driverId });
      setIsDriversPanelOpen(false);
      setDriverAssignOrderId(null);
      refetch();
      refetchDrivers();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign driver');
    }
  };

  // Map control handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => mapRef.current?.recenter();
  const handleFitRoute = () => mapRef.current?.fitRoute();

  const selectedCustomerLocation = useMemo(() => {
    if (selectedOrder?.deliveryLatitude && selectedOrder?.deliveryLongitude) {
      return { latitude: selectedOrder.deliveryLatitude, longitude: selectedOrder.deliveryLongitude };
    }
    return undefined;
  }, [selectedOrder]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <YStack flex={1} backgroundColor={COLORS.gray[100]}>
      {/* Full-screen Map */}
      <YStack flex={1} position="relative">
        {storeCoordinates ? (
          <NavigationMap
            ref={mapRef}
            storeLocation={storeCoordinates}
            customerLocation={selectedCustomerLocation}
            route={navigation.coordinates}
            transitLegs={navigation.route?.transitLegs}
            vehicleType="car"
            showETA={!!selectedOrder}
            etaMinutes={navigation.etaMinutes || undefined}
            distanceText={navigation.distanceText || undefined}
            isDarkMode={false}
            showThemeToggle={false}
            isLoading={isGeocodingStore || navigation.isLoading}
            deliveryRadiusMeters={deliveryRadiusMeters}
          />
        ) : (
          <YStack flex={1} backgroundColor={COLORS.gray[100]} justifyContent="center" alignItems="center">
            <Store size={48} color={COLORS.gray[300]} />
            <Text color={COLORS.gray[500]} marginTop="$3">Configure store address in Settings</Text>
          </YStack>
        )}

        {/* ============================================ */}
        {/* FLOATING UI LAYER - Feature-Rich Capsules */}
        {/* ============================================ */}

        {/* ROW 1: Stats + Quick Actions + Drivers (all in one row) */}
        <XStack
          position="absolute"
          top={16}
          left={16}
          right={16}
          zIndex={100}
          justifyContent="space-between"
          alignItems="flex-start"
        >
          {/* LEFT: Activity Stats Capsule */}
          <GlassCapsule style={styles.statsCapsule}>
            <XStack alignItems="center" gap={10}>
              <YStack position="relative">
                <YStack
                  width={34}
                  height={34}
                  borderRadius={17}
                  backgroundColor={stats.total > 0 ? COLORS.primary + '15' : COLORS.gray[100]}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Activity size={16} color={stats.total > 0 ? COLORS.primary : COLORS.gray[400]} />
                </YStack>
                {stats.total > 0 && (
                  <YStack
                    position="absolute"
                    top={-2}
                    right={-2}
                    width={10}
                    height={10}
                    borderRadius={5}
                    backgroundColor={COLORS.error}
                    borderWidth={2}
                    borderColor="white"
                  />
                )}
              </YStack>

              <YStack>
                <Text fontSize={18} fontWeight="800" color={COLORS.gray[900]}>{stats.total}</Text>
                <Text fontSize={8} color={COLORS.gray[500]} marginTop={-2}>Active</Text>
              </YStack>

              <YStack width={1} height={24} backgroundColor={COLORS.gray[200]} />

              <XStack gap={8}>
                <YStack alignItems="center">
                  <XStack alignItems="center" gap={2}>
                    <Truck size={10} color={COLORS.warning} />
                    <Text fontSize={12} fontWeight="700" color={COLORS.warning}>{stats.onTheWay}</Text>
                  </XStack>
                  <Text fontSize={7} color={COLORS.gray[400]}>Route</Text>
                </YStack>
                <YStack alignItems="center">
                  <XStack alignItems="center" gap={2}>
                    <Package size={10} color={COLORS.indigo} />
                    <Text fontSize={12} fontWeight="700" color={COLORS.indigo}>{stats.preparing}</Text>
                  </XStack>
                  <Text fontSize={7} color={COLORS.gray[400]}>Prep</Text>
                </YStack>
                <YStack alignItems="center">
                  <XStack alignItems="center" gap={2}>
                    <CheckCircle size={10} color={COLORS.success} />
                    <Text fontSize={12} fontWeight="700" color={COLORS.success}>{stats.completedToday}</Text>
                  </XStack>
                  <Text fontSize={7} color={COLORS.gray[400]}>Done</Text>
                </YStack>
              </XStack>
            </XStack>
          </GlassCapsule>

          {/* CENTER: Quick Actions Capsule */}
          <GlassCapsule style={styles.quickActionsCapsule}>
            <XStack alignItems="center" gap={6}>
              <Pressable
                onPress={handleRefresh}
                style={[styles.quickActionBtn, isRefreshing && styles.quickActionBtnActive]}
              >
                <RefreshCw size={16} color={isRefreshing ? COLORS.primary : COLORS.gray[600]} />
              </Pressable>
              <Pressable onPress={handleRecenter} style={styles.quickActionBtn}>
                <Locate size={16} color={COLORS.gray[600]} />
              </Pressable>
              <Pressable
                onPress={() => setShowDeliveryZones(!showDeliveryZones)}
                style={[styles.quickActionBtn, showDeliveryZones && styles.quickActionBtnActive]}
              >
                <MapPinned size={16} color={showDeliveryZones ? COLORS.primary : COLORS.gray[600]} />
              </Pressable>
            </XStack>
          </GlassCapsule>

          {/* RIGHT: Drivers Capsule (with inline dropdown) */}
          <YStack>
            <GlassCapsule
              style={styles.driversCapsule}
              onPress={() => setIsDriversPanelOpen(!isDriversPanelOpen)}
              isActive={isDriversPanelOpen}
              accentColor={COLORS.success}
            >
              <XStack alignItems="center" gap={8}>
                {/* Avatars */}
                <XStack>
                  {availableDrivers?.slice(0, 3).map((driver: any, index: number) => {
                    const isOnline = driver.isAvailable || driver.status === 'available';
                    const initial = (driver.user?.firstName || driver.user?.name || 'D').charAt(0).toUpperCase();
                    return (
                      <YStack
                        key={driver.id}
                        width={26}
                        height={26}
                        borderRadius={13}
                        backgroundColor={isOnline ? COLORS.success : COLORS.gray[300]}
                        alignItems="center"
                        justifyContent="center"
                        borderWidth={2}
                        borderColor="white"
                        marginLeft={index > 0 ? -8 : 0}
                        zIndex={3 - index}
                      >
                        <Text fontSize={10} fontWeight="700" color="white">{initial}</Text>
                      </YStack>
                    );
                  })}
                  {(!availableDrivers || availableDrivers.length === 0) && (
                    <YStack width={26} height={26} borderRadius={13} backgroundColor={COLORS.gray[200]} alignItems="center" justifyContent="center">
                      <Users size={12} color={COLORS.gray[400]} />
                    </YStack>
                  )}
                </XStack>

                <YStack>
                  <XStack alignItems="baseline" gap={2}>
                    <Text fontSize={14} fontWeight="800" color={COLORS.success}>{stats.availableDrivers}</Text>
                    <Text fontSize={9} color={COLORS.gray[400]}>/{stats.totalDrivers}</Text>
                  </XStack>
                  <Text fontSize={8} color={COLORS.gray[500]} marginTop={-2}>Online</Text>
                </YStack>

                <ChevronDown size={12} color={COLORS.gray[400]} style={{ transform: [{ rotate: isDriversPanelOpen ? '180deg' : '0deg' }] }} />
              </XStack>
            </GlassCapsule>

            {/* Inline Drivers Dropdown */}
            {isDriversPanelOpen && (
              <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={styles.driversDropdown}>
                <YStack backgroundColor="white" borderRadius={16} padding={12} marginTop={8} {...SHADOWS.large}>
                  {/* Stats row */}
                  <XStack gap={8} marginBottom={12}>
                    <YStack flex={1} backgroundColor={COLORS.success + '15'} padding={10} borderRadius={10} alignItems="center">
                      <Text fontSize={16} fontWeight="700" color={COLORS.success}>{stats.availableDrivers}</Text>
                      <Text fontSize={9} color={COLORS.success}>Available</Text>
                    </YStack>
                    <YStack flex={1} backgroundColor={COLORS.gray[100]} padding={10} borderRadius={10} alignItems="center">
                      <Text fontSize={16} fontWeight="700" color={COLORS.gray[600]}>{stats.totalDrivers - stats.availableDrivers}</Text>
                      <Text fontSize={9} color={COLORS.gray[500]}>Offline</Text>
                    </YStack>
                  </XStack>

                  {/* Auto-assign (when assigning) */}
                  {driverAssignOrderId && (
                    <Pressable onPress={() => handleAutoAssign(driverAssignOrderId)} style={styles.autoAssignBtn}>
                      <Target size={16} color={COLORS.primary} />
                      <Text fontSize={12} fontWeight="600" color={COLORS.primary} flex={1}>Auto-Assign</Text>
                      <ChevronRight size={14} color={COLORS.primary} />
                    </Pressable>
                  )}

                  {/* Driver list */}
                  <YStack gap={6} maxHeight={200}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {availableDrivers?.map((driver: any) => {
                        const isOnline = driver.isAvailable || driver.status === 'available';
                        const driverName = driver.user?.firstName || 'Driver';
                        return (
                          <Pressable
                            key={driver.id}
                            onPress={() => driverAssignOrderId ? handleSelectDriver(driver.id) : null}
                            style={[styles.driverListItem, !isOnline && { opacity: 0.5 }]}
                            disabled={!isOnline}
                          >
                            <YStack width={32} height={32} borderRadius={16} backgroundColor={isOnline ? COLORS.success : COLORS.gray[300]} alignItems="center" justifyContent="center" position="relative">
                              <Text fontSize={12} fontWeight="600" color="white">{driverName.charAt(0).toUpperCase()}</Text>
                              <YStack position="absolute" bottom={0} right={0} width={10} height={10} borderRadius={5} backgroundColor={isOnline ? COLORS.success : COLORS.gray[400]} borderWidth={2} borderColor="white" />
                            </YStack>
                            <YStack flex={1}>
                              <Text fontSize={12} fontWeight="600" color={COLORS.gray[800]}>{driverName}</Text>
                              <Text fontSize={9} color={COLORS.gray[500]}>{driver.vehicleType === 'bicycle' ? '🚴' : driver.vehicleType === 'motorcycle' ? '🏍️' : '🚗'} {driver.deliveriesToday || 0} today</Text>
                            </YStack>
                            {isOnline && (
                              <YStack backgroundColor={COLORS.success + '15'} paddingHorizontal={8} paddingVertical={4} borderRadius={8}>
                                <Text fontSize={9} fontWeight="600" color={COLORS.success}>Ready</Text>
                              </YStack>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </YStack>
                </YStack>
              </Animated.View>
            )}
          </YStack>
        </XStack>

        {/* ROW 2: Metrics + Urgent Orders */}
        <XStack
          position="absolute"
          top={72}
          right={16}
          zIndex={95}
          gap={10}
        >
          {/* Urgent Orders Alert (if any orders waiting > 15min) */}
          {stats.preparing > 0 && (
            <Animated.View entering={ZoomIn.springify().damping(18)}>
              <GlassCapsule style={styles.urgentCapsule}>
                <XStack alignItems="center" gap={8}>
                  <YStack
                    width={30}
                    height={30}
                    borderRadius={15}
                    backgroundColor={COLORS.error + '20'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <AlertTriangle size={14} color={COLORS.error} />
                  </YStack>
                  <YStack>
                    <Text fontSize={12} fontWeight="700" color={COLORS.error}>{stats.preparing}</Text>
                    <Text fontSize={8} color={COLORS.gray[500]}>Waiting</Text>
                  </YStack>
                </XStack>
              </GlassCapsule>
            </Animated.View>
          )}

          {/* Metrics Capsule */}
          <GlassCapsule style={styles.perfCapsule}>
            <XStack alignItems="center" gap={10}>
              <YStack alignItems="center">
                <XStack alignItems="center" gap={2}>
                  <Timer size={11} color={COLORS.cyan} />
                  <Text fontSize={13} fontWeight="700" color={COLORS.gray[800]}>~24</Text>
                </XStack>
                <Text fontSize={7} color={COLORS.gray[400]}>Avg min</Text>
              </YStack>

              <YStack width={1} height={18} backgroundColor={COLORS.gray[200]} />

              <YStack alignItems="center">
                <XStack alignItems="center" gap={2}>
                  <DollarSign size={11} color={COLORS.success} />
                  <Text fontSize={13} fontWeight="700" color={COLORS.gray[800]}>
                    {formatCurrency(deliveryOrders.reduce((sum, o) => sum + (o.payment?.total || o.total || 0), 0), settings.currency).replace(/^\$/, '')}
                  </Text>
                </XStack>
                <Text fontSize={7} color={COLORS.gray[400]}>Revenue</Text>
              </YStack>

              <YStack width={1} height={18} backgroundColor={COLORS.gray[200]} />

              <YStack alignItems="center">
                <XStack alignItems="center" gap={2}>
                  <Text fontSize={13} fontWeight="700" color={COLORS.success}>98%</Text>
                  <Award size={9} color={COLORS.success} />
                </XStack>
                <Text fontSize={7} color={COLORS.gray[400]}>On-Time</Text>
              </YStack>

              <YStack width={1} height={18} backgroundColor={COLORS.gray[200]} />

              <YStack alignItems="center">
                <XStack alignItems="center" gap={2}>
                  <Star size={9} color={COLORS.warning} fill={COLORS.warning} />
                  <Text fontSize={13} fontWeight="700" color={COLORS.gray[800]}>4.8</Text>
                </XStack>
                <Text fontSize={7} color={COLORS.gray[400]}>Rating</Text>
              </YStack>
            </XStack>
          </GlassCapsule>
        </XStack>

        {/* LEFT: Deliveries Panel */}
        <YStack
          position="absolute"
          top={72}
          left={16}
          bottom={24}
          width={380}
          zIndex={90}
        >
          <ExpandablePanel
            isExpanded={isOrdersPanelExpanded}
            onToggle={() => {
              const newExpanded = !isOrdersPanelExpanded;
              setIsOrdersPanelExpanded(newExpanded);
              // Clear selected order when collapsing panel
              if (!newExpanded) {
                setSelectedOrder(null);
              }
            }}
            collapsedHeight={56}
            expandedHeight={SCREEN_HEIGHT - 140}
            headerContent={
              <XStack alignItems="center" gap={12} flex={1}>
                {/* Title & Count */}
                <XStack alignItems="center" gap={6}>
                  <Truck size={16} color={COLORS.primary} />
                  <Text fontSize={15} fontWeight="700" color={COLORS.gray[800]}>Deliveries</Text>
                  <YStack backgroundColor={COLORS.primary} paddingHorizontal={6} paddingVertical={2} borderRadius={8}>
                    <Text fontSize={10} fontWeight="700" color="white">{deliveryOrders.length}</Text>
                  </YStack>
                </XStack>

                {/* Spacer */}
                <YStack flex={1} />

                {/* Status Filters - Clean text pills */}
                <XStack backgroundColor={COLORS.gray[100]} borderRadius={8} padding={3} gap={2}>
                  {[
                    { key: 'active', label: 'All' },
                    { key: 'on_the_way', label: 'Route' },
                    { key: 'preparing', label: 'Prep' },
                    { key: 'delivered', label: 'Done' },
                  ].map((filter) => (
                    <Pressable
                      key={filter.key}
                      onPress={(e) => { e.stopPropagation(); setStatusFilter(filter.key as DeliveryStatusFilter); }}
                      style={[
                        styles.segmentedFilterItem,
                        statusFilter === filter.key && styles.segmentedFilterItemActive,
                      ]}
                    >
                      <Text
                        fontSize={11}
                        fontWeight={statusFilter === filter.key ? '600' : '500'}
                        color={statusFilter === filter.key ? COLORS.gray[800] : COLORS.gray[500]}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}
                </XStack>
              </XStack>
            }
            expandedContent={
              <YStack flex={1} overflow="hidden">
                {/* Orders List */}
                <YStack flex={1}>
                  <FlatList
                    data={deliveryOrders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16, paddingTop: 8 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <CompactOrderCard
                        order={item}
                        currency={settings.currency}
                        isSelected={selectedOrder?.id === item.id}
                        onPress={() => setSelectedOrder(selectedOrder?.id === item.id ? null : item)}
                        onUpdateStatus={handleStatusUpdate}
                        onAssignDriver={handleAssignDriver}
                        isUpdating={updateStatusMutation.isPending}
                      />
                    )}
                    ListEmptyComponent={
                      <YStack alignItems="center" paddingVertical={40}>
                        <Package size={40} color={COLORS.gray[300]} />
                        <Text color={COLORS.gray[500]} marginTop={12} fontSize={14}>No deliveries</Text>
                        <Text color={COLORS.gray[400]} fontSize={12}>Orders will appear here</Text>
                      </YStack>
                    }
                  />
                </YStack>
              </YStack>
            }
          />
        </YStack>

      </YStack>
    </YStack>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Glass capsule base
  glassCapsule: {
    backgroundColor: COLORS.glass.light,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.medium,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
  },

  // Map control button
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: 'white',
  },

  // Expandable panel
  expandablePanel: {
    backgroundColor: COLORS.glass.light,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.large,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
  },

  // Order card
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  orderCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    pointerEvents: 'none',
  },

  orderCardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },

  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
  },

  actionButtonSuccess: {
    backgroundColor: COLORS.success + '15',
  },

  // Driver card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },

  driverCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },

  driverCardOffline: {
    opacity: 0.5,
  },

  // Expanded order card style
  orderCardExpanded: {
    backgroundColor: 'white',
    borderColor: COLORS.primary + '30',
    borderWidth: 1,
  },

  // Inline phone button in expanded card
  inlinePhoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating capsule styles
  statsCapsule: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  driversCapsule: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  quickActionsCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  metricsCapsule: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActionButtonActive: {
    backgroundColor: COLORS.primary + '15',
  },

  // Search capsule
  searchCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[800],
    marginLeft: 8,
    padding: 0,
  },

  // Alerts capsule
  alertsCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  // Performance capsule
  perfCapsule: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  // Time tracker
  timeTrackerCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Mini stat item
  miniStat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  miniStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.gray[200],
  },

  // Quick filter chips
  quickFilterChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickFilterChipActive: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },

  // Text-based filter chip (for "All" and "Zones")
  quickFilterChipText: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 13,
    backgroundColor: COLORS.gray[100],
  },

  quickFilterChipTextActive: {
    backgroundColor: COLORS.gray[700],
  },

  // Quick action buttons
  quickActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
  },

  quickActionBtnActive: {
    backgroundColor: COLORS.primary + '15',
  },

  // Urgent orders capsule
  urgentCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },

  // Drivers dropdown (inline)
  driversDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: 280,
    zIndex: 200,
  },

  // Driver list item in dropdown
  driverListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: COLORS.gray[50],
  },

  // Auto-assign button in dropdown
  autoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    marginBottom: 12,
  },

  // Live indicator animation helper
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },

  // Floating time tracker
  timeTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Call button (compact)
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Segmented filter (iOS style)
  segmentedFilterItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  segmentedFilterItemActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
});
