import React from 'react';
import { YStack, XStack, Text, AnimatePresence } from 'tamagui';
import { Bell, Clock, ShoppingBag } from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useCountdown } from '@/features/delivery/hooks';
import type { OnlineOrderQueueItem } from '@/features/delivery/api';

interface OnlineOrderNotificationProps {
  order: OnlineOrderQueueItem;
  onAccept: () => void;
  onReject: () => void;
  onViewDetails: () => void;
  isAccepting?: boolean;
}

export function OnlineOrderNotification({
  order,
  onAccept,
  onReject,
  onViewDetails,
  isAccepting = false,
}: OnlineOrderNotificationProps) {
  const { formatted, isUrgent, isExpired } = useCountdown(order.expiresAt);

  const itemCount = order.order?.items?.length || 0;
  const total = order.order?.total || order.order?.payment?.total || 0;

  return (
    <Card
      padding="$4"
      marginBottom="$3"
      borderLeftWidth={4}
      borderLeftColor={isExpired ? '$error' : isUrgent ? '$warning' : '$primary'}
      animation="quick"
      enterStyle={{ opacity: 0, scale: 0.95 }}
      exitStyle={{ opacity: 0, scale: 0.95 }}
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <YStack
            backgroundColor={isUrgent ? '$warningBackground' : '$primaryBackground'}
            padding="$2"
            borderRadius="$2"
          >
            <Bell size={20} color={isUrgent ? '$warning' : '$primary'} />
          </YStack>
          <YStack>
            <Text fontSize={16} fontWeight="bold">
              New Online Order
            </Text>
            <Text fontSize={12} color="$colorSecondary">
              #{order.order?.number || order.orderId.slice(-6)}
            </Text>
          </YStack>
        </XStack>

        {/* Countdown Timer */}
        <YStack
          backgroundColor={isExpired ? '$errorBackground' : isUrgent ? '$warningBackground' : '$backgroundPress'}
          paddingHorizontal="$3"
          paddingVertical="$1"
          borderRadius="$2"
          alignItems="center"
        >
          <XStack alignItems="center" gap="$1">
            <Clock size={14} color={isExpired ? '$error' : isUrgent ? '$warning' : '$colorSecondary'} />
            <Text
              fontSize={16}
              fontWeight="bold"
              color={isExpired ? '$error' : isUrgent ? '$warning' : '$color'}
            >
              {isExpired ? 'Expired' : formatted}
            </Text>
          </XStack>
          {!isExpired && (
            <Text fontSize={10} color="$colorSecondary">
              to accept
            </Text>
          )}
        </YStack>
      </XStack>

      {/* Order Summary */}
      <XStack
        backgroundColor="$backgroundPress"
        padding="$3"
        borderRadius="$2"
        marginBottom="$3"
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack alignItems="center" gap="$2">
          <ShoppingBag size={18} color="$colorSecondary" />
          <Text fontSize={14} color="$colorSecondary">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </XStack>
        <Text fontSize={18} fontWeight="bold" color="$primary">
          ${total.toFixed(2)}
        </Text>
      </XStack>

      {/* Customer Info */}
      {order.order?.customer && (
        <YStack marginBottom="$3">
          <Text fontSize={13} color="$colorSecondary">
            Customer: {order.order.customer.firstName} {order.order.customer.lastName}
          </Text>
          {order.order.deliveryAddress && (
            <Text fontSize={12} color="$colorSecondary" numberOfLines={1}>
              Delivery: {order.order.deliveryAddress}
            </Text>
          )}
        </YStack>
      )}

      {/* Actions */}
      <XStack gap="$2">
        <Button
          flex={1}
          variant="secondary"
          onPress={onViewDetails}
          disabled={isAccepting}
        >
          <Text>View Details</Text>
        </Button>
        <Button
          flex={1}
          variant="ghost"
          onPress={onReject}
          disabled={isAccepting || isExpired}
        >
          <Text color="$error">Reject</Text>
        </Button>
        <Button
          flex={1}
          onPress={onAccept}
          disabled={isAccepting || isExpired}
        >
          <Text color="white" fontWeight="600">
            {isAccepting ? 'Accepting...' : 'Accept'}
          </Text>
        </Button>
      </XStack>
    </Card>
  );
}

// Badge component for navigation
export function OnlineOrderBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <YStack
      position="absolute"
      top={-4}
      right={-8}
      backgroundColor="$error"
      borderRadius={10}
      minWidth={18}
      height={18}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$1"
    >
      <Text color="white" fontSize={10} fontWeight="bold">
        {count > 99 ? '99+' : count}
      </Text>
    </YStack>
  );
}

export default OnlineOrderNotification;
