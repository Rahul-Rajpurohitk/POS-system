import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { Search, Calendar, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { useSettingsStore } from '@/store';
import { useOrders } from '@/features/orders/hooks';
import type { OrderScreenProps } from '@/navigation/types';
import type { Order } from '@/types';

export default function OrderListScreen({ navigation }: OrderScreenProps<'OrderList'>) {
  const { settings } = useSettingsStore();
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
      (o.number || o.orderNumber || '').toLowerCase().includes(query)
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

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Text fontSize="$6" fontWeight="bold">Orders</Text>
      </XStack>

      <YStack padding="$4" gap="$3" flex={1}>
        <XStack backgroundColor="$cardBackground" borderRadius="$2" paddingHorizontal="$3" alignItems="center" borderWidth={1} borderColor="$borderColor">
          <Search size={20} color="$placeholderColor" />
          <Input flex={1} placeholder="Search orders..." value={search} onChangeText={setSearch} borderWidth={0} backgroundColor="transparent" />
        </XStack>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => {
            const orderNumber = item.number || item.orderNumber || `#${item.id.slice(0, 6)}`;
            const payment = item.payment || { subTotal: item.subTotal || 0, discount: item.discount || 0, total: item.total || 0 };
            return (
              <Card pressable onPress={() => navigation.navigate('OrderDetail', { id: item.id })} marginBottom="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap="$1">
                    <Text fontSize="$4" fontWeight="600">{orderNumber}</Text>
                    <XStack alignItems="center" gap="$1">
                      <Calendar size={14} color="$colorSecondary" />
                      <Text fontSize="$2" color="$colorSecondary">{formatDate(item.createdAt, 'PPp')}</Text>
                    </XStack>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize="$5" fontWeight="bold" color="$accent">
                      {formatCurrency(payment.total, settings.currency)}
                    </Text>
                    {payment.discount > 0 && (
                      <Text fontSize="$2" color="$success">
                        -{formatCurrency(payment.discount, settings.currency)}
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </Card>
            );
          }}
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
