/**
 * OrderTrackingScreen - Premium Delivery Command Center
 *
 * Design Philosophy:
 * - Bottom-anchored panels that expand UPWARD (like Apple Maps)
 * - Feature-rich expansions with full order/driver details
 * - Real-time analytics backed by database
 * - Driver location tracking with route visualization
 *
 * Layout Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ [Stats]              MAP                    [Quick Actions] │
 * │                                                             │
 * │                    (Full Screen)                            │
 * │                                                             │
 * │                                                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │ [Deliveries Panel - Expands Up]  [Drivers Panel - Expands Up]│
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { FlatList, Linking, Alert, Platform, Dimensions, StyleSheet, Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import {
  MapPin, Truck, Clock, Phone, User, Package, RefreshCw,
  Navigation, CheckCircle, AlertCircle, Store, ChevronDown, ChevronUp,
  X, Target, Users, Play, Send, UserCheck, Zap, MapPinned, Activity,
  ChevronRight, ChevronLeft, LayoutGrid, List, Filter, Plus, Minus, Crosshair,
  Route, Eye, EyeOff, Settings, Locate, Search, Bell, TrendingUp, Timer,
  DollarSign, Award, AlertTriangle, Info, Star, Flame, Calendar, Copy,
  MessageCircle, Navigation2, History, Heart, ShoppingBag, FileText, ExternalLink,
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
  SlideInUp,
  SlideOutDown,
  SlideInRight,
  SlideOutRight,
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
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  purple: '#AF52DE',
  cyan: '#32ADE6',
  pink: '#FF2D55',
  indigo: '#5856D6',
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
  glass: {
    light: 'rgba(255, 255, 255, 0.92)',
    medium: 'rgba(255, 255, 255, 0.85)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
};

const SPRING_CONFIG = {
  smooth: { damping: 20, stiffness: 200, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 180, mass: 0.6 },
  quick: { damping: 24, stiffness: 400, mass: 0.5 },
  gentle: { damping: 28, stiffness: 120, mass: 1 },
};

const SHADOWS = {
  small: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  large: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
};

const DELIVERY_STATUS_CONFIG: Record<string, { color: string; label: string; bgColor: string; icon: string }> = {
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

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; icon: string }[]> = {
  pending: [{ next: 'preparing', label: 'Start Prep', icon: 'play' }],
  open: [{ next: 'preparing', label: 'Start Prep', icon: 'play' }],
  preparing: [{ next: 'assigned', label: 'Ready', icon: 'check' }],
  assigned: [{ next: 'picked_up', label: 'Picked Up', icon: 'truck' }],
  picked_up: [{ next: 'on_the_way', label: 'En Route', icon: 'navigation' }],
  on_the_way: [{ next: 'nearby', label: 'Nearby', icon: 'mappin' }, { next: 'delivered', label: 'Delivered', icon: 'check' }],
  nearby: [{ next: 'delivered', label: 'Delivered', icon: 'check' }],
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
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function formatTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ============================================
// Glass Capsule Component
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
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const content = (
    <Animated.View
      style={[styles.glassCapsule, isActive && { borderColor: accentColor || COLORS.primary, borderWidth: 2 }, animatedStyle, style]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96, SPRING_CONFIG.quick); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

// ============================================
// Bottom Panel Component (Expands Upward)
// ============================================

interface BottomPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  collapsedHeight: number;
  expandedHeight: number;
  headerContent: React.ReactNode;
  expandedContent: React.ReactNode;
  style?: any;
}

function BottomPanel({ isExpanded, onToggle, collapsedHeight, expandedHeight, headerContent, expandedContent, style }: BottomPanelProps) {
  const animatedHeight = useSharedValue(collapsedHeight);
  const expandProgress = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withSpring(isExpanded ? expandedHeight : collapsedHeight, SPRING_CONFIG.smooth);
    expandProgress.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded, expandedHeight, collapsedHeight]);

  const containerStyle = useAnimatedStyle(() => ({ height: animatedHeight.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: expandProgress.value }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [180, 0])}deg` }] }));

  return (
    <Animated.View style={[styles.bottomPanel, containerStyle, style]}>
      {/* Drag handle */}
      <Pressable onPress={onToggle}>
        <YStack alignItems="center" paddingVertical={8}>
          <YStack width={36} height={4} borderRadius={2} backgroundColor={COLORS.gray[300]} />
        </YStack>
        <XStack height={collapsedHeight - 16} alignItems="center" justifyContent="space-between" paddingHorizontal={20}>
          {headerContent}
          <Animated.View style={chevronStyle}>
            <ChevronUp size={20} color={COLORS.gray[400]} />
          </Animated.View>
        </XStack>
      </Pressable>

      {/* Expanded content */}
      {isExpanded && (
        <Animated.View style={[{ flex: 1, overflow: 'hidden' }, contentStyle]}>
          {expandedContent}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================
// Filter Tab Component
// ============================================

interface FilterTabProps {
  label: string;
  count: number;
  isActive: boolean;
  color: string;
  onPress: () => void;
}

function FilterTab({ label, count, isActive, color, onPress }: FilterTabProps) {
  return (
    <Pressable onPress={onPress} style={[styles.filterTab, isActive && { backgroundColor: color + '15', borderColor: color }]}>
      <Text fontSize={12} fontWeight={isActive ? '700' : '500'} color={isActive ? color : COLORS.gray[600]}>
        {label}
      </Text>
      <YStack backgroundColor={isActive ? color : COLORS.gray[300]} paddingHorizontal={6} paddingVertical={2} borderRadius={8} marginLeft={6}>
        <Text fontSize={10} fontWeight="700" color={isActive ? 'white' : COLORS.gray[600]}>{count}</Text>
      </YStack>
    </Pressable>
  );
}

// ============================================
// Order Card with Rich Expansion
// ============================================

interface RichOrderCardProps {
  order: Order;
  currency: Currency;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus?: (orderId: string, status: string) => void;
  onAssignDriver?: (orderId: string) => void;
  onLocateOnMap?: (order: Order) => void;
  isUpdating?: boolean;
  assignedDriver?: any;
}

function RichOrderCard({ order, currency, isSelected, onSelect, onUpdateStatus, onAssignDriver, onLocateOnMap, isUpdating, assignedDriver }: RichOrderCardProps) {
  const status = order.status || 'pending';
  const statusConfig = DELIVERY_STATUS_CONFIG[status] || DELIVERY_STATUS_CONFIG.pending;
  const customerName = order.customer?.name || order.guestName || 'Guest';
  const customerPhone = order.customer?.phone;
  const customerEmail = order.customer?.email;
  const itemCount = order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
  const total = order.payment?.total || order.total || 0;
  const subtotal = order.payment?.subTotal || order.payment?.subtotal || order.subTotal || 0;
  const tax = order.payment?.tax || order.payment?.vat || order.tax || 0;
  const deliveryFee = order.deliveryFee || 0;
  const needsDriver = ['pending', 'open', 'preparing'].includes(status) && !order.driverId;
  const availableTransitions = STATUS_TRANSITIONS[status] || [];

  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.98, SPRING_CONFIG.quick); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
    >
      <Animated.View style={[styles.richOrderCard, isSelected && styles.richOrderCardSelected, cardStyle]}>
        {/* Header Row */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={10}>
            <Text fontSize={16} fontWeight="800" color={COLORS.gray[900]}>{formatOrderNumber(order)}</Text>
            <XStack backgroundColor={statusConfig.bgColor} paddingHorizontal={10} paddingVertical={4} borderRadius={12} alignItems="center" gap={4}>
              <Text fontSize={11}>{statusConfig.icon}</Text>
              <Text fontSize={11} fontWeight="600" color={statusConfig.color}>{statusConfig.label}</Text>
            </XStack>
          </XStack>
          <Text fontSize={17} fontWeight="800" color={COLORS.gray[900]}>{formatCurrency(total, currency)}</Text>
        </XStack>

        {/* Customer Row */}
        <XStack alignItems="center" justifyContent="space-between" marginTop={10}>
          <XStack alignItems="center" gap={10} flex={1}>
            <YStack width={36} height={36} borderRadius={18} backgroundColor={COLORS.primary + '15'} alignItems="center" justifyContent="center">
              <Text fontSize={14} fontWeight="700" color={COLORS.primary}>{customerName.charAt(0).toUpperCase()}</Text>
            </YStack>
            <YStack flex={1}>
              <Text fontSize={14} fontWeight="600" color={COLORS.gray[800]} numberOfLines={1}>{customerName}</Text>
              {customerPhone && <Text fontSize={11} color={COLORS.gray[500]}>{customerPhone}</Text>}
            </YStack>
          </XStack>
          <XStack alignItems="center" gap={12}>
            <XStack alignItems="center" gap={4}>
              <Package size={14} color={COLORS.gray[400]} />
              <Text fontSize={12} fontWeight="600" color={COLORS.gray[600]}>{itemCount} items</Text>
            </XStack>
            <Text fontSize={11} color={COLORS.gray[400]}>{formatRelativeTime(order.createdAt)}</Text>
          </XStack>
        </XStack>

        {/* Address (collapsed view) */}
        {order.deliveryAddress && !isSelected && (
          <XStack alignItems="flex-start" gap={8} marginTop={10} backgroundColor={COLORS.gray[50]} padding={10} borderRadius={10}>
            <MapPin size={14} color={COLORS.gray[500]} style={{ marginTop: 1 }} />
            <Text fontSize={12} color={COLORS.gray[600]} numberOfLines={1} flex={1}>{order.deliveryAddress}</Text>
          </XStack>
        )}

        {/* EXPANDED CONTENT */}
        {isSelected && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
            {/* Divider */}
            <YStack height={1} backgroundColor={COLORS.gray[100]} marginVertical={14} />

            {/* Address Section */}
            {order.deliveryAddress && (
              <YStack marginBottom={14}>
                <XStack alignItems="center" gap={6} marginBottom={8}>
                  <MapPin size={14} color={COLORS.primary} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Delivery Address</Text>
                </XStack>
                <YStack backgroundColor={COLORS.gray[50]} padding={12} borderRadius={12}>
                  <Text fontSize={13} color={COLORS.gray[800]} lineHeight={20}>{order.deliveryAddress}</Text>
                  {order.notes && (
                    <XStack alignItems="flex-start" gap={6} marginTop={8} paddingTop={8} borderTopWidth={1} borderTopColor={COLORS.gray[200]}>
                      <FileText size={12} color={COLORS.gray[400]} />
                      <Text fontSize={11} color={COLORS.gray[500]} fontStyle="italic" flex={1}>{order.notes}</Text>
                    </XStack>
                  )}
                  <Pressable onPress={() => onLocateOnMap?.(order)} style={styles.locateButton}>
                    <Navigation2 size={12} color={COLORS.primary} />
                    <Text fontSize={11} fontWeight="600" color={COLORS.primary}>View on Map</Text>
                  </Pressable>
                </YStack>
              </YStack>
            )}

            {/* Items Section */}
            <YStack marginBottom={14}>
              <XStack alignItems="center" gap={6} marginBottom={8}>
                <ShoppingBag size={14} color={COLORS.indigo} />
                <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Order Items ({itemCount})</Text>
              </XStack>
              <YStack backgroundColor={COLORS.gray[50]} borderRadius={12} overflow="hidden">
                {order.items?.slice(0, 5).map((item, index) => (
                  <XStack
                    key={item.id || index}
                    alignItems="center"
                    justifyContent="space-between"
                    padding={12}
                    borderBottomWidth={index < Math.min(order.items!.length, 5) - 1 ? 1 : 0}
                    borderBottomColor={COLORS.gray[200]}
                  >
                    <XStack alignItems="center" gap={10} flex={1}>
                      <YStack width={24} height={24} borderRadius={6} backgroundColor={COLORS.indigo + '15'} alignItems="center" justifyContent="center">
                        <Text fontSize={11} fontWeight="700" color={COLORS.indigo}>{item.quantity || 1}</Text>
                      </YStack>
                      <Text fontSize={13} color={COLORS.gray[800]} numberOfLines={1} flex={1}>{item.product?.name || 'Product'}</Text>
                    </XStack>
                    <Text fontSize={13} fontWeight="600" color={COLORS.gray[700]}>
                      {formatCurrency((item.product?.sellingPrice || 0) * (item.quantity || 1), currency)}
                    </Text>
                  </XStack>
                ))}
                {order.items && order.items.length > 5 && (
                  <XStack padding={10} justifyContent="center">
                    <Text fontSize={11} color={COLORS.gray[500]}>+{order.items.length - 5} more items</Text>
                  </XStack>
                )}
              </YStack>
            </YStack>

            {/* Payment Breakdown */}
            <YStack marginBottom={14}>
              <XStack alignItems="center" gap={6} marginBottom={8}>
                <DollarSign size={14} color={COLORS.success} />
                <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Payment</Text>
              </XStack>
              <YStack backgroundColor={COLORS.gray[50]} padding={12} borderRadius={12} gap={6}>
                <XStack justifyContent="space-between">
                  <Text fontSize={12} color={COLORS.gray[500]}>Subtotal</Text>
                  <Text fontSize={12} color={COLORS.gray[700]}>{formatCurrency(subtotal, currency)}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text fontSize={12} color={COLORS.gray[500]}>Tax</Text>
                  <Text fontSize={12} color={COLORS.gray[700]}>{formatCurrency(tax, currency)}</Text>
                </XStack>
                {deliveryFee > 0 && (
                  <XStack justifyContent="space-between">
                    <Text fontSize={12} color={COLORS.gray[500]}>Delivery</Text>
                    <Text fontSize={12} color={COLORS.gray[700]}>{formatCurrency(deliveryFee, currency)}</Text>
                  </XStack>
                )}
                <YStack height={1} backgroundColor={COLORS.gray[200]} marginVertical={4} />
                <XStack justifyContent="space-between">
                  <Text fontSize={13} fontWeight="700" color={COLORS.gray[800]}>Total</Text>
                  <Text fontSize={13} fontWeight="700" color={COLORS.gray[800]}>{formatCurrency(total, currency)}</Text>
                </XStack>
              </YStack>
            </YStack>

            {/* Assigned Driver (if any) */}
            {assignedDriver && (
              <YStack marginBottom={14}>
                <XStack alignItems="center" gap={6} marginBottom={8}>
                  <Truck size={14} color={COLORS.success} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Assigned Driver</Text>
                </XStack>
                <XStack backgroundColor={COLORS.success + '10'} padding={12} borderRadius={12} alignItems="center" gap={12}>
                  <YStack width={40} height={40} borderRadius={20} backgroundColor={COLORS.success} alignItems="center" justifyContent="center">
                    <Text fontSize={16} fontWeight="700" color="white">
                      {(assignedDriver.user?.firstName || 'D').charAt(0).toUpperCase()}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="600" color={COLORS.gray[800]}>{assignedDriver.user?.firstName || 'Driver'}</Text>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={11} color={COLORS.gray[500]}>
                        {assignedDriver.vehicleType === 'bicycle' ? '🚴' : assignedDriver.vehicleType === 'motorcycle' ? '🏍️' : '🚗'}
                      </Text>
                      <Star size={10} color={COLORS.warning} fill={COLORS.warning} />
                      <Text fontSize={11} color={COLORS.gray[500]}>{assignedDriver.averageRating?.toFixed(1) || '4.8'}</Text>
                    </XStack>
                  </YStack>
                  <Pressable onPress={() => assignedDriver.user?.phone && Linking.openURL(`tel:${assignedDriver.user.phone}`)} style={styles.driverCallBtn}>
                    <Phone size={16} color={COLORS.success} />
                  </Pressable>
                </XStack>
              </YStack>
            )}

            {/* Timeline */}
            <YStack marginBottom={14}>
              <XStack alignItems="center" gap={6} marginBottom={8}>
                <History size={14} color={COLORS.cyan} />
                <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Timeline</Text>
              </XStack>
              <YStack backgroundColor={COLORS.gray[50]} padding={12} borderRadius={12}>
                {[
                  { time: order.createdAt, label: 'Order placed', done: true },
                  { time: order.delivery?.acceptedAt, label: 'Accepted', done: !!order.delivery?.acceptedAt || ['assigned', 'preparing', 'picked_up', 'on_the_way', 'nearby', 'delivered', 'completed'].includes(status) },
                  { time: undefined, label: 'Preparing', done: ['preparing', 'assigned', 'picked_up', 'on_the_way', 'nearby', 'delivered', 'completed'].includes(status) },
                  { time: order.delivery?.pickedUpAt, label: 'Picked up', done: ['picked_up', 'on_the_way', 'nearby', 'delivered', 'completed'].includes(status) },
                  { time: order.delivery?.deliveredAt, label: 'Delivered', done: ['delivered', 'completed'].includes(status) },
                ].map((step, i) => (
                  <XStack key={i} alignItems="center" gap={10} marginBottom={i < 4 ? 8 : 0}>
                    <YStack width={20} height={20} borderRadius={10} backgroundColor={step.done ? COLORS.success : COLORS.gray[200]} alignItems="center" justifyContent="center">
                      {step.done && <CheckCircle size={12} color="white" />}
                    </YStack>
                    <Text fontSize={12} color={step.done ? COLORS.gray[800] : COLORS.gray[400]} flex={1}>{step.label}</Text>
                    {step.time && step.done && <Text fontSize={10} color={COLORS.gray[400]}>{formatTime(step.time as string)}</Text>}
                  </XStack>
                ))}
              </YStack>
            </YStack>

            {/* Actions */}
            <XStack gap={10} flexWrap="wrap">
              {/* Contact buttons */}
              {customerPhone && (
                <Pressable onPress={() => Linking.openURL(`tel:${customerPhone}`)} style={styles.actionBtnGreen}>
                  <Phone size={14} color={COLORS.success} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.success}>Call</Text>
                </Pressable>
              )}
              {customerPhone && (
                <Pressable onPress={() => Linking.openURL(`sms:${customerPhone}`)} style={styles.actionBtnOutline}>
                  <MessageCircle size={14} color={COLORS.gray[600]} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[600]}>SMS</Text>
                </Pressable>
              )}

              {/* Assign Driver */}
              {needsDriver && onAssignDriver && (
                <Pressable onPress={() => onAssignDriver(order.id)} style={styles.actionBtnPrimary}>
                  <UserCheck size={14} color="white" />
                  <Text fontSize={12} fontWeight="600" color="white">Assign Driver</Text>
                </Pressable>
              )}

              {/* Status transitions */}
              {availableTransitions.map((transition) => (
                <Pressable
                  key={transition.next}
                  onPress={() => !isUpdating && onUpdateStatus?.(order.id, transition.next)}
                  style={[styles.actionBtnOutline, transition.next === 'delivered' && styles.actionBtnGreen]}
                  disabled={isUpdating}
                >
                  {transition.next === 'delivered' ? <CheckCircle size={14} color={COLORS.success} /> : <Play size={14} color={COLORS.gray[600]} />}
                  <Text fontSize={12} fontWeight="600" color={transition.next === 'delivered' ? COLORS.success : COLORS.gray[600]}>
                    {isUpdating ? '...' : transition.label}
                  </Text>
                </Pressable>
              ))}
            </XStack>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ============================================
// Driver Card with Rich Expansion
// ============================================

interface RichDriverCardProps {
  driver: any;
  isSelected: boolean;
  onSelect: () => void;
  onLocateOnMap?: (driver: any) => void;
  onAssign?: (driverId: string) => void;
  isAssigning?: boolean;
}

function RichDriverCard({ driver, isSelected, onSelect, onLocateOnMap, onAssign, isAssigning }: RichDriverCardProps) {
  const isOnline = driver.isAvailable || driver.status === 'available';
  const driverName = driver.user?.firstName || driver.user?.name?.split(' ')[0] || 'Driver';
  const hasActiveDelivery = !!driver.activeDeliveryId;

  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.98, SPRING_CONFIG.quick); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.quick); }}
    >
      <Animated.View style={[styles.richDriverCard, isSelected && styles.richDriverCardSelected, !isOnline && styles.richDriverCardOffline, cardStyle]}>
        {/* Header Row */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={12}>
            <YStack position="relative">
              <YStack width={48} height={48} borderRadius={24} backgroundColor={isOnline ? COLORS.success + '20' : COLORS.gray[200]} alignItems="center" justifyContent="center">
                <Text fontSize={18} fontWeight="700" color={isOnline ? COLORS.success : COLORS.gray[500]}>{driverName.charAt(0).toUpperCase()}</Text>
              </YStack>
              <YStack position="absolute" bottom={0} right={0} width={14} height={14} borderRadius={7} backgroundColor={isOnline ? COLORS.success : COLORS.gray[400]} borderWidth={2} borderColor="white" />
            </YStack>
            <YStack>
              <Text fontSize={15} fontWeight="700" color={COLORS.gray[800]}>{driverName}</Text>
              <XStack alignItems="center" gap={6}>
                <Text fontSize={12} color={COLORS.gray[500]}>
                  {driver.vehicleType === 'bicycle' ? '🚴' : driver.vehicleType === 'motorcycle' ? '🏍️' : driver.vehicleType === 'walking' ? '🚶' : '🚗'}
                </Text>
                <Star size={10} color={COLORS.warning} fill={COLORS.warning} />
                <Text fontSize={12} color={COLORS.gray[600]}>{driver.averageRating?.toFixed(1) || '4.8'}</Text>
              </XStack>
            </YStack>
          </XStack>
          <YStack alignItems="flex-end" gap={4}>
            <YStack backgroundColor={isOnline ? COLORS.success + '15' : COLORS.gray[100]} paddingHorizontal={10} paddingVertical={4} borderRadius={8}>
              <Text fontSize={11} fontWeight="600" color={isOnline ? COLORS.success : COLORS.gray[500]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </YStack>
            {hasActiveDelivery && (
              <XStack alignItems="center" gap={4}>
                <YStack width={6} height={6} borderRadius={3} backgroundColor={COLORS.warning} />
                <Text fontSize={10} color={COLORS.warning}>On delivery</Text>
              </XStack>
            )}
          </YStack>
        </XStack>

        {/* EXPANDED CONTENT */}
        {isSelected && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
            <YStack height={1} backgroundColor={COLORS.gray[100]} marginVertical={14} />

            {/* Stats Row */}
            <XStack gap={8} marginBottom={14}>
              <YStack flex={1} backgroundColor={COLORS.gray[50]} padding={12} borderRadius={12} alignItems="center">
                <Text fontSize={20} fontWeight="800" color={COLORS.gray[800]}>{driver.deliveriesToday || 0}</Text>
                <Text fontSize={10} color={COLORS.gray[500]}>Today</Text>
              </YStack>
              <YStack flex={1} backgroundColor={COLORS.gray[50]} padding={12} borderRadius={12} alignItems="center">
                <Text fontSize={20} fontWeight="800" color={COLORS.gray[800]}>{driver.totalDeliveries || 0}</Text>
                <Text fontSize={10} color={COLORS.gray[500]}>Total</Text>
              </YStack>
              <YStack flex={1} backgroundColor={COLORS.success + '10'} padding={12} borderRadius={12} alignItems="center">
                <Text fontSize={20} fontWeight="800" color={COLORS.success}>{driver.onTimePercent || 98}%</Text>
                <Text fontSize={10} color={COLORS.success}>On-Time</Text>
              </YStack>
              <YStack flex={1} backgroundColor={COLORS.cyan + '10'} padding={12} borderRadius={12} alignItems="center">
                <Text fontSize={20} fontWeight="800" color={COLORS.cyan}>~{driver.avgDeliveryTime || 24}</Text>
                <Text fontSize={10} color={COLORS.cyan}>Avg Min</Text>
              </YStack>
            </XStack>

            {/* Active Delivery */}
            {hasActiveDelivery && driver.activeDelivery && (
              <YStack marginBottom={14}>
                <XStack alignItems="center" gap={6} marginBottom={8}>
                  <Truck size={14} color={COLORS.warning} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Current Delivery</Text>
                </XStack>
                <YStack backgroundColor={COLORS.warning + '10'} padding={12} borderRadius={12}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={8}>
                      <Text fontSize={14} fontWeight="700" color={COLORS.gray[800]}>
                        #{driver.activeDelivery.orderNumber || driver.activeDelivery.id?.slice(-5)}
                      </Text>
                      <YStack backgroundColor={COLORS.warning + '20'} paddingHorizontal={8} paddingVertical={2} borderRadius={6}>
                        <Text fontSize={10} fontWeight="600" color={COLORS.warning}>{driver.activeDelivery.status || 'En Route'}</Text>
                      </YStack>
                    </XStack>
                    <Text fontSize={13} fontWeight="600" color={COLORS.gray[700]}>{driver.activeDelivery.customerName || 'Customer'}</Text>
                  </XStack>
                  <XStack alignItems="center" gap={6} marginTop={8}>
                    <MapPin size={12} color={COLORS.gray[500]} />
                    <Text fontSize={11} color={COLORS.gray[600]} numberOfLines={1} flex={1}>{driver.activeDelivery.address || 'Address'}</Text>
                  </XStack>
                </YStack>
              </YStack>
            )}

            {/* Recent Deliveries */}
            {driver.recentDeliveries && driver.recentDeliveries.length > 0 && (
              <YStack marginBottom={14}>
                <XStack alignItems="center" gap={6} marginBottom={8}>
                  <History size={14} color={COLORS.cyan} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Recent Deliveries</Text>
                </XStack>
                <YStack backgroundColor={COLORS.gray[50]} borderRadius={12} overflow="hidden">
                  {driver.recentDeliveries.slice(0, 3).map((delivery: any, index: number) => (
                    <XStack key={delivery.id || index} alignItems="center" justifyContent="space-between" padding={12} borderBottomWidth={index < 2 ? 1 : 0} borderBottomColor={COLORS.gray[200]}>
                      <XStack alignItems="center" gap={8}>
                        <CheckCircle size={14} color={COLORS.success} />
                        <Text fontSize={12} color={COLORS.gray[700]}>{delivery.customerName || 'Customer'}</Text>
                      </XStack>
                      <Text fontSize={10} color={COLORS.gray[400]}>{formatRelativeTime(delivery.completedAt)}</Text>
                    </XStack>
                  ))}
                </YStack>
              </YStack>
            )}

            {/* Frequent Customers */}
            {driver.frequentCustomers && driver.frequentCustomers.length > 0 && (
              <YStack marginBottom={14}>
                <XStack alignItems="center" gap={6} marginBottom={8}>
                  <Heart size={14} color={COLORS.pink} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[700]}>Frequent Customers</Text>
                </XStack>
                <XStack gap={8} flexWrap="wrap">
                  {driver.frequentCustomers.slice(0, 4).map((customer: any, index: number) => (
                    <YStack key={index} backgroundColor={COLORS.gray[50]} padding={10} borderRadius={10} alignItems="center" minWidth={70}>
                      <YStack width={32} height={32} borderRadius={16} backgroundColor={COLORS.pink + '15'} alignItems="center" justifyContent="center" marginBottom={4}>
                        <Text fontSize={12} fontWeight="600" color={COLORS.pink}>{customer.name?.charAt(0) || 'C'}</Text>
                      </YStack>
                      <Text fontSize={10} color={COLORS.gray[700]} numberOfLines={1}>{customer.name || 'Customer'}</Text>
                      <Text fontSize={9} color={COLORS.gray[500]}>{customer.deliveryCount || 0}x</Text>
                    </YStack>
                  ))}
                </XStack>
              </YStack>
            )}

            {/* Actions */}
            <XStack gap={10}>
              {isOnline && onLocateOnMap && (
                <Pressable onPress={() => onLocateOnMap(driver)} style={styles.actionBtnPrimary}>
                  <MapPin size={14} color="white" />
                  <Text fontSize={12} fontWeight="600" color="white">Locate on Map</Text>
                </Pressable>
              )}
              {isOnline && !hasActiveDelivery && onAssign && (
                <Pressable onPress={() => onAssign(driver.id)} style={styles.actionBtnGreen} disabled={isAssigning}>
                  <UserCheck size={14} color={COLORS.success} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.success}>{isAssigning ? 'Assigning...' : 'Assign'}</Text>
                </Pressable>
              )}
              {driver.user?.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${driver.user.phone}`)} style={styles.actionBtnOutline}>
                  <Phone size={14} color={COLORS.gray[600]} />
                  <Text fontSize={12} fontWeight="600" color={COLORS.gray[600]}>Call</Text>
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
// Main Screen Component
// ============================================

interface OrderTrackingScreenProps {
  onBack?: () => void;
}

export default function OrderTrackingScreen({ onBack }: OrderTrackingScreenProps) {
  const { settings } = useSettingsStore();
  const { data: appSettings } = useAppSettings();
  const mapRef = useRef<NavigationMapRef>(null);

  // State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storeCoordinates, setStoreCoordinates] = useState<Coordinate | null>(null);
  const [isGeocodingStore, setIsGeocodingStore] = useState(false);

  // Panel states
  const [isOrdersPanelExpanded, setIsOrdersPanelExpanded] = useState(false);
  const [isDriversPanelExpanded, setIsDriversPanelExpanded] = useState(false);
  const [driverAssignOrderId, setDriverAssignOrderId] = useState<string | null>(null);

  // API Hooks
  const { data: primaryDeliveryZone } = usePrimaryDeliveryZone();
  const { data: deliveryStats } = useDeliveryStats();
  const { data: availableDrivers, refetch: refetchDrivers } = useAvailableDrivers();
  const { data: deliveryHistory, refetch: refetchHistory } = useDeliveryHistory({ status: 'delivered', limit: 50 });
  const { data: ordersData, refetch } = useOrders({ limit: 100 });

  // Mutations
  const updateStatusMutation = useUpdateDeliveryStatus();
  const autoAssignMutation = useAutoAssignDriver();
  const assignDriverMutation = useAssignDriver();

  const deliveryRadiusMeters = primaryDeliveryZone?.radiusMeters ?? 8000;
  const navigation = useNavigation({ vehicleType: 'car', showAlternatives: true });

  // Filter delivery orders
  const deliveryOrders = useMemo(() => {
    const allOrders = ordersData ?? [];
    const deliveryTypes = ['delivery', 'doordash', 'uber_eats', 'grubhub', 'postmates', 'deliveroo', 'skip_the_dishes'];

    let filtered = allOrders.filter((order: Order) => {
      const orderType = order.orderType || 'walk_in';
      const isDeliveryType = deliveryTypes.includes(orderType);
      if (statusFilter === 'delivered') return (isDeliveryType || order.isDelivery) && ['completed', 'delivered'].includes(order.status || '');
      const isNotCompleted = !['completed', 'delivered', 'cancelled', 'refunded'].includes(order.status || '');
      return isDeliveryType || (order.isDelivery && isNotCompleted);
    });

    if (statusFilter === 'on_the_way') return filtered.filter((o: Order) => ['on_the_way', 'picked_up', 'nearby'].includes(o.status || ''));
    if (statusFilter === 'preparing') return filtered.filter((o: Order) => ['pending', 'open', 'assigned', 'preparing'].includes(o.status || ''));
    if (statusFilter === 'delivered') return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
    return filtered;
  }, [ordersData, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const allOrders = ordersData ?? [];
    const deliveryTypes = ['delivery', 'doordash', 'uber_eats', 'grubhub', 'postmates', 'deliveroo', 'skip_the_dishes'];
    const allDeliveryOrders = allOrders.filter((o: Order) => deliveryTypes.includes(o.orderType || '') || o.isDelivery);
    const activeOrders = allDeliveryOrders.filter((o: Order) => !['completed', 'delivered', 'cancelled', 'refunded'].includes(o.status || ''));
    const availableCount = availableDrivers?.filter((d: any) => d.isAvailable || d.status === 'available')?.length ?? 0;

    return {
      total: activeOrders.length,
      onTheWay: allDeliveryOrders.filter((o: Order) => ['on_the_way', 'picked_up', 'nearby'].includes(o.status || '')).length,
      preparing: allDeliveryOrders.filter((o: Order) => ['pending', 'open', 'assigned', 'preparing'].includes(o.status || '')).length,
      completedToday: deliveryHistory?.length ?? deliveryStats?.completedToday ?? 0,
      availableDrivers: availableCount,
      totalDrivers: availableDrivers?.length ?? 0,
    };
  }, [ordersData, deliveryStats, availableDrivers, deliveryHistory]);

  // Store geocoding
  const storeAddress = useMemo(() => {
    const parts = [];
    if (appSettings?.businessAddress) parts.push(appSettings.businessAddress);
    else if (appSettings?.address) parts.push(appSettings.address);
    if (appSettings?.city) parts.push(appSettings.city);
    if (appSettings?.state) parts.push(appSettings.state);
    if (appSettings?.zipCode) parts.push(appSettings.zipCode);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [appSettings]);

  useEffect(() => {
    if (storeAddress) {
      setIsGeocodingStore(true);
      geocodeAddress(storeAddress).then((result) => {
        if (result) setStoreCoordinates({ latitude: result.latitude, longitude: result.longitude });
      }).finally(() => setIsGeocodingStore(false));
    }
  }, [storeAddress]);

  // Route calculation
  useEffect(() => {
    if (selectedOrder && storeCoordinates && selectedOrder.deliveryLatitude && selectedOrder.deliveryLongitude) {
      navigation.calculateRoute(storeCoordinates, { latitude: selectedOrder.deliveryLatitude, longitude: selectedOrder.deliveryLongitude });
    } else {
      navigation.clearRoute();
    }
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
    } catch { Alert.alert('Error', 'Failed to update status'); }
  };

  const handleAssignDriver = (orderId: string) => {
    setDriverAssignOrderId(orderId);
    setIsDriversPanelExpanded(true);
  };

  const handleSelectDriverForAssign = async (driverId: string) => {
    if (!driverAssignOrderId) return;
    try {
      await assignDriverMutation.mutateAsync({ deliveryId: driverAssignOrderId, driverId });
      setDriverAssignOrderId(null);
      setIsDriversPanelExpanded(false);
      refetch();
      refetchDrivers();
    } catch { Alert.alert('Error', 'Failed to assign driver'); }
  };

  const handleLocateOrderOnMap = (order: Order) => {
    if (order.deliveryLatitude && order.deliveryLongitude) {
      mapRef.current?.panTo({ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude });
    }
  };

  const handleLocateDriverOnMap = (driver: any) => {
    if (driver.currentLatitude && driver.currentLongitude) {
      mapRef.current?.panTo({ latitude: driver.currentLatitude, longitude: driver.currentLongitude });
      // If driver has active delivery, show the route
      if (driver.activeDelivery && storeCoordinates) {
        const dest = driver.activeDelivery.deliveryLatitude && driver.activeDelivery.deliveryLongitude
          ? { latitude: driver.activeDelivery.deliveryLatitude, longitude: driver.activeDelivery.deliveryLongitude }
          : null;
        if (dest) navigation.calculateRoute({ latitude: driver.currentLatitude, longitude: driver.currentLongitude }, dest);
      }
    }
  };

  const selectedCustomerLocation = useMemo(() => {
    if (selectedOrder?.deliveryLatitude && selectedOrder?.deliveryLongitude) {
      return { latitude: selectedOrder.deliveryLatitude, longitude: selectedOrder.deliveryLongitude };
    }
    return undefined;
  }, [selectedOrder]);

  const PANEL_COLLAPSED_HEIGHT = 70;
  const PANEL_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.65;

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

        {/* TOP BAR: Stats & Quick Actions */}
        <XStack position="absolute" top={16} left={16} right={16} zIndex={100} justifyContent="space-between" alignItems="flex-start">
          {/* Stats Capsule */}
          <GlassCapsule style={styles.topCapsule}>
            <XStack alignItems="center" gap={12}>
              <YStack alignItems="center">
                <Text fontSize={22} fontWeight="800" color={COLORS.gray[900]}>{stats.total}</Text>
                <Text fontSize={9} color={COLORS.gray[500]}>Active</Text>
              </YStack>
              <YStack width={1} height={30} backgroundColor={COLORS.gray[200]} />
              <XStack gap={10}>
                <YStack alignItems="center">
                  <XStack alignItems="center" gap={3}>
                    <Truck size={12} color={COLORS.warning} />
                    <Text fontSize={14} fontWeight="700" color={COLORS.warning}>{stats.onTheWay}</Text>
                  </XStack>
                  <Text fontSize={8} color={COLORS.gray[400]}>En Route</Text>
                </YStack>
                <YStack alignItems="center">
                  <XStack alignItems="center" gap={3}>
                    <Package size={12} color={COLORS.indigo} />
                    <Text fontSize={14} fontWeight="700" color={COLORS.indigo}>{stats.preparing}</Text>
                  </XStack>
                  <Text fontSize={8} color={COLORS.gray[400]}>Preparing</Text>
                </YStack>
                <YStack alignItems="center">
                  <XStack alignItems="center" gap={3}>
                    <CheckCircle size={12} color={COLORS.success} />
                    <Text fontSize={14} fontWeight="700" color={COLORS.success}>{stats.completedToday}</Text>
                  </XStack>
                  <Text fontSize={8} color={COLORS.gray[400]}>Done</Text>
                </YStack>
              </XStack>
            </XStack>
          </GlassCapsule>

          {/* Quick Actions */}
          <GlassCapsule style={styles.topCapsule}>
            <XStack alignItems="center" gap={8}>
              <Pressable onPress={handleRefresh} style={[styles.quickBtn, isRefreshing && styles.quickBtnActive]}>
                <RefreshCw size={18} color={isRefreshing ? COLORS.primary : COLORS.gray[600]} />
              </Pressable>
              <Pressable onPress={() => mapRef.current?.recenter()} style={styles.quickBtn}>
                <Locate size={18} color={COLORS.gray[600]} />
              </Pressable>
            </XStack>
          </GlassCapsule>
        </XStack>

        {/* BOTTOM PANELS */}
        <XStack position="absolute" bottom={0} left={0} right={0} zIndex={100} gap={12} paddingHorizontal={12} paddingBottom={12}>
          {/* Deliveries Panel */}
          <YStack flex={1}>
            <BottomPanel
              isExpanded={isOrdersPanelExpanded}
              onToggle={() => {
                const newExpanded = !isOrdersPanelExpanded;
                setIsOrdersPanelExpanded(newExpanded);
                if (!newExpanded) setSelectedOrder(null);
                if (newExpanded) setIsDriversPanelExpanded(false);
              }}
              collapsedHeight={PANEL_COLLAPSED_HEIGHT}
              expandedHeight={PANEL_EXPANDED_HEIGHT}
              headerContent={
                <XStack alignItems="center" gap={10} flex={1}>
                  <Truck size={20} color={COLORS.primary} />
                  <Text fontSize={16} fontWeight="700" color={COLORS.gray[800]}>Deliveries</Text>
                  <YStack backgroundColor={COLORS.primary} paddingHorizontal={8} paddingVertical={3} borderRadius={10}>
                    <Text fontSize={11} fontWeight="700" color="white">{deliveryOrders.length}</Text>
                  </YStack>
                </XStack>
              }
              expandedContent={
                <YStack flex={1}>
                  {/* Filter Tabs */}
                  <XStack paddingHorizontal={16} paddingVertical={10} gap={8}>
                    <FilterTab label="All" count={stats.total + stats.completedToday} isActive={statusFilter === 'active'} color={COLORS.primary} onPress={() => setStatusFilter('active')} />
                    <FilterTab label="En Route" count={stats.onTheWay} isActive={statusFilter === 'on_the_way'} color={COLORS.warning} onPress={() => setStatusFilter('on_the_way')} />
                    <FilterTab label="Preparing" count={stats.preparing} isActive={statusFilter === 'preparing'} color={COLORS.indigo} onPress={() => setStatusFilter('preparing')} />
                    <FilterTab label="Completed" count={stats.completedToday} isActive={statusFilter === 'delivered'} color={COLORS.success} onPress={() => setStatusFilter('delivered')} />
                  </XStack>

                  {/* Orders List */}
                  <FlatList
                    data={deliveryOrders}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <RichOrderCard
                        order={item}
                        currency={settings.currency}
                        isSelected={selectedOrder?.id === item.id}
                        onSelect={() => setSelectedOrder(selectedOrder?.id === item.id ? null : item)}
                        onUpdateStatus={handleStatusUpdate}
                        onAssignDriver={handleAssignDriver}
                        onLocateOnMap={handleLocateOrderOnMap}
                        isUpdating={updateStatusMutation.isPending}
                        assignedDriver={item.driverId ? availableDrivers?.find((d: any) => d.id === item.driverId) : null}
                      />
                    )}
                    ListEmptyComponent={
                      <YStack alignItems="center" paddingVertical={40}>
                        <Package size={40} color={COLORS.gray[300]} />
                        <Text color={COLORS.gray[500]} marginTop={12}>No deliveries</Text>
                      </YStack>
                    }
                  />
                </YStack>
              }
            />
          </YStack>

          {/* Drivers Panel */}
          <YStack flex={1}>
            <BottomPanel
              isExpanded={isDriversPanelExpanded}
              onToggle={() => {
                const newExpanded = !isDriversPanelExpanded;
                setIsDriversPanelExpanded(newExpanded);
                if (!newExpanded) { setSelectedDriver(null); setDriverAssignOrderId(null); }
                if (newExpanded) setIsOrdersPanelExpanded(false);
              }}
              collapsedHeight={PANEL_COLLAPSED_HEIGHT}
              expandedHeight={PANEL_EXPANDED_HEIGHT}
              headerContent={
                <XStack alignItems="center" gap={10} flex={1}>
                  <Users size={20} color={COLORS.success} />
                  <Text fontSize={16} fontWeight="700" color={COLORS.gray[800]}>Drivers</Text>
                  <XStack alignItems="baseline" gap={2}>
                    <Text fontSize={16} fontWeight="800" color={COLORS.success}>{stats.availableDrivers}</Text>
                    <Text fontSize={11} color={COLORS.gray[400]}>/{stats.totalDrivers}</Text>
                  </XStack>
                  {driverAssignOrderId && (
                    <YStack backgroundColor={COLORS.warning + '20'} paddingHorizontal={8} paddingVertical={3} borderRadius={8}>
                      <Text fontSize={10} fontWeight="600" color={COLORS.warning}>Assigning...</Text>
                    </YStack>
                  )}
                </XStack>
              }
              expandedContent={
                <YStack flex={1}>
                  {/* Stats Row */}
                  <XStack paddingHorizontal={16} paddingVertical={10} gap={10}>
                    <YStack flex={1} backgroundColor={COLORS.success + '15'} padding={12} borderRadius={12} alignItems="center">
                      <Text fontSize={22} fontWeight="800" color={COLORS.success}>{stats.availableDrivers}</Text>
                      <Text fontSize={10} color={COLORS.success}>Available</Text>
                    </YStack>
                    <YStack flex={1} backgroundColor={COLORS.gray[100]} padding={12} borderRadius={12} alignItems="center">
                      <Text fontSize={22} fontWeight="800" color={COLORS.gray[600]}>{stats.totalDrivers - stats.availableDrivers}</Text>
                      <Text fontSize={10} color={COLORS.gray[500]}>Offline</Text>
                    </YStack>
                  </XStack>

                  {/* Drivers List */}
                  <FlatList
                    data={availableDrivers}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <RichDriverCard
                        driver={item}
                        isSelected={selectedDriver?.id === item.id}
                        onSelect={() => setSelectedDriver(selectedDriver?.id === item.id ? null : item)}
                        onLocateOnMap={handleLocateDriverOnMap}
                        onAssign={driverAssignOrderId ? handleSelectDriverForAssign : undefined}
                        isAssigning={assignDriverMutation.isPending}
                      />
                    )}
                    ListEmptyComponent={
                      <YStack alignItems="center" paddingVertical={40}>
                        <Users size={40} color={COLORS.gray[300]} />
                        <Text color={COLORS.gray[500]} marginTop={12}>No drivers available</Text>
                      </YStack>
                    }
                  />
                </YStack>
              }
            />
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  glassCapsule: {
    backgroundColor: COLORS.glass.light,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.medium,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
  },

  bottomPanel: {
    backgroundColor: COLORS.glass.light,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.large,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
  },

  topCapsule: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  quickBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickBtnActive: {
    backgroundColor: COLORS.primary + '15',
  },

  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: 'white',
  },

  richOrderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },

  richOrderCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '02',
  },

  richDriverCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },

  richDriverCardSelected: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '02',
  },

  richDriverCardOffline: {
    opacity: 0.7,
  },

  locateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  driverCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },

  actionBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.success + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },

  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
});
