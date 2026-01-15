import React, { useRef } from 'react';
import { Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { XStack, YStack, Text, Image, styled } from 'tamagui';
import { Minus, Plus, Trash2, Package } from '@tamagui/lucide-icons';
import { formatCurrency } from '@/utils';
import { useSettingsStore, useCartStore } from '@/store';
import type { CartItem as CartItemType } from '@/types';

const THEME = {
  primary: '#4F46E5',
  success: '#10B981',
  error: '#EF4444',
};

const CartItemContainer = styled(XStack, {
  name: 'CartItemContainer',
  backgroundColor: '$cardBackground',
  paddingVertical: '$2',
  paddingHorizontal: '$2',
  gap: '$2',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',
});

const ProductImage = styled(Image, {
  name: 'CartProductImage',
  width: 36,
  height: 36,
  borderRadius: '$2',
  objectFit: 'cover',
});

const PlaceholderImage = styled(YStack, {
  name: 'CartPlaceholderImage',
  width: 36,
  height: 36,
  backgroundColor: '$backgroundPress',
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
});

const QuantityControl = styled(XStack, {
  name: 'QuantityControl',
  alignItems: 'center',
  gap: 4,
});

const QuantityButton = styled(YStack, {
  name: 'QuantityButton',
  width: 28,
  height: 28,
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '$backgroundHover',
  borderWidth: 1,
  borderColor: '$borderColor',

  hoverStyle: {
    backgroundColor: '$backgroundPress',
    borderColor: '$colorSecondary',
  },

  pressStyle: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '$backgroundPress',
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
  const swipeableRef = useRef<Swipeable>(null);
  const imageUrl = typeof product.images?.[0] === 'object' ? (product.images[0] as any).url : product.images?.[0];
  const itemTotal = product.sellingPrice * quantity;

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      removeItem(product.id);
    }
  };

  // Render right swipe action (delete)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-80, -40, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{
          backgroundColor: THEME.error,
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          transform: [{ scale }],
          opacity,
        }}
      >
        <YStack
          width="100%"
          height="100%"
          backgroundColor={THEME.error}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={handleRemove}
        >
          <Trash2 size={20} color="white" />
          <Text fontSize={10} color="white" fontWeight="600" marginTop={2}>
            Delete
          </Text>
        </YStack>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          handleRemove();
        }
      }}
    >
      <CartItemContainer>
        {/* Product Image */}
        {imageUrl ? (
          <ProductImage source={{ uri: imageUrl }} />
        ) : (
          <PlaceholderImage>
            <Package size={16} color="$placeholderColor" />
          </PlaceholderImage>
        )}

        {/* Product Info */}
        <YStack flex={1} minWidth={40}>
          <Text fontSize="$2" fontWeight="500" numberOfLines={1} color="$color">
            {product.name}
          </Text>
          <Text fontSize={11} color="$colorSecondary">
            {formatCurrency(product.sellingPrice, settings.currency)}
          </Text>
        </YStack>

        {/* Quantity Controls */}
        <QuantityControl>
          <QuantityButton onPress={() => decrementQuantity(product.id)}>
            <Minus size={14} color="$color" />
          </QuantityButton>

          <Text fontSize="$3" fontWeight="600" color="$color" minWidth={24} textAlign="center">
            {quantity}
          </Text>

          <QuantityButton onPress={() => incrementQuantity(product.id)}>
            <Plus size={14} color="$color" />
          </QuantityButton>
        </QuantityControl>

        {/* Item Total */}
        <Text fontSize="$2" fontWeight="700" color="$color" minWidth={50} textAlign="right">
          {formatCurrency(itemTotal, settings.currency)}
        </Text>
      </CartItemContainer>
    </Swipeable>
  );
}

export default CartItem;
