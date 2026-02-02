import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Spinner, Image, Input } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Package, Plus, Minus, Filter } from '@tamagui/lucide-icons';
import { Card, Button } from '@/components/ui';
import { useCustomerStore } from '@/store/customerStore';
import { useMenuCategories, useMenuProducts } from '@/features/customer/hooks';
import type { CustomerTabScreenProps } from '@/navigation/types';
import type { Product, Category } from '@/types';

// Category Filter Chip
function CategoryChip({
  category,
  isSelected,
  onPress,
}: {
  category: Category | { id: string; name: string };
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={isSelected ? 'primary' : 'secondary'}
      marginRight="$2"
      onPress={onPress}
    >
      <Text color={isSelected ? 'white' : '$color'} fontSize={13}>
        {category.name}
      </Text>
    </Button>
  );
}

// Product Card with Add to Cart
function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <Card padding="$3" marginBottom="$3" marginHorizontal="$4">
      <XStack gap="$3">
        {product.images?.[0] ? (
          <Image
            source={{ uri: product.images[0] }}
            width={80}
            height={80}
            borderRadius="$2"
            backgroundColor="$backgroundPress"
          />
        ) : (
          <YStack
            width={80}
            height={80}
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
            {product.name}
          </Text>
          {product.description && (
            <Text fontSize={12} color="$colorSecondary" numberOfLines={2} marginTop="$1">
              {product.description}
            </Text>
          )}
          <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
            <Text fontSize={16} fontWeight="bold" color="$primary">
              ${product.sellingPrice.toFixed(2)}
            </Text>

            {quantity === 0 ? (
              <Button size="sm" onPress={onAdd}>
                <Plus size={16} color="white" />
                <Text color="white" marginLeft="$1">
                  Add
                </Text>
              </Button>
            ) : (
              <XStack alignItems="center" gap="$2">
                <Button size="icon" variant="secondary" onPress={onRemove}>
                  <Minus size={16} />
                </Button>
                <Text fontSize={16} fontWeight="600" minWidth={24} textAlign="center">
                  {quantity}
                </Text>
                <Button size="icon" onPress={onAdd}>
                  <Plus size={16} color="white" />
                </Button>
              </XStack>
            )}
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}

export default function MenuScreen({ navigation, route }: CustomerTabScreenProps<'Menu'>) {
  const initialCategoryId = route.params?.categoryId;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategoryId || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const { cartItems, addToCart, removeFromCart, updateCartItemQuantity } = useCustomerStore();

  const {
    data: categories,
    isLoading: categoriesLoading,
  } = useMenuCategories();

  const {
    data: products,
    isLoading: productsLoading,
    refetch,
    isRefetching,
  } = useMenuProducts({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find((i) => i.product.id === productId);
    return item?.quantity || 0;
  };

  const handleAdd = (product: Product) => {
    addToCart(product, 1);
  };

  const handleRemove = (productId: string) => {
    const currentQty = getCartQuantity(productId);
    if (currentQty <= 1) {
      removeFromCart(productId);
    } else {
      updateCartItemQuantity(productId, currentQty - 1);
    }
  };

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        quantity={getCartQuantity(item.id)}
        onAdd={() => handleAdd(item)}
        onRemove={() => handleRemove(item.id)}
      />
    ),
    [cartItems]
  );

  const renderEmpty = useCallback(() => {
    if (productsLoading) return null;
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
        <Package size={48} color="$colorSecondary" />
        <Text fontSize={16} fontWeight="600" marginTop="$3">
          No products found
        </Text>
        <Text fontSize={14} color="$colorSecondary" textAlign="center" marginTop="$1">
          {searchQuery
            ? 'Try a different search term'
            : 'Check back later for new items'}
        </Text>
      </YStack>
    );
  }, [productsLoading, searchQuery]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <YStack padding="$4" paddingBottom="$2">
          <Text fontSize={24} fontWeight="bold" marginBottom="$3">
            Menu
          </Text>

          {/* Search Bar */}
          <XStack
            backgroundColor="$backgroundStrong"
            borderRadius="$3"
            paddingHorizontal="$3"
            alignItems="center"
          >
            <Search size={20} color="$colorSecondary" />
            <Input
              flex={1}
              placeholder="Search menu..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              borderWidth={0}
              backgroundColor="transparent"
              paddingLeft="$2"
            />
          </XStack>
        </YStack>

        {/* Category Filters */}
        {categories && categories.length > 0 && (
          <YStack paddingLeft="$4" marginBottom="$2">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: 'all', name: 'All' }, ...categories]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CategoryChip
                  category={item}
                  isSelected={
                    item.id === 'all'
                      ? selectedCategory === null
                      : selectedCategory === item.id
                  }
                  onPress={() =>
                    setSelectedCategory(item.id === 'all' ? null : item.id)
                  }
                />
              )}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          </YStack>
        )}

        {/* Products List */}
        {productsLoading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" />
          </YStack>
        ) : (
          <FlatList
            data={products || []}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            contentContainerStyle={{ paddingTop: 8, flexGrow: 1 }}
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
