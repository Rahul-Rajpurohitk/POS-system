import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { Mail, Key, ArrowLeft, CheckCircle, RefreshCw } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { post } from '@/services/api/client';
import type { AuthScreenProps } from '@/navigation/types';

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits'),
});

type VerifyEmailForm = z.infer<typeof verifyEmailSchema>;

interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export default function VerifyEmailScreen({ navigation, route }: AuthScreenProps<'VerifyEmail'>) {
  const { email: initialEmail } = route.params;
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<VerifyEmailForm>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: initialEmail,
      verificationCode: '',
    },
  });

  const onSubmit = async (data: VerifyEmailForm) => {
    setLoading(true);
    setError(null);

    try {
      await post<VerifyEmailResponse>('/auth/verify-email', {
        email: data.email,
        verificationCode: data.verificationCode,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await post<VerifyEmailResponse>('/auth/resend-verification', {
        email: getValues('email'),
      });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification code');
    } finally {
      setResending(false);
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
            <YStack
              backgroundColor="$primary"
              padding="$4"
              borderRadius="$4"
              opacity={0.9}
            >
              <Mail size={48} color="white" />
            </YStack>
            <Text fontSize="$8" fontWeight="bold" color="$primary">
              Verify Your Email
            </Text>
            <Text fontSize="$4" color="$colorSecondary" textAlign="center">
              We sent a 6-digit verification code to your email. Enter it below to verify your account.
            </Text>
          </YStack>

          <Card width="100%" padding="$5">
            <YStack gap="$4">
              {error && (
                <YStack backgroundColor="$error" padding="$3" borderRadius="$2">
                  <Text color="white" textAlign="center">{error}</Text>
                </YStack>
              )}

              {resendSuccess && (
                <YStack backgroundColor="$success" padding="$3" borderRadius="$2">
                  <Text color="white" textAlign="center">
                    Verification code resent! Check your inbox.
                  </Text>
                </YStack>
              )}

              {success ? (
                <YStack gap="$4" alignItems="center">
                  <YStack
                    backgroundColor="$success"
                    padding="$4"
                    borderRadius="$4"
                    alignItems="center"
                    gap="$3"
                  >
                    <CheckCircle size={48} color="white" />
                    <Text color="white" textAlign="center" fontWeight="600" fontSize="$5">
                      Email Verified!
                    </Text>
                    <Text color="white" textAlign="center" opacity={0.9}>
                      Your account is now fully activated. You can log in to access all features.
                    </Text>
                  </YStack>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onPress={() => navigation.navigate('Login')}
                  >
                    <Text color="white" fontWeight="600" fontSize="$4">
                      Go to Login
                    </Text>
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
                        editable={!initialEmail}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="verificationCode"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Verification Code"
                        placeholder="Enter 6-digit code"
                        keyboardType="number-pad"
                        maxLength={6}
                        leftIcon={<Key size={20} color="$placeholderColor" />}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.verificationCode?.message}
                        helperText="Check your email inbox (and spam folder)"
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
                      Verify Email
                    </Text>
                  </Button>

                  <XStack justifyContent="center" alignItems="center" gap="$2">
                    <Text color="$colorSecondary" fontSize="$3">
                      Didn't receive the code?
                    </Text>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={resending}
                      onPress={handleResendCode}
                      leftIcon={<RefreshCw size={16} color="$primary" />}
                    >
                      <Text color="$primary" fontWeight="600">Resend</Text>
                    </Button>
                  </XStack>
                </>
              )}
            </YStack>
          </Card>

          {!success && (
            <Button
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
              leftIcon={<ArrowLeft size={18} color="$primary" />}
            >
              <Text color="$primary">Back to Login</Text>
            </Button>
          )}
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
