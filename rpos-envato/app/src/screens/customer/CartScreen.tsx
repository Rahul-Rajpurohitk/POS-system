import React from 'react';
import { FlatList } from 'react-native';
import { YStack, XStack, Text, ScrollView, Image } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  Tag,
  MapPin,
} from '@tamagui/lucide-icons';
import { Card, Button, EmptyState } from '@/components/ui';
import { useCustomerStore, type CartItem } from '@/store/customerStore';
import type { CustomerTabScreenProps } from '@/navigation/types';

// Cart Item Row
function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <Card padding="$3" marginBottom="$3">
      <XStack gap="$3">
        {item.product.images?.[0] ? (
          <Image
            source={{ uri: item.product.images[0] }}
            width={70}
            height={70}
            borderRadius="$2"
            backgroundColor="$backgroundPress"
          />
        ) : (
          <YStack
            width={70}
            height={70}
            borderRadius="$2"
            backgroundColor="$backgroundPress"
            alignItems="center"
            justifyContent="center"
          >
            <Package size={24} color="$colorSecondary" />
          </YStack>
        )}

        <YStack flex={1}>
          <Text fontSize={15} fontWeight="600" numberOfLines={2}>
            {item.product.name}
          </Text>
          <Text fontSize={14} color="$primary" fontWeight="600" marginTop="$1">
            ${item.product.sellingPrice.toFixed(2)}
          </Text>
          {item.notes && (
            <Text fontSize={12} color="$colorSecondary" marginTop="$1">
              Note: {item.notes}
            </Text>
          )}
        </YStack>

        <YStack alignItems="flex-end" justifyContent="space-between">
          <Button size="icon" variant="ghost" onPress={onRemove}>
            <Trash2 size={18} color="$error" />
          </Button>

          <XStack alignItems="center" gap="$2">
            <Button
              size="icon"
              variant="secondary"
              onPress={() => onUpdateQuantity(item.quantity - 1)}
            >
              <Minus size={14} />
            </Button>
            <Text fontSize={14} fontWeight="600" minWidth={24} textAlign="center">
              {item.quantity}
            </Text>
            <Button
              size="icon"
              onPress={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus size={14} color="white" />
            </Button>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}

export default function CartScreen({ navigation }: CustomerTabScreenProps<'Cart'>) {
  const {
    cartItems,
    deliveryAddress,
    appliedCoupon,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getDiscountAmount,
  } = useCustomerStore();

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const deliveryFee = 3.99; // TODO: Get from store/zone settings
  const total = subtotal - discount + deliveryFee;

  const handleCheckout = () => {
    // Navigate to checkout
    // For now, we'll just show an alert or navigate to checkout screen
    // navigation.navigate('Checkout');
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <YStack flex={1} backgroundColor="$background" padding="$4">
          <Text fontSize={24} fontWeight="bold" marginBottom="$4">
            Cart
          </Text>
          <YStack flex={1} alignItems="center" justifyContent="center">
            <ShoppingCart size={64} color="$colorSecondary" />
            <Text fontSize={18} fontWeight="600" marginTop="$4">
              Your cart is empty
            </Text>
            <Text fontSize={14} color="$colorSecondary" textAlign="center" marginTop="$2">
              Add items from the menu to get started
            </Text>
            <Button
              size="lg"
              marginTop="$4"
              onPress={() => navigation.navigate('Menu', {})}
            >
              <Text color="white" fontWeight="600">
                Browse Menu
              </Text>
            </Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack padding="$4" justifyContent="space-between" alignItems="center">
          <Text fontSize={24} fontWeight="bold">
            Cart ({cartItems.length})
          </Text>
          <Button variant="ghost" size="sm" onPress={clearCart}>
            <Trash2 size={18} color="$error" />
            <Text color="$error" marginLeft="$1">
              Clear
            </Text>
          </Button>
        </XStack>

        <ScrollView flex={1} paddingHorizontal="$4">
          {/* Cart Items */}
          {cartItems.map((item) => (
            <CartItemRow
              key={item.product.id}
              item={item}
              onUpdateQuantity={(qty) =>
                updateCartItemQuantity(item.product.id, qty)
              }
              onRemove={() => removeFromCart(item.product.id)}
            />
          ))}

          {/* Delivery Address */}
          <Card padding="$3" marginBottom="$3">
            <XStack alignItems="center" gap="$2">
              <MapPin size={20} color="$primary" />
              <YStack flex={1}>
                <Text fontSize={12} color="$colorSecondary">
                  Deliver to
                </Text>
                <Text fontSize={14} fontWeight="500" numberOfLines={1}>
                  {deliveryAddress?.address || 'Add delivery address'}
                </Text>
              </YStack>
              <Button variant="ghost" size="sm">
                <Text color="$primary">Change</Text>
              </Button>
            </XStack>
          </Card>

          {/* Coupon */}
          <Card padding="$3" marginBottom="$3">
            <XStack alignItems="center" gap="$2">
              <Tag size={20} color="$success" />
              <YStack flex={1}>
                {appliedCoupon ? (
                  <>
                    <Text fontSize={14} fontWeight="500" color="$success">
                      {appliedCoupon.code} applied
                    </Text>
                    <Text fontSize={12} color="$colorSecondary">
                      {appliedCoupon.type === 'percentage'
                        ? `${appliedCoupon.amount}% off`
                        : `$${appliedCoupon.amount} off`}
                    </Text>
                  </>
                ) : (
                  <Text fontSize={14} color="$colorSecondary">
                    Add a coupon code
                  </Text>
                )}
              </YStack>
              <Button variant="ghost" size="sm">
                <Text color="$primary">
                  {appliedCoupon ? 'Change' : 'Add'}
                </Text>
              </Button>
            </XStack>
          </Card>
        </ScrollView>

        {/* Order Summary & Checkout */}
        <Card padding="$4" borderTopLeftRadius="$4" borderTopRightRadius="$4" elevation={10}>
          <YStack gap="$2" marginBottom="$4">
            <XStack justifyContent="space-between">
              <Text fontSize={14} color="$colorSecondary">
                Subtotal
              </Text>
              <Text fontSize={14}>${subtotal.toFixed(2)}</Text>
            </XStack>

            {discount > 0 && (
              <XStack justifyContent="space-between">
                <Text fontSize={14} color="$success">
                  Discount
                </Text>
                <Text fontSize={14} color="$success">
                  -${discount.toFixed(2)}
                </Text>
              </XStack>
            )}

            <XStack justifyContent="space-between">
              <Text fontSize={14} color="$colorSecondary">
                Delivery Fee
              </Text>
              <Text fontSize={14}>${deliveryFee.toFixed(2)}</Text>
            </XStack>

            <XStack
              justifyContent="space-between"
              paddingTop="$2"
              borderTopWidth={1}
              borderTopColor="$borderColor"
            >
              <Text fontSize={16} fontWeight="bold">
                Total
              </Text>
              <Text fontSize={16} fontWeight="bold" color="$primary">
                ${total.toFixed(2)}
              </Text>
            </XStack>
          </YStack>

          <Button
            size="lg"
            fullWidth
            onPress={handleCheckout}
            disabled={!deliveryAddress}
          >
            <Text color="white" fontWeight="600" fontSize={16}>
              {deliveryAddress ? 'Proceed to Checkout' : 'Add Delivery Address'}
            </Text>
          </Button>
        </Card>
      </YStack>
    </SafeAreaView>
  );
}
