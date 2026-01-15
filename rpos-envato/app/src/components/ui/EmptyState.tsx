import React, { ReactNode } from 'react';
import { YStack, Text, GetProps } from 'tamagui';
import { Button } from './Button';
import { FileQuestion, Package, Users, ShoppingCart, BarChart3 } from '@tamagui/lucide-icons';

type YStackProps = GetProps<typeof YStack>;

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

interface EmptyStateProps extends YStackProps {
  /** Icon to display - can be a React node or use preset icons */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Use a preset icon by type */
  preset?: 'products' | 'customers' | 'orders' | 'analytics' | 'general';
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

const presetIcons: Record<string, ReactNode> = {
  products: <Package size={64} color="$colorSecondary" />,
  customers: <Users size={64} color="$colorSecondary" />,
  orders: <ShoppingCart size={64} color="$colorSecondary" />,
  analytics: <BarChart3 size={64} color="$colorSecondary" />,
  general: <FileQuestion size={64} color="$colorSecondary" />,
};

const sizeConfig = {
  small: {
    iconSize: 48,
    titleSize: '$4' as const,
    descSize: '$2' as const,
    padding: '$4' as const,
    gap: '$2' as const,
  },
  medium: {
    iconSize: 64,
    titleSize: '$5' as const,
    descSize: '$3' as const,
    padding: '$6' as const,
    gap: '$3' as const,
  },
  large: {
    iconSize: 80,
    titleSize: '$6' as const,
    descSize: '$4' as const,
    padding: '$8' as const,
    gap: '$4' as const,
  },
};

/**
 * Empty state component for displaying when lists are empty or no data is available
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   preset="customers"
 *   title="No customers yet"
 *   description="Add your first customer to get started"
 *   action={{ label: "Add Customer", onPress: () => navigation.navigate('AddCustomer') }}
 * />
 *
 * @example
 * // Custom icon
 * <EmptyState
 *   icon={<MyCustomIcon size={64} />}
 *   title="Custom Title"
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  preset = 'general',
  size = 'medium',
  ...props
}: EmptyStateProps) {
  const config = sizeConfig[size];
  const displayIcon = icon || presetIcons[preset];

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding={config.padding}
      gap={config.gap}
      {...props}
    >
      {displayIcon && (
        <YStack opacity={0.5} marginBottom="$2">
          {displayIcon}
        </YStack>
      )}

      <YStack alignItems="center" gap="$2">
        <Text
          fontSize={config.titleSize}
          fontWeight="600"
          color="$color"
          textAlign="center"
        >
          {title}
        </Text>

        {description && (
          <Text
            fontSize={config.descSize}
            color="$colorSecondary"
            textAlign="center"
            maxWidth={300}
          >
            {description}
          </Text>
        )}
      </YStack>

      {(action || secondaryAction) && (
        <YStack gap="$2" marginTop="$2" alignItems="center">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onPress={action.onPress}
            >
              <Text color={action.variant === 'outline' ? '$color' : 'white'}>
                {action.label}
              </Text>
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'outline'}
              onPress={secondaryAction.onPress}
            >
              <Text color={secondaryAction.variant === 'primary' ? 'white' : '$color'}>
                {secondaryAction.label}
              </Text>
            </Button>
          )}
        </YStack>
      )}
    </YStack>
  );
}

/**
 * Inline empty state for smaller areas
 */
export function EmptyStateInline({
  icon,
  title,
  description,
  action,
  preset = 'general',
}: Omit<EmptyStateProps, 'size'>) {
  const displayIcon = icon || (
    preset === 'products' ? <Package size={32} color="$colorSecondary" /> :
    preset === 'customers' ? <Users size={32} color="$colorSecondary" /> :
    preset === 'orders' ? <ShoppingCart size={32} color="$colorSecondary" /> :
    preset === 'analytics' ? <BarChart3 size={32} color="$colorSecondary" /> :
    <FileQuestion size={32} color="$colorSecondary" />
  );

  return (
    <YStack
      padding="$4"
      alignItems="center"
      gap="$2"
      backgroundColor="$backgroundPress"
      borderRadius="$3"
    >
      <YStack opacity={0.5}>{displayIcon}</YStack>
      <Text fontSize="$3" fontWeight="500" color="$colorSecondary" textAlign="center">
        {title}
      </Text>
      {description && (
        <Text fontSize="$2" color="$colorSecondary" textAlign="center">
          {description}
        </Text>
      )}
      {action && (
        <Button variant="outline" size="sm" onPress={action.onPress}>
          <Text fontSize="$2">{action.label}</Text>
        </Button>
      )}
    </YStack>
  );
}
