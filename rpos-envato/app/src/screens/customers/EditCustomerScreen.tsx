import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { ArrowLeft, User, Mail, Phone, MapPin } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { useCustomer, useUpdateCustomer } from '@/features/customers';
import type { MoreScreenProps } from '@/navigation/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function EditCustomerScreen({ navigation, route }: MoreScreenProps<'EditCustomer'>) {
  const { id } = route.params;

  const { data: customer, isLoading: customerLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', address: '' },
  });

  // Pre-fill form when customer data loads
  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      });
    }
  }, [customer, reset]);

  const onSubmit = (data: Form) => {
    updateCustomer.mutate(
      { id, data },
      {
        onSuccess: () => navigation.goBack(),
        onError: (error) => Alert.alert('Error', error.message || 'Failed to update customer'),
      }
    );
  };

  if (customerLoading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$3" color="$colorSecondary">Loading customer...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}><ArrowLeft size={24} /></Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Customer</Text>
        <Button variant="primary" loading={updateCustomer.isPending} onPress={handleSubmit(onSubmit)}>
          <Text color="white" fontWeight="600">Save</Text>
        </Button>
      </XStack>
      <ScrollView flex={1} padding="$4">
        <Card>
          <YStack gap="$4">
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Name"
                  leftIcon={<User size={20} color="$placeholderColor" />}
                  value={value}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  required
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={20} color="$placeholderColor" />}
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Phone"
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color="$placeholderColor" />}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Address"
                  leftIcon={<MapPin size={20} color="$placeholderColor" />}
                  value={value}
                  onChangeText={onChange}
                  multiline
                />
              )}
            />
          </YStack>
        </Card>
      </ScrollView>
    </YStack>
  );
}
