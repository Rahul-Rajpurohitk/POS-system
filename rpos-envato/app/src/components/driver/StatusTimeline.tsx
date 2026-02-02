import React from 'react';
import { styled, XStack, YStack, Text } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import type { DeliveryStatus } from '@/types';
import { DELIVERY_STATUS_TEXT } from '@/types';

const Container = styled(YStack, {
  name: 'StatusTimeline',
  padding: '$4',
});

const TimelineItem = styled(XStack, {
  name: 'TimelineItem',
  alignItems: 'flex-start',
  marginBottom: '$4',
});

const TimelineDot = styled(XStack, {
  name: 'TimelineDot',
  width: 24,
  height: 24,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '$3',

  variants: {
    state: {
      completed: {
        backgroundColor: '$success',
      },
      current: {
        backgroundColor: '$primary',
        borderWidth: 3,
        borderColor: '$primaryFaded',
      },
      pending: {
        backgroundColor: '$backgroundPress',
        borderWidth: 2,
        borderColor: '$borderColor',
      },
    },
  } as const,
});

const TimelineLine = styled(YStack, {
  name: 'TimelineLine',
  width: 2,
  height: 30,
  position: 'absolute',
  left: 11,
  top: 24,

  variants: {
    completed: {
      true: {
        backgroundColor: '$success',
      },
      false: {
        backgroundColor: '$borderColor',
      },
    },
  } as const,
});

const TimelineContent = styled(YStack, {
  name: 'TimelineContent',
  flex: 1,
});

const TimelineTitle = styled(Text, {
  name: 'TimelineTitle',
  fontSize: 14,
  fontWeight: '600',

  variants: {
    state: {
      completed: {
        color: '$success',
      },
      current: {
        color: '$primary',
      },
      pending: {
        color: '$colorSecondary',
      },
    },
  } as const,
});

const TimelineTime = styled(Text, {
  name: 'TimelineTime',
  fontSize: 12,
  color: '$colorSecondary',
  marginTop: 2,
});

export interface StatusTimelineProps {
  currentStatus: DeliveryStatus;
  timestamps?: {
    created?: string;
    accepted?: string;
    assigned?: string;
    pickedUp?: string;
    delivered?: string;
  };
  showAllSteps?: boolean;
}

interface TimelineStep {
  status: DeliveryStatus;
  label: string;
  timestampKey?: keyof NonNullable<StatusTimelineProps['timestamps']>;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'pending', label: 'Order Placed', timestampKey: 'created' },
  { status: 'accepted', label: 'Preparing', timestampKey: 'accepted' },
  { status: 'assigned', label: 'Driver Assigned', timestampKey: 'assigned' },
  { status: 'picking_up', label: 'At Store' },
  { status: 'picked_up', label: 'Picked Up', timestampKey: 'pickedUp' },
  { status: 'on_the_way', label: 'On The Way' },
  { status: 'nearby', label: 'Almost There' },
  { status: 'delivered', label: 'Delivered', timestampKey: 'delivered' },
];

const STATUS_ORDER: DeliveryStatus[] = [
  'pending',
  'accepted',
  'assigned',
  'picking_up',
  'picked_up',
  'on_the_way',
  'nearby',
  'delivered',
];

export function StatusTimeline({
  currentStatus,
  timestamps,
  showAllSteps = false,
}: StatusTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  // For cancelled or failed, show only completed steps
  const isFinalBadStatus = currentStatus === 'cancelled' || currentStatus === 'failed';

  const getStepState = (
    stepIndex: number
  ): 'completed' | 'current' | 'pending' => {
    if (isFinalBadStatus) {
      return stepIndex < currentIndex ? 'completed' : 'pending';
    }
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const formatTime = (dateString?: string): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter steps to show
  const visibleSteps = showAllSteps
    ? TIMELINE_STEPS
    : TIMELINE_STEPS.filter((_, index) => {
        // Always show completed and current steps
        // Show 1-2 upcoming steps
        return index <= currentIndex + 2;
      });

  return (
    <Container>
      {visibleSteps.map((step, index) => {
        const stepIndex = TIMELINE_STEPS.indexOf(step);
        const state = getStepState(stepIndex);
        const isLast = index === visibleSteps.length - 1;
        const timestamp = step.timestampKey ? timestamps?.[step.timestampKey] : undefined;

        return (
          <TimelineItem key={step.status}>
            {/* Dot */}
            <YStack position="relative">
              <TimelineDot state={state}>
                {state === 'completed' && <Check size={14} color="white" />}
                {state === 'current' && (
                  <XStack
                    width={8}
                    height={8}
                    borderRadius={4}
                    backgroundColor="white"
                  />
                )}
              </TimelineDot>

              {/* Connecting line */}
              {!isLast && (
                <TimelineLine completed={state === 'completed'} />
              )}
            </YStack>

            {/* Content */}
            <TimelineContent>
              <TimelineTitle state={state}>{step.label}</TimelineTitle>
              {timestamp && state !== 'pending' && (
                <TimelineTime>{formatTime(timestamp)}</TimelineTime>
              )}
            </TimelineContent>
          </TimelineItem>
        );
      })}

      {/* Show final status if cancelled/failed */}
      {isFinalBadStatus && (
        <TimelineItem>
          <TimelineDot state="current" backgroundColor="$error">
            <Text color="white" fontSize={10} fontWeight="bold">
              !
            </Text>
          </TimelineDot>
          <TimelineContent>
            <TimelineTitle color="$error">
              {currentStatus === 'cancelled' ? 'Cancelled' : 'Failed'}
            </TimelineTitle>
          </TimelineContent>
        </TimelineItem>
      )}
    </Container>
  );
}

export default StatusTimeline;
