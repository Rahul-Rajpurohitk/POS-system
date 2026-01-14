import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Image, ScrollView } from 'tamagui';
import { Mail, Lock } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, SecureInput, Card } from '@/components/ui';
import { useAuthStore } from '@/store';
import { post, setAuthHeader } from '@/services/api/client';
import type { AuthScreenProps } from '@/navigation/types';
import type { User } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);

    try {
      const response = await post<LoginResponse>('/users/login', data);
      setAuthHeader(response.data.token);
      setAuth(response.data.user, response.data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
          maxWidth={420}
          width="100%"
          alignSelf="center"
          gap="$5"
        >
          {/* Logo */}
          <YStack alignItems="center" gap="$2" marginBottom="$2">
            <Image
              source={require('@assets/icons/logo.png')}
              width={72}
              height={72}
              resizeMode="contain"
            />
            <Text fontSize="$7" fontWeight="700" color="$primary">
              POS System
            </Text>
            <Text fontSize="$3" color="$colorSecondary">
              Sign in to your account
            </Text>
          </YStack>

          {/* Login Form */}
          <Card width="100%" padding="$5" variant="elevated">
            <YStack gap="$4">
              {error && (
                <YStack
                  backgroundColor="$error"
                  padding="$3"
                  borderRadius="$3"
                >
                  <Text color="white" textAlign="center" fontSize="$3">
                    {error}
                  </Text>
                </YStack>
              )}

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon={<Mail size={18} color="$placeholderColor" />}
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
                    placeholder="Enter your password"
                    leftIcon={<Lock size={18} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />

              <Button
                variant="link"
                alignSelf="flex-end"
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text color="$primary" fontSize="$3">
                  Forgot Password?
                </Text>
              </Button>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleSubmit(onSubmit)}
              >
                <Text color="white" fontWeight="600" fontSize="$4">
                  Sign In
                </Text>
              </Button>
            </YStack>
          </Card>

          {/* Register Link */}
          <XStack gap="$2" alignItems="center">
            <Text color="$colorSecondary" fontSize="$3">Don't have an account?</Text>
            <Button variant="link" onPress={() => navigation.navigate('Register')}>
              <Text color="$primary" fontWeight="600" fontSize="$3">
                Sign Up
              </Text>
            </Button>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
