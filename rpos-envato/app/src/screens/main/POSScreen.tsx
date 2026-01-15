import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, ScrollView as RNScrollView } from 'react-native';
import { YStack, XStack, Text, ScrollView, Input as TamaguiInput, Separator } from 'tamagui';
import {
  Search, User, Ticket, Trash2, RefreshCw, Grid, AlertTriangle,
  ShoppingCart, CheckCircle, CreditCard, Package,
  ChevronRight,
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
import { useAppSettings } from '@/features/settings/hooks';
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

// US State Tax Rates (auto-selected based on business profile)
const US_STATE_TAX_RATES: Record<string, { name: string; rate: number }> = {
  'AL': { name: 'Alabama', rate: 4.0 },
  'AK': { name: 'Alaska', rate: 0 },
  'AZ': { name: 'Arizona', rate: 5.6 },
  'AR': { name: 'Arkansas', rate: 6.5 },
  'CA': { name: 'California', rate: 7.25 },
  'CO': { name: 'Colorado', rate: 2.9 },
  'CT': { name: 'Connecticut', rate: 6.35 },
  'DE': { name: 'Delaware', rate: 0 },
  'FL': { name: 'Florida', rate: 6.0 },
  'GA': { name: 'Georgia', rate: 4.0 },
  'HI': { name: 'Hawaii', rate: 4.0 },
  'ID': { name: 'Idaho', rate: 6.0 },
  'IL': { name: 'Illinois', rate: 6.25 },
  'IN': { name: 'Indiana', rate: 7.0 },
  'IA': { name: 'Iowa', rate: 6.0 },
  'KS': { name: 'Kansas', rate: 6.5 },
  'KY': { name: 'Kentucky', rate: 6.0 },
  'LA': { name: 'Louisiana', rate: 4.45 },
  'ME': { name: 'Maine', rate: 5.5 },
  'MD': { name: 'Maryland', rate: 6.0 },
  'MA': { name: 'Massachusetts', rate: 6.25 },
  'MI': { name: 'Michigan', rate: 6.0 },
  'MN': { name: 'Minnesota', rate: 6.875 },
  'MS': { name: 'Mississippi', rate: 7.0 },
  'MO': { name: 'Missouri', rate: 4.225 },
  'MT': { name: 'Montana', rate: 0 },
  'NE': { name: 'Nebraska', rate: 5.5 },
  'NV': { name: 'Nevada', rate: 6.85 },
  'NH': { name: 'New Hampshire', rate: 0 },
  'NJ': { name: 'New Jersey', rate: 6.625 },
  'NM': { name: 'New Mexico', rate: 5.125 },
  'NY': { name: 'New York', rate: 4.0 },
  'NC': { name: 'North Carolina', rate: 4.75 },
  'ND': { name: 'North Dakota', rate: 5.0 },
  'OH': { name: 'Ohio', rate: 5.75 },
  'OK': { name: 'Oklahoma', rate: 4.5 },
  'OR': { name: 'Oregon', rate: 0 },
  'PA': { name: 'Pennsylvania', rate: 6.0 },
  'RI': { name: 'Rhode Island', rate: 7.0 },
  'SC': { name: 'South Carolina', rate: 6.0 },
  'SD': { name: 'South Dakota', rate: 4.5 },
  'TN': { name: 'Tennessee', rate: 7.0 },
  'TX': { name: 'Texas', rate: 6.25 },
  'UT': { name: 'Utah', rate: 6.1 },
  'VT': { name: 'Vermont', rate: 6.0 },
  'VA': { name: 'Virginia', rate: 5.3 },
  'WA': { name: 'Washington', rate: 6.5 },
  'WV': { name: 'West Virginia', rate: 6.0 },
  'WI': { name: 'Wisconsin', rate: 5.0 },
  'WY': { name: 'Wyoming', rate: 4.0 },
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  // Fetch business settings from API
  const { data: appSettings } = useAppSettings();

  // Auto-calculate tax based on business location (US state-based)
  const taxRate = useMemo(() => {
    // If business has a US state, use state-based tax rate
    const businessState = (appSettings as any)?.state;
    const businessCountry = (appSettings as any)?.country || 'US';

    if (businessCountry === 'US' && businessState && US_STATE_TAX_RATES[businessState]) {
      return US_STATE_TAX_RATES[businessState].rate;
    }

    // Fall back to stored tax rate from business settings
    return appSettings?.tax ?? settings.tax ?? 0;
  }, [appSettings, settings.tax]);

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
  // Filter out test/regression categories
  const categories = (categoriesData?.data ?? []).filter(
    (c: Category) => !c.name.toLowerCase().includes('test') && !c.name.toLowerCase().includes('regression')
  );

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
          paymentMethod,
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

        {/* Category Filter Pills */}
        <XStack
          gap={8}
          paddingVertical={8}
          paddingHorizontal={4}
          flexWrap="wrap"
        >
          {/* All Products Pill */}
          <YStack
            paddingHorizontal={16}
            paddingVertical={8}
            borderRadius={20}
            backgroundColor={!selectedCategory ? THEME.primary : '#F3F4F6'}
            cursor="pointer"
            onPress={() => setSelectedCategory(null)}
            hoverStyle={{ opacity: 0.9 }}
            pressStyle={{ transform: [{ scale: 0.97 }] }}
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color={!selectedCategory ? 'white' : '#374151'}
            >
              All Products
            </Text>
          </YStack>

          {/* Category Pills */}
          {categories.map((cat: Category) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <XStack
                key={cat.id}
                paddingHorizontal={16}
                paddingVertical={8}
                borderRadius={20}
                backgroundColor={isSelected ? THEME.primary : '#F3F4F6'}
                cursor="pointer"
                onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                hoverStyle={{ opacity: 0.9 }}
                pressStyle={{ transform: [{ scale: 0.97 }] }}
                alignItems="center"
                gap={6}
              >
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={isSelected ? 'white' : '#374151'}
                >
                  {cat.name}
                </Text>
                {/* X to clear selection */}
                {isSelected && (
                  <Text fontSize={14} fontWeight="700" color="white">×</Text>
                )}
              </XStack>
            );
          })}
        </XStack>

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
            renderItem={({ item }) => (
              <ProductItem
                product={item}
                onPress={(p) => addItem(p)}
                size="compact"
              />
            )}
            contentContainerStyle={{ gap: 4, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            refreshing={productsRefetching}
            onRefresh={() => refetchProducts()}
          />
        )}
      </YStack>

      {/* Right Side - Cart */}
      <YStack
        width={isDesktop ? 360 : 300}
        backgroundColor="$cardBackground"
        borderLeftWidth={1}
        borderLeftColor="$borderColor"
      >
        {/* Compact Cart Header */}
        <XStack
          padding="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          backgroundColor="$background"
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap="$2">
            <ShoppingCart size={18} color={THEME.primary} />
            <Text fontSize="$4" fontWeight="600" color="$color">Order</Text>
            <Badge variant="primary" size="sm">{items.length}</Badge>
          </XStack>
          {items.length > 0 && (
            <YStack
              padding="$1"
              borderRadius="$1"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#FEE2E2' }}
              onPress={clear}
            >
              <Trash2 size={16} color="#DC2626" />
            </YStack>
          )}
        </XStack>

        {/* Compact Customer & Coupon Selection */}
        <XStack padding="$2" gap="$2" borderBottomWidth={1} borderBottomColor="$borderColor">
          <XStack
            flex={1}
            padding="$2"
            borderRadius="$2"
            backgroundColor={customer ? '#EEF2FF' : '$backgroundHover'}
            borderWidth={1}
            borderColor={customer ? THEME.primary : 'transparent'}
            cursor="pointer"
            onPress={() => setCustomerModalVisible(true)}
            alignItems="center"
            gap="$2"
          >
            <User size={14} color={customer ? THEME.primary : '$colorSecondary'} />
            <Text fontSize="$2" fontWeight="500" color={customer ? THEME.primary : '$color'} numberOfLines={1} flex={1}>
              {customer ? customer.name : 'Walk-in'}
            </Text>
            <ChevronRight size={12} color="$colorSecondary" />
          </XStack>

          <XStack
            flex={1}
            padding="$2"
            borderRadius="$2"
            backgroundColor={coupon ? '#ECFDF5' : '$backgroundHover'}
            borderWidth={1}
            borderColor={coupon ? THEME.success : 'transparent'}
            cursor="pointer"
            onPress={() => setCouponModalVisible(true)}
            alignItems="center"
            gap="$2"
          >
            <Ticket size={14} color={coupon ? THEME.success : '$colorSecondary'} />
            <Text fontSize="$2" fontWeight="500" color={coupon ? THEME.success : '$color'} numberOfLines={1} flex={1}>
              {coupon ? coupon.code : 'Add Coupon'}
            </Text>
            <ChevronRight size={12} color="$colorSecondary" />
          </XStack>
        </XStack>

        {/* Cart Items */}
        <ScrollView flex={1} padding="$2">
          {items.length === 0 ? (
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$6" gap="$2">
              <Package size={32} color="$colorSecondary" />
              <Text fontSize="$3" color="$colorSecondary" textAlign="center">
                Tap products to add
              </Text>
            </YStack>
          ) : (
            <YStack gap="$1">
              {items.map((item, index) => (
                <CartItem key={`${item.product.id}-${index}`} item={item} />
              ))}
            </YStack>
          )}
        </ScrollView>

        {/* Compact Order Summary */}
        <YStack
          padding="$3"
          gap="$2"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$background"
        >
          {/* Summary Lines */}
          <YStack gap={6}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$2" color="$colorSecondary">Subtotal</Text>
              <Text fontSize="$2" fontWeight="500">{formatCurrency(getSubTotal(), settings.currency)}</Text>
            </XStack>

            {getDiscount() > 0 && (
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$2" color={THEME.success}>Discount</Text>
                <Text fontSize="$2" fontWeight="500" color={THEME.success}>
                  -{formatCurrency(getDiscount(), settings.currency)}
                </Text>
              </XStack>
            )}

            {taxRate > 0 && (
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$2" color="$colorSecondary">Tax ({taxRate}%)</Text>
                <Text fontSize="$2" fontWeight="500">
                  {formatCurrency((getSubTotal() - getDiscount()) * taxRate / 100, settings.currency)}
                </Text>
              </XStack>
            )}
          </YStack>

          <Separator />

          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$4" fontWeight="700">Total</Text>
            <Text fontSize="$5" fontWeight="700" color={THEME.primary}>
              {formatCurrency(
                getSubTotal() - getDiscount() + ((getSubTotal() - getDiscount()) * taxRate / 100),
                settings.currency
              )}
            </Text>
          </XStack>

          {/* Payment Method Selection */}
          <XStack gap="$2">
            <YStack
              flex={1}
              padding="$2"
              borderRadius="$2"
              backgroundColor={paymentMethod === 'card' ? THEME.primary : '$backgroundHover'}
              alignItems="center"
              cursor="pointer"
              borderWidth={1}
              borderColor={paymentMethod === 'card' ? THEME.primary : 'transparent'}
              hoverStyle={{ backgroundColor: paymentMethod === 'card' ? THEME.primary : '#EEF2FF' }}
              onPress={() => setPaymentMethod('card')}
            >
              <CreditCard size={16} color={paymentMethod === 'card' ? 'white' : THEME.primary} />
              <Text fontSize="$1" fontWeight="500" color={paymentMethod === 'card' ? 'white' : THEME.primary}>Card</Text>
            </YStack>
            <YStack
              flex={1}
              padding="$2"
              borderRadius="$2"
              backgroundColor={paymentMethod === 'cash' ? THEME.success : '$backgroundHover'}
              alignItems="center"
              cursor="pointer"
              borderWidth={1}
              borderColor={paymentMethod === 'cash' ? THEME.success : 'transparent'}
              hoverStyle={{ backgroundColor: paymentMethod === 'cash' ? THEME.success : '#ECFDF5' }}
              onPress={() => setPaymentMethod('cash')}
            >
              <Text fontSize="$3" color={paymentMethod === 'cash' ? 'white' : THEME.success}>$</Text>
              <Text fontSize="$1" fontWeight="500" color={paymentMethod === 'cash' ? 'white' : THEME.success}>Cash</Text>
            </YStack>
          </XStack>

          {/* Checkout Button */}
          <YStack
            backgroundColor={items.length === 0 ? '$borderColor' : THEME.primary}
            paddingVertical="$3"
            borderRadius="$3"
            alignItems="center"
            justifyContent="center"
            cursor={items.length === 0 ? 'not-allowed' : 'pointer'}
            opacity={items.length === 0 ? 0.5 : 1}
            hoverStyle={items.length > 0 ? { opacity: 0.9 } : {}}
            pressStyle={items.length > 0 ? { transform: [{ scale: 0.98 }] } : {}}
            onPress={items.length > 0 ? handleCheckout : undefined}
          >
            {loading ? (
              <XStack alignItems="center" gap="$2">
                <ActivityIndicator color="white" size="small" />
                <Text color="white" fontWeight="600" fontSize="$3">Processing...</Text>
              </XStack>
            ) : (
              <XStack alignItems="center" gap="$2">
                <CheckCircle size={18} color="white" />
                <Text color="white" fontWeight="600" fontSize="$3">
                  Complete Sale
                </Text>
              </XStack>
            )}
          </YStack>
        </YStack>
      </YStack>

      {/* Customer Selection Modal */}
      <Modal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        title="Select Customer"
        size="sm"
      >
        <YStack gap="$2" maxHeight={400}>
          {/* Walk-in option */}
          <XStack
            padding="$2"
            borderRadius="$2"
            backgroundColor={!customer ? THEME.primary : '$backgroundHover'}
            cursor="pointer"
            alignItems="center"
            gap="$2"
            onPress={() => {
              setCustomer(null);
              setCustomerModalVisible(false);
            }}
          >
            <User size={16} color={!customer ? 'white' : '$colorSecondary'} />
            <Text fontSize="$3" fontWeight="500" color={!customer ? 'white' : '$color'}>Walk-in Customer</Text>
          </XStack>

          <Separator />

          {customersLoading ? (
            <YStack padding="$3" alignItems="center">
              <ActivityIndicator size="small" />
            </YStack>
          ) : customers.length === 0 ? (
            <Text color="$colorSecondary" textAlign="center" padding="$3" fontSize="$2">
              No saved customers
            </Text>
          ) : (
            <ScrollView maxHeight={280}>
              <YStack gap="$1">
                {customers.map((c) => (
                  <XStack
                    key={c.id}
                    padding="$2"
                    borderRadius="$2"
                    backgroundColor={customer?.id === c.id ? '#EEF2FF' : 'transparent'}
                    borderWidth={1}
                    borderColor={customer?.id === c.id ? THEME.primary : 'transparent'}
                    cursor="pointer"
                    alignItems="center"
                    gap="$2"
                    hoverStyle={{ backgroundColor: '$backgroundHover' }}
                    onPress={() => {
                      setCustomer(c);
                      setCustomerModalVisible(false);
                    }}
                  >
                    <YStack
                      width={32}
                      height={32}
                      borderRadius={16}
                      backgroundColor={customer?.id === c.id ? THEME.primary : '$borderColor'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="$2" fontWeight="600" color={customer?.id === c.id ? 'white' : '$colorSecondary'}>
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize="$3" fontWeight="500" color="$color">{c.name}</Text>
                      {c.phone && <Text fontSize="$1" color="$colorSecondary">{c.phone}</Text>}
                    </YStack>
                    {customer?.id === c.id && <CheckCircle size={16} color={THEME.primary} />}
                  </XStack>
                ))}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      </Modal>

      {/* Coupon Selection Modal */}
      <Modal
        visible={couponModalVisible}
        onClose={() => setCouponModalVisible(false)}
        title="Apply Coupon"
        size="sm"
      >
        <YStack gap="$2" maxHeight={400}>
          {/* No coupon option */}
          {coupon && (
            <>
              <XStack
                padding="$2"
                borderRadius="$2"
                backgroundColor="$backgroundHover"
                cursor="pointer"
                alignItems="center"
                gap="$2"
                onPress={() => {
                  setCoupon(null);
                  setCouponModalVisible(false);
                }}
              >
                <Trash2 size={14} color="$error" />
                <Text fontSize="$2" color="$error">Remove Coupon</Text>
              </XStack>
              <Separator />
            </>
          )}

          {couponsLoading ? (
            <YStack padding="$3" alignItems="center">
              <ActivityIndicator size="small" />
            </YStack>
          ) : validCoupons.length === 0 ? (
            <YStack padding="$4" alignItems="center" gap="$2">
              <Ticket size={32} color="$colorSecondary" />
              <Text color="$colorSecondary" textAlign="center" fontSize="$2">
                No active coupons available
              </Text>
            </YStack>
          ) : (
            <ScrollView maxHeight={300}>
              <YStack gap="$1">
                {validCoupons.map((c) => (
                  <XStack
                    key={c.id}
                    padding="$2"
                    borderRadius="$2"
                    backgroundColor={coupon?.id === c.id ? '#ECFDF5' : 'transparent'}
                    borderWidth={1}
                    borderColor={coupon?.id === c.id ? THEME.success : 'transparent'}
                    cursor="pointer"
                    alignItems="center"
                    justifyContent="space-between"
                    hoverStyle={{ backgroundColor: '$backgroundHover' }}
                    onPress={() => {
                      setCoupon(c);
                      setCouponModalVisible(false);
                    }}
                  >
                    <YStack>
                      <Text fontSize="$3" fontWeight="600" color={coupon?.id === c.id ? THEME.success : '$color'}>
                        {c.code}
                      </Text>
                      <Text fontSize="$1" color="$colorSecondary">{c.name}</Text>
                    </YStack>
                    <Badge variant={coupon?.id === c.id ? 'success' : 'default'} size="sm">
                      {c.type === 'percentage' ? `${c.amount}%` : formatCurrency(c.amount, settings.currency)}
                    </Badge>
                  </XStack>
                ))}
              </YStack>
            </ScrollView>
          )}
        </YStack>
      </Modal>

    </XStack>
  );
}
