import React, { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, ScrollView, Avatar, Spinner } from 'tamagui';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, User } from '@tamagui/lucide-icons';
import { Button, Card, ConfirmModal } from '@/components/ui';
import { useCustomer, useDeleteCustomer } from '@/features/customers';
import { getInitials } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';

export default function CustomerDetailScreen({ navigation, route }: MoreScreenProps<'CustomerDetail'>) {
  const { id } = route.params;
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: customer, isLoading, error } = useCustomer(id);
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = () => {
    setDeleteModal(false);
    deleteCustomer.mutate(id, {
      onSuccess: () => navigation.goBack(),
      onError: (error) => Alert.alert('Error', error.message || 'Failed to delete customer'),
    });
  };

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$3" color="$colorSecondary">Loading customer...</Text>
      </YStack>
    );
  }

  if (error || !customer) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Customer</Text>
        </XStack>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <User size={64} color="$colorSecondary" />
          <Text fontSize="$5" fontWeight="600" marginTop="$4">Customer Not Found</Text>
          <Text color="$colorSecondary" textAlign="center" marginTop="$2">
            {error?.message || 'Unable to load customer details'}
          </Text>
          <Button variant="outline" marginTop="$4" onPress={() => navigation.goBack()}>
            <Text>Go Back</Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Customer</Text>
        <Button variant="ghost" size="icon" onPress={() => navigation.navigate('EditCustomer', { id })}><Edit size={20} color="$primary" /></Button>
        <Button variant="ghost" size="icon" onPress={() => setDeleteModal(true)} disabled={deleteCustomer.isPending}>
          <Trash2 size={20} color="$error" />
        </Button>
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
              {!customer.email && !customer.phone && !customer.address && (
                <Text color="$colorSecondary" textAlign="center">No contact information available</Text>
              )}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
      <ConfirmModal
        visible={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </YStack>
  );
}
