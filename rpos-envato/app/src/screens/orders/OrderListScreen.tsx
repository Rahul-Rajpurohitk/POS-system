/**
 * OrderListScreen - Enhanced order management with filtering, search, and multiple views
 * Matching Product screen UI style with inline filters, 6 KPIs, and color-coded rows
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, RefreshCw, Eye, Pencil, ShoppingBag,
  Clock, CheckCircle, XCircle, DollarSign, TrendingUp, Calendar,
  Truck, Users, Package, AlertCircle, X, RotateCcw, ChevronDown, ChevronUp, CreditCard, Store,
  ArrowUpDown,
} from '@tamagui/lucide-icons';
import OrderTrackingScreen from './OrderTrackingScreen';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { useSettingsStore, useCartStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useOrders, useOrderStats, useUpdateOrder, useRefundOrder, useExchangeOrder } from '@/features/orders/hooks';
import type { OrderScreenProps } from '@/navigation/types';
import type { Order, Currency } from '@/types';

// Import components
import {
  OrderDetailDrawer,
  ExchangeRefundModal,
  OrderStatusBadge,
  OrderFiltersInline,
  type OrderFiltersInlineState,
  type OrderStatus,
  type ExchangeRefundRequest,
} from '@/components/order';

// Color constants matching Product screen
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
};

// Stats card colors matching Product screen
const STAT_COLORS = {
  todayOrders: { bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE' },
  revenue: { bg: '#ECFDF5', icon: '#059669', border: '#A7F3D0' },
  completed: { bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0' },
  pending: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D' },
  avgOrder: { bg: '#E0F2FE', icon: '#0284C7', border: '#BAE6FD' },
  cancelled: { bg: '#FEE2E2', icon: '#DC2626', border: '#FECACA' },
};

// Order Type colors for row stripe (like product category colors)
const ORDER_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  walk_in: { color: '#10B981', label: 'Walk-in' },
  phone: { color: '#3B82F6', label: 'Phone' },
  online: { color: '#8B5CF6', label: 'Online' },
  doordash: { color: '#EF4444', label: 'DoorDash' },
  uber_eats: { color: '#22C55E', label: 'Uber Eats' },
  grubhub: { color: '#F97316', label: 'Grubhub' },
  postmates: { color: '#0EA5E9', label: 'Postmates' },
  skip_the_dishes: { color: '#EC4899', label: 'Skip' },
  deliveroo: { color: '#14B8A6', label: 'Deliveroo' },
  delivery: { color: '#14B8A6', label: 'Delivery' },
  other_partner: { color: '#6B7280', label: 'Partner' },
  default: { color: '#10B981', label: 'Walk-in' },
};

// Payment Method colors
const PAYMENT_METHOD_COLORS: Record<string, { color: string; label: string }> = {
  cash: { color: '#10B981', label: 'Cash' },
  credit_card: { color: '#8B5CF6', label: 'Card' },
  debit_card: { color: '#8B5CF6', label: 'Debit' },
  mobile_payment: { color: '#EC4899', label: 'Mobile' },
  qr_code: { color: '#3B82F6', label: 'QR Code' },
  gift_card: { color: '#F59E0B', label: 'Gift Card' },
  store_credit: { color: '#F59E0B', label: 'Credit' },
  split: { color: '#6B7280', label: 'Split' },
  default: { color: '#6B7280', label: 'Cash' },
};

// Default filters
const DEFAULT_FILTERS: OrderFiltersInlineState = {
  search: '',
  status: 'all',
  dateRange: 'all',
  paymentMethod: 'all',
  orderType: 'all',
  amountRange: 'all',
  staffId: null,
};

// Format order number to industry standard ORD-XXXXX
function formatOrderNumber(order: Order): string {
  const orderNum = order.orderNumber ?? order.number;
  if (orderNum) {
    const numStr = String(orderNum);
    if (numStr.startsWith('ORD-')) return numStr;
    if (/^\d+$/.test(numStr)) return `ORD-${numStr.padStart(5, '0')}`;
    return numStr;
  }
  const idPart = order.id.replace(/-/g, '').slice(-5).toUpperCase();
  return `ORD-${idPart}`;
}

// Format date compactly with proper timezone handling
function formatCompactDate(dateString: string): string {
  if (!dateString) return '';

  // Ensure the date string is treated as UTC if no timezone specified
  let normalizedDateString = dateString;
  const hasTimezoneInfo =
    dateString.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(dateString) ||
    /[+-]\d{4}$/.test(dateString);

  if (!hasTimezoneInfo) {
    normalizedDateString = dateString + 'Z';
  }

  const date = new Date(normalizedDateString);
  if (isNaN(date.getTime())) return '';

  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${month} ${day}, ${hour12}:${minutes} ${ampm}`;
}

// Sort configuration type
type OrderSortField = 'orderId' | 'date' | 'customer' | 'items' | 'total' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: OrderSortField;
  direction: SortDirection;
}

// Column widths
const COL_WIDTHS = {
  colorStripe: 5,
  orderId: 85,
  date: 100,
  customer: 'flex' as const,
  items: 45,
  total: 75,
  status: 85,
  payment: 65,
  type: 80,
  handledBy: 60,
  actions: 55,
};

// Sortable header component (matching Product screen style)
function SortableHeader({
  label,
  field,
  sortConfig,
  onSort,
  width,
  flex,
  align = 'left',
}: {
  label: string;
  field: OrderSortField;
  sortConfig: SortConfig;
  onSort: (field: OrderSortField) => void;
  width?: number | string;
  flex?: number;
  align?: 'left' | 'center' | 'right';
}) {
  const isActive = sortConfig.field === field;

  return (
    <XStack
      width={width as any}
      flex={flex}
      alignItems="center"
      justifyContent={align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}
      gap="$1"
      cursor="pointer"
      onPress={() => onSort(field)}
      hoverStyle={{ opacity: 0.7 }}
    >
      <Text
        fontSize={11}
        fontWeight="600"
        color={isActive ? COLORS.primary : '#6B7280'}
        textAlign={align}
      >
        {label}
      </Text>
      {isActive ? (
        sortConfig.direction === 'asc' ? (
          <ChevronUp size={10} color={COLORS.primary} />
        ) : (
          <ChevronDown size={10} color={COLORS.primary} />
        )
      ) : (
        <ArrowUpDown size={8} color="#9CA3AF" />
      )}
    </XStack>
  );
}

// Table header component (matching Product screen style)
function TableHeader({
  isDesktop,
  sortConfig,
  onSort,
}: {
  isDesktop: boolean;
  sortConfig: SortConfig;
  onSort: (field: OrderSortField) => void;
}) {
  return (
    <XStack
      backgroundColor="$backgroundHover"
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
      gap="$2"
    >
      <YStack width={COL_WIDTHS.colorStripe} />
      <YStack width={COL_WIDTHS.orderId}>
        <SortableHeader label="Order ID" field="orderId" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.orderId} />
      </YStack>
      {isDesktop && (
        <YStack width={COL_WIDTHS.date}>
          <SortableHeader label="Date" field="date" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.date} />
        </YStack>
      )}
      <YStack flex={1} minWidth={80}>
        <SortableHeader label="Customer" field="customer" sortConfig={sortConfig} onSort={onSort} flex={1} />
      </YStack>
      {isDesktop && (
        <YStack width={COL_WIDTHS.items}>
          <SortableHeader label="Items" field="items" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.items} align="center" />
        </YStack>
      )}
      <YStack width={COL_WIDTHS.total}>
        <SortableHeader label="Total" field="total" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.total} align="right" />
      </YStack>
      <YStack width={COL_WIDTHS.status}>
        <SortableHeader label="Status" field="status" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.status} align="center" />
      </YStack>
      {isDesktop && (
        <>
          <YStack width={COL_WIDTHS.payment}>
            <Text fontSize={11} fontWeight="600" color="#6B7280" textAlign="center">Payment</Text>
          </YStack>
          <YStack width={COL_WIDTHS.type}>
            <Text fontSize={11} fontWeight="600" color="#6B7280" textAlign="center">Type</Text>
          </YStack>
          <YStack width={COL_WIDTHS.handledBy}>
            <Text fontSize={11} fontWeight="600" color="#6B7280">Staff</Text>
          </YStack>
        </>
      )}
      <YStack width={COL_WIDTHS.actions}>
        <Text fontSize={11} fontWeight="600" color="#6B7280" textAlign="center">Actions</Text>
      </YStack>
    </XStack>
  );
}

// Table row component with color stripe
function TableRow({
  order,
  isDesktop,
  onView,
  onEdit,
  currency,
}: {
  order: Order;
  isDesktop: boolean;
  onView: () => void;
  onEdit: () => void;
  currency: Currency;
}) {
  const orderId = formatOrderNumber(order);
  const payment = order.payment || { subTotal: order.subTotal || 0, discount: order.discount || 0, total: order.total || 0 };
  const customerName = order.customer?.name || order.guestName || 'Walk-in';
  const itemCount = order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
  const status = (order.status || 'completed') as OrderStatus;
  const handledBy = (order as any).createdBy?.name || (order as any).staff?.name || 'Staff';

  const paymentMethod = order.paymentMethod || 'cash';
  const orderType = order.orderType || 'walk_in';
  const paymentConfig = PAYMENT_METHOD_COLORS[paymentMethod] || PAYMENT_METHOD_COLORS.default;
  const orderTypeConfig = ORDER_TYPE_COLORS[orderType] || ORDER_TYPE_COLORS.default;

  return (
    <XStack
      paddingVertical="$2"
      paddingRight="$3"
      borderBottomWidth={1}
      borderBottomColor="#E5E7EB"
      backgroundColor="white"
      alignItems="center"
      gap="$2"
      cursor="pointer"
      hoverStyle={{ backgroundColor: '#F9FAFB' }}
      pressStyle={{ opacity: 0.9 }}
      onPress={onView}
    >
      {/* Color stripe based on order type (like product category color) */}
      <YStack
        width={COL_WIDTHS.colorStripe}
        alignSelf="stretch"
        backgroundColor={orderTypeConfig.color}
        borderTopLeftRadius="$1"
        borderBottomLeftRadius="$1"
      />

      {/* Order ID */}
      <YStack width={COL_WIDTHS.orderId} paddingLeft="$2">
        <Text fontSize={12} fontWeight="600" color="#3B82F6" numberOfLines={1}>
          {orderId}
        </Text>
      </YStack>

      {/* Date */}
      {isDesktop && (
        <YStack width={COL_WIDTHS.date}>
          <Text fontSize={11} color="#6B7280" numberOfLines={1}>
            {formatCompactDate(order.createdAt)}
          </Text>
        </YStack>
      )}

      {/* Customer */}
      <YStack flex={1} minWidth={80}>
        <Text fontSize={12} color="#111827" numberOfLines={1}>{customerName}</Text>
        {!isDesktop && (
          <Text fontSize={10} color="#6B7280" numberOfLines={1}>
            {itemCount} items • {formatCompactDate(order.createdAt)}
          </Text>
        )}
      </YStack>

      {/* Items */}
      {isDesktop && (
        <YStack width={COL_WIDTHS.items} alignItems="center">
          <Text fontSize={11} color="#6B7280">{itemCount}</Text>
        </YStack>
      )}

      {/* Total */}
      <YStack width={COL_WIDTHS.total}>
        <Text fontSize={12} fontWeight="600" color="#111827" textAlign="right" numberOfLines={1}>
          {formatCurrency(payment.total, currency)}
        </Text>
      </YStack>

      {/* Status */}
      <YStack width={COL_WIDTHS.status} alignItems="center">
        <OrderStatusBadge status={status} size="sm" pulse={status === 'pending' || status === 'open'} />
      </YStack>

      {isDesktop && (
        <>
          {/* Payment Method Badge */}
          <YStack width={COL_WIDTHS.payment} alignItems="center">
            <XStack
              backgroundColor={`${paymentConfig.color}20`}
              paddingHorizontal={6}
              paddingVertical={2}
              borderRadius="$1"
              alignItems="center"
              gap={3}
              maxWidth="100%"
            >
              <YStack width={4} height={4} borderRadius={2} backgroundColor={paymentConfig.color} flexShrink={0} />
              <Text fontSize={9} color={paymentConfig.color} fontWeight="500" numberOfLines={1}>
                {paymentConfig.label}
              </Text>
            </XStack>
          </YStack>

          {/* Order Type Badge */}
          <YStack width={COL_WIDTHS.type} alignItems="center">
            <XStack
              backgroundColor={`${orderTypeConfig.color}20`}
              paddingHorizontal={6}
              paddingVertical={2}
              borderRadius="$1"
              alignItems="center"
              gap={3}
              maxWidth="100%"
            >
              <YStack width={4} height={4} borderRadius={2} backgroundColor={orderTypeConfig.color} flexShrink={0} />
              <Text fontSize={9} color={orderTypeConfig.color} fontWeight="500" numberOfLines={1}>
                {orderTypeConfig.label}
              </Text>
            </XStack>
          </YStack>

          {/* Handled By */}
          <YStack width={COL_WIDTHS.handledBy}>
            <Text fontSize={10} color="#6B7280" numberOfLines={1}>{handledBy}</Text>
          </YStack>
        </>
      )}

      {/* Actions */}
      <YStack width={COL_WIDTHS.actions} alignItems="center">
        <XStack gap="$1">
          <YStack
            padding={5}
            borderRadius="$1"
            backgroundColor="#F3F4F6"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#3B82F620' }}
            onPress={(e: any) => { e.stopPropagation(); onView(); }}
          >
            <Eye size={12} color="#3B82F6" />
          </YStack>
          <YStack
            padding={5}
            borderRadius="$1"
            backgroundColor="#F3F4F6"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#6B728020' }}
            onPress={(e: any) => { e.stopPropagation(); onEdit(); }}
          >
            <Pencil size={12} color="#6B7280" />
          </YStack>
        </XStack>
      </YStack>
    </XStack>
  );
}

export default function OrderListScreen({ navigation }: OrderScreenProps<'OrderList'>) {
  const { settings } = useSettingsStore();
  const { loadOrder } = useCartStore();
  const { isDesktop, isTablet } = usePlatform();
  const screenWidth = Dimensions.get('window').width;

  // State
  const [screenMode, setScreenMode] = useState<'orders' | 'tracking'>('orders');
  const [filters, setFilters] = useState<OrderFiltersInlineState>(DEFAULT_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });
  // viewMode removed - using table view only
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  // Filter dropdown state (must be declared before early returns)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Compute effective date range for stats - period selector is the primary control
  // Dropdown filter ('all' means use period selector, other values override)
  const effectiveDateRange = useMemo((): 'today' | 'yesterday' | 'week' | 'month' | 'all' => {
    // If dropdown has a specific date filter set, use that for stats
    if (filters.dateRange !== 'all') {
      return filters.dateRange as 'today' | 'yesterday' | 'week' | 'month';
    }
    // Otherwise, use the period selector (today/week/month buttons)
    return period;
  }, [filters.dateRange, period]);

  // Build backend query params from filters and period
  const queryParams = useMemo(() => ({
    limit: 100,
    dateRange: effectiveDateRange,
    status: filters.status !== 'all' ? filters.status : undefined,
    paymentMethod: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
    orderType: filters.orderType !== 'all' ? filters.orderType : undefined,
    search: filters.search || undefined,
  }), [filters, effectiveDateRange]);

  // Queries - use backend filtering
  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
    error
  } = useOrders(queryParams);

  // Use backend stats with effective date range filter (dropdown takes priority)
  const { data: backendStats, refetch: refetchStats } = useOrderStats(effectiveDateRange);

  const updateOrderMutation = useUpdateOrder();
  const refundOrderMutation = useRefundOrder();
  const exchangeOrderMutation = useExchangeOrder();

  const orders = ordersData ?? [];

  // Client-side filtering and sorting
  // Amount filter not supported on backend, plus sorting
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Amount filter (client-side only)
    if (filters.amountRange !== 'all') {
      result = result.filter((o: typeof orders[number]) => {
        const total = o.payment?.total || o.total || 0;
        switch (filters.amountRange) {
          case 'under25': return total < 25;
          case '25to50': return total >= 25 && total < 50;
          case '50to100': return total >= 50 && total < 100;
          case 'over100': return total >= 100;
          default: return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.field) {
        case 'orderId':
          aValue = formatOrderNumber(a).toLowerCase();
          bValue = formatOrderNumber(b).toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'customer':
          aValue = (a.customer?.name || a.guestName || 'Walk-in').toLowerCase();
          bValue = (b.customer?.name || b.guestName || 'Walk-in').toLowerCase();
          break;
        case 'items':
          aValue = a.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
          bValue = b.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
          break;
        case 'total':
          aValue = a.payment?.total || a.total || 0;
          bValue = b.payment?.total || b.total || 0;
          break;
        case 'status':
          aValue = (a.status || 'completed').toLowerCase();
          bValue = (b.status || 'completed').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, filters.amountRange, sortConfig]);

  // Use backend stats for KPIs, with client-side fallback
  // Note: Backend stats are now filtered by the selected period (today/week/month)
  const orderStats = useMemo(() => {
    // Use backend stats if available
    if (backendStats) {
      // Use period-filtered values (totalOrders, ordersByStatus) not "today" values
      return {
        todayOrders: backendStats.totalOrders ?? 0, // Total orders in selected period
        revenue: backendStats.totalRevenue ?? 0,    // Revenue in selected period
        completed: backendStats.ordersByStatus?.completed ?? 0, // Completed in selected period
        pending: backendStats.pendingOrders ?? (backendStats.openOrders ?? 0),
        avgOrder: backendStats.averageOrderValue ?? 0,
        cancelled: backendStats.cancelledOrders ?? 0,
      };
    }

    // Fallback to client-side calculation
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayOrders = orders.filter((o: typeof orders[number]) => new Date(o.createdAt) >= today);
    const completedOrders = todayOrders.filter(
      (o: typeof orders[number]) => (o.status || 'completed').toLowerCase() === 'completed'
    );

    const totalRevenue = completedOrders.reduce((sum: number, o: typeof orders[number]) => {
      const payment = o.payment || { total: o.total || 0 };
      return sum + (payment.total || 0);
    }, 0);

    const pendingOrders = todayOrders.filter(
      (o: typeof orders[number]) => ['pending', 'processing', 'open'].includes((o.status || '').toLowerCase())
    ).length;

    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const cancelledRefunded = todayOrders.filter(
      (o: typeof orders[number]) => ['cancelled', 'refunded', 'voided'].includes((o.status || '').toLowerCase())
    ).length;

    return {
      todayOrders: todayOrders.length,
      revenue: totalRevenue,
      completed: completedOrders.length,
      pending: pendingOrders,
      avgOrder: avgOrderValue,
      cancelled: cancelledRefunded,
    };
  }, [orders, backendStats]);

  // Handlers
  const handleViewOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setDetailDrawerOpen(true);
  }, []);

  const handleSort = useCallback((field: OrderSortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleStatusChange = useCallback(async (status: OrderStatus) => {
    if (selectedOrder) {
      try {
        await updateOrderMutation.mutateAsync({
          id: selectedOrder.id,
          data: { status: status as Order['status'] },
        });
        refetch();
      } catch (error) {
        console.error('Failed to update order status:', error);
      }
    }
  }, [selectedOrder, updateOrderMutation, refetch]);

  const handleExchangeRefund = useCallback(async (data: ExchangeRefundRequest) => {
    try {
      if (data.mode === 'exchange') {
        await exchangeOrderMutation.mutateAsync({
          id: data.orderId,
          data: {
            returnItems: data.returnItems,
            exchangeItems: data.exchangeItems,
            refundAmount: data.refundAmount,
            additionalPayment: data.additionalPayment,
            reason: data.reason,
            notes: data.notes,
            destination: data.destination,
          },
        });
      } else {
        await refundOrderMutation.mutateAsync({
          id: data.orderId,
          data: { amount: data.refundAmount },
        });
      }
      setRefundModalOpen(false);
      setDetailDrawerOpen(false);
      refetch();
    } catch (error) {
      throw error;
    }
  }, [refundOrderMutation, exchangeOrderMutation, refetch]);

  const handlePrint = useCallback(() => {
    console.log('Print order:', selectedOrder?.id);
  }, [selectedOrder]);

  const handleAddPayment = useCallback(() => {
    if (selectedOrder) {
      setDetailDrawerOpen(false);
      navigation.navigate('Payment', { orderId: selectedOrder.id });
    }
  }, [selectedOrder, navigation]);

  const handleEditOrder = useCallback(() => {
    if (selectedOrder) {
      loadOrder(selectedOrder);
      setDetailDrawerOpen(false);
      navigation.getParent()?.navigate('POS');
    }
  }, [selectedOrder, loadOrder, navigation]);

  const showDesktopLayout = isDesktop || isTablet;

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text color="$colorSecondary" marginTop="$2">Loading orders...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap="$3">
        <Text color="$error">Failed to load orders</Text>
        <Button variant="secondary" onPress={() => refetch()}>
          <RefreshCw size={18} />
          <Text>Retry</Text>
        </Button>
      </YStack>
    );
  }

  // Status filter options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'open', label: 'Open' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  // Payment filter options
  const paymentOptions = [
    { value: 'all', label: 'All Payments' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'mobile', label: 'Mobile' },
  ];

  // Order type filter options
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'walk_in', label: 'Walk-in' },
    { value: 'phone', label: 'Phone' },
    { value: 'online', label: 'Online' },
    { value: 'delivery', label: 'Delivery' },
  ];

  // Date range filter options
  const dateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  // Amount range filter options
  const amountOptions = [
    { value: 'all', label: 'Any Amount' },
    { value: 'under25', label: 'Under $25' },
    { value: '25to50', label: '$25 - $50' },
    { value: '50to100', label: '$50 - $100' },
    { value: 'over100', label: 'Over $100' },
  ];

  const hasActiveFilters = filters.search !== '' || filters.status !== 'all' ||
    filters.paymentMethod !== 'all' || filters.orderType !== 'all' ||
    filters.dateRange !== 'all' || filters.amountRange !== 'all';

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Compact Header with integrated search & filters */}
      <YStack backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack padding="$3" gap="$3" alignItems="center">
          {/* Left: Icon + Title */}
          <XStack alignItems="center" gap="$2" flexShrink={0}>
            <YStack
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor={screenMode === 'tracking' ? '#10B981' : COLORS.primary}
              alignItems="center"
              justifyContent="center"
            >
              {screenMode === 'tracking' ? (
                <Truck size={18} color="white" />
              ) : (
                <ShoppingBag size={18} color="white" />
              )}
            </YStack>
            <YStack>
              <Text fontSize="$4" fontWeight="bold" color="$color">
                {screenMode === 'tracking' ? 'Delivery Tracking' : 'Orders'}
              </Text>
              {screenMode === 'orders' && (
                <Text fontSize={10} color="$colorSecondary">{filteredOrders.length} found</Text>
              )}
            </YStack>
          </XStack>

          {/* Center: Search + Filters - Only show when not in delivery tracking mode */}
          {screenMode === 'orders' ? (
          <XStack flex={1} gap="$1.5" alignItems="center" flexWrap="nowrap">
            {/* Search Input */}
            <XStack
              flex={1}
              minWidth={140}
              maxWidth={220}
              backgroundColor="white"
              borderRadius="$2"
              borderWidth={1}
              borderColor={filters.search ? COLORS.primary : '#E5E7EB'}
              paddingHorizontal="$2"
              paddingVertical="$1"
              alignItems="center"
              gap="$1.5"
              height={30}
            >
              <Search size={14} color={filters.search ? COLORS.primary : '#9CA3AF'} />
              <Input
                flex={1}
                value={filters.search}
                onChangeText={(text) => setFilters({ ...filters, search: text })}
                placeholder="Search orders..."
                borderWidth={0}
                backgroundColor="transparent"
                fontSize={12}
                paddingHorizontal={0}
                paddingVertical={0}
                height={22}
                placeholderTextColor="#9CA3AF"
              />
              {filters.search ? (
                <YStack padding={2} cursor="pointer" onPress={() => setFilters({ ...filters, search: '' })}>
                  <X size={12} color="#9CA3AF" />
                </YStack>
              ) : null}
            </XStack>

            {/* Status Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.status !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              >
                <ShoppingBag size={12} color={filters.status !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {statusOptions.find(o => o.value === filters.status)?.label || 'All Status'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'status' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={120} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {statusOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.status === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, status: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Payment Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.paymentMethod !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'payment' ? null : 'payment')}
              >
                <CreditCard size={12} color={filters.paymentMethod !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {paymentOptions.find(o => o.value === filters.paymentMethod)?.label || 'Payment'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'payment' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={110} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {paymentOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.paymentMethod === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, paymentMethod: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Type Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.orderType !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
              >
                <Store size={12} color={filters.orderType !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {typeOptions.find(o => o.value === filters.orderType)?.label || 'Type'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'type' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={100} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {typeOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.orderType === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, orderType: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Date Range Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.dateRange !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
              >
                <Calendar size={12} color={filters.dateRange !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {dateOptions.find(o => o.value === filters.dateRange)?.label || 'Date'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'date' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={100} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {dateOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.dateRange === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, dateRange: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Amount Range Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.amountRange !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'amount' ? null : 'amount')}
              >
                <DollarSign size={12} color={filters.amountRange !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {amountOptions.find(o => o.value === filters.amountRange)?.label || 'Amount'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'amount' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={100} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {amountOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.amountRange === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, amountRange: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Reset button */}
            {hasActiveFilters && (
              <XStack
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                backgroundColor="#FEE2E2"
                cursor="pointer"
                alignItems="center"
                gap="$1"
                height={30}
                onPress={() => setFilters({ ...filters, search: '', status: 'all', paymentMethod: 'all', orderType: 'all', dateRange: 'all', amountRange: 'all', staffId: null })}
              >
                <RotateCcw size={12} color={COLORS.error} />
                <Text fontSize={11} color={COLORS.error} fontWeight="500">Reset</Text>
              </XStack>
            )}
          </XStack>
          ) : (
            /* Empty spacer when in delivery tracking mode */
            <XStack flex={1} />
          )}

          {/* Right: Period selector + Icons */}
          <XStack gap="$2" alignItems="center" flexShrink={0}>
            {/* Period selector - Only show in orders list mode */}
            {screenMode === 'orders' && (
              <XStack gap="$1" alignItems="center" backgroundColor="#F3F4F6" borderRadius="$2" padding="$1">
                {(['today', 'week', 'month'] as const).map((p) => (
                  <Text
                    key={p}
                    fontSize={11}
                    fontWeight={period === p ? '600' : '400'}
                    color={period === p ? 'white' : '#6B7280'}
                    cursor="pointer"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$1"
                    backgroundColor={period === p ? COLORS.primary : 'transparent'}
                    onPress={() => setPeriod(p)}
                  >
                    {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
                  </Text>
                ))}
              </XStack>
            )}

            {/* Order Tracking Toggle */}
            <YStack
              padding="$1.5"
              borderRadius="$2"
              backgroundColor={screenMode === 'tracking' ? COLORS.primary : '#F3F4F6'}
              cursor="pointer"
              hoverStyle={{ opacity: 0.8 }}
              onPress={() => setScreenMode(screenMode === 'orders' ? 'tracking' : 'orders')}
            >
              <Truck size={16} color={screenMode === 'tracking' ? 'white' : '#6B7280'} />
            </YStack>

            {/* Refresh button */}
            <YStack
              padding="$1.5"
              borderRadius="$2"
              backgroundColor="#F3F4F6"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#E5E7EB' }}
              onPress={() => refetch()}
            >
              <RefreshCw size={16} color={isRefetching ? COLORS.primary : '#6B7280'} />
            </YStack>
          </XStack>
        </XStack>

        {/* Compact KPIs Row - Clickable to filter */}
        {screenMode === 'orders' && (
          <XStack paddingHorizontal="$3" paddingBottom="$2" gap="$2" flexWrap="wrap">
            {/* Orders */}
            <XStack
              flex={1}
              minWidth={100}
              padding="$2"
              borderRadius="$2"
              backgroundColor={filters.status === 'all' ? STAT_COLORS.todayOrders.bg : '#F9FAFB'}
              borderWidth={filters.status === 'all' ? 2 : 1}
              borderColor={filters.status === 'all' ? STAT_COLORS.todayOrders.icon : '#E5E7EB'}
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
              alignItems="center"
              gap="$2"
              onPress={() => setFilters({ ...filters, status: 'all' })}
            >
              <ShoppingBag size={14} color={STAT_COLORS.todayOrders.icon} />
              <YStack>
                <Text fontSize={9} color={STAT_COLORS.todayOrders.icon} fontWeight="600">{effectiveDateRange === 'today' ? 'TODAY' : effectiveDateRange === 'yesterday' ? 'YESTERDAY' : effectiveDateRange === 'week' ? 'WEEK' : effectiveDateRange === 'month' ? 'MONTH' : 'ALL TIME'}</Text>
                <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.todayOrders.icon}>{orderStats.todayOrders}</Text>
              </YStack>
            </XStack>

            {/* Revenue */}
            <XStack flex={1} minWidth={120} padding="$2" borderRadius="$2" backgroundColor={STAT_COLORS.revenue.bg} borderWidth={1} borderColor={STAT_COLORS.revenue.border} alignItems="center" gap="$2">
              <DollarSign size={14} color={STAT_COLORS.revenue.icon} />
              <YStack>
                <Text fontSize={9} color={STAT_COLORS.revenue.icon} fontWeight="600">REVENUE</Text>
                <Text fontSize={14} fontWeight="bold" color={STAT_COLORS.revenue.icon}>{formatCurrency(orderStats.revenue, settings.currency)}</Text>
              </YStack>
            </XStack>

            {/* Completed */}
            <XStack
              flex={1}
              minWidth={90}
              padding="$2"
              borderRadius="$2"
              backgroundColor={filters.status === 'completed' ? STAT_COLORS.completed.bg : '#F9FAFB'}
              borderWidth={filters.status === 'completed' ? 2 : 1}
              borderColor={filters.status === 'completed' ? STAT_COLORS.completed.icon : '#E5E7EB'}
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
              alignItems="center"
              gap="$2"
              onPress={() => setFilters({ ...filters, status: filters.status === 'completed' ? 'all' : 'completed' })}
            >
              <CheckCircle size={14} color={STAT_COLORS.completed.icon} />
              <YStack>
                <Text fontSize={9} color={STAT_COLORS.completed.icon} fontWeight="600">COMPLETED</Text>
                <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.completed.icon}>{orderStats.completed}</Text>
              </YStack>
            </XStack>

            {/* Pending */}
            <XStack
              flex={1}
              minWidth={80}
              padding="$2"
              borderRadius="$2"
              backgroundColor={filters.status === 'pending' ? STAT_COLORS.pending.bg : '#F9FAFB'}
              borderWidth={filters.status === 'pending' ? 2 : 1}
              borderColor={filters.status === 'pending' ? STAT_COLORS.pending.icon : '#E5E7EB'}
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
              alignItems="center"
              gap="$2"
              onPress={() => setFilters({ ...filters, status: filters.status === 'pending' ? 'all' : 'pending' })}
            >
              <Clock size={14} color={STAT_COLORS.pending.icon} />
              <YStack>
                <Text fontSize={9} color={STAT_COLORS.pending.icon} fontWeight="600">PENDING</Text>
                <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.pending.icon}>{orderStats.pending}</Text>
              </YStack>
            </XStack>

            {/* Avg Order - Desktop only */}
            {showDesktopLayout && (
              <XStack flex={1} minWidth={100} padding="$2" borderRadius="$2" backgroundColor={STAT_COLORS.avgOrder.bg} borderWidth={1} borderColor={STAT_COLORS.avgOrder.border} alignItems="center" gap="$2">
                <TrendingUp size={14} color={STAT_COLORS.avgOrder.icon} />
                <YStack>
                  <Text fontSize={9} color={STAT_COLORS.avgOrder.icon} fontWeight="600">AVG ORDER</Text>
                  <Text fontSize={14} fontWeight="bold" color={STAT_COLORS.avgOrder.icon}>{formatCurrency(orderStats.avgOrder, settings.currency)}</Text>
                </YStack>
              </XStack>
            )}

            {/* Cancelled - Desktop only */}
            {showDesktopLayout && (
              <XStack
                flex={1}
                minWidth={80}
                padding="$2"
                borderRadius="$2"
                backgroundColor={filters.status === 'cancelled' ? STAT_COLORS.cancelled.bg : '#F9FAFB'}
                borderWidth={filters.status === 'cancelled' ? 2 : 1}
                borderColor={filters.status === 'cancelled' ? STAT_COLORS.cancelled.icon : '#E5E7EB'}
                cursor="pointer"
                hoverStyle={{ opacity: 0.9 }}
                alignItems="center"
                gap="$2"
                onPress={() => setFilters({ ...filters, status: filters.status === 'cancelled' ? 'all' : 'cancelled' })}
              >
                <XCircle size={14} color={STAT_COLORS.cancelled.icon} />
                <YStack>
                  <Text fontSize={9} color={STAT_COLORS.cancelled.icon} fontWeight="600">CANCELLED</Text>
                  <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.cancelled.icon}>{orderStats.cancelled}</Text>
                </YStack>
              </XStack>
            )}
          </XStack>
        )}
      </YStack>

      {/* Tracking Screen Mode */}
      {screenMode === 'tracking' ? (
        <OrderTrackingScreen onBack={() => setScreenMode('orders')} />
      ) : (
        <>
          {/* Order List */}
          <YStack flex={1} backgroundColor="$cardBackground">
            <TableHeader isDesktop={showDesktopLayout} sortConfig={sortConfig} onSort={handleSort} />

            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#3B82F6']} />
              }
              renderItem={({ item }) => (
                <TableRow
                  order={item}
                  isDesktop={showDesktopLayout}
                  currency={settings.currency}
                  onView={() => handleViewOrder(item)}
                  onEdit={() => navigation.navigate('OrderDetail', { id: item.id })}
                />
              )}
              ListEmptyComponent={
                <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
                  <ShoppingBag size={48} color="$colorSecondary" />
                  <Text color="$colorSecondary" marginTop="$3" fontSize="$4">
                    {filters.search || filters.status !== 'all' ? 'No orders match your filters' : 'No orders found'}
                  </Text>
                  {(filters.search || filters.status !== 'all') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      marginTop="$3"
                      onPress={() => setFilters(DEFAULT_FILTERS)}
                    >
                      Clear Filters
                    </Button>
                  )}
                </YStack>
              }
            />
          </YStack>
        </>
      )}

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onEdit={() => {
          setDetailDrawerOpen(false);
          if (selectedOrder) {
            navigation.navigate('OrderDetail', { id: selectedOrder.id });
          }
        }}
        onPrint={handlePrint}
        onRefund={() => setRefundModalOpen(true)}
        onExchange={() => setRefundModalOpen(true)}
        onAddPayment={handleAddPayment}
        onEditOrder={handleEditOrder}
        currency={settings.currency}
      />

      {/* Exchange & Refund Modal */}
      <ExchangeRefundModal
        order={selectedOrder}
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onProcess={handleExchangeRefund}
        currency={settings.currency}
        isLoading={refundOrderMutation.isPending || exchangeOrderMutation.isPending}
      />
    </YStack>
  );
}
