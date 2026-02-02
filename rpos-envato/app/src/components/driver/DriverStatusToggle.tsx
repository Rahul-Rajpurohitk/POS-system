import React from 'react';
import { styled, XStack, YStack, Text, Switch, GetProps } from 'tamagui';
import { Power, Coffee, Car } from '@tamagui/lucide-icons';
import type { DriverStatus } from '@/types';

const Container = styled(XStack, {
  name: 'DriverStatusToggle',
  backgroundColor: '$background',
  borderRadius: '$4',
  padding: '$4',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    isOnline: {
      true: {
        borderColor: '$success',
        backgroundColor: '$successBackground',
      },
      false: {
        borderColor: '$borderColor',
        backgroundColor: '$background',
      },
    },
  } as const,
});

const StatusIndicator = styled(XStack, {
  name: 'StatusIndicator',
  width: 12,
  height: 12,
  borderRadius: 6,
  marginRight: '$2',

  variants: {
    status: {
      available: {
        backgroundColor: '$success',
      },
      busy: {
        backgroundColor: '$warning',
      },
      on_break: {
        backgroundColor: '$info',
      },
      offline: {
        backgroundColor: '$colorSecondary',
      },
    },
  } as const,
});

const StatusText = styled(Text, {
  name: 'StatusText',
  fontSize: 16,
  fontWeight: '600',

  variants: {
    isOnline: {
      true: {
        color: '$success',
      },
      false: {
        color: '$colorSecondary',
      },
    },
  } as const,
});

const SubText = styled(Text, {
  name: 'SubText',
  fontSize: 12,
  color: '$colorSecondary',
  marginTop: '$1',
});

export interface DriverStatusToggleProps {
  status: DriverStatus;
  onToggle: (goOnline: boolean) => void;
  onBreak?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  deliveriesToday?: number;
}

const STATUS_TEXT: Record<DriverStatus, string> = {
  available: 'Online',
  busy: 'On Delivery',
  on_break: 'On Break',
  offline: 'Offline',
};

const STATUS_SUBTEXT: Record<DriverStatus, string> = {
  available: 'Receiving new deliveries',
  busy: 'Complete delivery to go online',
  on_break: 'Tap to resume',
  offline: 'Toggle to start receiving deliveries',
};

export function DriverStatusToggle({
  status,
  onToggle,
  onBreak,
  isLoading = false,
  disabled = false,
  deliveriesToday = 0,
}: DriverStatusToggleProps) {
  const isOnline = status === 'available' || status === 'busy';
  const canToggle = status !== 'busy';

  const handleToggle = (checked: boolean) => {
    if (status === 'on_break' && checked) {
      // Coming back from break
      onToggle(true);
    } else if (canToggle) {
      onToggle(checked);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'available':
        return <Power size={24} color="$success" />;
      case 'busy':
        return <Car size={24} color="$warning" />;
      case 'on_break':
        return <Coffee size={24} color="$info" />;
      default:
        return <Power size={24} color="$colorSecondary" />;
    }
  };

  return (
    <Container isOnline={isOnline}>
      <XStack alignItems="center" gap="$3">
        {getIcon()}
        <YStack>
          <XStack alignItems="center">
            <StatusIndicator status={status} />
            <StatusText isOnline={isOnline}>{STATUS_TEXT[status]}</StatusText>
          </XStack>
          <SubText>{STATUS_SUBTEXT[status]}</SubText>
          {deliveriesToday > 0 && (
            <SubText>
              {deliveriesToday} deliver{deliveriesToday === 1 ? 'y' : 'ies'} today
            </SubText>
          )}
        </YStack>
      </XStack>

      <XStack alignItems="center" gap="$3">
        {isOnline && onBreak && status !== 'busy' && (
          <XStack
            padding="$2"
            borderRadius="$2"
            backgroundColor="$backgroundPress"
            pressStyle={{ opacity: 0.7 }}
            onPress={onBreak}
          >
            <Coffee size={20} color="$colorSecondary" />
          </XStack>
        )}

        <Switch
          size="$4"
          checked={isOnline}
          onCheckedChange={handleToggle}
          disabled={disabled || isLoading || !canToggle}
          opacity={isLoading ? 0.5 : 1}
        >
          <Switch.Thumb animation="quick" />
        </Switch>
      </XStack>
    </Container>
  );
}

export default DriverStatusToggle;
