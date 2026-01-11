import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { useTheme, YStack } from 'tamagui';
import { ChartWrapper, ChartLegend, ChartEmptyState } from './ChartWrapper';

export interface LineChartDataPoint {
  label: string;
  value: number;
}

export interface LineChartDataset {
  data: number[];
  color?: (opacity: number) => string;
  strokeWidth?: number;
  withDots?: boolean;
}

export interface LineChartProps {
  title: string;
  subtitle?: string;
  data: LineChartDataPoint[];
  datasets?: LineChartDataset[];
  labels?: string[];
  isLoading?: boolean;
  error?: Error | null;
  height?: number;
  bezier?: boolean;
  showDots?: boolean;
  showLegend?: boolean;
  legendItems?: Array<{ color: string; label: string }>;
  yAxisPrefix?: string;
  yAxisSuffix?: string;
  formatYLabel?: (value: string) => string;
  action?: React.ReactNode;
}

/**
 * Line Chart Component
 * For revenue trends, forecasting, and time-series data
 */
export function LineChart({
  title,
  subtitle,
  data,
  datasets,
  labels,
  isLoading,
  error,
  height = 220,
  bezier = true,
  showDots = true,
  showLegend = false,
  legendItems = [],
  yAxisPrefix = '',
  yAxisSuffix = '',
  formatYLabel,
  action,
}: LineChartProps) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const chartConfig = useMemo(
    () => ({
      backgroundColor: theme.cardBackground?.val || '#ffffff',
      backgroundGradientFrom: theme.cardBackground?.val || '#ffffff',
      backgroundGradientTo: theme.cardBackground?.val || '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(51, 185, 247, ${opacity})`, // Primary color
      labelColor: (opacity = 1) =>
        `rgba(${theme.color?.val === '#FFFFFF' ? '255,255,255' : '27,26,26'}, ${opacity})`,
      style: {
        borderRadius: 12,
      },
      propsForDots: {
        r: showDots ? '4' : '0',
        strokeWidth: '2',
        stroke: theme.primary?.val || '#33b9f7',
      },
      propsForBackgroundLines: {
        strokeDasharray: '4',
        stroke: theme.borderColor?.val || '#D8D8D8',
        strokeWidth: 1,
      },
    }),
    [theme, showDots]
  );

  // Process data for chart
  const chartData = useMemo(() => {
    // If custom datasets provided, use them
    if (datasets && labels) {
      return {
        labels,
        datasets: datasets.map((ds) => ({
          data: ds.data,
          color: ds.color,
          strokeWidth: ds.strokeWidth || 2,
          withDots: ds.withDots ?? showDots,
        })),
      };
    }

    // Otherwise, use simple data format
    const chartLabels = data.map((d) => d.label);
    const chartValues = data.map((d) => d.value);

    // Limit labels if too many
    const maxLabels = 7;
    const step = Math.ceil(chartLabels.length / maxLabels);
    const filteredLabels = chartLabels.map((label, i) =>
      i % step === 0 ? label : ''
    );

    return {
      labels: filteredLabels,
      datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }],
    };
  }, [data, datasets, labels, showDots]);

  // Check for empty data
  const isEmpty = chartData.datasets[0].data.length === 0 ||
    (chartData.datasets[0].data.length === 1 && chartData.datasets[0].data[0] === 0);

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      isLoading={isLoading}
      error={error}
      height={height + (showLegend ? 40 : 0)}
      action={action}
    >
      {isEmpty ? (
        <ChartEmptyState message="No data available for this period" />
      ) : (
        <YStack>
          <RNLineChart
            data={chartData}
            width={screenWidth - 64} // Account for card padding
            height={height}
            chartConfig={chartConfig}
            bezier={bezier}
            style={{
              marginLeft: -16,
              borderRadius: 12,
            }}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
            yAxisLabel={yAxisPrefix}
            yAxisSuffix={yAxisSuffix}
            formatYLabel={formatYLabel}
          />
          {showLegend && legendItems.length > 0 && (
            <ChartLegend items={legendItems} />
          )}
        </YStack>
      )}
    </ChartWrapper>
  );
}

export default LineChart;
