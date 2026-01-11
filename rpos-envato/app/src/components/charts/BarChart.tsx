import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { BarChart as RNBarChart } from 'react-native-chart-kit';
import { useTheme, YStack } from 'tamagui';
import { ChartWrapper, ChartEmptyState } from './ChartWrapper';

export interface BarChartDataPoint {
  label: string;
  value: number;
}

export interface BarChartProps {
  title: string;
  subtitle?: string;
  data: BarChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
  height?: number;
  barColor?: string;
  yAxisPrefix?: string;
  yAxisSuffix?: string;
  formatYLabel?: (value: string) => string;
  showValuesOnTopOfBars?: boolean;
  horizontal?: boolean;
  action?: React.ReactNode;
}

/**
 * Bar Chart Component
 * For top products, hourly data, category comparisons
 */
export function BarChart({
  title,
  subtitle,
  data,
  isLoading,
  error,
  height = 220,
  barColor,
  yAxisPrefix = '',
  yAxisSuffix = '',
  formatYLabel,
  showValuesOnTopOfBars = true,
  action,
}: BarChartProps) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const primaryColor = barColor || theme.primary?.val || '#33b9f7';

  const chartConfig = useMemo(
    () => ({
      backgroundColor: theme.cardBackground?.val || '#ffffff',
      backgroundGradientFrom: theme.cardBackground?.val || '#ffffff',
      backgroundGradientTo: theme.cardBackground?.val || '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => {
        // Extract RGB from hex color
        const hex = primaryColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      },
      labelColor: (opacity = 1) =>
        `rgba(${theme.color?.val === '#FFFFFF' ? '255,255,255' : '27,26,26'}, ${opacity})`,
      style: {
        borderRadius: 12,
      },
      barPercentage: 0.6,
      propsForBackgroundLines: {
        strokeDasharray: '4',
        stroke: theme.borderColor?.val || '#D8D8D8',
        strokeWidth: 1,
      },
    }),
    [theme, primaryColor]
  );

  // Process data for chart
  const chartData = useMemo(() => {
    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);

    // Truncate long labels
    const truncatedLabels = labels.map((label) =>
      label.length > 8 ? `${label.substring(0, 8)}...` : label
    );

    return {
      labels: truncatedLabels,
      datasets: [{ data: values.length > 0 ? values : [0] }],
    };
  }, [data]);

  // Check for empty data
  const isEmpty = data.length === 0;

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      isLoading={isLoading}
      error={error}
      height={height}
      action={action}
    >
      {isEmpty ? (
        <ChartEmptyState message="No data available" />
      ) : (
        <YStack>
          <RNBarChart
            data={chartData}
            width={screenWidth - 64}
            height={height}
            chartConfig={chartConfig}
            style={{
              marginLeft: -16,
              borderRadius: 12,
            }}
            withInnerLines={true}
            showBarTops={false}
            showValuesOnTopOfBars={showValuesOnTopOfBars}
            fromZero={true}
            yAxisLabel={yAxisPrefix}
            yAxisSuffix={yAxisSuffix}
            formatYLabel={formatYLabel}
          />
        </YStack>
      )}
    </ChartWrapper>
  );
}

/**
 * Horizontal Bar Chart Component
 * For ranked lists like staff performance
 */
export interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: Array<{
    label: string;
    value: number;
    maxValue?: number;
  }>;
  isLoading?: boolean;
  error?: Error | null;
  formatValue?: (value: number) => string;
  barColor?: string;
  action?: React.ReactNode;
}

export function HorizontalBarChart({
  title,
  subtitle,
  data,
  isLoading,
  error,
  formatValue = (v) => v.toString(),
  barColor,
  action,
}: HorizontalBarChartProps) {
  const theme = useTheme();
  const primaryColor = barColor || theme.primary?.val || '#33b9f7';
  const maxValue = Math.max(...data.map((d) => d.maxValue || d.value), 1);

  const isEmpty = data.length === 0;

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      isLoading={isLoading}
      error={error}
      height={Math.max(data.length * 40 + 20, 100)}
      action={action}
    >
      {isEmpty ? (
        <ChartEmptyState message="No data available" />
      ) : (
        <YStack gap="$2">
          {data.map((item, index) => (
            <YStack key={index} gap="$1">
              <YStack
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <YStack
                  fontSize="$3"
                  color="$color"
                  numberOfLines={1}
                  maxWidth="60%"
                >
                  {item.label}
                </YStack>
                <YStack fontSize="$3" fontWeight="600" color="$color">
                  {formatValue(item.value)}
                </YStack>
              </YStack>
              <YStack
                height={8}
                backgroundColor="$borderColor"
                borderRadius="$full"
                overflow="hidden"
              >
                <YStack
                  height="100%"
                  width={`${(item.value / maxValue) * 100}%`}
                  backgroundColor={primaryColor}
                  borderRadius="$full"
                />
              </YStack>
            </YStack>
          ))}
        </YStack>
      )}
    </ChartWrapper>
  );
}

export default BarChart;
