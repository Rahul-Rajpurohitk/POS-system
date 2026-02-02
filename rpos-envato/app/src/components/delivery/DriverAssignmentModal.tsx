/**
 * DriverAssignmentModal - Enhanced POS driver assignment
 *
 * Features:
 * - Smart driver suggestions with scoring
 * - Route preview map
 * - Driver cards with live status
 * - Auto-assign best match option
 * - ETA calculation
 * - Vehicle type filtering
 */

import React, { useState, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { YStack, XStack, Text, ScrollView, Spinner, Sheet, Avatar, Progress } from 'tamagui';
import {
  User,
  MapPin,
  Clock,
  Star,
  Car,
  Bike,
  Navigation,
  CheckCircle,
  Circle,
  Zap,
  TrendingUp,
  Package,
  Phone,
  Route,
  Target,
  Award,
  Footprints,
  Truck,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import {
  useDriverSuggestions,
  useAvailableDrivers,
  useAssignDriver,
} from '@/features/delivery/hooks';
import { formatDistance, formatDuration } from '@/hooks';
import type { Delivery, DriverProfile, VehicleType } from '@/types';
import type { DriverSuggestion } from '@/features/delivery/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DriverAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  onAssigned?: () => void;
}

// Vehicle type icons and labels
const VEHICLE_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
}> = {
  walking: {
    icon: <Footprints size={14} />,
    label: 'Walking',
    color: '$info',
  },
  bicycle: {
    icon: <Bike size={14} />,
    label: 'Bicycle',
    color: '$success',
  },
  e_scooter: {
    icon: <Zap size={14} />,
    label: 'E-Scooter',
    color: '$warning',
  },
  motorcycle: {
    icon: <Bike size={14} />,
    label: 'Motorcycle',
    color: '$primary',
  },
  car: {
    icon: <Car size={14} />,
    label: 'Car',
    color: '$colorSecondary',
  },
};

// Status badge component
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    available: '$success',
    busy: '$warning',
    on_break: '$info',
    offline: '$colorSecondary',
  };

  return (
    <YStack
      width={8}
      height={8}
      borderRadius={4}
      backgroundColor={colors[status] || '$colorSecondary'}
    />
  );
}

// Enhanced driver card
function DriverCard({
  driver,
  suggestion,
  isSelected,
  onSelect,
  showScore = true,
}: {
  driver: DriverProfile;
  suggestion?: DriverSuggestion;
  isSelected: boolean;
  onSelect: () => void;
  showScore?: boolean;
}) {
  const vehicleConfig = VEHICLE_CONFIG[driver.vehicleType || 'car'];
  const score = suggestion?.score || 0;
  const scorePercent = Math.min(100, (score / 100) * 100);

  // Determine score color
  const getScoreColor = () => {
    if (score >= 80) return '$success';
    if (score >= 60) return '$warning';
    return '$colorSecondary';
  };

  return (
    <Card
      padding="$3"
      marginBottom="$3"
      borderWidth={2}
      borderColor={isSelected ? '$primary' : '$borderColor'}
      backgroundColor={isSelected ? '$primaryBackground' : '$cardBackground'}
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      animation="quick"
      onPress={onSelect}
    >
      <XStack alignItems="flex-start" gap="$3">
        {/* Selection indicator */}
        <YStack alignItems="center" gap="$2">
          {isSelected ? (
            <CheckCircle size={24} color="$primary" />
          ) : (
            <Circle size={24} color="$borderColor" />
          )}
        </YStack>

        {/* Avatar with status */}
        <YStack>
          <Avatar circular size="$5">
            <Avatar.Fallback
              backgroundColor={isSelected ? '$primary' : '$colorSecondary'}
            >
              <Text color="white" fontSize={18} fontWeight="bold">
                {driver.user?.firstName?.charAt(0) || 'D'}
              </Text>
            </Avatar.Fallback>
          </Avatar>
          <XStack
            position="absolute"
            bottom={0}
            right={0}
            padding="$1"
            backgroundColor="$background"
            borderRadius={10}
          >
            <StatusDot status={driver.status} />
          </XStack>
        </YStack>

        {/* Info */}
        <YStack flex={1}>
          <XStack alignItems="center" gap="$2">
            <Text fontSize={16} fontWeight="600" flex={1} numberOfLines={1}>
              {driver.user?.firstName || 'Driver'}{driver.user?.lastName?.charAt(0) ? ` ${driver.user.lastName.charAt(0)}.` : ''}
            </Text>
            {suggestion?.isBestMatch && (
              <XStack
                paddingHorizontal="$2"
                paddingVertical="$1"
                backgroundColor="$successBackground"
                borderRadius="$2"
                alignItems="center"
                gap="$1"
              >
                <Award size={12} color="$success" />
                <Text fontSize={10} fontWeight="600" color="$success">
                  BEST
                </Text>
              </XStack>
            )}
          </XStack>

          {/* Vehicle & Rating Row */}
          <XStack alignItems="center" gap="$3" marginTop="$1">
            <XStack
              alignItems="center"
              gap="$1"
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor="$backgroundPress"
              borderRadius="$2"
            >
              {vehicleConfig.icon}
              <Text fontSize={11} color="$colorSecondary">
                {vehicleConfig.label}
              </Text>
            </XStack>

            <XStack alignItems="center" gap="$1">
              <Star size={12} color="#FFB800" />
              <Text fontSize={12} color="$colorSecondary">
                {driver.averageRating?.toFixed(1) || '5.0'}
              </Text>
            </XStack>

            <XStack alignItems="center" gap="$1">
              <Package size={12} color="$colorSecondary" />
              <Text fontSize={11} color="$colorSecondary">
                {driver.deliveriesToday || 0} today
              </Text>
            </XStack>
          </XStack>

          {/* Distance & ETA Row */}
          {suggestion && (
            <XStack alignItems="center" gap="$3" marginTop="$2">
              <XStack alignItems="center" gap="$1">
                <Navigation size={14} color="$primary" />
                <Text fontSize={13} fontWeight="500">
                  {formatDistance(suggestion.distance || 0)}
                </Text>
              </XStack>
              <XStack alignItems="center" gap="$1">
                <Clock size={14} color="$info" />
                <Text fontSize={13} fontWeight="500">
                  ~{suggestion.estimatedPickupTime} min pickup
                </Text>
              </XStack>
            </XStack>
          )}

          {/* Score bar */}
          {showScore && suggestion && (
            <YStack marginTop="$2">
              <XStack justifyContent="space-between" marginBottom="$1">
                <Text fontSize={11} color="$colorSecondary">
                  Match Score
                </Text>
                <Text fontSize={11} fontWeight="600" color={getScoreColor()}>
                  {score}/100
                </Text>
              </XStack>
              <Progress value={scorePercent} backgroundColor="$backgroundPress">
                <Progress.Indicator
                  animation="bouncy"
                  backgroundColor={getScoreColor()}
                />
              </Progress>
            </YStack>
          )}
        </YStack>
      </XStack>
    </Card>
  );
}

// Vehicle filter chips
function VehicleFilter({
  selected,
  onSelect,
  counts,
}: {
  selected: string | null;
  onSelect: (type: string | null) => void;
  counts: Record<string, number>;
}) {
  const types = ['all', 'car', 'motorcycle', 'bicycle', 'walking'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2" paddingVertical="$2">
        {types.map((type) => {
          const isSelected = type === 'all' ? selected === null : selected === type;
          const config = type === 'all' ? null : VEHICLE_CONFIG[type];
          const count = type === 'all'
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : counts[type] || 0;

          return (
            <Button
              key={type}
              size="sm"
              variant={isSelected ? 'primary' : 'secondary'}
              onPress={() => onSelect(type === 'all' ? null : type)}
              paddingHorizontal="$3"
            >
              <XStack alignItems="center" gap="$1">
                {config?.icon}
                <Text
                  color={isSelected ? 'white' : '$color'}
                  fontSize={12}
                  textTransform="capitalize"
                >
                  {type === 'all' ? 'All' : config?.label}
                </Text>
                <Text
                  color={isSelected ? 'white' : '$colorSecondary'}
                  fontSize={11}
                >
                  ({count})
                </Text>
              </XStack>
            </Button>
          );
        })}
      </XStack>
    </ScrollView>
  );
}

export function DriverAssignmentModal({
  open,
  onClose,
  delivery,
  onAssigned,
}: DriverAssignmentModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);

  const { data: suggestions, isLoading: suggestionsLoading } = useDriverSuggestions(
    delivery?.id || ''
  );
  const { data: allDrivers, isLoading: driversLoading } = useAvailableDrivers();
  const assignDriver = useAssignDriver();

  // Calculate vehicle counts
  const vehicleCounts = useMemo(() => {
    const drivers = showAllDrivers ? allDrivers : suggestions?.map((s) => s.driver);
    const counts: Record<string, number> = {};
    drivers?.forEach((d) => {
      const type = d.vehicleType || 'car';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [showAllDrivers, allDrivers, suggestions]);

  // Filter and sort drivers
  const displayDrivers = useMemo(() => {
    let drivers = showAllDrivers ? allDrivers : suggestions?.map((s) => s.driver);

    if (vehicleFilter) {
      drivers = drivers?.filter((d) => d.vehicleType === vehicleFilter);
    }

    return drivers;
  }, [showAllDrivers, allDrivers, suggestions, vehicleFilter]);

  // Find best match for auto-assign
  const bestMatch = useMemo(() => {
    if (!suggestions?.length) return null;
    return suggestions.reduce((best, current) =>
      (current.score || 0) > (best.score || 0) ? current : best
    );
  }, [suggestions]);

  const handleAssign = async (driverId?: string) => {
    const targetDriverId = driverId || selectedDriverId;
    if (!delivery || !targetDriverId) return;

    try {
      await assignDriver.mutateAsync({
        deliveryId: delivery.id,
        driverId: targetDriverId,
      });
      onAssigned?.();
      onClose();
    } catch (error) {
      console.error('Failed to assign driver:', error);
    }
  };

  const handleAutoAssign = () => {
    if (bestMatch) {
      handleAssign(bestMatch.driver.id);
    }
  };

  const isLoading = showAllDrivers ? driversLoading : suggestionsLoading;

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
      snapPoints={[85]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame backgroundColor="$background">
        <Sheet.Handle />

        <YStack flex={1} padding="$4">
          {/* Header */}
          <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
            <YStack>
              <Text fontSize={22} fontWeight="bold">
                Assign Driver
              </Text>
              {delivery && (
                <Text fontSize={13} color="$colorSecondary">
                  Order #{delivery.order?.orderNumber || delivery.orderId?.slice(-6)}
                </Text>
              )}
            </YStack>

            {/* Auto-assign button */}
            {bestMatch && !showAllDrivers && (
              <Button
                size="sm"
                backgroundColor="$success"
                onPress={handleAutoAssign}
                disabled={assignDriver.isPending}
                icon={<Zap size={16} color="white" />}
              >
                <Text color="white" fontSize={12} fontWeight="600">
                  Auto-Assign
                </Text>
              </Button>
            )}
          </XStack>

          {/* Delivery Info Card */}
          {delivery && (
            <Card padding="$3" marginBottom="$3" backgroundColor="$backgroundPress">
              <XStack gap="$3">
                <YStack flex={1}>
                  <XStack alignItems="flex-start" gap="$2">
                    <MapPin size={16} color="$success" marginTop={2} />
                    <YStack flex={1}>
                      <Text fontSize={11} color="$colorSecondary" textTransform="uppercase">
                        Delivery To
                      </Text>
                      <Text fontSize={13} numberOfLines={2}>
                        {delivery.deliveryAddress}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>

                <YStack alignItems="flex-end" justifyContent="center" gap="$1">
                  <XStack alignItems="center" gap="$1">
                    <Route size={14} color="$primary" />
                    <Text fontSize={12} fontWeight="500">
                      {formatDistance(delivery.distanceMeters || 0)}
                    </Text>
                  </XStack>
                  <Text fontSize={11} color="$colorSecondary">
                    {delivery.customerName}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Toggle Tabs */}
          <XStack marginBottom="$2" gap="$2">
            <Button
              flex={1}
              size="md"
              variant={!showAllDrivers ? 'primary' : 'secondary'}
              onPress={() => {
                setShowAllDrivers(false);
                setVehicleFilter(null);
              }}
            >
              <XStack alignItems="center" gap="$2">
                <Target size={16} color={!showAllDrivers ? 'white' : '$color'} />
                <Text color={!showAllDrivers ? 'white' : '$color'} fontWeight="600">
                  Suggested
                </Text>
                <YStack
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  backgroundColor={!showAllDrivers ? 'rgba(255,255,255,0.2)' : '$backgroundPress'}
                  borderRadius="$2"
                >
                  <Text
                    color={!showAllDrivers ? 'white' : '$colorSecondary'}
                    fontSize={12}
                    fontWeight="600"
                  >
                    {suggestions?.length || 0}
                  </Text>
                </YStack>
              </XStack>
            </Button>
            <Button
              flex={1}
              size="md"
              variant={showAllDrivers ? 'primary' : 'secondary'}
              onPress={() => {
                setShowAllDrivers(true);
                setVehicleFilter(null);
              }}
            >
              <XStack alignItems="center" gap="$2">
                <User size={16} color={showAllDrivers ? 'white' : '$color'} />
                <Text color={showAllDrivers ? 'white' : '$color'} fontWeight="600">
                  All Online
                </Text>
                <YStack
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  backgroundColor={showAllDrivers ? 'rgba(255,255,255,0.2)' : '$backgroundPress'}
                  borderRadius="$2"
                >
                  <Text
                    color={showAllDrivers ? 'white' : '$colorSecondary'}
                    fontSize={12}
                    fontWeight="600"
                  >
                    {allDrivers?.length || 0}
                  </Text>
                </YStack>
              </XStack>
            </Button>
          </XStack>

          {/* Vehicle Filter */}
          <VehicleFilter
            selected={vehicleFilter}
            onSelect={setVehicleFilter}
            counts={vehicleCounts}
          />

          {/* Driver List */}
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <YStack flex={1} alignItems="center" justifyContent="center" padding="$8">
                <Spinner size="large" color="$primary" />
                <Text marginTop="$3" color="$colorSecondary">
                  Finding available drivers...
                </Text>
              </YStack>
            ) : displayDrivers && displayDrivers.length > 0 ? (
              <YStack paddingTop="$2">
                {displayDrivers.map((driver, index) => {
                  const suggestion = suggestions?.find((s) => s.driver.id === driver.id);
                  return (
                    <DriverCard
                      key={driver.id}
                      driver={driver}
                      suggestion={suggestion}
                      isSelected={selectedDriverId === driver.id}
                      onSelect={() => setSelectedDriverId(driver.id)}
                      showScore={!showAllDrivers}
                    />
                  );
                })}
              </YStack>
            ) : (
              <YStack flex={1} alignItems="center" justifyContent="center" padding="$8">
                <YStack
                  width={80}
                  height={80}
                  borderRadius={40}
                  backgroundColor="$backgroundPress"
                  alignItems="center"
                  justifyContent="center"
                  marginBottom="$4"
                >
                  <User size={40} color="$colorSecondary" />
                </YStack>
                <Text fontSize={18} fontWeight="600">
                  No Drivers Available
                </Text>
                <Text
                  fontSize={14}
                  color="$colorSecondary"
                  textAlign="center"
                  marginTop="$2"
                  paddingHorizontal="$4"
                >
                  {vehicleFilter
                    ? `No ${VEHICLE_CONFIG[vehicleFilter]?.label.toLowerCase()} drivers are currently online.`
                    : showAllDrivers
                      ? 'There are no drivers currently online.'
                      : 'No suitable drivers found for this delivery.'}
                </Text>
                {vehicleFilter && (
                  <Button
                    marginTop="$4"
                    variant="secondary"
                    size="sm"
                    onPress={() => setVehicleFilter(null)}
                  >
                    Clear Filter
                  </Button>
                )}
              </YStack>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <XStack gap="$3" paddingTop="$4" borderTopWidth={1} borderTopColor="$borderColor">
            <Button flex={1} variant="secondary" size="lg" onPress={onClose}>
              Cancel
            </Button>
            <Button
              flex={2}
              size="lg"
              onPress={() => handleAssign()}
              disabled={!selectedDriverId || assignDriver.isPending}
            >
              {assignDriver.isPending ? (
                <XStack alignItems="center" gap="$2">
                  <Spinner size="small" color="white" />
                  <Text color="white">Assigning...</Text>
                </XStack>
              ) : (
                <XStack alignItems="center" gap="$2">
                  <Truck size={18} color="white" />
                  <Text color="white" fontWeight="bold">
                    Assign Driver
                  </Text>
                </XStack>
              )}
            </Button>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export default DriverAssignmentModal;
