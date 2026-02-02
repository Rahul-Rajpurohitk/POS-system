/**
 * OrderStatusBadge - Enhanced status indicator matching Payment/Type badge style
 * - Completed: Green tick icon only
 * - Open: Light orange with dot + text
 * - Others: Dot + text style consistent with Payment/Type columns
 */

import React from 'react';
import { XStack, Text, YStack } from 'tamagui';
import { CheckCircle } from '@tamagui/lucide-icons';

export type OrderStatus =
  | 'draft'
  | 'open'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'on_hold'
  | 'out_for_delivery'
  | 'delivered';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
}

// Status colors matching the dot + text style of Payment/Type badges
const STATUS_CONFIG: Record<string, {
  color: string;
  label: string;
}> = {
  draft: {
    color: '#9CA3AF',  // Gray
    label: 'Draft',
  },
  open: {
    color: '#F97316',  // Light orange - order saved, awaiting payment
    label: 'Open',
  },
  pending: {
    color: '#F59E0B',  // Amber
    label: 'Pending',
  },
  processing: {
    color: '#3B82F6',  // Blue
    label: 'Processing',
  },
  completed: {
    color: '#10B981',  // Green - will show tick icon only
    label: 'Completed',
  },
  cancelled: {
    color: '#EF4444',  // Red
    label: 'Cancelled',
  },
  refunded: {
    color: '#8B5CF6',  // Purple
    label: 'Refunded',
  },
  partially_refunded: {
    color: '#8B5CF6',  // Purple
    label: 'Partial',
  },
  on_hold: {
    color: '#6B7280',  // Gray
    label: 'On Hold',
  },
  out_for_delivery: {
    color: '#0EA5E9',  // Sky blue
    label: 'Delivering',
  },
  delivered: {
    color: '#10B981',  // Green
    label: 'Delivered',
  },
};

const SIZE_CONFIG = {
  sm: { dotSize: 4, fontSize: 9, padding: 6, tickSize: 14 },
  md: { dotSize: 5, fontSize: 10, padding: 8, tickSize: 16 },
  lg: { dotSize: 6, fontSize: 11, padding: 10, tickSize: 18 },
};

export function OrderStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  pulse = false,
}: OrderStatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace('-', '_') || 'pending';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
  const sizeConfig = SIZE_CONFIG[size];

  // For completed orders - show only green tick icon
  if (normalizedStatus === 'completed') {
    return (
      <YStack
        width={sizeConfig.tickSize + 4}
        height={sizeConfig.tickSize + 4}
        borderRadius={(sizeConfig.tickSize + 4) / 2}
        backgroundColor={`${config.color}20`}
        alignItems="center"
        justifyContent="center"
      >
        <CheckCircle size={sizeConfig.tickSize} color={config.color} />
      </YStack>
    );
  }

  // For delivered orders - also show tick icon
  if (normalizedStatus === 'delivered') {
    return (
      <YStack
        width={sizeConfig.tickSize + 4}
        height={sizeConfig.tickSize + 4}
        borderRadius={(sizeConfig.tickSize + 4) / 2}
        backgroundColor={`${config.color}20`}
        alignItems="center"
        justifyContent="center"
      >
        <CheckCircle size={sizeConfig.tickSize} color={config.color} />
      </YStack>
    );
  }

  // For all other statuses - use dot + text style (matching Payment/Type badges)
  return (
    <XStack
      backgroundColor={`${config.color}20`}
      paddingHorizontal={sizeConfig.padding}
      paddingVertical={2}
      borderRadius="$1"
      alignItems="center"
      gap={3}
    >
      {/* Colored dot */}
      <YStack
        width={sizeConfig.dotSize}
        height={sizeConfig.dotSize}
        borderRadius={sizeConfig.dotSize / 2}
        backgroundColor={config.color}
        flexShrink={0}
      />

      {/* Status text */}
      <Text
        fontSize={sizeConfig.fontSize}
        fontWeight="500"
        color={config.color}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </XStack>
  );
}

export default OrderStatusBadge;
