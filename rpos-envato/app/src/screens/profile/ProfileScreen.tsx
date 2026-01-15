import React from 'react';
import { YStack, XStack, Text, ScrollView, Avatar } from 'tamagui';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  Pencil, Lock, LogOut, ChevronRight
} from '@tamagui/lucide-icons';
import { Button, Card, ConfirmModal } from '@/components/ui';
import { useAuthStore } from '@/store';
import { formatDate } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';

export default function ProfileScreen({ navigation }: MoreScreenProps<'Profile'>) {
  const { user, logout } = useAuthStore();
  const [logoutModal, setLogoutModal] = React.useState(false);

  const handleLogout = () => {
    logout();
    // Navigation will be handled by auth state change
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
        <Text fontSize="$6" fontWeight="bold" flex={1}>Profile</Text>
        <Button variant="ghost" size="icon" onPress={() => navigation.navigate('EditProfile')}>
          <Pencil size={20} />
        </Button>
      </XStack>

      <ScrollView flex={1}>
        <YStack padding="$4" gap="$4">
          {/* Profile Header */}
          <Card>
            <YStack alignItems="center" gap="$3">
              <Avatar circular size="$10" backgroundColor="$primary">
                {user?.avatar ? (
                  <Avatar.Image source={{ uri: user.avatar }} />
                ) : (
                  <Avatar.Fallback backgroundColor="$primary" justifyContent="center" alignItems="center">
                    <User size={48} color="white" />
                  </Avatar.Fallback>
                )}
              </Avatar>
              <YStack alignItems="center">
                <Text fontSize="$6" fontWeight="bold">{user?.name || 'User'}</Text>
                <Text color="$colorSecondary" textTransform="capitalize">
                  {user?.role || 'Staff'}
                </Text>
              </YStack>
            </YStack>
          </Card>

          {/* Profile Details */}
          <Card>
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="600" marginBottom="$1">Account Details</Text>

              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$backgroundPress" padding="$2" borderRadius="$2">
                  <Mail size={20} color="$colorSecondary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Email</Text>
                  <Text>{user?.email || 'Not set'}</Text>
                </YStack>
              </XStack>

              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$backgroundPress" padding="$2" borderRadius="$2">
                  <Phone size={20} color="$colorSecondary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Phone</Text>
                  <Text>{user?.phone || 'Not set'}</Text>
                </YStack>
              </XStack>

              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$backgroundPress" padding="$2" borderRadius="$2">
                  <MapPin size={20} color="$colorSecondary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Address</Text>
                  <Text>{user?.address || 'Not set'}</Text>
                </YStack>
              </XStack>

              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$backgroundPress" padding="$2" borderRadius="$2">
                  <Calendar size={20} color="$colorSecondary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$colorSecondary">Member Since</Text>
                  <Text>{user?.createdAt ? formatDate(user.createdAt, 'PPP') : 'N/A'}</Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Actions */}
          <YStack gap="$2">
            <Card pressable onPress={() => navigation.navigate('ChangePassword')}>
              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$primary" padding="$2" borderRadius="$2" opacity={0.9}>
                  <Lock size={20} color="white" />
                </YStack>
                <Text flex={1} fontWeight="500">Change Password</Text>
                <ChevronRight size={20} color="$colorSecondary" />
              </XStack>
            </Card>

            <Card pressable onPress={() => setLogoutModal(true)}>
              <XStack alignItems="center" gap="$3">
                <YStack backgroundColor="$error" padding="$2" borderRadius="$2" opacity={0.9}>
                  <LogOut size={20} color="white" />
                </YStack>
                <Text flex={1} fontWeight="500" color="$error">Log Out</Text>
                <ChevronRight size={20} color="$colorSecondary" />
              </XStack>
            </Card>
          </YStack>
        </YStack>
      </ScrollView>

      <ConfirmModal
        visible={logoutModal}
        onClose={() => setLogoutModal(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        confirmVariant="danger"
      />
    </YStack>
  );
}
