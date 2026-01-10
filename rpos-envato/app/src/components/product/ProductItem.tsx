import React from 'react';
import { YStack, Text, Image, styled, GetProps } from 'tamagui';
import { Package } from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import type { Product } from '@/types';

const ProductCard = styled(YStack, {
  name: 'ProductCard',
  backgroundColor: '$cardBackground',
  borderRadius: '$2',
  padding: '$3',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  cursor: 'pointer',

  // Shadow
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 1,
  shadowRadius: 2,
  elevation: 1,

  pressStyle: {
    scale: 0.98,
    opacity: 0.9,
    borderColor: '$primary',
  },

  hoverStyle: {
    borderColor: '$borderColorHover',
  },

  variants: {
    size: {
      sm: {
        width: 100,
        height: 110,
        padding: '$2',
      },
      md: {
        width: 130,
        height: 136,
        padding: '$3',
      },
      lg: {
        width: 160,
        height: 170,
        padding: '$4',
      },
    },
    selected: {
      true: {
        borderColor: '$primary',
        borderWidth: 2,
      },
    },
    outOfStock: {
      true: {
        opacity: 0.5,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const ProductImage = styled(Image, {
  name: 'ProductImage',
  borderRadius: '$1',
  objectFit: 'cover',

  variants: {
    size: {
      sm: {
        width: 50,
        height: 50,
      },
      md: {
        width: 60,
        height: 60,
      },
      lg: {
        width: 80,
        height: 80,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const PlaceholderImage = styled(YStack, {
  name: 'PlaceholderImage',
  backgroundColor: '$backgroundPress',
  borderRadius: '$1',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    size: {
      sm: {
        width: 50,
        height: 50,
      },
      md: {
        width: 60,
        height: 60,
      },
      lg: {
        width: 80,
        height: 80,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

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
  const isOutOfStock = product.quantity <= 0;
  const imageUrl = product.images?.[0];

  const iconSize = size === 'sm' ? 20 : size === 'md' ? 24 : 32;

  return (
    <ProductCard
      size={size}
      selected={selected}
      outOfStock={isOutOfStock}
      onPress={() => !isOutOfStock && onPress(product)}
      disabled={isOutOfStock}
    >
      {imageUrl ? (
        <ProductImage
          source={{ uri: imageUrl }}
          size={size}
        />
      ) : (
        <PlaceholderImage size={size}>
          <Package size={iconSize} color="$placeholderColor" />
        </PlaceholderImage>
      )}

      <Text
        fontSize={size === 'sm' ? '$2' : '$3'}
        fontWeight="500"
        numberOfLines={1}
        textAlign="center"
        color="$color"
      >
        {product.name}
      </Text>

      <Text
        fontSize={size === 'sm' ? '$2' : '$3'}
        fontWeight="600"
        color="$accent"
      >
        {formatCurrency(product.sellingPrice, settings.currency)}
      </Text>

      {isOutOfStock && (
        <Text fontSize="$1" color="$error" fontWeight="500">
          Out of Stock
        </Text>
      )}
    </ProductCard>
  );
}

export default ProductItem;
