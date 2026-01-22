/**
 * OrderStatsCards - Stats dashboard matching Products page design EXACTLY
 * Uses colored backgrounds with matching borders like Products KPIs
 */

import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import {
  ShoppingCart, DollarSign, CheckCircle, Clock, TrendingUp,
} from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import type { Currency } from '@/types';

// Matching Products page STAT_COLORS exactly
const STAT_COLORS = {
  orders: { bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE' },      // Blue - like Total Products
  revenue: { bg: '#ECFDF5', icon: '#059669', border: '#A7F3D0' },     // Green - like Total Value
  completed: { bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0' },   // Light green - like Avg Margin
  pending: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D' },     // Orange/Yellow - like Low Stock
};

export type StatType = 'today' | 'revenue' | 'completed' | 'pending';
export type TimePeriod = 'today' | 'week' | 'month';

interface StatData {
  value: number;
  previousValue?: number;
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
  onPeriodChange?: (period: TimePeriod) => void;
  onStatClick?: (statType: StatType) => void;
}

export function OrderStatsCards({
  stats,
  currency,
  period = 'today',
  onPeriodChange,
  onStatClick,
}: OrderStatsCardsProps) {
  const periodLabel = period === 'today' ? "Today's Orders" : period === 'week' ? 'This Week' : 'This Month';

  return (
    <YStack gap="$3">
      {/* Period selector - matching Products page style */}
      {onPeriodChange && (
        <XStack gap="$2" justifyContent="flex-end">
          {(['today', 'week', 'month'] as TimePeriod[]).map((p) => (
            <Text
              key={p}
              fontSize={12}
              fontWeight={period === p ? '600' : '400'}
              color={period === p ? '#2563EB' : '$colorSecondary'}
              textTransform="capitalize"
              cursor="pointer"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              backgroundColor={period === p ? '#EFF6FF' : 'transparent'}
              onPress={() => onPeriodChange(p)}
            >
              {p}
            </Text>
          ))}
        </XStack>
      )}

      {/* Stats grid - EXACTLY matching Products page KPI design */}
      <XStack gap="$3" flexWrap="wrap">
        {/* Today's Orders - Blue theme */}
        <YStack
          flex={1}
          minWidth={150}
          padding="$3"
          borderRadius="$3"
          backgroundColor={STAT_COLORS.orders.bg}
          borderWidth={1}
          borderColor={STAT_COLORS.orders.border}
          cursor={onStatClick ? 'pointer' : 'default'}
          hoverStyle={onStatClick ? { opacity: 0.9, transform: [{ scale: 1.01 }] } : undefined}
          pressStyle={onStatClick ? { opacity: 0.8 } : undefined}
          onPress={() => onStatClick?.('today')}
        >
          <XStack alignItems="center" gap="$2">
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="white"
              alignItems="center"
              justifyContent="center"
            >
              <ShoppingCart size={16} color={STAT_COLORS.orders.icon} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={10} color={STAT_COLORS.orders.icon} textTransform="uppercase" fontWeight="600">
                {periodLabel}
              </Text>
              <Text fontSize="$5" fontWeight="bold" color={STAT_COLORS.orders.icon}>
                {stats.today.value}
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Revenue - Green theme */}
        <YStack
          flex={1}
          minWidth={150}
          padding="$3"
          borderRadius="$3"
          backgroundColor={STAT_COLORS.revenue.bg}
          borderWidth={1}
          borderColor={STAT_COLORS.revenue.border}
          cursor={onStatClick ? 'pointer' : 'default'}
          hoverStyle={onStatClick ? { opacity: 0.9, transform: [{ scale: 1.01 }] } : undefined}
          pressStyle={onStatClick ? { opacity: 0.8 } : undefined}
          onPress={() => onStatClick?.('revenue')}
        >
          <XStack alignItems="center" gap="$2">
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="white"
              alignItems="center"
              justifyContent="center"
            >
              <DollarSign size={16} color={STAT_COLORS.revenue.icon} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={10} color={STAT_COLORS.revenue.icon} textTransform="uppercase" fontWeight="600">
                Revenue
              </Text>
              <Text fontSize="$4" fontWeight="bold" color={STAT_COLORS.revenue.icon}>
                {formatCurrency(stats.revenue.value, currency)}
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Completed - Light Green theme */}
        <YStack
          flex={1}
          minWidth={150}
          padding="$3"
          borderRadius="$3"
          backgroundColor={STAT_COLORS.completed.bg}
          borderWidth={1}
          borderColor={STAT_COLORS.completed.border}
          cursor={onStatClick ? 'pointer' : 'default'}
          hoverStyle={onStatClick ? { opacity: 0.9, transform: [{ scale: 1.01 }] } : undefined}
          pressStyle={onStatClick ? { opacity: 0.8 } : undefined}
          onPress={() => onStatClick?.('completed')}
        >
          <XStack alignItems="center" gap="$2">
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="white"
              alignItems="center"
              justifyContent="center"
            >
              <CheckCircle size={16} color={STAT_COLORS.completed.icon} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={10} color={STAT_COLORS.completed.icon} textTransform="uppercase" fontWeight="600">
                Completed
              </Text>
              <Text fontSize="$5" fontWeight="bold" color={STAT_COLORS.completed.icon}>
                {stats.completed.value}
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Pending - Orange/Yellow theme */}
        <YStack
          flex={1}
          minWidth={150}
          padding="$3"
          borderRadius="$3"
          backgroundColor={STAT_COLORS.pending.bg}
          borderWidth={1}
          borderColor={STAT_COLORS.pending.border}
          cursor={onStatClick ? 'pointer' : 'default'}
          hoverStyle={onStatClick ? { opacity: 0.9, transform: [{ scale: 1.01 }] } : undefined}
          pressStyle={onStatClick ? { opacity: 0.8 } : undefined}
          onPress={() => onStatClick?.('pending')}
        >
          <XStack alignItems="center" gap="$2">
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="white"
              alignItems="center"
              justifyContent="center"
            >
              <Clock size={16} color={STAT_COLORS.pending.icon} />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={10} color={STAT_COLORS.pending.icon} textTransform="uppercase" fontWeight="600">
                Pending
              </Text>
              <Text fontSize="$5" fontWeight="bold" color={STAT_COLORS.pending.icon}>
                {stats.pending.value}
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </XStack>
    </YStack>
  );
}

export default OrderStatsCards;
