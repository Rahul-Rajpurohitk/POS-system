import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { Mail, Lock, User, Building } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, SecureInput, Card } from '@/components/ui';
import { post } from '@/services/api/client';
import type { AuthScreenProps } from '@/navigation/types';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  businessName: z.string().min(2, 'Business name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      businessName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError(null);

    try {
      await post('/users/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        email: data.email,
        password: data.password,
      });
      navigation.navigate('Login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        flex={1}
        backgroundColor="$background"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          maxWidth={400}
          width="100%"
          alignSelf="center"
          gap="$5"
        >
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$8" fontWeight="bold" color="$primary">
              Create Account
            </Text>
            <Text fontSize="$4" color="$colorSecondary">
              Sign up to get started
            </Text>
          </YStack>

          <Card width="100%" padding="$5">
            <YStack gap="$4">
              {error && (
                <YStack backgroundColor="$error" padding="$3" borderRadius="$2">
                  <Text color="white" textAlign="center">{error}</Text>
                </YStack>
              )}

              <XStack gap="$3">
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      flex={1}
                      label="First Name"
                      placeholder="John"
                      leftIcon={<User size={20} color="$placeholderColor" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.firstName?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      flex={1}
                      label="Last Name"
                      placeholder="Doe"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.lastName?.message}
                    />
                  )}
                />
              </XStack>

              <Controller
                control={control}
                name="businessName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Business Name"
                    placeholder="My Store"
                    leftIcon={<Building size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.businessName?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="john@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Mail size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <SecureInput
                    label="Password"
                    placeholder="Min 6 characters"
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <SecureInput
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleSubmit(onSubmit)}
              >
                <Text color="white" fontWeight="600" fontSize="$4">
                  Create Account
                </Text>
              </Button>
            </YStack>
          </Card>

          <XStack gap="$2">
            <Text color="$colorSecondary">Already have an account?</Text>
            <Button variant="link" onPress={() => navigation.navigate('Login')}>
              <Text color="$primary" fontWeight="600">Sign In</Text>
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
