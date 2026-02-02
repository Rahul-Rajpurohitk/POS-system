/**
 * EarningsScreen - Driver earnings dashboard
 *
 * Features:
 * - Daily/weekly/monthly earnings overview
 * - Visual charts and graphs
 * - Detailed earnings breakdown
 * - Payout history
 * - Tips tracking
 */

import React, { useState, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Truck,
  Star,
  ChevronRight,
  Zap,
  Gift,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useDriverStore } from '@/store/driverStore';
import { useDriverStats, useDriverEarnings } from '@/features/driver/hooks';
import { formatDuration } from '@/hooks';
import type { DriverTabScreenProps } from '@/navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Period options
type Period = 'today' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

// Simple bar chart component
function EarningsChart({
  data,
  period,
}: {
  data: Array<{ label: string; value: number }>;
  period: Period;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <XStack height={120} alignItems="flex-end" gap="$2" paddingTop="$4">
      {data.map((item, index) => {
        const height = (item.value / maxValue) * 100;
        const isToday = period === 'week' && index === data.length - 1;

        return (
          <YStack key={index} flex={1} alignItems="center" gap="$1">
            <Text fontSize={10} color="$colorSecondary">
              ${item.value.toFixed(0)}
            </Text>
            <YStack
              height={Math.max(height, 4)}
              width="100%"
              backgroundColor={isToday ? '$primary' : '$primaryBackground'}
              borderRadius="$2"
            />
            <Text fontSize={10} color={isToday ? '$primary' : '$colorSecondary'}>
              {item.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}

// Stat card component
function StatCard({
  icon,
  label,
  value,
  subValue,
  trend,
  color = '$primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  return (
    <Card flex={1} padding="$3">
      <XStack alignItems="center" gap="$2" marginBottom="$2">
        <YStack
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={`${color}Background`}
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
        {trend && (
          <YStack
            paddingHorizontal="$1"
            paddingVertical="$0.5"
            backgroundColor={trend === 'up' ? '$successBackground' : trend === 'down' ? '$errorBackground' : '$backgroundPress'}
            borderRadius="$1"
          >
            {trend === 'up' ? (
              <ArrowUpRight size={12} color="$success" />
            ) : trend === 'down' ? (
              <ArrowDownRight size={12} color="$error" />
            ) : null}
          </YStack>
        )}
      </XStack>
      <Text fontSize={22} fontWeight="bold">
        {value}
      </Text>
      <Text fontSize={12} color="$colorSecondary">
        {label}
      </Text>
      {subValue && (
        <Text fontSize={11} color="$colorSecondary" marginTop="$1">
          {subValue}
        </Text>
      )}
    </Card>
  );
}

// Earnings breakdown row
function BreakdownRow({
  icon,
  label,
  amount,
  isSubtract = false,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  isSubtract?: boolean;
}) {
  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="$2"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <XStack alignItems="center" gap="$2">
        {icon}
        <Text fontSize={14}>{label}</Text>
      </XStack>
      <Text
        fontSize={14}
        fontWeight="500"
        color={isSubtract ? '$error' : '$success'}
      >
        {isSubtract ? '-' : '+'}${amount.toFixed(2)}
      </Text>
    </XStack>
  );
}

// Recent payout card
function PayoutCard({
  date,
  amount,
  status,
}: {
  date: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
}) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '$warningBackground', text: '$warning' },
    completed: { bg: '$successBackground', text: '$success' },
    failed: { bg: '$errorBackground', text: '$error' },
  };

  const colors = statusColors[status];

  return (
    <Card padding="$3" marginBottom="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <Text fontSize={15} fontWeight="600">
            ${amount.toFixed(2)}
          </Text>
          <Text fontSize={12} color="$colorSecondary">
            {new Date(date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </YStack>
        <XStack alignItems="center" gap="$2">
          <YStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            backgroundColor={colors.bg}
            borderRadius="$2"
          >
            <Text fontSize={11} fontWeight="600" color={colors.text} textTransform="capitalize">
              {status}
            </Text>
          </YStack>
          <ChevronRight size={16} color="$colorSecondary" />
        </XStack>
      </XStack>
    </Card>
  );
}

export default function EarningsScreen({
  navigation,
}: DriverTabScreenProps<'DriverProfile'>) {
  const [period, setPeriod] = useState<Period>('today');
  const { stats } = useDriverStore();
  const { data: driverStats, isLoading: statsLoading } = useDriverStats();
  const { data: earnings, isLoading: earningsLoading } = useDriverEarnings(period);

  // Mock chart data based on period
  const chartData = useMemo(() => {
    if (period === 'today') {
      return [
        { label: '9AM', value: 12 },
        { label: '11AM', value: 25 },
        { label: '1PM', value: 45 },
        { label: '3PM', value: 30 },
        { label: '5PM', value: 55 },
        { label: '7PM', value: 40 },
        { label: 'Now', value: earnings?.total || 0 },
      ];
    }
    if (period === 'week') {
      return [
        { label: 'Mon', value: 85 },
        { label: 'Tue', value: 110 },
        { label: 'Wed', value: 95 },
        { label: 'Thu', value: 125 },
        { label: 'Fri', value: 150 },
        { label: 'Sat', value: 180 },
        { label: 'Today', value: earnings?.total || 0 },
      ];
    }
    // Month
    return [
      { label: 'W1', value: 450 },
      { label: 'W2', value: 520 },
      { label: 'W3', value: 480 },
      { label: 'W4', value: earnings?.total || 0 },
    ];
  }, [period, earnings]);

  // Use mock data if no API data
  const displayEarnings = earnings || {
    total: stats?.earningsToday || 125.50,
    deliveryFees: 95.00,
    tips: 30.50,
    bonuses: 0,
    deductions: 0,
    deliveryCount: stats?.deliveriesToday || 8,
    activeTime: 6.5 * 3600, // 6.5 hours in seconds
    avgPerDelivery: 15.69,
  };

  const isLoading = statsLoading || earningsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
          <Text marginTop="$3" color="$colorSecondary">Loading earnings...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$4" gap="$4">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={24} fontWeight="bold">
              Earnings
            </Text>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                // Navigate to payout settings
              }}
            >
              <CreditCard size={16} />
              <Text marginLeft="$1" fontSize={12}>Payout</Text>
            </Button>
          </XStack>

          {/* Period Selector */}
          <XStack gap="$2">
            {PERIODS.map((p) => (
              <Button
                key={p.key}
                flex={1}
                size="md"
                variant={period === p.key ? 'primary' : 'secondary'}
                onPress={() => setPeriod(p.key)}
              >
                <Text
                  color={period === p.key ? 'white' : '$color'}
                  fontSize={13}
                  fontWeight="600"
                >
                  {p.label}
                </Text>
              </Button>
            ))}
          </XStack>

          {/* Main Earnings Card */}
          <Card padding="$4" backgroundColor="$primaryBackground">
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack>
                <Text fontSize={14} color="$colorSecondary">
                  Total Earnings
                </Text>
                <XStack alignItems="baseline" gap="$2" marginTop="$1">
                  <Text fontSize={36} fontWeight="bold" color="$primary">
                    ${displayEarnings.total.toFixed(2)}
                  </Text>
                  {period !== 'today' && (
                    <XStack
                      alignItems="center"
                      gap="$1"
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      backgroundColor="$successBackground"
                      borderRadius="$2"
                    >
                      <TrendingUp size={12} color="$success" />
                      <Text fontSize={11} color="$success" fontWeight="600">
                        +12%
                      </Text>
                    </XStack>
                  )}
                </XStack>
              </YStack>
              <YStack
                width={50}
                height={50}
                borderRadius={25}
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
              >
                <DollarSign size={24} color="white" />
              </YStack>
            </XStack>

            {/* Chart */}
            <EarningsChart data={chartData} period={period} />
          </Card>

          {/* Stats Grid */}
          <XStack gap="$3">
            <StatCard
              icon={<Truck size={16} color="$primary" />}
              label="Deliveries"
              value={displayEarnings.deliveryCount.toString()}
              subValue={`$${displayEarnings.avgPerDelivery.toFixed(2)} avg`}
              color="$primary"
            />
            <StatCard
              icon={<Clock size={16} color="$info" />}
              label="Active Time"
              value={formatDuration(displayEarnings.activeTime)}
              subValue={`$${((displayEarnings.total / displayEarnings.activeTime) * 3600).toFixed(2)}/hr`}
              color="$info"
            />
          </XStack>

          <XStack gap="$3">
            <StatCard
              icon={<Gift size={16} color="$success" />}
              label="Tips"
              value={`$${displayEarnings.tips.toFixed(2)}`}
              subValue={`${((displayEarnings.tips / displayEarnings.total) * 100).toFixed(0)}% of total`}
              trend="up"
              color="$success"
            />
            <StatCard
              icon={<Star size={16} color="$warning" />}
              label="Rating"
              value={driverStats?.averageRating?.toFixed(1) || '5.0'}
              subValue={`${driverStats?.totalRatings || 0} reviews`}
              color="$warning"
            />
          </XStack>

          {/* Earnings Breakdown */}
          <Card padding="$4">
            <Text fontSize={16} fontWeight="600" marginBottom="$3">
              Breakdown
            </Text>
            <YStack>
              <BreakdownRow
                icon={<Truck size={16} color="$primary" />}
                label="Delivery Fees"
                amount={displayEarnings.deliveryFees}
              />
              <BreakdownRow
                icon={<Gift size={16} color="$success" />}
                label="Tips"
                amount={displayEarnings.tips}
              />
              {displayEarnings.bonuses > 0 && (
                <BreakdownRow
                  icon={<Zap size={16} color="$warning" />}
                  label="Bonuses & Promotions"
                  amount={displayEarnings.bonuses}
                />
              )}
              {displayEarnings.deductions > 0 && (
                <BreakdownRow
                  icon={<DollarSign size={16} color="$error" />}
                  label="Deductions"
                  amount={displayEarnings.deductions}
                  isSubtract
                />
              )}
            </YStack>

            <XStack
              justifyContent="space-between"
              marginTop="$3"
              paddingTop="$3"
              borderTopWidth={2}
              borderTopColor="$borderColor"
            >
              <Text fontSize={16} fontWeight="bold">
                Net Earnings
              </Text>
              <Text fontSize={18} fontWeight="bold" color="$success">
                ${(displayEarnings.total - displayEarnings.deductions).toFixed(2)}
              </Text>
            </XStack>
          </Card>

          {/* Recent Payouts */}
          <YStack>
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontSize={16} fontWeight="600">
                Recent Payouts
              </Text>
              <Button size="sm" variant="ghost">
                <Text fontSize={12} color="$primary">View All</Text>
                <ChevronRight size={14} color="$primary" />
              </Button>
            </XStack>

            <PayoutCard
              date="2024-01-28"
              amount={845.50}
              status="completed"
            />
            <PayoutCard
              date="2024-01-21"
              amount={920.75}
              status="completed"
            />
            <PayoutCard
              date="2024-01-14"
              amount={780.25}
              status="completed"
            />
          </YStack>

          {/* Tips Card */}
          <Card padding="$4" backgroundColor="$successBackground">
            <XStack alignItems="center" gap="$3">
              <YStack
                width={44}
                height={44}
                borderRadius={22}
                backgroundColor="$success"
                alignItems="center"
                justifyContent="center"
              >
                <TrendingUp size={22} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="600">
                  Maximize Your Earnings
                </Text>
                <Text fontSize={12} color="$colorSecondary" marginTop="$1">
                  Peak hours: 11AM-2PM & 5PM-9PM. Work during these times to earn more!
                </Text>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
