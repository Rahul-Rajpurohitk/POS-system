/**
 * OrderStatsCards - Stats dashboard matching Products page design
 * Uses the same MetricCard pattern for UI consistency
 */

import React, { useEffect, useState } from 'react';
import { XStack, YStack, Text } from 'tamagui';
import {
  ShoppingCart, DollarSign, CheckCircle, Clock, TrendingUp, TrendingDown,
} from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import type { Currency } from '@/types';

// Matching Products page STAT_COLORS exactly - colored backgrounds with borders
const STAT_COLORS = {
  orders: { bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE' },      // Blue - like Total Products
  revenue: { bg: '#ECFDF5', icon: '#059669', border: '#A7F3D0' },     // Green - like Total Value
  completed: { bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0' },   // Light green - like Avg Margin
  pending: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D' },     // Orange/Yellow - like Low Stock
};

// Legacy colors for trend indicators
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
};

export type StatType = 'today' | 'revenue' | 'completed' | 'pending';
export type TimePeriod = 'today' | 'week' | 'month';

interface StatData {
  value: number;
  previousValue?: number;
  formattedValue?: string;
}

export interface OrderStatsCardsProps {
  stats: {
    today: StatData;
    revenue: StatData;
    completed: StatData;
    pending: StatData;
  };
  currency: Currency;
  period?: TimePeriod;
  onStatClick?: (statType: StatType) => void;
  onPeriodChange?: (period: TimePeriod) => void;
  compact?: boolean;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  statColorKey: 'orders' | 'revenue' | 'completed' | 'pending';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  onClick?: () => void;
  isCurrency?: boolean;
  currency?: Currency;
  pulse?: boolean;
}

function AnimatedNumber({ value, isCurrency, currency }: { value: number; isCurrency?: boolean; currency?: Currency }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 600;
    const steps = 15;
    const stepValue = value / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  if (isCurrency && currency) {
    return <>{formatCurrency(displayValue, currency)}</>;
  }
  return <>{displayValue.toLocaleString()}</>;
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  statColorKey,
  trend,
  trendValue,
  onClick,
  isCurrency,
  currency,
  pulse,
}: MetricCardProps) {
  const colors = STAT_COLORS[statColorKey];

  return (
    <YStack
      flex={1}
      backgroundColor={colors.bg}
      borderRadius="$2"
      paddingVertical="$2"
      paddingHorizontal="$2.5"
      borderWidth={1}
      borderColor={colors.border}
      cursor={onClick ? 'pointer' : 'default'}
      hoverStyle={onClick ? { opacity: 0.9 } : undefined}
      pressStyle={onClick ? { opacity: 0.85 } : undefined}
      onPress={onClick}
      position="relative"
    >
      {/* Pulse indicator for pending */}
      {pulse && value > 0 && (
        <YStack
          position="absolute"
          top={8}
          right={8}
          width={6}
          height={6}
          borderRadius={3}
          backgroundColor={colors.icon}
        />
      )}

      <XStack alignItems="center" gap="$2">
        <YStack
          width={28}
          height={28}
          borderRadius={14}
          backgroundColor="white"
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
        <YStack flex={1}>
          <Text fontSize={10} color="#6B7280" textTransform="uppercase">
            {label}
          </Text>
          <XStack alignItems="center" gap="$2">
            <Text fontSize={16} fontWeight="bold" color="#111827">
              <AnimatedNumber value={value} isCurrency={isCurrency} currency={currency} />
            </Text>
            {trend && trend !== 'neutral' && trendValue !== undefined && (
              <XStack alignItems="center" gap={2}>
                {trend === 'up' ? (
                  <TrendingUp size={10} color={COLORS.success} />
                ) : (
                  <TrendingDown size={10} color={COLORS.error} />
                )}
                <Text fontSize={9} color={trend === 'up' ? COLORS.success : COLORS.error} fontWeight="500">
                  {trend === 'up' ? '+' : ''}{trendValue.toFixed(0)}%
                </Text>
              </XStack>
            )}
          </XStack>
        </YStack>
      </XStack>
      {subValue && (
        <Text fontSize={10} color="#6B7280" marginTop="$1">
          {subValue}
        </Text>
      )}
    </YStack>
  );
}

function getTrend(current: number, previous?: number): { trend: 'up' | 'down' | 'neutral'; value: number } {
  if (previous === undefined || previous === 0) {
    return { trend: 'neutral', value: 0 };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    value: Math.abs(change),
  };
}

export function OrderStatsCards({
  stats,
  currency,
  period = 'today',
  onStatClick,
  onPeriodChange,
  compact = false,
}: OrderStatsCardsProps) {
  const todayTrend = getTrend(stats.today.value, stats.today.previousValue);
  const revenueTrend = getTrend(stats.revenue.value, stats.revenue.previousValue);
  const completedTrend = getTrend(stats.completed.value, stats.completed.previousValue);

  const completionRate = stats.today.value > 0
    ? Math.round((stats.completed.value / stats.today.value) * 100)
    : 0;

  const periodLabel = period === 'today' ? "Today's Orders" : period === 'week' ? 'This Week' : 'This Month';

  if (compact) {
    return (
      <XStack gap="$2" flexWrap="wrap">
        <YStack
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$2"
          backgroundColor={STAT_COLORS.orders.bg}
          borderWidth={1}
          borderColor={STAT_COLORS.orders.border}
        >
          <XStack alignItems="center" gap="$2">
            <ShoppingCart size={14} color={STAT_COLORS.orders.icon} />
            <Text fontSize={12} color="#111827" fontWeight="600">
              {stats.today.value} orders
            </Text>
          </XStack>
        </YStack>
        <YStack
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$2"
          backgroundColor={STAT_COLORS.revenue.bg}
          borderWidth={1}
          borderColor={STAT_COLORS.revenue.border}
        >
          <XStack alignItems="center" gap="$2">
            <DollarSign size={14} color={STAT_COLORS.revenue.icon} />
            <Text fontSize={12} color="#111827" fontWeight="600">
              {formatCurrency(stats.revenue.value, currency)}
            </Text>
          </XStack>
        </YStack>
      </XStack>
    );
  }

  return (
    <YStack gap="$3">
      {/* Period selector */}
      {onPeriodChange && (
        <XStack gap="$2" justifyContent="flex-end">
          {(['today', 'week', 'month'] as TimePeriod[]).map((p) => (
            <Text
              key={p}
              fontSize={12}
              fontWeight={period === p ? '600' : '400'}
              color={period === p ? COLORS.primary : '#6B7280'}
              textTransform="capitalize"
              cursor="pointer"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              backgroundColor={period === p ? `${COLORS.primary}15` : 'transparent'}
              onPress={() => onPeriodChange(p)}
            >
              {p}
            </Text>
          ))}
        </XStack>
      )}

      {/* Stats grid - compact design */}
      <XStack gap="$2">
        <MetricCard
          icon={<ShoppingCart size={14} color={STAT_COLORS.orders.icon} />}
          label={periodLabel}
          value={stats.today.value}
          statColorKey="orders"
          trend={todayTrend.trend}
          trendValue={todayTrend.value}
          onClick={onStatClick ? () => onStatClick('today') : undefined}
        />
        <MetricCard
          icon={<DollarSign size={14} color={STAT_COLORS.revenue.icon} />}
          label="Revenue"
          value={stats.revenue.value}
          statColorKey="revenue"
          trend={revenueTrend.trend}
          trendValue={revenueTrend.value}
          isCurrency
          currency={currency}
          onClick={onStatClick ? () => onStatClick('revenue') : undefined}
        />
        <MetricCard
          icon={<CheckCircle size={14} color={STAT_COLORS.completed.icon} />}
          label="Completed"
          value={stats.completed.value}
          statColorKey="completed"
          trend={completedTrend.trend}
          trendValue={completedTrend.value}
          onClick={onStatClick ? () => onStatClick('completed') : undefined}
        />
        <MetricCard
          icon={<Clock size={14} color={STAT_COLORS.pending.icon} />}
          label="Pending"
          value={stats.pending.value}
          statColorKey="pending"
          pulse
          onClick={onStatClick ? () => onStatClick('pending') : undefined}
        />
      </XStack>
    </YStack>
  );
}

export default OrderStatsCards;
