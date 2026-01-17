/**
 * OrderStatsCards - Enhanced stats dashboard with animations and trends
 */

import React, { useEffect, useState } from 'react';
import { XStack, YStack, Text } from 'tamagui';
import {
  Calendar, DollarSign, CheckCircle, Clock, TrendingUp, TrendingDown, Zap,
} from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import type { Currency } from '@/types';

export type StatType = 'today' | 'revenue' | 'completed' | 'pending' | 'active';
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
    active?: StatData;
  };
  currency: Currency;
  period?: TimePeriod;
  onStatClick?: (statType: StatType) => void;
  onPeriodChange?: (period: TimePeriod) => void;
  compact?: boolean;
}

interface StatCardProps {
  id: StatType;
  icon: any;
  label: string;
  value: number | string;
  previousValue?: number;
  color: string;
  bgColor: string;
  borderColor: string;
  subtext?: string;
  onClick?: () => void;
  pulse?: boolean;
  isCurrency?: boolean;
  currency?: Currency;
}

function AnimatedNumber({ value, isCurrency, currency }: { value: number; isCurrency?: boolean; currency?: Currency }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
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

function TrendIndicator({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined || previous === 0) return null;

  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <XStack alignItems="center" gap="$1" marginTop="$1">
      <Icon size={12} color={isPositive ? '#10B981' : '#EF4444'} />
      <Text fontSize={10} color={isPositive ? '#10B981' : '#EF4444'} fontWeight="500">
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </Text>
    </XStack>
  );
}

function StatCard({
  id,
  icon: Icon,
  label,
  value,
  previousValue,
  color,
  bgColor,
  borderColor,
  subtext,
  onClick,
  pulse,
  isCurrency,
  currency,
}: StatCardProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;

  return (
    <YStack
      flex={1}
      padding="$3"
      borderRadius="$3"
      backgroundColor={bgColor}
      borderWidth={1}
      borderColor={borderColor}
      cursor={onClick ? 'pointer' : 'default'}
      hoverStyle={onClick ? { opacity: 0.9, transform: [{ scale: 1.02 }] } : undefined}
      pressStyle={onClick ? { transform: [{ scale: 0.98 }] } : undefined}
      onPress={onClick}
      position="relative"
      overflow="hidden"
    >
      {pulse && (
        <YStack
          position="absolute"
          top={8}
          right={8}
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={color}
        />
      )}
      <XStack alignItems="center" gap="$2">
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="white"
          alignItems="center"
          justifyContent="center"
          shadowColor="rgba(0,0,0,0.1)"
          shadowOffset={{ width: 0, height: 1 }}
          shadowOpacity={1}
          shadowRadius={2}
        >
          <Icon size={18} color={color} />
        </YStack>
        <YStack flex={1}>
          <Text
            fontSize={10}
            color={color}
            textTransform="uppercase"
            fontWeight="700"
            letterSpacing={0.5}
          >
            {label}
          </Text>
          <Text fontSize="$5" fontWeight="bold" color={color}>
            <AnimatedNumber value={numericValue} isCurrency={isCurrency} currency={currency} />
          </Text>
          {previousValue !== undefined && (
            <TrendIndicator current={numericValue} previous={previousValue} />
          )}
          {subtext && (
            <Text fontSize={10} color={color} opacity={0.7} marginTop="$1">
              {subtext}
            </Text>
          )}
        </YStack>
      </XStack>
    </YStack>
  );
}

export function OrderStatsCards({
  stats,
  currency,
  period = 'today',
  onStatClick,
  onPeriodChange,
  compact = false,
}: OrderStatsCardsProps) {
  const STAT_CARDS: Omit<StatCardProps, 'onClick'>[] = [
    {
      id: 'today',
      icon: Calendar,
      label: period === 'today' ? "Today's Orders" : period === 'week' ? 'This Week' : 'This Month',
      value: stats.today.value,
      previousValue: stats.today.previousValue,
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      borderColor: '#C7D2FE',
    },
    {
      id: 'revenue',
      icon: DollarSign,
      label: 'Revenue',
      value: stats.revenue.value,
      previousValue: stats.revenue.previousValue,
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      isCurrency: true,
      currency,
    },
    {
      id: 'completed',
      icon: CheckCircle,
      label: 'Completed',
      value: stats.completed.value,
      previousValue: stats.completed.previousValue,
      color: '#16A34A',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      subtext: stats.today.value > 0
        ? `${Math.round((stats.completed.value / stats.today.value) * 100)}% rate`
        : undefined,
    },
    {
      id: 'pending',
      icon: Clock,
      label: 'Pending',
      value: stats.pending.value,
      color: '#D97706',
      bgColor: '#FEF3C7',
      borderColor: '#FCD34D',
      pulse: stats.pending.value > 0,
    },
  ];

  // Add active orders stat if provided
  if (stats.active) {
    STAT_CARDS.push({
      id: 'active',
      icon: Zap,
      label: 'Active Now',
      value: stats.active.value,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      pulse: stats.active.value > 0,
    });
  }

  if (compact) {
    return (
      <XStack gap="$2" flexWrap="wrap">
        {STAT_CARDS.slice(0, 4).map((card) => (
          <YStack
            key={card.id}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$2"
            backgroundColor={card.bgColor}
            borderWidth={1}
            borderColor={card.borderColor}
          >
            <Text fontSize={10} color={card.color} fontWeight="600">
              {card.label}: {card.isCurrency ? formatCurrency(card.value as number, currency) : card.value}
            </Text>
          </YStack>
        ))}
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
              fontSize={11}
              fontWeight={period === p ? '700' : '500'}
              color={period === p ? '#8B5CF6' : '$colorSecondary'}
              textTransform="capitalize"
              cursor="pointer"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              backgroundColor={period === p ? '#F5F3FF' : 'transparent'}
              onPress={() => onPeriodChange(p)}
            >
              {p}
            </Text>
          ))}
        </XStack>
      )}

      {/* Stats grid */}
      <XStack gap="$3" flexWrap="wrap">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.id}
            {...card}
            onClick={onStatClick ? () => onStatClick(card.id) : undefined}
          />
        ))}
      </XStack>
    </YStack>
  );
}

export default OrderStatsCards;
