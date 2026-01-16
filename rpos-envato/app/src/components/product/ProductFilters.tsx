import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, Filter, X, ChevronDown, Check, Package, AlertTriangle,
  DollarSign, RotateCcw,
} from '@tamagui/lucide-icons';
import type { Category } from '@/types';

// Professional blue theme instead of bright purple
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export type StockStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type PriceRange = 'all' | 'under_10' | '10_50' | '50_100' | 'over_100' | 'custom';

export interface ProductFiltersState {
  search: string;
  category: string | null;
  stockStatus: StockStatus;
  priceRange: PriceRange;
  minPrice?: number;
  maxPrice?: number;
}

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}

function FilterDropdown({ label, icon, options, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <YStack position="relative">
      <XStack
        backgroundColor="$cardBackground"
        borderRadius="$2"
        borderWidth={1}
        borderColor={value !== 'all' && value !== '' ? COLORS.primary : '$borderColor'}
        paddingHorizontal="$3"
        paddingVertical="$2"
        alignItems="center"
        gap="$2"
        cursor="pointer"
        minWidth={140}
        hoverStyle={{ borderColor: COLORS.primary }}
        onPress={() => setIsOpen(!isOpen)}
      >
        {icon}
        <Text fontSize={12} color="$color" flex={1} numberOfLines={1}>
          {selectedOption?.label || label}
        </Text>
        <ChevronDown
          size={14}
          color="$colorSecondary"
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </XStack>

      {isOpen && (
        <>
          {/* Backdrop */}
          <YStack
            position="absolute"
            top={-1000}
            left={-1000}
            right={-1000}
            bottom={-1000}
            zIndex={99}
            onPress={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <YStack
            position="absolute"
            top="100%"
            left={0}
            right={0}
            marginTop="$1"
            backgroundColor="$cardBackground"
            borderRadius="$2"
            borderWidth={1}
            borderColor="$borderColor"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.15}
            shadowRadius={12}
            elevation={8}
            zIndex={100}
            overflow="hidden"
            minWidth={180}
          >
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <XStack
                  key={option.value}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  alignItems="center"
                  gap="$2"
                  backgroundColor={isSelected ? '$backgroundHover' : 'transparent'}
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '$backgroundHover' }}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.icon && option.icon}
                  {option.color && (
                    <YStack
                      width={12}
                      height={12}
                      borderRadius={6}
                      backgroundColor={option.color}
                    />
                  )}
                  <Text fontSize={12} color="$color" flex={1}>
                    {option.label}
                  </Text>
                  {isSelected && <Check size={14} color={COLORS.primary} />}
                </XStack>
              );
            })}
          </YStack>
        </>
      )}
    </YStack>
  );
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onFiltersChange: (filters: ProductFiltersState) => void;
  categories: Category[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  resultCount?: number;
}

export function ProductFilters({
  filters,
  onFiltersChange,
  categories,
  onRefresh,
  isRefreshing,
  resultCount,
}: ProductFiltersProps) {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== null ||
    filters.stockStatus !== 'all' ||
    filters.priceRange !== 'all';

  const handleReset = () => {
    onFiltersChange({
      search: '',
      category: null,
      stockStatus: 'all',
      priceRange: 'all',
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  // Category options
  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...(Array.isArray(categories) ? categories : []).map(cat => ({
      value: cat.id,
      label: cat.name,
      color: cat.color || '#6B7280',
    })),
  ];

  // Stock status options
  const stockOptions: DropdownOption[] = [
    { value: 'all', label: 'All Stock', icon: <Package size={14} color="$colorSecondary" /> },
    { value: 'in_stock', label: 'In Stock', icon: <Package size={14} color={COLORS.success} /> },
    { value: 'low_stock', label: 'Low Stock', icon: <AlertTriangle size={14} color={COLORS.warning} /> },
    { value: 'out_of_stock', label: 'Out of Stock', icon: <Package size={14} color={COLORS.error} /> },
  ];

  // Price range options
  const priceOptions: DropdownOption[] = [
    { value: 'all', label: 'Any Price' },
    { value: 'under_10', label: 'Under $10' },
    { value: '10_50', label: '$10 - $50' },
    { value: '50_100', label: '$50 - $100' },
    { value: 'over_100', label: 'Over $100' },
  ];

  return (
    <YStack
      backgroundColor="$cardBackground"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      padding="$3"
      gap="$3"
    >
      <XStack gap="$3" alignItems="center" flexWrap="wrap">
        {/* Search Input */}
        <XStack
          flex={1}
          minWidth={250}
          backgroundColor="$background"
          borderRadius="$2"
          borderWidth={1}
          borderColor="$borderColor"
          paddingHorizontal="$3"
          paddingVertical="$2"
          alignItems="center"
          gap="$2"
        >
          <Search size={16} color={COLORS.primary} />
          <Input
            flex={1}
            value={filters.search}
            onChangeText={(text) => onFiltersChange({ ...filters, search: text })}
            placeholder="Search products by name, SKU, or category..."
            borderWidth={0}
            backgroundColor="transparent"
            size="$3"
            paddingHorizontal={0}
          />
          {filters.search ? (
            <YStack
              padding="$1"
              borderRadius="$1"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '$backgroundHover' }}
              onPress={() => onFiltersChange({ ...filters, search: '' })}
            >
              <X size={14} color="$colorSecondary" />
            </YStack>
          ) : null}
        </XStack>

        {/* Filter Dropdowns */}
        <FilterDropdown
          label="Category"
          icon={<Filter size={14} color={filters.category ? COLORS.primary : '$colorSecondary'} />}
          options={categoryOptions}
          value={filters.category || ''}
          onChange={(value) => onFiltersChange({ ...filters, category: value || null })}
        />

        <FilterDropdown
          label="Stock Status"
          icon={<Package size={14} color={filters.stockStatus !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={stockOptions}
          value={filters.stockStatus}
          onChange={(value) => onFiltersChange({ ...filters, stockStatus: value as StockStatus })}
        />

        <FilterDropdown
          label="Price Range"
          icon={<DollarSign size={14} color={filters.priceRange !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={priceOptions}
          value={filters.priceRange}
          onChange={(value) => onFiltersChange({ ...filters, priceRange: value as PriceRange })}
        />

        {/* Reset & Refresh */}
        {hasActiveFilters && (
          <XStack
            backgroundColor="$backgroundHover"
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$backgroundPress' }}
            onPress={handleReset}
          >
            <RotateCcw size={14} color={COLORS.error} />
            <Text fontSize={12} color={COLORS.error} fontWeight="500">
              Reset
            </Text>
          </XStack>
        )}

        {onRefresh && (
          <YStack
            padding="$2"
            borderRadius="$2"
            backgroundColor="$backgroundHover"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$backgroundPress' }}
            onPress={onRefresh}
          >
            <RotateCcw
              size={16}
              color={isRefreshing ? COLORS.primary : '$colorSecondary'}
            />
          </YStack>
        )}
      </XStack>

      {/* Results count & active filters summary */}
      {(hasActiveFilters || resultCount !== undefined) && (
        <XStack alignItems="center" gap="$2">
          {resultCount !== undefined && (
            <Text fontSize={12} color="$colorSecondary">
              {resultCount} product{resultCount !== 1 ? 's' : ''} found
            </Text>
          )}

          {hasActiveFilters && (
            <XStack flex={1} gap="$2" flexWrap="wrap" justifyContent="flex-end">
              {filters.search && (
                <XStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$1"
                  alignItems="center"
                  gap="$1"
                >
                  <Text fontSize={11} color="$colorSecondary">
                    Search: "{filters.search.length > 15 ? filters.search.substring(0, 15) + '...' : filters.search}"
                  </Text>
                  <X
                    size={10}
                    color="$colorSecondary"
                    onPress={() => onFiltersChange({ ...filters, search: '' })}
                  />
                </XStack>
              )}
              {filters.category && (
                <XStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$1"
                  alignItems="center"
                  gap="$1"
                >
                  <YStack
                    width={8}
                    height={8}
                    borderRadius={4}
                    backgroundColor={(Array.isArray(categories) ? categories : []).find(c => c.id === filters.category)?.color || '#6B7280'}
                  />
                  <Text fontSize={11} color="$colorSecondary">
                    {(Array.isArray(categories) ? categories : []).find(c => c.id === filters.category)?.name}
                  </Text>
                  <X
                    size={10}
                    color="$colorSecondary"
                    onPress={() => onFiltersChange({ ...filters, category: null })}
                  />
                </XStack>
              )}
              {filters.stockStatus !== 'all' && (
                <XStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$1"
                  alignItems="center"
                  gap="$1"
                >
                  <Text fontSize={11} color="$colorSecondary">
                    {stockOptions.find(o => o.value === filters.stockStatus)?.label}
                  </Text>
                  <X
                    size={10}
                    color="$colorSecondary"
                    onPress={() => onFiltersChange({ ...filters, stockStatus: 'all' })}
                  />
                </XStack>
              )}
              {filters.priceRange !== 'all' && (
                <XStack
                  backgroundColor="$backgroundHover"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$1"
                  alignItems="center"
                  gap="$1"
                >
                  <Text fontSize={11} color="$colorSecondary">
                    {priceOptions.find(o => o.value === filters.priceRange)?.label}
                  </Text>
                  <X
                    size={10}
                    color="$colorSecondary"
                    onPress={() => onFiltersChange({ ...filters, priceRange: 'all' })}
                  />
                </XStack>
              )}
            </XStack>
          )}
        </XStack>
      )}
    </YStack>
  );
}

export default ProductFilters;
