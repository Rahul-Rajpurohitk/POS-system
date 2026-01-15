import React from 'react';
import { YStack, XStack, Text, Image, styled, GetProps } from 'tamagui';
import { Package, AlertTriangle, TrendingUp } from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import type { Product } from '@/types';

// Stock status colors
const STOCK_COLORS = {
  inStock: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  lowStock: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  outOfStock: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
};

const ProductCard = styled(YStack, {
  name: 'ProductCard',
  backgroundColor: '$cardBackground',
  borderRadius: '$4',
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '$borderColor',
  cursor: 'pointer',
  position: 'relative',

  // Enhanced shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,

  hoverStyle: {
    borderColor: '$primary',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    transform: [{ translateY: -4 }],
  },

  pressStyle: {
    transform: [{ scale: 0.98 }],
    borderColor: '$primary',
  },

  variants: {
    size: {
      xs: {
        width: 100,
        borderRadius: '$2',
      },
      sm: {
        width: 120,
        borderRadius: '$3',
      },
      md: {
        width: 155,
        borderRadius: '$4',
      },
      lg: {
        width: 185,
        borderRadius: '$4',
      },
      compact: {
        width: '100%',
        flexDirection: 'row',
        borderRadius: '$3',
        height: 80,
      },
      grid: {
        width: '100%',
        borderRadius: '$3',
        minHeight: 140,
      },
    },
    selected: {
      true: {
        borderColor: '$primary',
        borderWidth: 2,
        backgroundColor: '$backgroundHover',
      },
    },
    outOfStock: {
      true: {
        opacity: 0.6,
        cursor: 'not-allowed',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const ImageContainer = styled(YStack, {
  name: 'ImageContainer',
  width: '100%',
  backgroundColor: '$backgroundHover',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',

  variants: {
    size: {
      xs: {
        height: 60,
      },
      sm: {
        height: 80,
      },
      md: {
        height: 100,
      },
      lg: {
        height: 120,
      },
      compact: {
        width: 80,
        height: 80,
        flexShrink: 0,
      },
      grid: {
        height: 0,
        display: 'none',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const ProductImage = styled(Image, {
  name: 'ProductImage',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const PlaceholderImage = styled(YStack, {
  name: 'PlaceholderImage',
  width: '100%',
  height: '100%',
  backgroundColor: '$backgroundPress',
  alignItems: 'center',
  justifyContent: 'center',
});

// Stock badge component
const StockBadge = ({ quantity, size }: { quantity: number; size: 'sm' | 'md' | 'lg' }) => {
  let status: 'inStock' | 'lowStock' | 'outOfStock';
  let label: string;

  if (quantity <= 0) {
    status = 'outOfStock';
    label = 'Out';
  } else if (quantity < 10) {
    status = 'lowStock';
    label = `${quantity} left`;
  } else {
    status = 'inStock';
    label = `${quantity}`;
  }

  const colors = STOCK_COLORS[status];
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 10 : 11;

  return (
    <XStack
      position="absolute"
      top={6}
      right={6}
      backgroundColor={colors.bg}
      paddingHorizontal={size === 'sm' ? 4 : 6}
      paddingVertical={2}
      borderRadius={4}
      alignItems="center"
      gap={3}
      borderWidth={1}
      borderColor={colors.border}
    >
      {status === 'lowStock' && <AlertTriangle size={size === 'sm' ? 8 : 10} color={colors.text} />}
      <Text fontSize={fontSize} fontWeight="600" color={colors.text}>
        {label}
      </Text>
    </XStack>
  );
};

export interface ProductItemProps {
  product: Product;
  onPress: (product: Product) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'compact' | 'grid';
  selected?: boolean;
}

export function ProductItem({
  product,
  onPress,
  size = 'md',
  selected = false,
}: ProductItemProps) {
  const { settings } = useSettingsStore();
  const stockQty = product.quantity ?? 0;
  const isOutOfStock = stockQty <= 0;
  const imageUrl = typeof product.images?.[0] === 'object' ? (product.images[0] as any).url : product.images?.[0];

  const isCompact = size === 'compact';
  const isXs = size === 'xs';
  const iconSize = isCompact ? 24 : isXs ? 20 : size === 'sm' ? 24 : size === 'md' ? 32 : 40;
  const nameFontSize = isCompact ? '$3' : isXs ? '$2' : size === 'sm' ? '$2' : size === 'md' ? '$3' : '$4';
  const priceFontSize = isCompact ? '$3' : isXs ? '$2' : size === 'sm' ? '$3' : size === 'md' ? '$4' : '$5';
  const padding = isCompact ? '$2' : isXs ? '$1' : size === 'sm' ? '$2' : size === 'md' ? '$3' : '$4';
  const stockBadgeSize = isCompact || isXs ? 'sm' : size as 'sm' | 'md' | 'lg';

  // Calculate profit margin for visual indicator
  const profit = (product.sellingPrice || 0) - (product.purchasePrice || 0);
  const profitMargin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

  // Grid layout for POS view - shows price, margin, stock in a card with category color strip
  if (size === 'grid') {
    const categoryColor = (product.category as any)?.color || '#6B7280'; // Gray fallback

    return (
      <ProductCard
        size={size}
        selected={selected}
        outOfStock={isOutOfStock}
        onPress={() => !isOutOfStock && onPress(product)}
        disabled={isOutOfStock}
        overflow="hidden"
      >
        <XStack flex={1}>
          {/* Category color strip on left */}
          <YStack width={5} backgroundColor={categoryColor} />

          {/* Content */}
          <YStack flex={1} padding="$3" gap="$2">
            {/* Product Name */}
            <Text fontSize="$3" fontWeight="600" numberOfLines={2} color="$color">
              {product.name}
            </Text>

            {/* SKU */}
            {product.sku && (
              <Text fontSize={11} color="$colorSecondary">
                SKU: {product.sku}
              </Text>
            )}

            {/* Stock Status */}
            <XStack
              backgroundColor={isOutOfStock ? STOCK_COLORS.outOfStock.bg : stockQty <= 10 ? STOCK_COLORS.lowStock.bg : STOCK_COLORS.inStock.bg}
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={4}
              alignItems="center"
              alignSelf="flex-start"
              gap={4}
            >
              {stockQty <= 10 && stockQty > 0 && <AlertTriangle size={12} color={STOCK_COLORS.lowStock.text} />}
              <Text
                fontSize={11}
                fontWeight="600"
                color={isOutOfStock ? STOCK_COLORS.outOfStock.text : stockQty <= 10 ? STOCK_COLORS.lowStock.text : STOCK_COLORS.inStock.text}
              >
                {isOutOfStock ? 'Out of Stock' : `${stockQty} in stock`}
              </Text>
            </XStack>

            {/* Price and Margin */}
            <XStack alignItems="flex-end" justifyContent="space-between" marginTop="$1">
              <Text fontSize="$5" fontWeight="700" color="$color">
                {formatCurrency(product.sellingPrice, settings.currency)}
              </Text>
              {profitMargin > 0 && (
                <XStack alignItems="center" gap={3}>
                  <TrendingUp size={12} color="#059669" />
                  <Text fontSize={11} color="#059669" fontWeight="600">
                    {profitMargin.toFixed(0)}% margin
                  </Text>
                </XStack>
              )}
            </XStack>
          </YStack>
        </XStack>
      </ProductCard>
    );
  }

  // Compact row layout for list view
  if (isCompact) {
    return (
      <ProductCard
        size={size}
        selected={selected}
        outOfStock={isOutOfStock}
        onPress={() => !isOutOfStock && onPress(product)}
        disabled={isOutOfStock}
      >
        {/* Image Section - Square on left */}
        <ImageContainer size={size}>
          {imageUrl ? (
            <ProductImage source={{ uri: imageUrl }} />
          ) : (
            <PlaceholderImage>
              <Package size={iconSize} color="$placeholderColor" />
            </PlaceholderImage>
          )}
        </ImageContainer>

        {/* Product Info - Center */}
        <YStack flex={1} padding={padding} justifyContent="center" gap={2}>
          <XStack alignItems="center" gap="$2">
            <Text
              fontSize="$3"
              fontWeight="600"
              numberOfLines={1}
              color="$color"
              flex={1}
            >
              {product.name}
            </Text>
            {/* Category Badge */}
            {product.category?.name && (
              <XStack
                backgroundColor="$backgroundHover"
                paddingHorizontal="$2"
                paddingVertical={2}
                borderRadius="$1"
              >
                <Text fontSize={10} color="$colorSecondary" fontWeight="500">
                  {product.category.name}
                </Text>
              </XStack>
            )}
          </XStack>

          <XStack alignItems="center" gap="$3">
            {/* SKU */}
            {product.sku && (
              <Text fontSize={11} color="$colorSecondary">
                SKU: {product.sku}
              </Text>
            )}
            {/* Stock Status */}
            <XStack
              backgroundColor={isOutOfStock ? STOCK_COLORS.outOfStock.bg : stockQty <= 10 ? STOCK_COLORS.lowStock.bg : STOCK_COLORS.inStock.bg}
              paddingHorizontal={6}
              paddingVertical={2}
              borderRadius={4}
              alignItems="center"
              gap={3}
            >
              {stockQty <= 10 && stockQty > 0 && <AlertTriangle size={10} color={STOCK_COLORS.lowStock.text} />}
              <Text
                fontSize={10}
                fontWeight="600"
                color={isOutOfStock ? STOCK_COLORS.outOfStock.text : stockQty <= 10 ? STOCK_COLORS.lowStock.text : STOCK_COLORS.inStock.text}
              >
                {isOutOfStock ? 'Out of Stock' : stockQty <= 10 ? `${stockQty} left` : `${stockQty} in stock`}
              </Text>
            </XStack>
          </XStack>
        </YStack>

        {/* Price & Add Section - Right */}
        <YStack paddingRight="$3" alignItems="flex-end" justifyContent="center" gap={2}>
          <Text fontSize="$4" fontWeight="700" color="$primary">
            {formatCurrency(product.sellingPrice, settings.currency)}
          </Text>
          {product.purchasePrice && profitMargin > 0 && (
            <XStack alignItems="center" gap={2}>
              <TrendingUp size={10} color="#059669" />
              <Text fontSize={10} color="#059669" fontWeight="500">
                {profitMargin.toFixed(0)}% margin
              </Text>
            </XStack>
          )}
        </YStack>
      </ProductCard>
    );
  }

  return (
    <ProductCard
      size={size}
      selected={selected}
      outOfStock={isOutOfStock}
      onPress={() => !isOutOfStock && onPress(product)}
      disabled={isOutOfStock}
    >
      {/* Image Section */}
      <ImageContainer size={size}>
        {imageUrl ? (
          <ProductImage source={{ uri: imageUrl }} />
        ) : (
          <PlaceholderImage>
            <Package size={iconSize} color="$placeholderColor" />
          </PlaceholderImage>
        )}
        {/* Stock Badge */}
        <StockBadge quantity={stockQty} size={stockBadgeSize} />
      </ImageContainer>

      {/* Product Info Section */}
      <YStack padding={padding} gap="$1" width="100%">
        {/* Category Tag - hide on xs */}
        {product.category?.name && !isXs && (
          <Text
            fontSize={size === 'sm' ? 9 : 10}
            color="$colorSecondary"
            textTransform="uppercase"
            letterSpacing={0.5}
          >
            {product.category.name}
          </Text>
        )}

        {/* Product Name */}
        <Text
          fontSize={nameFontSize}
          fontWeight="600"
          numberOfLines={isXs ? 1 : 2}
          color="$color"
          lineHeight={isXs ? 12 : size === 'sm' ? 14 : 18}
        >
          {product.name}
        </Text>

        {/* Price Section */}
        <XStack alignItems="center" justifyContent="space-between" marginTop={isXs ? 0 : '$1'}>
          <Text
            fontSize={priceFontSize}
            fontWeight="700"
            color="$primary"
          >
            {formatCurrency(product.sellingPrice, settings.currency)}
          </Text>

          {/* Profit indicator - hide on xs and sm */}
          {profitMargin > 0 && size !== 'sm' && !isXs && (
            <XStack alignItems="center" gap={2}>
              <TrendingUp size={10} color="#059669" />
              <Text fontSize={9} color="#059669" fontWeight="600">
                {profitMargin.toFixed(0)}%
              </Text>
            </XStack>
          )}
        </XStack>
      </YStack>
    </ProductCard>
  );
}

export default ProductItem;
