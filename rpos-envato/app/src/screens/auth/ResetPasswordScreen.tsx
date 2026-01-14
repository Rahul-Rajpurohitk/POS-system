import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { Mail, Lock, Key, Eye, EyeOff, ArrowLeft, CheckCircle } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { post } from '@/services/api/client';
import type { AuthScreenProps } from '@/navigation/types';

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  resetCode: z.string().length(6, 'Reset code must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export default function ResetPasswordScreen({ navigation, route }: AuthScreenProps<'ResetPassword'>) {
  const { email: initialEmail } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      resetCode: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    setLoading(true);
    setError(null);

    try {
      await post<ResetPasswordResponse>('/auth/reset-password', {
        email: data.email,
        resetCode: data.resetCode,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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
              Reset Password
            </Text>
            <Text fontSize="$4" color="$colorSecondary" textAlign="center">
              Enter the 6-digit code sent to your email and create a new password
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
                  <YStack
                    backgroundColor="$success"
                    padding="$4"
                    borderRadius="$4"
                    alignItems="center"
                    gap="$3"
                  >
                    <CheckCircle size={48} color="white" />
                    <Text color="white" textAlign="center" fontWeight="600" fontSize="$5">
                      Password Reset Successful!
                    </Text>
                    <Text color="white" textAlign="center" opacity={0.9}>
                      Your password has been updated. You can now login with your new password.
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
                    name="resetCode"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Reset Code"
                        placeholder="Enter 6-digit code"
                        keyboardType="number-pad"
                        maxLength={6}
                        leftIcon={<Key size={20} color="$placeholderColor" />}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.resetCode?.message}
                        helperText="Check your email for the 6-digit code"
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="newPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="New Password"
                        placeholder="Enter new password"
                        secureTextEntry={!showPassword}
                        leftIcon={<Lock size={20} color="$placeholderColor" />}
                        rightIcon={
                          <Button
                            variant="ghost"
                            size="icon"
                            onPress={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff size={20} color="$colorSecondary" />
                            ) : (
                              <Eye size={20} color="$colorSecondary" />
                            )}
                          </Button>
                        }
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.newPassword?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Confirm Password"
                        placeholder="Re-enter new password"
                        secureTextEntry={!showConfirmPassword}
                        leftIcon={<Lock size={20} color="$placeholderColor" />}
                        rightIcon={
                          <Button
                            variant="ghost"
                            size="icon"
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={20} color="$colorSecondary" />
                            ) : (
                              <Eye size={20} color="$colorSecondary" />
                            )}
                          </Button>
                        }
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
                      Reset Password
                    </Text>
                  </Button>
                </>
              )}
            </YStack>
          </Card>

          {!success && (
            <XStack gap="$3" alignItems="center">
              <Button
                variant="ghost"
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text color="$colorSecondary">Didn't receive code?</Text>
              </Button>
              <Text color="$colorSecondary">|</Text>
              <Button
                variant="ghost"
                onPress={() => navigation.navigate('Login')}
                leftIcon={<ArrowLeft size={18} color="$primary" />}
              >
                <Text color="$primary">Back to Login</Text>
              </Button>
            </XStack>
          )}
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
