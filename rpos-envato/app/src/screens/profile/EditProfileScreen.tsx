import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Avatar } from 'tamagui';
import { ArrowLeft, User, Mail, Phone, MapPin, Camera } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store';
import { put } from '@/services/api/client';
import type { MoreScreenProps } from '@/navigation/types';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type Form = z.infer<typeof schema>;

interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar: string;
    phone?: string;
    address?: string;
  };
}

export default function EditProfileScreen({ navigation }: MoreScreenProps<'EditProfile'>) {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      address: user?.address || '',
    },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError(null);
    try {
      const response = await put<UpdateProfileResponse>('/users/me', data);
      updateUser(response.data);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAvatar = () => {
    // TODO: Implement image picker
    console.log('Change avatar');
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
        <Text fontSize="$6" fontWeight="bold" flex={1}>Edit Profile</Text>
        <Button variant="primary" loading={loading} onPress={handleSubmit(onSubmit)}>
          <Text color="white" fontWeight="600">Save</Text>
        </Button>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          {/* Avatar */}
          <Card>
            <YStack alignItems="center" gap="$3">
              <YStack position="relative">
                <Avatar circular size="$10" backgroundColor="$primary">
                  {user?.avatar ? (
                    <Avatar.Image source={{ uri: user.avatar }} />
                  ) : (
                    <Avatar.Fallback backgroundColor="$primary" justifyContent="center" alignItems="center">
                      <User size={48} color="white" />
                    </Avatar.Fallback>
                  )}
                </Avatar>
                <Button
                  variant="primary"
                  size="icon"
                  position="absolute"
                  bottom={0}
                  right={0}
                  borderRadius={20}
                  onPress={handleChangeAvatar}
                >
                  <Camera size={16} color="white" />
                </Button>
              </YStack>
              <Text fontSize="$2" color="$colorSecondary">
                Tap to change profile photo
              </Text>
            </YStack>
          </Card>

          {/* Error Display */}
          {error && (
            <Card backgroundColor="$error" padding="$3">
              <Text color="white" textAlign="center">{error}</Text>
            </Card>
          )}

          {/* Form */}
          <Card>
            <YStack gap="$4">
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="First Name"
                    placeholder="John"
                    leftIcon={<User size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    error={errors.firstName?.message}
                    required
                  />
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    leftIcon={<User size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    error={errors.lastName?.message}
                    required
                  />
                )}
              />

              {/* Email is read-only */}
              <Input
                label="Email"
                value={user?.email || ''}
                leftIcon={<Mail size={20} color="$placeholderColor" />}
                editable={false}
                helperText="Email cannot be changed"
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Phone"
                    placeholder="+1 234 567 8900"
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
                    placeholder="123 Main St, City, Country"
                    leftIcon={<MapPin size={20} color="$placeholderColor" />}
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                )}
              />
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
