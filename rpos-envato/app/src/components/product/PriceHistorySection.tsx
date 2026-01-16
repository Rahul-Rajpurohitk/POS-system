import React from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Clock, User,
} from '@tamagui/lucide-icons';
import type { Product } from '@/types';
import {
  useMarginTrend,
  useCostTrend,
  useRecentPriceChanges,
  type PriceHistory,
  type PriceChangeType,
} from '@/features/pricing';

/**
 * PriceHistorySection Component
 *
 * Displays price history, margin trends, and cost trends for a product.
 * Helps store owners track pricing changes and margin erosion.
 */

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  dark: '#111827',
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Unknown';
  }
};

const formatPrice = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  return `$${Number(amount).toFixed(2)}`;
};

const formatPercent = (percent: number | null | undefined) => {
  if (percent === null || percent === undefined || isNaN(percent)) return '0.0%';
  return `${Number(percent).toFixed(1)}%`;
};

const getPriceTypeLabel = (type: PriceChangeType): string => {
  const labels: Record<PriceChangeType, string> = {
    selling_price: 'Selling Price',
    purchase_price: 'Purchase Price',
    case_selling_price: 'Case Selling Price',
    case_purchase_price: 'Case Purchase Price',
    pack_selling_price: 'Pack Selling Price',
    pack_purchase_price: 'Pack Purchase Price',
  };
  return labels[type] || type;
};

const getReasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    manual: 'Manual Change',
    supplier_update: 'Supplier Update',
    promotion: 'Promotion',
    cost_increase: 'Cost Increase',
    cost_decrease: 'Cost Decrease',
    margin_adjustment: 'Margin Adjustment',
    market_rate: 'Market Rate',
    bulk_update: 'Bulk Update',
    import: 'Import',
    initial: 'Initial Price',
  };
  return labels[reason] || reason;
};

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  value: number;
  isGoodWhenUp?: boolean;
}

function TrendIndicator({ trend, value, isGoodWhenUp = true }: TrendIndicatorProps) {
  // Safety checks
  const safeValue = Number(value) || 0;
  const safeTrend = trend || 'stable';

  const isPositive = (safeTrend === 'up' && isGoodWhenUp) || (safeTrend === 'down' && !isGoodWhenUp);

  if (safeTrend === 'stable') {
    return (
      <XStack alignItems="center" gap="$1">
        <Minus size={14} color={COLORS.gray} />
        <Text fontSize={12} color={COLORS.gray} fontWeight="500">
          Stable
        </Text>
      </XStack>
    );
  }

  const Icon = safeTrend === 'up' ? ArrowUpRight : ArrowDownRight;
  const color = isPositive ? COLORS.success : COLORS.error;

  return (
    <XStack alignItems="center" gap="$1">
      <Icon size={14} color={color} />
      <Text fontSize={12} color={color} fontWeight="600">
        {safeValue > 0 ? '+' : ''}{formatPercent(safeValue)}
      </Text>
    </XStack>
  );
}

interface PriceHistorySectionProps {
  product: Product;
  compact?: boolean;
}

export function PriceHistorySection({ product, compact = false }: PriceHistorySectionProps) {
  const {
    data: marginTrend,
    isLoading: marginLoading,
    error: marginError,
  } = useMarginTrend(product?.id, 90);

  const {
    data: costTrend,
    isLoading: costLoading,
    error: costError,
  } = useCostTrend(product?.id, 90);

  const {
    data: recentChanges,
    isLoading: changesLoading,
    error: changesError,
  } = useRecentPriceChanges(product?.id, 5);

  const isLoading = marginLoading || costLoading || changesLoading;
  const hasError = marginError || costError || changesError;

  // If product is not available, show loading state
  if (!product?.id) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center" minHeight={200}>
        <Spinner size="small" color={COLORS.primary} />
        <Text fontSize={12} color={COLORS.gray} marginTop="$2">
          Loading product data...
        </Text>
      </YStack>
    );
  }

  // Calculate current margin from product prices (with safety checks)
  const sellingPrice = Number(product.sellingPrice) || 0;
  const purchasePrice = Number(product.purchasePrice) || 0;
  const currentMargin = sellingPrice > 0
    ? ((sellingPrice - purchasePrice) / sellingPrice) * 100
    : 0;

  if (compact) {
    if (isLoading) {
      return (
        <YStack padding="$2" alignItems="center">
          <Spinner size="small" color={COLORS.primary} />
        </YStack>
      );
    }

    return (
      <YStack gap="$2">
        {/* Compact Margin Display */}
        <XStack
          backgroundColor={currentMargin >= 20 ? COLORS.successLight : COLORS.warningLight}
          padding="$2"
          borderRadius={8}
          alignItems="center"
          gap="$2"
        >
          <DollarSign size={14} color={currentMargin >= 20 ? COLORS.success : COLORS.warning} />
          <YStack flex={1}>
            <Text fontSize={11} color={currentMargin >= 20 ? COLORS.success : COLORS.warning} fontWeight="600">
              Margin: {formatPercent(currentMargin)}
            </Text>
            {marginTrend && (
              <TrendIndicator trend={marginTrend.trend} value={marginTrend.marginChange} isGoodWhenUp={true} />
            )}
          </YStack>
        </XStack>
      </YStack>
    );
  }

  // Full view: Loading state
  if (isLoading) {
    return (
      <YStack gap="$4">
        {/* Section Header */}
        <XStack alignItems="center" gap="$2">
          <YStack
            width={32}
            height={32}
            borderRadius={8}
            backgroundColor={COLORS.primaryLight}
            alignItems="center"
            justifyContent="center"
          >
            <TrendingUp size={16} color={COLORS.primary} />
          </YStack>
          <YStack>
            <Text fontSize={14} fontWeight="700" color={COLORS.dark}>
              Price History
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Margin & cost trends over time
            </Text>
          </YStack>
        </XStack>

        {/* Loading State */}
        <YStack
          backgroundColor={COLORS.white}
          borderRadius={12}
          padding="$6"
          alignItems="center"
          justifyContent="center"
          minHeight={200}
        >
          <Spinner size="small" color={COLORS.primary} />
          <Text fontSize={12} color={COLORS.gray} marginTop="$3">
            Loading price history...
          </Text>
        </YStack>
      </YStack>
    );
  }

  // Full view: Error state
  if (hasError) {
    return (
      <YStack gap="$4">
        {/* Section Header */}
        <XStack alignItems="center" gap="$2">
          <YStack
            width={32}
            height={32}
            borderRadius={8}
            backgroundColor={COLORS.primaryLight}
            alignItems="center"
            justifyContent="center"
          >
            <TrendingUp size={16} color={COLORS.primary} />
          </YStack>
          <YStack>
            <Text fontSize={14} fontWeight="700" color={COLORS.dark}>
              Price History
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Margin & cost trends over time
            </Text>
          </YStack>
        </XStack>

        {/* Error State with current pricing info */}
        <YStack
          backgroundColor={COLORS.warningLight}
          borderRadius={12}
          padding="$4"
          alignItems="center"
          gap="$3"
        >
          <AlertTriangle size={24} color={COLORS.warning} />
          <Text fontSize={12} color="#92400E" textAlign="center">
            Unable to load price history data
          </Text>
          <Text fontSize={11} color={COLORS.gray} textAlign="center">
            Current pricing information is shown below
          </Text>
        </YStack>

        {/* Show current pricing even if history fails */}
        <XStack gap="$3" flexWrap="wrap">
          {/* Current Margin Card */}
          <YStack
            flex={1}
            minWidth={160}
            backgroundColor={
              currentMargin >= 30 ? COLORS.successLight :
              currentMargin >= 15 ? COLORS.warningLight :
              COLORS.errorLight
            }
            padding="$3"
            borderRadius={12}
            gap="$2"
          >
            <XStack alignItems="center" gap="$1">
              <DollarSign
                size={14}
                color={
                  currentMargin >= 30 ? COLORS.success :
                  currentMargin >= 15 ? COLORS.warning :
                  COLORS.error
                }
              />
              <Text
                fontSize={11}
                fontWeight="600"
                color={
                  currentMargin >= 30 ? COLORS.success :
                  currentMargin >= 15 ? COLORS.warning :
                  COLORS.error
                }
              >
                Current Margin
              </Text>
            </XStack>
            <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
              {formatPercent(currentMargin)}
            </Text>
          </YStack>

          {/* Current Cost Card */}
          <YStack
            flex={1}
            minWidth={160}
            backgroundColor={COLORS.grayLight}
            padding="$3"
            borderRadius={12}
            gap="$2"
          >
            <XStack alignItems="center" gap="$1">
              <TrendingUp size={14} color={COLORS.gray} />
              <Text fontSize={11} color={COLORS.gray} fontWeight="600">
                Current Cost
              </Text>
            </XStack>
            <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
              {formatPrice(purchasePrice)}
            </Text>
          </YStack>

          {/* Selling Price Card */}
          <YStack
            flex={1}
            minWidth={160}
            backgroundColor={COLORS.successLight}
            padding="$3"
            borderRadius={12}
            gap="$2"
          >
            <XStack alignItems="center" gap="$1">
              <DollarSign size={14} color={COLORS.success} />
              <Text fontSize={11} color={COLORS.success} fontWeight="600">
                Selling Price
              </Text>
            </XStack>
            <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
              {formatPrice(sellingPrice)}
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Profit: {formatPrice(sellingPrice - purchasePrice)}/unit
            </Text>
          </YStack>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack gap="$4">
      {/* Section Header */}
      <XStack alignItems="center" gap="$2">
        <YStack
          width={32}
          height={32}
          borderRadius={8}
          backgroundColor={COLORS.primaryLight}
          alignItems="center"
          justifyContent="center"
        >
          <TrendingUp size={16} color={COLORS.primary} />
        </YStack>
        <YStack>
          <Text fontSize={14} fontWeight="700" color={COLORS.dark}>
            Price History
          </Text>
          <Text fontSize={11} color={COLORS.gray}>
            Margin & cost trends over time
          </Text>
        </YStack>
      </XStack>

      {/* Margin & Cost Cards */}
      <XStack gap="$3" flexWrap="wrap">
        {/* Current Margin Card */}
        <YStack
          flex={1}
          minWidth={160}
          backgroundColor={
            currentMargin >= 30 ? COLORS.successLight :
            currentMargin >= 15 ? COLORS.warningLight :
            COLORS.errorLight
          }
          padding="$3"
          borderRadius={12}
          gap="$2"
        >
          <XStack alignItems="center" gap="$1">
            <DollarSign
              size={14}
              color={
                currentMargin >= 30 ? COLORS.success :
                currentMargin >= 15 ? COLORS.warning :
                COLORS.error
              }
            />
            <Text
              fontSize={11}
              fontWeight="600"
              color={
                currentMargin >= 30 ? COLORS.success :
                currentMargin >= 15 ? COLORS.warning :
                COLORS.error
              }
            >
              Current Margin
            </Text>
          </XStack>
          <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
            {formatPercent(currentMargin)}
          </Text>
          {marginTrend && (
            <TrendIndicator trend={marginTrend.trend} value={marginTrend.marginChange} isGoodWhenUp={true} />
          )}
        </YStack>

        {/* Current Cost Card */}
        <YStack
          flex={1}
          minWidth={160}
          backgroundColor={COLORS.grayLight}
          padding="$3"
          borderRadius={12}
          gap="$2"
        >
          <XStack alignItems="center" gap="$1">
            <TrendingUp size={14} color={COLORS.gray} />
            <Text fontSize={11} color={COLORS.gray} fontWeight="600">
              Current Cost
            </Text>
          </XStack>
          <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
            {formatPrice(purchasePrice)}
          </Text>
          {costTrend && (
            <TrendIndicator
              trend={costTrend.trend}
              value={costTrend.totalIncrease > 0 && costTrend.avgCost > 0
                ? (costTrend.totalIncrease / costTrend.avgCost) * 100
                : 0
              }
              isGoodWhenUp={false}
            />
          )}
        </YStack>

        {/* Selling Price Card */}
        <YStack
          flex={1}
          minWidth={160}
          backgroundColor={COLORS.successLight}
          padding="$3"
          borderRadius={12}
          gap="$2"
        >
          <XStack alignItems="center" gap="$1">
            <DollarSign size={14} color={COLORS.success} />
            <Text fontSize={11} color={COLORS.success} fontWeight="600">
              Selling Price
            </Text>
          </XStack>
          <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
            {formatPrice(sellingPrice)}
          </Text>
          <Text fontSize={11} color={COLORS.gray}>
            Profit: {formatPrice(sellingPrice - purchasePrice)}/unit
          </Text>
        </YStack>
      </XStack>

      {/* Margin Stats */}
      {marginTrend && (
        <YStack
          backgroundColor={COLORS.white}
          borderRadius={12}
          borderWidth={1}
          borderColor={COLORS.border}
          padding="$3"
        >
          <Text fontSize={12} fontWeight="600" color={COLORS.dark} marginBottom="$2">
            90-Day Margin Analysis
          </Text>
          <XStack gap="$4" flexWrap="wrap">
            <YStack>
              <Text fontSize={10} color={COLORS.gray}>Average</Text>
              <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
                {formatPercent(marginTrend.avgMargin)}
              </Text>
            </YStack>
            <YStack>
              <Text fontSize={10} color={COLORS.gray}>Min</Text>
              <Text fontSize={15} fontWeight="700" color={COLORS.error}>
                {formatPercent(marginTrend.minMargin)}
              </Text>
            </YStack>
            <YStack>
              <Text fontSize={10} color={COLORS.gray}>Max</Text>
              <Text fontSize={15} fontWeight="700" color={COLORS.success}>
                {formatPercent(marginTrend.maxMargin)}
              </Text>
            </YStack>
            <YStack>
              <Text fontSize={10} color={COLORS.gray}>Trend</Text>
              <XStack alignItems="center" gap="$1">
                {(marginTrend.trend || 'stable') === 'up' ? (
                  <TrendingUp size={14} color={COLORS.success} />
                ) : (marginTrend.trend || 'stable') === 'down' ? (
                  <TrendingDown size={14} color={COLORS.error} />
                ) : (
                  <Minus size={14} color={COLORS.gray} />
                )}
                <Text fontSize={15} fontWeight="700" color={
                  (marginTrend.trend || 'stable') === 'up' ? COLORS.success :
                  (marginTrend.trend || 'stable') === 'down' ? COLORS.error :
                  COLORS.gray
                }>
                  {((marginTrend.trend || 'stable').charAt(0).toUpperCase() + (marginTrend.trend || 'stable').slice(1))}
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </YStack>
      )}

      {/* Recent Price Changes */}
      <YStack gap="$2">
        <Text fontSize={12} fontWeight="600" color={COLORS.dark}>
          Recent Price Changes
        </Text>

        <YStack
          backgroundColor={COLORS.white}
          borderRadius={12}
          borderWidth={1}
          borderColor={COLORS.border}
          overflow="hidden"
        >
          {isLoading ? (
            <YStack padding="$4" alignItems="center">
              <Spinner size="small" color={COLORS.primary} />
              <Text fontSize={11} color={COLORS.gray} marginTop="$2">
                Loading history...
              </Text>
            </YStack>
          ) : hasError ? (
            <YStack padding="$4" alignItems="center">
              <AlertTriangle size={24} color={COLORS.warning} />
              <Text fontSize={12} color={COLORS.gray} marginTop="$2">
                Unable to load price history
              </Text>
            </YStack>
          ) : !recentChanges?.changes || recentChanges.changes.length === 0 ? (
            <YStack padding="$4" alignItems="center">
              <DollarSign size={24} color={COLORS.gray} />
              <Text fontSize={12} color={COLORS.gray} marginTop="$2">
                No price changes recorded yet
              </Text>
            </YStack>
          ) : (
            recentChanges.changes.map((change, index) => {
              const priceChange = Number(change.priceChange) || 0;
              return (
                <XStack
                  key={change.id || `change-${index}`}
                  padding="$3"
                  alignItems="center"
                  gap="$3"
                  borderBottomWidth={index < recentChanges.changes.length - 1 ? 1 : 0}
                  borderBottomColor={COLORS.border}
                >
                  <YStack
                    width={32}
                    height={32}
                    borderRadius={8}
                    backgroundColor={
                      priceChange > 0 ? COLORS.errorLight : COLORS.successLight
                    }
                    alignItems="center"
                    justifyContent="center"
                  >
                    {priceChange > 0 ? (
                      <ArrowUpRight size={14} color={COLORS.error} />
                    ) : (
                      <ArrowDownRight size={14} color={COLORS.success} />
                    )}
                  </YStack>

                  <YStack flex={1}>
                    <Text fontSize={12} fontWeight="600" color={COLORS.dark}>
                      {getPriceTypeLabel(change.priceType)}
                    </Text>
                    <XStack alignItems="center" gap="$2">
                      <XStack alignItems="center" gap="$1">
                        <Clock size={10} color={COLORS.gray} />
                        <Text fontSize={10} color={COLORS.gray}>
                          {formatDate(change.createdAt)}
                        </Text>
                      </XStack>
                      <Text fontSize={10} color={COLORS.gray}>
                        {getReasonLabel(change.reason || 'manual')}
                      </Text>
                    </XStack>
                  </YStack>

                  <YStack alignItems="flex-end">
                    <Text
                      fontSize={14}
                      fontWeight="700"
                      color={priceChange > 0 ? COLORS.error : COLORS.success}
                    >
                      {priceChange > 0 ? '+' : ''}{formatPrice(priceChange)}
                    </Text>
                    <Text fontSize={10} color={COLORS.gray}>
                      {formatPrice(change.oldPrice)} → {formatPrice(change.newPrice)}
                    </Text>
                  </YStack>
                </XStack>
              );
            })
          )}
        </YStack>
      </YStack>

      {/* Cost Trend Summary */}
      {costTrend && ((Number(costTrend.totalIncrease) || 0) > 0 || (Number(costTrend.totalDecrease) || 0) > 0) && (
        <YStack
          backgroundColor={COLORS.warningLight}
          padding="$3"
          borderRadius={12}
          gap="$2"
        >
          <XStack alignItems="center" gap="$1">
            <AlertTriangle size={14} color={COLORS.warning} />
            <Text fontSize={11} fontWeight="600" color="#92400E">
              90-Day Cost Summary
            </Text>
          </XStack>
          <XStack gap="$4">
            {(Number(costTrend.totalIncrease) || 0) > 0 && (
              <YStack>
                <Text fontSize={10} color={COLORS.gray}>Total Increases</Text>
                <Text fontSize={15} fontWeight="700" color={COLORS.error}>
                  +{formatPrice(costTrend.totalIncrease)}
                </Text>
              </YStack>
            )}
            {(Number(costTrend.totalDecrease) || 0) > 0 && (
              <YStack>
                <Text fontSize={10} color={COLORS.gray}>Total Decreases</Text>
                <Text fontSize={15} fontWeight="700" color={COLORS.success}>
                  -{formatPrice(costTrend.totalDecrease)}
                </Text>
              </YStack>
            )}
            <YStack>
              <Text fontSize={10} color={COLORS.gray}>Net Change</Text>
              <Text
                fontSize={15}
                fontWeight="700"
                color={(Number(costTrend.totalIncrease) || 0) > (Number(costTrend.totalDecrease) || 0) ? COLORS.error : COLORS.success}
              >
                {(Number(costTrend.totalIncrease) || 0) > (Number(costTrend.totalDecrease) || 0) ? '+' : '-'}
                {formatPrice(Math.abs((Number(costTrend.totalIncrease) || 0) - (Number(costTrend.totalDecrease) || 0)))}
              </Text>
            </YStack>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}

export default PriceHistorySection;
