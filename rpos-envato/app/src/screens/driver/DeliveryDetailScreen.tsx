/**
 * DeliveryDetailScreen - Enhanced driver delivery details
 *
 * Features:
 * - Order items list with quantities
 * - Status-based action buttons
 * - Live ETA display
 * - Photo proof capture
 * - Customer communication
 * - Earnings breakdown
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Linking, Platform, Vibration } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner, Sheet, AnimatePresence } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Store,
  User,
  Phone,
  Package,
  Clock,
  DollarSign,
  Navigation,
  MessageSquare,
  Check,
  Camera,
  AlertTriangle,
  ChevronRight,
  Copy,
  Truck,
  Timer,
  Zap,
  ArrowUpRight,
  CheckCircle,
  Circle,
  XCircle,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { DeliveryStatusBadge, StatusTimeline } from '@/components/driver';
import { useDelivery, useUpdateDeliveryStatus } from '@/features/driver/hooks';
import { formatDistance, formatDuration } from '@/hooks';
import type { DriverScreenProps } from '@/navigation/types';
import type { DeliveryStatus } from '@/types';

// Status action configuration
const STATUS_ACTIONS: Record<DeliveryStatus, {
  label: string;
  nextStatus: DeliveryStatus;
  icon: React.ReactNode;
  color: string;
  requiresPhoto?: boolean;
} | null> = {
  pending: null,
  accepted: null,
  assigned: {
    label: 'Start Navigation',
    nextStatus: 'picking_up',
    icon: <Navigation size={20} color="white" />,
    color: '$primary',
  },
  picking_up: {
    label: 'Arrived at Store',
    nextStatus: 'picked_up',
    icon: <Store size={20} color="white" />,
    color: '$warning',
  },
  picked_up: {
    label: 'Start Delivery',
    nextStatus: 'on_the_way',
    icon: <Truck size={20} color="white" />,
    color: '$info',
  },
  on_the_way: {
    label: 'Arrived at Customer',
    nextStatus: 'nearby',
    icon: <MapPin size={20} color="white" />,
    color: '$primary',
  },
  nearby: {
    label: 'Complete Delivery',
    nextStatus: 'delivered',
    icon: <CheckCircle size={20} color="white" />,
    color: '$success',
    requiresPhoto: true,
  },
  delivered: null,
  cancelled: null,
  failed: null,
};

export default function DeliveryDetailScreen({
  navigation,
  route,
}: DriverScreenProps<'DeliveryDetail'>) {
  const { deliveryId } = route.params;
  const { data: delivery, isLoading, refetch } = useDelivery(deliveryId);
  const updateStatus = useUpdateDeliveryStatus();

  const [showCompletionSheet, setShowCompletionSheet] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const currentAction = useMemo(() => {
    if (!delivery) return null;
    return STATUS_ACTIONS[delivery.status];
  }, [delivery?.status]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCall = useCallback(() => {
    if (delivery?.customerPhone) {
      Linking.openURL(`tel:${delivery.customerPhone}`);
    }
  }, [delivery?.customerPhone]);

  const handleMessage = useCallback(() => {
    if (delivery?.customerPhone) {
      Linking.openURL(`sms:${delivery.customerPhone}`);
    }
  }, [delivery?.customerPhone]);

  const handleCopyAddress = useCallback((address: string) => {
    // In a real app, use Clipboard API
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
  }, []);

  const handleNavigate = useCallback((latitude?: number, longitude?: number, label?: string) => {
    if (!latitude || !longitude) return;

    // Use platform-specific maps
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
      default: 'https://www.google.com/maps/dir/?api=1&destination=',
    });

    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
    } else {
      const url = Platform.OS === 'ios'
        ? `maps:?daddr=${latitude},${longitude}&q=${encodeURIComponent(label || 'Destination')}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label || 'Destination')})`;
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
      });
    }
  }, []);

  const handleStatusAction = useCallback(async () => {
    if (!delivery || !currentAction) return;

    // If requires photo, show completion sheet
    if (currentAction.requiresPhoto) {
      setShowCompletionSheet(true);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateStatus.mutateAsync({
        deliveryId: delivery.id,
        status: currentAction.nextStatus,
      });

      // Haptic feedback
      if (Platform.OS !== 'web') {
        Vibration.vibrate(100);
      }

      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [delivery, currentAction, updateStatus, refetch]);

  const handleCompleteDelivery = useCallback(async () => {
    if (!delivery) return;

    setIsUpdatingStatus(true);
    try {
      await updateStatus.mutateAsync({
        deliveryId: delivery.id,
        status: 'delivered',
      });

      // Strong haptic for completion
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      setShowCompletionSheet(false);
      refetch();

      // Navigate back after short delay
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('Failed to complete delivery:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [delivery, completionPhoto, updateStatus, refetch, navigation]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateTimeRemaining = () => {
    if (!delivery?.estimatedArrival) return null;
    const eta = new Date(delivery.estimatedArrival);
    const now = new Date();
    const diff = Math.max(0, eta.getTime() - now.getTime());
    const minutes = Math.floor(diff / 60000);
    return minutes;
  };

  const timeRemaining = calculateTimeRemaining();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
          <Text marginTop="$4" color="$colorSecondary">Loading delivery...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" padding="$4">
          <Button variant="ghost" onPress={handleBack} alignSelf="flex-start">
            <ArrowLeft size={24} />
          </Button>
          <Card padding="$6" alignItems="center" marginTop="$4">
            <XCircle size={48} color="$error" />
            <Text fontSize={18} fontWeight="600" marginTop="$3">
              Delivery Not Found
            </Text>
            <Text fontSize={14} color="$colorSecondary" marginTop="$1">
              This delivery may have been cancelled or removed.
            </Text>
            <Button marginTop="$4" onPress={handleBack}>
              Go Back
            </Button>
          </Card>
        </YStack>
      </SafeAreaView>
    );
  }

  const isActiveDelivery = !['delivered', 'cancelled', 'failed'].includes(delivery.status);
  const isPickingUp = ['assigned', 'picking_up'].includes(delivery.status);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        <ScrollView flex={1}>
          {/* Header */}
          <XStack
            padding="$4"
            alignItems="center"
            gap="$3"
            backgroundColor="$cardBackground"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <Button variant="ghost" size="sm" onPress={handleBack} padding="$2">
              <ArrowLeft size={24} />
            </Button>
            <YStack flex={1}>
              <Text fontSize={20} fontWeight="bold">
                Order #{delivery.order?.orderNumber || delivery.orderId.slice(-6)}
              </Text>
              <XStack alignItems="center" gap="$2" marginTop="$1">
                <Text fontSize={12} color="$colorSecondary">
                  {formatDate(delivery.createdAt)}
                </Text>
                <Text fontSize={12} color="$colorSecondary">•</Text>
                <Text fontSize={12} color="$colorSecondary">
                  {formatTime(delivery.createdAt)}
                </Text>
              </XStack>
            </YStack>
            <DeliveryStatusBadge status={delivery.status} size="lg" />
          </XStack>

          {/* ETA Card (for active deliveries) */}
          {isActiveDelivery && timeRemaining !== null && (
            <Card
              margin="$4"
              marginBottom={0}
              padding="$4"
              backgroundColor={timeRemaining <= 5 ? '$errorBackground' : '$primaryBackground'}
            >
              <XStack alignItems="center" gap="$3">
                <YStack
                  width={50}
                  height={50}
                  borderRadius={25}
                  backgroundColor={timeRemaining <= 5 ? '$error' : '$primary'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Timer size={24} color="white" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={14} color="$colorSecondary">
                    Estimated Arrival
                  </Text>
                  <XStack alignItems="baseline" gap="$2">
                    <Text
                      fontSize={28}
                      fontWeight="bold"
                      color={timeRemaining <= 5 ? '$error' : '$primary'}
                    >
                      {timeRemaining}
                    </Text>
                    <Text fontSize={14} color="$colorSecondary">min</Text>
                  </XStack>
                </YStack>
                <YStack alignItems="flex-end">
                  <Text fontSize={12} color="$colorSecondary">ETA</Text>
                  <Text fontSize={16} fontWeight="600">
                    {formatTime(delivery.estimatedArrival)}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          <YStack padding="$4" gap="$4">
            {/* Quick Stats Row */}
            <XStack gap="$3">
              <Card flex={1} padding="$3" alignItems="center">
                <Zap size={20} color="$warning" />
                <Text fontSize={18} fontWeight="bold" marginTop="$1">
                  {formatDistance(delivery.distanceMeters || 0)}
                </Text>
                <Text fontSize={11} color="$colorSecondary">Distance</Text>
              </Card>
              <Card flex={1} padding="$3" alignItems="center">
                <Clock size={20} color="$info" />
                <Text fontSize={18} fontWeight="bold" marginTop="$1">
                  {formatDuration(delivery.estimatedDurationSeconds || 0)}
                </Text>
                <Text fontSize={11} color="$colorSecondary">Est. Time</Text>
              </Card>
              <Card flex={1} padding="$3" alignItems="center">
                <DollarSign size={20} color="$success" />
                <Text fontSize={18} fontWeight="bold" marginTop="$1">
                  ${(delivery.deliveryFee + delivery.driverTip).toFixed(2)}
                </Text>
                <Text fontSize={11} color="$colorSecondary">Earnings</Text>
              </Card>
            </XStack>

            {/* Location Cards */}
            <Card padding={0} overflow="hidden">
              {/* Pickup */}
              <XStack
                padding="$4"
                alignItems="flex-start"
                gap="$3"
                backgroundColor={isPickingUp ? '$primaryBackground' : undefined}
                pressStyle={{ opacity: 0.8 }}
                onPress={() => handleNavigate(delivery.pickupLatitude, delivery.pickupLongitude, 'Store')}
              >
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor={isPickingUp ? '$primary' : '$colorSecondary'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Store size={20} color="white" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={12} color="$colorSecondary" textTransform="uppercase" fontWeight="600">
                    Pickup Location
                  </Text>
                  <Text fontSize={15} marginTop="$1" numberOfLines={2}>
                    {delivery.pickupAddress}
                  </Text>
                </YStack>
                <ArrowUpRight size={20} color="$colorSecondary" />
              </XStack>

              {/* Divider with line */}
              <XStack alignItems="center" paddingLeft="$4">
                <YStack width={40} alignItems="center">
                  <YStack width={2} height={20} backgroundColor="$borderColor" />
                </YStack>
              </XStack>

              {/* Delivery */}
              <XStack
                padding="$4"
                alignItems="flex-start"
                gap="$3"
                backgroundColor={!isPickingUp && isActiveDelivery ? '$successBackground' : undefined}
                pressStyle={{ opacity: 0.8 }}
                onPress={() => handleNavigate(delivery.deliveryLatitude, delivery.deliveryLongitude, 'Customer')}
              >
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor={!isPickingUp ? '$success' : '$colorSecondary'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MapPin size={20} color="white" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={12} color="$colorSecondary" textTransform="uppercase" fontWeight="600">
                    Delivery Location
                  </Text>
                  <Text fontSize={15} marginTop="$1" numberOfLines={2}>
                    {delivery.deliveryAddress}
                  </Text>
                  {delivery.deliveryInstructions && (
                    <XStack
                      marginTop="$2"
                      padding="$2"
                      backgroundColor="$warningBackground"
                      borderRadius="$2"
                      alignItems="center"
                      gap="$2"
                    >
                      <AlertTriangle size={14} color="$warning" />
                      <Text fontSize={12} color="$warning" flex={1}>
                        {delivery.deliveryInstructions}
                      </Text>
                    </XStack>
                  )}
                </YStack>
                <ArrowUpRight size={20} color="$colorSecondary" />
              </XStack>
            </Card>

            {/* Customer Card */}
            <Card padding="$4">
              <XStack alignItems="center" gap="$3">
                <YStack
                  width={50}
                  height={50}
                  borderRadius={25}
                  backgroundColor="$info"
                  alignItems="center"
                  justifyContent="center"
                >
                  <User size={24} color="white" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600">
                    {delivery.customerName}
                  </Text>
                  {delivery.customerPhone && (
                    <Text fontSize={14} color="$colorSecondary">
                      {delivery.customerPhone}
                    </Text>
                  )}
                </YStack>
              </XStack>

              {delivery.customerPhone && (
                <XStack marginTop="$4" gap="$3">
                  <Button
                    flex={1}
                    size="md"
                    variant="secondary"
                    onPress={handleCall}
                    icon={<Phone size={18} />}
                  >
                    Call
                  </Button>
                  <Button
                    flex={1}
                    size="md"
                    variant="secondary"
                    onPress={handleMessage}
                    icon={<MessageSquare size={18} />}
                  >
                    Message
                  </Button>
                </XStack>
              )}
            </Card>

            {/* Order Items */}
            {delivery.order?.items && delivery.order.items.length > 0 && (
              <Card padding="$4">
                <XStack alignItems="center" gap="$2" marginBottom="$3">
                  <Package size={20} color="$warning" />
                  <Text fontSize={16} fontWeight="600">
                    Order Items
                  </Text>
                  <YStack
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    backgroundColor="$warningBackground"
                    borderRadius="$2"
                    marginLeft="auto"
                  >
                    <Text fontSize={12} fontWeight="600" color="$warning">
                      {delivery.order.items.length} items
                    </Text>
                  </YStack>
                </XStack>

                <YStack gap="$2">
                  {delivery.order.items.map((item: any, index: number) => (
                    <XStack
                      key={index}
                      justifyContent="space-between"
                      alignItems="center"
                      paddingVertical="$2"
                      borderBottomWidth={index < delivery.order!.items.length - 1 ? 1 : 0}
                      borderBottomColor="$borderColor"
                    >
                      <XStack alignItems="center" gap="$2" flex={1}>
                        <YStack
                          width={28}
                          height={28}
                          borderRadius={14}
                          backgroundColor="$backgroundPress"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize={12} fontWeight="bold">
                            {item.quantity}x
                          </Text>
                        </YStack>
                        <Text fontSize={14} flex={1} numberOfLines={2}>
                          {item.name || item.product?.name}
                        </Text>
                      </XStack>
                    </XStack>
                  ))}
                </YStack>
              </Card>
            )}

            {/* Earnings Breakdown */}
            <Card padding="$4">
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <DollarSign size={20} color="$success" />
                <Text fontSize={16} fontWeight="600">
                  Earnings Breakdown
                </Text>
              </XStack>

              <YStack gap="$2">
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="$colorSecondary">Base Delivery Fee</Text>
                  <Text fontSize={14}>${delivery.deliveryFee.toFixed(2)}</Text>
                </XStack>

                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="$colorSecondary">Customer Tip</Text>
                  <Text fontSize={14} color="$success">+${delivery.driverTip.toFixed(2)}</Text>
                </XStack>

                <XStack
                  justifyContent="space-between"
                  marginTop="$2"
                  paddingTop="$2"
                  borderTopWidth={1}
                  borderTopColor="$borderColor"
                >
                  <Text fontSize={16} fontWeight="bold">Total Earnings</Text>
                  <Text fontSize={18} fontWeight="bold" color="$success">
                    ${(delivery.deliveryFee + delivery.driverTip).toFixed(2)}
                  </Text>
                </XStack>
              </YStack>
            </Card>

            {/* Status Timeline */}
            <Card>
              <XStack alignItems="center" gap="$2" padding="$4" paddingBottom={0}>
                <Clock size={20} color="$colorSecondary" />
                <Text fontSize={16} fontWeight="600">
                  Delivery Timeline
                </Text>
              </XStack>
              <StatusTimeline
                currentStatus={delivery.status}
                timestamps={{
                  created: delivery.createdAt,
                  accepted: delivery.acceptedAt,
                  assigned: delivery.assignedAt,
                  pickedUp: delivery.pickedUpAt,
                  delivered: delivery.deliveredAt,
                }}
                showAllSteps
              />
            </Card>

            {/* Customer Rating (for completed deliveries) */}
            {delivery.customerRating && (
              <Card padding="$4">
                <XStack alignItems="center" gap="$2" marginBottom="$3">
                  <Text fontSize={20}>⭐</Text>
                  <Text fontSize={16} fontWeight="600">
                    Customer Feedback
                  </Text>
                </XStack>

                <XStack alignItems="center" gap="$1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                      key={star}
                      fontSize={28}
                      opacity={star <= delivery.customerRating! ? 1 : 0.2}
                    >
                      ⭐
                    </Text>
                  ))}
                  <Text fontSize={20} fontWeight="bold" marginLeft="$3">
                    {delivery.customerRating}/5
                  </Text>
                </XStack>

                {delivery.customerFeedback && (
                  <Card
                    backgroundColor="$backgroundPress"
                    padding="$3"
                    marginTop="$3"
                    borderLeftWidth={3}
                    borderLeftColor="$primary"
                  >
                    <Text fontSize={14} fontStyle="italic" color="$colorSecondary">
                      "{delivery.customerFeedback}"
                    </Text>
                  </Card>
                )}
              </Card>
            )}

            {/* Spacer for bottom action button */}
            {currentAction && <YStack height={80} />}
          </YStack>
        </ScrollView>

        {/* Bottom Action Button */}
        {currentAction && (
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            padding="$4"
            paddingBottom="$5"
            backgroundColor="$background"
            borderTopWidth={1}
            borderTopColor="$borderColor"
          >
            <Button
              size="lg"
              backgroundColor={currentAction.color}
              onPress={handleStatusAction}
              disabled={isUpdatingStatus}
              icon={isUpdatingStatus ? <Spinner size="small" color="white" /> : currentAction.icon}
            >
              <Text color="white" fontSize={16} fontWeight="bold">
                {isUpdatingStatus ? 'Updating...' : currentAction.label}
              </Text>
            </Button>
          </YStack>
        )}

        {/* Completion Sheet */}
        <Sheet
          modal
          open={showCompletionSheet}
          onOpenChange={setShowCompletionSheet}
          snapPoints={[60]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" backgroundColor="$background">
            <Sheet.Handle />

            <YStack alignItems="center" marginTop="$4">
              <YStack
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor="$successBackground"
                alignItems="center"
                justifyContent="center"
                marginBottom="$4"
              >
                <CheckCircle size={40} color="$success" />
              </YStack>

              <Text fontSize={22} fontWeight="bold" textAlign="center">
                Complete Delivery
              </Text>
              <Text fontSize={14} color="$colorSecondary" textAlign="center" marginTop="$2">
                Take a photo of the delivered order as proof of delivery
              </Text>
            </YStack>

            {/* Photo Capture */}
            <Card
              marginTop="$4"
              padding="$6"
              alignItems="center"
              backgroundColor="$backgroundPress"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => {
                // TODO: Implement camera/photo picker
                setCompletionPhoto('placeholder');
              }}
            >
              {completionPhoto ? (
                <YStack alignItems="center" gap="$2">
                  <Check size={32} color="$success" />
                  <Text fontSize={14} color="$success" fontWeight="600">
                    Photo captured
                  </Text>
                </YStack>
              ) : (
                <YStack alignItems="center" gap="$2">
                  <Camera size={32} color="$colorSecondary" />
                  <Text fontSize={14} color="$colorSecondary">
                    Tap to take photo
                  </Text>
                </YStack>
              )}
            </Card>

            <XStack gap="$3" marginTop="$4">
              <Button
                flex={1}
                variant="secondary"
                size="lg"
                onPress={() => setShowCompletionSheet(false)}
              >
                Cancel
              </Button>
              <Button
                flex={1}
                size="lg"
                backgroundColor="$success"
                onPress={handleCompleteDelivery}
                disabled={isUpdatingStatus}
              >
                <Text color="white" fontWeight="bold">
                  {isUpdatingStatus ? 'Completing...' : 'Confirm Delivery'}
                </Text>
              </Button>
            </XStack>

            {/* Skip photo option */}
            <Button
              variant="ghost"
              size="sm"
              marginTop="$3"
              onPress={handleCompleteDelivery}
            >
              <Text color="$colorSecondary" fontSize={13}>
                Complete without photo
              </Text>
            </Button>
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </SafeAreaView>
  );
}
