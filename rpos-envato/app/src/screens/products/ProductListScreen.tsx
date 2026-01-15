import React, { useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Pressable, Image } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, Plus, Filter, RefreshCw, Eye, Edit, Trash2, Package,
  TrendingUp, AlertTriangle, DollarSign, Layers, Box,
} from '@tamagui/lucide-icons';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useProducts } from '@/features/products/hooks';
import type { ProductScreenProps } from '@/navigation/types';
import type { Product } from '@/types';

// Stats card colors
const STAT_COLORS = {
  total: { bg: '#EEF2FF', icon: '#4F46E5', border: '#C7D2FE' },
  value: { bg: '#ECFDF5', icon: '#059669', border: '#A7F3D0' },
  lowStock: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D' },
  outOfStock: { bg: '#FEE2E2', icon: '#DC2626', border: '#FECACA' },
};

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
      {/* Enhanced Header */}
      <YStack backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack
          padding="$4"
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap="$3">
            <YStack
              width={48}
              height={48}
              borderRadius={24}
              backgroundColor="#4F46E5"
              alignItems="center"
              justifyContent="center"
            >
              <Package size={24} color="white" />
            </YStack>
            <YStack>
              <Text fontSize="$6" fontWeight="bold" color="$color">Inventory</Text>
              <Text fontSize="$2" color="$colorSecondary">Manage your products</Text>
            </YStack>
          </XStack>
          <XStack gap="$2">
            <Button variant="secondary" size="sm" onPress={() => navigation.navigate('Categories')}>
              <Layers size={16} />
              <Text>Categories</Text>
            </Button>
            <YStack
              paddingHorizontal="$4"
              paddingVertical="$2"
              borderRadius="$3"
              backgroundColor="#4F46E5"
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
              pressStyle={{ transform: [{ scale: 0.97 }] }}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <XStack alignItems="center" gap="$2">
                <Plus size={16} color="white" />
                <Text color="white" fontWeight="600">Add Product</Text>
              </XStack>
            </YStack>
          </XStack>
        </XStack>

        {/* Stats Cards Row */}
        <XStack paddingHorizontal="$4" paddingBottom="$4" gap="$3">
          {/* Total Products */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor={STAT_COLORS.total.bg}
            borderWidth={1}
            borderColor={STAT_COLORS.total.border}
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <Box size={16} color={STAT_COLORS.total.icon} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color={STAT_COLORS.total.icon} textTransform="uppercase" fontWeight="600">
                  Total Products
                </Text>
                <Text fontSize="$5" fontWeight="bold" color={STAT_COLORS.total.icon}>
                  {stats.totalProducts}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Inventory Value */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor={STAT_COLORS.value.bg}
            borderWidth={1}
            borderColor={STAT_COLORS.value.border}
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <DollarSign size={16} color={STAT_COLORS.value.icon} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color={STAT_COLORS.value.icon} textTransform="uppercase" fontWeight="600">
                  Total Value
                </Text>
                <Text fontSize="$4" fontWeight="bold" color={STAT_COLORS.value.icon}>
                  {formatCurrency(stats.totalValue, settings.currency)}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Low Stock */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor={STAT_COLORS.lowStock.bg}
            borderWidth={1}
            borderColor={STAT_COLORS.lowStock.border}
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <AlertTriangle size={16} color={STAT_COLORS.lowStock.icon} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color={STAT_COLORS.lowStock.icon} textTransform="uppercase" fontWeight="600">
                  Low Stock
                </Text>
                <Text fontSize="$5" fontWeight="bold" color={STAT_COLORS.lowStock.icon}>
                  {stats.lowStock}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Out of Stock */}
          <YStack
            flex={1}
            padding="$3"
            borderRadius="$3"
            backgroundColor={STAT_COLORS.outOfStock.bg}
            borderWidth={1}
            borderColor={STAT_COLORS.outOfStock.border}
          >
            <XStack alignItems="center" gap="$2">
              <YStack
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <Package size={16} color={STAT_COLORS.outOfStock.icon} />
              </YStack>
              <YStack flex={1}>
                <Text fontSize={10} color={STAT_COLORS.outOfStock.icon} textTransform="uppercase" fontWeight="600">
                  Out of Stock
                </Text>
                <Text fontSize="$5" fontWeight="bold" color={STAT_COLORS.outOfStock.icon}>
                  {stats.outOfStock}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </XStack>
      </YStack>

      {/* Enhanced Search */}
      <XStack padding="$3" backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack
          flex={1}
          backgroundColor="$background"
          borderRadius="$3"
          paddingHorizontal="$4"
          paddingVertical="$2"
          alignItems="center"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$2"
        >
          <Search size={18} color="#4F46E5" />
          <Input
            flex={1}
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChangeText={setSearch}
            borderWidth={0}
            backgroundColor="transparent"
            size="$3"
          />
          {search && (
            <Pressable onPress={() => setSearch('')}>
              <Text fontSize="$2" color="$colorSecondary">Clear</Text>
            </Pressable>
          )}
        </XStack>
        <Button variant="ghost" size="icon" onPress={() => refetch()} marginLeft="$2">
          <RefreshCw size={18} color={isRefetching ? '#4F46E5' : '$colorSecondary'} />
        </Button>
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
