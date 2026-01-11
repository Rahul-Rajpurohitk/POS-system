import React from 'react';
import { YStack, Text, Spinner, XStack } from 'tamagui';
import { Card, CardHeader } from '@/components/ui';

export interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: Error | null;
  height?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Common wrapper for chart components
 * Provides consistent styling, loading, and error states
 */
export function ChartWrapper({
  title,
  subtitle,
  isLoading,
  error,
  height = 220,
  action,
  children,
}: ChartWrapperProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />

      {isLoading ? (
        <YStack height={height} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$primary" />
          <Text marginTop="$2" color="$colorSecondary" fontSize="$3">
            Loading chart data...
          </Text>
        </YStack>
      ) : error ? (
        <YStack height={height} justifyContent="center" alignItems="center">
          <Text color="$error" fontSize="$4" fontWeight="500">
            Failed to load data
          </Text>
          <Text marginTop="$1" color="$colorSecondary" fontSize="$3">
            {error.message}
          </Text>
        </YStack>
      ) : (
        <YStack height={height}>{children}</YStack>
      )}
    </Card>
  );
}

/**
 * Chart legend item component
 */
export interface LegendItemProps {
  color: string;
  label: string;
  value?: string;
}

export function LegendItem({ color, label, value }: LegendItemProps) {
  return (
    <XStack alignItems="center" gap="$2">
      <YStack
        width={12}
        height={12}
        borderRadius="$1"
        backgroundColor={color}
      />
      <Text fontSize="$3" color="$colorSecondary">
        {label}
      </Text>
      {value && (
        <Text fontSize="$3" fontWeight="600" color="$color">
          {value}
        </Text>
      )}
    </XStack>
  );
}

/**
 * Chart legend container
 */
export interface ChartLegendProps {
  items: LegendItemProps[];
  direction?: 'horizontal' | 'vertical';
}

export function ChartLegend({ items, direction = 'horizontal' }: ChartLegendProps) {
  const Container = direction === 'horizontal' ? XStack : YStack;

  return (
    <Container
      flexWrap="wrap"
      gap="$3"
      justifyContent="center"
      marginTop="$3"
    >
      {items.map((item, index) => (
        <LegendItem key={index} {...item} />
      ))}
    </Container>
  );
}

/**
 * Empty state for charts with no data
 */
export function ChartEmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center">
      <Text color="$colorSecondary" fontSize="$4">
        {message}
      </Text>
    </YStack>
  );
}

export default ChartWrapper;
