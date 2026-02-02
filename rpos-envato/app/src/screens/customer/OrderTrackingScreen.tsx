import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner, Avatar } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  Package,
  CheckCircle,
  Circle,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderDetails } from '@/features/customer/hooks';
import { useTrackingInfo, useDriverLocation } from '@/features/driver/hooks';
import type { CustomerScreenProps } from '@/navigation/types';
import type { DeliveryStatus, Delivery } from '@/types';

// Tracking info type from API
interface TrackingInfo {
  id: string;
  status: DeliveryStatus;
  statusText: string;
  deliveryAddress: string;
  estimatedArrival?: string;
  driver?: {
    name: string;
    vehicleType: string;
    rating: number;
    phone?: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  routePolyline?: string;
  timestamps: {
    created?: string;
    accepted?: string;
    assigned?: string;
    pickedUp?: string;
    delivered?: string;
  };
  deliveryFee: number;
  driverTip: number;
}

// Status Step Component
function StatusStep({
  label,
  time,
  isActive,
  isCompleted,
  isLast,
}: {
  status: DeliveryStatus;
  label: string;
  time?: string;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
}) {
  return (
    <XStack>
      <YStack alignItems="center" marginRight="$3">
        {isCompleted ? (
          <CheckCircle size={24} color="$success" />
        ) : isActive ? (
          <YStack
            width={24}
            height={24}
            borderRadius={12}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <YStack width={8} height={8} borderRadius={4} backgroundColor="white" />
          </YStack>
        ) : (
          <Circle size={24} color="$colorSecondary" />
        )}
        {!isLast && (
          <YStack
            width={2}
            height={30}
            backgroundColor={isCompleted ? '$success' : '$borderColor'}
            marginVertical="$1"
          />
        )}
      </YStack>
      <YStack flex={1} paddingBottom={isLast ? 0 : '$3'}>
        <Text
          fontSize={14}
          fontWeight={isActive ? '600' : '400'}
          color={isActive ? '$color' : '$colorSecondary'}
        >
          {label}
        </Text>
        {time && (
          <Text fontSize={12} color="$colorSecondary" marginTop="$1">
            {time}
          </Text>
        )}
      </YStack>
    </XStack>
  );
}

// Helper to get timestamp from either tracking info or delivery
function getTimestamp(
  trackingInfo: TrackingInfo | null | undefined,
  activeDelivery: Delivery | null,
  field: 'created' | 'accepted' | 'assigned' | 'pickedUp' | 'delivered'
): string | undefined {
  // First try tracking info timestamps
  if (trackingInfo?.timestamps?.[field]) {
    return trackingInfo.timestamps[field];
  }
  // Fallback to delivery entity timestamps
  if (activeDelivery) {
    const fieldMap: Record<string, keyof Delivery> = {
      created: 'createdAt',
      accepted: 'acceptedAt',
      assigned: 'assignedAt',
      pickedUp: 'pickedUpAt',
      delivered: 'deliveredAt',
    };
    const deliveryField = fieldMap[field];
    const value = activeDelivery[deliveryField];
    return typeof value === 'string' ? value : value?.toString();
  }
  return undefined;
}

export default function OrderTrackingScreen({
  navigation,
  route,
}: CustomerScreenProps<'OrderTracking'>) {
  const { orderId, trackingToken: routeTrackingToken } = route.params;
  const { activeDelivery, setActiveDelivery } = useCustomerStore();

  const { data: order, isLoading: orderLoading } = useOrderDetails(orderId);
  const {
    data: trackingInfo,
    isLoading: trackingLoading,
  } = useTrackingInfo(routeTrackingToken || '');

  const {
    data: driverLocation,
  } = useDriverLocation(routeTrackingToken || '', !!routeTrackingToken);

  // Cast tracking info to our local type
  const tracking = trackingInfo as TrackingInfo | undefined;

  // Sync tracking info to store
  useEffect(() => {
    if (tracking) {
      // Convert tracking info to Delivery-like structure for store
      // Using unknown cast since we're creating a partial Delivery object
      setActiveDelivery({
        id: tracking.id,
        status: tracking.status,
        deliveryAddress: tracking.deliveryAddress,
        estimatedArrival: tracking.estimatedArrival ? new Date(tracking.estimatedArrival) : null,
        deliveryFee: tracking.deliveryFee,
        driverTip: tracking.driverTip,
      } as unknown as Delivery);
    }
  }, [tracking, setActiveDelivery]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCallDriver = () => {
    const phone = tracking?.driver?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleMessageDriver = () => {
    const phone = tracking?.driver?.phone;
    if (phone) {
      Linking.openURL(`sms:${phone}`);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentStatus = tracking?.status || activeDelivery?.status || 'pending';
  const deliveryAddress = tracking?.deliveryAddress || activeDelivery?.deliveryAddress;
  const estimatedArrival = tracking?.estimatedArrival;

  const statusSteps: Array<{
    status: DeliveryStatus;
    label: string;
    timestamp?: string;
  }> = [
    { status: 'pending', label: 'Order Received', timestamp: getTimestamp(tracking, activeDelivery, 'created') },
    { status: 'accepted', label: 'Preparing', timestamp: getTimestamp(tracking, activeDelivery, 'accepted') },
    { status: 'assigned', label: 'Driver Assigned', timestamp: getTimestamp(tracking, activeDelivery, 'assigned') },
    { status: 'picked_up', label: 'Picked Up', timestamp: getTimestamp(tracking, activeDelivery, 'pickedUp') },
    { status: 'on_the_way', label: 'On the Way' },
    { status: 'delivered', label: 'Delivered', timestamp: getTimestamp(tracking, activeDelivery, 'delivered') },
  ];

  const getStepState = (stepStatus: DeliveryStatus) => {
    const statusOrder = statusSteps.map((s) => s.status);
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);

    return {
      isCompleted: stepIndex < currentIndex,
      isActive: stepIndex === currentIndex,
    };
  };

  // Get driver info from tracking or delivery
  const driverInfo = tracking?.driver || (activeDelivery?.driver ? {
    name: activeDelivery.driver.user?.firstName || 'Driver',
    rating: activeDelivery.driver.averageRating || 5.0,
    vehicleType: activeDelivery.driver.vehicleType || 'car',
    phone: undefined,
  } : null);

  if (orderLoading || trackingLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" />
          <Text marginTop="$2" color="$colorSecondary">
            Loading order details...
          </Text>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack padding="$4" alignItems="center" gap="$3">
          <Button variant="ghost" size="icon" onPress={handleBack}>
            <ArrowLeft size={24} />
          </Button>
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="bold">
              Track Order
            </Text>
            <Text fontSize={12} color="$colorSecondary">
              Order #{order?.number || orderId.slice(-6)}
            </Text>
          </YStack>
        </XStack>

        <ScrollView flex={1} paddingHorizontal="$4">
          {/* Map Placeholder */}
          <Card height={200} marginBottom="$4" alignItems="center" justifyContent="center">
            <MapPin size={48} color="$colorSecondary" />
            <Text color="$colorSecondary" marginTop="$2">
              Map View
            </Text>
            <Text fontSize={12} color="$colorSecondary">
              (Live tracking with Mapbox)
            </Text>
            {driverLocation && (
              <Text fontSize={11} color="$primary" marginTop="$2">
                Driver: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
              </Text>
            )}
          </Card>

          {/* ETA Card */}
          {estimatedArrival && currentStatus !== 'delivered' && (
            <Card padding="$4" marginBottom="$4" backgroundColor="$primaryBackground">
              <XStack alignItems="center" gap="$3">
                <Clock size={24} color="$primary" />
                <YStack flex={1}>
                  <Text fontSize={12} color="$colorSecondary">
                    Estimated Arrival
                  </Text>
                  <Text fontSize={20} fontWeight="bold" color="$primary">
                    {formatTime(estimatedArrival)}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Driver Info */}
          {driverInfo && (
            <Card padding="$4" marginBottom="$4">
              <XStack alignItems="center" gap="$3">
                <Avatar circular size="$5">
                  <Avatar.Fallback backgroundColor="$primary">
                    <Text color="white" fontSize={18} fontWeight="bold">
                      {driverInfo.name?.charAt(0) || 'D'}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600">
                    {driverInfo.name || 'Driver'}
                  </Text>
                  <XStack alignItems="center" gap="$1" marginTop="$1">
                    <Text fontSize={12}>⭐</Text>
                    <Text fontSize={12} color="$colorSecondary">
                      {(driverInfo.rating || 5.0).toFixed(1)}
                    </Text>
                  </XStack>
                </YStack>
                {driverInfo.phone && (
                  <XStack gap="$2">
                    <Button size="icon" variant="secondary" onPress={handleCallDriver}>
                      <Phone size={20} />
                    </Button>
                    <Button size="icon" variant="secondary" onPress={handleMessageDriver}>
                      <MessageSquare size={20} />
                    </Button>
                  </XStack>
                )}
              </XStack>
            </Card>
          )}

          {/* Status Timeline */}
          <Card padding="$4" marginBottom="$4">
            <Text fontSize={16} fontWeight="600" marginBottom="$4">
              Order Status
            </Text>
            <YStack>
              {statusSteps.map((step, index) => {
                const { isCompleted, isActive } = getStepState(step.status);
                return (
                  <StatusStep
                    key={step.status}
                    status={step.status}
                    label={step.label}
                    time={formatTime(step.timestamp) || undefined}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    isLast={index === statusSteps.length - 1}
                  />
                );
              })}
            </YStack>
          </Card>

          {/* Delivery Address */}
          <Card padding="$4" marginBottom="$4">
            <XStack alignItems="flex-start" gap="$3">
              <MapPin size={20} color="$primary" />
              <YStack flex={1}>
                <Text fontSize={12} color="$colorSecondary">
                  Delivery Address
                </Text>
                <Text fontSize={14} marginTop="$1">
                  {deliveryAddress || 'N/A'}
                </Text>
                {activeDelivery?.deliveryInstructions && (
                  <Text fontSize={12} color="$colorSecondary" marginTop="$1">
                    Note: {activeDelivery.deliveryInstructions}
                  </Text>
                )}
              </YStack>
            </XStack>
          </Card>

          {/* Order Items Summary */}
          <Card padding="$4" marginBottom="$4">
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <Package size={20} color="$primary" />
              <Text fontSize={16} fontWeight="600">
                Order Summary
              </Text>
            </XStack>
            {order?.items?.map((item, index: number) => (
              <XStack key={index} justifyContent="space-between" marginBottom="$2">
                <Text fontSize={14} color="$colorSecondary">
                  {item.quantity}x {item.product?.name || 'Item'}
                </Text>
                <Text fontSize={14}>
                  ${((item.product?.sellingPrice || 0) * item.quantity).toFixed(2)}
                </Text>
              </XStack>
            ))}
            <XStack
              justifyContent="space-between"
              paddingTop="$2"
              borderTopWidth={1}
              borderTopColor="$borderColor"
            >
              <Text fontSize={14} fontWeight="600">
                Total
              </Text>
              <Text fontSize={14} fontWeight="bold" color="$primary">
                ${order?.total?.toFixed(2) || '0.00'}
              </Text>
            </XStack>
          </Card>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
