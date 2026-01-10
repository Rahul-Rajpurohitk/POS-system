import React from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from '@tamagui/lucide-icons';
import { Card, CardHeader, Button } from '@/components/ui';
import { useSettingsStore, useAuthStore } from '@/store';
import { formatCurrency } from '@/utils';
import { usePlatform } from '@/hooks';
import type { MainTabScreenProps } from '@/navigation/types';

// Dashboard stat card
function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card flex={1} minWidth={150}>
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$2">
          <Text fontSize="$3" color="$colorSecondary">{title}</Text>
          <Text fontSize="$6" fontWeight="bold" color="$color">{value}</Text>
          {trend && (
            <XStack alignItems="center" gap="$1">
              {trendUp ? (
                <ArrowUpRight size={14} color="$success" />
              ) : (
                <ArrowDownRight size={14} color="$error" />
              )}
              <Text fontSize="$2" color={trendUp ? '$success' : '$error'}>
                {trend}
              </Text>
            </XStack>
          )}
        </YStack>
        <YStack
          backgroundColor="$primary"
          padding="$2"
          borderRadius="$2"
          opacity={0.9}
        >
          {icon}
        </YStack>
      </XStack>
    </Card>
  );
}

// Quick action button
function QuickAction({
  title,
  icon,
  onPress
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Card pressable onPress={onPress} flex={1} minWidth={100} alignItems="center" padding="$4">
      <YStack alignItems="center" gap="$2">
        <YStack backgroundColor="$backgroundPress" padding="$3" borderRadius="$full">
          {icon}
        </YStack>
        <Text fontSize="$3" fontWeight="500" textAlign="center">{title}</Text>
      </YStack>
    </Card>
  );
}

export default function DashboardScreen({ navigation }: MainTabScreenProps<'Dashboard'>) {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const { isTablet } = usePlatform();

  const stats = [
    {
      title: 'Today Sales',
      value: formatCurrency(12500, settings.currency),
      icon: <DollarSign size={20} color="white" />,
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: 'Orders',
      value: '48',
      icon: <ShoppingCart size={20} color="white" />,
      trend: '+8.2%',
      trendUp: true,
    },
    {
      title: 'Products',
      value: '156',
      icon: <Package size={20} color="white" />,
    },
    {
      title: 'Customers',
      value: '89',
      icon: <Users size={20} color="white" />,
      trend: '+5.1%',
      trendUp: true,
    },
  ];

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$5">
        {/* Header */}
        <YStack gap="$1">
          <Text fontSize="$3" color="$colorSecondary">
            Welcome back,
          </Text>
          <Text fontSize="$7" fontWeight="bold" color="$color">
            {user?.firstName || 'User'}
          </Text>
        </YStack>

        {/* Stats Grid */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">Overview</Text>
          <XStack flexWrap="wrap" gap="$3">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </XStack>
        </YStack>

        {/* Quick Actions */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">Quick Actions</Text>
          <XStack flexWrap="wrap" gap="$3">
            <QuickAction
              title="New Sale"
              icon={<ShoppingCart size={24} color="$primary" />}
              onPress={() => navigation.navigate('POS')}
            />
            <QuickAction
              title="Add Product"
              icon={<Package size={24} color="$primary" />}
              onPress={() => navigation.navigate('Products', { screen: 'AddProduct' })}
            />
            <QuickAction
              title="View Orders"
              icon={<TrendingUp size={24} color="$primary" />}
              onPress={() => navigation.navigate('Orders', { screen: 'OrderList' })}
            />
            <QuickAction
              title="Customers"
              icon={<Users size={24} color="$primary" />}
              onPress={() => navigation.navigate('More', { screen: 'Customers' })}
            />
          </XStack>
        </YStack>

        {/* Recent Activity */}
        <Card>
          <CardHeader title="Recent Orders" subtitle="Last 5 orders" />
          <YStack gap="$2">
            {[1, 2, 3, 4, 5].map((i) => (
              <XStack
                key={i}
                justifyContent="space-between"
                alignItems="center"
                paddingVertical="$2"
                borderBottomWidth={i < 5 ? 1 : 0}
                borderBottomColor="$borderColor"
              >
                <YStack>
                  <Text fontWeight="500">Order #{1000 + i}</Text>
                  <Text fontSize="$2" color="$colorSecondary">2 items</Text>
                </YStack>
                <Text fontWeight="600" color="$accent">
                  {formatCurrency(Math.random() * 100 + 20, settings.currency)}
                </Text>
              </XStack>
            ))}
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
