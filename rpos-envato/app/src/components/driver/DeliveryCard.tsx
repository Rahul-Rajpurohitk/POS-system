import React from 'react';
import { styled, XStack, YStack, Text, Card, Button } from 'tamagui';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  Package,
  ChevronRight,
  Store,
  User,
} from '@tamagui/lucide-icons';
import type { Delivery, DeliveryStatus } from '@/types';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { formatDistance, formatDuration } from '@/hooks/useLocationTracking';

const CardContainer = styled(Card, {
  name: 'DeliveryCard',
  padding: '$4',
  marginBottom: '$3',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$background',

  variants: {
    isActive: {
      true: {
        borderColor: '$primary',
        borderWidth: 2,
      },
    },
  } as const,
});

const AddressRow = styled(XStack, {
  name: 'AddressRow',
  alignItems: 'flex-start',
  gap: '$2',
  marginBottom: '$2',
});

const AddressText = styled(Text, {
  name: 'AddressText',
  fontSize: 14,
  flex: 1,
});

const LabelText = styled(Text, {
  name: 'LabelText',
  fontSize: 12,
  color: '$colorSecondary',
  marginBottom: 2,
});

const InfoRow = styled(XStack, {
  name: 'InfoRow',
  alignItems: 'center',
  gap: '$2',
});

const InfoText = styled(Text, {
  name: 'InfoText',
  fontSize: 13,
  color: '$colorSecondary',
});

const Divider = styled(XStack, {
  name: 'Divider',
  height: 1,
  backgroundColor: '$borderColor',
  marginVertical: '$3',
});

const ActionButton = styled(Button, {
  name: 'ActionButton',
  flex: 1,
  size: '$3',

  variants: {
    type: {
      primary: {
        backgroundColor: '$primary',
      },
      secondary: {
        backgroundColor: '$backgroundPress',
      },
      success: {
        backgroundColor: '$success',
      },
    },
  } as const,
});

export interface DeliveryCardProps {
  delivery: Delivery;
  isActive?: boolean;
  onPress?: () => void;
  onNavigate?: () => void;
  onCall?: () => void;
  onUpdateStatus?: (status: DeliveryStatus) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function DeliveryCard({
  delivery,
  isActive = false,
  onPress,
  onNavigate,
  onCall,
  onUpdateStatus,
  showActions = true,
  compact = false,
}: DeliveryCardProps) {
  const isPickingUp =
    delivery.status === 'assigned' || delivery.status === 'picking_up';

  const getNextStatus = (): DeliveryStatus | null => {
    switch (delivery.status) {
      case 'assigned':
        return 'picking_up';
      case 'picking_up':
        return 'picked_up';
      case 'picked_up':
        return 'on_the_way';
      case 'on_the_way':
        return 'nearby';
      case 'nearby':
        return 'delivered';
      default:
        return null;
    }
  };

  const getActionText = (): string => {
    switch (delivery.status) {
      case 'assigned':
        return 'Arrived at Store';
      case 'picking_up':
        return 'Picked Up';
      case 'picked_up':
        return 'Start Delivery';
      case 'on_the_way':
        return 'Nearby';
      case 'nearby':
        return 'Delivered';
      default:
        return 'Update';
    }
  };

  const handleStatusUpdate = () => {
    const nextStatus = getNextStatus();
    if (nextStatus && onUpdateStatus) {
      onUpdateStatus(nextStatus);
    }
  };

  const formatETA = () => {
    if (!delivery.estimatedArrival) return null;
    const eta = new Date(delivery.estimatedArrival);
    const now = new Date();
    const diffSeconds = Math.max(0, (eta.getTime() - now.getTime()) / 1000);
    return formatDuration(diffSeconds);
  };

  return (
    <CardContainer
      isActive={isActive}
      pressStyle={onPress ? { opacity: 0.9 } : undefined}
      onPress={onPress}
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <XStack alignItems="center" gap="$2">
          <Package size={18} color="$primary" />
          <Text fontSize={14} fontWeight="600">
            Order #{delivery.order?.number || delivery.orderId.slice(-6)}
          </Text>
        </XStack>
        <DeliveryStatusBadge status={delivery.status} />
      </XStack>

      {/* Pickup Address */}
      <YStack marginBottom="$2">
        <LabelText>{isPickingUp ? 'Pick up from' : 'Picked up from'}</LabelText>
        <AddressRow>
          <Store size={16} color={isPickingUp ? '$primary' : '$colorSecondary'} />
          <AddressText
            numberOfLines={compact ? 1 : 2}
            color={isPickingUp ? '$color' : '$colorSecondary'}
          >
            {delivery.pickupAddress}
          </AddressText>
        </AddressRow>
      </YStack>

      {/* Delivery Address */}
      <YStack>
        <LabelText>Deliver to</LabelText>
        <AddressRow>
          <MapPin size={16} color={!isPickingUp ? '$primary' : '$colorSecondary'} />
          <AddressText
            numberOfLines={compact ? 1 : 2}
            color={!isPickingUp ? '$color' : '$colorSecondary'}
          >
            {delivery.deliveryAddress}
          </AddressText>
        </AddressRow>
      </YStack>

      {/* Customer Info */}
      {!compact && (
        <XStack marginTop="$2" gap="$4">
          <InfoRow>
            <User size={14} color="$colorSecondary" />
            <InfoText>{delivery.customerName}</InfoText>
          </InfoRow>
          {delivery.customerPhone && (
            <InfoRow>
              <Phone size={14} color="$colorSecondary" />
              <InfoText>{delivery.customerPhone}</InfoText>
            </InfoRow>
          )}
        </XStack>
      )}

      {/* Distance & ETA */}
      <XStack marginTop="$3" gap="$4">
        {delivery.distanceMeters && (
          <InfoRow>
            <Navigation size={14} color="$colorSecondary" />
            <InfoText>{formatDistance(delivery.distanceMeters)}</InfoText>
          </InfoRow>
        )}
        {formatETA() && (
          <InfoRow>
            <Clock size={14} color="$colorSecondary" />
            <InfoText>ETA: {formatETA()}</InfoText>
          </InfoRow>
        )}
      </XStack>

      {/* Delivery Instructions */}
      {delivery.deliveryInstructions && !compact && (
        <>
          <Divider />
          <YStack>
            <LabelText>Instructions</LabelText>
            <Text fontSize={13} numberOfLines={2}>
              {delivery.deliveryInstructions}
            </Text>
          </YStack>
        </>
      )}

      {/* Actions */}
      {showActions && (
        <>
          <Divider />
          <XStack gap="$3">
            {onNavigate && (
              <ActionButton type="secondary" onPress={onNavigate}>
                <Navigation size={16} />
                <Text marginLeft="$1">Navigate</Text>
              </ActionButton>
            )}

            {onCall && delivery.customerPhone && (
              <ActionButton type="secondary" onPress={onCall}>
                <Phone size={16} />
                <Text marginLeft="$1">Call</Text>
              </ActionButton>
            )}

            {onUpdateStatus && getNextStatus() && (
              <ActionButton
                type={delivery.status === 'nearby' ? 'success' : 'primary'}
                onPress={handleStatusUpdate}
              >
                <Text color="white">{getActionText()}</Text>
                <ChevronRight size={16} color="white" />
              </ActionButton>
            )}
          </XStack>
        </>
      )}

      {/* Tip indicator */}
      {delivery.driverTip > 0 && (
        <XStack
          position="absolute"
          top="$2"
          right="$2"
          backgroundColor="$successBackground"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Text fontSize={11} color="$success" fontWeight="600">
            +${delivery.driverTip.toFixed(2)} tip
          </Text>
        </XStack>
      )}
    </CardContainer>
  );
}

export default DeliveryCard;
