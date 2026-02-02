import React from 'react';
import { YStack, XStack, Text, ScrollView, Spinner, Image } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl } from 'react-native';
import {
  MapPin,
  Clock,
  ChevronRight,
  Package,
  Star,
  UtensilsCrossed,
  ClipboardList,
} from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useCustomerStore } from '@/store/customerStore';
import { useAuthStore } from '@/store';
import {
  useStoreInfo,
  useFeaturedProducts,
  useActiveOrder,
} from '@/features/customer/hooks';
import { useTrackingInfo } from '@/features/driver/hooks';
import type { CustomerTabScreenProps } from '@/navigation/types';
import type { Product, Order } from '@/types';
import { DELIVERY_STATUS_TEXT, DELIVERY_STATUS_COLORS } from '@/types';

// Product Card for Featured Items
function FeaturedProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <Card
      width={160}
      marginRight="$3"
      padding="$2"
      pressStyle={{ scale: 0.98 }}
      onPress={onPress}
    >
      {product.images?.[0] ? (
        <Image
          source={{ uri: product.images[0] }}
          width={144}
          height={100}
          borderRadius="$2"
          backgroundColor="$backgroundPress"
        />
      ) : (
        <YStack
          width={144}
          height={100}
          borderRadius="$2"
          backgroundColor="$backgroundPress"
          alignItems="center"
          justifyContent="center"
        >
          <Package size={32} color="$colorSecondary" />
        </YStack>
      )}
      <YStack marginTop="$2">
        <Text fontSize={14} fontWeight="600" numberOfLines={1}>
          {product.name}
        </Text>
        <Text fontSize={16} fontWeight="bold" color="$primary" marginTop="$1">
          ${product.sellingPrice.toFixed(2)}
        </Text>
      </YStack>
    </Card>
  );
}

// Active Order Tracking Card
function ActiveOrderCard({
  order,
  onPress,
}: {
  order: Order;
  onPress: () => void;
}) {
  const status = order.status || 'pending';
  const statusColor = DELIVERY_STATUS_COLORS[status as keyof typeof DELIVERY_STATUS_COLORS] || '$primary';
  const statusText = DELIVERY_STATUS_TEXT[status as keyof typeof DELIVERY_STATUS_TEXT] || status;

  return (
    <Card padding="$4" pressStyle={{ scale: 0.98 }} onPress={onPress}>
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <YStack>
          <Text fontSize={12} color="$colorSecondary">
            Order #{order.number || order.id.slice(-6)}
          </Text>
          <Text fontSize={16} fontWeight="600" marginTop="$1">
            {statusText}
          </Text>
        </YStack>
        <YStack
          backgroundColor={statusColor}
          paddingHorizontal="$3"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Text color="white" fontSize={12} fontWeight="600">
            Track Order
          </Text>
        </YStack>
      </XStack>

      {/* Progress indicator */}
      <XStack gap="$1" marginBottom="$2">
        {['pending', 'processing', 'out_for_delivery', 'delivered'].map((step, index) => {
          const isActive =
            ['pending', 'processing', 'out_for_delivery', 'delivered'].indexOf(status) >= index;
          return (
            <YStack
              key={step}
              flex={1}
              height={4}
              backgroundColor={isActive ? '$primary' : '$borderColor'}
              borderRadius={2}
            />
          );
        })}
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} color="$colorSecondary">
          {order.items?.length || 0} items
        </Text>
        <XStack alignItems="center">
          <Text fontSize={13} color="$colorSecondary">
            View Details
          </Text>
          <ChevronRight size={16} color="$colorSecondary" />
        </XStack>
      </XStack>
    </Card>
  );
}

export default function CustomerHomeScreen({
  navigation,
}: CustomerTabScreenProps<'CustomerHome'>) {
  const { user } = useAuthStore();
  const { activeOrder, deliveryAddress, storeInfo: localStoreInfo } = useCustomerStore();
  const addToCart = useCustomerStore((s) => s.addToCart);

  const {
    data: storeInfo,
    isLoading: storeLoading,
    refetch: refetchStore,
    isRefetching: isRefetchingStore,
  } = useStoreInfo();

  const {
    data: featuredProducts,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: isRefetchingProducts,
  } = useFeaturedProducts();

  const { data: currentActiveOrder, isLoading: orderLoading } = useActiveOrder();

  const isRefreshing = isRefetchingStore || isRefetchingProducts;

  const handleRefresh = () => {
    refetchStore();
    refetchProducts();
  };

  const handleProductPress = (product: Product) => {
    // Navigate to product detail or add to cart
    addToCart(product, 1);
  };

  const handleOrderPress = () => {
    if (currentActiveOrder) {
      // Navigate to order tracking
      navigation.navigate('CustomerOrders');
    }
  };

  const handleBrowseMenu = () => {
    navigation.navigate('Menu', {});
  };

  const store = storeInfo || localStoreInfo;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        flex={1}
        backgroundColor="$background"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack padding="$4" gap="$4">
          {/* Header */}
          <YStack>
            <Text fontSize={14} color="$colorSecondary">
              Welcome back,
            </Text>
            <Text fontSize={24} fontWeight="bold">
              {user?.firstName || 'Guest'}
            </Text>
          </YStack>

          {/* Delivery Address */}
          <Card padding="$3" pressStyle={{ opacity: 0.8 }}>
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
              <ChevronRight size={20} color="$colorSecondary" />
            </XStack>
          </Card>

          {/* Store Info */}
          {store && (
            <Card padding="$4">
              <XStack alignItems="center" gap="$3">
                <YStack
                  width={60}
                  height={60}
                  backgroundColor="$primary"
                  borderRadius="$3"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontSize={24} fontWeight="bold">
                    {store.name.charAt(0)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={18} fontWeight="bold">
                    {store.name}
                  </Text>
                  <XStack alignItems="center" gap="$2" marginTop="$1">
                    <Clock size={14} color="$colorSecondary" />
                    <Text fontSize={13} color="$colorSecondary">
                      {store.isOpen ? 'Open Now' : 'Closed'}
                    </Text>
                    {store.hours && (
                      <Text fontSize={13} color="$colorSecondary">
                        {store.hours}
                      </Text>
                    )}
                  </XStack>
                </YStack>
                <YStack
                  backgroundColor={store.isOpen ? '$successBackground' : '$errorBackground'}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text
                    color={store.isOpen ? '$success' : '$error'}
                    fontSize={11}
                    fontWeight="600"
                  >
                    {store.isOpen ? 'OPEN' : 'CLOSED'}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Active Order */}
          {currentActiveOrder && (
            <YStack>
              <Text fontSize={16} fontWeight="600" marginBottom="$2">
                Active Order
              </Text>
              <ActiveOrderCard order={currentActiveOrder} onPress={handleOrderPress} />
            </YStack>
          )}

          {/* Featured Products */}
          <YStack>
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text fontSize={16} fontWeight="600">
                Featured Items
              </Text>
              <Button variant="link" size="sm" onPress={handleBrowseMenu}>
                <Text color="$primary" fontSize={14}>
                  View All
                </Text>
              </Button>
            </XStack>

            {productsLoading ? (
              <YStack height={180} alignItems="center" justifyContent="center">
                <Spinner />
              </YStack>
            ) : featuredProducts && featuredProducts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack>
                  {featuredProducts.map((product) => (
                    <FeaturedProductCard
                      key={product.id}
                      product={product}
                      onPress={() => handleProductPress(product)}
                    />
                  ))}
                </XStack>
              </ScrollView>
            ) : (
              <Card padding="$6" alignItems="center">
                <Package size={32} color="$colorSecondary" />
                <Text color="$colorSecondary" marginTop="$2">
                  No featured items available
                </Text>
              </Card>
            )}
          </YStack>

          {/* Quick Actions */}
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="600">
              Quick Actions
            </Text>
            <XStack gap="$3">
              <Card
                flex={1}
                padding="$4"
                alignItems="center"
                pressStyle={{ scale: 0.98 }}
                onPress={handleBrowseMenu}
              >
                <UtensilsCrossed size={32} color="$primary" />
                <Text fontSize={14} fontWeight="500" marginTop="$2">
                  Browse Menu
                </Text>
              </Card>
              <Card
                flex={1}
                padding="$4"
                alignItems="center"
                pressStyle={{ scale: 0.98 }}
                onPress={() => navigation.navigate('CustomerOrders')}
              >
                <ClipboardList size={32} color="$primary" />
                <Text fontSize={14} fontWeight="500" marginTop="$2">
                  My Orders
                </Text>
              </Card>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
