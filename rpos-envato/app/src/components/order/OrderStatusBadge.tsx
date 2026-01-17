/**
 * OrderStatusBadge - Enhanced status indicator with animations
 */

import React from 'react';
import { XStack, Text, YStack } from 'tamagui';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Pause } from '@tamagui/lucide-icons';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'on_hold' | 'draft';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<string, {
  bg: string;
  text: string;
  border: string;
  icon: any;
  label: string;
}> = {
  pending: {
    bg: '#FEF3C7',
    text: '#D97706',
    border: '#FCD34D',
    icon: Clock,
    label: 'Pending',
  },
  processing: {
    bg: '#DBEAFE',
    text: '#2563EB',
    border: '#93C5FD',
    icon: RefreshCw,
    label: 'Processing',
  },
  completed: {
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
    icon: CheckCircle,
    label: 'Completed',
  },
  cancelled: {
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FECACA',
    icon: XCircle,
    label: 'Cancelled',
  },
  refunded: {
    bg: '#F3E8FF',
    text: '#7C3AED',
    border: '#C4B5FD',
    icon: RefreshCw,
    label: 'Refunded',
  },
  on_hold: {
    bg: '#F3F4F6',
    text: '#6B7280',
    border: '#D1D5DB',
    icon: Pause,
    label: 'On Hold',
  },
  draft: {
    bg: '#F9FAFB',
    text: '#9CA3AF',
    border: '#E5E7EB',
    icon: AlertCircle,
    label: 'Draft',
  },
};

const SIZE_CONFIG = {
  sm: { px: '$2', py: '$1', fontSize: 10, iconSize: 12, gap: '$1' },
  md: { px: '$3', py: '$1.5', fontSize: 12, iconSize: 14, gap: '$1.5' },
  lg: { px: '$4', py: '$2', fontSize: 14, iconSize: 16, gap: '$2' },
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
  const Icon = config.icon;

  return (
    <XStack
      backgroundColor={config.bg}
      borderColor={config.border}
      borderWidth={1}
      borderRadius={999}
      paddingHorizontal={sizeConfig.px}
      paddingVertical={sizeConfig.py}
      alignItems="center"
      gap={sizeConfig.gap}
      position="relative"
    >
      {pulse && (normalizedStatus === 'pending' || normalizedStatus === 'processing') && (
        <YStack
          position="absolute"
          top={-2}
          right={-2}
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={config.text}
          opacity={0.8}
        />
      )}
      {showIcon && <Icon size={sizeConfig.iconSize} color={config.text} />}
      <Text
        fontSize={sizeConfig.fontSize}
        fontWeight="600"
        color={config.text}
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        {config.label}
      </Text>
    </XStack>
  );
}

export default OrderStatusBadge;
