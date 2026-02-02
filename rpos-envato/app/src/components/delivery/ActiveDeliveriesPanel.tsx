import React, { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Spinner, Avatar } from 'tamagui';
import {
  MapPin,
  Clock,
  User,
  Phone,
  Navigation,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  UserPlus,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useActiveDeliveries, useDeliveryStats, useCancelDelivery } from '@/features/delivery/hooks';
import { DriverAssignmentModal } from './DriverAssignmentModal';
import type { Delivery, DeliveryStatus } from '@/types';

// Status colors
const STATUS_COLORS: Record<DeliveryStatus, { bg: string; text: string }> = {
  pending: { bg: '$warningBackground', text: '$warning' },
  accepted: { bg: '$primaryBackground', text: '$primary' },
  assigned: { bg: '$primaryBackground', text: '$primary' },
  picking_up: { bg: '$primaryBackground', text: '$primary' },
  picked_up: { bg: '$successBackground', text: '$success' },
  on_the_way: { bg: '$successBackground', text: '$success' },
  nearby: { bg: '$successBackground', text: '$success' },
  delivered: { bg: '$successBackground', text: '$success' },
  cancelled: { bg: '$errorBackground', text: '$error' },
  failed: { bg: '$errorBackground', text: '$error' },
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  assigned: 'Assigned',
  picking_up: 'Picking Up',
  picked_up: 'Picked Up',
  on_the_way: 'On The Way',
  nearby: 'Nearby',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

function DeliveryCard({
  delivery,
  onAssignDriver,
  onCancel,
  onViewDetails,
}: {
  delivery: Delivery;
  onAssignDriver: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
}) {
  const status = delivery.status || 'pending';
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const statusLabel = STATUS_LABELS[status] || status;

  const formatTime = (date?: Date | string | null) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const needsDriver = !delivery.driverId && ['accepted', 'pending'].includes(status);
  const canCancel = ['pending', 'accepted', 'assigned'].includes(status);

  return (
    <Card padding="$3" marginBottom="$3">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
        <YStack flex={1}>
          <Text fontSize={16} fontWeight="bold">
            Order #{delivery.order?.number || delivery.orderId?.slice(-6)}
          </Text>
          <Text fontSize={12} color="$colorSecondary">
            Created {formatTime(delivery.createdAt)}
          </Text>
        </YStack>
        <YStack
          backgroundColor={statusStyle.bg}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Text color={statusStyle.text} fontSize={11} fontWeight="600">
            {statusLabel}
          </Text>
        </YStack>
      </XStack>

      {/* Customer & Address */}
      <YStack
        backgroundColor="$backgroundPress"
        padding="$2"
        borderRadius="$2"
        marginBottom="$3"
        gap="$2"
      >
        <XStack alignItems="center" gap="$2">
          <User size={14} color="$colorSecondary" />
          <Text fontSize={13}>{delivery.customerName}</Text>
          {delivery.customerPhone && (
            <>
              <Text color="$colorSecondary">|</Text>
              <Phone size={14} color="$colorSecondary" />
              <Text fontSize={13}>{delivery.customerPhone}</Text>
            </>
          )}
        </XStack>
        <XStack alignItems="flex-start" gap="$2">
          <MapPin size={14} color="$colorSecondary" marginTop={2} />
          <Text fontSize={13} flex={1} numberOfLines={2}>
            {delivery.deliveryAddress}
          </Text>
        </XStack>
      </YStack>

      {/* Driver Info */}
      {delivery.driver ? (
        <XStack
          alignItems="center"
          gap="$2"
          marginBottom="$3"
          padding="$2"
          backgroundColor="$successBackground"
          borderRadius="$2"
        >
          <Avatar circular size="$3">
            <Avatar.Fallback backgroundColor="$success">
              <Text color="white" fontSize={12} fontWeight="bold">
                {delivery.driver.user?.firstName?.charAt(0) || 'D'}
              </Text>
            </Avatar.Fallback>
          </Avatar>
          <YStack flex={1}>
            <Text fontSize={13} fontWeight="600">
              {delivery.driver.user?.firstName} {delivery.driver.user?.lastName}
            </Text>
            <Text fontSize={11} color="$colorSecondary">
              Driver Assigned
            </Text>
          </YStack>
          {delivery.estimatedArrival && (
            <XStack alignItems="center" gap="$1">
              <Clock size={14} color="$success" />
              <Text fontSize={12} color="$success">
                ETA {formatTime(delivery.estimatedArrival)}
              </Text>
            </XStack>
          )}
        </XStack>
      ) : needsDriver ? (
        <XStack
          alignItems="center"
          gap="$2"
          marginBottom="$3"
          padding="$2"
          backgroundColor="$warningBackground"
          borderRadius="$2"
        >
          <UserPlus size={18} color="$warning" />
          <Text fontSize={13} color="$warning" flex={1}>
            No driver assigned
          </Text>
        </XStack>
      ) : null}

      {/* Actions */}
      <XStack gap="$2">
        {needsDriver && (
          <Button flex={1} size="sm" onPress={onAssignDriver}>
            <UserPlus size={16} color="white" />
            <Text color="white" marginLeft="$1">Assign</Text>
          </Button>
        )}
        <Button flex={1} size="sm" variant="secondary" onPress={onViewDetails}>
          <Text>Details</Text>
        </Button>
        {canCancel && (
          <Button size="sm" variant="ghost" onPress={onCancel}>
            <XCircle size={18} color="$error" />
          </Button>
        )}
      </XStack>
    </Card>
  );
}

function StatsCard({
  label,
  value,
  icon,
  color = '$primary',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card flex={1} padding="$3" alignItems="center">
      {icon}
      <Text fontSize={20} fontWeight="bold" color={color} marginTop="$1">
        {value}
      </Text>
      <Text fontSize={11} color="$colorSecondary">
        {label}
      </Text>
    </Card>
  );
}

export function ActiveDeliveriesPanel() {
  const [assignModalDelivery, setAssignModalDelivery] = useState<Delivery | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const {
    data: deliveries,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useActiveDeliveries();
  const { data: stats } = useDeliveryStats();
  const cancelDelivery = useCancelDelivery();

  const handleCancel = async (deliveryId: string) => {
    setCancellingId(deliveryId);
    try {
      await cancelDelivery.mutateAsync({ deliveryId, reason: 'Cancelled by POS' });
    } catch (error) {
      console.error('Failed to cancel delivery:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const renderItem = ({ item }: { item: Delivery }) => (
    <DeliveryCard
      delivery={item}
      onAssignDriver={() => setAssignModalDelivery(item)}
      onCancel={() => handleCancel(item.id)}
      onViewDetails={() => {
        // TODO: Navigate to delivery details
      }}
    />
  );

  const renderEmpty = () => (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
      <Truck size={64} color="$colorSecondary" />
      <Text fontSize={18} fontWeight="600" marginTop="$4">
        No Active Deliveries
      </Text>
      <Text fontSize={14} color="$colorSecondary" textAlign="center" marginTop="$2">
        Active deliveries will appear here once orders are accepted.
      </Text>
    </YStack>
  );

  return (
    <YStack flex={1}>
      {/* Stats Row */}
      <XStack gap="$2" marginBottom="$4">
        <StatsCard
          label="Pending"
          value={stats?.pendingOrders || 0}
          icon={<Clock size={20} color="$warning" />}
          color="$warning"
        />
        <StatsCard
          label="Active"
          value={stats?.activeDeliveries || 0}
          icon={<Truck size={20} color="$primary" />}
          color="$primary"
        />
        <StatsCard
          label="Completed"
          value={stats?.completedToday || 0}
          icon={<CheckCircle size={20} color="$success" />}
          color="$success"
        />
      </XStack>

      {/* Deliveries List */}
      {isLoading && !isError ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" />
          <Text marginTop="$2" color="$colorSecondary">
            Loading deliveries...
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={deliveries || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Driver Assignment Modal */}
      <DriverAssignmentModal
        open={!!assignModalDelivery}
        onClose={() => setAssignModalDelivery(null)}
        delivery={assignModalDelivery}
        onAssigned={() => {
          setAssignModalDelivery(null);
          refetch();
        }}
      />
    </YStack>
  );
}

export default ActiveDeliveriesPanel;
