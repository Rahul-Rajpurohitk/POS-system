import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { Bell, ChevronRight, Clock, AlertTriangle } from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { usePendingOrders, useQueueStats } from '@/features/delivery/hooks';
import { OnlineOrderNotification } from './OnlineOrderNotification';
import { OrderAcceptanceModal } from './OrderAcceptanceModal';
import type { OnlineOrderQueueItem } from '@/features/delivery/api';

interface OnlineOrdersPanelProps {
  maxItems?: number;
  onViewAll?: () => void;
  compact?: boolean;
}

export function OnlineOrdersPanel({
  maxItems = 3,
  onViewAll,
  compact = false,
}: OnlineOrdersPanelProps) {
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrderQueueItem | null>(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  const { data: pendingOrders, isLoading, isError, refetch } = usePendingOrders({ enableSound: true });
  const { data: stats } = useQueueStats();

  const displayOrders = pendingOrders?.slice(0, maxItems) || [];
  const hasMore = (pendingOrders?.length || 0) > maxItems;
  const expiringSoonCount = stats?.expiringSoon || 0;

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);
    // Acceptance is handled in the modal
  };

  const handleRejectOrder = (orderId: string) => {
    // Show reject confirmation in modal
    const order = pendingOrders?.find((o) => o.orderId === orderId);
    if (order) {
      setSelectedOrder(order);
    }
  };

  // Show loading only briefly - don't block on errors (endpoint may not exist yet)
  if (isLoading && !isError) {
    return (
      <Card padding="$4">
        <YStack alignItems="center" gap="$2">
          <Spinner />
          <Text color="$colorSecondary">Loading online orders...</Text>
        </YStack>
      </Card>
    );
  }

  if (!pendingOrders || pendingOrders.length === 0) {
    if (compact) return null;

    return (
      <Card padding="$4">
        <XStack alignItems="center" gap="$2" marginBottom="$2">
          <Bell size={20} color="$colorSecondary" />
          <Text fontSize={16} fontWeight="600">Online Orders</Text>
        </XStack>
        <Text color="$colorSecondary" textAlign="center" paddingVertical="$4">
          No pending online orders
        </Text>
      </Card>
    );
  }

  return (
    <YStack>
      {/* Header */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$3"
      >
        <XStack alignItems="center" gap="$2">
          <YStack
            backgroundColor="$errorBackground"
            padding="$2"
            borderRadius="$2"
          >
            <Bell size={20} color="$error" />
          </YStack>
          <YStack>
            <Text fontSize={16} fontWeight="bold">
              Online Orders
            </Text>
            <Text fontSize={12} color="$colorSecondary">
              {pendingOrders.length} pending
            </Text>
          </YStack>
        </XStack>

        {expiringSoonCount > 0 && (
          <XStack
            backgroundColor="$warningBackground"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignItems="center"
            gap="$1"
          >
            <AlertTriangle size={14} color="$warning" />
            <Text fontSize={12} color="$warning" fontWeight="600">
              {expiringSoonCount} expiring soon
            </Text>
          </XStack>
        )}

        {hasMore && onViewAll && (
          <Button variant="ghost" size="sm" onPress={onViewAll}>
            <Text color="$primary">View All</Text>
            <ChevronRight size={16} color="$primary" />
          </Button>
        )}
      </XStack>

      {/* Orders List */}
      <YStack gap="$0">
        {displayOrders.map((order) => (
          <OnlineOrderNotification
            key={order.id}
            order={order}
            onAccept={() => handleAcceptOrder(order.orderId)}
            onReject={() => handleRejectOrder(order.orderId)}
            onViewDetails={() => setSelectedOrder(order)}
            isAccepting={acceptingOrderId === order.orderId}
          />
        ))}
      </YStack>

      {hasMore && (
        <Button
          variant="secondary"
          marginTop="$2"
          onPress={onViewAll}
        >
          <Text>View All {pendingOrders.length} Orders</Text>
        </Button>
      )}

      {/* Order Acceptance Modal */}
      <OrderAcceptanceModal
        open={!!selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setAcceptingOrderId(null);
        }}
        order={selectedOrder}
        onAccepted={() => {
          setSelectedOrder(null);
          setAcceptingOrderId(null);
          refetch();
        }}
      />
    </YStack>
  );
}

export default OnlineOrdersPanel;
