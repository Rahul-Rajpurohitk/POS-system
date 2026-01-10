import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, ScrollView, Input as TamaguiInput, Separator } from 'tamagui';
import { Search, User, Ticket, Trash2, RefreshCw } from '@tamagui/lucide-icons';
import { Button, Card, Modal } from '@/components/ui';
import { ProductItem } from '@/components/product';
import { CartItem } from '@/components/order';
import { useCartStore, useSettingsStore, useSyncStore } from '@/store';
import { formatCurrency, generateLocalId, generateLocalOrderNumber, isCouponExpired } from '@/utils';
import { usePlatform, useProductGridColumns } from '@/hooks';
import { useProducts } from '@/features/products/hooks';
import { useCustomers } from '@/features/customers/hooks';
import { useActiveCoupons } from '@/features/coupons/hooks';
import { post } from '@/services/api/client';
import type { MainTabScreenProps } from '@/navigation/types';
import type { Order } from '@/types';

export default function POSScreen({ navigation }: MainTabScreenProps<'POS'>) {
  const { settings } = useSettingsStore();
  const { addOrderToQueue } = useSyncStore();
  const {
    items,
    customer,
    coupon,
    addItem,
    setCustomer,
    setCoupon,
    clear,
    getSubTotal,
    getDiscount,
    getVat,
    getTotal,
    getPayment,
  } = useCartStore();

  const { isTablet, isDesktop } = usePlatform();
  const numColumns = useProductGridColumns();

  const [searchQuery, setSearchQuery] = useState('');
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch real data from API
  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching
  } = useProducts({ limit: 100 });

  const {
    data: customersData,
    isLoading: customersLoading
  } = useCustomers({ limit: 100 });

  const {
    data: couponsData,
    isLoading: couponsLoading
  } = useActiveCoupons();

  // Extract data with fallbacks
  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];
  const coupons = couponsData ?? [];

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))
    );
  }, [searchQuery, products]);

  // Filter valid coupons (not expired)
  const validCoupons = useMemo(() => {
    return coupons.filter((c) => !isCouponExpired(c.expiredAt));
  }, [coupons]);

  // Handle checkout
  const handleCheckout = async () => {
    if (items.length === 0) return;

    setLoading(true);

    const order: Order = {
      id: generateLocalId(),
      number: generateLocalOrderNumber(),
      items: items.map((item, index) => ({
        id: `item-${index}`,
        product: item.product,
        quantity: item.quantity,
      })),
      payment: getPayment(),
      customer: customer || undefined,
      coupon: coupon || undefined,
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
    };

    try {
      if (settings.isOfflineMode) {
        // Save locally for sync later
        addOrderToQueue(order);
      } else {
        // Send to server
        await post('/orders', {
          items: order.items.map((i) => ({
            product: i.product.id,
            quantity: i.quantity,
          })),
          customer: order.customer?.id,
          coupon: order.coupon?.id,
          payment: order.payment,
        });
      }

      // Clear cart after successful order
      clear();
      // TODO: Show receipt modal
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <XStack flex={1} backgroundColor="$background">
      {/* Left Side - Products */}
      <YStack flex={1} padding="$4" gap="$3">
        {/* Search Bar */}
        <XStack
          backgroundColor="$cardBackground"
          borderRadius="$2"
          paddingHorizontal="$3"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Search size={20} color="$placeholderColor" />
          <TamaguiInput
            flex={1}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            borderWidth={0}
            backgroundColor="transparent"
          />
        </XStack>

        {/* Products Grid */}
        {productsLoading ? (
          <YStack flex={1} justifyContent="center" alignItems="center">
            <ActivityIndicator size="large" />
            <Text color="$colorSecondary" marginTop="$2">Loading products...</Text>
          </YStack>
        ) : products.length === 0 ? (
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
            <Text color="$colorSecondary">No products found</Text>
            <Button variant="secondary" size="sm" onPress={() => refetchProducts()}>
              <RefreshCw size={16} />
              <Text>Refresh</Text>
            </Button>
          </YStack>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            renderItem={({ item }) => (
              <ProductItem
                product={item}
                onPress={(p) => addItem(p)}
                size={isDesktop ? 'lg' : 'md'}
              />
            )}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
            showsVerticalScrollIndicator={false}
            refreshing={productsRefetching}
            onRefresh={() => refetchProducts()}
          />
        )}
      </YStack>

      {/* Right Side - Cart */}
      <YStack
        width={isDesktop ? 400 : 320}
        backgroundColor="$cardBackground"
        borderLeftWidth={1}
        borderLeftColor="$borderColor"
      >
        {/* Cart Header */}
        <XStack
          padding="$4"
          justifyContent="space-between"
          alignItems="center"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Text fontSize="$5" fontWeight="bold">Current Order</Text>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onPress={clear}>
              <Trash2 size={18} color="$error" />
            </Button>
          )}
        </XStack>

        {/* Customer & Coupon Selection */}
        <XStack padding="$3" gap="$2" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Button
            variant={customer ? 'primary' : 'secondary'}
            size="sm"
            flex={1}
            onPress={() => setCustomerModalVisible(true)}
          >
            <User size={16} color={customer ? 'white' : '$color'} />
            <Text color={customer ? 'white' : '$color'} fontSize="$2">
              {customer ? customer.name : 'Add Customer'}
            </Text>
          </Button>
          <Button
            variant={coupon ? 'primary' : 'secondary'}
            size="sm"
            flex={1}
            onPress={() => setCouponModalVisible(true)}
          >
            <Ticket size={16} color={coupon ? 'white' : '$color'} />
            <Text color={coupon ? 'white' : '$color'} fontSize="$2">
              {coupon ? coupon.code : 'Add Coupon'}
            </Text>
          </Button>
        </XStack>

        {/* Cart Items */}
        <ScrollView flex={1} padding="$3">
          {items.length === 0 ? (
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">No items in cart</Text>
            </YStack>
          ) : (
            <YStack gap="$2">
              {items.map((item, index) => (
                <CartItem key={`${item.product.id}-${index}`} item={item} />
              ))}
            </YStack>
          )}
        </ScrollView>

        {/* Order Summary */}
        <YStack padding="$4" gap="$3" borderTopWidth={1} borderTopColor="$borderColor">
          <XStack justifyContent="space-between">
            <Text color="$colorSecondary">Subtotal</Text>
            <Text fontWeight="500">{formatCurrency(getSubTotal(), settings.currency)}</Text>
          </XStack>

          {getDiscount() > 0 && (
            <XStack justifyContent="space-between">
              <Text color="$success">Discount</Text>
              <Text color="$success">-{formatCurrency(getDiscount(), settings.currency)}</Text>
            </XStack>
          )}

          {getVat() > 0 && (
            <XStack justifyContent="space-between">
              <Text color="$colorSecondary">VAT ({settings.tax}%)</Text>
              <Text fontWeight="500">{formatCurrency(getVat(), settings.currency)}</Text>
            </XStack>
          )}

          <Separator />

          <XStack justifyContent="space-between">
            <Text fontSize="$5" fontWeight="bold">Total</Text>
            <Text fontSize="$6" fontWeight="bold" color="$accent">
              {formatCurrency(getTotal(), settings.currency)}
            </Text>
          </XStack>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={items.length === 0}
            loading={loading}
            onPress={handleCheckout}
          >
            <Text color="white" fontWeight="600" fontSize="$4">
              Checkout
            </Text>
          </Button>
        </YStack>
      </YStack>

      {/* Customer Selection Modal */}
      <Modal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        title="Select Customer"
        size="sm"
      >
        <YStack gap="$2">
          {customersLoading ? (
            <YStack padding="$4" alignItems="center">
              <ActivityIndicator size="small" />
              <Text color="$colorSecondary" marginTop="$2">Loading customers...</Text>
            </YStack>
          ) : customers.length === 0 ? (
            <Text color="$colorSecondary" textAlign="center" padding="$4">
              No customers found
            </Text>
          ) : (
            customers.map((c) => (
              <Button
                key={c.id}
                variant={customer?.id === c.id ? 'primary' : 'secondary'}
                fullWidth
                onPress={() => {
                  setCustomer(c);
                  setCustomerModalVisible(false);
                }}
              >
                <YStack alignItems="center">
                  <Text color={customer?.id === c.id ? 'white' : '$color'}>{c.name}</Text>
                  {c.phone && (
                    <Text color={customer?.id === c.id ? 'white' : '$colorSecondary'} fontSize="$2">
                      {c.phone}
                    </Text>
                  )}
                </YStack>
              </Button>
            ))
          )}
          {customer && (
            <Button
              variant="ghost"
              fullWidth
              onPress={() => {
                setCustomer(null);
                setCustomerModalVisible(false);
              }}
            >
              <Text color="$error">Remove Customer</Text>
            </Button>
          )}
        </YStack>
      </Modal>

      {/* Coupon Selection Modal */}
      <Modal
        visible={couponModalVisible}
        onClose={() => setCouponModalVisible(false)}
        title="Select Coupon"
        size="sm"
      >
        <YStack gap="$2">
          {couponsLoading ? (
            <YStack padding="$4" alignItems="center">
              <ActivityIndicator size="small" />
              <Text color="$colorSecondary" marginTop="$2">Loading coupons...</Text>
            </YStack>
          ) : validCoupons.length === 0 ? (
            <Text color="$colorSecondary" textAlign="center" padding="$4">
              No active coupons available
            </Text>
          ) : (
            validCoupons.map((c) => (
              <Button
                key={c.id}
                variant={coupon?.id === c.id ? 'primary' : 'secondary'}
                fullWidth
                onPress={() => {
                  setCoupon(c);
                  setCouponModalVisible(false);
                }}
              >
                <YStack alignItems="center">
                  <Text color={coupon?.id === c.id ? 'white' : '$color'} fontWeight="600">
                    {c.code}
                  </Text>
                  <Text color={coupon?.id === c.id ? 'white' : '$colorSecondary'} fontSize="$2">
                    {c.type === 'percentage' ? `${c.amount}% off` : `${formatCurrency(c.amount, settings.currency)} off`}
                  </Text>
                </YStack>
              </Button>
            ))
          )}
          {coupon && (
            <Button
              variant="ghost"
              fullWidth
              onPress={() => {
                setCoupon(null);
                setCouponModalVisible(false);
              }}
            >
              <Text color="$error">Remove Coupon</Text>
            </Button>
          )}
        </YStack>
      </Modal>
    </XStack>
  );
}
