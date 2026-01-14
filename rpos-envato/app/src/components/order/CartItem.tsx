import React from 'react';
import { XStack, YStack, Text, Image, styled } from 'tamagui';
import { Minus, Plus, Trash2, Package } from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore, useCartStore } from '@/store';
import type { CartItem as CartItemType } from '@/types';

const CartItemContainer = styled(XStack, {
  name: 'CartItemContainer',
  backgroundColor: '$cardBackground',
  borderRadius: '$2',
  padding: '$3',
  gap: '$3',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '$borderColor',
});

const ProductImage = styled(Image, {
  name: 'CartProductImage',
  width: 50,
  height: 50,
  borderRadius: '$1',
  objectFit: 'cover',
});

const PlaceholderImage = styled(YStack, {
  name: 'CartPlaceholderImage',
  width: 50,
  height: 50,
  backgroundColor: '$backgroundPress',
  borderRadius: '$1',
  alignItems: 'center',
  justifyContent: 'center',
});

const QuantityControl = styled(XStack, {
  name: 'QuantityControl',
  alignItems: 'center',
  gap: '$2',
  backgroundColor: '$background',
  borderRadius: '$2',
  padding: '$1',
});

export interface CartItemProps {
  item: CartItemType;
  onRemove?: () => void;
}

export function CartItem({ item, onRemove }: CartItemProps) {
  const { settings } = useSettingsStore();
  const { incrementQuantity, decrementQuantity, removeItem } = useCartStore();
  const { product, quantity } = item;
  const imageUrl = product.images?.[0];
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
      <YStack flex={1} gap="$1" minWidth={80}>
        <Text
          fontSize="$3"
          fontWeight="500"
          numberOfLines={1}
          color="$color"
        >
          {product.name}
        </Text>
        <Text fontSize="$2" color="$colorSecondary" numberOfLines={1}>
          {formatCurrency(product.sellingPrice, settings.currency)} each
        </Text>
      </YStack>

      {/* Quantity Controls */}
      <QuantityControl>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => decrementQuantity(product.id)}
        >
          <Minus size={16} color="$color" />
        </Button>

        <Text
          fontSize="$4"
          fontWeight="600"
          color="$color"
          minWidth={30}
          textAlign="center"
        >
          {quantity}
        </Text>

        <Button
          variant="ghost"
          size="icon"
          onPress={() => incrementQuantity(product.id)}
        >
          <Plus size={16} color="$color" />
        </Button>
      </QuantityControl>

      {/* Item Total */}
      <YStack alignItems="flex-end" minWidth={80}>
        <Text fontSize="$4" fontWeight="600" color="$accent">
          {formatCurrency(itemTotal, settings.currency)}
        </Text>
      </YStack>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onPress={handleRemove}
      >
        <Trash2 size={18} color="$error" />
      </Button>
    </CartItemContainer>
  );
}

export default CartItem;
