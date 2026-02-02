import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Package, RotateCcw } from '@tamagui/lucide-icons';
import { Card, Button, EmptyState } from '@/components/ui';
import { useInfiniteOrderHistory, useReorder } from '@/features/customer/hooks';
import type { CustomerTabScreenProps } from '@/navigation/types';
import type { Order, OrderStatus } from '@/types';

// Status badge colors
const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  draft: { bg: '$backgroundPress', text: '$colorSecondary' },
  open: { bg: '$warningBackground', text: '$warning' },
  pending: { bg: '$warningBackground', text: '$warning' },
  processing: { bg: '$primaryBackground', text: '$primary' },
  completed: { bg: '$successBackground', text: '$success' },
  cancelled: { bg: '$errorBackground', text: '$error' },
  refunded: { bg: '$errorBackground', text: '$error' },
  partially_refunded: { bg: '$warningBackground', text: '$warning' },
  on_hold: { bg: '$backgroundPress', text: '$colorSecondary' },
  out_for_delivery: { bg: '$primaryBackground', text: '$primary' },
  delivered: { bg: '$successBackground', text: '$success' },
};

// Order Card
function OrderCard({
  order,
  onPress,
  onReorder,
  isReordering,
}: {
  order: Order;
  onPress: () => void;
  onReorder: () => void;
  isReordering: boolean;
}) {
  const status = order.status || 'pending';
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.pending;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canReorder = ['completed', 'delivered', 'cancelled'].includes(status);

  return (
    <Card padding="$4" marginBottom="$3" marginHorizontal="$4">
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
        <YStack>
          <Text fontSize={16} fontWeight="600">
            Order #{order.number || order.id.slice(-6)}
          </Text>
          <Text fontSize={12} color="$colorSecondary" marginTop="$1">
            {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
          </Text>
        </YStack>
        <YStack
          backgroundColor={statusStyle.bg}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Text color={statusStyle.text} fontSize={11} fontWeight="600" textTransform="capitalize">
            {status.replace(/_/g, ' ')}
          </Text>
        </YStack>
      </XStack>

      {/* Items summary */}
      <Text fontSize={13} color="$colorSecondary" marginBottom="$2">
        {order.items?.length || 0} items
      </Text>

      {/* Total and actions */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="bold" color="$primary">
          ${(order.total || order.payment?.total || 0).toFixed(2)}
        </Text>

        <XStack gap="$2">
          {canReorder && (
            <Button
              size="sm"
              variant="secondary"
              onPress={onReorder}
              disabled={isReordering}
            >
              {isReordering ? (
                <Spinner size="small" />
              ) : (
                <>
                  <RotateCcw size={14} />
                  <Text marginLeft="$1">Reorder</Text>
                </>
              )}
            </Button>
          )}
          <Button size="sm" variant="ghost" onPress={onPress}>
            <Text color="$primary">Details</Text>
            <ChevronRight size={16} color="$primary" />
          </Button>
        </XStack>
      </XStack>
    </Card>
  );
}

type FilterOption = 'all' | 'active' | 'completed';

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export default function OrderHistoryScreen({
  navigation,
}: CustomerTabScreenProps<'CustomerOrders'>) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const reorder = useReorder();

  const statusFilter =
    filter === 'active'
      ? 'processing'
      : filter === 'completed'
      ? 'completed'
      : undefined;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteOrderHistory({
    limit: 20,
    status: statusFilter,
  });

  const orders = data?.pages.flat() || [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOrderPress = (order: Order) => {
    // Navigate to order tracking/details
    // navigation.navigate('OrderTracking', { orderId: order.id });
  };

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      await reorder.mutateAsync(orderId);
      // Navigate to cart after reorder
      navigation.navigate('Cart');
    } catch (err) {
      console.error('Failed to reorder:', err);
    } finally {
      setReorderingId(null);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        onPress={() => handleOrderPress(item)}
        onReorder={() => handleReorder(item.id)}
        isReordering={reorderingId === item.id}
      />
    ),
    [reorderingId]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <YStack padding="$4" alignItems="center">
        <Spinner />
      </YStack>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
        <Package size={64} color="$colorSecondary" />
        <Text fontSize={18} fontWeight="600" marginTop="$4">
          No orders yet
        </Text>
        <Text fontSize={14} color="$colorSecondary" textAlign="center" marginTop="$2">
          Your order history will appear here
        </Text>
        <Button
          size="lg"
          marginTop="$4"
          onPress={() => navigation.navigate('Menu', {})}
        >
          <Text color="white" fontWeight="600">
            Start Ordering
          </Text>
        </Button>
      </YStack>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <YStack padding="$4" paddingBottom="$2">
          <Text fontSize={24} fontWeight="bold">
            My Orders
          </Text>
        </YStack>

        {/* Filter Tabs */}
        <XStack paddingHorizontal="$4" marginBottom="$3" gap="$2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              flex={1}
              size="sm"
              variant={filter === option.value ? 'primary' : 'secondary'}
              onPress={() => setFilter(option.value)}
            >
              <Text
                color={filter === option.value ? 'white' : '$color'}
                fontSize={13}
              >
                {option.label}
              </Text>
            </Button>
          ))}
        </XStack>

        {/* Orders List */}
        {isLoading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" />
          </YStack>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
            }
            contentContainerStyle={{ paddingTop: 8, flexGrow: 1 }}
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
