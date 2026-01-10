import React from 'react';
import { ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, ScrollView, Separator } from 'tamagui';
import { ArrowLeft, Printer, User, Ticket, Calendar, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import { useSettingsStore } from '@/store';
import { useOrder } from '@/features/orders/hooks';
import type { OrderScreenProps } from '@/navigation/types';

export default function OrderDetailScreen({ navigation, route }: OrderScreenProps<'OrderDetail'>) {
  const { id } = route.params;
  const { settings } = useSettingsStore();

  const {
    data: order,
    isLoading,
    error,
    refetch
  } = useOrder(id);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading order...</Text>
      </YStack>
    );
  }

  if (error || !order) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} />
          </Button>
          <Text fontSize="$6" fontWeight="bold" flex={1}>Order Details</Text>
        </XStack>
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
          <Text color="$error">Failed to load order</Text>
          <Button variant="secondary" onPress={() => refetch()}>
            <RefreshCw size={18} />
            <Text>Retry</Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

  const orderNumber = order.number || order.orderNumber || `#${order.id.slice(0, 6)}`;
  const payment = order.payment || {
    subTotal: order.subTotal || 0,
    discount: order.discount || 0,
    vat: order.tax || 0,
    total: order.total || 0
  };
  const items = order.items || [];

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" alignItems="center" gap="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} />
        </Button>
        <Text fontSize="$6" fontWeight="bold" flex={1}>Order {orderNumber}</Text>
        <Button variant="secondary" size="sm">
          <Printer size={18} />
          <Text>Print</Text>
        </Button>
      </XStack>

      <ScrollView flex={1} padding="$4">
        <YStack gap="$4">
          <Card>
            <YStack gap="$3">
              <XStack alignItems="center" gap="$2">
                <Calendar size={18} color="$colorSecondary" />
                <Text color="$colorSecondary">{formatDate(order.createdAt, 'PPpp')}</Text>
              </XStack>
              {order.customer && (
                <XStack alignItems="center" gap="$2">
                  <User size={18} color="$colorSecondary" />
                  <Text>{order.customer.name}</Text>
                </XStack>
              )}
              {order.coupon && (
                <XStack alignItems="center" gap="$2">
                  <Ticket size={18} color="$success" />
                  <Text color="$success">{order.coupon.code}</Text>
                </XStack>
              )}
            </YStack>
          </Card>

          <Card>
            <Text fontSize="$5" fontWeight="600" marginBottom="$3">Items</Text>
            {items.length === 0 ? (
              <Text color="$colorSecondary">No items</Text>
            ) : (
              items.map((item: any, index: number) => {
                const productName = item.product?.name || item.productName || 'Product';
                const price = item.product?.sellingPrice || item.price || 0;
                return (
                  <XStack
                    key={item.id || index}
                    justifyContent="space-between"
                    paddingVertical="$2"
                    borderBottomWidth={index < items.length - 1 ? 1 : 0}
                    borderBottomColor="$borderColor"
                  >
                    <YStack flex={1}>
                      <Text fontWeight="500">{productName}</Text>
                      <Text fontSize="$2" color="$colorSecondary">
                        {formatCurrency(price, settings.currency)} x {item.quantity}
                      </Text>
                    </YStack>
                    <Text fontWeight="600">
                      {formatCurrency(price * item.quantity, settings.currency)}
                    </Text>
                  </XStack>
                );
              })
            )}
          </Card>

          <Card>
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$colorSecondary">Subtotal</Text>
                <Text>{formatCurrency(payment.subTotal, settings.currency)}</Text>
              </XStack>
              {payment.discount > 0 && (
                <XStack justifyContent="space-between">
                  <Text color="$success">Discount</Text>
                  <Text color="$success">-{formatCurrency(payment.discount, settings.currency)}</Text>
                </XStack>
              )}
              {payment.vat > 0 && (
                <XStack justifyContent="space-between">
                  <Text color="$colorSecondary">VAT</Text>
                  <Text>{formatCurrency(payment.vat, settings.currency)}</Text>
                </XStack>
              )}
              <Separator marginVertical="$2" />
              <XStack justifyContent="space-between">
                <Text fontSize="$5" fontWeight="bold">Total</Text>
                <Text fontSize="$6" fontWeight="bold" color="$accent">
                  {formatCurrency(payment.total, settings.currency)}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
