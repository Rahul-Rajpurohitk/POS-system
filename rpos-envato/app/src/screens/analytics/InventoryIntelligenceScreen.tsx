import React, { useState, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { YStack, XStack, Text, ScrollView, Button } from 'tamagui';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  XCircle,
} from '@tamagui/lucide-icons';
import { Card, CardHeader } from '@/components/ui';
import { PieChart, HorizontalBarChart } from '@/components/charts';
import { useInventoryIntelligence } from '@/features/analytics';
import { useSettingsStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { MoreScreenProps } from '@/navigation/types';
import type { InventoryTrend, InventoryIntelligence } from '@/features/analytics/types';

// Trend colors and labels
const TREND_CONFIG: Record<InventoryTrend, { color: string; label: string; icon: React.ReactNode }> = {
  fast_moving: { color: '#4ade80', label: 'Fast Moving', icon: <TrendingUp size={16} color="white" /> },
  normal: { color: '#3b82f6', label: 'Normal', icon: <CheckCircle size={16} color="white" /> },
  slow_moving: { color: '#f59e0b', label: 'Slow Moving', icon: <TrendingDown size={16} color="white" /> },
  dead_stock: { color: '#ef4444', label: 'Dead Stock', icon: <XCircle size={16} color="white" /> },
};

// Alert Card component
function AlertCard({
  title,
  count,
  color,
  icon,
  onPress,
}: {
  title: string;
  count: number;
  color: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Card flex={1} minWidth={140} pressable={!!onPress} onPress={onPress}>
      <YStack gap="$2" alignItems="center">
        <YStack
          width={48}
          height={48}
          borderRadius="$full"
          backgroundColor={color}
          justifyContent="center"
          alignItems="center"
        >
          {icon}
        </YStack>
        <Text fontSize="$6" fontWeight="bold" color="$color">
          {count}
        </Text>
        <Text fontSize="$2" color="$colorSecondary" textAlign="center">
          {title}
        </Text>
      </YStack>
    </Card>
  );
}

// Product Row component
function ProductRow({
  product,
  onPress,
}: {
  product: InventoryIntelligence;
  onPress?: () => void;
}) {
  const { settings } = useSettingsStore();
  const trendConfig = TREND_CONFIG[product.salesVelocity];

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
      <YStack flex={1}>
        <XStack alignItems="center" gap="$2">
          <Text fontWeight="600" numberOfLines={1} flex={1}>
            {product.productName}
          </Text>
          {product.needsReorder && (
            <YStack backgroundColor="$error" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$2">
              <Text fontSize="$1" color="white" fontWeight="600">
                REORDER
              </Text>
            </YStack>
          )}
        </XStack>
        <Text fontSize="$2" color="$colorSecondary" numberOfLines={1}>
          SKU: {product.sku} • {product.categoryName || 'Uncategorized'}
        </Text>
      </YStack>
      <YStack alignItems="flex-end" gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text fontWeight="bold" color="$color">
            {product.availableStock}
          </Text>
          <Text fontSize="$2" color="$colorSecondary">
            in stock
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <YStack
            width={8}
            height={8}
            borderRadius="$full"
            backgroundColor={trendConfig.color}
          />
          <Text fontSize="$2" color={trendConfig.color}>
            {trendConfig.label}
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );
}

// Reorder Alert Row
function ReorderAlertRow({
  product,
}: {
  product: InventoryIntelligence;
}) {
  const { settings } = useSettingsStore();

  return (
    <XStack
      backgroundColor="$errorBackground"
      padding="$3"
      borderRadius="$3"
      alignItems="center"
      gap="$3"
    >
      <YStack
        backgroundColor="$error"
        padding="$2"
        borderRadius="$full"
      >
        <AlertTriangle size={16} color="white" />
      </YStack>
      <YStack flex={1}>
        <Text fontWeight="600" numberOfLines={1}>
          {product.productName}
        </Text>
        <Text fontSize="$2" color="$colorSecondary">
          {product.daysUntilStockout !== null
            ? `${product.daysUntilStockout} days until stockout`
            : 'Low stock alert'}
        </Text>
      </YStack>
      <YStack alignItems="flex-end">
        <Text fontSize="$2" color="$colorSecondary">
          Suggest order
        </Text>
        <Text fontWeight="bold" color="$error">
          {product.suggestedReorderQty} units
        </Text>
      </YStack>
    </XStack>
  );
}

type FilterType = 'all' | 'reorder' | 'fast' | 'slow' | 'dead';

export default function InventoryIntelligenceScreen({
  navigation,
}: MoreScreenProps<'InventoryIntelligence'>) {
  const { settings } = useSettingsStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const {
    data: inventoryData,
    isLoading,
    error,
    refetch,
  } = useInventoryIntelligence();

  // Prepare velocity distribution for pie chart
  const velocityPieData = useMemo(() => {
    if (!inventoryData?.products) return [];

    const counts: Record<InventoryTrend, number> = {
      fast_moving: 0,
      normal: 0,
      slow_moving: 0,
      dead_stock: 0,
    };

    inventoryData.products.forEach((p) => {
      counts[p.salesVelocity]++;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([trend, count]) => ({
        name: TREND_CONFIG[trend as InventoryTrend].label,
        value: count,
        color: TREND_CONFIG[trend as InventoryTrend].color,
      }));
  }, [inventoryData?.products]);

  // Products needing reorder
  const reorderProducts = useMemo(() => {
    if (!inventoryData?.products) return [];
    return inventoryData.products.filter((p) => p.needsReorder);
  }, [inventoryData?.products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!inventoryData?.products) return [];

    switch (filter) {
      case 'reorder':
        return inventoryData.products.filter((p) => p.needsReorder);
      case 'fast':
        return inventoryData.products.filter((p) => p.salesVelocity === 'fast_moving');
      case 'slow':
        return inventoryData.products.filter((p) => p.salesVelocity === 'slow_moving');
      case 'dead':
        return inventoryData.products.filter((p) => p.salesVelocity === 'dead_stock');
      default:
        return inventoryData.products;
    }
  }, [inventoryData?.products, filter]);

  // Top stock value products
  const topStockValueData = useMemo(() => {
    if (!inventoryData?.products) return [];
    return [...inventoryData.products]
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 5)
      .map((p) => ({
        label: p.productName.length > 15 ? p.productName.slice(0, 15) + '...' : p.productName,
        value: p.stockValue,
      }));
  }, [inventoryData?.products]);

  return (
    <ScrollView
      flex={1}
      backgroundColor="$background"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <YStack padding="$4" gap="$4">
        {/* Summary Stats */}
        <Card>
          <CardHeader
            title="Inventory Overview"
            subtitle="Real-time stock intelligence"
          />
          <YStack gap="$3">
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Total Products</Text>
              <Text fontWeight="bold">{inventoryData?.totalProducts || 0}</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Total Stock Value</Text>
              <Text fontWeight="bold">
                {formatCurrency(inventoryData?.totalStockValue || 0, settings.currency)}
              </Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">Avg Turnover Rate</Text>
              <Text fontWeight="bold">
                {(inventoryData?.averageTurnoverRate || 0).toFixed(1)}x
              </Text>
            </XStack>
          </YStack>
        </Card>

        {/* Alert Cards */}
        <XStack flexWrap="wrap" gap="$3">
          <AlertCard
            title="Out of Stock"
            count={inventoryData?.alerts.outOfStock || 0}
            color="#ef4444"
            icon={<XCircle size={24} color="white" />}
            onPress={() => setFilter('reorder')}
          />
          <AlertCard
            title="Low Stock"
            count={inventoryData?.alerts.lowStock || 0}
            color="#f59e0b"
            icon={<AlertTriangle size={24} color="white" />}
            onPress={() => setFilter('reorder')}
          />
          <AlertCard
            title="Overstocked"
            count={inventoryData?.alerts.overstocked || 0}
            color="#3b82f6"
            icon={<Package size={24} color="white" />}
            onPress={() => setFilter('slow')}
          />
          <AlertCard
            title="Dead Stock"
            count={inventoryData?.alerts.deadStock || 0}
            color="#6b7280"
            icon={<Clock size={24} color="white" />}
            onPress={() => setFilter('dead')}
          />
        </XStack>

        {/* Reorder Alerts */}
        {reorderProducts.length > 0 && (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600" color="$error">
              Reorder Alerts ({reorderProducts.length})
            </Text>
            {reorderProducts.slice(0, 5).map((product) => (
              <ReorderAlertRow key={product.productId} product={product} />
            ))}
            {reorderProducts.length > 5 && (
              <Button
                size="$3"
                chromeless
                onPress={() => setFilter('reorder')}
              >
                <Text color="$primary">
                  View all {reorderProducts.length} items
                </Text>
              </Button>
            )}
          </YStack>
        )}

        {/* Velocity Distribution */}
        <PieChart
          title="Sales Velocity Distribution"
          subtitle="Products by movement speed"
          data={velocityPieData}
          isLoading={isLoading}
          error={error}
          height={200}
          showPercentages
        />

        {/* Top Stock Value */}
        <HorizontalBarChart
          title="Highest Stock Value"
          subtitle="Top 5 products by inventory value"
          data={topStockValueData}
          isLoading={isLoading}
          error={error}
          formatValue={(v) => formatCurrency(v, settings.currency)}
        />

        {/* Product List with Filter */}
        <Card>
          <CardHeader
            title="Product Inventory"
            subtitle={`${filteredProducts.length} products`}
          />
          <XStack gap="$2" flexWrap="wrap" marginBottom="$3">
            {(['all', 'reorder', 'fast', 'slow', 'dead'] as FilterType[]).map((f) => (
              <Button
                key={f}
                size="$2"
                backgroundColor={filter === f ? '$primary' : '$backgroundPress'}
                color={filter === f ? 'white' : '$color'}
                onPress={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'reorder' ? 'Reorder' : f === 'fast' ? 'Fast' : f === 'slow' ? 'Slow' : 'Dead'}
              </Button>
            ))}
          </XStack>
          <YStack>
            {isLoading ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                Loading inventory...
              </Text>
            ) : filteredProducts.length === 0 ? (
              <Text color="$colorSecondary" padding="$4" textAlign="center">
                No products found
              </Text>
            ) : (
              filteredProducts.slice(0, 20).map((product) => (
                <ProductRow
                  key={product.productId}
                  product={product}
                  onPress={() =>
                    navigation.navigate('Products', {
                      screen: 'ProductDetail',
                      params: { id: product.productId },
                    } as any)
                  }
                />
              ))
            )}
            {filteredProducts.length > 20 && (
              <Text color="$colorSecondary" padding="$3" textAlign="center" fontSize="$2">
                Showing 20 of {filteredProducts.length} products
              </Text>
            )}
          </YStack>
        </Card>

        {/* Velocity Legend */}
        <Card>
          <CardHeader title="Understanding Sales Velocity" />
          <YStack gap="$3">
            {Object.entries(TREND_CONFIG).map(([key, config]) => (
              <XStack key={key} alignItems="center" gap="$3">
                <YStack
                  width={32}
                  height={32}
                  borderRadius="$full"
                  backgroundColor={config.color}
                  justifyContent="center"
                  alignItems="center"
                >
                  {config.icon}
                </YStack>
                <YStack flex={1}>
                  <Text fontWeight="600">{config.label}</Text>
                  <Text fontSize="$2" color="$colorSecondary">
                    {key === 'fast_moving'
                      ? 'High demand, sells quickly'
                      : key === 'normal'
                      ? 'Steady, predictable sales'
                      : key === 'slow_moving'
                      ? 'Low demand, consider promotion'
                      : 'No sales, consider clearance'}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
