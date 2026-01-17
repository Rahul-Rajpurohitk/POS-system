/**
 * OrderFilterPanel - Advanced filtering system with saved presets
 */

import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import {
  Filter, X, Calendar, CreditCard, DollarSign, User, Check, ChevronDown,
  Save, Trash2,
} from '@tamagui/lucide-icons';
import type { OrderStatus } from './OrderStatusBadge';

export type PaymentMethod = 'cash' | 'card' | 'digital' | 'split' | 'all';
export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';
export type AmountRange = 'any' | 'under25' | '25to50' | '50to100' | 'over100' | 'custom';
export type CustomerType = 'all' | 'registered' | 'guest';

export interface OrderFilters {
  status: OrderStatus[];
  dateRange: DateRange;
  paymentMethod: PaymentMethod;
  amountRange: AmountRange;
  customerType: CustomerType;
  customDateStart?: Date;
  customDateEnd?: Date;
  customAmountMin?: number;
  customAmountMax?: number;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: OrderFilters;
}

interface OrderFilterPanelProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (id: string) => void;
  onClearAll: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: '#D97706' },
  { value: 'processing', label: 'Processing', color: '#2563EB' },
  { value: 'completed', label: 'Completed', color: '#059669' },
  { value: 'cancelled', label: 'Cancelled', color: '#DC2626' },
  { value: 'refunded', label: 'Refunded', color: '#7C3AED' },
  { value: 'on_hold', label: 'On Hold', color: '#6B7280' },
];

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'digital', label: 'Digital' },
  { value: 'split', label: 'Split' },
];

const AMOUNT_OPTIONS: { value: AmountRange; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'under25', label: 'Under $25' },
  { value: '25to50', label: '$25 - $50' },
  { value: '50to100', label: '$50 - $100' },
  { value: 'over100', label: 'Over $100' },
];

const CUSTOMER_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'registered', label: 'Registered' },
  { value: 'guest', label: 'Guest' },
];

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

function FilterChip({ label, selected, onPress, color }: FilterChipProps) {
  return (
    <XStack
      paddingHorizontal="$3"
      paddingVertical="$2"
      borderRadius="$2"
      backgroundColor={selected ? (color ? `${color}20` : '#3B82F620') : '$backgroundHover'}
      borderWidth={1}
      borderColor={selected ? (color || '#3B82F6') : '$borderColor'}
      cursor="pointer"
      hoverStyle={{ opacity: 0.8 }}
      pressStyle={{ transform: [{ scale: 0.95 }] }}
      onPress={onPress}
      alignItems="center"
      gap="$1"
    >
      {selected && <Check size={12} color={color || '#3B82F6'} />}
      <Text
        fontSize={12}
        fontWeight={selected ? '600' : '400'}
        color={selected ? (color || '#3B82F6') : '$color'}
      >
        {label}
      </Text>
    </XStack>
  );
}

interface FilterSectionProps {
  title: string;
  icon: any;
  children: React.ReactNode;
}

function FilterSection({ title, icon: Icon, children }: FilterSectionProps) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" gap="$2">
        <Icon size={14} color="$colorSecondary" />
        <Text fontSize={12} fontWeight="600" color="$colorSecondary" textTransform="uppercase">
          {title}
        </Text>
      </XStack>
      <XStack gap="$2" flexWrap="wrap">
        {children}
      </XStack>
    </YStack>
  );
}

export function OrderFilterPanel({
  filters,
  onChange,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  onClearAll,
  expanded = true,
  onToggleExpand,
}: OrderFilterPanelProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  const toggleStatus = (status: OrderStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onChange({ ...filters, status: newStatuses });
  };

  const activeFilterCount = [
    filters.status.length > 0,
    filters.dateRange !== 'all',
    filters.paymentMethod !== 'all',
    filters.amountRange !== 'any',
    filters.customerType !== 'all',
  ].filter(Boolean).length;

  // Active filter chips for quick display
  const activeFilters: { label: string; onRemove: () => void }[] = [];

  if (filters.status.length > 0) {
    filters.status.forEach((s) => {
      const option = STATUS_OPTIONS.find((o) => o.value === s);
      if (option) {
        activeFilters.push({
          label: option.label,
          onRemove: () => toggleStatus(s),
        });
      }
    });
  }

  if (filters.dateRange !== 'all') {
    const option = DATE_OPTIONS.find((o) => o.value === filters.dateRange);
    if (option) {
      activeFilters.push({
        label: option.label,
        onRemove: () => onChange({ ...filters, dateRange: 'all' }),
      });
    }
  }

  if (filters.paymentMethod !== 'all') {
    const option = PAYMENT_OPTIONS.find((o) => o.value === filters.paymentMethod);
    if (option) {
      activeFilters.push({
        label: option.label,
        onRemove: () => onChange({ ...filters, paymentMethod: 'all' }),
      });
    }
  }

  return (
    <YStack
      backgroundColor="$cardBackground"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      {/* Filter header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        justifyContent="space-between"
        alignItems="center"
        cursor="pointer"
        onPress={onToggleExpand}
      >
        <XStack alignItems="center" gap="$2">
          <Filter size={18} color="#3B82F6" />
          <Text fontSize={14} fontWeight="600">Filters</Text>
          {activeFilterCount > 0 && (
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={999}
              backgroundColor="#3B82F6"
            >
              <Text fontSize={11} fontWeight="600" color="white">{activeFilterCount}</Text>
            </XStack>
          )}
        </XStack>
        <XStack gap="$3" alignItems="center">
          {activeFilterCount > 0 && (
            <Text
              fontSize={12}
              color="#3B82F6"
              cursor="pointer"
              onPress={onClearAll}
            >
              Clear All
            </Text>
          )}
          <ChevronDown
            size={18}
            color="$colorSecondary"
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </XStack>
      </XStack>

      {/* Active filter chips */}
      {activeFilters.length > 0 && !expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack paddingHorizontal="$4" paddingBottom="$3" gap="$2">
            {activeFilters.map((filter, index) => (
              <XStack
                key={index}
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                backgroundColor="#3B82F620"
                borderWidth={1}
                borderColor="#3B82F6"
                alignItems="center"
                gap="$1"
              >
                <Text fontSize={11} color="#3B82F6">{filter.label}</Text>
                <X
                  size={12}
                  color="#3B82F6"
                  cursor="pointer"
                  onPress={filter.onRemove}
                />
              </XStack>
            ))}
          </XStack>
        </ScrollView>
      )}

      {/* Expanded filter panel */}
      {expanded && (
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$4">
          {/* Status filter */}
          <FilterSection title="Status" icon={Check}>
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.status.includes(option.value)}
                onPress={() => toggleStatus(option.value)}
                color={option.color}
              />
            ))}
          </FilterSection>

          {/* Date filter */}
          <FilterSection title="Date" icon={Calendar}>
            {DATE_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.dateRange === option.value}
                onPress={() => onChange({ ...filters, dateRange: option.value })}
              />
            ))}
          </FilterSection>

          {/* Payment filter */}
          <FilterSection title="Payment" icon={CreditCard}>
            {PAYMENT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.paymentMethod === option.value}
                onPress={() => onChange({ ...filters, paymentMethod: option.value })}
              />
            ))}
          </FilterSection>

          {/* Amount filter */}
          <FilterSection title="Amount" icon={DollarSign}>
            {AMOUNT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.amountRange === option.value}
                onPress={() => onChange({ ...filters, amountRange: option.value })}
              />
            ))}
          </FilterSection>

          {/* Customer type filter */}
          <FilterSection title="Customer" icon={User}>
            {CUSTOMER_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filters.customerType === option.value}
                onPress={() => onChange({ ...filters, customerType: option.value })}
              />
            ))}
          </FilterSection>

          {/* Saved filters */}
          {savedFilters.length > 0 && (
            <YStack gap="$2">
              <Text fontSize={12} fontWeight="600" color="$colorSecondary">
                Saved Filters
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {savedFilters.map((saved) => (
                  <XStack
                    key={saved.id}
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$2"
                    backgroundColor="$backgroundHover"
                    borderWidth={1}
                    borderColor="$borderColor"
                    alignItems="center"
                    gap="$2"
                  >
                    <Text
                      fontSize={12}
                      cursor="pointer"
                      onPress={() => onLoadFilter?.(saved)}
                    >
                      {saved.name}
                    </Text>
                    <Trash2
                      size={12}
                      color="$colorSecondary"
                      cursor="pointer"
                      onPress={() => onDeleteFilter?.(saved.id)}
                    />
                  </XStack>
                ))}
              </XStack>
            </YStack>
          )}

          {/* Save current filter */}
          {onSaveFilter && activeFilterCount > 0 && (
            <XStack
              alignItems="center"
              gap="$2"
              paddingTop="$2"
              borderTopWidth={1}
              borderTopColor="$borderColor"
            >
              <Save size={14} color="#3B82F6" />
              <Text
                fontSize={12}
                color="#3B82F6"
                cursor="pointer"
                onPress={() => setShowSaveDialog(true)}
              >
                Save current filter
              </Text>
            </XStack>
          )}
        </YStack>
      )}
    </YStack>
  );
}

export default OrderFilterPanel;
