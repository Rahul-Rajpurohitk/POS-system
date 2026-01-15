import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Pressable, Image } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { Search, Plus, Filter, RefreshCw, Eye, Edit, Trash2, Package } from '@tamagui/lucide-icons';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useProducts } from '@/features/products/hooks';
import type { ProductScreenProps } from '@/navigation/types';
import type { Product } from '@/types';

// Helper to get stock status badge variant
const getStockBadgeVariant = (quantity: number): BadgeVariant => {
  if (quantity <= 0) return 'error';
  if (quantity < 10) return 'warning';
  return 'success';
};

// Helper to get stock status text
const getStockStatusText = (quantity: number): string => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity < 10) return 'Low Stock';
  return 'In Stock';
};

// Table header component
function TableHeader({ isDesktop }: { isDesktop: boolean }) {
  return (
    <XStack
      backgroundColor="$backgroundHover"
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Text width={50} fontSize="$2" fontWeight="600" color="$colorSecondary"></Text>
      <Text flex={1} fontSize="$2" fontWeight="600" color="$colorSecondary">Product</Text>
      {isDesktop && (
        <Text width={100} fontSize="$2" fontWeight="600" color="$colorSecondary">SKU</Text>
      )}
      <Text width={100} fontSize="$2" fontWeight="600" color="$colorSecondary">Category</Text>
      <Text width={80} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="center">Stock</Text>
      {isDesktop && (
        <Text width={90} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="right">Cost</Text>
      )}
      <Text width={90} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="right">Price</Text>
      {isDesktop && (
        <Text width={90} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="right">Profit</Text>
      )}
      <Text width={80} fontSize="$2" fontWeight="600" color="$colorSecondary" textAlign="center">Actions</Text>
    </XStack>
  );
}

// Table row component
function TableRow({
  product,
  isDesktop,
  onView,
  onEdit
}: {
  product: Product;
  isDesktop: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  const { settings } = useSettingsStore();
  const stockQty = product.quantity ?? product.stock ?? 0;
  const profit = (product.sellingPrice || 0) - (product.purchasePrice || 0);
  const profitMargin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;
  const categoryName = product.category?.name || 'Uncategorized';
  const imageUrl = product.images?.[0]?.url || product.images?.[0];

  return (
    <Pressable onPress={onView}>
      {({ pressed }) => (
        <XStack
          paddingVertical="$2"
          paddingHorizontal="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          backgroundColor={pressed ? '$backgroundHover' : '$cardBackground'}
          alignItems="center"
        >
          {/* Product Image */}
          <YStack width={50} alignItems="center">
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 40, height: 40, borderRadius: 4 }}
                resizeMode="cover"
              />
            ) : (
              <YStack
                width={40}
                height={40}
                backgroundColor="$backgroundHover"
                borderRadius="$1"
                justifyContent="center"
                alignItems="center"
              >
                <Package size={20} color="$colorSecondary" />
              </YStack>
            )}
          </YStack>

          {/* Product Name */}
          <YStack flex={1}>
            <Text fontSize="$3" fontWeight="500" numberOfLines={1}>{product.name}</Text>
            {!isDesktop && (
              <Text fontSize="$2" color="$colorSecondary" numberOfLines={1}>
                SKU: {product.sku || 'N/A'}
              </Text>
            )}
          </YStack>

          {/* SKU */}
          {isDesktop && (
            <Text width={100} fontSize="$2" color="$colorSecondary" numberOfLines={1}>
              {product.sku || 'N/A'}
            </Text>
          )}

          {/* Category */}
          <XStack width={100}>
            <Badge variant="info" size="sm">
              {categoryName.length > 10 ? categoryName.substring(0, 10) + '...' : categoryName}
            </Badge>
          </XStack>

          {/* Stock */}
          <XStack width={80} justifyContent="center">
            <Badge variant={getStockBadgeVariant(stockQty)} size="sm">
              {stockQty}
            </Badge>
          </XStack>

          {/* Cost */}
          {isDesktop && (
            <Text width={90} fontSize="$2" color="$colorSecondary" textAlign="right">
              {formatCurrency(product.purchasePrice, settings.currency)}
            </Text>
          )}

          {/* Price */}
          <Text width={90} fontSize="$3" fontWeight="600" textAlign="right" color="$accent">
            {formatCurrency(product.sellingPrice, settings.currency)}
          </Text>

          {/* Profit */}
          {isDesktop && (
            <YStack width={90} alignItems="flex-end">
              <Text fontSize="$2" color={profit > 0 ? '$success' : '$colorSecondary'} fontWeight="500">
                {profit > 0 ? '+' : ''}{formatCurrency(profit, settings.currency)}
              </Text>
              {profit > 0 && (
                <Text fontSize="$1" color="$success">
                  {profitMargin.toFixed(0)}%
                </Text>
              )}
            </YStack>
          )}

          {/* Actions */}
          <XStack width={80} justifyContent="center" gap="$2">
            <Pressable onPress={(e) => { e.stopPropagation(); onView(); }}>
              <YStack
                padding="$1"
                borderRadius="$1"
                backgroundColor="$backgroundHover"
                hoverStyle={{ backgroundColor: '$primary' }}
              >
                <Eye size={16} color="$primary" />
              </YStack>
            </Pressable>
            <Pressable onPress={(e) => { e.stopPropagation(); onEdit(); }}>
              <YStack
                padding="$1"
                borderRadius="$1"
                backgroundColor="$backgroundHover"
                hoverStyle={{ backgroundColor: '$primary' }}
              >
                <Edit size={16} color="$colorSecondary" />
              </YStack>
            </Pressable>
          </XStack>
        </XStack>
      )}
    </Pressable>
  );
}

export default function ProductListScreen({ navigation }: ProductScreenProps<'ProductList'>) {
  const { settings } = useSettingsStore();
  const { isDesktop, isTablet } = usePlatform();
  const [search, setSearch] = useState('');

  const {
    data: productsData,
    isLoading,
    isRefetching,
    refetch,
    error
  } = useProducts({ limit: 100 });

  const products = productsData?.data ?? [];

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const query = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(query))
    );
  }, [products, search]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => (p.quantity ?? p.stock ?? 0) < 10 && (p.quantity ?? p.stock ?? 0) > 0).length;
    const outOfStock = products.filter(p => (p.quantity ?? p.stock ?? 0) <= 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.sellingPrice * (p.quantity ?? p.stock ?? 0)), 0);
    return { totalProducts, lowStock, outOfStock, totalValue };
  }, [products]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading products...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" gap="$3">
        <Text color="$error">Failed to load products</Text>
        <Button variant="secondary" onPress={() => refetch()}>
          <RefreshCw size={18} />
          <Text>Retry</Text>
        </Button>
      </YStack>
    );
  }

  const showDesktopLayout = isDesktop || isTablet;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        padding="$4"
        justifyContent="space-between"
        alignItems="center"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack>
          <Text fontSize="$6" fontWeight="bold">Products</Text>
          <XStack gap="$3">
            <Text fontSize="$2" color="$colorSecondary">{stats.totalProducts} products</Text>
            {stats.lowStock > 0 && (
              <Text fontSize="$2" color="$warning">{stats.lowStock} low stock</Text>
            )}
            {stats.outOfStock > 0 && (
              <Text fontSize="$2" color="$error">{stats.outOfStock} out of stock</Text>
            )}
          </XStack>
        </YStack>
        <XStack gap="$2">
          <Button variant="secondary" size="sm" onPress={() => navigation.navigate('Categories')}>
            <Filter size={16} />
            <Text>Categories</Text>
          </Button>
          <Button variant="primary" size="sm" onPress={() => navigation.navigate('AddProduct')}>
            <Plus size={16} color="white" />
            <Text color="white">Add</Text>
          </Button>
        </XStack>
      </XStack>

      {/* Search */}
      <XStack padding="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack
          flex={1}
          backgroundColor="$background"
          borderRadius="$2"
          paddingHorizontal="$3"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Search size={18} color="$placeholderColor" />
          <Input
            flex={1}
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChangeText={setSearch}
            borderWidth={0}
            backgroundColor="transparent"
            size="$3"
          />
        </XStack>
      </XStack>

      {/* Table */}
      <YStack flex={1} backgroundColor="$cardBackground">
        <TableHeader isDesktop={showDesktopLayout} />

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <TableRow
              product={item}
              isDesktop={showDesktopLayout}
              onView={() => navigation.navigate('ProductDetail', { id: item.id })}
              onEdit={() => navigation.navigate('ProductDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
              <Text color="$colorSecondary">
                {search ? 'No products match your search' : 'No products found'}
              </Text>
            </YStack>
          }
        />
      </YStack>
    </YStack>
  );
}
