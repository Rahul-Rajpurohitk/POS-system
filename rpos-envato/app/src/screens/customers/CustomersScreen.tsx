import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input, Avatar } from 'tamagui';
import {
  ArrowLeft, Search, Plus, RefreshCw, Users, Mail, Phone,
  ChevronRight, UserPlus, Star,
} from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { getInitials } from '@/utils';
import { useCustomers } from '@/features/customers/hooks';
import type { MoreScreenProps } from '@/navigation/types';
import type { Customer } from '@/types';

// Avatar background colors - rotating palette
const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#14B8A6',
];

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

  // Get color for avatar based on customer name
  const getAvatarColor = (name: string) => {
    const charCode = name.charCodeAt(0) || 0;
    return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Enhanced Header */}
      <YStack backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack padding="$4" alignItems="center" gap="$3">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} />
          </Button>
          <XStack flex={1} alignItems="center" gap="$3">
            <YStack
              width={44}
              height={44}
              borderRadius={22}
              backgroundColor="#7C3AED"
              alignItems="center"
              justifyContent="center"
            >
              <Users size={22} color="white" />
            </YStack>
            <YStack>
              <Text fontSize="$6" fontWeight="bold" color="$color">Customers</Text>
              <Text fontSize="$2" color="$colorSecondary">{customers.length} total customers</Text>
            </YStack>
          </XStack>
          <YStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius="$3"
            backgroundColor="#7C3AED"
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            pressStyle={{ transform: [{ scale: 0.97 }] }}
            onPress={() => navigation.navigate('AddCustomer')}
          >
            <XStack alignItems="center" gap="$2">
              <UserPlus size={16} color="white" />
              <Text color="white" fontWeight="600">Add Customer</Text>
            </XStack>
          </YStack>
        </XStack>
      </YStack>

      <YStack padding="$4" gap="$3" flex={1}>
        {/* Enhanced Search */}
        <XStack
          backgroundColor="$cardBackground"
          borderRadius="$3"
          paddingHorizontal="$4"
          paddingVertical="$2"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$2"
        >
          <Search size={20} color="#7C3AED" />
          <Input
            flex={1}
            placeholder="Search by name or email..."
            value={search}
            onChangeText={setSearch}
            borderWidth={0}
            backgroundColor="transparent"
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
          <YStack
            padding="$2"
            borderRadius="$2"
            backgroundColor="$backgroundHover"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#7C3AED' }}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color={isRefetching ? '#7C3AED' : '$colorSecondary'} />
          </YStack>
        </XStack>

        {/* Customer List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item, index }) => {
            const avatarColor = getAvatarColor(item.name);
            return (
              <YStack
                backgroundColor="$cardBackground"
                borderRadius="$4"
                padding="$4"
                marginBottom="$3"
                borderWidth={1}
                borderColor="$borderColor"
                shadowColor="#000"
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={0.05}
                shadowRadius={8}
                cursor="pointer"
                hoverStyle={{ backgroundColor: '$backgroundHover', borderColor: '#7C3AED' }}
                pressStyle={{ backgroundColor: '$backgroundPress' }}
                onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}
              >
                <XStack alignItems="center" gap="$4">
                  {/* Enhanced Avatar */}
                  <YStack
                    width={56}
                    height={56}
                    borderRadius={28}
                    backgroundColor={avatarColor}
                    alignItems="center"
                    justifyContent="center"
                    shadowColor={avatarColor}
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={8}
                  >
                    <Text color="white" fontWeight="bold" fontSize="$5">
                      {getInitials(item.name)}
                    </Text>
                  </YStack>

                  {/* Customer Info */}
                  <YStack flex={1} gap="$1">
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        {item.name}
                      </Text>
                      {index < 3 && (
                        <YStack
                          paddingHorizontal="$2"
                          paddingVertical={2}
                          borderRadius="$2"
                          backgroundColor="#FEF3C7"
                        >
                          <XStack alignItems="center" gap={4}>
                            <Star size={10} color="#D97706" fill="#D97706" />
                            <Text fontSize={9} fontWeight="600" color="#D97706">VIP</Text>
                          </XStack>
                        </YStack>
                      )}
                    </XStack>

                    {item.email && (
                      <XStack alignItems="center" gap="$2">
                        <Mail size={12} color="$colorSecondary" />
                        <Text fontSize="$2" color="$colorSecondary">{item.email}</Text>
                      </XStack>
                    )}

                    {item.phone && (
                      <XStack alignItems="center" gap="$2">
                        <Phone size={12} color="$colorSecondary" />
                        <Text fontSize="$2" color="$colorSecondary">{item.phone}</Text>
                      </XStack>
                    )}
                  </YStack>

                  {/* Arrow */}
                  <ChevronRight size={20} color="$colorSecondary" />
                </XStack>
              </YStack>
            );
          }}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10" gap="$4">
              <YStack
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor="$backgroundHover"
                alignItems="center"
                justifyContent="center"
              >
                <Users size={40} color="$colorSecondary" />
              </YStack>
              <YStack alignItems="center" gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {search ? 'No Results' : 'No Customers Yet'}
                </Text>
                <Text fontSize="$2" color="$colorSecondary" textAlign="center">
                  {search ? 'Try adjusting your search' : 'Add your first customer to get started'}
                </Text>
              </YStack>
              {!search && (
                <Button variant="primary" onPress={() => navigation.navigate('AddCustomer')}>
                  <UserPlus size={16} color="white" />
                  <Text color="white">Add Customer</Text>
                </Button>
              )}
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
