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

// Consistent color scheme matching Products page
const COLORS = {
  primary: '#3B82F6',  // Blue-500 - professional
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
  color: string;
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
  color,
  trend,
  trendValue,
  onClick,
  isCurrency,
  currency,
  pulse,
}: MetricCardProps) {
  return (
    <YStack
      flex={1}
      backgroundColor="$cardBackground"
      borderRadius="$3"
      padding="$3"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$1"
      cursor={onClick ? 'pointer' : 'default'}
      hoverStyle={onClick ? { borderColor: color } : undefined}
      pressStyle={onClick ? { opacity: 0.9 } : undefined}
      onPress={onClick}
      position="relative"
    >
      {/* Pulse indicator for pending */}
      {pulse && value > 0 && (
        <YStack
          position="absolute"
          top={10}
          right={10}
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={color}
        />
      )}

      <XStack alignItems="center" gap="$2">
        <YStack
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={`${color}20`}
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
        {trend && trend !== 'neutral' && trendValue !== undefined && (
          <XStack marginLeft="auto" alignItems="center" gap="$1">
            {trend === 'up' ? (
              <TrendingUp size={12} color={COLORS.success} />
            ) : (
              <TrendingDown size={12} color={COLORS.error} />
            )}
            <Text fontSize={10} color={trend === 'up' ? COLORS.success : COLORS.error} fontWeight="500">
              {trend === 'up' ? '+' : ''}{trendValue.toFixed(1)}%
            </Text>
          </XStack>
        )}
      </XStack>
      <Text fontSize={11} color="$colorSecondary" textTransform="uppercase" marginTop="$1">
        {label}
      </Text>
      <Text fontSize="$5" fontWeight="bold" color="$color">
        <AnimatedNumber value={value} isCurrency={isCurrency} currency={currency} />
      </Text>
      {subValue && (
        <Text fontSize={11} color="$colorSecondary">
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
          backgroundColor="$cardBackground"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <XStack alignItems="center" gap="$2">
            <ShoppingCart size={14} color={COLORS.primary} />
            <Text fontSize={12} color="$color" fontWeight="600">
              {stats.today.value} orders
            </Text>
          </XStack>
        </YStack>
        <YStack
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$2"
          backgroundColor="$cardBackground"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <XStack alignItems="center" gap="$2">
            <DollarSign size={14} color={COLORS.success} />
            <Text fontSize={12} color="$color" fontWeight="600">
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
              color={period === p ? COLORS.primary : '$colorSecondary'}
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

      {/* Stats grid - matching Products MetricCard design */}
      <XStack gap="$2">
        <MetricCard
          icon={<ShoppingCart size={16} color={COLORS.primary} />}
          label={periodLabel}
          value={stats.today.value}
          color={COLORS.primary}
          trend={todayTrend.trend}
          trendValue={todayTrend.value}
          onClick={onStatClick ? () => onStatClick('today') : undefined}
        />
        <MetricCard
          icon={<DollarSign size={16} color={COLORS.success} />}
          label="Revenue"
          value={stats.revenue.value}
          color={COLORS.success}
          trend={revenueTrend.trend}
          trendValue={revenueTrend.value}
          isCurrency
          currency={currency}
          onClick={onStatClick ? () => onStatClick('revenue') : undefined}
        />
        <MetricCard
          icon={<CheckCircle size={16} color="#16A34A" />}
          label="Completed"
          value={stats.completed.value}
          subValue={completionRate > 0 ? `${completionRate}% rate` : undefined}
          color="#16A34A"
          trend={completedTrend.trend}
          trendValue={completedTrend.value}
          onClick={onStatClick ? () => onStatClick('completed') : undefined}
        />
        <MetricCard
          icon={<Clock size={16} color={COLORS.warning} />}
          label="Pending"
          value={stats.pending.value}
          color={COLORS.warning}
          pulse
          onClick={onStatClick ? () => onStatClick('pending') : undefined}
        />
      </XStack>
    </YStack>
  );
}

export default OrderStatsCards;
