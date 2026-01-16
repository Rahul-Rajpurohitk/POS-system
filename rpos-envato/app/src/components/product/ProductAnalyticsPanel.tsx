import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text, Image } from 'tamagui';
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  BarChart3, ShoppingCart, Clock, Pencil, RefreshCw, Trash2,
  Target, Box,
} from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useInventoryIntelligence, useProductPerformance } from '@/features/analytics/hooks';
import type { Product } from '@/types';
import type { ABCCategory } from '@/features/analytics/types';

// Color constants
const COLORS = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
  purple: '#8B5CF6',
  teal: '#14B8A6',
};

const ABC_COLORS = {
  A: { bg: '#DCFCE7', text: '#16A34A', label: 'Top Performer' },
  B: { bg: '#FEF3C7', text: '#D97706', label: 'Average Performer' },
  C: { bg: '#FEE2E2', text: '#DC2626', label: 'Low Performer' },
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ icon, label, value, subValue, color, trend }: MetricCardProps) {
  return (
    <YStack
      flex={1}
      backgroundColor="$cardBackground"
      borderRadius="$3"
      padding="$3"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$1"
    >
      <XStack alignItems="center" gap="$2">
        <YStack
          width={28}
          height={28}
          borderRadius={14}
          backgroundColor={`${color}20`}
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
        {trend && trend !== 'neutral' && (
          <YStack marginLeft="auto">
            {trend === 'up' ? (
              <TrendingUp size={14} color={COLORS.success} />
            ) : (
              <TrendingDown size={14} color={COLORS.error} />
            )}
          </YStack>
        )}
      </XStack>
      <Text fontSize={11} color="$colorSecondary" textTransform="uppercase" marginTop="$1">
        {label}
      </Text>
      <Text fontSize="$5" fontWeight="bold" color="$color">
        {value}
      </Text>
      {subValue ? (
        <Text fontSize={11} color="$colorSecondary">
          {subValue}
        </Text>
      ) : null}
    </YStack>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  variant?: 'default' | 'danger';
}

function QuickAction({ icon, label, onPress, color = COLORS.primary, variant = 'default' }: QuickActionProps) {
  const bgColor = variant === 'danger' ? '#FEE2E2' : `${color}15`;
  const textColor = variant === 'danger' ? COLORS.error : color;

  return (
    <XStack
      flex={1}
      backgroundColor={bgColor}
      borderRadius="$2"
      padding="$3"
      alignItems="center"
      justifyContent="center"
      gap="$2"
      cursor="pointer"
      hoverStyle={{ opacity: 0.8 }}
      pressStyle={{ transform: [{ scale: 0.97 }] }}
      onPress={onPress}
    >
      {icon}
      <Text fontSize={12} fontWeight="600" color={textColor}>
        {label}
      </Text>
    </XStack>
  );
}

interface ProductAnalyticsPanelProps {
  product: Product;
  onEdit: () => void;
  onAdjustStock: () => void;
  onDelete: () => void;
}

export function ProductAnalyticsPanel({
  product,
  onEdit,
  onAdjustStock,
  onDelete,
}: ProductAnalyticsPanelProps) {
  const { settings } = useSettingsStore();

  // Fetch real analytics data
  const { data: inventoryData } = useInventoryIntelligence();
  const { data: performanceData } = useProductPerformance({ period: 'this_month' });

  // Find this product's analytics from the fetched data
  const productInventory = useMemo(() => {
    if (!inventoryData?.products) return null;
    return inventoryData.products.find(p => p.productId === product.id);
  }, [inventoryData, product.id]);

  const productPerformance = useMemo(() => {
    if (!performanceData?.topProducts) return null;
    return performanceData.topProducts.find(p => p.productId === product.id);
  }, [performanceData, product.id]);

  // Get ABC classification for this product
  const abcClass = useMemo(() => {
    if (!performanceData?.abcClassification?.products) return 'C';
    const productABC = performanceData.abcClassification.products.find(
      (p) => p.productId === product.id
    );
    return productABC?.classification || 'C';
  }, [performanceData, product.id]);

  // Calculate metrics - use real data if available, otherwise compute from product
  const metrics = useMemo(() => {
    const stockQty = product.quantity ?? 0;
    const profit = (product.sellingPrice || 0) - (product.purchasePrice || 0);
    const profitMargin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

    // Use real data from inventory intelligence if available
    const totalSales = productPerformance?.quantitySold ?? 0;
    const revenue = productPerformance?.revenue ?? 0;
    const avgDailySales = productInventory?.avgDailySales ?? 0;
    const reorderPoint = productInventory?.reorderPoint ?? Math.ceil(stockQty * 0.25);
    const suggestedReorder = productInventory?.suggestedReorderQty ?? 100;
    const daysUntilStockout = productInventory?.daysUntilStockout ?? (avgDailySales > 0 ? Math.floor(stockQty / avgDailySales) : null);

    return {
      stockQty,
      profit,
      profitMargin,
      totalSales,
      revenue,
      avgDailySales,
      reorderPoint,
      suggestedReorder,
      daysUntilStockout,
      abcClass,
      potentialRevenue: stockQty * product.sellingPrice,
      potentialProfit: stockQty * profit,
    };
  }, [product, productInventory, productPerformance, abcClass]);

  // Get image URL
  const firstImage = product.images?.[0];
  const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage as any)?.url;
  const categoryColor = (product.category as any)?.color || '#6B7280';

  // Stock status
  const isLowStock = metrics.stockQty <= metrics.reorderPoint;
  const isCritical = metrics.stockQty <= metrics.reorderPoint / 2;
  const stockRunway = Math.min((metrics.stockQty / (metrics.reorderPoint * 2)) * 100, 100);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <YStack padding="$4" gap="$4">
        {/* Product Header */}
        <YStack
          backgroundColor="$cardBackground"
          borderRadius="$4"
          overflow="hidden"
          borderWidth={1}
          borderColor="$borderColor"
        >
          {/* Category Color Strip */}
          <YStack height={4} backgroundColor={categoryColor} />

          <YStack padding="$4" gap="$3">
            <XStack gap="$3" alignItems="flex-start">
              {/* Product Image */}
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  width={80}
                  height={80}
                  borderRadius="$3"
                  objectFit="cover"
                />
              ) : (
                <YStack
                  width={80}
                  height={80}
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Package size={32} color="$colorSecondary" />
                </YStack>
              )}

              {/* Product Info */}
              <YStack flex={1} gap="$1">
                <Text fontSize="$5" fontWeight="bold" color="$color" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text fontSize={12} color="$colorSecondary">
                  SKU: {product.sku || 'N/A'}
                </Text>
                {product.category?.name ? (
                  <XStack
                    backgroundColor={`${categoryColor}20`}
                    paddingHorizontal="$2"
                    paddingVertical={2}
                    borderRadius="$1"
                    alignSelf="flex-start"
                    marginTop="$1"
                  >
                    <Text fontSize={11} color={categoryColor} fontWeight="600">
                      {product.category.name}
                    </Text>
                  </XStack>
                ) : null}
              </YStack>

              {/* ABC Badge */}
              <YStack
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                backgroundColor={ABC_COLORS[metrics.abcClass as keyof typeof ABC_COLORS].bg}
              >
                <Text
                  fontSize={11}
                  fontWeight="bold"
                  color={ABC_COLORS[metrics.abcClass as keyof typeof ABC_COLORS].text}
                >
                  Class {metrics.abcClass}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>

        {/* Key Metrics */}
        <XStack gap="$2">
          <MetricCard
            icon={<ShoppingCart size={14} color={COLORS.primary} />}
            label="TOTAL SALES"
            value={metrics.totalSales.toString()}
            subValue="units sold"
            color={COLORS.primary}
          />
          <MetricCard
            icon={<DollarSign size={14} color={COLORS.success} />}
            label="REVENUE"
            value={formatCurrency(metrics.revenue, settings.currency)}
            subValue="lifetime"
            color={COLORS.success}
          />
        </XStack>

        <XStack gap="$2">
          <MetricCard
            icon={<BarChart3 size={14} color={COLORS.info} />}
            label="AVG DAILY"
            value={metrics.avgDailySales.toFixed(1)}
            subValue="units/day"
            color={COLORS.info}
          />
          <MetricCard
            icon={<TrendingUp size={14} color={COLORS.purple} />}
            label="MARGIN"
            value={`${metrics.profitMargin.toFixed(1)}%`}
            subValue={formatCurrency(metrics.profit, settings.currency)}
            color={COLORS.purple}
          />
        </XStack>

        {/* Stock Intelligence */}
        <YStack
          backgroundColor="$cardBackground"
          borderRadius="$3"
          padding="$3"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$3"
        >
          <XStack alignItems="center" gap="$2">
            <Box size={18} color={COLORS.primary} />
            <Text fontSize="$4" fontWeight="600" color="$color">
              Stock Intelligence
            </Text>
          </XStack>

          {/* Stock Progress Bar */}
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} color="$colorSecondary">Stock Level</Text>
              <Text fontSize={12} fontWeight="600" color={isCritical ? COLORS.error : isLowStock ? COLORS.warning : COLORS.success}>
                {metrics.stockQty} units
              </Text>
            </XStack>
            <YStack height={8} backgroundColor="$backgroundHover" borderRadius={4} overflow="hidden">
              <YStack
                height="100%"
                width={`${stockRunway}%`}
                backgroundColor={isCritical ? COLORS.error : isLowStock ? COLORS.warning : COLORS.success}
                borderRadius={4}
              />
            </YStack>
          </YStack>

          {/* Metrics Row */}
          <XStack gap="$3" flexWrap="wrap">
            <YStack flex={1} minWidth={100} gap="$1">
              <Text fontSize={11} color="$colorSecondary">Avg Daily Sales</Text>
              <XStack alignItems="center" gap="$1">
                <ShoppingCart size={14} color={COLORS.info} />
                <Text fontSize="$3" fontWeight="600" color="$color">
                  {metrics.avgDailySales.toFixed(1)} units
                </Text>
              </XStack>
            </YStack>

            <YStack flex={1} minWidth={100} gap="$1">
              <Text fontSize={11} color="$colorSecondary">Days Until Stockout</Text>
              <XStack alignItems="center" gap="$1">
                <Clock size={14} color={isCritical ? COLORS.error : isLowStock ? COLORS.warning : COLORS.teal} />
                <Text fontSize="$3" fontWeight="600" color={isCritical ? COLORS.error : isLowStock ? COLORS.warning : '$color'}>
                  {metrics.daysUntilStockout !== null ? `~${metrics.daysUntilStockout} days` : 'N/A'}
                </Text>
              </XStack>
            </YStack>

            <YStack flex={1} minWidth={100} gap="$1">
              <Text fontSize={11} color="$colorSecondary">Reorder Point</Text>
              <XStack alignItems="center" gap="$1">
                <Target size={14} color={COLORS.warning} />
                <Text fontSize="$3" fontWeight="600" color="$color">
                  {metrics.reorderPoint} units
                </Text>
              </XStack>
            </YStack>

            <YStack flex={1} minWidth={100} gap="$1">
              <Text fontSize={11} color="$colorSecondary">Suggested Reorder</Text>
              <XStack alignItems="center" gap="$1">
                <RefreshCw size={14} color={COLORS.teal} />
                <Text fontSize="$3" fontWeight="600" color="$color">
                  {metrics.suggestedReorder} units
                </Text>
              </XStack>
            </YStack>
          </XStack>

          {/* Warning Banner */}
          {isLowStock ? (
            <XStack
              backgroundColor={isCritical ? '#FEE2E2' : '#FEF3C7'}
              padding="$2"
              borderRadius="$2"
              alignItems="center"
              gap="$2"
            >
              <AlertTriangle size={16} color={isCritical ? COLORS.error : COLORS.warning} />
              <Text fontSize={12} color={isCritical ? COLORS.error : COLORS.warning} flex={1}>
                {isCritical
                  ? 'Critical: Stock critically low! Reorder immediately.'
                  : 'Warning: Stock below reorder point. Consider restocking.'}
              </Text>
            </XStack>
          ) : null}
        </YStack>

        {/* Profit Analysis */}
        <YStack
          backgroundColor="$cardBackground"
          borderRadius="$3"
          padding="$3"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$3"
        >
          <XStack alignItems="center" gap="$2">
            <DollarSign size={18} color={COLORS.success} />
            <Text fontSize="$4" fontWeight="600" color="$color">
              Profit Analysis
            </Text>
          </XStack>

          <YStack gap="$2">
            <XStack justifyContent="space-between">
              <Text fontSize={12} color="$colorSecondary">Selling Price</Text>
              <Text fontSize={12} fontWeight="600" color="$color">
                {formatCurrency(product.sellingPrice, settings.currency)}
              </Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text fontSize={12} color="$colorSecondary">Purchase Cost</Text>
              <Text fontSize={12} fontWeight="600" color="$color">
                -{formatCurrency(product.purchasePrice, settings.currency)}
              </Text>
            </XStack>
            <YStack height={1} backgroundColor="$borderColor" marginVertical="$1" />
            <XStack justifyContent="space-between">
              <Text fontSize={12} fontWeight="600" color={COLORS.success}>Gross Profit</Text>
              <Text fontSize={12} fontWeight="bold" color={COLORS.success}>
                {formatCurrency(metrics.profit, settings.currency)} ({metrics.profitMargin.toFixed(1)}%)
              </Text>
            </XStack>
          </YStack>

          <XStack gap="$2" marginTop="$2">
            <YStack
              flex={1}
              backgroundColor="$backgroundHover"
              padding="$2"
              borderRadius="$2"
              gap="$1"
            >
              <Text fontSize={10} color="$colorSecondary" numberOfLines={1}>Potential Revenue</Text>
              <Text fontSize="$3" fontWeight="bold" color="$color" numberOfLines={1}>
                {formatCurrency(metrics.potentialRevenue, settings.currency)}
              </Text>
              <Text fontSize={9} color="$colorSecondary">at current stock</Text>
            </YStack>
            <YStack
              flex={1}
              backgroundColor="#ECFDF5"
              padding="$2"
              borderRadius="$2"
              gap="$1"
            >
              <Text fontSize={10} color={COLORS.success} numberOfLines={1}>Potential Profit</Text>
              <Text fontSize="$3" fontWeight="bold" color={COLORS.success} numberOfLines={1}>
                {formatCurrency(metrics.potentialProfit, settings.currency)}
              </Text>
              <Text fontSize={9} color={COLORS.success}>at current stock</Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Quick Actions */}
        <YStack
          backgroundColor="$cardBackground"
          borderRadius="$3"
          padding="$3"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$3"
        >
          <Text fontSize="$3" fontWeight="600" color="$colorSecondary" textTransform="uppercase">
            QUICK ACTIONS
          </Text>

          <XStack gap="$2">
            <QuickAction
              icon={<Pencil size={16} color={COLORS.primary} />}
              label="Edit"
              onPress={onEdit}
              color={COLORS.primary}
            />
            <QuickAction
              icon={<RefreshCw size={16} color={COLORS.teal} />}
              label="Adjust Stock"
              onPress={onAdjustStock}
              color={COLORS.teal}
            />
          </XStack>

          <QuickAction
            icon={<Trash2 size={16} color={COLORS.error} />}
            label="Delete"
            onPress={onDelete}
            variant="danger"
          />
        </YStack>
      </YStack>
    </ScrollView>
  );
}

export default ProductAnalyticsPanel;
