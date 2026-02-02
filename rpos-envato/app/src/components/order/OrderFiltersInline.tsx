/**
 * OrderFiltersInline - Inline filter dropdowns matching Product screen style
 */
import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Search, X, ChevronDown, Check, Clock, DollarSign,
  RotateCcw, CreditCard, Users, Calendar, ShoppingBag,
  Truck, Store, CheckCircle, XCircle, AlertCircle,
} from '@tamagui/lucide-icons';

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
};

// Order Type colors for filter
const ORDER_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  walk_in: { color: '#10B981', label: 'Walk-in' },
  phone: { color: '#3B82F6', label: 'Phone Order' },
  online: { color: '#8B5CF6', label: 'Online' },
  doordash: { color: '#EF4444', label: 'DoorDash' },
  uber_eats: { color: '#22C55E', label: 'Uber Eats' },
  grubhub: { color: '#F97316', label: 'Grubhub' },
  postmates: { color: '#0EA5E9', label: 'Postmates' },
  delivery: { color: '#14B8A6', label: 'Delivery' },
};

export type OrderStatusFilter = 'all' | 'open' | 'completed' | 'pending' | 'cancelled' | 'refunded';
export type DateRangeFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';
export type PaymentMethodFilter = 'all' | 'cash' | 'card' | 'mobile' | 'split';
export type OrderTypeFilter = 'all' | 'walk_in' | 'phone' | 'online' | 'doordash' | 'uber_eats' | 'grubhub' | 'delivery';
export type AmountRangeFilter = 'all' | 'under25' | '25to50' | '50to100' | 'over100';

export interface OrderFiltersInlineState {
  search: string;
  status: OrderStatusFilter;
  dateRange: DateRangeFilter;
  paymentMethod: PaymentMethodFilter;
  orderType: OrderTypeFilter;
  amountRange: AmountRangeFilter;
  staffId: string | null;
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
        minWidth={130}
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
            minWidth={160}
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

interface OrderFiltersInlineProps {
  filters: OrderFiltersInlineState;
  onFiltersChange: (filters: OrderFiltersInlineState) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  resultCount?: number;
  staffList?: Array<{ id: string; name: string }>;
}

export function OrderFiltersInline({
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing,
  resultCount,
  staffList = [],
}: OrderFiltersInlineProps) {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.paymentMethod !== 'all' ||
    filters.orderType !== 'all' ||
    filters.amountRange !== 'all' ||
    filters.staffId !== null;

  const handleReset = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      dateRange: 'all',
      paymentMethod: 'all',
      orderType: 'all',
      amountRange: 'all',
      staffId: null,
    });
  };

  // Status options
  const statusOptions: DropdownOption[] = [
    { value: 'all', label: 'All Status', icon: <ShoppingBag size={14} color="$colorSecondary" /> },
    { value: 'open', label: 'Open', icon: <AlertCircle size={14} color={COLORS.warning} /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle size={14} color={COLORS.success} /> },
    { value: 'pending', label: 'Pending', icon: <Clock size={14} color={COLORS.warning} /> },
    { value: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} color={COLORS.error} /> },
    { value: 'refunded', label: 'Refunded', icon: <XCircle size={14} color={COLORS.purple} /> },
  ];

  // Date range options
  const dateOptions: DropdownOption[] = [
    { value: 'all', label: 'All Dates', icon: <Calendar size={14} color="$colorSecondary" /> },
    { value: 'today', label: 'Today', icon: <Calendar size={14} color={COLORS.primary} /> },
    { value: 'yesterday', label: 'Yesterday', icon: <Calendar size={14} color="$colorSecondary" /> },
    { value: 'week', label: 'This Week', icon: <Calendar size={14} color="$colorSecondary" /> },
    { value: 'month', label: 'This Month', icon: <Calendar size={14} color="$colorSecondary" /> },
  ];

  // Payment method options
  const paymentOptions: DropdownOption[] = [
    { value: 'all', label: 'All Payments', icon: <CreditCard size={14} color="$colorSecondary" /> },
    { value: 'cash', label: 'Cash', color: COLORS.success },
    { value: 'card', label: 'Card', color: COLORS.purple },
    { value: 'mobile', label: 'Mobile Pay', color: COLORS.pink },
    { value: 'split', label: 'Split', color: '#6B7280' },
  ];

  // Order type options
  const orderTypeOptions: DropdownOption[] = [
    { value: 'all', label: 'All Types', icon: <Store size={14} color="$colorSecondary" /> },
    { value: 'walk_in', label: 'Walk-in', color: ORDER_TYPE_COLORS.walk_in.color },
    { value: 'phone', label: 'Phone', color: ORDER_TYPE_COLORS.phone.color },
    { value: 'online', label: 'Online', color: ORDER_TYPE_COLORS.online.color },
    { value: 'doordash', label: 'DoorDash', color: ORDER_TYPE_COLORS.doordash.color },
    { value: 'uber_eats', label: 'Uber Eats', color: ORDER_TYPE_COLORS.uber_eats.color },
    { value: 'grubhub', label: 'Grubhub', color: ORDER_TYPE_COLORS.grubhub.color },
    { value: 'delivery', label: 'Delivery', color: ORDER_TYPE_COLORS.delivery.color },
  ];

  // Amount range options
  const amountOptions: DropdownOption[] = [
    { value: 'all', label: 'Any Amount', icon: <DollarSign size={14} color="$colorSecondary" /> },
    { value: 'under25', label: 'Under $25' },
    { value: '25to50', label: '$25 - $50' },
    { value: '50to100', label: '$50 - $100' },
    { value: 'over100', label: 'Over $100' },
  ];

  // Staff options
  const staffOptions: DropdownOption[] = [
    { value: '', label: 'All Staff', icon: <Users size={14} color="$colorSecondary" /> },
    ...staffList.map(s => ({
      value: s.id,
      label: s.name,
    })),
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
          minWidth={220}
          maxWidth={400}
          backgroundColor="white"
          borderRadius="$3"
          borderWidth={1}
          borderColor={filters.search ? COLORS.primary : '#E5E7EB'}
          paddingHorizontal="$3"
          paddingVertical="$2"
          alignItems="center"
          gap="$2"
          hoverStyle={{ borderColor: COLORS.primary }}
        >
          <Search size={16} color={filters.search ? COLORS.primary : '#9CA3AF'} />
          <Input
            flex={1}
            value={filters.search}
            onChangeText={(text) => onFiltersChange({ ...filters, search: text })}
            placeholder="Search orders by #, customer..."
            borderWidth={0}
            backgroundColor="transparent"
            fontSize={13}
            paddingHorizontal={0}
            paddingVertical={0}
            placeholderTextColor="#9CA3AF"
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
          label="Status"
          icon={<ShoppingBag size={14} color={filters.status !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={statusOptions}
          value={filters.status}
          onChange={(value) => onFiltersChange({ ...filters, status: value as OrderStatusFilter })}
        />

        <FilterDropdown
          label="Date"
          icon={<Calendar size={14} color={filters.dateRange !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={dateOptions}
          value={filters.dateRange}
          onChange={(value) => onFiltersChange({ ...filters, dateRange: value as DateRangeFilter })}
        />

        <FilterDropdown
          label="Payment"
          icon={<CreditCard size={14} color={filters.paymentMethod !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={paymentOptions}
          value={filters.paymentMethod}
          onChange={(value) => onFiltersChange({ ...filters, paymentMethod: value as PaymentMethodFilter })}
        />

        <FilterDropdown
          label="Order Type"
          icon={<Store size={14} color={filters.orderType !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={orderTypeOptions}
          value={filters.orderType}
          onChange={(value) => onFiltersChange({ ...filters, orderType: value as OrderTypeFilter })}
        />

        <FilterDropdown
          label="Amount"
          icon={<DollarSign size={14} color={filters.amountRange !== 'all' ? COLORS.primary : '$colorSecondary'} />}
          options={amountOptions}
          value={filters.amountRange}
          onChange={(value) => onFiltersChange({ ...filters, amountRange: value as AmountRangeFilter })}
        />

        {staffList.length > 0 && (
          <FilterDropdown
            label="Staff"
            icon={<Users size={14} color={filters.staffId ? COLORS.primary : '$colorSecondary'} />}
            options={staffOptions}
            value={filters.staffId || ''}
            onChange={(value) => onFiltersChange({ ...filters, staffId: value || null })}
          />
        )}

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

      {/* Results count */}
      {(hasActiveFilters || resultCount !== undefined) && (
        <XStack alignItems="center" gap="$2">
          {resultCount !== undefined && (
            <Text fontSize={12} color="$colorSecondary">
              {resultCount} order{resultCount !== 1 ? 's' : ''} found
            </Text>
          )}
        </XStack>
      )}
    </YStack>
  );
}

export default OrderFiltersInline;
