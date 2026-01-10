import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Avatar } from 'tamagui';
import { ArrowLeft, User, Mail, Phone, MapPin, Camera } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store';
import type { MoreScreenProps } from '@/navigation/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function EditProfileScreen({ navigation }: MoreScreenProps<'EditProfile'>) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
    },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      console.log('Updating profile:', data);
      // TODO: Call API to update profile
      navigation.goBack();
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

          {/* Form */}
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
