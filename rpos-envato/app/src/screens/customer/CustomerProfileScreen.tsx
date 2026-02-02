import React from 'react';
import { YStack, XStack, Text, ScrollView, Avatar } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  MapPin,
  CreditCard,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  Heart,
  Gift,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import { useCustomerStore } from '@/store/customerStore';
import type { CustomerTabScreenProps } from '@/navigation/types';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  showChevron = true,
  danger = false,
}: MenuItemProps) {
  return (
    <XStack
      padding="$3"
      alignItems="center"
      justifyContent="space-between"
      pressStyle={{ backgroundColor: '$backgroundPress' }}
      onPress={onPress}
    >
      <XStack alignItems="center" gap="$3" flex={1}>
        {icon}
        <YStack flex={1}>
          <Text fontSize={15} color={danger ? '$error' : '$color'}>
            {label}
          </Text>
          {subtitle && (
            <Text fontSize={12} color="$colorSecondary" marginTop="$0.5">
              {subtitle}
            </Text>
          )}
        </YStack>
      </XStack>
      {showChevron && <ChevronRight size={20} color="$colorSecondary" />}
    </XStack>
  );
}

export default function CustomerProfileScreen({
  navigation,
}: CustomerTabScreenProps<'CustomerProfile'>) {
  const { user, logout } = useAuthStore();
  const { savedAddresses, clearCart } = useCustomerStore();

  const handleLogout = () => {
    clearCart();
    logout();
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$4" gap="$4">
          {/* Header */}
          <Text fontSize={24} fontWeight="bold">
            Profile
          </Text>

          {/* Profile Card */}
          <Card padding="$4">
            <XStack alignItems="center" gap="$4">
              <Avatar circular size="$6">
                {user?.avatar ? (
                  <Avatar.Image source={{ uri: user.avatar }} />
                ) : (
                  <Avatar.Fallback
                    backgroundColor="$primary"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="white" fontSize={20} fontWeight="bold">
                      {getInitials()}
                    </Text>
                  </Avatar.Fallback>
                )}
              </Avatar>

              <YStack flex={1}>
                <Text fontSize={18} fontWeight="bold">
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text fontSize={14} color="$colorSecondary">
                  {user?.email}
                </Text>
              </YStack>

              <Button variant="ghost" size="icon">
                <ChevronRight size={20} />
              </Button>
            </XStack>
          </Card>

          {/* Quick Stats */}
          <XStack gap="$3">
            <Card flex={1} padding="$3" alignItems="center">
              <Text fontSize={20} fontWeight="bold" color="$primary">
                0
              </Text>
              <Text fontSize={11} color="$colorSecondary">
                Orders
              </Text>
            </Card>
            <Card flex={1} padding="$3" alignItems="center">
              <Text fontSize={20} fontWeight="bold" color="$success">
                $0
              </Text>
              <Text fontSize={11} color="$colorSecondary">
                Saved
              </Text>
            </Card>
            <Card flex={1} padding="$3" alignItems="center">
              <Text fontSize={20} fontWeight="bold" color="#FFB800">
                0
              </Text>
              <Text fontSize={11} color="$colorSecondary">
                Points
              </Text>
            </Card>
          </XStack>

          {/* Account Settings */}
          <Card>
            <MenuItem
              icon={<User size={20} color="$colorSecondary" />}
              label="Edit Profile"
              onPress={() => {}}
            />
            <MenuItem
              icon={<MapPin size={20} color="$colorSecondary" />}
              label="Saved Addresses"
              subtitle={
                defaultAddress
                  ? `${savedAddresses.length} saved`
                  : 'Add your addresses'
              }
              onPress={() => {}}
            />
            <MenuItem
              icon={<CreditCard size={20} color="$colorSecondary" />}
              label="Payment Methods"
              subtitle="Add payment cards"
              onPress={() => {}}
            />
          </Card>

          {/* Preferences */}
          <Card>
            <MenuItem
              icon={<Heart size={20} color="$colorSecondary" />}
              label="Favorites"
              subtitle="Your saved items"
              onPress={() => {}}
            />
            <MenuItem
              icon={<Gift size={20} color="$colorSecondary" />}
              label="Promotions"
              subtitle="Coupons and deals"
              onPress={() => {}}
            />
            <MenuItem
              icon={<Bell size={20} color="$colorSecondary" />}
              label="Notifications"
              onPress={() => {}}
            />
          </Card>

          {/* Support */}
          <Card>
            <MenuItem
              icon={<HelpCircle size={20} color="$colorSecondary" />}
              label="Help & Support"
              onPress={() => {}}
            />
            <MenuItem
              icon={<Settings size={20} color="$colorSecondary" />}
              label="App Settings"
              onPress={() => {}}
            />
          </Card>

          {/* Logout */}
          <Card>
            <MenuItem
              icon={<LogOut size={20} color="$error" />}
              label="Log Out"
              onPress={handleLogout}
              showChevron={false}
              danger
            />
          </Card>

          {/* Version Info */}
          <YStack alignItems="center" paddingVertical="$4">
            <Text fontSize={12} color="$colorSecondary">
              Customer App v1.0.0
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
