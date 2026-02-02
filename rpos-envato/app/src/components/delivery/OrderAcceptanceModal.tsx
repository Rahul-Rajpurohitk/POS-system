import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Spinner, Sheet } from 'tamagui';
import {
  Clock,
  MapPin,
  Phone,
  User,
  Package,
  DollarSign,
  X,
  Check,
  AlertTriangle,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useCountdown, useAcceptOrder, useRejectOrder } from '@/features/delivery/hooks';
import type { OnlineOrderQueueItem } from '@/features/delivery/api';

interface OrderAcceptanceModalProps {
  open: boolean;
  onClose: () => void;
  order: OnlineOrderQueueItem | null;
  onAccepted?: () => void;
}

export function OrderAcceptanceModal({
  open,
  onClose,
  order,
  onAccepted,
}: OrderAcceptanceModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();

  const { formatted, isUrgent, isExpired } = useCountdown(order?.expiresAt || null);

  const handleAccept = async () => {
    if (!order) return;
    try {
      // Use queue entry id, not orderId
      await acceptOrder.mutateAsync(order.id);
      onAccepted?.();
      onClose();
    } catch (error) {
      console.error('Failed to accept order:', error);
    }
  };

  const handleReject = async () => {
    if (!order) return;
    try {
      // Use queue entry id, not orderId
      await rejectOrder.mutateAsync({ orderId: order.id, reason: rejectReason });
      setShowRejectConfirm(false);
      setRejectReason('');
      onClose();
    } catch (error) {
      console.error('Failed to reject order:', error);
    }
  };

  if (!order) return null;

  const orderData = order.order;
  const items = orderData?.items || [];
  const customer = orderData?.customer;
  const total = orderData?.total || orderData?.payment?.total || 0;
  const subtotal = orderData?.payment?.subtotal || total;
  const tax = orderData?.payment?.tax || 0;
  const deliveryFee = orderData?.deliveryFee || 0;

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
      snapPoints={[85]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame padding="$4">
        <Sheet.Handle />

        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <YStack>
            <Text fontSize={20} fontWeight="bold">
              Order #{orderData?.number || order.orderId.slice(-6)}
            </Text>
            <Text fontSize={12} color="$colorSecondary">
              Online Order - Awaiting Acceptance
            </Text>
          </YStack>

          {/* Timer */}
          <YStack
            backgroundColor={isExpired ? '$errorBackground' : isUrgent ? '$warningBackground' : '$primaryBackground'}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$3"
            alignItems="center"
          >
            <XStack alignItems="center" gap="$1">
              <Clock size={16} color={isExpired ? '$error' : isUrgent ? '$warning' : '$primary'} />
              <Text
                fontSize={18}
                fontWeight="bold"
                color={isExpired ? '$error' : isUrgent ? '$warning' : '$primary'}
              >
                {isExpired ? 'Expired' : formatted}
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {isExpired && (
          <Card
            backgroundColor="$errorBackground"
            padding="$3"
            marginBottom="$4"
            flexDirection="row"
            alignItems="center"
            gap="$2"
          >
            <AlertTriangle size={20} color="$error" />
            <Text color="$error" flex={1}>
              This order has expired and can no longer be accepted.
            </Text>
          </Card>
        )}

        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          {/* Customer Info */}
          {customer && (
            <Card padding="$3" marginBottom="$3">
              <Text fontSize={14} fontWeight="600" marginBottom="$2">
                Customer
              </Text>
              <XStack alignItems="center" gap="$2" marginBottom="$2">
                <User size={16} color="$colorSecondary" />
                <Text fontSize={14}>
                  {customer.firstName} {customer.lastName}
                </Text>
              </XStack>
              {customer.phone && (
                <XStack alignItems="center" gap="$2" marginBottom="$2">
                  <Phone size={16} color="$colorSecondary" />
                  <Text fontSize={14}>{customer.phone}</Text>
                </XStack>
              )}
              {orderData?.deliveryAddress && (
                <XStack alignItems="flex-start" gap="$2">
                  <MapPin size={16} color="$colorSecondary" marginTop={2} />
                  <Text fontSize={14} flex={1}>
                    {orderData.deliveryAddress}
                  </Text>
                </XStack>
              )}
            </Card>
          )}

          {/* Order Items */}
          <Card padding="$3" marginBottom="$3">
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <Package size={18} color="$primary" />
              <Text fontSize={14} fontWeight="600">
                Order Items ({items.length})
              </Text>
            </XStack>

            {items.map((item, index) => (
              <XStack
                key={index}
                justifyContent="space-between"
                paddingVertical="$2"
                borderBottomWidth={index < items.length - 1 ? 1 : 0}
                borderBottomColor="$borderColor"
              >
                <XStack flex={1} gap="$2">
                  <Text fontSize={14} color="$colorSecondary">
                    {item.quantity}x
                  </Text>
                  <YStack flex={1}>
                    <Text fontSize={14}>{item.product?.name || 'Item'}</Text>
                    {item.notes && (
                      <Text fontSize={12} color="$colorSecondary">
                        Note: {item.notes}
                      </Text>
                    )}
                  </YStack>
                </XStack>
                <Text fontSize={14}>
                  ${((item.product?.sellingPrice || 0) * item.quantity).toFixed(2)}
                </Text>
              </XStack>
            ))}
          </Card>

          {/* Order Total */}
          <Card padding="$3" marginBottom="$3">
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <DollarSign size={18} color="$primary" />
              <Text fontSize={14} fontWeight="600">
                Order Summary
              </Text>
            </XStack>

            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize={14} color="$colorSecondary">Subtotal</Text>
                <Text fontSize={14}>${subtotal.toFixed(2)}</Text>
              </XStack>
              {tax > 0 && (
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="$colorSecondary">Tax</Text>
                  <Text fontSize={14}>${tax.toFixed(2)}</Text>
                </XStack>
              )}
              {deliveryFee > 0 && (
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="$colorSecondary">Delivery Fee</Text>
                  <Text fontSize={14}>${deliveryFee.toFixed(2)}</Text>
                </XStack>
              )}
              <XStack
                justifyContent="space-between"
                paddingTop="$2"
                borderTopWidth={1}
                borderTopColor="$borderColor"
              >
                <Text fontSize={16} fontWeight="bold">Total</Text>
                <Text fontSize={16} fontWeight="bold" color="$primary">
                  ${total.toFixed(2)}
                </Text>
              </XStack>
            </YStack>
          </Card>

          {/* Special Instructions */}
          {orderData?.notes && (
            <Card padding="$3" marginBottom="$3" backgroundColor="$warningBackground">
              <Text fontSize={14} fontWeight="600" marginBottom="$1">
                Special Instructions
              </Text>
              <Text fontSize={14}>{orderData.notes}</Text>
            </Card>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {!showRejectConfirm ? (
          <XStack gap="$3" paddingTop="$4">
            <Button
              flex={1}
              size="lg"
              variant="secondary"
              onPress={() => setShowRejectConfirm(true)}
              disabled={acceptOrder.isPending || isExpired}
            >
              <X size={20} />
              <Text marginLeft="$2">Reject</Text>
            </Button>
            <Button
              flex={2}
              size="lg"
              onPress={handleAccept}
              disabled={acceptOrder.isPending || isExpired}
            >
              {acceptOrder.isPending ? (
                <Spinner color="white" />
              ) : (
                <>
                  <Check size={20} color="white" />
                  <Text color="white" fontWeight="600" marginLeft="$2">
                    Accept Order
                  </Text>
                </>
              )}
            </Button>
          </XStack>
        ) : (
          <YStack gap="$3" paddingTop="$4">
            <Text fontSize={14} fontWeight="600">
              Are you sure you want to reject this order?
            </Text>
            <XStack gap="$3">
              <Button
                flex={1}
                variant="secondary"
                onPress={() => setShowRejectConfirm(false)}
                disabled={rejectOrder.isPending}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                flex={1}
                backgroundColor="$error"
                onPress={handleReject}
                disabled={rejectOrder.isPending}
              >
                {rejectOrder.isPending ? (
                  <Spinner color="white" />
                ) : (
                  <Text color="white" fontWeight="600">Confirm Reject</Text>
                )}
              </Button>
            </XStack>
          </YStack>
        )}
      </Sheet.Frame>
    </Sheet>
  );
}

export default OrderAcceptanceModal;
