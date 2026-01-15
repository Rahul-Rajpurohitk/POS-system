import React from 'react';
import { XStack, YStack, Text, Image, styled } from 'tamagui';
import { Minus, Plus, Trash2, Package, X } from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore, useCartStore } from '@/store';
import type { CartItem as CartItemType } from '@/types';

const CartItemContainer = styled(XStack, {
  name: 'CartItemContainer',
  backgroundColor: '$cardBackground',
  borderRadius: '$3',
  padding: '$3',
  gap: '$3',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '$borderColor',
  position: 'relative',

  hoverStyle: {
    backgroundColor: '$backgroundHover',
    borderColor: '$primary',
  },
});

const ProductImage = styled(Image, {
  name: 'CartProductImage',
  width: 56,
  height: 56,
  borderRadius: '$2',
  objectFit: 'cover',
});

const PlaceholderImage = styled(YStack, {
  name: 'CartPlaceholderImage',
  width: 56,
  height: 56,
  backgroundColor: '$backgroundHover',
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
});

const QuantityControl = styled(XStack, {
  name: 'QuantityControl',
  alignItems: 'center',
  gap: '$1',
  backgroundColor: '$backgroundHover',
  borderRadius: '$3',
  padding: '$1',
  borderWidth: 1,
  borderColor: '$borderColor',
});

const QuantityButton = styled(YStack, {
  name: 'QuantityButton',
  width: 28,
  height: 28,
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',

  hoverStyle: {
    backgroundColor: '$primary',
  },

  pressStyle: {
    transform: [{ scale: 0.95 }],
  },
});

export interface CartItemProps {
  item: CartItemType;
  onRemove?: () => void;
  compact?: boolean;
}

export function CartItem({ item, onRemove, compact = false }: CartItemProps) {
  const { settings } = useSettingsStore();
  const { incrementQuantity, decrementQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;
  const imageUrl = typeof product.images?.[0] === 'object' ? (product.images[0] as any).url : product.images?.[0];
  const itemTotal = product.sellingPrice * quantity;

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      removeItem(product.id);
    }
  };

  return (
    <CartItemContainer>
      {/* Product Image */}
      {imageUrl ? (
        <ProductImage source={{ uri: imageUrl }} />
      ) : (
        <PlaceholderImage>
          <Package size={24} color="$placeholderColor" />
        </PlaceholderImage>
      )}

      {/* Product Info */}
      <YStack flex={1} gap="$1" minWidth={60}>
        <Text
          fontSize="$3"
          fontWeight="600"
          numberOfLines={1}
          color="$color"
        >
          {product.name}
        </Text>
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$2" color="$colorSecondary">
            {formatCurrency(product.sellingPrice, settings.currency)}
          </Text>
          <Text fontSize="$1" color="$colorSecondary">x{quantity}</Text>
        </XStack>
      </YStack>

      {/* Quantity Controls */}
      <QuantityControl>
        <QuantityButton
          onPress={() => decrementQuantity(product.id)}
          backgroundColor={quantity <= 1 ? '$error' : '$background'}
          hoverStyle={{ backgroundColor: quantity <= 1 ? '$error' : '$primary' }}
        >
          {quantity <= 1 ? (
            <Trash2 size={14} color="white" />
          ) : (
            <Minus size={14} color="$color" />
          )}
        </QuantityButton>

        <Text
          fontSize="$3"
          fontWeight="700"
          color="$color"
          minWidth={28}
          textAlign="center"
        >
          {quantity}
        </Text>

        <QuantityButton onPress={() => incrementQuantity(product.id)}>
          <Plus size={14} color="$color" />
        </QuantityButton>
      </QuantityControl>

      {/* Item Total */}
      <YStack alignItems="flex-end" minWidth={70}>
        <Text fontSize="$4" fontWeight="700" color="$primary">
          {formatCurrency(itemTotal, settings.currency)}
        </Text>
      </YStack>

      {/* Quick Remove Button */}
      <YStack
        position="absolute"
        top={-6}
        right={-6}
        width={20}
        height={20}
        borderRadius={10}
        backgroundColor="$error"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        opacity={0}
        hoverStyle={{ opacity: 1 }}
        pressStyle={{ transform: [{ scale: 0.9 }] }}
        onPress={handleRemove}
      >
        <X size={12} color="white" />
      </YStack>
    </CartItemContainer>
  );
}

export default CartItem;
