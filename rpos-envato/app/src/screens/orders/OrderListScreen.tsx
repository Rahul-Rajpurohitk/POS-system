import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Pressable, ScrollView } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { Search, RefreshCw, ChevronRight, Eye, Edit } from '@tamagui/lucide-icons';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { useSettingsStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useOrders } from '@/features/orders/hooks';
import type { OrderScreenProps } from '@/navigation/types';
import type { Order } from '@/types';

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
    <Pressable onPress={onView}>
      {({ pressed }) => (
        <XStack
          paddingVertical="$3"
          paddingHorizontal="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          backgroundColor={pressed ? '$backgroundHover' : '$cardBackground'}
          alignItems="center"
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
            <Pressable onPress={(e) => { e.stopPropagation(); onView(); }}>
              <YStack
                padding="$1"
                borderRadius="$1"
                backgroundColor="$backgroundHover"
                hoverStyle={{ backgroundColor: '$primary' }}
              >
                <Eye size={16} color="$primary" />
              </YStack>
            </Pressable>
            <Pressable onPress={(e) => { e.stopPropagation(); onEdit(); }}>
              <YStack
                padding="$1"
                borderRadius="$1"
                backgroundColor="$backgroundHover"
                hoverStyle={{ backgroundColor: '$primary' }}
              >
                <Edit size={16} color="$colorSecondary" />
              </YStack>
            </Pressable>
          </XStack>
        </XStack>
      )}
    </Pressable>
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

  const orders = ordersData?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return orders;
    const query = search.toLowerCase();
    return orders.filter(o =>
      (o.number || o.orderNumber || '').toLowerCase().includes(query) ||
      (o.customer?.name || '').toLowerCase().includes(query)
    );
  }, [orders, search]);

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
      {/* Header */}
      <XStack
        padding="$4"
        justifyContent="space-between"
        alignItems="center"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack>
          <Text fontSize="$6" fontWeight="bold">Orders</Text>
          <Text fontSize="$2" color="$colorSecondary">{filtered.length} total orders</Text>
        </YStack>
        <Button variant="ghost" size="icon" onPress={() => refetch()}>
          <RefreshCw size={20} color="$primary" />
        </Button>
      </XStack>

      {/* Search */}
      <XStack padding="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack
          flex={1}
          backgroundColor="$background"
          borderRadius="$2"
          paddingHorizontal="$3"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Search size={18} color="$placeholderColor" />
          <Input
            flex={1}
            placeholder="Search by order # or customer..."
            value={search}
            onChangeText={setSearch}
            borderWidth={0}
            backgroundColor="transparent"
            size="$3"
          />
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
