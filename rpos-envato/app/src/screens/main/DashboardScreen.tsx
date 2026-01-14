import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar
} from '@tamagui/lucide-icons';
import { Card, CardHeader, Button } from '@/components/ui';
import { useSettingsStore, useAuthStore } from '@/store';
import { formatCurrency } from '@/utils';
import { usePlatform } from '@/hooks';
import { get } from '@/services/api/client';
import type { MainTabScreenProps } from '@/navigation/types';

// Period options for analytics
type PeriodOption = 'today' | 'this_week' | 'this_month' | 'all_time';

const PERIOD_OPTIONS: { value: PeriodOption; label: string; comparisonLabel: string }[] = [
  { value: 'today', label: 'Today', comparisonLabel: 'vs yesterday' },
  { value: 'this_week', label: 'This Week', comparisonLabel: 'vs last week' },
  { value: 'this_month', label: 'This Month', comparisonLabel: 'vs last month' },
  { value: 'all_time', label: 'All Time', comparisonLabel: '' },
];

// API response types
interface DashboardData {
  success: boolean;
  data: {
    sales: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      comparisonPeriod?: {
        percentChange: number;
      };
    };
    orders: {
      totalOrders: number;
      completedOrders: number;
    };
  };
}

interface RecentOrdersData {
  success: boolean;
  data: Array<{
    id: string;
    orderNumber: string;
    total: number;
    itemCount: number;
    createdAt: string;
  }>;
}

interface CountsData {
  success: boolean;
  data: {
    total: number;
  };
}

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
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('this_week');

  const currentPeriodConfig = PERIOD_OPTIONS.find(p => p.value === selectedPeriod) || PERIOD_OPTIONS[1];

  // Fetch dashboard analytics based on selected period
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard', selectedPeriod],
    queryFn: () => get<DashboardData>(`/analytics/dashboard?period=${selectedPeriod}`),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch recent orders
  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['recentOrders'],
    queryFn: () => get<RecentOrdersData>('/analytics/recent-orders?limit=5'),
    staleTime: 1000 * 60 * 2,
  });

  // Fetch product count
  const { data: productsData } = useQuery({
    queryKey: ['productsCount'],
    queryFn: () => get<CountsData>('/products/count'),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch customer count
  const { data: customersData } = useQuery({
    queryKey: ['customersCount'],
    queryFn: () => get<CountsData>('/customers/count'),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = dashboardLoading || ordersLoading;
  const sales = dashboardData?.data?.sales;
  const recentOrders = recentOrdersData?.data || [];
  const productCount = productsData?.data?.total ?? 0;
  const customerCount = customersData?.data?.total ?? 0;

  const stats = [
    {
      title: `${currentPeriodConfig.label} Sales`,
      value: formatCurrency(sales?.totalRevenue ?? 0, settings.currency),
      icon: <DollarSign size={20} color="white" />,
      trend: sales?.comparisonPeriod?.percentChange && currentPeriodConfig.comparisonLabel
        ? `${sales.comparisonPeriod.percentChange > 0 ? '+' : ''}${sales.comparisonPeriod.percentChange.toFixed(1)}% ${currentPeriodConfig.comparisonLabel}`
        : undefined,
      trendUp: (sales?.comparisonPeriod?.percentChange ?? 0) > 0,
    },
    {
      title: 'Orders',
      value: String(sales?.totalOrders ?? 0),
      icon: <ShoppingCart size={20} color="white" />,
    },
    {
      title: 'Products',
      value: String(productCount),
      icon: <Package size={20} color="white" />,
    },
    {
      title: 'Customers',
      value: String(customerCount),
      icon: <Users size={20} color="white" />,
    },
  ];

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1">
            <Text fontSize="$3" color="$colorSecondary">
              Welcome back,
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$color">
              {user?.firstName || 'User'}
            </Text>
          </YStack>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => refetchDashboard()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner size="small" color="$primary" />
            ) : (
              <RefreshCw size={20} color="$primary" />
            )}
          </Button>
        </XStack>

        {/* Period Selector */}
        <XStack gap="$2" flexWrap="wrap">
          {PERIOD_OPTIONS.map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => setSelectedPeriod(period.value)}
            >
              <Calendar size={14} color={selectedPeriod === period.value ? 'white' : '$colorSecondary'} />
              <Text
                fontSize="$2"
                color={selectedPeriod === period.value ? 'white' : '$color'}
              >
                {period.label}
              </Text>
            </Button>
          ))}
        </XStack>

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
            {ordersLoading ? (
              <YStack alignItems="center" padding="$4">
                <Spinner size="small" color="$primary" />
              </YStack>
            ) : recentOrders.length === 0 ? (
              <YStack alignItems="center" padding="$4">
                <Text color="$colorSecondary">No orders yet</Text>
              </YStack>
            ) : (
              recentOrders.map((order, index) => (
                <XStack
                  key={order.id}
                  justifyContent="space-between"
                  alignItems="center"
                  paddingVertical="$2"
                  borderBottomWidth={index < recentOrders.length - 1 ? 1 : 0}
                  borderBottomColor="$borderColor"
                >
                  <YStack>
                    <Text fontWeight="500">Order #{order.orderNumber}</Text>
                    <Text fontSize="$2" color="$colorSecondary">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </Text>
                  </YStack>
                  <Text fontWeight="600" color="$accent">
                    {formatCurrency(order.total, settings.currency)}
                  </Text>
                </XStack>
              ))
            )}
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
