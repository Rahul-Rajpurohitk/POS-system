import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { YStack, XStack, Text, Input, Avatar } from 'tamagui';
import { ArrowLeft, Search, Plus, User, Mail, Shield } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import type { MoreScreenProps } from '@/navigation/types';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  avatar?: string;
  isActive: boolean;
}

const mockStaff: StaffMember[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', isActive: true },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', isActive: true },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'cashier', isActive: true },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'cashier', isActive: false },
];

const roleColors: Record<string, string> = {
  admin: '$error',
  manager: '$warning',
  cashier: '$success',
};

export default function StaffScreen({ navigation }: MoreScreenProps<'Staff'>) {
  const [search, setSearch] = useState('');

  const filtered = mockStaff.filter(
    s => s.name.toLowerCase().includes(search.toLowerCase()) ||
         s.email.toLowerCase().includes(search.toLowerCase())
  );

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
          renderItem={({ item }) => (
            <Card
              pressable
              onPress={() => navigation.navigate('EditStaff', { id: item.id })}
              marginBottom="$2"
              opacity={item.isActive ? 1 : 0.5}
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
                    <Text fontSize="$4" fontWeight="600">{item.name}</Text>
                    {!item.isActive && (
                      <Text fontSize="$1" color="$error">(Inactive)</Text>
                    )}
                  </XStack>
                  <XStack alignItems="center" gap="$1">
                    <Mail size={12} color="$colorSecondary" />
                    <Text fontSize="$2" color="$colorSecondary">{item.email}</Text>
                  </XStack>
                </YStack>
                <YStack
                  backgroundColor={roleColors[item.role]}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                  opacity={0.9}
                >
                  <XStack alignItems="center" gap="$1">
                    <Shield size={12} color="white" />
                    <Text fontSize="$1" color="white" textTransform="capitalize">
                      {item.role}
                    </Text>
                  </XStack>
                </YStack>
              </XStack>
            </Card>
          )}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">No staff members found</Text>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
