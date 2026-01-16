import React, { useState, useMemo } from 'react';
import { YStack, XStack, Text, Input, TextArea } from 'tamagui';
import {
  Plus, Minus, RefreshCw, ChevronDown, Check, AlertCircle,
  TrendingUp, TrendingDown, Package, ArrowRight, History,
} from '@tamagui/lucide-icons';
import { useCreateStockAdjustment } from '@/features/inventory/hooks';
import type { StockAdjustmentType } from '@/features/inventory/api';
import type { Product } from '@/types';

// Professional color palette
const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
  white: '#FFFFFF',
  dark: '#111827',
};

// Adjustment reasons mapped to API types
const ADJUSTMENT_REASONS: {
  value: StockAdjustmentType;
  label: string;
  icon: string;
  description: string;
  type: 'add' | 'remove' | 'both';
}[] = [
  { value: 'purchase_order', label: 'Restock / Purchase', icon: '📦', description: 'Stock received from supplier', type: 'add' },
  { value: 'return', label: 'Customer Return', icon: '↩️', description: 'Returned item back to stock', type: 'add' },
  { value: 'count', label: 'Inventory Count', icon: '📋', description: 'Physical count correction', type: 'both' },
  { value: 'sale', label: 'Sale Adjustment', icon: '🛒', description: 'Correct for unrecorded sale', type: 'remove' },
  { value: 'damage', label: 'Damaged Goods', icon: '💔', description: 'Product damaged or broken', type: 'remove' },
  { value: 'loss', label: 'Loss / Theft', icon: '🚨', description: 'Missing or stolen inventory', type: 'remove' },
  { value: 'write_off', label: 'Write Off', icon: '🗑️', description: 'Expired or unsellable items', type: 'remove' },
  { value: 'correction', label: 'General Correction', icon: '📝', description: 'Other stock correction', type: 'both' },
];

// Quick adjustment presets
const QUICK_ADJUSTMENTS = {
  add: [1, 5, 10, 25, 50, 100],
  remove: [-1, -5, -10, -25, -50, -100],
};

type AdjustmentMode = 'adjust' | 'set';

interface StockAdjustmentProps {
  product: Product;
  onSuccess?: () => void;
  compact?: boolean;
}

export function StockAdjustment({ product, onSuccess, compact = false }: StockAdjustmentProps) {
  const [mode, setMode] = useState<AdjustmentMode>('adjust');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [setToValue, setSetToValue] = useState('');
  const [reason, setReason] = useState<StockAdjustmentType | null>(null);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const createAdjustment = useCreateStockAdjustment();
  const currentStock = product.quantity ?? 0;

  // Calculate actual adjustment and new stock
  const { adjustment, newStock, isValid } = useMemo(() => {
    if (mode === 'set') {
      const setTo = parseInt(setToValue) || 0;
      const adj = setTo - currentStock;
      return {
        adjustment: adj,
        newStock: setTo,
        isValid: setToValue !== '' && setTo >= 0
      };
    } else {
      const adj = parseInt(adjustmentValue) || 0;
      const newStk = currentStock + adj;
      return {
        adjustment: adj,
        newStock: newStk,
        isValid: adjustmentValue !== '' && adj !== 0 && newStk >= 0
      };
    }
  }, [mode, adjustmentValue, setToValue, currentStock]);

  const handleQuickAdjust = (value: number) => {
    setMode('adjust');
    const currentAdj = parseInt(adjustmentValue) || 0;
    const newAdj = currentAdj + value;
    if (currentStock + newAdj < 0) {
      setError('Cannot reduce stock below 0');
      return;
    }
    setError(null);
    setAdjustmentValue(newAdj.toString());
  };

  const handleAdjustmentInput = (text: string) => {
    // Allow empty, numbers, and negative sign
    const cleaned = text.replace(/[^0-9-]/g, '');
    if (cleaned === '' || cleaned === '-') {
      setAdjustmentValue(cleaned);
      setError(null);
      return;
    }
    const value = parseInt(cleaned) || 0;
    if (currentStock + value < 0) {
      setError('Cannot reduce stock below 0');
    } else {
      setError(null);
    }
    setAdjustmentValue(cleaned);
  };

  const handleSetToInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setSetToValue(cleaned);
    const value = parseInt(cleaned) || 0;
    if (value < 0) {
      setError('Stock cannot be negative');
    } else {
      setError(null);
    }
  };

  const handleApply = async () => {
    if (!reason) {
      setError('Please select a reason for this adjustment');
      return;
    }
    if (!isValid || adjustment === 0) {
      setError('Please enter a valid adjustment amount');
      return;
    }

    try {
      await createAdjustment.mutateAsync({
        productId: product.id,
        type: reason,
        quantity: adjustment,
        reason: ADJUSTMENT_REASONS.find(r => r.value === reason)?.label || reason,
        notes: notes.trim() || undefined,
      });
      // Reset form
      setAdjustmentValue('');
      setSetToValue('');
      setReason(null);
      setNotes('');
      setError(null);
      setMode('adjust');
      onSuccess?.();
    } catch (err) {
      setError('Failed to save stock adjustment');
    }
  };

  const selectedReason = ADJUSTMENT_REASONS.find(r => r.value === reason);

  // Compact mode for inline editing
  if (compact) {
    return (
      <XStack alignItems="center" gap="$2">
        <XStack
          width={32}
          height={32}
          borderRadius={8}
          backgroundColor={COLORS.errorLight}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '#FECACA' }}
          pressStyle={{ transform: [{ scale: 0.95 }] }}
          onPress={() => handleQuickAdjust(-1)}
        >
          <Minus size={16} color={COLORS.error} />
        </XStack>

        <YStack
          backgroundColor={COLORS.grayLight}
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius={8}
          minWidth={60}
          alignItems="center"
        >
          <Text fontSize={14} fontWeight="700" color={COLORS.dark}>
            {currentStock}
          </Text>
        </YStack>

        <XStack
          width={32}
          height={32}
          borderRadius={8}
          backgroundColor={COLORS.successLight}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '#A7F3D0' }}
          pressStyle={{ transform: [{ scale: 0.95 }] }}
          onPress={() => handleQuickAdjust(1)}
        >
          <Plus size={16} color={COLORS.success} />
        </XStack>
      </XStack>
    );
  }

  return (
    <YStack
      backgroundColor={COLORS.white}
      borderRadius={12}
      padding="$4"
      borderWidth={1}
      borderColor={COLORS.border}
      gap="$4"
    >
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <YStack
            width={36}
            height={36}
            borderRadius={8}
            backgroundColor={COLORS.primaryLight}
            alignItems="center"
            justifyContent="center"
          >
            <Package size={18} color={COLORS.primary} />
          </YStack>
          <YStack>
            <Text fontSize={16} fontWeight="700" color={COLORS.dark}>
              Stock Adjustment
            </Text>
            <Text fontSize={12} color={COLORS.gray}>
              {product.name}
            </Text>
          </YStack>
        </XStack>
      </XStack>

      {/* Current Stock Display */}
      <XStack
        backgroundColor={COLORS.grayLight}
        padding="$4"
        borderRadius={10}
        justifyContent="space-between"
        alignItems="center"
      >
        <YStack alignItems="center" flex={1}>
          <Text fontSize={11} color={COLORS.gray} fontWeight="600" textTransform="uppercase">
            Current
          </Text>
          <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
            {currentStock}
          </Text>
          <Text fontSize={11} color={COLORS.gray}>units</Text>
        </YStack>

        <YStack alignItems="center" paddingHorizontal="$4">
          <ArrowRight size={24} color={adjustment === 0 ? COLORS.border : adjustment > 0 ? COLORS.success : COLORS.error} />
          {adjustment !== 0 && (
            <Text
              fontSize={12}
              fontWeight="700"
              color={adjustment > 0 ? COLORS.success : COLORS.error}
            >
              {adjustment > 0 ? `+${adjustment}` : adjustment}
            </Text>
          )}
        </YStack>

        <YStack alignItems="center" flex={1}>
          <Text fontSize={11} color={COLORS.gray} fontWeight="600" textTransform="uppercase">
            After
          </Text>
          <Text
            fontSize={28}
            fontWeight="800"
            color={newStock < 0 ? COLORS.error : adjustment > 0 ? COLORS.success : adjustment < 0 ? COLORS.warning : COLORS.dark}
          >
            {newStock}
          </Text>
          <Text fontSize={11} color={COLORS.gray}>units</Text>
        </YStack>
      </XStack>

      {/* Mode Toggle */}
      <XStack gap="$2">
        <XStack
          flex={1}
          backgroundColor={mode === 'adjust' ? COLORS.primary : COLORS.white}
          borderRadius={8}
          paddingVertical="$2"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor={mode === 'adjust' ? COLORS.primary : COLORS.border}
          cursor="pointer"
          hoverStyle={{ borderColor: COLORS.primary }}
          onPress={() => {
            setMode('adjust');
            setSetToValue('');
            setError(null);
          }}
        >
          <Text
            fontSize={13}
            fontWeight="600"
            color={mode === 'adjust' ? COLORS.white : COLORS.gray}
          >
            Add / Remove
          </Text>
        </XStack>
        <XStack
          flex={1}
          backgroundColor={mode === 'set' ? COLORS.primary : COLORS.white}
          borderRadius={8}
          paddingVertical="$2"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor={mode === 'set' ? COLORS.primary : COLORS.border}
          cursor="pointer"
          hoverStyle={{ borderColor: COLORS.primary }}
          onPress={() => {
            setMode('set');
            setAdjustmentValue('');
            setError(null);
          }}
        >
          <Text
            fontSize={13}
            fontWeight="600"
            color={mode === 'set' ? COLORS.white : COLORS.gray}
          >
            Set To Exact
          </Text>
        </XStack>
      </XStack>

      {/* Adjustment Input */}
      {mode === 'adjust' ? (
        <YStack gap="$3">
          {/* Main Input with +/- Buttons */}
          <XStack alignItems="center" gap="$3">
            <XStack
              width={52}
              height={52}
              borderRadius={10}
              backgroundColor={COLORS.errorLight}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#FECACA' }}
              pressStyle={{ transform: [{ scale: 0.95 }] }}
              onPress={() => handleQuickAdjust(-1)}
            >
              <Minus size={24} color={COLORS.error} strokeWidth={3} />
            </XStack>

            <YStack flex={1}>
              <Input
                textAlign="center"
                value={adjustmentValue}
                onChangeText={handleAdjustmentInput}
                keyboardType="number-pad"
                placeholder="0"
                backgroundColor={COLORS.white}
                borderWidth={2}
                borderColor={
                  adjustmentValue === '' || parseInt(adjustmentValue) === 0
                    ? COLORS.border
                    : parseInt(adjustmentValue) > 0
                      ? COLORS.success
                      : COLORS.error
                }
                borderRadius={10}
                size="$5"
                fontSize={24}
                fontWeight="700"
                color={COLORS.dark}
                focusStyle={{ borderColor: COLORS.primary }}
              />
            </YStack>

            <XStack
              width={52}
              height={52}
              borderRadius={10}
              backgroundColor={COLORS.successLight}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#A7F3D0' }}
              pressStyle={{ transform: [{ scale: 0.95 }] }}
              onPress={() => handleQuickAdjust(1)}
            >
              <Plus size={24} color={COLORS.success} strokeWidth={3} />
            </XStack>
          </XStack>

          {/* Quick Adjustment Presets */}
          <YStack gap="$2">
            <Text fontSize={11} color={COLORS.gray} fontWeight="600" textTransform="uppercase">
              Quick Add
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {QUICK_ADJUSTMENTS.add.map((value) => (
                <XStack
                  key={value}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius={8}
                  backgroundColor={COLORS.successLight}
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '#A7F3D0' }}
                  pressStyle={{ transform: [{ scale: 0.95 }] }}
                  onPress={() => handleQuickAdjust(value)}
                >
                  <Text fontSize={13} fontWeight="600" color={COLORS.success}>
                    +{value}
                  </Text>
                </XStack>
              ))}
            </XStack>
          </YStack>

          <YStack gap="$2">
            <Text fontSize={11} color={COLORS.gray} fontWeight="600" textTransform="uppercase">
              Quick Remove
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {QUICK_ADJUSTMENTS.remove.map((value) => (
                <XStack
                  key={value}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius={8}
                  backgroundColor={COLORS.errorLight}
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '#FECACA' }}
                  pressStyle={{ transform: [{ scale: 0.95 }] }}
                  onPress={() => handleQuickAdjust(value)}
                >
                  <Text fontSize={13} fontWeight="600" color={COLORS.error}>
                    {value}
                  </Text>
                </XStack>
              ))}
            </XStack>
          </YStack>
        </YStack>
      ) : (
        <YStack gap="$2">
          <Text fontSize={12} color={COLORS.gray} fontWeight="600">
            Set stock to exact amount
          </Text>
          <Input
            textAlign="center"
            value={setToValue}
            onChangeText={handleSetToInput}
            keyboardType="number-pad"
            placeholder={currentStock.toString()}
            backgroundColor={COLORS.white}
            borderWidth={2}
            borderColor={setToValue === '' ? COLORS.border : COLORS.primary}
            borderRadius={10}
            size="$5"
            fontSize={24}
            fontWeight="700"
            color={COLORS.dark}
            focusStyle={{ borderColor: COLORS.primary }}
          />
          {setToValue !== '' && (
            <Text fontSize={12} color={adjustment > 0 ? COLORS.success : adjustment < 0 ? COLORS.error : COLORS.gray} textAlign="center">
              {adjustment === 0
                ? 'No change'
                : adjustment > 0
                  ? `Will add ${adjustment} units`
                  : `Will remove ${Math.abs(adjustment)} units`
              }
            </Text>
          )}
        </YStack>
      )}

      {/* Reason Selector */}
      <YStack gap="$2" position="relative" zIndex={100}>
        <Text fontSize={12} color={COLORS.gray} fontWeight="600">
          Reason for Adjustment *
        </Text>
        <XStack
          backgroundColor={COLORS.white}
          borderRadius={10}
          borderWidth={1}
          borderColor={error && !reason ? COLORS.error : COLORS.border}
          paddingHorizontal="$3"
          paddingVertical="$3"
          alignItems="center"
          gap="$2"
          cursor="pointer"
          hoverStyle={{ borderColor: COLORS.primary }}
          onPress={() => setShowReasonDropdown(!showReasonDropdown)}
        >
          {selectedReason ? (
            <>
              <Text fontSize={16}>{selectedReason.icon}</Text>
              <YStack flex={1}>
                <Text fontSize={14} color={COLORS.dark} fontWeight="500">{selectedReason.label}</Text>
                <Text fontSize={11} color={COLORS.gray}>{selectedReason.description}</Text>
              </YStack>
            </>
          ) : (
            <Text fontSize={14} color={COLORS.gray} flex={1}>Select a reason...</Text>
          )}
          <ChevronDown size={18} color={COLORS.gray} />
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
              backgroundColor={COLORS.white}
              borderRadius={10}
              borderWidth={1}
              borderColor={COLORS.border}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.15}
              shadowRadius={12}
              elevation={8}
              zIndex={100}
              overflow="hidden"
              maxHeight={300}
            >
              {ADJUSTMENT_REASONS.map((r) => (
                <XStack
                  key={r.value}
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                  alignItems="center"
                  gap="$2"
                  backgroundColor={reason === r.value ? COLORS.primaryLight : 'transparent'}
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: COLORS.grayLight }}
                  onPress={() => {
                    setReason(r.value);
                    setShowReasonDropdown(false);
                    setError(null);
                  }}
                >
                  <Text fontSize={18}>{r.icon}</Text>
                  <YStack flex={1}>
                    <Text fontSize={14} color={COLORS.dark} fontWeight="500">{r.label}</Text>
                    <Text fontSize={11} color={COLORS.gray}>{r.description}</Text>
                  </YStack>
                  {reason === r.value && <Check size={16} color={COLORS.primary} />}
                </XStack>
              ))}
            </YStack>
          </>
        )}
      </YStack>

      {/* Notes Field */}
      <YStack gap="$2">
        <Text fontSize={12} color={COLORS.gray} fontWeight="600">
          Notes (Optional)
        </Text>
        <TextArea
          placeholder="Add notes about this adjustment..."
          value={notes}
          onChangeText={setNotes}
          borderWidth={1}
          borderColor={COLORS.border}
          borderRadius={10}
          backgroundColor={COLORS.white}
          minHeight={70}
          padding="$3"
          fontSize={14}
          color={COLORS.dark}
          placeholderTextColor={COLORS.gray}
          focusStyle={{ borderColor: COLORS.primary }}
        />
      </YStack>

      {/* Error Message */}
      {error && (
        <XStack
          backgroundColor={COLORS.errorLight}
          padding="$3"
          borderRadius={8}
          alignItems="center"
          gap="$2"
        >
          <AlertCircle size={16} color={COLORS.error} />
          <Text fontSize={13} color={COLORS.error} fontWeight="500">{error}</Text>
        </XStack>
      )}

      {/* Apply Button */}
      <XStack
        backgroundColor={
          !isValid || adjustment === 0 || !reason
            ? COLORS.grayLight
            : adjustment > 0
              ? COLORS.success
              : COLORS.warning
        }
        borderRadius={10}
        paddingVertical="$4"
        alignItems="center"
        justifyContent="center"
        cursor={!isValid || adjustment === 0 || !reason || createAdjustment.isPending ? 'not-allowed' : 'pointer'}
        opacity={createAdjustment.isPending ? 0.7 : 1}
        hoverStyle={isValid && adjustment !== 0 && reason && !createAdjustment.isPending ? { opacity: 0.9 } : {}}
        pressStyle={isValid && adjustment !== 0 && reason && !createAdjustment.isPending ? { transform: [{ scale: 0.98 }] } : {}}
        onPress={isValid && adjustment !== 0 && reason && !createAdjustment.isPending ? handleApply : undefined}
      >
        <XStack alignItems="center" gap="$2">
          {adjustment > 0 ? (
            <TrendingUp size={20} color={COLORS.white} />
          ) : adjustment < 0 ? (
            <TrendingDown size={20} color={COLORS.white} />
          ) : (
            <RefreshCw size={20} color={COLORS.gray} />
          )}
          <Text
            color={!isValid || adjustment === 0 || !reason ? COLORS.gray : COLORS.white}
            fontWeight="700"
            fontSize={15}
          >
            {createAdjustment.isPending
              ? 'Saving...'
              : adjustment > 0
                ? `Add ${adjustment} Units`
                : adjustment < 0
                  ? `Remove ${Math.abs(adjustment)} Units`
                  : 'Enter Adjustment'
            }
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}

export default StockAdjustment;
