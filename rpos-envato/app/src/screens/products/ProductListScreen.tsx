import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Image } from 'tamagui';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, Plus, RefreshCw, Eye, Pencil, Package,
  TrendingUp, AlertTriangle, DollarSign, Layers, Box,
  ChevronUp, ChevronDown, MoreHorizontal, ArrowUpDown, X,
  Filter, RotateCcw, Barcode,
} from '@tamagui/lucide-icons';
import { Button, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import {
  ProductAnalyticsPanel,
  ProductEditDrawer,
  StockAdjustment,
  BulkActionBar,
  ProductDetailModal,
} from '@/components/product';
import type { StockStatus, PriceRange } from '@/components/product';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { usePlatform } from '@/hooks';
import { useProducts, useUpdateProduct, useDeleteProduct } from '@/features/products/hooks';
import { useCategories } from '@/features/categories/hooks';
import type { ProductScreenProps } from '@/navigation/types';
import type { Product, Category } from '@/types';

// Color constants - Using professional blue instead of bright purple
const COLORS = {
  primary: '#3B82F6',  // Blue-500 - cleaner, more professional
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
  purple: '#8B5CF6',
};

// Stats card colors - using professional blue theme
const STAT_COLORS = {
  total: { bg: '#EFF6FF', icon: '#2563EB', border: '#BFDBFE' },
  value: { bg: '#ECFDF5', icon: '#059669', border: '#A7F3D0' },
  lowStock: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D' },
  outOfStock: { bg: '#FEE2E2', icon: '#DC2626', border: '#FECACA' },
  avgMargin: { bg: '#F0FDF4', icon: '#16A34A', border: '#BBF7D0' },
  categories: { bg: '#E0F2FE', icon: '#0284C7', border: '#BAE6FD' },
};

// Sort configuration type
type SortField = 'name' | 'sku' | 'category' | 'stock' | 'price' | 'margin';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Additional filter types
type MarginRange = 'all' | 'under_20' | '20_40' | '40_60' | 'over_60';
type BarcodeFilter = 'all' | 'has_barcode' | 'no_barcode';

// Product filters state for inline filters
interface ProductFiltersState {
  search: string;
  category: string | null;
  stockStatus: StockStatus;
  priceRange: PriceRange;
  marginRange: MarginRange;
  hasBarcode: BarcodeFilter;
}

// Helper to get stock status badge variant
const getStockBadgeVariant = (quantity: number): BadgeVariant => {
  if (quantity <= 0) return 'error';
  if (quantity < 10) return 'warning';
  return 'success';
};

// Column width constants for consistent alignment
const COL_WIDTHS = {
  checkbox: 32,
  image: 44,
  name: 'flex' as const, // flexible
  sku: 90,
  category: 130, // Increased from 90 to show full category names
  stock: 60,
  cost: 80,
  price: 80,
  margin: 85,
  actions: 50,
};

// Sortable table header component
function SortableHeader({
  label,
  field,
  sortConfig,
  onSort,
  width,
  flex,
  align = 'left',
}: {
  label: string;
  field: SortField;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  width?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
}) {
  const isActive = sortConfig.field === field;

  return (
    <XStack
      width={width}
      flex={flex}
      alignItems="center"
      justifyContent={align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}
      gap="$1"
      cursor="pointer"
      onPress={() => onSort(field)}
      hoverStyle={{ opacity: 0.7 }}
    >
      <Text
        fontSize={11}
        fontWeight="600"
        color={isActive ? COLORS.primary : '$colorSecondary'}
        textAlign={align}
      >
        {label}
      </Text>
      {isActive ? (
        sortConfig.direction === 'asc' ? (
          <ChevronUp size={10} color={COLORS.primary} />
        ) : (
          <ChevronDown size={10} color={COLORS.primary} />
        )
      ) : (
        <ArrowUpDown size={8} color="$colorSecondary" />
      )}
    </XStack>
  );
}

// Table header component
function TableHeader({
  isDesktop,
  sortConfig,
  onSort,
  showCheckbox,
  allSelected,
  onToggleSelectAll,
}: {
  isDesktop: boolean;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  showCheckbox: boolean;
  allSelected: boolean;
  onToggleSelectAll: () => void;
}) {
  return (
    <XStack
      backgroundColor="$backgroundHover"
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
      gap="$3"
    >
      {showCheckbox && (
        <YStack
          width={COL_WIDTHS.checkbox}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={onToggleSelectAll}
        >
          <YStack
            width={16}
            height={16}
            borderRadius="$1"
            borderWidth={2}
            borderColor={allSelected ? COLORS.primary : '$borderColor'}
            backgroundColor={allSelected ? COLORS.primary : 'transparent'}
            alignItems="center"
            justifyContent="center"
          >
            {allSelected && <Text color="white" fontSize={9} fontWeight="bold">✓</Text>}
          </YStack>
        </YStack>
      )}
      <YStack width={COL_WIDTHS.image} />
      <YStack flex={1} minWidth={100}>
        <SortableHeader label="Product" field="name" sortConfig={sortConfig} onSort={onSort} flex={1} />
      </YStack>
      {isDesktop && (
        <YStack width={COL_WIDTHS.sku}>
          <SortableHeader label="SKU" field="sku" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.sku} />
        </YStack>
      )}
      <YStack width={COL_WIDTHS.category}>
        <SortableHeader label="Category" field="category" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.category} />
      </YStack>
      <YStack width={COL_WIDTHS.stock}>
        <SortableHeader label="Stock" field="stock" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.stock} align="center" />
      </YStack>
      {isDesktop && (
        <YStack width={COL_WIDTHS.cost}>
          <Text fontSize={11} fontWeight="600" color="$colorSecondary" textAlign="right">Cost</Text>
        </YStack>
      )}
      <YStack width={COL_WIDTHS.price}>
        <SortableHeader label="Price" field="price" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.price} align="right" />
      </YStack>
      {isDesktop && (
        <YStack width={COL_WIDTHS.margin}>
          <SortableHeader label="Margin" field="margin" sortConfig={sortConfig} onSort={onSort} width={COL_WIDTHS.margin} align="right" />
        </YStack>
      )}
      <YStack width={COL_WIDTHS.actions}>
        <Text fontSize={11} fontWeight="600" color="$colorSecondary" textAlign="center">Actions</Text>
      </YStack>
    </XStack>
  );
}

// Table row component
function TableRow({
  product,
  isDesktop,
  isSelected,
  isHighlighted,
  showCheckbox,
  onToggleSelect,
  onSelect,
  onEdit,
}: {
  product: Product;
  isDesktop: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  showCheckbox: boolean;
  onToggleSelect: () => void;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { settings } = useSettingsStore();
  const stockQty = product.quantity ?? 0;
  const profit = (product.sellingPrice || 0) - (product.purchasePrice || 0);
  const profitMargin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;
  const categoryName = product.category?.name || 'Uncategorized';
  const categoryColor = (product.category as any)?.color || '#6B7280';
  const firstImage = product.images?.[0];
  const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage as any)?.url;

  return (
    <XStack
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      backgroundColor={isHighlighted ? `${COLORS.primary}10` : isSelected ? '$backgroundHover' : '$cardBackground'}
      borderLeftWidth={isHighlighted ? 3 : 0}
      borderLeftColor={COLORS.primary}
      alignItems="center"
      gap="$3"
      cursor="pointer"
      hoverStyle={{ backgroundColor: isHighlighted ? `${COLORS.primary}15` : '$backgroundHover' }}
      pressStyle={{ backgroundColor: '$backgroundPress' }}
      onPress={onSelect}
    >
      {showCheckbox && (
        <YStack
          width={COL_WIDTHS.checkbox}
          alignItems="center"
          justifyContent="center"
          onPress={(e: any) => { e.stopPropagation(); onToggleSelect(); }}
        >
          <YStack
            width={16}
            height={16}
            borderRadius="$1"
            borderWidth={2}
            borderColor={isSelected ? COLORS.primary : '$borderColor'}
            backgroundColor={isSelected ? COLORS.primary : 'transparent'}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
          >
            {isSelected && <Text color="white" fontSize={9} fontWeight="bold">✓</Text>}
          </YStack>
        </YStack>
      )}

      {/* Product Image with Category Color Strip */}
      <YStack width={COL_WIDTHS.image} alignItems="center">
        <XStack borderRadius="$2" overflow="hidden">
          <YStack width={3} backgroundColor={categoryColor} />
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              width={35}
              height={36}
              objectFit="cover"
            />
          ) : (
            <YStack
              width={35}
              height={36}
              backgroundColor="$backgroundHover"
              justifyContent="center"
              alignItems="center"
            >
              <Package size={16} color="$colorSecondary" />
            </YStack>
          )}
        </XStack>
      </YStack>

      {/* Product Name */}
      <YStack flex={1} minWidth={100}>
        <Text fontSize={13} fontWeight="500" numberOfLines={1}>{product.name}</Text>
        {!isDesktop && product.sku && (
          <Text fontSize={11} color="$colorSecondary" numberOfLines={1}>
            {product.sku}
          </Text>
        )}
      </YStack>

      {/* SKU */}
      {isDesktop && (
        <YStack width={COL_WIDTHS.sku}>
          <Text fontSize={11} color="$colorSecondary" numberOfLines={1}>
            {product.sku || 'N/A'}
          </Text>
        </YStack>
      )}

      {/* Category */}
      <YStack width={COL_WIDTHS.category}>
        <XStack
          backgroundColor={`${categoryColor}20`}
          paddingHorizontal="$1"
          paddingVertical={2}
          borderRadius="$1"
          alignItems="center"
          gap={4}
          maxWidth="100%"
        >
          <YStack width={5} height={5} borderRadius={3} backgroundColor={categoryColor} flexShrink={0} />
          <Text fontSize={10} color={categoryColor} fontWeight="500" numberOfLines={1} ellipsizeMode="tail">
            {categoryName}
          </Text>
        </XStack>
      </YStack>

      {/* Stock */}
      <YStack width={COL_WIDTHS.stock} alignItems="center">
        <Badge variant={getStockBadgeVariant(stockQty)} size="sm">
          {stockQty}
        </Badge>
      </YStack>

      {/* Cost */}
      {isDesktop && (
        <YStack width={COL_WIDTHS.cost}>
          <Text fontSize={11} color="$colorSecondary" textAlign="right" numberOfLines={1}>
            {formatCurrency(product.purchasePrice, settings.currency)}
          </Text>
        </YStack>
      )}

      {/* Price */}
      <YStack width={COL_WIDTHS.price}>
        <Text fontSize={13} fontWeight="600" textAlign="right" color="$color" numberOfLines={1}>
          {formatCurrency(product.sellingPrice, settings.currency)}
        </Text>
      </YStack>

      {/* Profit */}
      {isDesktop && (
        <YStack width={COL_WIDTHS.margin} alignItems="flex-end">
          <XStack alignItems="center" gap={2}>
            {profit > 0 && <TrendingUp size={10} color={COLORS.success} />}
            <Text fontSize={11} color={profit > 0 ? COLORS.success : '$colorSecondary'} fontWeight="500" numberOfLines={1}>
              {profit > 0 ? '+' : ''}{formatCurrency(profit, settings.currency)}
            </Text>
          </XStack>
          {profit > 0 && (
            <Text fontSize={9} color={COLORS.success}>
              {profitMargin.toFixed(0)}%
            </Text>
          )}
        </YStack>
      )}

      {/* Actions */}
      <YStack width={COL_WIDTHS.actions} alignItems="center">
        <YStack
          padding={6}
          borderRadius="$1"
          backgroundColor="$backgroundHover"
          cursor="pointer"
          hoverStyle={{ backgroundColor: COLORS.primary }}
          onPress={(e: any) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil size={12} color="$colorSecondary" />
        </YStack>
      </YStack>
    </XStack>
  );
}


export default function ProductListScreen({ navigation }: ProductScreenProps<'ProductList'>) {
  const { settings } = useSettingsStore();
  const { isDesktop, isTablet } = usePlatform();
  const showDesktopLayout = isDesktop || isTablet;

  // State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [filters, setFilters] = useState<ProductFiltersState>({
    search: '',
    category: null,
    stockStatus: 'all',
    priceRange: 'all',
    marginRange: 'all',
    hasBarcode: 'all',
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Data fetching
  const {
    data: productsData,
    isLoading,
    isRefetching,
    refetch,
    error
  } = useProducts({ limit: 100 });

  const { data: categories = [] } = useCategories();
  const products = productsData ?? [];

  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Apply filters
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(query))
      );
    }

    if (filters.category) {
      result = result.filter(p => p.category?.id === filters.category || p.categoryId === filters.category);
    }

    if (filters.stockStatus !== 'all') {
      result = result.filter(p => {
        const qty = p.quantity ?? 0;
        switch (filters.stockStatus) {
          case 'in_stock': return qty >= 10;
          case 'low_stock': return qty > 0 && qty < 10;
          case 'out_of_stock': return qty <= 0;
          default: return true;
        }
      });
    }

    if (filters.priceRange !== 'all') {
      result = result.filter(p => {
        const price = p.sellingPrice || 0;
        switch (filters.priceRange) {
          case 'under_10': return price < 10;
          case '10_50': return price >= 10 && price <= 50;
          case '50_100': return price > 50 && price <= 100;
          case 'over_100': return price > 100;
          default: return true;
        }
      });
    }

    if (filters.marginRange !== 'all') {
      result = result.filter(p => {
        const margin = p.sellingPrice > 0 ? ((p.sellingPrice - (p.purchasePrice || 0)) / p.sellingPrice) * 100 : 0;
        switch (filters.marginRange) {
          case 'under_20': return margin < 20;
          case '20_40': return margin >= 20 && margin < 40;
          case '40_60': return margin >= 40 && margin < 60;
          case 'over_60': return margin >= 60;
          default: return true;
        }
      });
    }

    if (filters.hasBarcode !== 'all') {
      result = result.filter(p => {
        const hasBarcode = !!(p.barcode || (p as any).primaryBarcode);
        return filters.hasBarcode === 'has_barcode' ? hasBarcode : !hasBarcode;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'sku':
          aValue = (a.sku || '').toLowerCase();
          bValue = (b.sku || '').toLowerCase();
          break;
        case 'category':
          aValue = (a.category?.name || '').toLowerCase();
          bValue = (b.category?.name || '').toLowerCase();
          break;
        case 'stock':
          aValue = a.quantity ?? 0;
          bValue = b.quantity ?? 0;
          break;
        case 'price':
          aValue = a.sellingPrice || 0;
          bValue = b.sellingPrice || 0;
          break;
        case 'margin':
          aValue = a.sellingPrice > 0 ? ((a.sellingPrice - a.purchasePrice) / a.sellingPrice) * 100 : 0;
          bValue = b.sellingPrice > 0 ? ((b.sellingPrice - b.purchasePrice) / b.sellingPrice) * 100 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, filters, sortConfig]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => (p.quantity ?? 0) < 10 && (p.quantity ?? 0) > 0).length;
    const outOfStock = products.filter(p => (p.quantity ?? 0) <= 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.sellingPrice * (p.quantity ?? 0)), 0);
    const avgMargin = products.length > 0
      ? products.reduce((sum, p) => {
          const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : 0;
          return sum + margin;
        }, 0) / products.length
      : 0;
    const categoryCount = new Set(products.map(p => p.category?.id).filter(Boolean)).size;

    return { totalProducts, lowStock, outOfStock, totalValue, avgMargin, categoryCount };
  }, [products]);

  // Selected product
  const selectedProduct = useMemo(() =>
    products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  // Handlers
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSelectProduct = useCallback((id: string) => {
    // Toggle selection - clicking same product deselects it
    setSelectedProductId(prev => prev === id ? null : id);
    setShowStockAdjustment(false);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedProductId(null);
    setShowStockAdjustment(false);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(filteredAndSortedProducts.map(p => p.id));
  }, [filteredAndSortedProducts]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBulkUpdateCategory = useCallback(async (categoryId: string) => {
    for (const id of selectedIds) {
      await updateProduct.mutateAsync({ id, data: { categoryId } });
    }
    setSelectedIds([]);
    refetch();
  }, [selectedIds, updateProduct, refetch]);

  const handleBulkAdjustPrice = useCallback(async (type: 'increase' | 'decrease', percentage: number) => {
    const multiplier = type === 'increase' ? (1 + percentage / 100) : (1 - percentage / 100);
    for (const id of selectedIds) {
      const product = products.find(p => p.id === id);
      if (product) {
        await updateProduct.mutateAsync({
          id,
          data: { sellingPrice: Math.round(product.sellingPrice * multiplier * 100) / 100 }
        });
      }
    }
    setSelectedIds([]);
    refetch();
  }, [selectedIds, products, updateProduct, refetch]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteProduct.mutateAsync(id);
    }
    setSelectedIds([]);
    setSelectedProductId(null);
    refetch();
  }, [selectedIds, deleteProduct, refetch]);

  const handleDeleteProduct = useCallback(async () => {
    if (selectedProduct) {
      Alert.alert(
        'Delete Product',
        `Are you sure you want to delete "${selectedProduct.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteProduct.mutateAsync(selectedProduct.id);
              setSelectedProductId(null);
              refetch();
            },
          },
        ]
      );
    }
  }, [selectedProduct, deleteProduct, refetch]);

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text color="$colorSecondary" marginTop="$2">Loading products...</Text>
      </YStack>
    );
  }

  // Error state
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

  const allSelected = selectedIds.length === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0;

  // Category filter options
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(Array.isArray(categories) ? categories : []).map(cat => ({
      value: cat.id,
      label: cat.name,
      color: cat.color || '#6B7280',
    })),
  ];

  // Stock status filter options
  const stockOptions = [
    { value: 'all', label: 'All Stock' },
    { value: 'in_stock', label: 'In Stock' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
  ];

  // Price range filter options
  const priceOptions = [
    { value: 'all', label: 'Any Price' },
    { value: 'under_10', label: 'Under $10' },
    { value: '10_50', label: '$10 - $50' },
    { value: '50_100', label: '$50 - $100' },
    { value: 'over_100', label: 'Over $100' },
  ];

  // Margin range filter options
  const marginOptions = [
    { value: 'all', label: 'Any Margin' },
    { value: 'under_20', label: 'Under 20%' },
    { value: '20_40', label: '20% - 40%' },
    { value: '40_60', label: '40% - 60%' },
    { value: 'over_60', label: 'Over 60%' },
  ];

  // Barcode filter options
  const barcodeOptions = [
    { value: 'all', label: 'Any Barcode' },
    { value: 'has_barcode', label: 'Has Barcode' },
    { value: 'no_barcode', label: 'No Barcode' },
  ];

  const hasActiveFilters = filters.search !== '' || filters.category !== null ||
    filters.stockStatus !== 'all' || filters.priceRange !== 'all' ||
    filters.marginRange !== 'all' || filters.hasBarcode !== 'all';

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: null,
      stockStatus: 'all',
      priceRange: 'all',
      marginRange: 'all',
      hasBarcode: 'all',
    });
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Compact Header with integrated search & filters - matching Orders screen */}
      <YStack backgroundColor="$cardBackground" borderBottomWidth={1} borderBottomColor="$borderColor">
        <XStack padding="$3" gap="$3" alignItems="center">
          {/* Left: Icon + Title */}
          <XStack alignItems="center" gap="$2" flexShrink={0}>
            <YStack
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor={COLORS.primary}
              alignItems="center"
              justifyContent="center"
            >
              <Package size={18} color="white" />
            </YStack>
            <YStack>
              <Text fontSize="$4" fontWeight="bold" color="$color">Inventory</Text>
              <Text fontSize={10} color="$colorSecondary">{filteredAndSortedProducts.length} products</Text>
            </YStack>
          </XStack>

          {/* Center: Search + Filters */}
          <XStack flex={1} gap="$1.5" alignItems="center" flexWrap="nowrap">
            {/* Search Input */}
            <XStack
              flex={1}
              minWidth={140}
              maxWidth={220}
              backgroundColor="white"
              borderRadius="$2"
              borderWidth={1}
              borderColor={filters.search ? COLORS.primary : '#E5E7EB'}
              paddingHorizontal="$2"
              paddingVertical="$1"
              alignItems="center"
              gap="$1.5"
              height={30}
            >
              <Search size={14} color={filters.search ? COLORS.primary : '#9CA3AF'} />
              <Input
                flex={1}
                value={filters.search}
                onChangeText={(text) => setFilters({ ...filters, search: text })}
                placeholder="Search products..."
                borderWidth={0}
                backgroundColor="transparent"
                fontSize={12}
                paddingHorizontal={0}
                paddingVertical={0}
                height={22}
                placeholderTextColor="#9CA3AF"
              />
              {filters.search ? (
                <YStack padding={2} cursor="pointer" onPress={() => setFilters({ ...filters, search: '' })}>
                  <X size={12} color="#9CA3AF" />
                </YStack>
              ) : null}
            </XStack>

            {/* Category Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.category ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
              >
                <Filter size={12} color={filters.category ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {categoryOptions.find(o => o.value === (filters.category || ''))?.label || 'All Categories'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'category' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={140} maxHeight={200} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {categoryOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={(filters.category || '') === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, category: opt.value || null }); setOpenDropdown(null); }} alignItems="center" gap="$2">
                        {opt.color && <YStack width={8} height={8} borderRadius={4} backgroundColor={opt.color} />}
                        <Text fontSize={11} color="$color" numberOfLines={1}>{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Stock Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.stockStatus !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'stock' ? null : 'stock')}
              >
                <Package size={12} color={filters.stockStatus !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {stockOptions.find(o => o.value === filters.stockStatus)?.label || 'All Stock'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'stock' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={110} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {stockOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.stockStatus === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, stockStatus: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Price Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.priceRange !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
              >
                <DollarSign size={12} color={filters.priceRange !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {priceOptions.find(o => o.value === filters.priceRange)?.label || 'Any Price'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'price' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={100} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {priceOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.priceRange === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, priceRange: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Margin Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.marginRange !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'margin' ? null : 'margin')}
              >
                <TrendingUp size={12} color={filters.marginRange !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {marginOptions.find(o => o.value === filters.marginRange)?.label || 'Any Margin'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'margin' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={100} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {marginOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.marginRange === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, marginRange: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Barcode Filter Dropdown */}
            <YStack position="relative">
              <XStack
                backgroundColor="white"
                borderRadius="$2"
                borderWidth={1}
                borderColor={filters.hasBarcode !== 'all' ? COLORS.primary : '#E5E7EB'}
                paddingHorizontal="$2"
                paddingVertical="$1"
                alignItems="center"
                gap="$1.5"
                cursor="pointer"
                height={30}
                onPress={() => setOpenDropdown(openDropdown === 'barcode' ? null : 'barcode')}
              >
                <Barcode size={12} color={filters.hasBarcode !== 'all' ? COLORS.primary : '#9CA3AF'} />
                <Text fontSize={11} color="$color" numberOfLines={1}>
                  {barcodeOptions.find(o => o.value === filters.hasBarcode)?.label || 'Any Barcode'}
                </Text>
                <ChevronDown size={10} color="#9CA3AF" />
              </XStack>
              {openDropdown === 'barcode' && (
                <>
                  <YStack position="absolute" top={-1000} left={-1000} right={-1000} bottom={-1000} zIndex={99} onPress={() => setOpenDropdown(null)} />
                  <YStack position="absolute" top="100%" left={0} marginTop="$1" backgroundColor="white" borderRadius="$2" borderWidth={1} borderColor="#E5E7EB" zIndex={100} minWidth={100} overflow="hidden" shadowColor="#000" shadowOpacity={0.1} shadowRadius={8} elevation={4}>
                    {barcodeOptions.map((opt) => (
                      <XStack key={opt.value} paddingHorizontal="$2" paddingVertical="$2" cursor="pointer" backgroundColor={filters.hasBarcode === opt.value ? '#F3F4F6' : 'white'} hoverStyle={{ backgroundColor: '#F9FAFB' }} onPress={() => { setFilters({ ...filters, hasBarcode: opt.value as any }); setOpenDropdown(null); }}>
                        <Text fontSize={11} color="$color">{opt.label}</Text>
                      </XStack>
                    ))}
                  </YStack>
                </>
              )}
            </YStack>

            {/* Reset button */}
            {hasActiveFilters && (
              <XStack
                paddingHorizontal="$1.5"
                paddingVertical="$1"
                borderRadius="$2"
                backgroundColor="#FEE2E2"
                cursor="pointer"
                alignItems="center"
                gap="$1"
                height={30}
                onPress={handleResetFilters}
              >
                <RotateCcw size={11} color={COLORS.error} />
                <Text fontSize={10} color={COLORS.error} fontWeight="500">Reset</Text>
              </XStack>
            )}
          </XStack>

          {/* Right: Action buttons + Refresh */}
          <XStack gap="$2" alignItems="center" flexShrink={0}>
            <Button variant="secondary" size="sm" onPress={() => navigation.navigate('Categories')}>
              <Layers size={14} />
              <Text fontSize={12}>Categories</Text>
            </Button>
            <YStack
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$2"
              backgroundColor={COLORS.primary}
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <XStack alignItems="center" gap="$1">
                <Plus size={14} color="white" />
                <Text color="white" fontWeight="600" fontSize={12}>Add</Text>
              </XStack>
            </YStack>
            <YStack
              padding="$1.5"
              borderRadius="$2"
              backgroundColor="#F3F4F6"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#E5E7EB' }}
              onPress={() => refetch()}
            >
              <RefreshCw size={16} color={isRefetching ? COLORS.primary : '#6B7280'} />
            </YStack>
          </XStack>
        </XStack>

        {/* Compact KPIs Row - Clickable to filter */}
        <XStack paddingHorizontal="$3" paddingBottom="$2" gap="$2" flexWrap="wrap">
          {/* Total Products */}
          <XStack
            flex={1}
            minWidth={100}
            padding="$2"
            borderRadius="$2"
            backgroundColor={STAT_COLORS.total.bg}
            borderWidth={1}
            borderColor={STAT_COLORS.total.border}
            alignItems="center"
            gap="$2"
          >
            <Box size={14} color={STAT_COLORS.total.icon} />
            <YStack>
              <Text fontSize={9} color={STAT_COLORS.total.icon} fontWeight="600">PRODUCTS</Text>
              <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.total.icon}>{stats.totalProducts}</Text>
            </YStack>
          </XStack>

          {/* Inventory Value */}
          <XStack flex={1} minWidth={120} padding="$2" borderRadius="$2" backgroundColor={STAT_COLORS.value.bg} borderWidth={1} borderColor={STAT_COLORS.value.border} alignItems="center" gap="$2">
            <DollarSign size={14} color={STAT_COLORS.value.icon} />
            <YStack>
              <Text fontSize={9} color={STAT_COLORS.value.icon} fontWeight="600">VALUE</Text>
              <Text fontSize={14} fontWeight="bold" color={STAT_COLORS.value.icon}>{formatCurrency(stats.totalValue, settings.currency)}</Text>
            </YStack>
          </XStack>

          {/* Low Stock - Clickable to filter */}
          <XStack
            flex={1}
            minWidth={90}
            padding="$2"
            borderRadius="$2"
            backgroundColor={filters.stockStatus === 'low_stock' ? STAT_COLORS.lowStock.bg : '#F9FAFB'}
            borderWidth={filters.stockStatus === 'low_stock' ? 2 : 1}
            borderColor={filters.stockStatus === 'low_stock' ? STAT_COLORS.lowStock.icon : '#E5E7EB'}
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            alignItems="center"
            gap="$2"
            onPress={() => setFilters({ ...filters, stockStatus: filters.stockStatus === 'low_stock' ? 'all' : 'low_stock' })}
          >
            <AlertTriangle size={14} color={STAT_COLORS.lowStock.icon} />
            <YStack>
              <Text fontSize={9} color={STAT_COLORS.lowStock.icon} fontWeight="600">LOW STOCK</Text>
              <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.lowStock.icon}>{stats.lowStock}</Text>
            </YStack>
          </XStack>

          {/* Out of Stock - Clickable to filter */}
          <XStack
            flex={1}
            minWidth={90}
            padding="$2"
            borderRadius="$2"
            backgroundColor={filters.stockStatus === 'out_of_stock' ? STAT_COLORS.outOfStock.bg : '#F9FAFB'}
            borderWidth={filters.stockStatus === 'out_of_stock' ? 2 : 1}
            borderColor={filters.stockStatus === 'out_of_stock' ? STAT_COLORS.outOfStock.icon : '#E5E7EB'}
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            alignItems="center"
            gap="$2"
            onPress={() => setFilters({ ...filters, stockStatus: filters.stockStatus === 'out_of_stock' ? 'all' : 'out_of_stock' })}
          >
            <Package size={14} color={STAT_COLORS.outOfStock.icon} />
            <YStack>
              <Text fontSize={9} color={STAT_COLORS.outOfStock.icon} fontWeight="600">OUT OF STOCK</Text>
              <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.outOfStock.icon}>{stats.outOfStock}</Text>
            </YStack>
          </XStack>

          {/* Avg Margin - Desktop only */}
          {showDesktopLayout && (
            <XStack flex={1} minWidth={100} padding="$2" borderRadius="$2" backgroundColor={STAT_COLORS.avgMargin.bg} borderWidth={1} borderColor={STAT_COLORS.avgMargin.border} alignItems="center" gap="$2">
              <TrendingUp size={14} color={STAT_COLORS.avgMargin.icon} />
              <YStack>
                <Text fontSize={9} color={STAT_COLORS.avgMargin.icon} fontWeight="600">AVG MARGIN</Text>
                <Text fontSize={14} fontWeight="bold" color={STAT_COLORS.avgMargin.icon}>{stats.avgMargin.toFixed(1)}%</Text>
              </YStack>
            </XStack>
          )}

          {/* Categories Count - Desktop only */}
          {showDesktopLayout && (
            <XStack flex={1} minWidth={90} padding="$2" borderRadius="$2" backgroundColor={STAT_COLORS.categories.bg} borderWidth={1} borderColor={STAT_COLORS.categories.border} alignItems="center" gap="$2">
              <Layers size={14} color={STAT_COLORS.categories.icon} />
              <YStack>
                <Text fontSize={9} color={STAT_COLORS.categories.icon} fontWeight="600">CATEGORIES</Text>
                <Text fontSize={16} fontWeight="bold" color={STAT_COLORS.categories.icon}>{stats.categoryCount}</Text>
              </YStack>
            </XStack>
          )}
        </XStack>
      </YStack>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        products={products}
        categories={categories}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkUpdateCategory={handleBulkUpdateCategory}
        onBulkAdjustPrice={handleBulkAdjustPrice}
        onBulkDelete={handleBulkDelete}
        allSelected={allSelected}
      />

      {/* Master-Detail Layout */}
      <XStack flex={1}>
        {/* Left Panel - Product List */}
        <YStack flex={1}>
          {/* Table */}
          <YStack flex={1} backgroundColor="$cardBackground">
            <TableHeader
              isDesktop={showDesktopLayout}
              sortConfig={sortConfig}
              onSort={handleSort}
              showCheckbox={true}
              allSelected={allSelected}
              onToggleSelectAll={allSelected ? handleClearSelection : handleSelectAll}
            />

            <FlatList
              data={filteredAndSortedProducts}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
              }
              renderItem={({ item }) => (
                <TableRow
                  product={item}
                  isDesktop={showDesktopLayout}
                  isSelected={selectedIds.includes(item.id)}
                  isHighlighted={selectedProductId === item.id}
                  showCheckbox={true}
                  onToggleSelect={() => handleToggleSelect(item.id)}
                  onSelect={() => handleSelectProduct(item.id)}
                  onEdit={() => {
                    setSelectedProductId(item.id);
                    setShowEditDrawer(true);
                  }}
                />
              )}
              ListEmptyComponent={
                <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
                  <Text color="$colorSecondary">
                    {filters.search || filters.category || filters.stockStatus !== 'all' || filters.priceRange !== 'all'
                      ? 'No products match your filters'
                      : 'No products found'}
                  </Text>
                </YStack>
              }
            />
          </YStack>
        </YStack>

        {/* Right Panel - Analytics - Desktop only, shows when product selected */}
        {showDesktopLayout && selectedProduct && (
          <YStack
            width={420}
            backgroundColor="$background"
            borderLeftWidth={1}
            borderLeftColor="$borderColor"
          >
            {/* Close Button Header */}
            <XStack
              padding="$3"
              borderBottomWidth={1}
              borderBottomColor="$borderColor"
              justifyContent="space-between"
              alignItems="center"
              backgroundColor="$cardBackground"
            >
              <Text fontSize="$4" fontWeight="600" color="$color">
                Product Details
              </Text>
              <YStack
                padding="$2"
                borderRadius="$2"
                backgroundColor="$backgroundHover"
                cursor="pointer"
                hoverStyle={{ backgroundColor: '$backgroundPress' }}
                onPress={handleClosePanel}
              >
                <X size={18} color="$colorSecondary" />
              </YStack>
            </XStack>

            {showStockAdjustment ? (
              <YStack padding="$4">
                <XStack alignItems="center" marginBottom="$4">
                  <YStack
                    padding="$2"
                    borderRadius="$2"
                    backgroundColor="$backgroundHover"
                    cursor="pointer"
                    onPress={() => setShowStockAdjustment(false)}
                  >
                    <Text color="$colorSecondary">← Back</Text>
                  </YStack>
                </XStack>
                <StockAdjustment
                  product={selectedProduct}
                  onSuccess={() => {
                    setShowStockAdjustment(false);
                    refetch();
                  }}
                />
              </YStack>
            ) : (
              <ProductAnalyticsPanel
                product={selectedProduct}
                onEdit={() => setShowEditDrawer(true)}
                onAdjustStock={() => setShowStockAdjustment(true)}
                onDelete={handleDeleteProduct}
                onViewFullDetails={() => setShowDetailModal(true)}
              />
            )}
          </YStack>
        )}
      </XStack>

      {/* Edit Drawer */}
      <ProductEditDrawer
        product={selectedProduct}
        isOpen={showEditDrawer}
        onClose={() => setShowEditDrawer(false)}
        onSuccess={() => refetch()}
      />

      {/* Full-Screen Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onSuccess={() => {
          refetch();
          setShowDetailModal(false);
        }}
      />
    </YStack>
  );
}
