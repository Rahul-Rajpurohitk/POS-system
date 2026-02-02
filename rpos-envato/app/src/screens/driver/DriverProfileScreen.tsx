import React from 'react';
import { YStack, XStack, Text, ScrollView, Avatar, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Star,
  Package,
  Clock,
  Car,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { DriverStatsCard } from '@/components/driver';
import { useAuthStore } from '@/store';
import { useDriverStore } from '@/store/driverStore';
import { useDriverProfile, useDriverStats } from '@/features/driver/hooks';
import type { DriverTabScreenProps } from '@/navigation/types';
import { VEHICLE_TYPE_NAMES, VEHICLE_TYPE_ICONS } from '@/types';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function MenuItem({
  icon,
  label,
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
      <XStack alignItems="center" gap="$3">
        {icon}
        <Text fontSize={15} color={danger ? '$error' : '$color'}>
          {label}
        </Text>
      </XStack>
      {showChevron && <ChevronRight size={20} color="$colorSecondary" />}
    </XStack>
  );
}

export default function DriverProfileScreen({
  navigation,
}: DriverTabScreenProps<'DriverProfile'>) {
  const { user, logout } = useAuthStore();
  const { profile, clearProfile } = useDriverStore();

  const { data: driverProfile, isLoading: profileLoading } = useDriverProfile();
  const { data: stats, isLoading: statsLoading } = useDriverStats();

  const handleLogout = () => {
    clearProfile();
    logout();
  };

  const currentProfile = driverProfile || profile;
  const isLoading = profileLoading || statsLoading;

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const getVehicleIcon = () => {
    if (!currentProfile?.vehicleType) return <Car size={16} color="$colorSecondary" />;
    // Return appropriate icon based on vehicle type
    return <Car size={16} color="$colorSecondary" />;
  };

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

                {currentProfile && (
                  <XStack marginTop="$2" gap="$3">
                    <XStack alignItems="center" gap="$1">
                      {getVehicleIcon()}
                      <Text fontSize={12} color="$colorSecondary">
                        {VEHICLE_TYPE_NAMES[currentProfile.vehicleType]}
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap="$1">
                      <Star size={14} color="#FFB800" />
                      <Text fontSize={12} color="$colorSecondary">
                        {currentProfile.averageRating.toFixed(1)}
                      </Text>
                    </XStack>
                  </XStack>
                )}
              </YStack>
            </XStack>
          </Card>

          {/* Quick Stats */}
          {currentProfile && (
            <XStack gap="$3">
              <Card flex={1} padding="$3" alignItems="center">
                <Package size={24} color="$primary" />
                <Text fontSize={20} fontWeight="bold" marginTop="$1">
                  {currentProfile.totalDeliveries}
                </Text>
                <Text fontSize={11} color="$colorSecondary">
                  Total Deliveries
                </Text>
              </Card>

              <Card flex={1} padding="$3" alignItems="center">
                <Star size={24} color="#FFB800" />
                <Text fontSize={20} fontWeight="bold" marginTop="$1">
                  {currentProfile.averageRating.toFixed(1)}
                </Text>
                <Text fontSize={11} color="$colorSecondary">
                  Rating ({currentProfile.totalRatings})
                </Text>
              </Card>

              <Card flex={1} padding="$3" alignItems="center">
                <Clock size={24} color="$success" />
                <Text fontSize={20} fontWeight="bold" marginTop="$1">
                  {currentProfile.deliveriesToday}
                </Text>
                <Text fontSize={11} color="$colorSecondary">
                  Today
                </Text>
              </Card>
            </XStack>
          )}

          {/* Detailed Stats */}
          {stats && (
            <YStack>
              <Text fontSize={16} fontWeight="600" marginBottom="$2">
                Performance
              </Text>
              <DriverStatsCard stats={stats} showEarnings />
            </YStack>
          )}

          {/* Menu Items */}
          <Card>
            <MenuItem
              icon={<User size={20} color="$colorSecondary" />}
              label="Edit Profile"
              onPress={() => {}}
            />
            <MenuItem
              icon={<Car size={20} color="$colorSecondary" />}
              label="Vehicle Settings"
              onPress={() => {}}
            />
            <MenuItem
              icon={<Bell size={20} color="$colorSecondary" />}
              label="Notifications"
              onPress={() => {}}
            />
            <MenuItem
              icon={<Shield size={20} color="$colorSecondary" />}
              label="Privacy & Security"
              onPress={() => {}}
            />
          </Card>

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
              Driver App v1.0.0
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
