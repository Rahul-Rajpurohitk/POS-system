import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, User, Mail, Lock, Shield } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import type { MoreScreenProps } from '@/navigation/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'manager', 'cashier']),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type Form = z.infer<typeof schema>;

export default function AddStaffScreen({ navigation }: MoreScreenProps<'AddStaff'>) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');

  const { control, handleSubmit, formState: { errors }, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'cashier' },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      console.log('Creating staff:', data);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const roles: Array<{ value: 'admin' | 'manager' | 'cashier'; label: string; description: string }> = [
    { value: 'admin', label: 'Admin', description: 'Full access to all features' },
    { value: 'manager', label: 'Manager', description: 'Manage products, orders, staff' },
    { value: 'cashier', label: 'Cashier', description: 'POS and order management only' },
  ];

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
        <Text fontSize="$6" fontWeight="bold" flex={1}>Add Staff</Text>
        <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
          <Text color="white" fontWeight="600">Save</Text>
        </Button>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          <Card>
            <YStack gap="$4">
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
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
                    placeholder="john@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Mail size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message}
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter password"
                    secureTextEntry
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    error={errors.password?.message}
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    secureTextEntry
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    error={errors.confirmPassword?.message}
                    required
                  />
                )}
              />
            </YStack>
          </Card>

          <Card>
            <YStack gap="$3">
              <XStack alignItems="center" gap="$2">
                <Shield size={20} color="$primary" />
                <Text fontSize="$4" fontWeight="600">Role</Text>
              </XStack>
              {roles.map((r) => (
                <Card
                  key={r.value}
                  pressable
                  onPress={() => {
                    setRole(r.value);
                    setValue('role', r.value);
                  }}
                  backgroundColor={role === r.value ? '$primaryLight' : '$cardBackground'}
                  borderWidth={2}
                  borderColor={role === r.value ? '$primary' : 'transparent'}
                >
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      width={20}
                      height={20}
                      borderRadius={10}
                      borderWidth={2}
                      borderColor="$primary"
                      backgroundColor={role === r.value ? '$primary' : 'transparent'}
                      justifyContent="center"
                      alignItems="center"
                    >
                      {role === r.value && (
                        <YStack width={10} height={10} borderRadius={5} backgroundColor="white" />
                      )}
                    </YStack>
                    <YStack flex={1}>
                      <Text fontWeight="600">{r.label}</Text>
                      <Text fontSize="$2" color="$colorSecondary">{r.description}</Text>
                    </YStack>
                  </XStack>
                </Card>
              ))}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
