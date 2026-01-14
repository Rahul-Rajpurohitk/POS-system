import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { ArrowLeft, Lock, Eye, EyeOff, Shield } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { post } from '@/services/api/client';
import type { MoreScreenProps } from '@/navigation/types';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword'],
});

type Form = z.infer<typeof schema>;

interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export default function ChangePasswordScreen({ navigation }: MoreScreenProps<'ChangePassword'>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError(null);
    try {
      await post<ChangePasswordResponse>('/users/change-password', {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

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
        <Text fontSize="$6" fontWeight="bold" flex={1}>Change Password</Text>
        <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
          <Text color="white" fontWeight="600">Save</Text>
        </Button>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          {/* Error Display */}
          {error && (
            <Card backgroundColor="$error" padding="$3">
              <Text color="white" textAlign="center">{error}</Text>
            </Card>
          )}

          <Card>
            <XStack alignItems="center" gap="$3" marginBottom="$3">
              <YStack backgroundColor="$primary" padding="$2" borderRadius="$2" opacity={0.9}>
                <Shield size={24} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text fontWeight="600">Security</Text>
                <Text fontSize="$2" color="$colorSecondary">
                  Choose a strong password with letters, numbers, and symbols
                </Text>
              </YStack>
            </XStack>

            <YStack gap="$4">
              <Controller
                control={control}
                name="currentPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Current Password"
                    placeholder="Enter current password"
                    secureTextEntry={!showCurrent}
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    rightIcon={
                      <Button
                        variant="ghost"
                        size="icon"
                        onPress={() => setShowCurrent(!showCurrent)}
                      >
                        {showCurrent ? (
                          <EyeOff size={20} color="$colorSecondary" />
                        ) : (
                          <Eye size={20} color="$colorSecondary" />
                        )}
                      </Button>
                    }
                    value={value}
                    onChangeText={onChange}
                    error={errors.currentPassword?.message}
                    required
                  />
                )}
              />

              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    secureTextEntry={!showNew}
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    rightIcon={
                      <Button
                        variant="ghost"
                        size="icon"
                        onPress={() => setShowNew(!showNew)}
                      >
                        {showNew ? (
                          <EyeOff size={20} color="$colorSecondary" />
                        ) : (
                          <Eye size={20} color="$colorSecondary" />
                        )}
                      </Button>
                    }
                    value={value}
                    onChangeText={onChange}
                    error={errors.newPassword?.message}
                    required
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Confirm New Password"
                    placeholder="Re-enter new password"
                    secureTextEntry={!showConfirm}
                    leftIcon={<Lock size={20} color="$placeholderColor" />}
                    rightIcon={
                      <Button
                        variant="ghost"
                        size="icon"
                        onPress={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? (
                          <EyeOff size={20} color="$colorSecondary" />
                        ) : (
                          <Eye size={20} color="$colorSecondary" />
                        )}
                      </Button>
                    }
                    value={value}
                    onChangeText={onChange}
                    error={errors.confirmPassword?.message}
                    required
                  />
                )}
              />
            </YStack>
          </Card>

          <Card backgroundColor="$warningLight">
            <YStack gap="$2">
              <Text fontWeight="600" color="$warning">Password Tips</Text>
              <Text fontSize="$2" color="$colorSecondary">
                {'\u2022'} Use at least 6 characters{'\n'}
                {'\u2022'} Include uppercase and lowercase letters{'\n'}
                {'\u2022'} Add numbers and special characters{'\n'}
                {'\u2022'} Avoid common words or personal info
              </Text>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
