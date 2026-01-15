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
      sm: {
        height: 80,
      },
      md: {
        height: 100,
      },
      lg: {
        height: 120,
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
  size?: 'sm' | 'md' | 'lg';
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

  const iconSize = size === 'sm' ? 24 : size === 'md' ? 32 : 40;
  const nameFontSize = size === 'sm' ? '$2' : size === 'md' ? '$3' : '$4';
  const priceFontSize = size === 'sm' ? '$3' : size === 'md' ? '$4' : '$5';
  const padding = size === 'sm' ? '$2' : size === 'md' ? '$3' : '$4';

  // Calculate profit margin for visual indicator
  const profit = (product.sellingPrice || 0) - (product.purchasePrice || 0);
  const profitMargin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

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
        <StockBadge quantity={stockQty} size={size} />
      </ImageContainer>

      {/* Product Info Section */}
      <YStack padding={padding} gap="$1" width="100%">
        {/* Category Tag */}
        {product.category?.name && (
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
          numberOfLines={2}
          color="$color"
          lineHeight={size === 'sm' ? 14 : 18}
        >
          {product.name}
        </Text>

        {/* Price Section */}
        <XStack alignItems="center" justifyContent="space-between" marginTop="$1">
          <Text
            fontSize={priceFontSize}
            fontWeight="700"
            color="$primary"
          >
            {formatCurrency(product.sellingPrice, settings.currency)}
          </Text>

          {/* Profit indicator */}
          {profitMargin > 0 && size !== 'sm' && (
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
