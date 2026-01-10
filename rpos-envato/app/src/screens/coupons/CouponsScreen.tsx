import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { ArrowLeft, Search, Plus, Ticket, Calendar, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { formatDate, isCouponExpired } from '@/utils';
import { useCoupons } from '@/features/coupons/hooks';
import type { MoreScreenProps } from '@/navigation/types';
import type { Coupon } from '@/types';

export default function CouponsScreen({ navigation }: MoreScreenProps<'Coupons'>) {
  const [search, setSearch] = useState('');

  const {
    data: coupons = [],
    isLoading,
    isRefetching,
    refetch,
    error
  } = useCoupons();

  const filtered = useMemo(() => {
    if (!search) return coupons;
    const query = search.toLowerCase();
    return coupons.filter(c =>
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query)
    );
  }, [coupons, search]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading coupons...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap="$3">
        <Text color="$error">Failed to load coupons</Text>
        <Button variant="secondary" onPress={() => refetch()}>
          <RefreshCw size={18} />
          <Text>Retry</Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Coupons</Text>
        <Button variant="primary" size="sm" onPress={() => navigation.navigate('AddCoupon')}>
          <Plus size={18} color="white" />
          <Text color="white">Add</Text>
        </Button>
      </XStack>

      <YStack padding="$4" gap="$3" flex={1}>
        <XStack backgroundColor="$cardBackground" borderRadius="$2" paddingHorizontal="$3" alignItems="center" borderWidth={1} borderColor="$borderColor">
          <Search size={20} color="$placeholderColor" />
          <Input flex={1} placeholder="Search coupons..." value={search} onChangeText={setSearch} borderWidth={0} backgroundColor="transparent" />
        </XStack>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => {
            const expired = isCouponExpired(item.expiredAt);
            return (
              <Card pressable onPress={() => navigation.navigate('EditCoupon', { id: item.id })} marginBottom="$2" opacity={expired ? 0.5 : 1}>
                <XStack alignItems="center" gap="$3">
                  <YStack backgroundColor={expired ? '$backgroundPress' : '$primary'} padding="$2" borderRadius="$2" opacity={0.9}>
                    <Ticket size={24} color={expired ? '$colorSecondary' : 'white'} />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="600">{item.code}</Text>
                    <Text fontSize="$2" color="$colorSecondary">{item.name}</Text>
                    {item.expiredAt && (
                      <XStack alignItems="center" gap="$1" marginTop="$1">
                        <Calendar size={12} color={expired ? '$error' : '$colorSecondary'} />
                        <Text fontSize="$1" color={expired ? '$error' : '$colorSecondary'}>
                          {expired ? 'Expired' : `Expires ${formatDate(item.expiredAt, 'PP')}`}
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                  <Text fontSize="$4" fontWeight="bold" color="$accent">
                    {item.type === 'percentage' ? `${item.amount}%` : `$${item.amount}`}
                  </Text>
                </XStack>
              </Card>
            );
          }}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">
                {search ? 'No coupons match your search' : 'No coupons found'}
              </Text>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
