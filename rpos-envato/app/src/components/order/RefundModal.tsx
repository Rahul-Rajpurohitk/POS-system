/**
 * RefundModal - Comprehensive refund processing with full/partial support
 */

import React, { useState, useMemo } from 'react';
import { Modal, ScrollView } from 'react-native';
import { XStack, YStack, Text, TextArea, Input } from 'tamagui';
import {
  X, RefreshCw, Check, AlertCircle, CreditCard, Banknote, Wallet,
} from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import type { Order, Currency } from '@/types';

export type RefundType = 'full' | 'partial' | 'store_credit';
export type RefundReason = 'customer_request' | 'defective' | 'wrong_item' | 'not_as_described' | 'other';
export type RefundDestination = 'original' | 'store_credit' | 'cash';

interface RefundItem {
  itemId: string;
  name: string;
  quantity: number;
  maxQuantity: number;
  price: number;
  selected: boolean;
}

export interface RefundModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onRefund: (data: RefundRequest) => Promise<void>;
  currency: Currency;
  isLoading?: boolean;
}

export interface RefundRequest {
  orderId: string;
  type: RefundType;
  items?: { itemId: string; quantity: number }[];
  amount: number;
  reason: RefundReason;
  notes?: string;
  destination: RefundDestination;
}

const REFUND_REASONS: { value: RefundReason; label: string }[] = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item Delivered' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'other', label: 'Other' },
];

const REFUND_DESTINATIONS: { value: RefundDestination; label: string; icon: any }[] = [
  { value: 'original', label: 'Original Payment', icon: CreditCard },
  { value: 'store_credit', label: 'Store Credit', icon: Wallet },
  { value: 'cash', label: 'Cash', icon: Banknote },
];

interface RefundItemRowProps {
  item: RefundItem;
  onToggle: () => void;
  onQuantityChange: (qty: number) => void;
  currency: Currency;
}

function RefundItemRow({ item, onToggle, onQuantityChange, currency }: RefundItemRowProps) {
  return (
    <XStack
      paddingVertical="$3"
      paddingHorizontal="$3"
      backgroundColor={item.selected ? '#EFF6FF' : 'white'}
      borderRadius="$2"
      marginBottom="$2"
      borderWidth={1}
      borderColor={item.selected ? '#3B82F6' : '#E5E7EB'}
    >
      <XStack
        width={24}
        height={24}
        borderRadius={4}
        borderWidth={2}
        borderColor={item.selected ? '#3B82F6' : '#D1D5DB'}
        backgroundColor={item.selected ? '#3B82F6' : 'white'}
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        onPress={onToggle}
        marginRight="$3"
      >
        {item.selected && <Check size={14} color="white" />}
      </XStack>

      <YStack flex={1}>
        <Text fontSize="$3" fontWeight="500" color="#111827">{item.name}</Text>
        <Text fontSize={11} color="#6B7280">
          {formatCurrency(item.price, currency)} each
        </Text>
      </YStack>

      {item.selected && (
        <XStack alignItems="center" gap="$2">
          <Text fontSize={12} color="#6B7280">Qty:</Text>
          <XStack
            borderWidth={1}
            borderColor="#E5E7EB"
            borderRadius="$2"
            overflow="hidden"
            backgroundColor="white"
          >
            <YStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor="#F3F4F6"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#E5E7EB' }}
              onPress={() => item.quantity > 1 && onQuantityChange(item.quantity - 1)}
            >
              <Text fontSize={14} fontWeight="600" color="#374151">-</Text>
            </YStack>
            <YStack paddingHorizontal="$3" paddingVertical="$1" justifyContent="center" backgroundColor="white">
              <Text fontSize={13} fontWeight="500" color="#111827">{item.quantity}</Text>
            </YStack>
            <YStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor="#F3F4F6"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#E5E7EB' }}
              onPress={() => item.quantity < item.maxQuantity && onQuantityChange(item.quantity + 1)}
            >
              <Text fontSize={14} fontWeight="600" color="#374151">+</Text>
            </YStack>
          </XStack>
          <Text fontSize="$3" fontWeight="600" minWidth={60} textAlign="right" color="#111827">
            {formatCurrency(item.price * item.quantity, currency)}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}

export function RefundModal({
  order,
  open,
  onClose,
  onRefund,
  currency,
  isLoading = false,
}: RefundModalProps) {
  const [refundType, setRefundType] = useState<RefundType>('full');
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [reason, setReason] = useState<RefundReason>('customer_request');
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState<RefundDestination>('original');
  const [error, setError] = useState('');

  // Initialize refund items when order changes
  React.useEffect(() => {
    if (order?.items) {
      setRefundItems(
        order.items.map((item: any) => ({
          itemId: item.id,
          name: item.product?.name || item.name || 'Product',
          quantity: item.quantity || 1,
          maxQuantity: item.quantity || 1,
          price: item.price || item.unitPrice || 0,
          selected: false,
        }))
      );
    }
  }, [order]);

  const payment = order?.payment || { total: order?.total || 0 };
  const fullAmount = payment.total;

  const partialAmount = useMemo(() => {
    return refundItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [refundItems]);

  const refundAmount = useMemo(() => {
    if (refundType === 'full') return fullAmount;
    if (refundType === 'partial') return partialAmount;
    return parseFloat(customAmount) || 0;
  }, [refundType, fullAmount, partialAmount, customAmount]);

  const toggleItem = (index: number) => {
    setRefundItems((items) =>
      items.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    setRefundItems((items) =>
      items.map((item, i) =>
        i === index ? { ...item, quantity } : item
      )
    );
  };

  const handleSubmit = async () => {
    setError('');

    if (refundAmount <= 0) {
      setError('Refund amount must be greater than 0');
      return;
    }

    if (refundAmount > fullAmount) {
      setError('Refund amount cannot exceed order total');
      return;
    }

    if (!reason) {
      setError('Please select a reason for refund');
      return;
    }

    const refundData: RefundRequest = {
      orderId: order!.id,
      type: refundType,
      amount: refundAmount,
      reason,
      notes: notes.trim() || undefined,
      destination,
      items:
        refundType === 'partial'
          ? refundItems
              .filter((item) => item.selected)
              .map((item) => ({ itemId: item.itemId, quantity: item.quantity }))
          : undefined,
    };

    try {
      await onRefund(refundData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
    }
  };

  const resetForm = () => {
    setRefundType('full');
    setCustomAmount('');
    setReason('customer_request');
    setNotes('');
    setDestination('original');
    setError('');
    if (order?.items) {
      setRefundItems(
        order.items.map((item: any) => ({
          itemId: item.id,
          name: item.product?.name || item.name || 'Product',
          quantity: item.quantity || 1,
          maxQuantity: item.quantity || 1,
          price: item.price || item.unitPrice || 0,
          selected: false,
        }))
      );
    }
  };

  React.useEffect(() => {
    if (open) resetForm();
  }, [open]);

  if (!order) return null;

  const orderNumber = order.number || order.orderNumber || `#${order.id.slice(0, 6)}`;

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.5)">
        <YStack
          width="90%"
          maxWidth={500}
          maxHeight="90%"
          backgroundColor="white"
          borderRadius="$4"
          overflow="hidden"
          shadowColor="rgba(0,0,0,0.2)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={1}
          shadowRadius={20}
        >
          {/* Header */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$4"
            justifyContent="space-between"
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor="#E5E7EB"
            backgroundColor="white"
          >
            <XStack alignItems="center" gap="$2">
              <RefreshCw size={20} color="#3B82F6" />
              <Text fontSize="$5" fontWeight="bold" color="#111827">Process Refund</Text>
            </XStack>
            <YStack
              padding="$2"
              borderRadius="$2"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#F3F4F6' }}
              onPress={onClose}
            >
              <X size={20} color="#6B7280" />
            </YStack>
          </XStack>

          <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
            <YStack padding="$4" gap="$4" backgroundColor="white">
              {/* Order info */}
              <XStack
                padding="$3"
                backgroundColor="#F9FAFB"
                borderRadius="$2"
                justifyContent="space-between"
                borderWidth={1}
                borderColor="#E5E7EB"
              >
                <Text fontSize={13} color="#6B7280">Order {orderNumber}</Text>
                <Text fontSize={13} fontWeight="600" color="#111827">
                  Total: {formatCurrency(fullAmount, currency)}
                </Text>
              </XStack>

              {/* Refund type selection */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">REFUND TYPE</Text>
                <XStack gap="$2">
                  {(['full', 'partial'] as RefundType[]).map((type) => (
                    <YStack
                      key={type}
                      flex={1}
                      paddingVertical="$3"
                      paddingHorizontal="$3"
                      borderRadius="$2"
                      borderWidth={2}
                      borderColor={refundType === type ? '#3B82F6' : '#E5E7EB'}
                      backgroundColor={refundType === type ? '#EFF6FF' : 'white'}
                      cursor="pointer"
                      alignItems="center"
                      onPress={() => setRefundType(type)}
                    >
                      <Text
                        fontSize={13}
                        fontWeight={refundType === type ? '600' : '400'}
                        color={refundType === type ? '#3B82F6' : '#374151'}
                        textTransform="capitalize"
                      >
                        {type} Refund
                      </Text>
                    </YStack>
                  ))}
                </XStack>
              </YStack>

              {/* Partial refund - item selection */}
              {refundType === 'partial' && (
                <YStack gap="$2">
                  <Text fontSize={12} fontWeight="600" color="#6B7280">SELECT ITEMS</Text>
                  {refundItems.map((item, index) => (
                    <RefundItemRow
                      key={item.itemId}
                      item={item}
                      onToggle={() => toggleItem(index)}
                      onQuantityChange={(qty) => updateItemQuantity(index, qty)}
                      currency={currency}
                    />
                  ))}
                </YStack>
              )}

              {/* Refund amount display */}
              <YStack
                padding="$4"
                backgroundColor="#EFF6FF"
                borderRadius="$3"
                alignItems="center"
                borderWidth={1}
                borderColor="#BFDBFE"
              >
                <Text fontSize={12} color="#6B7280" marginBottom="$1">Refund Amount</Text>
                <Text fontSize="$7" fontWeight="bold" color="#3B82F6">
                  {formatCurrency(refundAmount, currency)}
                </Text>
              </YStack>

              {/* Reason selection */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">REASON *</Text>
                <XStack gap="$2" flexWrap="wrap">
                  {REFUND_REASONS.map((r) => (
                    <YStack
                      key={r.value}
                      paddingVertical="$2"
                      paddingHorizontal="$3"
                      borderRadius="$2"
                      borderWidth={1}
                      borderColor={reason === r.value ? '#3B82F6' : '#E5E7EB'}
                      backgroundColor={reason === r.value ? '#EFF6FF' : 'white'}
                      cursor="pointer"
                      onPress={() => setReason(r.value)}
                    >
                      <Text
                        fontSize={12}
                        fontWeight={reason === r.value ? '600' : '400'}
                        color={reason === r.value ? '#3B82F6' : '#374151'}
                      >
                        {r.label}
                      </Text>
                    </YStack>
                  ))}
                </XStack>
              </YStack>

              {/* Refund destination */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">REFUND TO</Text>
                <XStack gap="$2">
                  {REFUND_DESTINATIONS.map((d) => {
                    const Icon = d.icon;
                    return (
                      <YStack
                        key={d.value}
                        flex={1}
                        paddingVertical="$3"
                        borderRadius="$2"
                        borderWidth={1}
                        borderColor={destination === d.value ? '#3B82F6' : '#E5E7EB'}
                        backgroundColor={destination === d.value ? '#EFF6FF' : 'white'}
                        cursor="pointer"
                        alignItems="center"
                        gap="$1"
                        onPress={() => setDestination(d.value)}
                      >
                        <Icon size={18} color={destination === d.value ? '#3B82F6' : '#6B7280'} />
                        <Text
                          fontSize={11}
                          fontWeight={destination === d.value ? '600' : '400'}
                          color={destination === d.value ? '#3B82F6' : '#374151'}
                          textAlign="center"
                        >
                          {d.label}
                        </Text>
                      </YStack>
                    );
                  })}
                </XStack>
              </YStack>

              {/* Notes */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">NOTES (Optional)</Text>
                <TextArea
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any additional notes..."
                  placeholderTextColor="#9CA3AF"
                  minHeight={80}
                  borderColor="#E5E7EB"
                  backgroundColor="white"
                  color="#111827"
                />
              </YStack>

              {/* Error message */}
              {error && (
                <XStack
                  padding="$3"
                  backgroundColor="#FEE2E2"
                  borderRadius="$2"
                  alignItems="center"
                  gap="$2"
                >
                  <AlertCircle size={16} color="#DC2626" />
                  <Text fontSize={13} color="#DC2626">{error}</Text>
                </XStack>
              )}
            </YStack>
          </ScrollView>

          {/* Footer */}
          <XStack
            padding="$4"
            gap="$3"
            borderTopWidth={1}
            borderTopColor="#E5E7EB"
            backgroundColor="white"
          >
            <XStack
              flex={1}
              backgroundColor="white"
              borderWidth={1}
              borderColor="#D1D5DB"
              borderRadius="$3"
              paddingVertical="$3"
              justifyContent="center"
              alignItems="center"
              cursor="pointer"
              opacity={isLoading ? 0.5 : 1}
              hoverStyle={{ backgroundColor: '#F9FAFB' }}
              pressStyle={{ opacity: 0.9 }}
              onPress={isLoading ? undefined : onClose}
            >
              <Text fontSize={14} fontWeight="600" color="#374151">Cancel</Text>
            </XStack>
            <XStack
              flex={2}
              backgroundColor={isLoading || refundAmount <= 0 ? '#9CA3AF' : '#3B82F6'}
              borderRadius="$3"
              paddingVertical="$3"
              gap="$2"
              justifyContent="center"
              alignItems="center"
              cursor={isLoading || refundAmount <= 0 ? 'not-allowed' : 'pointer'}
              hoverStyle={{ backgroundColor: isLoading || refundAmount <= 0 ? '#9CA3AF' : '#2563EB' }}
              pressStyle={{ opacity: 0.9 }}
              onPress={isLoading || refundAmount <= 0 ? undefined : handleSubmit}
            >
              <RefreshCw size={16} color="white" />
              <Text fontSize={14} fontWeight="600" color="white">
                {isLoading ? 'Processing...' : `Refund ${formatCurrency(refundAmount, currency)}`}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}

export default RefundModal;
