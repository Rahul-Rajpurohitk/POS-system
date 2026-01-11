import React, { useState, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  UserCheck,
  Package,
  AlertTriangle,
} from '@tamagui/lucide-icons';
import { Card, CardHeader } from '@/components/ui';
import { LineChart, BarChart, PieChart } from '@/components/charts';
import { useEnhancedDashboard, usePeakHoursAnalysis } from '@/features/analytics';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';
import type { ReportPeriod, DashboardInsight } from '@/features/analytics/types';

// Period selector options
const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
];

// KPI Card component
function KPICard({
  title,
  value,
  trend,
  trendUp,
  icon,
  onPress,
}: {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Card flex={1} minWidth={150} pressable={!!onPress} onPress={onPress}>
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$2" flex={1}>
          <Text fontSize="$3" color="$colorSecondary" numberOfLines={1}>
            {title}
          </Text>
          <Text fontSize="$6" fontWeight="bold" color="$color" numberOfLines={1}>
            {value}
          </Text>
          {trend && (
            <XStack alignItems="center" gap="$1">
              {trendUp ? (
                <TrendingUp size={14} color="$success" />
              ) : (
                <TrendingDown size={14} color="$error" />
              )}
              <Text fontSize="$2" color={trendUp ? '$success' : '$error'}>
                {trend} vs yesterday
              </Text>
            </XStack>
          )}
        </YStack>
        <YStack backgroundColor="$primary" padding="$2" borderRadius="$2" opacity={0.9}>
          {icon}
        </YStack>
      </XStack>
    </Card>
  );
}

// Insight Card component
function InsightCard({ insight }: { insight: DashboardInsight }) {
  const iconColor =
    insight.type === 'positive' ? '$success' : insight.type === 'negative' ? '$error' : '$warning';

  return (
    <XStack
      backgroundColor={
        insight.type === 'positive'
          ? '$successBackground'
          : insight.type === 'negative'
          ? '$errorBackground'
          : '$warningBackground'
      }
      padding="$3"
      borderRadius="$3"
      gap="$3"
      alignItems="center"
    >
      <YStack
        backgroundColor={iconColor}
        padding="$2"
        borderRadius="$full"
        opacity={0.2}
      >
        {insight.type === 'positive' ? (
          <TrendingUp size={16} color={iconColor} />
        ) : insight.type === 'negative' ? (
          <AlertTriangle size={16} color={iconColor} />
        ) : (
          <Clock size={16} color={iconColor} />
        )}
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="600" color="$color" fontSize="$3">
          {insight.title}
        </Text>
        <Text color="$colorSecondary" fontSize="$2">
          {insight.description}
        </Text>
      </YStack>
      {insight.metric && (
        <Text fontWeight="bold" color={iconColor} fontSize="$4">
          {insight.metric}
        </Text>
      )}
    </XStack>
  );
}

// Quick navigation card
function QuickNavCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Card pressable onPress={onPress} flex={1} minWidth={140}>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$3" alignItems="center" flex={1}>
          <YStack backgroundColor="$backgroundPress" padding="$2" borderRadius="$2">
            {icon}
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="600" fontSize="$3" numberOfLines={1}>
              {title}
            </Text>
            <Text color="$colorSecondary" fontSize="$2" numberOfLines={1}>
              {subtitle}
            </Text>
          </YStack>
        </XStack>
        <ChevronRight size={20} color="$colorSecondary" />
      </XStack>
    </Card>
  );
}

export default function AnalyticsDashboardScreen({
  navigation,
}: MoreScreenProps<'AnalyticsDashboard'>) {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<ReportPeriod>('today');

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useEnhancedDashboard(period);

  const {
    data: peakHours,
    isLoading: peakHoursLoading,
  } = usePeakHoursAnalysis();

  const isRefreshing = dashboardLoading;

  // Prepare hourly data for chart
  const hourlyChartData = useMemo(() => {
    if (!dashboard?.hourlyBreakdown) return [];
    return dashboard.hourlyBreakdown.map((h) => ({
      label: `${h.hour}:00`,
      value: h.avgRevenue,
    }));
  }, [dashboard?.hourlyBreakdown]);

  // Prepare top products for chart
  const topProductsData = useMemo(() => {
    if (!dashboard?.topProducts) return [];
    return dashboard.topProducts.slice(0, 5).map((p) => ({
      label: p.name,
      value: p.revenue,
    }));
  }, [dashboard?.topProducts]);

  // Prepare payment methods for pie chart
  const paymentMethodsData = useMemo(() => {
    if (!dashboard?.paymentMethods) return [];
    return dashboard.paymentMethods.map((p) => ({
      name: p.method.charAt(0).toUpperCase() + p.method.slice(1),
      value: p.amount,
    }));
  }, [dashboard?.paymentMethods]);

  // Format comparison trend
  const formatTrend = (percentChange: number) => {
    const sign = percentChange >= 0 ? '+' : '';
    return `${sign}${percentChange.toFixed(1)}%`;
  };

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetchDashboard} />
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

        {/* KPI Cards */}
        <XStack flexWrap="wrap" gap="$3">
          <KPICard
            title="Revenue"
            value={formatCurrency(dashboard?.realTimeMetrics.todaySales || 0, settings.currency)}
            trend={
              dashboard?.comparisons.vsYesterday
                ? formatTrend(dashboard.comparisons.vsYesterday.percentChange)
                : undefined
            }
            trendUp={
              dashboard?.comparisons.vsYesterday
                ? dashboard.comparisons.vsYesterday.percentChange >= 0
                : undefined
            }
            icon={<DollarSign size={20} color="white" />}
          />
          <KPICard
            title="Orders"
            value={String(dashboard?.realTimeMetrics.todayOrders || 0)}
            trend={
              dashboard?.comparisons.vsYesterday
                ? `${dashboard.comparisons.vsYesterday.orders} yesterday`
                : undefined
            }
            trendUp={
              dashboard?.realTimeMetrics.todayOrders
                ? dashboard.realTimeMetrics.todayOrders >= (dashboard.comparisons.vsYesterday?.orders || 0)
                : undefined
            }
            icon={<ShoppingCart size={20} color="white" />}
          />
          <KPICard
            title="Customers"
            value={String(dashboard?.realTimeMetrics.todayCustomers || 0)}
            icon={<Users size={20} color="white" />}
          />
          <KPICard
            title="Current Hour"
            value={formatCurrency(dashboard?.realTimeMetrics.currentHourSales || 0, settings.currency)}
            icon={<Clock size={20} color="white" />}
          />
        </XStack>

        {/* Insights */}
        {dashboard?.insights && dashboard.insights.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600" color="$color">
              Insights
            </Text>
            {dashboard.insights.slice(0, 3).map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </YStack>
        )}

        {/* Charts Section */}
        <YStack gap="$4">
          {/* Hourly Sales Chart */}
          <LineChart
            title="Sales by Hour"
            subtitle={period === 'today' ? "Today's hourly breakdown" : 'Average hourly sales'}
            data={hourlyChartData}
            isLoading={dashboardLoading}
            error={dashboardError}
            height={200}
            yAxisPrefix={settings.currency}
            bezier
          />

          {/* Top Products */}
          <BarChart
            title="Top Products"
            subtitle="By revenue"
            data={topProductsData}
            isLoading={dashboardLoading}
            error={dashboardError}
            height={200}
            yAxisPrefix={settings.currency}
            action={
              <Button
                size="$2"
                chromeless
                onPress={() => navigation.navigate('ProductAnalytics' as any)}
              >
                <Text color="$primary" fontSize="$2">
                  View All
                </Text>
              </Button>
            }
          />

          {/* Payment Methods */}
          <PieChart
            title="Payment Methods"
            subtitle="Distribution by amount"
            data={paymentMethodsData}
            isLoading={dashboardLoading}
            error={dashboardError}
            height={200}
            showPercentages
          />
        </YStack>

        {/* Peak Hours Recommendation */}
        {peakHours?.recommendation && (
          <Card>
            <CardHeader title="Staffing Recommendation" />
            <Text color="$colorSecondary" lineHeight="$5">
              {peakHours.recommendation}
            </Text>
            {peakHours.peakHours.length > 0 && (
              <XStack marginTop="$3" gap="$2" flexWrap="wrap">
                <Text color="$colorSecondary" fontSize="$3">
                  Peak hours:
                </Text>
                {peakHours.peakHours.map((hour) => (
                  <YStack
                    key={hour}
                    backgroundColor="$primary"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$2"
                  >
                    <Text color="white" fontSize="$2" fontWeight="600">
                      {hour}:00
                    </Text>
                  </YStack>
                ))}
              </XStack>
            )}
          </Card>
        )}

        {/* Quick Navigation */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Explore Analytics
          </Text>
          <XStack flexWrap="wrap" gap="$3">
            <QuickNavCard
              title="Revenue"
              subtitle="Trends & forecasts"
              icon={<BarChart3 size={20} color="$primary" />}
              onPress={() => navigation.navigate('RevenueAnalytics' as any)}
            />
            <QuickNavCard
              title="Products"
              subtitle="ABC analysis"
              icon={<PieChartIcon size={20} color="$primary" />}
              onPress={() => navigation.navigate('ProductAnalytics' as any)}
            />
            <QuickNavCard
              title="Customers"
              subtitle="RFM segments"
              icon={<UserCheck size={20} color="$primary" />}
              onPress={() => navigation.navigate('CustomerAnalytics' as any)}
            />
            <QuickNavCard
              title="Inventory"
              subtitle="Reorder alerts"
              icon={<Package size={20} color="$primary" />}
              onPress={() => navigation.navigate('InventoryIntelligence' as any)}
            />
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
