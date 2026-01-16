import React, { useState, useMemo } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { Search, ChevronDown, Check, Truck, X } from '@tamagui/lucide-icons';
import type { Supplier, SupplierRef } from '@/types';

const COLORS = {
  primary: '#3B82F6',
  supplierBg: '#F0FDF4',
  supplierBorder: '#86EFAC',
  supplierText: '#166534',
};

interface SupplierSelectorProps {
  value: string | null;
  onChange: (supplierId: string | null) => void;
  suppliers: Supplier[] | SupplierRef[];
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export function SupplierSelector({
  value,
  onChange,
  suppliers,
  placeholder = 'Select supplier...',
  disabled = false,
  allowClear = true,
}: SupplierSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === value),
    [suppliers, value]
  );

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const handleSelect = (supplierId: string) => {
    onChange(supplierId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <YStack position="relative">
      {/* Selected value display / trigger */}
      <XStack
        backgroundColor={disabled ? '$backgroundHover' : '$background'}
        borderRadius="$2"
        borderWidth={1}
        borderColor={isOpen ? COLORS.primary : '$borderColor'}
        paddingHorizontal="$3"
        paddingVertical="$2"
        alignItems="center"
        gap="$2"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.7 : 1}
        hoverStyle={!disabled ? { borderColor: COLORS.primary } : {}}
        onPress={() => !disabled && setIsOpen(!isOpen)}
      >
        <Truck size={16} color={selectedSupplier ? COLORS.supplierText : '$colorSecondary'} />

        {selectedSupplier ? (
          <XStack flex={1} alignItems="center" gap="$2">
            <XStack
              backgroundColor={COLORS.supplierBg}
              borderWidth={1}
              borderColor={COLORS.supplierBorder}
              borderRadius="$1"
              paddingHorizontal="$1"
              paddingVertical={1}
            >
              <Text fontSize={10} color={COLORS.supplierText} fontWeight="600">
                {selectedSupplier.code}
              </Text>
            </XStack>
            <Text fontSize={13} color="$color" flex={1} numberOfLines={1}>
              {selectedSupplier.name}
            </Text>
          </XStack>
        ) : (
          <Text fontSize={13} color="$colorSecondary" flex={1}>
            {placeholder}
          </Text>
        )}

        {allowClear && selectedSupplier && !disabled && (
          <YStack
            padding={2}
            borderRadius="$1"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$backgroundPress' }}
            onPress={handleClear}
          >
            <X size={14} color="$colorSecondary" />
          </YStack>
        )}

        <ChevronDown
          size={16}
          color="$colorSecondary"
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </XStack>

      {/* Dropdown */}
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
            onPress={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
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
            maxHeight={300}
          >
            {/* Search input */}
            <XStack
              padding="$2"
              borderBottomWidth={1}
              borderBottomColor="$borderColor"
              alignItems="center"
              gap="$2"
            >
              <Search size={14} color="$colorSecondary" />
              <Input
                flex={1}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search suppliers..."
                borderWidth={0}
                backgroundColor="transparent"
                size="$2"
                paddingHorizontal={0}
                autoFocus
              />
            </XStack>

            {/* Supplier list */}
            <YStack maxHeight={220} overflow="scroll">
              {filteredSuppliers.length === 0 ? (
                <YStack padding="$3" alignItems="center">
                  <Text fontSize={13} color="$colorSecondary">
                    No suppliers found
                  </Text>
                </YStack>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const isSelected = supplier.id === value;
                  return (
                    <XStack
                      key={supplier.id}
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      alignItems="center"
                      gap="$2"
                      backgroundColor={isSelected ? '$backgroundHover' : 'transparent'}
                      cursor="pointer"
                      hoverStyle={{ backgroundColor: '$backgroundHover' }}
                      onPress={() => handleSelect(supplier.id)}
                    >
                      <XStack
                        backgroundColor={COLORS.supplierBg}
                        borderWidth={1}
                        borderColor={COLORS.supplierBorder}
                        borderRadius="$1"
                        paddingHorizontal="$1"
                        paddingVertical={1}
                        minWidth={50}
                        justifyContent="center"
                      >
                        <Text fontSize={10} color={COLORS.supplierText} fontWeight="600">
                          {supplier.code}
                        </Text>
                      </XStack>
                      <Text fontSize={13} color="$color" flex={1}>
                        {supplier.name}
                      </Text>
                      {isSelected && <Check size={16} color={COLORS.primary} />}
                    </XStack>
                  );
                })
              )}
            </YStack>
          </YStack>
        </>
      )}
    </YStack>
  );
}

export default SupplierSelector;
