import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, ScrollView as RNScrollView } from 'react-native';
import { YStack, XStack, Text, ScrollView, Input as TamaguiInput, Separator } from 'tamagui';
import {
  Search, User, Ticket, Trash2, RefreshCw, Grid, AlertTriangle,
  ShoppingCart, CheckCircle, CreditCard, Percent, Tag, Package,
  ChevronRight, Clock, Star,
} from '@tamagui/lucide-icons';
import { Button, Card, Modal, Badge } from '@/components/ui';
import { ProductItem } from '@/components/product';
import { CartItem } from '@/components/order';
import { useCartStore, useSettingsStore, useSyncStore } from '@/store';
import { formatCurrency, generateLocalId, generateLocalOrderNumber, isCouponExpired } from '@/utils';
import { usePlatform, useProductGridColumns } from '@/hooks';
import { useProducts } from '@/features/products/hooks';
import { useCustomers } from '@/features/customers/hooks';
import { useActiveCoupons } from '@/features/coupons/hooks';
import { useCategories } from '@/features/categories/hooks';
import { post } from '@/services/api/client';
import type { MainTabScreenProps } from '@/navigation/types';
import type { Order, Category } from '@/types';

// Theme colors
const THEME = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  accent: '#8B5CF6',
};

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const {
    data: categoriesData,
    isLoading: categoriesLoading
  } = useCategories();

  // Extract data with fallbacks - API returns PaginatedResponse with data array
  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];
  const coupons = couponsData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category?.id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory, products]);

  // Get low stock products count for warnings
  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.quantity ?? p.stock ?? 0) < 10).length;
  }, [products]);

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
            productId: i.product.id,
            quantity: i.quantity,
          })),
          customerId: order.customer?.id,
          couponId: order.coupon?.id,
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
        {/* Enhanced Search Bar */}
        <XStack gap="$3" alignItems="center">
          <XStack
            flex={1}
            backgroundColor="$cardBackground"
            borderRadius="$4"
            paddingHorizontal="$4"
            paddingVertical="$2"
            alignItems="center"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$2"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.05}
            shadowRadius={8}
          >
            <Search size={20} color="$primary" />
            <TamaguiInput
              flex={1}
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              borderWidth={0}
              backgroundColor="transparent"
              fontSize="$3"
            />
            {searchQuery && (
              <YStack
                padding="$1"
                borderRadius="$2"
                backgroundColor="$backgroundHover"
                cursor="pointer"
                onPress={() => setSearchQuery('')}
              >
                <Text fontSize="$2" color="$colorSecondary">Clear</Text>
              </YStack>
            )}
          </XStack>
          <Button variant="secondary" size="sm" onPress={() => refetchProducts()}>
            <RefreshCw size={16} color={productsRefetching ? THEME.primary : '$color'} />
          </Button>
        </XStack>

        {/* Category Filter Bar - Enhanced Pills */}
        <YStack minHeight={48}>
          <RNScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8 }}
          >
            <XStack gap="$2" alignItems="center">
            <YStack
              paddingHorizontal="$4"
              paddingVertical="$2"
              borderRadius="$4"
              backgroundColor={selectedCategory === null ? THEME.primary : '$cardBackground'}
              borderWidth={1}
              borderColor={selectedCategory === null ? THEME.primary : '$borderColor'}
              cursor="pointer"
              onPress={() => setSelectedCategory(null)}
              hoverStyle={{ borderColor: THEME.primary }}
              pressStyle={{ transform: [{ scale: 0.97 }] }}
            >
              <XStack alignItems="center" gap="$2">
                <Grid size={14} color={selectedCategory === null ? 'white' : '$color'} />
                <Text fontSize="$2" fontWeight="600" color={selectedCategory === null ? 'white' : '$color'}>
                  All Products
                </Text>
                <YStack
                  backgroundColor={selectedCategory === null ? 'rgba(255,255,255,0.2)' : '$backgroundHover'}
                  paddingHorizontal="$2"
                  paddingVertical={2}
                  borderRadius="$2"
                >
                  <Text fontSize={10} fontWeight="700" color={selectedCategory === null ? 'white' : '$colorSecondary'}>
                    {products.length}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
            {categories.map((cat: Category) => {
              const categoryProductCount = products.filter((p) => p.category?.id === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <YStack
                  key={cat.id}
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                  borderRadius="$4"
                  backgroundColor={isSelected ? THEME.primary : '$cardBackground'}
                  borderWidth={1}
                  borderColor={isSelected ? THEME.primary : '$borderColor'}
                  cursor="pointer"
                  onPress={() => setSelectedCategory(cat.id)}
                  hoverStyle={{ borderColor: THEME.primary }}
                  pressStyle={{ transform: [{ scale: 0.97 }] }}
                >
                  <XStack alignItems="center" gap="$2">
                    <Text fontSize="$2" fontWeight="600" color={isSelected ? 'white' : '$color'}>
                      {cat.name}
                    </Text>
                    <YStack
                      backgroundColor={isSelected ? 'rgba(255,255,255,0.2)' : '$backgroundHover'}
                      paddingHorizontal="$2"
                      paddingVertical={2}
                      borderRadius="$2"
                    >
                      <Text fontSize={10} fontWeight="700" color={isSelected ? 'white' : '$colorSecondary'}>
                        {categoryProductCount}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
              );
            })}
          </XStack>
        </RNScrollView>
        </YStack>

        {/* Low Stock Warning - Enhanced */}
        {lowStockCount > 0 && (
          <XStack
            backgroundColor="#FEF3C7"
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderRadius="$3"
            alignItems="center"
            gap="$3"
            borderWidth={1}
            borderColor="#FCD34D"
          >
            <YStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="#FDE68A"
              alignItems="center"
              justifyContent="center"
            >
              <AlertTriangle size={18} color="#D97706" />
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$3" fontWeight="600" color="#92400E">
                Low Stock Alert
              </Text>
              <Text fontSize="$2" color="#B45309">
                {lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low - consider restocking
              </Text>
            </YStack>
          </XStack>
        )}

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
                size={isDesktop ? 'sm' : 'xs'}
              />
            )}
            contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
            columnWrapperStyle={numColumns > 1 ? { gap: 8 } : undefined}
            showsVerticalScrollIndicator={false}
            refreshing={productsRefetching}
            onRefresh={() => refetchProducts()}
          />
        )}
      </YStack>

      {/* Right Side - Cart */}
      <YStack
        width={isDesktop ? 420 : 340}
        backgroundColor="$cardBackground"
        borderLeftWidth={1}
        borderLeftColor="$borderColor"
      >
        {/* Enhanced Cart Header */}
        <YStack
          padding="$4"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          backgroundColor="$background"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$3">
              <YStack
                width={44}
                height={44}
                borderRadius={22}
                backgroundColor={THEME.primary}
                alignItems="center"
                justifyContent="center"
              >
                <ShoppingCart size={22} color="white" />
              </YStack>
              <YStack>
                <Text fontSize="$5" fontWeight="bold" color="$color">Current Order</Text>
                <Text fontSize="$2" color="$colorSecondary">
                  {items.length} {items.length === 1 ? 'item' : 'items'} in cart
                </Text>
              </YStack>
            </XStack>
            {items.length > 0 && (
              <YStack
                padding="$2"
                borderRadius="$2"
                backgroundColor="#FEE2E2"
                cursor="pointer"
                hoverStyle={{ backgroundColor: '#FECACA' }}
                pressStyle={{ transform: [{ scale: 0.95 }] }}
                onPress={clear}
              >
                <Trash2 size={18} color="#DC2626" />
              </YStack>
            )}
          </XStack>
        </YStack>

        {/* Customer & Coupon Selection - Enhanced */}
        <XStack padding="$3" gap="$2" borderBottomWidth={1} borderBottomColor="$borderColor">
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor={customer ? '#EEF2FF' : '$backgroundHover'}
            borderWidth={1}
            borderColor={customer ? THEME.primary : '$borderColor'}
            cursor="pointer"
            onPress={() => setCustomerModalVisible(true)}
            hoverStyle={{ borderColor: THEME.primary }}
            pressStyle={{ transform: [{ scale: 0.98 }] }}
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor={customer ? THEME.primary : '$borderColor'}
                alignItems="center"
                justifyContent="center"
              >
                <User size={16} color={customer ? 'white' : '$colorSecondary'} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$2" color="$colorSecondary">Customer</Text>
                <Text fontSize="$3" fontWeight="600" color={customer ? THEME.primary : '$color'} numberOfLines={1}>
                  {customer ? customer.name : 'Walk-in'}
                </Text>
              </YStack>
              <ChevronRight size={16} color="$colorSecondary" />
            </XStack>
          </YStack>

          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor={coupon ? '#ECFDF5' : '$backgroundHover'}
            borderWidth={1}
            borderColor={coupon ? THEME.success : '$borderColor'}
            cursor="pointer"
            onPress={() => setCouponModalVisible(true)}
            hoverStyle={{ borderColor: THEME.success }}
            pressStyle={{ transform: [{ scale: 0.98 }] }}
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor={coupon ? THEME.success : '$borderColor'}
                alignItems="center"
                justifyContent="center"
              >
                <Percent size={16} color={coupon ? 'white' : '$colorSecondary'} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$2" color="$colorSecondary">Discount</Text>
                <Text fontSize="$3" fontWeight="600" color={coupon ? THEME.success : '$color'} numberOfLines={1}>
                  {coupon ? coupon.code : 'Add Code'}
                </Text>
              </YStack>
              <ChevronRight size={16} color="$colorSecondary" />
            </XStack>
          </YStack>
        </XStack>

        {/* Cart Items */}
        <ScrollView flex={1} padding="$3">
          {items.length === 0 ? (
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10" gap="$4">
              <YStack
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor="$backgroundHover"
                alignItems="center"
                justifyContent="center"
              >
                <Package size={40} color="$colorSecondary" />
              </YStack>
              <YStack alignItems="center" gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color">Cart is Empty</Text>
                <Text fontSize="$2" color="$colorSecondary" textAlign="center">
                  Select products from the left to add them to your order
                </Text>
              </YStack>
            </YStack>
          ) : (
            <YStack gap="$2">
              {items.map((item, index) => (
                <CartItem key={`${item.product.id}-${index}`} item={item} />
              ))}
            </YStack>
          )}
        </ScrollView>

        {/* Enhanced Order Summary */}
        <YStack
          padding="$4"
          gap="$3"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$background"
        >
          {/* Summary Lines */}
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$colorSecondary">Subtotal</Text>
              <Text fontSize="$3" fontWeight="500" color="$color">
                {formatCurrency(getSubTotal(), settings.currency)}
              </Text>
            </XStack>

            {getDiscount() > 0 && (
              <XStack
                justifyContent="space-between"
                alignItems="center"
                backgroundColor="#ECFDF5"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$2"
                marginVertical="$1"
              >
                <XStack alignItems="center" gap="$2">
                  <Tag size={14} color={THEME.success} />
                  <Text fontSize="$3" color={THEME.success} fontWeight="500">
                    Discount Applied
                  </Text>
                </XStack>
                <Text fontSize="$3" fontWeight="600" color={THEME.success}>
                  -{formatCurrency(getDiscount(), settings.currency)}
                </Text>
              </XStack>
            )}

            {getVat() > 0 && (
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSecondary">
                  Tax ({settings.tax}%)
                </Text>
                <Text fontSize="$3" fontWeight="500" color="$color">
                  {formatCurrency(getVat(), settings.currency)}
                </Text>
              </XStack>
            )}
          </YStack>

          {/* Total */}
          <YStack
            backgroundColor={THEME.primary}
            padding="$4"
            borderRadius="$4"
            marginTop="$2"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <Text fontSize="$2" color="rgba(255,255,255,0.7)">Total Amount</Text>
                <Text fontSize="$7" fontWeight="bold" color="white">
                  {formatCurrency(getTotal(), settings.currency)}
                </Text>
              </YStack>
              <YStack alignItems="flex-end">
                <Text fontSize="$2" color="rgba(255,255,255,0.7)">Items</Text>
                <Text fontSize="$5" fontWeight="bold" color="white">
                  {items.reduce((sum, i) => sum + i.quantity, 0)}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Checkout Button */}
          <YStack
            backgroundColor={items.length === 0 ? '$borderColor' : THEME.success}
            paddingVertical="$4"
            paddingHorizontal="$6"
            borderRadius="$4"
            alignItems="center"
            justifyContent="center"
            cursor={items.length === 0 ? 'not-allowed' : 'pointer'}
            opacity={items.length === 0 ? 0.5 : 1}
            hoverStyle={items.length > 0 ? { opacity: 0.9, transform: [{ scale: 1.01 }] } : {}}
            pressStyle={items.length > 0 ? { transform: [{ scale: 0.98 }] } : {}}
            onPress={items.length > 0 ? handleCheckout : undefined}
          >
            {loading ? (
              <XStack alignItems="center" gap="$3">
                <ActivityIndicator color="white" size="small" />
                <Text color="white" fontWeight="700" fontSize="$4">Processing...</Text>
              </XStack>
            ) : (
              <XStack alignItems="center" gap="$3">
                <CheckCircle size={22} color="white" />
                <Text color="white" fontWeight="700" fontSize="$4">
                  Complete Sale
                </Text>
              </XStack>
            )}
          </YStack>

          {/* Payment Method Hint */}
          <XStack justifyContent="center" alignItems="center" gap="$2" paddingTop="$1">
            <CreditCard size={14} color="$colorSecondary" />
            <Text fontSize="$2" color="$colorSecondary">
              Cash or Card accepted
            </Text>
          </XStack>
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
