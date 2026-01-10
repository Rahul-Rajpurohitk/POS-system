import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input, Avatar } from 'tamagui';
import { ArrowLeft, Search, Plus, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { getInitials } from '@/utils';
import { useCustomers } from '@/features/customers/hooks';
import type { MoreScreenProps } from '@/navigation/types';
import type { Customer } from '@/types';

export default function CustomersScreen({ navigation }: MoreScreenProps<'Customers'>) {
  const [search, setSearch] = useState('');

  const {
    data: customersData,
    isLoading,
    isRefetching,
    refetch,
    error
  } = useCustomers({ limit: 100 });

  const customers = customersData?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return customers;
    const query = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  }, [customers, search]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading customers...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap="$3">
        <Text color="$error">Failed to load customers</Text>
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
        <Text fontSize="$6" fontWeight="bold" flex={1}>Customers</Text>
        <Button variant="primary" size="sm" onPress={() => navigation.navigate('AddCustomer')}>
          <Plus size={18} color="white" />
          <Text color="white">Add</Text>
        </Button>
      </XStack>

      <YStack padding="$4" gap="$3" flex={1}>
        <XStack backgroundColor="$cardBackground" borderRadius="$2" paddingHorizontal="$3" alignItems="center" borderWidth={1} borderColor="$borderColor">
          <Search size={20} color="$placeholderColor" />
          <Input flex={1} placeholder="Search customers..." value={search} onChangeText={setSearch} borderWidth={0} backgroundColor="transparent" />
        </XStack>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <Card pressable onPress={() => navigation.navigate('CustomerDetail', { id: item.id })} marginBottom="$2">
              <XStack alignItems="center" gap="$3">
                <Avatar circular size="$4" backgroundColor="$primary">
                  <Avatar.Fallback>
                    <Text color="white" fontWeight="600">{getInitials(item.name)}</Text>
                  </Avatar.Fallback>
                </Avatar>
                <YStack flex={1}>
                  <Text fontSize="$4" fontWeight="500">{item.name}</Text>
                  <Text fontSize="$2" color="$colorSecondary">{item.email}</Text>
                  {item.phone && <Text fontSize="$2" color="$colorSecondary">{item.phone}</Text>}
                </YStack>
              </XStack>
            </Card>
          )}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">
                {search ? 'No customers match your search' : 'No customers found'}
              </Text>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
