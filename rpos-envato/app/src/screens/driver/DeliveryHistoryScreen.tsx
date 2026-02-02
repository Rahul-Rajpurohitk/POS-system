import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Filter, ChevronRight } from '@tamagui/lucide-icons';
import { Card, Button, EmptyState } from '@/components/ui';
import { DeliveryCard, DeliveryStatusBadge } from '@/components/driver';
import { useInfiniteDeliveryHistory } from '@/features/driver/hooks';
import { formatDistance, formatDuration } from '@/hooks';
import type { DriverTabScreenProps } from '@/navigation/types';
import type { Delivery, DeliveryStatus } from '@/types';

type FilterOption = 'all' | 'delivered' | 'cancelled';

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'delivered', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DeliveryHistoryScreen({
  navigation,
}: DriverTabScreenProps<'DeliveryHistory'>) {
  const [filter, setFilter] = useState<FilterOption>('all');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteDeliveryHistory({
    limit: 20,
    status: filter === 'all' ? undefined : filter as DeliveryStatus,
  });

  const deliveries = data?.pages.flat() || [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

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

  const renderItem = useCallback(
    ({ item }: { item: Delivery }) => (
      <Card padding="$3" marginBottom="$3" marginHorizontal="$4">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <XStack alignItems="center" gap="$2" marginBottom="$1">
              <Text fontSize={14} fontWeight="600">
                Order #{item.order?.number || item.orderId.slice(-6)}
              </Text>
              <DeliveryStatusBadge status={item.status} size="sm" />
            </XStack>

            <Text fontSize={12} color="$colorSecondary" numberOfLines={1}>
              {item.deliveryAddress}
            </Text>

            <XStack marginTop="$2" gap="$3">
              <Text fontSize={12} color="$colorSecondary">
                {formatDate(item.createdAt)}
              </Text>
              <Text fontSize={12} color="$colorSecondary">
                {formatTime(item.createdAt)}
              </Text>
              {item.distanceMeters && (
                <Text fontSize={12} color="$colorSecondary">
                  {formatDistance(item.distanceMeters)}
                </Text>
              )}
            </XStack>
          </YStack>

          <YStack alignItems="flex-end">
            <Text fontSize={16} fontWeight="bold" color="$success">
              ${(item.deliveryFee + item.driverTip).toFixed(2)}
            </Text>
            {item.driverTip > 0 && (
              <Text fontSize={11} color="$colorSecondary">
                +${item.driverTip.toFixed(2)} tip
              </Text>
            )}
            {item.customerRating && (
              <XStack alignItems="center" marginTop="$1">
                <Text fontSize={12}>⭐</Text>
                <Text fontSize={12} marginLeft="$1">
                  {item.customerRating}
                </Text>
              </XStack>
            )}
          </YStack>
        </XStack>
      </Card>
    ),
    []
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
      <EmptyState
        icon="📦"
        title="No Deliveries Yet"
        description={
          filter === 'all'
            ? "You haven't completed any deliveries yet"
            : `No ${filter} deliveries found`
        }
      />
    );
  }, [isLoading, filter]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack padding="$4" alignItems="center" justifyContent="space-between">
          <Text fontSize={24} fontWeight="bold">
            Delivery History
          </Text>
          <Button size="icon" variant="ghost">
            <Calendar size={20} />
          </Button>
        </XStack>

        {/* Filter Tabs */}
        <XStack paddingHorizontal="$4" marginBottom="$3" gap="$2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              flex={1}
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

        {/* Summary Stats */}
        {deliveries.length > 0 && (
          <XStack paddingHorizontal="$4" marginBottom="$3" gap="$3">
            <Card flex={1} padding="$3" alignItems="center">
              <Text fontSize={20} fontWeight="bold" color="$primary">
                {deliveries.length}
              </Text>
              <Text fontSize={11} color="$colorSecondary">
                Deliveries
              </Text>
            </Card>
            <Card flex={1} padding="$3" alignItems="center">
              <Text fontSize={20} fontWeight="bold" color="$success">
                $
                {deliveries
                  .reduce((sum, d) => sum + d.deliveryFee + d.driverTip, 0)
                  .toFixed(2)}
              </Text>
              <Text fontSize={11} color="$colorSecondary">
                Total Earned
              </Text>
            </Card>
            <Card flex={1} padding="$3" alignItems="center">
              <Text fontSize={20} fontWeight="bold" color="#FFB800">
                {(
                  deliveries.reduce(
                    (sum, d) => sum + (d.customerRating || 0),
                    0
                  ) / (deliveries.filter((d) => d.customerRating).length || 1)
                ).toFixed(1)}
              </Text>
              <Text fontSize={11} color="$colorSecondary">
                Avg Rating
              </Text>
            </Card>
          </XStack>
        )}

        {/* Loading */}
        {isLoading && !isRefetching && (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" />
          </YStack>
        )}

        {/* Delivery List */}
        {!isLoading && (
          <FlatList
            data={deliveries}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={
              deliveries.length === 0 ? { flex: 1 } : undefined
            }
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
