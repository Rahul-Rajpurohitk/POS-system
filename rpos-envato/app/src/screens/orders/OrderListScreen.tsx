import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, RefreshCw, ChevronRight, Eye, Pencil, ShoppingBag,
  Clock, CheckCircle, XCircle, DollarSign, TrendingUp, Calendar,
} from '@tamagui/lucide-icons';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { useSettingsStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useOrders } from '@/features/orders/hooks';
import type { OrderScreenProps } from '@/navigation/types';
import type { Order } from '@/types';

// Status colors
const STATUS_COLORS = {
  completed: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: CheckCircle },
  pending: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D', icon: Clock },
  processing: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD', icon: Clock },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', icon: XCircle },
  refunded: { bg: '#F3E8FF', text: '#7C3AED', border: '#C4B5FD', icon: XCircle },
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

// Helper to format status text
const formatStatus = (status?: string): string => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

// Table header component
function TableHeader({ isDesktop }: { isDesktop: boolean }) {
  return (
    <XStack
      backgroundColor="$backgroundHover"
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Text width={100} fontSize="$2" fontWeight="600" color="$colorSecondary">Order #</Text>
      <Text flex={1} fontSize="$2" fontWeight="600" color="$colorSecondary">Customer</Text>
      {isDesktop && (
        <Text width={80} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="center">Items</Text>
      )}
      <Text width={100} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="right">Total</Text>
      <Text width={100} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="center">Status</Text>
      {isDesktop && (
        <Text width={150} fontSize="$2" fontWeight="600" color="$colorSecondary">Date</Text>
      )}
      <Text width={80} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="center">Actions</Text>
    </XStack>
  );
}

// Table row component
function TableRow({
  order,
  isDesktop,
  onView,
  onEdit
}: {
  order: Order;
  isDesktop: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  const { settings } = useSettingsStore();
  const orderNumber = order.number || order.orderNumber || `#${order.id.slice(0, 6)}`;
  const payment = order.payment || { subTotal: order.subTotal || 0, discount: order.discount || 0, total: order.total || 0 };
  const customerName = order.customer?.name || order.guestName || 'Walk-in';
  const itemCount = order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
  const status = order.status || 'completed';

  return (
    <XStack
      paddingVertical="$3"
      paddingHorizontal="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      backgroundColor="$cardBackground"
      alignItems="center"
      cursor="pointer"
      hoverStyle={{ backgroundColor: '$backgroundHover' }}
      pressStyle={{ backgroundColor: '$backgroundPress' }}
      onPress={onView}
    >
      <Text width={100} fontSize="$3" fontWeight="500" color="$accent">
        {orderNumber}
      </Text>
      <YStack flex={1}>
        <Text fontSize="$3" numberOfLines={1}>{customerName}</Text>
        {!isDesktop && (
          <Text fontSize="$2" color="$colorSecondary">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} • {formatDate(order.createdAt, 'MMM d, h:mm a')}
          </Text>
        )}
      </YStack>
      {isDesktop && (
        <Text width={80} fontSize="$3" textAlign="center" color="$colorSecondary">
          {itemCount}
        </Text>
      )}
      <Text width={100} fontSize="$3" fontWeight="600" textAlign="right">
        {formatCurrency(payment.total, settings.currency)}
      </Text>
      <XStack width={100} justifyContent="center">
        <Badge variant={getStatusBadgeVariant(status)} size="sm">
          {formatStatus(status)}
        </Badge>
      </XStack>
      {isDesktop && (
        <Text width={150} fontSize="$2" color="$colorSecondary">
          {formatDate(order.createdAt, 'MMM d, yyyy h:mm a')}
        </Text>
      )}
      <XStack width={80} justifyContent="center" gap="$2">
        <YStack
          padding="$1"
          borderRadius="$1"
          backgroundColor="$backgroundHover"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '$primary' }}
          onPress={(e: any) => { e.stopPropagation(); onView(); }}
        >
          <Eye size={16} color="$primary" />
        </YStack>
        <YStack
          padding="$1"
          borderRadius="$1"
          backgroundColor="$backgroundHover"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '$primary' }}
          onPress={(e: any) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil size={16} color="$colorSecondary" />
        </YStack>
      </XStack>
    </XStack>
  );
}

export default function OrderListScreen({ navigation }: OrderScreenProps<'OrderList'>) {
  const { settings } = useSettingsStore();
  const { isDesktop, isTablet } = usePlatform();
  const [search, setSearch] = useState('');

  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
    error
  } = useOrders({ limit: 100 });

  const orders = ordersData ?? [];

  const filtered = useMemo(() => {
    if (!search) return orders;
    const query = search.toLowerCase();
    return orders.filter((o: typeof orders[number]) =>
      (o.number || o.orderNumber || '').toLowerCase().includes(query) ||
      (o.customer?.name || '').toLowerCase().includes(query)
    );
  }, [orders, search]);

  // Calculate order stats
  const orderStats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: typeof orders[number]) => {
      const payment = o.payment || { total: o.total || 0 };
      return sum + (payment.total || 0);
    }, 0);
    const completedOrders = orders.filter((o: typeof orders[number]) => (o.status || 'completed').toLowerCase() === 'completed').length;
    const pendingOrders = orders.filter((o: typeof orders[number]) => ['pending', 'processing'].includes((o.status || '').toLowerCase())).length;
    const todayOrders = orders.filter((o: typeof orders[number]) => {
      const orderDate = new Date(o.createdAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    }).length;
    return { totalOrders, totalRevenue, completedOrders, pendingOrders, todayOrders };
  }, [orders]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
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

  const showDesktopLayout = isDesktop || isTablet;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Enhanced Header */}
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
              backgroundColor="#8B5CF6"
              alignItems="center"
              justifyContent="center"
            >
              <ShoppingBag size={24} color="white" />
            </YStack>
            <YStack>
              <Text fontSize="$6" fontWeight="bold" color="$color">Orders</Text>
              <Text fontSize="$2" color="$colorSecondary">Track & manage orders</Text>
            </YStack>
          </XStack>
          <YStack
            padding="$2"
            borderRadius="$2"
            backgroundColor="$backgroundHover"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$primary' }}
            pressStyle={{ transform: [{ scale: 0.95 }] }}
            onPress={() => refetch()}
          >
            <RefreshCw size={20} color={isRefetching ? '#8B5CF6' : '$colorSecondary'} />
          </YStack>
        </XStack>

        {/* Order Stats */}
        <XStack paddingHorizontal="$4" paddingBottom="$4" gap="$3">
          {/* Today's Orders */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor="#EEF2FF"
            borderWidth={1}
            borderColor="#C7D2FE"
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <Calendar size={16} color="#4F46E5" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color="#4F46E5" textTransform="uppercase" fontWeight="600">
                  Today
                </Text>
                <Text fontSize="$5" fontWeight="bold" color="#4F46E5">
                  {orderStats.todayOrders}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Total Revenue */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor="#ECFDF5"
            borderWidth={1}
            borderColor="#A7F3D0"
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <DollarSign size={16} color="#059669" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color="#059669" textTransform="uppercase" fontWeight="600">
                  Revenue
                </Text>
                <Text fontSize="$4" fontWeight="bold" color="#059669">
                  {formatCurrency(orderStats.totalRevenue, settings.currency)}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Completed */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor="#F0FDF4"
            borderWidth={1}
            borderColor="#BBF7D0"
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <CheckCircle size={16} color="#16A34A" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color="#16A34A" textTransform="uppercase" fontWeight="600">
                  Completed
                </Text>
                <Text fontSize="$5" fontWeight="bold" color="#16A34A">
                  {orderStats.completedOrders}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Pending */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor="#FEF3C7"
            borderWidth={1}
            borderColor="#FCD34D"
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <Clock size={16} color="#D97706" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color="#D97706" textTransform="uppercase" fontWeight="600">
                  Pending
                </Text>
                <Text fontSize="$5" fontWeight="bold" color="#D97706">
                  {orderStats.pendingOrders}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </XStack>
      </YStack>

      {/* Enhanced Search */}
      <XStack padding="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack
          flex={1}
          backgroundColor="$background"
          borderRadius="$3"
          paddingHorizontal="$4"
          paddingVertical="$2"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$2"
        >
          <Search size={18} color="#8B5CF6" />
          <Input
            flex={1}
            placeholder="Search by order # or customer..."
            value={search}
            onChangeText={setSearch}
            borderWidth={0}
            backgroundColor="transparent"
            size="$3"
          />
          {search && (
            <Text
              fontSize="$2"
              color="$colorSecondary"
              cursor="pointer"
              onPress={() => setSearch('')}
            >
              Clear
            </Text>
          )}
        </XStack>
      </XStack>

      {/* Table */}
      <YStack flex={1} backgroundColor="$cardBackground">
        <TableHeader isDesktop={showDesktopLayout} />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <TableRow
              order={item}
              isDesktop={showDesktopLayout}
              onView={() => navigation.navigate('OrderDetail', { id: item.id })}
              onEdit={() => navigation.navigate('OrderDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">
                {search ? 'No orders match your search' : 'No orders found'}
              </Text>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
