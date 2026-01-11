import React, { useState, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Star,
  Crown,
  Heart,
  Clock,
} from '@tamagui/lucide-icons';
import { Card, CardHeader } from '@/components/ui';
import { PieChart, HorizontalBarChart } from '@/components/charts';
import { useRFMSegmentation, useCustomerCohorts } from '@/features/analytics';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';
import type { RFMSegment, CustomerRFM } from '@/features/analytics/types';

// Segment colors and icons
const SEGMENT_CONFIG: Record<RFMSegment, { color: string; icon: React.ReactNode; priority: number }> = {
  Champions: { color: '#4ade80', icon: <Crown size={16} color="white" />, priority: 1 },
  'Loyal Customers': { color: '#22c55e', icon: <Heart size={16} color="white" />, priority: 2 },
  'Potential Loyalists': { color: '#84cc16', icon: <Star size={16} color="white" />, priority: 3 },
  'New Customers': { color: '#06b6d4', icon: <UserCheck size={16} color="white" />, priority: 4 },
  Promising: { color: '#3b82f6', icon: <Star size={16} color="white" />, priority: 5 },
  'Need Attention': { color: '#f59e0b', icon: <AlertTriangle size={16} color="white" />, priority: 6 },
  'About to Sleep': { color: '#f97316', icon: <Clock size={16} color="white" />, priority: 7 },
  'At Risk': { color: '#ef4444', icon: <AlertTriangle size={16} color="white" />, priority: 8 },
  'Cannot Lose': { color: '#dc2626', icon: <Crown size={16} color="white" />, priority: 9 },
  Hibernating: { color: '#6b7280', icon: <Clock size={16} color="white" />, priority: 10 },
  Lost: { color: '#374151', icon: <UserX size={16} color="white" />, priority: 11 },
};

// Segment Card component
function SegmentCard({
  segment,
  count,
  percentage,
  revenue,
  avgOrderValue,
  onPress,
}: {
  segment: RFMSegment;
  count: number;
  percentage: number;
  revenue: number;
  avgOrderValue: number;
  onPress?: () => void;
}) {
  const { settings } = useSettingsStore();
  const config = SEGMENT_CONFIG[segment];

  return (
    <Card flex={1} minWidth={150} pressable={!!onPress} onPress={onPress}>
      <YStack gap="$2">
        <XStack alignItems="center" gap="$2">
          <YStack
            width={28}
            height={28}
            borderRadius="$full"
            backgroundColor={config.color}
            justifyContent="center"
            alignItems="center"
          >
            {config.icon}
          </YStack>
          <Text fontSize="$3" fontWeight="600" flex={1} numberOfLines={1}>
            {segment}
          </Text>
        </XStack>
        <XStack justifyContent="space-between" alignItems="baseline">
          <Text fontSize="$6" fontWeight="bold" color="$color">
            {count}
          </Text>
          <Text fontSize="$3" color={config.color} fontWeight="600">
            {percentage.toFixed(1)}%
          </Text>
        </XStack>
        <YStack gap="$1">
          <Text fontSize="$2" color="$colorSecondary">
            Revenue: {formatCurrency(revenue, settings.currency)}
          </Text>
          <Text fontSize="$2" color="$colorSecondary">
            AOV: {formatCurrency(avgOrderValue, settings.currency)}
          </Text>
        </YStack>
      </YStack>
    </Card>
  );
}

// Customer Row component
function CustomerRow({
  customer,
  onPress,
}: {
  customer: CustomerRFM;
  onPress?: () => void;
}) {
  const { settings } = useSettingsStore();
  const config = SEGMENT_CONFIG[customer.segment];

  return (
    <XStack
      paddingVertical="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
      gap="$3"
      pressStyle={{ opacity: 0.7 }}
      onPress={onPress}
    >
      <YStack
        width={40}
        height={40}
        borderRadius="$full"
        backgroundColor={config.color}
        justifyContent="center"
        alignItems="center"
      >
        <Text color="white" fontWeight="bold" fontSize="$3">
          {customer.customerName.charAt(0).toUpperCase()}
        </Text>
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="600" numberOfLines={1}>
          {customer.customerName}
        </Text>
        <Text fontSize="$2" color="$colorSecondary" numberOfLines={1}>
          {customer.segment} • {customer.totalOrders} orders
        </Text>
      </YStack>
      <YStack alignItems="flex-end">
        <Text fontWeight="bold" color="$color">
          {formatCurrency(customer.totalSpend, settings.currency)}
        </Text>
        <XStack alignItems="center" gap="$1">
          <Text fontSize="$2" color="$colorSecondary">
            RFM:
          </Text>
          <Text fontSize="$2" fontWeight="600" color={config.color}>
            {customer.rfmScoreString}
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );
}

export default function CustomerAnalyticsScreen({
  navigation,
}: MoreScreenProps<'CustomerAnalytics'>) {
  const { settings } = useSettingsStore();
  const [selectedSegment, setSelectedSegment] = useState<RFMSegment | null>(null);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  const {
    data: rfmData,
    isLoading: rfmLoading,
    error: rfmError,
    refetch,
  } = useRFMSegmentation();

  const {
    data: cohortData,
    isLoading: cohortLoading,
  } = useCustomerCohorts();

  const isRefreshing = rfmLoading || cohortLoading;

  // Prepare segment distribution for pie chart
  const segmentPieData = useMemo(() => {
    if (!rfmData?.segmentDistribution) return [];
    return rfmData.segmentDistribution.map((s) => ({
      name: s.segment,
      value: s.count,
      color: SEGMENT_CONFIG[s.segment]?.color || '#6b7280',
    }));
  }, [rfmData?.segmentDistribution]);

  // Prepare revenue by segment for bar chart
  const revenueBySegmentData = useMemo(() => {
    if (!rfmData?.segmentDistribution) return [];
    return rfmData.segmentDistribution
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((s) => ({
        label: s.segment.length > 12 ? s.segment.slice(0, 12) + '...' : s.segment,
        value: s.totalRevenue,
      }));
  }, [rfmData?.segmentDistribution]);

  // Filter customers by selected segment
  const displayCustomers = useMemo(() => {
    if (!rfmData?.customers) return [];
    let filtered = rfmData.customers;
    if (selectedSegment) {
      filtered = filtered.filter((c) => c.segment === selectedSegment);
    }
    return showAllCustomers ? filtered : filtered.slice(0, 10);
  }, [rfmData?.customers, selectedSegment, showAllCustomers]);

  // Group segments by action priority
  const segmentGroups = useMemo(() => {
    if (!rfmData?.segmentDistribution) return { high: [], medium: [], low: [] };

    const sorted = [...rfmData.segmentDistribution].sort(
      (a, b) => SEGMENT_CONFIG[a.segment].priority - SEGMENT_CONFIG[b.segment].priority
    );

    return {
      high: sorted.filter((s) => ['Champions', 'Loyal Customers', 'Cannot Lose'].includes(s.segment)),
      medium: sorted.filter((s) => ['Potential Loyalists', 'New Customers', 'Promising', 'Need Attention'].includes(s.segment)),
      low: sorted.filter((s) => ['About to Sleep', 'At Risk', 'Hibernating', 'Lost'].includes(s.segment)),
    };
  }, [rfmData?.segmentDistribution]);

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
      }
    >
      <YStack padding="$4" gap="$4">
        {/* Overview Stats */}
        <Card>
          <CardHeader
            title="RFM Analysis Overview"
            subtitle="Customers segmented by Recency, Frequency, Monetary value"
          />
          <YStack gap="$3">
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Total Customers</Text>
              <Text fontWeight="bold">{rfmData?.totalCustomers || 0}</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Analyzed</Text>
              <Text fontWeight="bold">{rfmData?.analyzedCustomers || 0}</Text>
            </XStack>
            {cohortData && (
              <>
                <XStack justifyContent="space-between">
                  <Text color="$colorSecondary">Retention Rate</Text>
                  <Text fontWeight="bold" color="$success">
                    {cohortData.overallRetentionRate.toFixed(1)}%
                  </Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text color="$colorSecondary">Avg Lifetime Value</Text>
                  <Text fontWeight="bold">
                    {formatCurrency(cohortData.averageLifetimeValue, settings.currency)}
                  </Text>
                </XStack>
              </>
            )}
          </YStack>
        </Card>

        {/* Segment Distribution */}
        <PieChart
          title="Customer Segments"
          subtitle="Distribution by RFM analysis"
          data={segmentPieData}
          isLoading={rfmLoading}
          error={rfmError}
          height={200}
          showPercentages
        />

        {/* Revenue by Segment */}
        <HorizontalBarChart
          title="Revenue by Segment"
          subtitle="Top 5 segments by total revenue"
          data={revenueBySegmentData}
          isLoading={rfmLoading}
          error={rfmError}
          formatValue={(v) => formatCurrency(v, settings.currency)}
        />

        {/* High Value Segments */}
        {segmentGroups.high.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="600" color="$success">
              High Value Customers
            </Text>
            <XStack flexWrap="wrap" gap="$3">
              {segmentGroups.high.map((s) => (
                <SegmentCard
                  key={s.segment}
                  segment={s.segment}
                  count={s.count}
                  percentage={s.percentage}
                  revenue={s.totalRevenue}
                  avgOrderValue={s.avgOrderValue}
                  onPress={() => setSelectedSegment(selectedSegment === s.segment ? null : s.segment)}
                />
              ))}
            </XStack>
          </YStack>
        )}

        {/* Medium Priority Segments */}
        {segmentGroups.medium.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="600" color="$warning">
              Growth Opportunities
            </Text>
            <XStack flexWrap="wrap" gap="$3">
              {segmentGroups.medium.map((s) => (
                <SegmentCard
                  key={s.segment}
                  segment={s.segment}
                  count={s.count}
                  percentage={s.percentage}
                  revenue={s.totalRevenue}
                  avgOrderValue={s.avgOrderValue}
                  onPress={() => setSelectedSegment(selectedSegment === s.segment ? null : s.segment)}
                />
              ))}
            </XStack>
          </YStack>
        )}

        {/* At Risk Segments */}
        {segmentGroups.low.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="600" color="$error">
              Needs Attention
            </Text>
            <XStack flexWrap="wrap" gap="$3">
              {segmentGroups.low.map((s) => (
                <SegmentCard
                  key={s.segment}
                  segment={s.segment}
                  count={s.count}
                  percentage={s.percentage}
                  revenue={s.totalRevenue}
                  avgOrderValue={s.avgOrderValue}
                  onPress={() => setSelectedSegment(selectedSegment === s.segment ? null : s.segment)}
                />
              ))}
            </XStack>
          </YStack>
        )}

        {/* Customer List */}
        <Card>
          <CardHeader
            title={selectedSegment ? `${selectedSegment} Customers` : 'All Customers'}
            subtitle="Sorted by total spend"
            action={
              selectedSegment ? (
                <Button size="$2" chromeless onPress={() => setSelectedSegment(null)}>
                  <Text color="$primary" fontSize="$2">
                    Clear Filter
                  </Text>
                </Button>
              ) : rfmData && rfmData.customers.length > 10 ? (
                <Button
                  size="$2"
                  chromeless
                  onPress={() => setShowAllCustomers(!showAllCustomers)}
                >
                  <Text color="$primary" fontSize="$2">
                    {showAllCustomers ? 'Show Less' : `Show All`}
                  </Text>
                </Button>
              ) : null
            }
          />
          <YStack>
            {rfmLoading ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                Loading customers...
              </Text>
            ) : displayCustomers.length === 0 ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                No customers found
              </Text>
            ) : (
              displayCustomers.map((customer) => (
                <CustomerRow
                  key={customer.customerId}
                  customer={customer}
                  onPress={() =>
                    navigation.navigate('CustomerDetail', { id: customer.customerId })
                  }
                />
              ))
            )}
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
