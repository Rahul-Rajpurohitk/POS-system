import React, { useState } from 'react';
import { YStack, XStack, Text, ScrollView, Input, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Banknote,
  Clock,
  AlertCircle,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useCustomerStore } from '@/store/customerStore';
import { useAuthStore } from '@/store';
import { usePlaceOrder, useCheckDeliverability } from '@/features/customer/hooks';
import type { CustomerScreenProps } from '@/navigation/types';

type PaymentMethod = 'cash' | 'card' | 'online';

export default function CheckoutScreen({ navigation }: CustomerScreenProps<'Checkout'>) {
  const { user } = useAuthStore();
  const {
    cartItems,
    deliveryAddress,
    deliveryInstructions,
    appliedCoupon,
    getCartTotal,
    getDiscountAmount,
    setDeliveryInstructions,
  } = useCustomerStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tip, setTip] = useState<number>(0);
  const [customerName, setCustomerName] = useState(
    user ? `${user.firstName} ${user.lastName}` : ''
  );
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const placeOrder = usePlaceOrder();
  const checkDeliverability = useCheckDeliverability();

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const deliveryFee = 3.99; // TODO: Get from checkDeliverability
  const total = subtotal - discount + deliveryFee + tip;

  const tipOptions = [0, 2, 5, 10];

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress) {
      setError('Please add a delivery address');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!customerPhone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setError(null);

    try {
      await placeOrder.mutateAsync({
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        deliveryAddress: deliveryAddress.address,
        deliveryLatitude: deliveryAddress.latitude,
        deliveryLongitude: deliveryAddress.longitude,
        deliveryInstructions,
        customerName,
        customerPhone,
        couponCode: appliedCoupon?.code,
        paymentMethod,
        tip,
      });

      // Navigate to order tracking
      navigation.replace('OrderTracking', { orderId: 'new' });
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack padding="$4" alignItems="center" gap="$3">
          <Button variant="ghost" size="icon" onPress={handleBack}>
            <ArrowLeft size={24} />
          </Button>
          <Text fontSize={20} fontWeight="bold" flex={1}>
            Checkout
          </Text>
        </XStack>

        <ScrollView flex={1} paddingHorizontal="$4">
          {/* Error Message */}
          {error && (
            <Card padding="$3" marginBottom="$3" backgroundColor="$errorBackground">
              <XStack alignItems="center" gap="$2">
                <AlertCircle size={20} color="$error" />
                <Text color="$error" flex={1}>
                  {error}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Delivery Address */}
          <Card padding="$4" marginBottom="$3">
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <MapPin size={20} color="$primary" />
              <Text fontSize={16} fontWeight="600">
                Delivery Address
              </Text>
            </XStack>
            <Text fontSize={14} marginBottom="$2">
              {deliveryAddress?.address || 'No address selected'}
            </Text>
            <Input
              placeholder="Delivery instructions (optional)"
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              multiline
              numberOfLines={2}
            />
          </Card>

          {/* Contact Info */}
          <Card padding="$4" marginBottom="$3">
            <Text fontSize={16} fontWeight="600" marginBottom="$3">
              Contact Information
            </Text>
            <YStack gap="$3">
              <YStack>
                <Text fontSize={13} color="$colorSecondary" marginBottom="$1">
                  Name
                </Text>
                <Input
                  placeholder="Your name"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </YStack>
              <YStack>
                <Text fontSize={13} color="$colorSecondary" marginBottom="$1">
                  Phone Number
                </Text>
                <Input
                  placeholder="Your phone number"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                />
              </YStack>
            </YStack>
          </Card>

          {/* Payment Method */}
          <Card padding="$4" marginBottom="$3">
            <Text fontSize={16} fontWeight="600" marginBottom="$3">
              Payment Method
            </Text>
            <YStack gap="$2">
              {[
                { id: 'cash', label: 'Cash on Delivery', icon: Banknote },
                { id: 'card', label: 'Card on Delivery', icon: CreditCard },
              ].map((method) => (
                <XStack
                  key={method.id}
                  padding="$3"
                  borderRadius="$2"
                  borderWidth={2}
                  borderColor={
                    paymentMethod === method.id ? '$primary' : '$borderColor'
                  }
                  backgroundColor={
                    paymentMethod === method.id ? '$primaryBackground' : 'transparent'
                  }
                  alignItems="center"
                  gap="$3"
                  pressStyle={{ opacity: 0.8 }}
                  onPress={() => setPaymentMethod(method.id as PaymentMethod)}
                >
                  <method.icon size={20} color="$primary" />
                  <Text fontSize={14} fontWeight="500" flex={1}>
                    {method.label}
                  </Text>
                  <YStack
                    width={20}
                    height={20}
                    borderRadius={10}
                    borderWidth={2}
                    borderColor={
                      paymentMethod === method.id ? '$primary' : '$borderColor'
                    }
                    backgroundColor={
                      paymentMethod === method.id ? '$primary' : 'transparent'
                    }
                  />
                </XStack>
              ))}
            </YStack>
          </Card>

          {/* Tip */}
          <Card padding="$4" marginBottom="$3">
            <Text fontSize={16} fontWeight="600" marginBottom="$3">
              Add a Tip
            </Text>
            <XStack gap="$2">
              {tipOptions.map((amount) => (
                <Button
                  key={amount}
                  flex={1}
                  size="md"
                  variant={tip === amount ? 'primary' : 'secondary'}
                  onPress={() => setTip(amount)}
                >
                  <Text color={tip === amount ? 'white' : '$color'}>
                    {amount === 0 ? 'No tip' : `$${amount}`}
                  </Text>
                </Button>
              ))}
            </XStack>
          </Card>

          {/* Order Summary */}
          <Card padding="$4" marginBottom="$4">
            <Text fontSize={16} fontWeight="600" marginBottom="$3">
              Order Summary
            </Text>
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text fontSize={14} color="$colorSecondary">
                  Subtotal ({cartItems.length} items)
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

              {tip > 0 && (
                <XStack justifyContent="space-between">
                  <Text fontSize={14} color="$colorSecondary">
                    Tip
                  </Text>
                  <Text fontSize={14}>${tip.toFixed(2)}</Text>
                </XStack>
              )}

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
          </Card>
        </ScrollView>

        {/* Place Order Button */}
        <Card padding="$4" borderRadius={0}>
          <Button
            size="lg"
            fullWidth
            onPress={handlePlaceOrder}
            disabled={placeOrder.isPending}
          >
            {placeOrder.isPending ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontWeight="600" fontSize={16}>
                Place Order - ${total.toFixed(2)}
              </Text>
            )}
          </Button>
        </Card>
      </YStack>
    </SafeAreaView>
  );
}
