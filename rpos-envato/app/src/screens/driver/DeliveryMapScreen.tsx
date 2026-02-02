/**
 * DeliveryMapScreen - Full turn-by-turn navigation for drivers
 *
 * Features:
 * - Real-time GPS tracking with DriverNavigationMap
 * - Dark/light mode toggle for day/night driving
 * - Vehicle type selection (walking, bicycle, motorcycle, car)
 * - Turn-by-turn navigation with maneuver instructions
 * - ETA calculation based on real routing
 * - Status updates at each delivery stage
 * - Customer contact options (call/message)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, Linking, Platform, Vibration } from 'react-native';
import { YStack, XStack, Text, Spinner, Button as TButton, Sheet } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Navigation,
  Phone,
  MessageSquare,
  MapPin,
  Store,
  Clock,
  ChevronUp,
  ChevronDown,
  Package,
  User,
  AlertTriangle,
  Check,
  X,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { DeliveryStatusBadge } from '@/components/driver';
import { DriverNavigationMap, type VehicleType } from '@/components/delivery';
import { useDriverStore } from '@/store/driverStore';
import {
  useActiveDelivery,
  useDeliveryRoute,
  useUpdateDeliveryStatus,
  useCompleteDelivery,
} from '@/features/driver/hooks';
import { useLocationTracking, formatDistance, formatDuration } from '@/hooks';
import { calculateRoute, type RouteResult } from '@/services/navigation/routingEngine';
import type { DriverTabScreenProps } from '@/navigation/types';
import type { DeliveryStatus } from '@/types';
import type { Coordinate } from '@/components/delivery/DeliveryMap';

// Map vehicle type to routing profile
const vehicleToProfile: Record<VehicleType, 'walking' | 'cycling' | 'driving'> = {
  walking: 'walking',
  bicycle: 'cycling',
  motorcycle: 'driving',
  car: 'driving',
  transit: 'driving', // Transit falls back to driving for route calculation
};

export default function DeliveryMapScreen({
  navigation,
  route: routeParams,
}: DriverTabScreenProps<'DeliveryMap'>) {
  const deliveryIdParam = routeParams.params?.deliveryId;
  const { activeDelivery, currentLocation: storeLocation } = useDriverStore();
  const {
    location,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentLocation,
  } = useLocationTracking();

  // Extract heading and speed from location
  const heading = location?.heading;
  const speed = location?.speed;

  // Use param delivery ID or active delivery
  const deliveryId = deliveryIdParam || activeDelivery?.id;

  const { data: delivery, isLoading: deliveryLoading } = useActiveDelivery();
  const { data: routeData, isLoading: routeLoading } = useDeliveryRoute(deliveryId || '');

  const updateStatus = useUpdateDeliveryStatus();
  const completeDelivery = useCompleteDelivery();

  // Local state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [tripState, setTripState] = useState<'idle' | 'preview' | 'navigating' | 'arrived'>('preview');
  const [calculatedRoute, setCalculatedRoute] = useState<RouteResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const currentDelivery = delivery || activeDelivery;

  // Determine if we're picking up or delivering
  const isPickingUp =
    currentDelivery?.status === 'assigned' || currentDelivery?.status === 'picking_up';

  // Current driver location
  const driverLocation: Coordinate = useMemo(
    () => ({
      latitude: location?.latitude || storeLocation?.latitude || 37.7749,
      longitude: location?.longitude || storeLocation?.longitude || -122.4194,
    }),
    [location, storeLocation]
  );

  // Destination based on delivery stage
  const destination: Coordinate | null = useMemo(() => {
    if (!currentDelivery) return null;
    if (isPickingUp) {
      return {
        latitude: currentDelivery.pickupLatitude || 0,
        longitude: currentDelivery.pickupLongitude || 0,
      };
    }
    return {
      latitude: currentDelivery.deliveryLatitude || 0,
      longitude: currentDelivery.deliveryLongitude || 0,
    };
  }, [currentDelivery, isPickingUp]);

  // Store/pickup location for reference
  const pickupLocation: Coordinate | null = useMemo(() => {
    if (!currentDelivery) return null;
    return {
      latitude: currentDelivery.pickupLatitude || 0,
      longitude: currentDelivery.pickupLongitude || 0,
    };
  }, [currentDelivery]);

  // Start location tracking when screen mounts
  useEffect(() => {
    if (currentDelivery && !isTracking) {
      startTracking();
    }
    return () => {
      // Don't stop tracking on unmount - driver might still be navigating
    };
  }, [currentDelivery, isTracking, startTracking]);

  // Calculate route when destination or vehicle type changes
  useEffect(() => {
    const fetchRoute = async () => {
      if (!destination || destination.latitude === 0) return;

      setRouteError(null);
      try {
        const results = await calculateRoute(
          driverLocation,
          destination,
          vehicleType // Pass the actual vehicle type
        );
        // Take the first route from results
        if (results && results.length > 0) {
          setCalculatedRoute(results[0]);
          setCurrentStepIndex(0);
        }
      } catch (error) {
        console.error('Route calculation failed:', error);
        setRouteError('Unable to calculate route. Using estimated time.');
      }
    };

    fetchRoute();
  }, [destination, vehicleType, driverLocation.latitude, driverLocation.longitude]);

  // Check if driver is near destination
  useEffect(() => {
    if (tripState === 'navigating' && calculatedRoute) {
      const distanceMeters = calculatedRoute.distance;
      // If within 50 meters, mark as arrived
      if (distanceMeters < 50) {
        setTripState('arrived');
        Vibration.vibrate([0, 200, 100, 200]);
      }
    }
  }, [calculatedRoute, tripState]);

  // Update current step based on location
  useEffect(() => {
    if (!calculatedRoute?.steps || tripState !== 'navigating') return;

    // Find the closest step based on distance
    // This is a simplified version - production would use more sophisticated logic
    const steps = calculatedRoute.steps;
    if (currentStepIndex < steps.length - 1) {
      const currentStep = steps[currentStepIndex];
      if (currentStep.distance < 20) {
        // Within 20 meters of step completion
        setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
      }
    }
  }, [driverLocation, calculatedRoute, currentStepIndex, tripState]);

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Handle vehicle type change
  const handleVehicleTypeChange = useCallback((type: VehicleType) => {
    setVehicleType(type);
    // Route will be recalculated via useEffect
  }, []);

  // Handle start trip
  const handleStartTrip = useCallback(() => {
    setTripState('navigating');
    Vibration.vibrate(100);
  }, []);

  // Handle end trip
  const handleEndTrip = useCallback(() => {
    setTripState('preview');
    stopTracking();
  }, [stopTracking]);

  // Handle recenter
  const handleRecenter = useCallback(async () => {
    await getCurrentLocation();
  }, [getCurrentLocation]);

  // Contact customer
  const handleCall = useCallback(() => {
    if (currentDelivery?.customerPhone) {
      Linking.openURL(`tel:${currentDelivery.customerPhone}`);
    }
  }, [currentDelivery?.customerPhone]);

  const handleMessage = useCallback(() => {
    if (currentDelivery?.customerPhone) {
      Linking.openURL(`sms:${currentDelivery.customerPhone}`);
    }
  }, [currentDelivery?.customerPhone]);

  // Open in external maps app
  const handleExternalNavigation = useCallback(() => {
    if (!destination) return;

    const url = Platform.select({
      ios: `maps:0,0?q=${destination.latitude},${destination.longitude}`,
      android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
    });

    Linking.openURL(url);
  }, [destination]);

  // Delivery status progression
  const getNextStatus = (): DeliveryStatus | null => {
    if (!currentDelivery) return null;
    switch (currentDelivery.status) {
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
    if (!currentDelivery) return 'Update';
    switch (currentDelivery.status) {
      case 'assigned':
        return 'Arrived at Store';
      case 'picking_up':
        return 'Picked Up Order';
      case 'picked_up':
        return 'Start Delivery';
      case 'on_the_way':
        return "I'm Nearby";
      case 'nearby':
        return 'Complete Delivery';
      default:
        return 'Update';
    }
  };

  const handleStatusUpdate = useCallback(async () => {
    if (!currentDelivery) return;

    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    Vibration.vibrate(100);

    if (nextStatus === 'delivered') {
      completeDelivery.mutate({
        deliveryId: currentDelivery.id,
        data: {},
      });
    } else {
      updateStatus.mutate({
        deliveryId: currentDelivery.id,
        status: nextStatus,
      });
    }
  }, [currentDelivery, completeDelivery, updateStatus]);

  // Format ETA
  const etaMinutes = useMemo(() => {
    if (calculatedRoute?.duration) {
      return Math.round(calculatedRoute.duration / 60);
    }
    if (currentDelivery?.estimatedArrival) {
      const eta = new Date(currentDelivery.estimatedArrival);
      const now = new Date();
      return Math.round((eta.getTime() - now.getTime()) / 60000);
    }
    return null;
  }, [calculatedRoute, currentDelivery]);

  // Format remaining distance
  const distanceRemaining = useMemo(() => {
    if (calculatedRoute?.distance) {
      return formatDistance(calculatedRoute.distance);
    }
    return null;
  }, [calculatedRoute]);

  // Format distance to next turn
  const distanceToNextTurn = useMemo(() => {
    if (calculatedRoute?.steps?.[currentStepIndex]) {
      return formatDistance(calculatedRoute.steps[currentStepIndex].distance);
    }
    return null;
  }, [calculatedRoute, currentStepIndex]);

  // Route coordinates for polyline
  const routeCoordinates = useMemo(() => {
    if (calculatedRoute?.coordinates) {
      return calculatedRoute.coordinates;
    }
    // Fallback: straight line
    if (destination) {
      return [driverLocation, destination];
    }
    return [];
  }, [calculatedRoute, driverLocation, destination]);

  // No active delivery state
  if (!currentDelivery) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" padding="$4" alignItems="center" justifyContent="center">
          <Card padding="$6" alignItems="center" maxWidth={320}>
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="$backgroundPress"
              alignItems="center"
              justifyContent="center"
              marginBottom="$4"
            >
              <MapPin size={40} color="$colorSecondary" />
            </YStack>
            <Text fontSize={18} fontWeight="600" textAlign="center" marginBottom="$2">
              No Active Delivery
            </Text>
            <Text fontSize={14} color="$colorSecondary" textAlign="center">
              Accept a delivery from the Home tab to start navigating
            </Text>
            <Button
              size="md"
              marginTop="$4"
              onPress={() => navigation.navigate('DriverHome')}
            >
              <Text color="white">Go to Home</Text>
            </Button>
          </Card>
        </YStack>
      </SafeAreaView>
    );
  }

  // Loading state
  if (deliveryLoading && !currentDelivery) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
          <Text marginTop="$3" color="$colorSecondary">
            Loading delivery...
          </Text>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <YStack flex={1} backgroundColor={isDarkMode ? '#0f172a' : '$background'}>
      {/* Full-screen navigation map */}
      {destination && (
        <YStack flex={1}>
          <DriverNavigationMap
            driverLocation={driverLocation}
            destination={destination}
            pickupLocation={pickupLocation || undefined}
            heading={heading || 0}
            speed={speed || 0}
            route={routeCoordinates}
            steps={calculatedRoute?.steps}
            currentStepIndex={currentStepIndex}
            tripState={tripState}
            vehicleType={vehicleType}
            onVehicleTypeChange={handleVehicleTypeChange}
            etaMinutes={etaMinutes || undefined}
            distanceRemaining={distanceRemaining || undefined}
            distanceToNextTurn={distanceToNextTurn || undefined}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onRecenter={handleRecenter}
            onThemeToggle={handleThemeToggle}
            isDarkMode={isDarkMode}
            showThemeToggle={true}
            height="100%"
          />
        </YStack>
      )}

      {/* Floating action buttons */}
      <XStack
        position="absolute"
        left={16}
        top={tripState === 'navigating' ? 160 : 60}
        gap="$2"
        zIndex={1001}
      >
        {/* External navigation button */}
        <Button
          size="sm"
          backgroundColor={isDarkMode ? '$gray800' : 'white'}
          onPress={handleExternalNavigation}
          circular
          elevation={4}
        >
          <Navigation size={20} color={isDarkMode ? 'white' : '$gray700'} />
        </Button>

        {/* Order details button */}
        <Button
          size="sm"
          backgroundColor={isDarkMode ? '$gray800' : 'white'}
          onPress={() => setShowDetailsSheet(true)}
          circular
          elevation={4}
        >
          <Package size={20} color={isDarkMode ? 'white' : '$gray700'} />
        </Button>
      </XStack>

      {/* Customer contact buttons (only when delivering) */}
      {!isPickingUp && tripState === 'navigating' && (
        <XStack
          position="absolute"
          left={16}
          top={tripState === 'navigating' ? 220 : 120}
          gap="$2"
          zIndex={1001}
        >
          <Button
            size="sm"
            backgroundColor="$success"
            onPress={handleCall}
            circular
            elevation={4}
          >
            <Phone size={20} color="white" />
          </Button>
          <Button
            size="sm"
            backgroundColor="$primary"
            onPress={handleMessage}
            circular
            elevation={4}
          >
            <MessageSquare size={20} color="white" />
          </Button>
        </XStack>
      )}

      {/* Status update FAB */}
      {getNextStatus() && tripState !== 'preview' && (
        <Button
          position="absolute"
          right={16}
          bottom={220}
          size="lg"
          backgroundColor={currentDelivery.status === 'nearby' ? '$success' : '$primary'}
          onPress={handleStatusUpdate}
          disabled={updateStatus.isPending || completeDelivery.isPending}
          borderRadius={30}
          paddingHorizontal="$4"
          elevation={8}
          zIndex={1001}
        >
          {updateStatus.isPending || completeDelivery.isPending ? (
            <Spinner color="white" size="small" />
          ) : (
            <XStack alignItems="center" gap="$2">
              <ChevronUp size={20} color="white" />
              <Text color="white" fontWeight="600" fontSize={14}>
                {getActionText()}
              </Text>
            </XStack>
          )}
        </Button>
      )}

      {/* Route error toast */}
      {routeError && (
        <XStack
          position="absolute"
          top={tripState === 'navigating' ? 200 : 100}
          left={20}
          right={20}
          backgroundColor="$warningBackground"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
          gap="$2"
          zIndex={1001}
        >
          <AlertTriangle size={18} color="$warning" />
          <Text flex={1} fontSize={13} color="$warning">
            {routeError}
          </Text>
          <TButton size="$2" onPress={() => setRouteError(null)} chromeless>
            <X size={16} color="$warning" />
          </TButton>
        </XStack>
      )}

      {/* Order details bottom sheet */}
      <Sheet
        modal
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        snapPoints={[60]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" backgroundColor="$background">
          <Sheet.Handle />

          {/* Status & Order Info */}
          <XStack justifyContent="space-between" alignItems="center" marginTop="$2" marginBottom="$4">
            <DeliveryStatusBadge status={currentDelivery.status} size="lg" />
            <Text fontSize={13} color="$colorSecondary">
              Order #{currentDelivery.order?.orderNumber || currentDelivery.id.slice(0, 8)}
            </Text>
          </XStack>

          {/* Destination Info */}
          <Card padding="$3" marginBottom="$3" backgroundColor="$backgroundPress">
            <XStack alignItems="flex-start" gap="$3">
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor={isPickingUp ? '$primaryBackground' : '$successBackground'}
                alignItems="center"
                justifyContent="center"
              >
                {isPickingUp ? (
                  <Store size={20} color="$primary" />
                ) : (
                  <MapPin size={20} color="$success" />
                )}
              </YStack>
              <YStack flex={1}>
                <Text fontSize={12} color="$colorSecondary" marginBottom="$1">
                  {isPickingUp ? 'Pick up from' : 'Deliver to'}
                </Text>
                <Text fontSize={15} fontWeight="500" numberOfLines={2}>
                  {isPickingUp ? currentDelivery.pickupAddress : currentDelivery.deliveryAddress}
                </Text>
                {distanceRemaining && etaMinutes && (
                  <XStack marginTop="$2" gap="$3">
                    <Text fontSize={13} color="$primary" fontWeight="500">
                      {distanceRemaining}
                    </Text>
                    <Text fontSize={13} color="$colorSecondary">
                      ~{etaMinutes} min
                    </Text>
                  </XStack>
                )}
              </YStack>
            </XStack>
          </Card>

          {/* Customer Info (when delivering) */}
          {!isPickingUp && (
            <Card padding="$3" marginBottom="$3" backgroundColor="$backgroundPress">
              <XStack alignItems="center" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor="$primaryBackground"
                  alignItems="center"
                  justifyContent="center"
                >
                  <User size={20} color="$primary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={15} fontWeight="500">
                    {currentDelivery.customerName || 'Customer'}
                  </Text>
                  <Text fontSize={13} color="$colorSecondary">
                    {currentDelivery.customerPhone}
                  </Text>
                </YStack>
                <XStack gap="$2">
                  <Button size="sm" variant="secondary" onPress={handleCall} circular>
                    <Phone size={18} />
                  </Button>
                  <Button size="sm" variant="secondary" onPress={handleMessage} circular>
                    <MessageSquare size={18} />
                  </Button>
                </XStack>
              </XStack>
            </Card>
          )}

          {/* Delivery Instructions */}
          {currentDelivery.deliveryInstructions && !isPickingUp && (
            <Card padding="$3" backgroundColor="$warningBackground">
              <Text fontSize={12} color="$warning" fontWeight="600" marginBottom="$1">
                Delivery Instructions
              </Text>
              <Text fontSize={14} color="$warningForeground">
                {currentDelivery.deliveryInstructions}
              </Text>
            </Card>
          )}

          {/* Action Buttons */}
          <XStack marginTop="$4" gap="$3">
            <Button
              flex={1}
              size="lg"
              variant="secondary"
              onPress={handleExternalNavigation}
            >
              <Navigation size={20} />
              <Text marginLeft="$2">Open Maps</Text>
            </Button>
            {getNextStatus() && (
              <Button
                flex={1}
                size="lg"
                backgroundColor={currentDelivery.status === 'nearby' ? '$success' : '$primary'}
                onPress={() => {
                  handleStatusUpdate();
                  setShowDetailsSheet(false);
                }}
                disabled={updateStatus.isPending || completeDelivery.isPending}
              >
                {updateStatus.isPending || completeDelivery.isPending ? (
                  <Spinner color="white" size="small" />
                ) : (
                  <>
                    <Check size={20} color="white" />
                    <Text color="white" marginLeft="$2">
                      {getActionText()}
                    </Text>
                  </>
                )}
              </Button>
            )}
          </XStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
