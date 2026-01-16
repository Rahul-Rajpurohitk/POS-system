import React, { useState } from 'react';
import { Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Input, TextArea, Spinner } from 'tamagui';
import {
  X, Package, Plus, Minus, DollarSign, Truck, Hash,
  Calendar, AlertCircle, Check, ChevronDown,
} from '@tamagui/lucide-icons';
import { useCreateStockAdjustment } from '@/features/inventory/hooks';
import { SupplierSelector } from './SupplierSelector';
import type { Product, Supplier } from '@/types';
import type { StockAdjustmentType } from '@/features/inventory/api';

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  dark: '#111827',
};

// Add stock reasons
const ADD_STOCK_REASONS: Array<{ value: StockAdjustmentType; label: string; description: string }> = [
  { value: 'purchase_order', label: 'Purchase Order', description: 'Stock received from supplier' },
  { value: 'return', label: 'Customer Return', description: 'Returned items back to inventory' },
  { value: 'transfer_in', label: 'Transfer In', description: 'Stock transferred from another location' },
  { value: 'correction', label: 'Inventory Correction', description: 'Manual adjustment to fix discrepancy' },
  { value: 'initial', label: 'Initial Stock', description: 'Opening/initial inventory count' },
];

interface AddStockModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSuccess?: () => void;
  suppliers?: Supplier[];
}

export function AddStockModal({ open, onClose, product, onSuccess, suppliers = [] }: AddStockModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [inputMode, setInputMode] = useState<'units' | 'cases'>('units');
  const [reason, setReason] = useState<StockAdjustmentType>('purchase_order');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [unitCost, setUnitCost] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  const createStockAdjustment = useCreateStockAdjustment();

  const currentStock = product.quantity ?? 0;
  const caseSize = product.caseSize || 1;
  const actualQuantity = inputMode === 'cases' ? quantity * caseSize : quantity;
  const newStock = currentStock + actualQuantity;

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));

  const handleSubmit = async () => {
    try {
      await createStockAdjustment.mutateAsync({
        productId: product.id,
        type: reason,
        quantity: actualQuantity,
        reason: ADD_STOCK_REASONS.find((r) => r.value === reason)?.label || reason,
        notes: notes || undefined,
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
        supplierId: supplierId || undefined,
        batchNumber: batchNumber || undefined,
        lotNumber: lotNumber || undefined,
        expirationDate: expirationDate || undefined,
      });

      // Reset form
      setQuantity(1);
      setSupplierId(null);
      setUnitCost('');
      setBatchNumber('');
      setLotNumber('');
      setExpirationDate('');
      setNotes('');

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to add stock:', error);
    }
  };

  const handleClose = () => {
    // Reset form on close
    setQuantity(1);
    setInputMode('units');
    setReason('purchase_order');
    setSupplierId(null);
    setUnitCost('');
    setBatchNumber('');
    setLotNumber('');
    setExpirationDate('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center">
        <YStack
          width="90%"
          maxWidth={500}
          maxHeight="90%"
          backgroundColor={COLORS.white}
          borderRadius={16}
          overflow="hidden"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.15}
          shadowRadius={24}
          elevation={10}
        >
          {/* Header */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderBottomWidth={1}
            borderBottomColor={COLORS.border}
            alignItems="center"
            justifyContent="space-between"
            backgroundColor={COLORS.successLight}
          >
            <XStack alignItems="center" gap="$3">
              <YStack
                width={40}
                height={40}
                borderRadius={10}
                backgroundColor={COLORS.success}
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={20} color={COLORS.white} />
              </YStack>
              <YStack>
                <Text fontSize={16} fontWeight="700" color={COLORS.dark}>
                  Add Stock
                </Text>
                <Text fontSize={12} color={COLORS.gray}>
                  {product.name}
                </Text>
              </YStack>
            </XStack>
            <XStack
              width={36}
              height={36}
              borderRadius={8}
              backgroundColor={COLORS.white}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              hoverStyle={{ backgroundColor: COLORS.grayLight }}
              onPress={handleClose}
            >
              <X size={20} color={COLORS.gray} />
            </XStack>
          </XStack>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack padding="$4" gap="$4">
                {/* Stock Preview */}
                <XStack
                  backgroundColor={COLORS.grayLight}
                  borderRadius={12}
                  padding="$3"
                  alignItems="center"
                  justifyContent="space-around"
                >
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize={11} color={COLORS.gray} fontWeight="500">
                      Current Stock
                    </Text>
                    <Text fontSize={24} fontWeight="800" color={COLORS.dark}>
                      {currentStock}
                    </Text>
                  </YStack>
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize={11} color={COLORS.success} fontWeight="500">
                      Adding
                    </Text>
                    <Text fontSize={24} fontWeight="800" color={COLORS.success}>
                      +{actualQuantity}
                    </Text>
                  </YStack>
                  <YStack alignItems="center" gap="$1">
                    <Text fontSize={11} color={COLORS.primary} fontWeight="500">
                      New Stock
                    </Text>
                    <Text fontSize={24} fontWeight="800" color={COLORS.primary}>
                      {newStock}
                    </Text>
                  </YStack>
                </XStack>

                {/* Quantity Input */}
                <YStack gap="$2">
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                      Quantity
                    </Text>
                    {caseSize > 1 && (
                      <XStack
                        backgroundColor={COLORS.grayLight}
                        borderRadius={8}
                        overflow="hidden"
                      >
                        <XStack
                          paddingHorizontal="$3"
                          paddingVertical="$1"
                          backgroundColor={inputMode === 'units' ? COLORS.primary : 'transparent'}
                          cursor="pointer"
                          onPress={() => setInputMode('units')}
                        >
                          <Text
                            fontSize={11}
                            fontWeight="600"
                            color={inputMode === 'units' ? COLORS.white : COLORS.gray}
                          >
                            Units
                          </Text>
                        </XStack>
                        <XStack
                          paddingHorizontal="$3"
                          paddingVertical="$1"
                          backgroundColor={inputMode === 'cases' ? COLORS.primary : 'transparent'}
                          cursor="pointer"
                          onPress={() => setInputMode('cases')}
                        >
                          <Text
                            fontSize={11}
                            fontWeight="600"
                            color={inputMode === 'cases' ? COLORS.white : COLORS.gray}
                          >
                            Cases ({caseSize}/case)
                          </Text>
                        </XStack>
                      </XStack>
                    )}
                  </XStack>

                  <XStack alignItems="center" gap="$3">
                    <XStack
                      width={44}
                      height={44}
                      borderRadius={10}
                      backgroundColor={COLORS.grayLight}
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      hoverStyle={{ backgroundColor: COLORS.border }}
                      onPress={handleDecrement}
                    >
                      <Minus size={20} color={COLORS.gray} />
                    </XStack>
                    <Input
                      flex={1}
                      value={quantity.toString()}
                      onChangeText={(text) => setQuantity(Math.max(1, parseInt(text) || 1))}
                      keyboardType="number-pad"
                      textAlign="center"
                      fontSize={24}
                      fontWeight="700"
                      backgroundColor={COLORS.white}
                      borderWidth={2}
                      borderColor={COLORS.success}
                      borderRadius={10}
                      height={50}
                    />
                    <XStack
                      width={44}
                      height={44}
                      borderRadius={10}
                      backgroundColor={COLORS.successLight}
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      hoverStyle={{ backgroundColor: COLORS.successBorder }}
                      onPress={handleIncrement}
                    >
                      <Plus size={20} color={COLORS.success} />
                    </XStack>
                  </XStack>
                </YStack>

                {/* Reason Selection */}
                <YStack gap="$2">
                  <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                    Reason <Text color={COLORS.error}>*</Text>
                  </Text>
                  <YStack gap="$2">
                    {ADD_STOCK_REASONS.map((item) => (
                      <XStack
                        key={item.value}
                        backgroundColor={reason === item.value ? COLORS.primaryLight : COLORS.white}
                        borderWidth={1}
                        borderColor={reason === item.value ? COLORS.primary : COLORS.border}
                        borderRadius={10}
                        padding="$3"
                        alignItems="center"
                        gap="$3"
                        cursor="pointer"
                        hoverStyle={{ borderColor: COLORS.primary }}
                        onPress={() => setReason(item.value)}
                      >
                        <YStack
                          width={24}
                          height={24}
                          borderRadius={12}
                          borderWidth={2}
                          borderColor={reason === item.value ? COLORS.primary : COLORS.border}
                          backgroundColor={reason === item.value ? COLORS.primary : 'transparent'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {reason === item.value && <Check size={14} color={COLORS.white} />}
                        </YStack>
                        <YStack flex={1}>
                          <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                            {item.label}
                          </Text>
                          <Text fontSize={11} color={COLORS.gray}>
                            {item.description}
                          </Text>
                        </YStack>
                      </XStack>
                    ))}
                  </YStack>
                </YStack>

                {/* Supplier Selection (for Purchase Order) */}
                {reason === 'purchase_order' && suppliers.length > 0 && (
                  <YStack gap="$2">
                    <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                      Supplier
                    </Text>
                    <SupplierSelector
                      value={supplierId}
                      onChange={setSupplierId}
                      suppliers={suppliers}
                      placeholder="Select supplier (optional)"
                    />
                  </YStack>
                )}

                {/* Unit Cost */}
                {reason === 'purchase_order' && (
                  <YStack gap="$2">
                    <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                      Unit Cost
                    </Text>
                    <XStack
                      backgroundColor={COLORS.white}
                      borderWidth={1}
                      borderColor={COLORS.border}
                      borderRadius={10}
                      alignItems="center"
                      overflow="hidden"
                    >
                      <YStack
                        paddingHorizontal="$3"
                        paddingVertical="$2"
                        backgroundColor={COLORS.grayLight}
                      >
                        <DollarSign size={16} color={COLORS.gray} />
                      </YStack>
                      <Input
                        flex={1}
                        value={unitCost}
                        onChangeText={setUnitCost}
                        keyboardType="decimal-pad"
                        placeholder="0.00 (optional)"
                        backgroundColor="transparent"
                        borderWidth={0}
                        paddingHorizontal="$3"
                        fontSize={13}
                      />
                    </XStack>
                  </YStack>
                )}

                {/* Batch & Lot Number */}
                <XStack gap="$3">
                  <YStack flex={1} gap="$2">
                    <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                      Batch #
                    </Text>
                    <XStack
                      backgroundColor={COLORS.white}
                      borderWidth={1}
                      borderColor={COLORS.border}
                      borderRadius={10}
                      alignItems="center"
                      overflow="hidden"
                    >
                      <YStack paddingHorizontal="$2" paddingVertical="$2" backgroundColor={COLORS.grayLight}>
                        <Hash size={14} color={COLORS.gray} />
                      </YStack>
                      <Input
                        flex={1}
                        value={batchNumber}
                        onChangeText={setBatchNumber}
                        placeholder="Optional"
                        backgroundColor="transparent"
                        borderWidth={0}
                        paddingHorizontal="$2"
                        fontSize={12}
                      />
                    </XStack>
                  </YStack>
                  <YStack flex={1} gap="$2">
                    <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                      Lot #
                    </Text>
                    <XStack
                      backgroundColor={COLORS.white}
                      borderWidth={1}
                      borderColor={COLORS.border}
                      borderRadius={10}
                      alignItems="center"
                      overflow="hidden"
                    >
                      <YStack paddingHorizontal="$2" paddingVertical="$2" backgroundColor={COLORS.grayLight}>
                        <Hash size={14} color={COLORS.gray} />
                      </YStack>
                      <Input
                        flex={1}
                        value={lotNumber}
                        onChangeText={setLotNumber}
                        placeholder="Optional"
                        backgroundColor="transparent"
                        borderWidth={0}
                        paddingHorizontal="$2"
                        fontSize={12}
                      />
                    </XStack>
                  </YStack>
                </XStack>

                {/* Expiration Date */}
                <YStack gap="$2">
                  <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                    Expiration Date
                  </Text>
                  <XStack
                    backgroundColor={COLORS.white}
                    borderWidth={1}
                    borderColor={COLORS.border}
                    borderRadius={10}
                    alignItems="center"
                    overflow="hidden"
                  >
                    <YStack paddingHorizontal="$3" paddingVertical="$2" backgroundColor={COLORS.grayLight}>
                      <Calendar size={16} color={COLORS.gray} />
                    </YStack>
                    <Input
                      flex={1}
                      value={expirationDate}
                      onChangeText={setExpirationDate}
                      placeholder="YYYY-MM-DD (optional)"
                      backgroundColor="transparent"
                      borderWidth={0}
                      paddingHorizontal="$3"
                      fontSize={13}
                    />
                  </XStack>
                </YStack>

                {/* Notes */}
                <YStack gap="$2">
                  <Text fontSize={13} fontWeight="600" color={COLORS.dark}>
                    Notes
                  </Text>
                  <TextArea
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any additional notes..."
                    backgroundColor={COLORS.white}
                    borderWidth={1}
                    borderColor={COLORS.border}
                    borderRadius={10}
                    padding="$3"
                    fontSize={13}
                    minHeight={80}
                  />
                </YStack>
              </YStack>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Footer */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderTopWidth={1}
            borderTopColor={COLORS.border}
            gap="$3"
          >
            <XStack
              flex={1}
              paddingVertical="$3"
              borderRadius={10}
              backgroundColor={COLORS.grayLight}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              hoverStyle={{ backgroundColor: COLORS.border }}
              onPress={handleClose}
            >
              <Text fontSize={14} fontWeight="600" color={COLORS.gray}>
                Cancel
              </Text>
            </XStack>
            <XStack
              flex={2}
              paddingVertical="$3"
              borderRadius={10}
              backgroundColor={COLORS.success}
              alignItems="center"
              justifyContent="center"
              gap="$2"
              cursor="pointer"
              opacity={createStockAdjustment.isPending ? 0.7 : 1}
              hoverStyle={{ backgroundColor: '#059669' }}
              onPress={handleSubmit}
            >
              {createStockAdjustment.isPending ? (
                <Spinner size="small" color={COLORS.white} />
              ) : (
                <>
                  <Plus size={16} color={COLORS.white} />
                  <Text fontSize={14} fontWeight="700" color={COLORS.white}>
                    Add {actualQuantity} {inputMode === 'cases' ? 'Cases' : 'Units'}
                  </Text>
                </>
              )}
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}

export default AddStockModal;
