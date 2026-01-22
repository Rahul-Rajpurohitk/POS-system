/**
 * OrderListScreen - Enhanced order management with filtering, search, and multiple views
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, RefreshCw, ChevronRight, Eye, Pencil, ShoppingBag,
  Clock, CheckCircle, XCircle, DollarSign, TrendingUp, Calendar,
  LayoutGrid, List, Filter,
} from '@tamagui/lucide-icons';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { useSettingsStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useOrders, useUpdateOrder, useRefundOrder } from '@/features/orders/hooks';
import type { OrderScreenProps } from '@/navigation/types';
import type { Order, Currency } from '@/types';

// Import new components
import {
  OrderStatsCards,
  OrderSearchBar,
  OrderFilterPanel,
  OrderListCard,
  OrderDetailDrawer,
  RefundModal,
  OrderStatusBadge,
  type OrderFilters,
  type OrderStatus,
  type StatType,
  type TimePeriod,
  type RefundRequest,
} from '@/components/order';

// Default filters
const DEFAULT_FILTERS: OrderFilters = {
  status: [],
  dateRange: 'all',
  paymentMethod: 'all',
  amountRange: 'any',
  customerType: 'all',
};

// Helper to get badge variant from order status
const getStatusBadgeVariant = (status?: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'pending':
    case 'processing':
      return 'warning';
    case 'cancelled':
    case 'refunded':
      return 'error';
    default:
      return 'default';
  }
};

// Compact date formatter - e.g., "Jan 22, 2:30p"
function formatCompactDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p' : 'a';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${hours}:${mins}${ampm}`;
}

// Format order number to industry standard - ORD-XXXXX
function formatOrderNumber(order: Order): string {
  if (order.number?.startsWith('ORD-')) return order.number;
  if (order.orderNumber?.startsWith('ORD-')) return order.orderNumber;
  // Use last 5 chars of ID, padded
  const idPart = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase().padStart(5, '0');
  return `ORD-${idPart}`;
}

// Table header component - Properly aligned columns
function TableHeader({ isDesktop }: { isDesktop: boolean }) {
  return (
    <XStack
      backgroundColor="#F9FAFB"
      paddingVertical="$2.5"
      paddingHorizontal="$4"
      borderBottomWidth={1}
      borderBottomColor="#E5E7EB"
    >
      <Text width={110} fontSize={12} fontWeight="600" color="#6B7280">Order ID</Text>
      <Text width={100} fontSize={12} fontWeight="600" color="#6B7280">Date</Text>
      <Text flex={1} minWidth={120} fontSize={12} fontWeight="600" color="#6B7280">Customer</Text>
      {isDesktop && (
        <Text width={60} fontSize={12} fontWeight="600" color="#6B7280" textAlign="center">Items</Text>
      )}
      <Text width={90} fontSize={12} fontWeight="600" color="#6B7280" textAlign="right">Total</Text>
      {isDesktop && (
        <Text width={100} fontSize={12} fontWeight="600" color="#6B7280">Handled By</Text>
      )}
      <Text width={100} fontSize={12} fontWeight="600" color="#6B7280" textAlign="center">Status</Text>
      <Text width={70} fontSize={12} fontWeight="600" color="#6B7280" textAlign="center">Actions</Text>
    </XStack>
  );
}

// Table row component - Properly aligned with staff info
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
  const orderNumber = formatOrderNumber(order);
  const payment = order.payment || { subTotal: order.subTotal || 0, discount: order.discount || 0, total: order.total || 0 };
  const customerName = order.customer?.name || order.guestName || 'Walk-in';
  const itemCount = order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
  const status = (order.status || 'completed') as OrderStatus;
  // Get staff name from order - fallback to 'Staff' if not available
  const handledBy = (order as any).handledBy?.name || (order as any).staffName || (order as any).createdBy?.name || 'Staff';

  return (
    <XStack
      paddingVertical="$3"
      paddingHorizontal="$4"
      borderBottomWidth={1}
      borderBottomColor="#E5E7EB"
      backgroundColor="white"
      alignItems="center"
      cursor="pointer"
      hoverStyle={{ backgroundColor: '#F9FAFB' }}
      pressStyle={{ backgroundColor: '#F3F4F6' }}
      onPress={onView}
    >
      {/* Order ID - Blue, clickable look */}
      <Text width={110} fontSize={13} fontWeight="600" color="#3B82F6">
        {orderNumber}
      </Text>

      {/* Date - Compact format */}
      <Text width={100} fontSize={12} color="#6B7280">
        {formatCompactDate(order.createdAt)}
      </Text>

      {/* Customer */}
      <YStack flex={1} minWidth={120}>
        <Text fontSize={13} color="#111827" numberOfLines={1}>{customerName}</Text>
        {!isDesktop && (
          <Text fontSize={11} color="#9CA3AF">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        )}
      </YStack>

      {/* Items count */}
      {isDesktop && (
        <Text width={60} fontSize={13} textAlign="center" color="#6B7280">
          {itemCount}
        </Text>
      )}

      {/* Total */}
      <Text width={90} fontSize={13} fontWeight="600" color="#111827" textAlign="right">
        {formatCurrency(payment.total, currency)}
      </Text>

      {/* Handled By - Staff name */}
      {isDesktop && (
        <Text width={100} fontSize={12} color="#6B7280" numberOfLines={1}>
          {handledBy}
        </Text>
      )}

      {/* Status Badge */}
      <XStack width={100} justifyContent="center">
        <OrderStatusBadge status={status} size="sm" pulse={status === 'pending'} />
      </XStack>

      {/* Actions */}
      <XStack width={70} justifyContent="center" gap="$1.5">
        <YStack
          padding="$1.5"
          borderRadius={6}
          backgroundColor="#F3F4F6"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '#DBEAFE' }}
          onPress={(e: any) => { e.stopPropagation(); onView(); }}
        >
          <Eye size={14} color="#3B82F6" />
        </YStack>
        <YStack
          padding="$1.5"
          borderRadius={6}
          backgroundColor="#F3F4F6"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '#E5E7EB' }}
          onPress={(e: any) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil size={14} color="#6B7280" />
        </YStack>
      </XStack>
    </XStack>
  );
}

export default function OrderListScreen({ navigation }: OrderScreenProps<'OrderList'>) {
  const { settings } = useSettingsStore();
  const { isDesktop, isTablet } = usePlatform();
  const screenWidth = Dimensions.get('window').width;

  // State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Queries
  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
    error
  } = useOrders({ limit: 100 });

  const updateOrderMutation = useUpdateOrder();
  const refundOrderMutation = useRefundOrder();

  const orders = ordersData ?? [];

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      result = result.filter((o: typeof orders[number]) =>
        (o.number || o.orderNumber || '').toLowerCase().includes(query) ||
        (o.customer?.name || '').toLowerCase().includes(query) ||
        (o.guestName || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((o: typeof orders[number]) =>
        filters.status.includes((o.status || 'completed') as OrderStatus)
      );
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter((o: typeof orders[number]) => {
        const orderDate = new Date(o.createdAt);
        switch (filters.dateRange) {
          case 'today':
            return orderDate >= today;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return orderDate >= yesterday && orderDate < today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Amount filter
    if (filters.amountRange !== 'any') {
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

    // Customer type filter
    if (filters.customerType !== 'all') {
      result = result.filter((o: typeof orders[number]) => {
        const hasCustomer = !!o.customer;
        return filters.customerType === 'registered' ? hasCustomer : !hasCustomer;
      });
    }

    return result;
  }, [orders, search, filters]);

  // Calculate order stats
  const orderStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayOrders = orders.filter((o: typeof orders[number]) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= today;
    });

    const totalRevenue = todayOrders.reduce((sum: number, o: typeof orders[number]) => {
      const payment = o.payment || { total: o.total || 0 };
      return sum + (payment.total || 0);
    }, 0);

    const completedOrders = todayOrders.filter(
      (o: typeof orders[number]) => (o.status || 'completed').toLowerCase() === 'completed'
    ).length;

    const pendingOrders = todayOrders.filter(
      (o: typeof orders[number]) => ['pending', 'processing'].includes((o.status || '').toLowerCase())
    ).length;

    return {
      today: { value: todayOrders.length, previousValue: Math.floor(todayOrders.length * 0.9) },
      revenue: { value: totalRevenue, previousValue: totalRevenue * 0.92 },
      completed: { value: completedOrders, previousValue: Math.floor(completedOrders * 0.95) },
      pending: { value: pendingOrders },
    };
  }, [orders]);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    if (query && !recentSearches.includes(query)) {
      setRecentSearches((prev) => [query, ...prev].slice(0, 5));
    }
  }, [recentSearches]);

  const handleStatClick = useCallback((statType: StatType) => {
    switch (statType) {
      case 'pending':
        setFilters((prev) => ({ ...prev, status: ['pending', 'processing'] }));
        break;
      case 'completed':
        setFilters((prev) => ({ ...prev, status: ['completed'] }));
        break;
      case 'today':
        setFilters((prev) => ({ ...prev, dateRange: 'today' }));
        break;
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setDetailDrawerOpen(true);
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

  const handleRefund = useCallback(async (refundData: RefundRequest) => {
    try {
      await refundOrderMutation.mutateAsync({
        id: refundData.orderId,
        data: refundData,
      });
      setRefundModalOpen(false);
      setDetailDrawerOpen(false);
      refetch();
    } catch (error) {
      throw error;
    }
  }, [refundOrderMutation, refetch]);

  const handlePrint = useCallback(() => {
    // TODO: Implement print functionality
    console.log('Print order:', selectedOrder?.id);
  }, [selectedOrder]);

  // Determine layout
  const showDesktopLayout = isDesktop || isTablet;
  const useCardView = viewMode === 'card' || (!showDesktopLayout && screenWidth < 768);

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

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack
          padding="$4"
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap="$3">
            <YStack
              width={48}
              height={48}
              borderRadius={24}
              backgroundColor="#3B82F6"
              alignItems="center"
              justifyContent="center"
            >
              <ShoppingBag size={24} color="white" />
            </YStack>
            <YStack>
              <Text fontSize="$6" fontWeight="bold" color="$color">Orders</Text>
              <Text fontSize="$2" color="$colorSecondary">
                {filteredOrders.length} orders {search || filters.status.length > 0 ? '(filtered)' : ''}
              </Text>
            </YStack>
          </XStack>
          <XStack gap="$2" alignItems="center">
            {/* View mode toggle */}
            {showDesktopLayout && (
              <XStack
                borderRadius="$2"
                borderWidth={1}
                borderColor="$borderColor"
                overflow="hidden"
              >
                <YStack
                  padding="$2"
                  backgroundColor={viewMode === 'table' ? '#3B82F620' : 'transparent'}
                  cursor="pointer"
                  onPress={() => setViewMode('table')}
                >
                  <List size={18} color={viewMode === 'table' ? '#3B82F6' : '$colorSecondary'} />
                </YStack>
                <YStack
                  padding="$2"
                  backgroundColor={viewMode === 'card' ? '#3B82F620' : 'transparent'}
                  cursor="pointer"
                  onPress={() => setViewMode('card')}
                >
                  <LayoutGrid size={18} color={viewMode === 'card' ? '#3B82F6' : '$colorSecondary'} />
                </YStack>
              </XStack>
            )}
            <YStack
              padding="$2"
              borderRadius="$2"
              backgroundColor="$backgroundHover"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#3B82F620' }}
              pressStyle={{ transform: [{ scale: 0.95 }] }}
              onPress={() => refetch()}
            >
              <RefreshCw size={20} color={isRefetching ? '#3B82F6' : '$colorSecondary'} />
            </YStack>
          </XStack>
        </XStack>

        {/* Stats Cards */}
        <YStack paddingHorizontal="$4" paddingBottom="$4">
          <OrderStatsCards
            stats={orderStats}
            currency={settings.currency}
            period={period}
            onStatClick={handleStatClick}
            onPeriodChange={setPeriod}
          />
        </YStack>
      </YStack>

      {/* Search Bar */}
      <YStack padding="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <OrderSearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search by order #, customer name..."
          recentSearches={recentSearches}
          onClearRecent={() => setRecentSearches([])}
          onSelectRecent={(query) => setSearch(query)}
        />
      </YStack>

      {/* Filter Panel */}
      <OrderFilterPanel
        filters={filters}
        onChange={setFilters}
        onClearAll={handleClearFilters}
        expanded={filtersExpanded}
        onToggleExpand={() => setFiltersExpanded(!filtersExpanded)}
      />

      {/* Order List */}
      <YStack flex={1} backgroundColor={useCardView ? '$background' : '$cardBackground'}>
        {!useCardView && <TableHeader isDesktop={showDesktopLayout} />}

        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={useCardView ? { padding: 16 } : undefined}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#3B82F6']} />
          }
          renderItem={({ item }) =>
            useCardView ? (
              <OrderListCard
                order={item}
                currency={settings.currency}
                onView={() => handleViewOrder(item)}
                onEdit={() => navigation.navigate('OrderDetail', { id: item.id })}
                onPrint={handlePrint}
                onMore={() => handleViewOrder(item)}
              />
            ) : (
              <TableRow
                order={item}
                isDesktop={showDesktopLayout}
                currency={settings.currency}
                onView={() => handleViewOrder(item)}
                onEdit={() => navigation.navigate('OrderDetail', { id: item.id })}
              />
            )
          }
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <ShoppingBag size={48} color="$colorSecondary" />
              <Text color="$colorSecondary" marginTop="$3" fontSize="$4">
                {search || filters.status.length > 0 ? 'No orders match your filters' : 'No orders found'}
              </Text>
              {(search || filters.status.length > 0) && (
                <Button
                  variant="secondary"
                  size="sm"
                  marginTop="$3"
                  onPress={() => {
                    setSearch('');
                    handleClearFilters();
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </YStack>
          }
        />
      </YStack>

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
        onRefund={() => {
          setRefundModalOpen(true);
        }}
        currency={settings.currency}
      />

      {/* Refund Modal */}
      <RefundModal
        order={selectedOrder}
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onRefund={handleRefund}
        currency={settings.currency}
        isLoading={refundOrderMutation.isPending}
      />
    </YStack>
  );
}
