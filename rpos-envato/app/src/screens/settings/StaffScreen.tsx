import React, { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input, Avatar, Spinner } from 'tamagui';
import { ArrowLeft, Search, Plus, User, Mail, Shield, Users } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { useStaff } from '@/features/settings';
import type { MoreScreenProps } from '@/navigation/types';

const roleColors: Record<string, string> = {
  admin: '$error',
  manager: '$warning',
  cashier: '$success',
  ADMIN: '$error',
  MANAGER: '$warning',
  STAFF: '$success',
};

export default function StaffScreen({ navigation }: MoreScreenProps<'Staff'>) {
  const [search, setSearch] = useState('');

  const { data: staffList, isLoading, error, refetch } = useStaff();

  const filtered = (staffList || []).filter(
    s => {
      const searchLower = search.toLowerCase();
      const name = s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim();
      return name.toLowerCase().includes(searchLower) ||
             (s.email || '').toLowerCase().includes(searchLower);
    }
  );

  if (isLoading && !staffList) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$3" color="$colorSecondary">Loading staff...</Text>
      </YStack>
    );
  }

  if (error && !staffList) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Staff</Text>
        </XStack>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <Users size={64} color="$colorSecondary" />
          <Text fontSize="$5" fontWeight="600" marginTop="$4">Unable to Load Staff</Text>
          <Text color="$colorSecondary" textAlign="center" marginTop="$2">
            {error?.message || 'Failed to fetch staff members'}
          </Text>
          <Button variant="primary" marginTop="$4" onPress={() => refetch()}>
            <Text color="white">Try Again</Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack
        padding="$4"
        alignItems="center"
        gap="$3"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Staff</Text>
        <Button variant="primary" size="sm" onPress={() => navigation.navigate('AddStaff')}>
          <Plus size={18} color="white" />
          <Text color="white">Add</Text>
        </Button>
      </XStack>

      <YStack padding="$4" gap="$3" flex={1}>
        <XStack
          backgroundColor="$cardBackground"
          borderRadius="$2"
          paddingHorizontal="$3"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Search size={20} color="$placeholderColor" />
          <Input
            flex={1}
            placeholder="Search staff..."
            value={search}
            onChangeText={setSearch}
            borderWidth={0}
            backgroundColor="transparent"
          />
        </XStack>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          renderItem={({ item }) => {
            const name = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown';
            const role = (item.role || 'cashier').toLowerCase();
            const isActive = item.isActive !== false;

            return (
              <Card
                pressable
                onPress={() => navigation.navigate('EditStaff', { id: item.id })}
                marginBottom="$2"
                opacity={isActive ? 1 : 0.5}
              >
                <XStack alignItems="center" gap="$3">
                  <Avatar circular size="$4" backgroundColor="$primary">
                    {item.avatar ? (
                      <Avatar.Image source={{ uri: item.avatar }} />
                    ) : (
                      <Avatar.Fallback backgroundColor="$primary" justifyContent="center" alignItems="center">
                        <User size={24} color="white" />
                      </Avatar.Fallback>
                    )}
                  </Avatar>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize="$4" fontWeight="600">{name}</Text>
                      {!isActive && (
                        <Text fontSize="$1" color="$error">(Inactive)</Text>
                      )}
                    </XStack>
                    <XStack alignItems="center" gap="$1">
                      <Mail size={12} color="$colorSecondary" />
                      <Text fontSize="$2" color="$colorSecondary">{item.email}</Text>
                    </XStack>
                  </YStack>
                  <YStack
                    backgroundColor={roleColors[item.role] || roleColors[role] || '$colorSecondary'}
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$2"
                    opacity={0.9}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Shield size={12} color="white" />
                      <Text fontSize="$1" color="white" textTransform="capitalize">
                        {role === 'staff' ? 'cashier' : role}
                      </Text>
                    </XStack>
                  </YStack>
                </XStack>
              </Card>
            );
          }}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Users size={48} color="$colorSecondary" />
              <Text color="$colorSecondary" marginTop="$3">No staff members found</Text>
              <Button variant="outline" marginTop="$3" onPress={() => navigation.navigate('AddStaff')}>
                <Text>Add Staff Member</Text>
              </Button>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
