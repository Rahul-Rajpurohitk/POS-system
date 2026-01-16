import React from 'react';
import { YStack, XStack, Text, ScrollView, Avatar } from 'tamagui';
import {
  User, Ticket, Users, BarChart3, Settings, HelpCircle,
  ChevronRight, LogOut, TrendingUp
} from '@tamagui/lucide-icons';
import { Button, Card, ConfirmModal } from '@/components/ui';
import { useAuthStore } from '@/store';
import type { MoreScreenProps } from '@/navigation/types';

interface MenuItem {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  route: string;
  color?: string;
}

const menuItems: MenuItem[] = [
  {
    icon: <Ticket size={24} color="white" />,
    title: 'Coupons',
    subtitle: 'Manage discounts and promotions',
    route: 'Coupons',
  },
  {
    icon: <Users size={24} color="white" />,
    title: 'Customers',
    subtitle: 'Customer database and loyalty',
    route: 'Customers',
  },
  {
    icon: <TrendingUp size={24} color="white" />,
    title: 'Analytics',
    subtitle: 'Advanced insights and forecasting',
    route: 'AnalyticsDashboard',
    color: '$success',
  },
  {
    icon: <BarChart3 size={24} color="white" />,
    title: 'Reports',
    subtitle: 'Sales reports and summaries',
    route: 'Reports',
  },
  {
    icon: <Settings size={24} color="white" />,
    title: 'Settings',
    subtitle: 'App preferences and configuration',
    route: 'Settings',
  },
  {
    icon: <HelpCircle size={24} color="white" />,
    title: 'Help & Support',
    subtitle: 'FAQs and contact support',
    route: 'Help',
  },
];

export default function MoreMenuScreen({ navigation }: MoreScreenProps<'MoreMenu'>) {
  const { user, logout } = useAuthStore();
  const [logoutModal, setLogoutModal] = React.useState(false);

  const handleMenuPress = (route: string) => {
    if (route === 'Help') {
      // TODO: Open help/support
      console.log('Open help');
      return;
    }
    navigation.navigate(route as any);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack
        padding="$4"
        alignItems="center"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Text fontSize="$6" fontWeight="bold">More</Text>
      </XStack>

      <ScrollView flex={1}>
        <YStack padding="$4" gap="$4">
          {/* Profile Card */}
          <Card pressable onPress={() => navigation.navigate('Profile')}>
            <XStack alignItems="center" gap="$3">
              <Avatar circular size="$5" backgroundColor="$primary">
                {user?.avatar ? (
                  <Avatar.Image source={{ uri: user.avatar }} />
                ) : (
                  <Avatar.Fallback backgroundColor="$primary" justifyContent="center" alignItems="center">
                    <User size={28} color="white" />
                  </Avatar.Fallback>
                )}
              </Avatar>
              <YStack flex={1}>
                <Text fontSize="$5" fontWeight="600">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}</Text>
                <Text fontSize="$2" color="$colorSecondary">{user?.email || 'View profile'}</Text>
              </YStack>
              <ChevronRight size={24} color="$colorSecondary" />
            </XStack>
          </Card>

          {/* Menu Items */}
          <YStack gap="$2">
            {menuItems.map((item, index) => (
              <Card key={index} pressable onPress={() => handleMenuPress(item.route)}>
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor={item.color || '$primary'}
                    padding="$2"
                    borderRadius="$2"
                    opacity={0.9}
                  >
                    {item.icon}
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="500">{item.title}</Text>
                    <Text fontSize="$2" color="$colorSecondary">{item.subtitle}</Text>
                  </YStack>
                  <ChevronRight size={20} color="$colorSecondary" />
                </XStack>
              </Card>
            ))}
          </YStack>

          {/* Logout */}
          <Card pressable onPress={() => setLogoutModal(true)}>
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$error" padding="$2" borderRadius="$2" opacity={0.9}>
                <LogOut size={24} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="500" color="$error">Log Out</Text>
                <Text fontSize="$2" color="$colorSecondary">Sign out of your account</Text>
              </YStack>
            </XStack>
          </Card>

          {/* App Version */}
          <YStack alignItems="center" paddingVertical="$4">
            <Text fontSize="$2" color="$colorSecondary">POS Universal v2.0.0</Text>
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
