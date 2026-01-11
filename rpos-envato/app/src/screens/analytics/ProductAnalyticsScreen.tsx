import React, { useState, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Star,
  AlertCircle,
} from '@tamagui/lucide-icons';
import { Card, CardHeader } from '@/components/ui';
import { PieChart, HorizontalBarChart } from '@/components/charts';
import { useABCClassification, useProductPerformance } from '@/features/analytics';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';
import type { ABCCategory } from '@/features/analytics/types';

// ABC Category colors
const ABC_COLORS: Record<ABCCategory, string> = {
  A: '#4ade80', // Green - Top performers
  B: '#f59e0b', // Amber - Middle tier
  C: '#ef4444', // Red - Low performers
};

// ABC Category descriptions
const ABC_DESCRIPTIONS: Record<ABCCategory, string> = {
  A: 'Top 20% products generating 80% of revenue',
  B: 'Middle tier products (15% of revenue)',
  C: 'Low performers (5% of revenue)',
};

// Summary Card component
function ABCSummaryCard({
  category,
  count,
  revenue,
  percentage,
  total,
}: {
  category: ABCCategory;
  count: number;
  revenue: number;
  percentage: number;
  total: number;
}) {
  const { settings } = useSettingsStore();
  const color = ABC_COLORS[category];

  return (
    <Card flex={1} minWidth={100}>
      <YStack gap="$2" alignItems="center">
        <YStack
          width={48}
          height={48}
          borderRadius="$full"
          backgroundColor={color}
          justifyContent="center"
          alignItems="center"
        >
          <Text fontSize="$6" fontWeight="bold" color="white">
            {category}
          </Text>
        </YStack>
        <Text fontSize="$5" fontWeight="bold" color="$color">
          {count}
        </Text>
        <Text fontSize="$2" color="$colorSecondary" textAlign="center">
          Products
        </Text>
        <Text fontSize="$3" fontWeight="600" color={color}>
          {percentage.toFixed(1)}%
        </Text>
        <Text fontSize="$2" color="$colorSecondary">
          {formatCurrency(revenue, settings.currency)}
        </Text>
      </YStack>
    </Card>
  );
}

// Product Row component
function ProductRow({
  rank,
  name,
  category,
  classification,
  revenue,
  quantity,
}: {
  rank: number;
  name: string;
  category: string | null;
  classification: ABCCategory;
  revenue: number;
  quantity: number;
}) {
  const { settings } = useSettingsStore();
  const color = ABC_COLORS[classification];

  return (
    <XStack
      paddingVertical="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
      gap="$3"
    >
      <YStack
        width={28}
        height={28}
        borderRadius="$full"
        backgroundColor="$backgroundPress"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="$2" fontWeight="600" color="$colorSecondary">
          {rank}
        </Text>
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="600" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize="$2" color="$colorSecondary" numberOfLines={1}>
          {category || 'Uncategorized'} • {quantity} sold
        </Text>
      </YStack>
      <YStack alignItems="flex-end" gap="$1">
        <Text fontWeight="bold" color="$color">
          {formatCurrency(revenue, settings.currency)}
        </Text>
        <YStack
          backgroundColor={color}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Text fontSize="$1" fontWeight="600" color="white">
            Class {classification}
          </Text>
        </YStack>
      </YStack>
    </XStack>
  );
}

export default function ProductAnalyticsScreen({
  navigation,
}: MoreScreenProps<'ProductAnalytics'>) {
  const { settings } = useSettingsStore();
  const [showAllProducts, setShowAllProducts] = useState(false);

  const {
    data: abcData,
    isLoading: abcLoading,
    error: abcError,
    refetch,
  } = useABCClassification();

  const {
    data: performance,
    isLoading: performanceLoading,
  } = useProductPerformance({ limit: 10 });

  const isRefreshing = abcLoading || performanceLoading;

  // Prepare pie chart data for ABC distribution
  const abcPieData = useMemo(() => {
    if (!abcData) return [];
    return [
      {
        name: 'Class A',
        value: abcData.categoryA.revenue,
        color: ABC_COLORS.A,
      },
      {
        name: 'Class B',
        value: abcData.categoryB.revenue,
        color: ABC_COLORS.B,
      },
      {
        name: 'Class C',
        value: abcData.categoryC.revenue,
        color: ABC_COLORS.C,
      },
    ];
  }, [abcData]);

  // Products to display
  const displayProducts = useMemo(() => {
    if (!abcData?.products) return [];
    return showAllProducts ? abcData.products : abcData.products.slice(0, 10);
  }, [abcData?.products, showAllProducts]);

  // Top performers for horizontal bar chart
  const topPerformersData = useMemo(() => {
    if (!abcData?.products) return [];
    return abcData.products.slice(0, 5).map((p) => ({
      label: p.productName.length > 20 ? p.productName.slice(0, 20) + '...' : p.productName,
      value: p.revenue,
      maxValue: abcData.products[0]?.revenue || p.revenue,
    }));
  }, [abcData?.products]);

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
      }
    >
      <YStack padding="$4" gap="$4">
        {/* Header Stats */}
        <Card>
          <CardHeader
            title="ABC Analysis Overview"
            subtitle="Products classified by revenue contribution"
          />
          <YStack gap="$3">
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Total Products</Text>
              <Text fontWeight="bold">{abcData?.totalProducts || 0}</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Total Revenue</Text>
              <Text fontWeight="bold">
                {formatCurrency(abcData?.totalRevenue || 0, settings.currency)}
              </Text>
            </XStack>
          </YStack>
        </Card>

        {/* ABC Summary Cards */}
        <XStack gap="$3">
          <ABCSummaryCard
            category="A"
            count={abcData?.categoryA.count || 0}
            revenue={abcData?.categoryA.revenue || 0}
            percentage={abcData?.categoryA.percentage || 0}
            total={abcData?.totalProducts || 0}
          />
          <ABCSummaryCard
            category="B"
            count={abcData?.categoryB.count || 0}
            revenue={abcData?.categoryB.revenue || 0}
            percentage={abcData?.categoryB.percentage || 0}
            total={abcData?.totalProducts || 0}
          />
          <ABCSummaryCard
            category="C"
            count={abcData?.categoryC.count || 0}
            revenue={abcData?.categoryC.revenue || 0}
            percentage={abcData?.categoryC.percentage || 0}
            total={abcData?.totalProducts || 0}
          />
        </XStack>

        {/* ABC Distribution Pie Chart */}
        <PieChart
          title="Revenue Distribution"
          subtitle="By ABC classification"
          data={abcPieData}
          isLoading={abcLoading}
          error={abcError}
          height={200}
          showPercentages
        />

        {/* Top Performers */}
        <HorizontalBarChart
          title="Top 5 Products"
          subtitle="By revenue"
          data={topPerformersData}
          isLoading={abcLoading}
          error={abcError}
          formatValue={(v) => formatCurrency(v, settings.currency)}
          barColor={ABC_COLORS.A}
        />

        {/* Category Insights */}
        <Card>
          <CardHeader title="Classification Guide" />
          <YStack gap="$3">
            {(['A', 'B', 'C'] as ABCCategory[]).map((cat) => (
              <XStack key={cat} alignItems="center" gap="$3">
                <YStack
                  width={32}
                  height={32}
                  borderRadius="$full"
                  backgroundColor={ABC_COLORS[cat]}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text fontWeight="bold" color="white">
                    {cat}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontWeight="600">Class {cat}</Text>
                  <Text fontSize="$2" color="$colorSecondary">
                    {ABC_DESCRIPTIONS[cat]}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </Card>

        {/* Products List */}
        <Card>
          <CardHeader
            title="All Products"
            subtitle={`Sorted by revenue contribution`}
            action={
              abcData && abcData.products.length > 10 && (
                <Button
                  size="$2"
                  chromeless
                  onPress={() => setShowAllProducts(!showAllProducts)}
                >
                  <Text color="$primary" fontSize="$2">
                    {showAllProducts ? 'Show Less' : `Show All (${abcData.products.length})`}
                  </Text>
                </Button>
              )
            }
          />
          <YStack>
            {abcLoading ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                Loading products...
              </Text>
            ) : displayProducts.length === 0 ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                No product data available
              </Text>
            ) : (
              displayProducts.map((product, index) => (
                <ProductRow
                  key={product.productId}
                  rank={index + 1}
                  name={product.productName}
                  category={product.categoryName}
                  classification={product.classification}
                  revenue={product.revenue}
                  quantity={product.quantitySold}
                />
              ))
            )}
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
