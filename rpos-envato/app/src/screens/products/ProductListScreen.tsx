import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { Search, Plus, Filter, RefreshCw, Package } from '@tamagui/lucide-icons';
import { Button, Card, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
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

export default function ProductListScreen({ navigation }: ProductScreenProps<'ProductList'>) {
  const { settings } = useSettingsStore();
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
      (p.sku && p.sku.toLowerCase().includes(query))
    );
  }, [products, search]);

  const renderProduct = ({ item }: { item: Product }) => {
    const stockQty = item.quantity ?? item.stock ?? 0;
    const profit = (item.sellingPrice || 0) - (item.purchasePrice || 0);
    const profitMargin = item.sellingPrice > 0 ? (profit / item.sellingPrice) * 100 : 0;
    const categoryName = item.category?.name;

    return (
      <Card pressable onPress={() => navigation.navigate('ProductDetail', { id: item.id })} marginBottom="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <XStack alignItems="center" gap="$2">
              <Text fontSize="$4" fontWeight="600" numberOfLines={1} flex={1}>{item.name}</Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <Package size={14} color="$colorSecondary" />
              <Text fontSize="$2" color="$colorSecondary">SKU: {item.sku || 'N/A'}</Text>
            </XStack>
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Badge variant={getStockBadgeVariant(stockQty)} size="sm">
                {getStockStatusText(stockQty)} ({stockQty})
              </Badge>
              {categoryName && (
                <Badge variant="info" size="sm">
                  {categoryName}
                </Badge>
              )}
            </XStack>
          </YStack>
          <YStack alignItems="flex-end" gap="$1">
            <Text fontSize="$5" fontWeight="bold" color="$accent">
              {formatCurrency(item.sellingPrice, settings.currency)}
            </Text>
            <Text fontSize="$2" color="$colorSecondary">
              Cost: {formatCurrency(item.purchasePrice, settings.currency)}
            </Text>
            {profit > 0 && (
              <Text fontSize="$2" color="$success" fontWeight="500">
                +{formatCurrency(profit, settings.currency)} ({profitMargin.toFixed(0)}%)
              </Text>
            )}
          </YStack>
        </XStack>
      </Card>
    );
  };

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

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack padding="$4" justifyContent="space-between" alignItems="center" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Text fontSize="$6" fontWeight="bold">Products</Text>
        <XStack gap="$2">
          <Button variant="secondary" size="sm" onPress={() => navigation.navigate('Categories')}>
            <Filter size={18} />
            <Text>Categories</Text>
          </Button>
          <Button variant="primary" size="sm" onPress={() => navigation.navigate('AddProduct')}>
            <Plus size={18} color="white" />
            <Text color="white">Add</Text>
          </Button>
        </XStack>
      </XStack>

      <YStack padding="$4" gap="$3" flex={1}>
        <XStack backgroundColor="$cardBackground" borderRadius="$2" paddingHorizontal="$3" alignItems="center" borderWidth={1} borderColor="$borderColor">
          <Search size={20} color="$placeholderColor" />
          <Input flex={1} placeholder="Search products..." value={search} onChangeText={setSearch} borderWidth={0} backgroundColor="transparent" />
        </XStack>

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
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
