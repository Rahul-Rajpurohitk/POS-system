import React, { useState, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  ArrowRight,
} from '@tamagui/lucide-icons';
import { Card, CardHeader } from '@/components/ui';
import { LineChart, BarChart } from '@/components/charts';
import { useRevenueTrends, useSalesForecast } from '@/features/analytics';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';
import type { ReportPeriod } from '@/features/analytics/types';

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
];

// Metric Card component
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Card flex={1} minWidth={140}>
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$3" color="$colorSecondary">
            {title}
          </Text>
          {icon}
        </XStack>
        <Text fontSize="$6" fontWeight="bold" color="$color">
          {value}
        </Text>
        {subtitle && (
          <Text fontSize="$2" color="$colorSecondary">
            {subtitle}
          </Text>
        )}
        {trend && (
          <XStack alignItems="center" gap="$1">
            {trendUp ? (
              <TrendingUp size={14} color="$success" />
            ) : (
              <TrendingDown size={14} color="$error" />
            )}
            <Text fontSize="$2" color={trendUp ? '$success' : '$error'}>
              {trend}
            </Text>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

// Forecast indicator
function ForecastIndicator({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence: number;
}) {
  return (
    <XStack
      backgroundColor="$backgroundPress"
      padding="$3"
      borderRadius="$3"
      justifyContent="space-between"
      alignItems="center"
    >
      <YStack>
        <Text fontSize="$2" color="$colorSecondary">
          {label}
        </Text>
        <Text fontSize="$5" fontWeight="bold" color="$color">
          {value}
        </Text>
      </YStack>
      <YStack alignItems="flex-end">
        <Text fontSize="$2" color="$colorSecondary">
          Confidence
        </Text>
        <Text fontSize="$3" fontWeight="600" color="$primary">
          {confidence.toFixed(0)}%
        </Text>
      </YStack>
    </XStack>
  );
}

export default function RevenueAnalyticsScreen({
  navigation,
}: MoreScreenProps<'RevenueAnalytics'>) {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<ReportPeriod>('this_month');

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
    refetch,
  } = useRevenueTrends({ period });

  const {
    data: forecast,
    isLoading: forecastLoading,
  } = useSalesForecast(14);

  const isRefreshing = trendsLoading || forecastLoading;

  // Prepare daily trend data for chart
  const dailyTrendData = useMemo(() => {
    if (!trends?.dailyTrend) return [];
    return trends.dailyTrend.map((d) => ({
      label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: d.revenue,
    }));
  }, [trends?.dailyTrend]);

  // Prepare weekday analysis for bar chart
  const weekdayData = useMemo(() => {
    if (!trends?.weekdayAnalysis) return [];
    return trends.weekdayAnalysis.map((w) => ({
      label: w.dayName.slice(0, 3),
      value: w.avgRevenue,
    }));
  }, [trends?.weekdayAnalysis]);

  // Prepare forecast data for chart
  const forecastChartData = useMemo(() => {
    if (!forecast) return { labels: [], datasets: [] };

    const historicalDates = forecast.historicalData.slice(-14).map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const forecastDates = forecast.forecast.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    const historicalValues = forecast.historicalData.slice(-14).map((d) => d.revenue);
    const forecastValues = forecast.forecast.map((d) => d.predictedRevenue);

    // Pad historical values to align with forecast
    const paddedHistorical = [...historicalValues, ...Array(forecastValues.length).fill(null)];
    const paddedForecast = [...Array(historicalValues.length).fill(null), ...forecastValues];

    return {
      labels: [...historicalDates, ...forecastDates],
      datasets: [
        {
          data: paddedHistorical.map((v) => v ?? 0),
          color: (opacity: number) => `rgba(51, 185, 247, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: paddedForecast.map((v) => v ?? 0),
          color: (opacity: number) => `rgba(74, 222, 128, ${opacity})`,
          strokeWidth: 2,
          withDots: false,
        },
      ],
    };
  }, [forecast]);

  const formatTrend = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
      }
    >
      <YStack padding="$4" gap="$4">
        {/* Period Selector */}
        <XStack gap="$2">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="$3"
              backgroundColor={period === option.value ? '$primary' : '$backgroundPress'}
              color={period === option.value ? 'white' : '$color'}
              onPress={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </XStack>

        {/* Summary Metrics */}
        <XStack flexWrap="wrap" gap="$3">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(trends?.totalRevenue || 0, settings.currency)}
            trend={trends ? formatTrend(trends.revenueGrowth) : undefined}
            trendUp={trends ? trends.revenueGrowth >= 0 : undefined}
            icon={<DollarSign size={18} color="$primary" />}
          />
          <MetricCard
            title="Total Orders"
            value={String(trends?.totalOrders || 0)}
            trend={trends ? formatTrend(trends.orderGrowth) : undefined}
            trendUp={trends ? trends.orderGrowth >= 0 : undefined}
            icon={<Calendar size={18} color="$primary" />}
          />
          <MetricCard
            title="Avg Order Value"
            value={formatCurrency(trends?.averageOrderValue || 0, settings.currency)}
            trend={trends ? formatTrend(trends.aovGrowth) : undefined}
            trendUp={trends ? trends.aovGrowth >= 0 : undefined}
            icon={<Target size={18} color="$primary" />}
          />
        </XStack>

        {/* Projections Card */}
        {trends && (
          <Card>
            <CardHeader title="Month-End Projections" />
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$colorSecondary">Projected Revenue</Text>
                <Text fontSize="$5" fontWeight="bold" color="$success">
                  {formatCurrency(trends.projectedMonthEndRevenue, settings.currency)}
                </Text>
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$colorSecondary">Projected Orders</Text>
                <Text fontSize="$5" fontWeight="bold" color="$color">
                  {trends.projectedMonthEndOrders}
                </Text>
              </XStack>
            </YStack>
          </Card>
        )}

        {/* Revenue Trend Chart */}
        <LineChart
          title="Revenue Trend"
          subtitle={`Daily revenue for ${period.replace('_', ' ')}`}
          data={dailyTrendData}
          isLoading={trendsLoading}
          error={trendsError}
          height={220}
          yAxisPrefix={settings.currency}
          bezier
        />

        {/* Weekday Analysis */}
        <BarChart
          title="Sales by Day of Week"
          subtitle="Average revenue per weekday"
          data={weekdayData}
          isLoading={trendsLoading}
          error={trendsError}
          height={200}
          yAxisPrefix={settings.currency}
        />

        {/* Forecast Section */}
        {forecast && (
          <Card>
            <CardHeader
              title="14-Day Sales Forecast"
              subtitle={`Trend: ${forecast.trend} (${formatTrend(forecast.trendPercentage)})`}
            />
            <YStack gap="$3">
              {/* Trend indicator */}
              <XStack
                backgroundColor={
                  forecast.trend === 'increasing'
                    ? '$successBackground'
                    : forecast.trend === 'decreasing'
                    ? '$errorBackground'
                    : '$backgroundPress'
                }
                padding="$3"
                borderRadius="$3"
                alignItems="center"
                gap="$2"
              >
                {forecast.trend === 'increasing' ? (
                  <TrendingUp size={20} color="$success" />
                ) : forecast.trend === 'decreasing' ? (
                  <TrendingDown size={20} color="$error" />
                ) : (
                  <ArrowRight size={20} color="$colorSecondary" />
                )}
                <Text
                  color={
                    forecast.trend === 'increasing'
                      ? '$success'
                      : forecast.trend === 'decreasing'
                      ? '$error'
                      : '$color'
                  }
                  fontWeight="600"
                >
                  {forecast.trend.charAt(0).toUpperCase() + forecast.trend.slice(1)} trend detected
                </Text>
              </XStack>

              {/* Moving averages */}
              <XStack gap="$3">
                <YStack flex={1} backgroundColor="$backgroundPress" padding="$3" borderRadius="$3">
                  <Text fontSize="$2" color="$colorSecondary">
                    7-Day Avg
                  </Text>
                  <Text fontSize="$4" fontWeight="bold" color="$color">
                    {formatCurrency(forecast.movingAverage7Day, settings.currency)}
                  </Text>
                </YStack>
                <YStack flex={1} backgroundColor="$backgroundPress" padding="$3" borderRadius="$3">
                  <Text fontSize="$2" color="$colorSecondary">
                    30-Day Avg
                  </Text>
                  <Text fontSize="$4" fontWeight="bold" color="$color">
                    {formatCurrency(forecast.movingAverage30Day, settings.currency)}
                  </Text>
                </YStack>
              </XStack>

              {/* Best/Worst days */}
              {forecast.seasonalPattern && (
                <YStack gap="$2">
                  <Text fontSize="$3" color="$colorSecondary">
                    Seasonal Pattern
                  </Text>
                  <XStack gap="$3">
                    <YStack flex={1}>
                      <Text fontSize="$2" color="$success">
                        Best Days
                      </Text>
                      <Text fontWeight="600">
                        {forecast.seasonalPattern.bestDays.join(', ')}
                      </Text>
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize="$2" color="$error">
                        Slowest Days
                      </Text>
                      <Text fontWeight="600">
                        {forecast.seasonalPattern.worstDays.join(', ')}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
              )}
            </YStack>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}
