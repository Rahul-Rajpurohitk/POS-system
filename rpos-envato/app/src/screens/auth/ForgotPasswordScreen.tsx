import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, Text, ScrollView } from 'tamagui';
import { Mail, ArrowLeft } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { post } from '@/services/api/client';
import type { AuthScreenProps } from '@/navigation/types';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    setError(null);

    try {
      await post('/auth/forgot-password', data);
      setSuccess(true);
      // Navigate to reset password screen after short delay
      setTimeout(() => {
        navigation.navigate('ResetPassword', { email: data.email });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
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
          <YStack alignItems="center" gap="$3">
            <Text fontSize="$8" fontWeight="bold" color="$primary">
              Forgot Password
            </Text>
            <Text fontSize="$4" color="$colorSecondary" textAlign="center">
              Enter your email and we'll send you a link to reset your password
            </Text>
          </YStack>

          <Card width="100%" padding="$5">
            <YStack gap="$4">
              {error && (
                <YStack backgroundColor="$error" padding="$3" borderRadius="$2">
                  <Text color="white" textAlign="center">{error}</Text>
                </YStack>
              )}

              {success ? (
                <YStack gap="$4" alignItems="center">
                  <YStack backgroundColor="$success" padding="$4" borderRadius="$2">
                    <Text color="white" textAlign="center">
                      Password reset code sent! Check your inbox.
                    </Text>
                  </YStack>
                  <Text fontSize="$3" color="$colorSecondary" textAlign="center">
                    Redirecting to enter your code...
                  </Text>
                  <Button
                    variant="primary"
                    fullWidth
                    onPress={() => navigation.navigate('ResetPassword', { email: getValues('email') })}
                  >
                    <Text color="white" fontWeight="600">Enter Code Now</Text>
                  </Button>
                </YStack>
              ) : (
                <>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Email"
                        placeholder="Enter your email"
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

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    onPress={handleSubmit(onSubmit)}
                  >
                    <Text color="white" fontWeight="600" fontSize="$4">
                      Send Reset Link
                    </Text>
                  </Button>
                </>
              )}
            </YStack>
          </Card>

          <Button
            variant="ghost"
            onPress={() => navigation.goBack()}
            leftIcon={<ArrowLeft size={20} color="$primary" />}
          >
            <Text color="$primary">Back to Login</Text>
          </Button>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
