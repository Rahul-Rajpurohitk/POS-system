import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { PieChart as RNPieChart } from 'react-native-chart-kit';
import { useTheme, YStack, XStack, Text } from 'tamagui';
import { ChartWrapper, ChartLegend, ChartEmptyState, LegendItemProps } from './ChartWrapper';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

export interface PieChartProps {
  title: string;
  subtitle?: string;
  data: PieChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
  height?: number;
  showLegend?: boolean;
  showPercentages?: boolean;
  accessor?: string;
  action?: React.ReactNode;
}

// Default color palette for pie charts
const DEFAULT_COLORS = [
  '#33b9f7', // Primary blue
  '#4ade80', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

/**
 * Pie Chart Component
 * For category breakdowns, payment methods, ABC distribution
 */
export function PieChart({
  title,
  subtitle,
  data,
  isLoading,
  error,
  height = 220,
  showLegend = true,
  showPercentages = true,
  accessor = 'value',
  action,
}: PieChartProps) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const chartConfig = useMemo(
    () => ({
      backgroundColor: theme.cardBackground?.val || '#ffffff',
      backgroundGradientFrom: theme.cardBackground?.val || '#ffffff',
      backgroundGradientTo: theme.cardBackground?.val || '#ffffff',
      color: (opacity = 1) => `rgba(51, 185, 247, ${opacity})`,
      labelColor: (opacity = 1) =>
        `rgba(${theme.color?.val === '#FFFFFF' ? '255,255,255' : '27,26,26'}, ${opacity})`,
    }),
    [theme]
  );

  // Process data and assign colors
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return data.map((item, index) => ({
      name: item.name,
      population: item.value,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      legendFontColor: theme.color?.val || '#1B1A1A',
      legendFontSize: 12,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
    }));
  }, [data, theme]);

  // Create legend items
  const legendItems: LegendItemProps[] = useMemo(() => {
    return chartData.map((item) => ({
      color: item.color,
      label: item.name,
      value: showPercentages ? `${item.percentage}%` : undefined,
    }));
  }, [chartData, showPercentages]);

  // Check for empty data
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      isLoading={isLoading}
      error={error}
      height={height + (showLegend ? 60 : 0)}
      action={action}
    >
      {isEmpty ? (
        <ChartEmptyState message="No data available" />
      ) : (
        <YStack alignItems="center">
          <RNPieChart
            data={chartData}
            width={screenWidth - 64}
            height={height}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[0, 0]}
            hasLegend={false}
            absolute={!showPercentages}
          />
          {showLegend && (
            <XStack flexWrap="wrap" gap="$3" justifyContent="center" marginTop="$3">
              {legendItems.map((item, index) => (
                <XStack key={index} alignItems="center" gap="$2">
                  <YStack
                    width={12}
                    height={12}
                    borderRadius="$1"
                    backgroundColor={item.color}
                  />
                  <Text fontSize="$3" color="$colorSecondary">
                    {item.label}
                  </Text>
                  {item.value && (
                    <Text fontSize="$3" fontWeight="600" color="$color">
                      {item.value}
                    </Text>
                  )}
                </XStack>
              ))}
            </XStack>
          )}
        </YStack>
      )}
    </ChartWrapper>
  );
}

/**
 * Donut-style display with center content
 */
export interface DonutChartProps extends PieChartProps {
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  centerLabel,
  centerValue,
  ...props
}: DonutChartProps) {
  return (
    <YStack position="relative">
      <PieChart {...props} />
      {(centerLabel || centerValue) && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={props.showLegend ? 60 : 0}
          justifyContent="center"
          alignItems="center"
          pointerEvents="none"
        >
          {centerValue && (
            <Text fontSize="$7" fontWeight="bold" color="$color">
              {centerValue}
            </Text>
          )}
          {centerLabel && (
            <Text fontSize="$3" color="$colorSecondary">
              {centerLabel}
            </Text>
          )}
        </YStack>
      )}
    </YStack>
  );
}

export default PieChart;
