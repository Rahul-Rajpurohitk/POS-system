import React, { useState } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  Plus, Minus, RefreshCw, Package, ChevronDown, Check, AlertCircle,
} from '@tamagui/lucide-icons';
import { useUpdateProductStock } from '@/features/products/hooks';
import type { Product } from '@/types';

// Professional blue theme instead of bright purple
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  teal: '#14B8A6',
};

type AdjustmentReason =
  | 'restock'
  | 'sale'
  | 'return'
  | 'damage'
  | 'inventory_count'
  | 'other';

const ADJUSTMENT_REASONS: { value: AdjustmentReason; label: string; icon: string }[] = [
  { value: 'restock', label: 'Restock / Purchase', icon: '📦' },
  { value: 'sale', label: 'Sale', icon: '🛒' },
  { value: 'return', label: 'Customer Return', icon: '↩️' },
  { value: 'damage', label: 'Damage / Loss', icon: '💔' },
  { value: 'inventory_count', label: 'Inventory Count', icon: '📋' },
  { value: 'other', label: 'Other', icon: '📝' },
];

interface StockAdjustmentProps {
  product: Product;
  onSuccess?: () => void;
  compact?: boolean;
}

export function StockAdjustment({ product, onSuccess, compact = false }: StockAdjustmentProps) {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState<AdjustmentReason | null>(null);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStock = useUpdateProductStock();
  const currentStock = product.quantity ?? 0;
  const newStock = currentStock + adjustment;

  const handleAdjust = (delta: number) => {
    const newAdjustment = adjustment + delta;
    if (currentStock + newAdjustment < 0) {
      setError('Cannot reduce stock below 0');
      return;
    }
    setError(null);
    setAdjustment(newAdjustment);
  };

  const handleInputChange = (text: string) => {
    const value = parseInt(text) || 0;
    if (currentStock + value < 0) {
      setError('Cannot reduce stock below 0');
      return;
    }
    setError(null);
    setAdjustment(value);
  };

  const handleApply = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    if (adjustment === 0) {
      setError('Please adjust the quantity');
      return;
    }

    try {
      await updateStock.mutateAsync({
        id: product.id,
        quantity: newStock,
      });
      setAdjustment(0);
      setReason(null);
      setError(null);
      onSuccess?.();
    } catch (err) {
      setError('Failed to update stock');
    }
  };

  const selectedReason = ADJUSTMENT_REASONS.find(r => r.value === reason);

  if (compact) {
    return (
      <XStack alignItems="center" gap="$2">
        <YStack
          width={28}
          height={28}
          borderRadius="$2"
          backgroundColor="$backgroundHover"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '$backgroundPress' }}
          pressStyle={{ transform: [{ scale: 0.95 }] }}
          onPress={() => handleAdjust(-1)}
        >
          <Minus size={14} color="$color" />
        </YStack>

        <Input
          width={60}
          textAlign="center"
          value={newStock.toString()}
          onChangeText={(text) => {
            const value = parseInt(text) || 0;
            setAdjustment(value - currentStock);
          }}
          keyboardType="number-pad"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$2"
          size="$3"
          paddingHorizontal="$1"
        />

        <YStack
          width={28}
          height={28}
          borderRadius="$2"
          backgroundColor="$backgroundHover"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '$backgroundPress' }}
          pressStyle={{ transform: [{ scale: 0.95 }] }}
          onPress={() => handleAdjust(1)}
        >
          <Plus size={14} color="$color" />
        </YStack>

        {adjustment !== 0 && (
          <YStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            backgroundColor={COLORS.teal}
            borderRadius="$2"
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            onPress={handleApply}
          >
            <Check size={14} color="white" />
          </YStack>
        )}
      </XStack>
    );
  }

  return (
    <YStack
      backgroundColor="$cardBackground"
      borderRadius="$3"
      padding="$4"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$4"
    >
      <XStack alignItems="center" gap="$2">
        <RefreshCw size={18} color={COLORS.teal} />
        <Text fontSize="$4" fontWeight="600" color="$color">
          Stock Adjustment
        </Text>
      </XStack>

      {/* Current Stock Display */}
      <XStack
        backgroundColor="$backgroundHover"
        padding="$3"
        borderRadius="$2"
        justifyContent="space-between"
        alignItems="center"
      >
        <YStack>
          <Text fontSize={11} color="$colorSecondary">Current Stock</Text>
          <Text fontSize="$5" fontWeight="bold" color="$color">{currentStock} units</Text>
        </YStack>
        <YStack alignItems="flex-end">
          <Text fontSize={11} color="$colorSecondary">After Adjustment</Text>
          <Text
            fontSize="$5"
            fontWeight="bold"
            color={newStock < 0 ? COLORS.error : adjustment > 0 ? COLORS.success : adjustment < 0 ? COLORS.warning : '$color'}
          >
            {newStock} units
          </Text>
        </YStack>
      </XStack>

      {/* Adjustment Controls */}
      <YStack gap="$2">
        <Text fontSize={12} color="$colorSecondary" fontWeight="600">Adjustment Amount</Text>
        <XStack alignItems="center" gap="$3">
          <YStack
            width={44}
            height={44}
            borderRadius="$3"
            backgroundColor={adjustment < 0 ? COLORS.error : '$backgroundHover'}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: adjustment < 0 ? COLORS.error : '$backgroundPress' }}
            pressStyle={{ transform: [{ scale: 0.95 }] }}
            onPress={() => handleAdjust(-10)}
          >
            <Text fontSize="$3" fontWeight="bold" color={adjustment < 0 ? 'white' : '$color'}>-10</Text>
          </YStack>

          <YStack
            width={44}
            height={44}
            borderRadius="$3"
            backgroundColor={adjustment < 0 ? COLORS.error : '$backgroundHover'}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: adjustment < 0 ? COLORS.error : '$backgroundPress' }}
            pressStyle={{ transform: [{ scale: 0.95 }] }}
            onPress={() => handleAdjust(-1)}
          >
            <Minus size={20} color={adjustment < 0 ? 'white' : '$color'} />
          </YStack>

          <YStack flex={1} alignItems="center">
            <Input
              textAlign="center"
              value={adjustment >= 0 ? `+${adjustment}` : adjustment.toString()}
              onChangeText={handleInputChange}
              keyboardType="number-pad"
              borderWidth={2}
              borderColor={adjustment === 0 ? '$borderColor' : adjustment > 0 ? COLORS.success : COLORS.error}
              borderRadius="$3"
              size="$5"
              fontWeight="bold"
              backgroundColor="$background"
            />
            <Text fontSize={10} color="$colorSecondary" marginTop="$1">
              {adjustment > 0 ? 'Adding' : adjustment < 0 ? 'Removing' : 'No change'}
            </Text>
          </YStack>

          <YStack
            width={44}
            height={44}
            borderRadius="$3"
            backgroundColor={adjustment > 0 ? COLORS.success : '$backgroundHover'}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: adjustment > 0 ? COLORS.success : '$backgroundPress' }}
            pressStyle={{ transform: [{ scale: 0.95 }] }}
            onPress={() => handleAdjust(1)}
          >
            <Plus size={20} color={adjustment > 0 ? 'white' : '$color'} />
          </YStack>

          <YStack
            width={44}
            height={44}
            borderRadius="$3"
            backgroundColor={adjustment > 0 ? COLORS.success : '$backgroundHover'}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: adjustment > 0 ? COLORS.success : '$backgroundPress' }}
            pressStyle={{ transform: [{ scale: 0.95 }] }}
            onPress={() => handleAdjust(10)}
          >
            <Text fontSize="$3" fontWeight="bold" color={adjustment > 0 ? 'white' : '$color'}>+10</Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Reason Selector */}
      <YStack gap="$2" position="relative">
        <Text fontSize={12} color="$colorSecondary" fontWeight="600">Reason for Adjustment</Text>
        <XStack
          backgroundColor="$background"
          borderRadius="$2"
          borderWidth={1}
          borderColor={error && !reason ? COLORS.error : '$borderColor'}
          paddingHorizontal="$3"
          paddingVertical="$3"
          alignItems="center"
          gap="$2"
          cursor="pointer"
          onPress={() => setShowReasonDropdown(!showReasonDropdown)}
        >
          {selectedReason ? (
            <>
              <Text fontSize="$3">{selectedReason.icon}</Text>
              <Text fontSize="$3" color="$color" flex={1}>{selectedReason.label}</Text>
            </>
          ) : (
            <Text fontSize="$3" color="$colorSecondary" flex={1}>Select a reason...</Text>
          )}
          <ChevronDown size={16} color="$colorSecondary" />
        </XStack>

        {showReasonDropdown && (
          <>
            <YStack
              position="absolute"
              top={-1000}
              left={-1000}
              right={-1000}
              bottom={-1000}
              zIndex={99}
              onPress={() => setShowReasonDropdown(false)}
            />
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
            >
              {ADJUSTMENT_REASONS.map((r) => (
                <XStack
                  key={r.value}
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                  alignItems="center"
                  gap="$2"
                  backgroundColor={reason === r.value ? '$backgroundHover' : 'transparent'}
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '$backgroundHover' }}
                  onPress={() => {
                    setReason(r.value);
                    setShowReasonDropdown(false);
                    setError(null);
                  }}
                >
                  <Text fontSize="$3">{r.icon}</Text>
                  <Text fontSize="$3" color="$color" flex={1}>{r.label}</Text>
                  {reason === r.value && <Check size={16} color={COLORS.primary} />}
                </XStack>
              ))}
            </YStack>
          </>
        )}
      </YStack>

      {/* Error Message */}
      {error && (
        <XStack
          backgroundColor="#FEE2E2"
          padding="$2"
          borderRadius="$2"
          alignItems="center"
          gap="$2"
        >
          <AlertCircle size={14} color={COLORS.error} />
          <Text fontSize={12} color={COLORS.error}>{error}</Text>
        </XStack>
      )}

      {/* Apply Button */}
      <YStack
        backgroundColor={adjustment === 0 || !reason ? '$borderColor' : COLORS.teal}
        borderRadius="$3"
        paddingVertical="$3"
        alignItems="center"
        justifyContent="center"
        cursor={adjustment === 0 || !reason ? 'not-allowed' : 'pointer'}
        opacity={updateStock.isPending ? 0.7 : 1}
        hoverStyle={adjustment !== 0 && reason ? { opacity: 0.9 } : {}}
        pressStyle={adjustment !== 0 && reason ? { transform: [{ scale: 0.98 }] } : {}}
        onPress={adjustment !== 0 && reason ? handleApply : undefined}
      >
        <XStack alignItems="center" gap="$2">
          <RefreshCw size={18} color="white" />
          <Text color="white" fontWeight="600" fontSize="$3">
            {updateStock.isPending ? 'Applying...' : 'Apply Adjustment'}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}

export default StockAdjustment;
