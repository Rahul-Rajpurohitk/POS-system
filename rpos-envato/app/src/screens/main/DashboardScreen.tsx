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
  Calendar,
  Clock,
  ChevronRight,
  Activity,
  Zap,
} from '@tamagui/lucide-icons';
import { Card, CardHeader, Button, Badge } from '@/components/ui';
import { useSettingsStore, useAuthStore } from '@/store';
import { formatCurrency, formatDate } from '@/utils';
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

// Color schemes for stat cards
const STAT_COLORS = [
  { accent: '#4F46E5', light: '#EEF2FF' }, // Indigo
  { accent: '#0EA5E9', light: '#ECFEFF' }, // Cyan
  { accent: '#10B981', light: '#ECFDF5' }, // Emerald
  { accent: '#F59E0B', light: '#FEF3C7' }, // Amber
];

// Enhanced dashboard stat card
function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  colorIndex = 0,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  colorIndex?: number;
}) {
  const colors = STAT_COLORS[colorIndex % STAT_COLORS.length];

  return (
    <YStack
      flex={1}
      minWidth={150}
      backgroundColor="$cardBackground"
      borderRadius="$4"
      overflow="hidden"
      elevation={2}
      shadowColor="rgba(0,0,0,0.1)"
      shadowOffset={{ width: 0, height: 4 }}
      shadowRadius={12}
    >
      {/* Colored accent bar */}
      <YStack height={4} backgroundColor={colors.accent} />
      <YStack padding="$4" gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$2" flex={1}>
            <Text fontSize="$2" color="$colorSecondary" textTransform="uppercase" letterSpacing={0.5}>
              {title}
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$color">
              {value}
            </Text>
          </YStack>
          <YStack
            backgroundColor={colors.light}
            padding="$3"
            borderRadius="$3"
          >
            {React.cloneElement(icon as React.ReactElement, { color: colors.accent })}
          </YStack>
        </XStack>
        {trend && (
          <XStack
            alignItems="center"
            gap="$2"
            backgroundColor={trendUp ? '$successBackground' : '$errorBackground'}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignSelf="flex-start"
          >
            {trendUp ? (
              <ArrowUpRight size={14} color="$success" />
            ) : (
              <ArrowDownRight size={14} color="$error" />
            )}
            <Text fontSize="$2" fontWeight="600" color={trendUp ? '$success' : '$error'}>
              {trend}
            </Text>
          </XStack>
        )}
      </YStack>
    </YStack>
  );
}

// Enhanced quick action button with hover effect
function QuickAction({
  title,
  subtitle,
  icon,
  onPress,
  accentColor = '#4F46E5',
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
  accentColor?: string;
}) {
  return (
    <YStack
      flex={1}
      minWidth={140}
      backgroundColor="$cardBackground"
      borderRadius="$4"
      padding="$4"
      gap="$3"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={onPress}
      cursor="pointer"
      borderWidth={1}
      borderColor="$borderColor"
      hoverStyle={{ borderColor: accentColor, backgroundColor: '$backgroundHover' }}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <YStack
          backgroundColor={`${accentColor}15`}
          padding="$3"
          borderRadius="$3"
        >
          {React.cloneElement(icon as React.ReactElement, { size: 24, color: accentColor })}
        </YStack>
        <ChevronRight size={18} color="$colorSecondary" />
      </XStack>
      <YStack gap="$1">
        <Text fontSize="$4" fontWeight="600" color="$color">{title}</Text>
        {subtitle && (
          <Text fontSize="$2" color="$colorSecondary">{subtitle}</Text>
        )}
      </YStack>
    </YStack>
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
      icon: <DollarSign size={24} />,
      trend: sales?.comparisonPeriod?.percentChange && currentPeriodConfig.comparisonLabel
        ? `${sales.comparisonPeriod.percentChange > 0 ? '+' : ''}${sales.comparisonPeriod.percentChange.toFixed(1)}% ${currentPeriodConfig.comparisonLabel}`
        : undefined,
      trendUp: (sales?.comparisonPeriod?.percentChange ?? 0) > 0,
      colorIndex: 0,
    },
    {
      title: 'Orders',
      value: String(sales?.totalOrders ?? 0),
      icon: <ShoppingCart size={24} />,
      colorIndex: 1,
    },
    {
      title: 'Products',
      value: String(productCount),
      icon: <Package size={24} />,
      colorIndex: 2,
    },
    {
      title: 'Customers',
      value: String(customerCount),
      icon: <Users size={24} />,
      colorIndex: 3,
    },
  ];

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$5">
        {/* Header with gradient background */}
        <YStack
          backgroundColor="$cardBackground"
          marginHorizontal="$-4"
          marginTop="$-4"
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom="$5"
          borderBottomLeftRadius="$6"
          borderBottomRightRadius="$6"
          elevation={1}
          shadowColor="rgba(0,0,0,0.05)"
          shadowOffset={{ width: 0, height: 2 }}
          shadowRadius={8}
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack gap="$1">
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$3" color="$colorSecondary">
                  Welcome back,
                </Text>
                <YStack
                  width={8}
                  height={8}
                  borderRadius="$full"
                  backgroundColor="$success"
                />
              </XStack>
              <Text fontSize="$8" fontWeight="800" color="$color">
                {user?.firstName || 'User'} {user?.lastName?.charAt(0) || ''}.
              </Text>
              <Text fontSize="$2" color="$colorSecondary">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </YStack>
            <YStack
              backgroundColor="$backgroundPress"
              padding="$2"
              borderRadius="$3"
              pressStyle={{ scale: 0.95 }}
              onPress={() => refetchDashboard()}
              disabled={isLoading}
              cursor="pointer"
            >
              {isLoading ? (
                <Spinner size="small" color="$primary" />
              ) : (
                <RefreshCw size={22} color="$primary" />
              )}
            </YStack>
          </XStack>

          {/* Period Selector - Pill Style */}
          <XStack
            gap="$2"
            flexWrap="wrap"
            marginTop="$4"
            backgroundColor="$background"
            padding="$1"
            borderRadius="$3"
          >
            {PERIOD_OPTIONS.map((period) => (
              <YStack
                key={period.value}
                flex={1}
                backgroundColor={selectedPeriod === period.value ? '$primary' : 'transparent'}
                paddingVertical="$2"
                paddingHorizontal="$3"
                borderRadius="$2"
                alignItems="center"
                onPress={() => setSelectedPeriod(period.value)}
                cursor="pointer"
                pressStyle={{ opacity: 0.8 }}
              >
                <Text
                  fontSize="$2"
                  fontWeight={selectedPeriod === period.value ? '600' : '400'}
                  color={selectedPeriod === period.value ? 'white' : '$colorSecondary'}
                >
                  {period.label}
                </Text>
              </YStack>
            ))}
          </XStack>
        </YStack>

        {/* Stats Grid */}
        <YStack gap="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$2" alignItems="center">
              <Activity size={20} color="$primary" />
              <Text fontSize="$5" fontWeight="700" color="$color">Overview</Text>
            </XStack>
            <Badge variant="info" size="sm">Live</Badge>
          </XStack>
          <XStack flexWrap="wrap" gap="$3">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} colorIndex={stat.colorIndex} />
            ))}
          </XStack>
        </YStack>

        {/* Quick Actions */}
        <YStack gap="$4">
          <XStack gap="$2" alignItems="center">
            <Zap size={20} color="$warning" />
            <Text fontSize="$5" fontWeight="700" color="$color">Quick Actions</Text>
          </XStack>
          <XStack flexWrap="wrap" gap="$3">
            <QuickAction
              title="New Sale"
              subtitle="Start a transaction"
              icon={<ShoppingCart />}
              onPress={() => navigation.navigate('POS')}
              accentColor="#4F46E5"
            />
            <QuickAction
              title="Add Product"
              subtitle="Expand inventory"
              icon={<Package />}
              onPress={() => navigation.navigate('Products', { screen: 'AddProduct' })}
              accentColor="#10B981"
            />
            <QuickAction
              title="View Orders"
              subtitle="Track sales"
              icon={<TrendingUp />}
              onPress={() => navigation.navigate('Orders', { screen: 'OrderList' })}
              accentColor="#0EA5E9"
            />
            <QuickAction
              title="Customers"
              subtitle="Manage clients"
              icon={<Users />}
              onPress={() => navigation.navigate('More', { screen: 'Customers' })}
              accentColor="#F59E0B"
            />
          </XStack>
        </YStack>

        {/* Recent Activity */}
        <YStack
          backgroundColor="$cardBackground"
          borderRadius="$4"
          overflow="hidden"
          elevation={2}
          shadowColor="rgba(0,0,0,0.08)"
          shadowOffset={{ width: 0, height: 2 }}
          shadowRadius={8}
        >
          {/* Header */}
          <XStack
            padding="$4"
            justifyContent="space-between"
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <XStack gap="$2" alignItems="center">
              <Clock size={20} color="$primary" />
              <YStack>
                <Text fontSize="$4" fontWeight="700" color="$color">Recent Orders</Text>
                <Text fontSize="$2" color="$colorSecondary">Last 5 transactions</Text>
              </YStack>
            </XStack>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('Orders', { screen: 'OrderList' })}
            >
              <Text fontSize="$2" color="$primary">View All</Text>
              <ChevronRight size={16} color="$primary" />
            </Button>
          </XStack>

          {/* Orders List */}
          <YStack>
            {ordersLoading ? (
              <YStack alignItems="center" padding="$6">
                <Spinner size="small" color="$primary" />
                <Text fontSize="$2" color="$colorSecondary" marginTop="$2">Loading orders...</Text>
              </YStack>
            ) : recentOrders.length === 0 ? (
              <YStack alignItems="center" padding="$6" gap="$2">
                <ShoppingCart size={40} color="$colorSecondary" opacity={0.5} />
                <Text color="$colorSecondary">No orders yet</Text>
                <Button variant="primary" size="sm" onPress={() => navigation.navigate('POS')}>
                  <Text color="white" fontSize="$2">Create First Order</Text>
                </Button>
              </YStack>
            ) : (
              recentOrders.map((order, index) => (
                <XStack
                  key={order.id}
                  justifyContent="space-between"
                  alignItems="center"
                  paddingVertical="$3"
                  paddingHorizontal="$4"
                  borderBottomWidth={index < recentOrders.length - 1 ? 1 : 0}
                  borderBottomColor="$borderColor"
                  hoverStyle={{ backgroundColor: '$backgroundHover' }}
                  pressStyle={{ backgroundColor: '$backgroundPress' }}
                  cursor="pointer"
                  onPress={() => navigation.navigate('Orders', {
                    screen: 'OrderDetail',
                    params: { id: order.id }
                  })}
                >
                  <XStack gap="$3" alignItems="center" flex={1}>
                    <YStack
                      width={40}
                      height={40}
                      backgroundColor="$primary"
                      borderRadius="$2"
                      justifyContent="center"
                      alignItems="center"
                      opacity={0.9}
                    >
                      <Text fontSize="$2" fontWeight="700" color="white">
                        #{String(order.orderNumber).slice(-2)}
                      </Text>
                    </YStack>
                    <YStack flex={1}>
                      <Text fontWeight="600" color="$color">Order #{order.orderNumber}</Text>
                      <XStack gap="$2" alignItems="center">
                        <Text fontSize="$2" color="$colorSecondary">
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                        </Text>
                        <Text fontSize="$1" color="$colorSecondary">•</Text>
                        <Text fontSize="$2" color="$colorSecondary">
                          {formatDate(order.createdAt, 'MMM d, h:mm a')}
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize="$4" fontWeight="700" color="$success">
                      {formatCurrency(order.total, settings.currency)}
                    </Text>
                    <Badge variant="success" size="sm">Completed</Badge>
                  </YStack>
                </XStack>
              ))
            )}
          </YStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
