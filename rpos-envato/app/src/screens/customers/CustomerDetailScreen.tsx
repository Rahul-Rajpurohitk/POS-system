import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Avatar } from 'tamagui';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin } from '@tamagui/lucide-icons';
import { Button, Card, ConfirmModal } from '@/components/ui';
import { getInitials } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';

export default function CustomerDetailScreen({ navigation, route }: MoreScreenProps<'CustomerDetail'>) {
  const { id } = route.params;
  const [deleteModal, setDeleteModal] = useState(false);
  const customer = { id, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', address: '123 Main St' };

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Customer</Text>
        <Button variant="ghost" size="icon" onPress={() => navigation.navigate('EditCustomer', { id })}><Edit size={20} color="$primary" /></Button>
        <Button variant="ghost" size="icon" onPress={() => setDeleteModal(true)}><Trash2 size={20} color="$error" /></Button>
      </XStack>
      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          <Card alignItems="center" padding="$6">
            <Avatar circular size="$8" backgroundColor="$primary"><Avatar.Fallback><Text color="white" fontSize="$6" fontWeight="600">{getInitials(customer.name)}</Text></Avatar.Fallback></Avatar>
            <Text fontSize="$6" fontWeight="bold" marginTop="$3">{customer.name}</Text>
          </Card>
          <Card>
            <YStack gap="$3">
              {customer.email && <XStack alignItems="center" gap="$3"><Mail size={20} color="$colorSecondary" /><Text>{customer.email}</Text></XStack>}
              {customer.phone && <XStack alignItems="center" gap="$3"><Phone size={20} color="$colorSecondary" /><Text>{customer.phone}</Text></XStack>}
              {customer.address && <XStack alignItems="center" gap="$3"><MapPin size={20} color="$colorSecondary" /><Text>{customer.address}</Text></XStack>}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
      <ConfirmModal visible={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={() => { setDeleteModal(false); navigation.goBack(); }}
        title="Delete Customer" message="Are you sure?" confirmText="Delete" confirmVariant="danger" />
    </YStack>
  );
}
