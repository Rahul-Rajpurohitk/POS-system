import React, { useState, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import {
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
} from '@tamagui/lucide-icons';
import { Card, CardHeader } from '@/components/ui';
import { HorizontalBarChart, BarChart } from '@/components/charts';
import { useStaffPerformance } from '@/features/analytics';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';
import type { ReportPeriod, StaffPerformanceMetrics } from '@/features/analytics/types';

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
];

// Top Performer Card
function TopPerformerCard({ staff }: { staff: StaffPerformanceMetrics | null }) {
  const { settings } = useSettingsStore();

  if (!staff) {
    return (
      <Card>
        <YStack alignItems="center" padding="$4">
          <Text color="$colorSecondary">No performance data available</Text>
        </YStack>
      </Card>
    );
  }

  return (
    <Card>
      <YStack alignItems="center" gap="$3">
        <YStack position="relative">
          <YStack
            width={80}
            height={80}
            borderRadius="$full"
            backgroundColor="$primary"
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize="$8" fontWeight="bold" color="white">
              {staff.userName.charAt(0).toUpperCase()}
            </Text>
          </YStack>
          <YStack
            position="absolute"
            bottom={-4}
            right={-4}
            backgroundColor="$warning"
            borderRadius="$full"
            padding="$1"
          >
            <Trophy size={20} color="white" />
          </YStack>
        </YStack>

        <YStack alignItems="center">
          <Text fontSize="$5" fontWeight="bold" color="$color">
            {staff.userName}
          </Text>
          <Text fontSize="$3" color="$colorSecondary">
            {staff.role}
          </Text>
        </YStack>

        <XStack gap="$4">
          <YStack alignItems="center">
            <Text fontSize="$6" fontWeight="bold" color="$success">
              {formatCurrency(staff.totalSales, settings.currency)}
            </Text>
            <Text fontSize="$2" color="$colorSecondary">
              Total Sales
            </Text>
          </YStack>
          <YStack alignItems="center">
            <Text fontSize="$6" fontWeight="bold" color="$primary">
              {staff.orderCount}
            </Text>
            <Text fontSize="$2" color="$colorSecondary">
              Orders
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}

// Staff Row component
function StaffRow({
  staff,
  rank,
}: {
  staff: StaffPerformanceMetrics;
  rank: number;
}) {
  const { settings } = useSettingsStore();

  const getRankColor = () => {
    if (rank === 1) return '$warning';
    if (rank === 2) return '$colorSecondary';
    if (rank === 3) return '#CD7F32'; // Bronze
    return '$backgroundPress';
  };

  const getRankIcon = () => {
    if (rank <= 3) {
      return (
        <YStack
          width={28}
          height={28}
          borderRadius="$full"
          backgroundColor={getRankColor()}
          justifyContent="center"
          alignItems="center"
        >
          {rank === 1 ? (
            <Trophy size={14} color="white" />
          ) : (
            <Text fontSize="$2" fontWeight="bold" color="white">
              {rank}
            </Text>
          )}
        </YStack>
      );
    }
    return (
      <YStack
        width={28}
        height={28}
        borderRadius="$full"
        backgroundColor="$backgroundPress"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="$2" fontWeight="600" color="$colorSecondary">
          {rank}
        </Text>
      </YStack>
    );
  };

  return (
    <XStack
      paddingVertical="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
      gap="$3"
    >
      {getRankIcon()}
      <YStack
        width={40}
        height={40}
        borderRadius="$full"
        backgroundColor="$primary"
        justifyContent="center"
        alignItems="center"
      >
        <Text color="white" fontWeight="bold" fontSize="$3">
          {staff.userName.charAt(0).toUpperCase()}
        </Text>
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="600" numberOfLines={1}>
          {staff.userName}
        </Text>
        <Text fontSize="$2" color="$colorSecondary" numberOfLines={1}>
          {staff.role} • {staff.orderCount} orders
        </Text>
      </YStack>
      <YStack alignItems="flex-end">
        <Text fontWeight="bold" color="$color">
          {formatCurrency(staff.totalSales, settings.currency)}
        </Text>
        <XStack alignItems="center" gap="$1">
          {staff.vsTeamAverage >= 0 ? (
            <TrendingUp size={12} color="$success" />
          ) : (
            <TrendingDown size={12} color="$error" />
          )}
          <Text
            fontSize="$2"
            color={staff.vsTeamAverage >= 0 ? '$success' : '$error'}
          >
            {staff.vsTeamAverage >= 0 ? '+' : ''}
            {staff.vsTeamAverage.toFixed(0)}% vs avg
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );
}

// Metric Card
function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card flex={1} minWidth={140}>
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$3" color="$colorSecondary">
            {title}
          </Text>
          {icon}
        </XStack>
        <Text fontSize="$5" fontWeight="bold" color="$color">
          {value}
        </Text>
        {subtitle && (
          <Text fontSize="$2" color="$colorSecondary">
            {subtitle}
          </Text>
        )}
      </YStack>
    </Card>
  );
}

export default function StaffAnalyticsScreen({
  navigation,
}: MoreScreenProps<'StaffAnalytics'>) {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<ReportPeriod>('this_month');

  const {
    data: staffData,
    isLoading,
    error,
    refetch,
  } = useStaffPerformance({ period });

  // Prepare sales by staff for bar chart
  const salesByStaffData = useMemo(() => {
    if (!staffData?.staff) return [];
    return staffData.staff.slice(0, 5).map((s) => ({
      label: s.userName.split(' ')[0], // First name only
      value: s.totalSales,
    }));
  }, [staffData?.staff]);

  // Prepare orders by staff for horizontal bar
  const ordersByStaffData = useMemo(() => {
    if (!staffData?.staff) return [];
    return staffData.staff.slice(0, 5).map((s) => ({
      label: s.userName,
      value: s.orderCount,
      maxValue: staffData.staff[0]?.orderCount || s.orderCount,
    }));
  }, [staffData?.staff]);

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <YStack padding="$4" gap="$4">
        {/* Period Selector */}
        <XStack gap="$2">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="$3"
              backgroundColor={period === option.value ? '$primary' : '$backgroundPress'}
              color={period === option.value ? 'white' : '$color'}
              onPress={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </XStack>

        {/* Summary Metrics */}
        <XStack flexWrap="wrap" gap="$3">
          <MetricCard
            title="Total Staff"
            value={String(staffData?.totalStaff || 0)}
            subtitle="Active employees"
            icon={<Users size={18} color="$primary" />}
          />
          <MetricCard
            title="Total Sales"
            value={formatCurrency(staffData?.totalSales || 0, settings.currency)}
            subtitle="All staff combined"
            icon={<Target size={18} color="$primary" />}
          />
          <MetricCard
            title="Avg per Staff"
            value={formatCurrency(staffData?.averageSalesPerStaff || 0, settings.currency)}
            subtitle="Per employee"
            icon={<Award size={18} color="$primary" />}
          />
        </XStack>

        {/* Top Performer */}
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Top Performer
          </Text>
          <TopPerformerCard staff={staffData?.topPerformer || null} />
        </YStack>

        {/* Sales by Staff Chart */}
        <BarChart
          title="Sales by Staff"
          subtitle="Top 5 performers"
          data={salesByStaffData}
          isLoading={isLoading}
          error={error}
          height={200}
          yAxisPrefix={settings.currency}
        />

        {/* Orders by Staff */}
        <HorizontalBarChart
          title="Orders by Staff"
          subtitle="Transaction count"
          data={ordersByStaffData}
          isLoading={isLoading}
          error={error}
          formatValue={(v) => `${v} orders`}
        />

        {/* Staff Rankings */}
        <Card>
          <CardHeader
            title="Staff Rankings"
            subtitle={`Performance for ${period.replace('_', ' ')}`}
          />
          <YStack>
            {isLoading ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                Loading staff data...
              </Text>
            ) : !staffData?.staff || staffData.staff.length === 0 ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                No staff performance data available
              </Text>
            ) : (
              staffData.staff.map((staff, index) => (
                <StaffRow key={staff.userId} staff={staff} rank={index + 1} />
              ))
            )}
          </YStack>
        </Card>

        {/* Performance Metrics Legend */}
        <Card>
          <CardHeader title="Understanding Performance Metrics" />
          <YStack gap="$3">
            <XStack alignItems="center" gap="$3">
              <Target size={20} color="$primary" />
              <YStack flex={1}>
                <Text fontWeight="600">Total Sales</Text>
                <Text fontSize="$2" color="$colorSecondary">
                  Sum of all completed order amounts
                </Text>
              </YStack>
            </XStack>
            <XStack alignItems="center" gap="$3">
              <Clock size={20} color="$primary" />
              <YStack flex={1}>
                <Text fontWeight="600">Orders Count</Text>
                <Text fontSize="$2" color="$colorSecondary">
                  Number of transactions processed
                </Text>
              </YStack>
            </XStack>
            <XStack alignItems="center" gap="$3">
              <TrendingUp size={20} color="$success" />
              <YStack flex={1}>
                <Text fontWeight="600">vs Team Average</Text>
                <Text fontSize="$2" color="$colorSecondary">
                  Performance compared to team average
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
