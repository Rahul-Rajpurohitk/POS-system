/**
 * ExchangeRefundModal - Smart exchange and refund processing
 * Supports:
 * - Full refund
 * - Partial refund (select items)
 * - Product exchange with difference calculation
 * - Store credit option
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Modal, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { XStack, YStack, Text, TextArea, Input } from 'tamagui';
import {
  X, RefreshCw, Check, AlertCircle, CreditCard, Banknote, Wallet,
  ArrowLeftRight, Minus, Plus, Package, Search, ShoppingBag,
} from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useProducts } from '@/features/products/hooks';
import type { Order, Currency, Product } from '@/types';

export type ExchangeMode = 'refund' | 'exchange';
export type RefundType = 'full' | 'partial';
export type RefundReason = 'customer_request' | 'defective' | 'wrong_item' | 'not_as_described' | 'size_issue' | 'other';
export type RefundDestination = 'original' | 'store_credit' | 'cash';

interface ReturnItem {
  itemId: string;
  productId: string;
  name: string;
  quantity: number;
  maxQuantity: number;
  price: number;
  selected: boolean;
}

interface ExchangeItem {
  product: Product;
  quantity: number;
}

export interface ExchangeRefundRequest {
  orderId: string;
  mode: ExchangeMode;
  type: RefundType;
  returnItems?: { itemId: string; quantity: number }[];
  exchangeItems?: { productId: string; quantity: number }[];
  refundAmount: number;
  additionalPayment: number;
  reason: RefundReason;
  notes?: string;
  destination: RefundDestination;
}

export interface ExchangeRefundModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onProcess: (data: ExchangeRefundRequest) => Promise<void>;
  currency: Currency;
  isLoading?: boolean;
}

const REFUND_REASONS: { value: RefundReason; label: string }[] = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'size_issue', label: 'Size/Fit Issue' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'other', label: 'Other' },
];

const REFUND_DESTINATIONS: { value: RefundDestination; label: string; icon: any }[] = [
  { value: 'original', label: 'Original Payment', icon: CreditCard },
  { value: 'store_credit', label: 'Store Credit', icon: Wallet },
  { value: 'cash', label: 'Cash', icon: Banknote },
];

// Return Item Row Component
function ReturnItemRow({
  item,
  onToggle,
  onQuantityChange,
  currency,
}: {
  item: ReturnItem;
  onToggle: () => void;
  onQuantityChange: (qty: number) => void;
  currency: Currency;
}) {
  return (
    <XStack
      paddingVertical="$3"
      paddingHorizontal="$3"
      backgroundColor={item.selected ? '#FEF3C7' : 'white'}
      borderRadius="$2"
      marginBottom="$2"
      borderWidth={1}
      borderColor={item.selected ? '#F59E0B' : '#E5E7EB'}
    >
      <XStack
        width={24}
        height={24}
        borderRadius={4}
        borderWidth={2}
        borderColor={item.selected ? '#F59E0B' : '#D1D5DB'}
        backgroundColor={item.selected ? '#F59E0B' : 'white'}
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
          <XStack borderWidth={1} borderColor="#E5E7EB" borderRadius="$2" overflow="hidden" backgroundColor="white">
            <YStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor="#F3F4F6"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#E5E7EB' }}
              onPress={() => item.quantity > 1 && onQuantityChange(item.quantity - 1)}
            >
              <Minus size={12} color="#374151" />
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
              <Plus size={12} color="#374151" />
            </YStack>
          </XStack>
          <Text fontSize="$3" fontWeight="600" minWidth={60} textAlign="right" color="#DC2626">
            -{formatCurrency(item.price * item.quantity, currency)}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}

// Exchange Product Card Component
function ExchangeProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  currency,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  currency: Currency;
}) {
  return (
    <XStack
      padding="$3"
      backgroundColor={quantity > 0 ? '#ECFDF5' : 'white'}
      borderRadius="$2"
      borderWidth={1}
      borderColor={quantity > 0 ? '#10B981' : '#E5E7EB'}
      marginBottom="$2"
    >
      <YStack
        width={48}
        height={48}
        borderRadius="$2"
        backgroundColor="#F3F4F6"
        alignItems="center"
        justifyContent="center"
        marginRight="$3"
      >
        <Package size={20} color="#6B7280" />
      </YStack>

      <YStack flex={1}>
        <Text fontSize={13} fontWeight="500" color="#111827" numberOfLines={1}>{product.name}</Text>
        <Text fontSize={11} color="#6B7280">{product.sku || 'No SKU'}</Text>
        <Text fontSize={12} fontWeight="600" color="#10B981">
          {formatCurrency(product.sellingPrice, currency)}
        </Text>
      </YStack>

      <XStack alignItems="center" gap="$2">
        {quantity > 0 && (
          <YStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="#FEE2E2"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={onRemove}
          >
            <Minus size={14} color="#DC2626" />
          </YStack>
        )}

        {quantity > 0 && (
          <YStack
            minWidth={28}
            height={28}
            borderRadius="$2"
            backgroundColor="#10B981"
            alignItems="center"
            justifyContent="center"
            paddingHorizontal="$2"
          >
            <Text fontSize={12} fontWeight="600" color="white">{quantity}</Text>
          </YStack>
        )}

        <YStack
          width={28}
          height={28}
          borderRadius={14}
          backgroundColor={quantity > 0 ? '#D1FAE5' : '#F3F4F6'}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={onAdd}
        >
          <Plus size={14} color={quantity > 0 ? '#10B981' : '#6B7280'} />
        </YStack>
      </XStack>
    </XStack>
  );
}

export function ExchangeRefundModal({
  order,
  open,
  onClose,
  onProcess,
  currency,
  isLoading = false,
}: ExchangeRefundModalProps) {
  // Mode and form state
  const [mode, setMode] = useState<ExchangeMode>('refund');
  const [refundType, setRefundType] = useState<RefundType>('full');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [reason, setReason] = useState<RefundReason>('customer_request');
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState<RefundDestination>('original');
  const [error, setError] = useState('');

  // Fetch products for exchange
  const { data: products = [], isLoading: productsLoading } = useProducts({ limit: 100 });

  // Filter products for exchange search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    const query = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query))
    ).slice(0, 10);
  }, [products, productSearch]);

  // Initialize return items when order changes
  React.useEffect(() => {
    if (order?.items) {
      setReturnItems(
        order.items.map((item: any) => ({
          itemId: item.id,
          productId: item.product?.id || item.productId,
          name: item.product?.name || item.name || 'Product',
          quantity: item.quantity || 1,
          maxQuantity: item.quantity || 1,
          price: item.unitPrice || item.product?.sellingPrice || 0,
          selected: false,
        }))
      );
    }
  }, [order]);

  const payment = order?.payment || { total: order?.total || 0 };
  const fullAmount = payment.total;

  // Calculate return value (items being returned)
  const returnValue = useMemo(() => {
    if (refundType === 'full') return fullAmount;
    return returnItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [refundType, fullAmount, returnItems]);

  // Calculate exchange value (new items being added)
  const exchangeValue = useMemo(() => {
    return exchangeItems.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  }, [exchangeItems]);

  // Calculate final amounts
  const difference = returnValue - exchangeValue;
  const refundAmount = Math.max(0, difference);
  const additionalPayment = Math.max(0, -difference);

  // Handlers
  const toggleReturnItem = useCallback((index: number) => {
    setReturnItems((items) =>
      items.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  }, []);

  const updateReturnItemQuantity = useCallback((index: number, quantity: number) => {
    setReturnItems((items) =>
      items.map((item, i) =>
        i === index ? { ...item, quantity } : item
      )
    );
  }, []);

  const addExchangeItem = useCallback((product: Product) => {
    setExchangeItems((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  }, []);

  const removeExchangeItem = useCallback((productId: string) => {
    setExchangeItems((items) => {
      const existing = items.find((i) => i.product.id === productId);
      if (existing && existing.quantity > 1) {
        return items.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return items.filter((i) => i.product.id !== productId);
    });
  }, []);

  const getExchangeQuantity = useCallback((productId: string) => {
    return exchangeItems.find((i) => i.product.id === productId)?.quantity || 0;
  }, [exchangeItems]);

  const handleSubmit = async () => {
    setError('');

    if (mode === 'refund' && returnValue <= 0) {
      setError('Please select items to refund');
      return;
    }

    if (mode === 'exchange') {
      if (refundType === 'partial' && !returnItems.some((i) => i.selected)) {
        setError('Please select items to return');
        return;
      }
      if (exchangeItems.length === 0) {
        setError('Please select exchange products');
        return;
      }
    }

    const requestData: ExchangeRefundRequest = {
      orderId: order!.id,
      mode,
      type: refundType,
      returnItems: refundType === 'partial'
        ? returnItems.filter((i) => i.selected).map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
        : undefined,
      exchangeItems: mode === 'exchange'
        ? exchangeItems.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
        : undefined,
      refundAmount,
      additionalPayment,
      reason,
      notes: notes.trim() || undefined,
      destination,
    };

    try {
      await onProcess(requestData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
    }
  };

  const resetForm = useCallback(() => {
    setMode('refund');
    setRefundType('full');
    setExchangeItems([]);
    setProductSearch('');
    setReason('customer_request');
    setNotes('');
    setDestination('original');
    setError('');
    if (order?.items) {
      setReturnItems(
        order.items.map((item: any) => ({
          itemId: item.id,
          productId: item.product?.id || item.productId,
          name: item.product?.name || item.name || 'Product',
          quantity: item.quantity || 1,
          maxQuantity: item.quantity || 1,
          price: item.unitPrice || item.product?.sellingPrice || 0,
          selected: false,
        }))
      );
    }
  }, [order]);

  React.useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  if (!order) return null;

  const orderNumber = order.number || order.orderNumber || `#${order.id.slice(0, 6)}`;

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.5)">
        <YStack
          width="95%"
          maxWidth={600}
          maxHeight="95%"
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
              <ArrowLeftRight size={20} color="#3B82F6" />
              <Text fontSize="$5" fontWeight="bold" color="#111827">
                {mode === 'exchange' ? 'Exchange Products' : 'Process Refund'}
              </Text>
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

              {/* Mode Selection - Refund or Exchange */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">WHAT DO YOU WANT TO DO?</Text>
                <XStack gap="$2">
                  <YStack
                    flex={1}
                    paddingVertical="$3"
                    paddingHorizontal="$3"
                    borderRadius="$2"
                    borderWidth={2}
                    borderColor={mode === 'refund' ? '#3B82F6' : '#E5E7EB'}
                    backgroundColor={mode === 'refund' ? '#EFF6FF' : 'white'}
                    cursor="pointer"
                    alignItems="center"
                    gap="$1"
                    onPress={() => setMode('refund')}
                  >
                    <RefreshCw size={20} color={mode === 'refund' ? '#3B82F6' : '#6B7280'} />
                    <Text
                      fontSize={13}
                      fontWeight={mode === 'refund' ? '600' : '400'}
                      color={mode === 'refund' ? '#3B82F6' : '#374151'}
                    >
                      Refund Only
                    </Text>
                  </YStack>
                  <YStack
                    flex={1}
                    paddingVertical="$3"
                    paddingHorizontal="$3"
                    borderRadius="$2"
                    borderWidth={2}
                    borderColor={mode === 'exchange' ? '#10B981' : '#E5E7EB'}
                    backgroundColor={mode === 'exchange' ? '#ECFDF5' : 'white'}
                    cursor="pointer"
                    alignItems="center"
                    gap="$1"
                    onPress={() => setMode('exchange')}
                  >
                    <ArrowLeftRight size={20} color={mode === 'exchange' ? '#10B981' : '#6B7280'} />
                    <Text
                      fontSize={13}
                      fontWeight={mode === 'exchange' ? '600' : '400'}
                      color={mode === 'exchange' ? '#10B981' : '#374151'}
                    >
                      Exchange Products
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              {/* Refund type selection */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">
                  {mode === 'exchange' ? 'ITEMS TO RETURN' : 'REFUND TYPE'}
                </Text>
                <XStack gap="$2">
                  {(['full', 'partial'] as RefundType[]).map((type) => (
                    <YStack
                      key={type}
                      flex={1}
                      paddingVertical="$2"
                      paddingHorizontal="$3"
                      borderRadius="$2"
                      borderWidth={2}
                      borderColor={refundType === type ? '#F59E0B' : '#E5E7EB'}
                      backgroundColor={refundType === type ? '#FEF3C7' : 'white'}
                      cursor="pointer"
                      alignItems="center"
                      onPress={() => setRefundType(type)}
                    >
                      <Text
                        fontSize={12}
                        fontWeight={refundType === type ? '600' : '400'}
                        color={refundType === type ? '#D97706' : '#374151'}
                      >
                        {type === 'full' ? 'All Items' : 'Select Items'}
                      </Text>
                    </YStack>
                  ))}
                </XStack>
              </YStack>

              {/* Item selection for partial refund/exchange */}
              {refundType === 'partial' && (
                <YStack gap="$2">
                  <Text fontSize={12} fontWeight="600" color="#6B7280">SELECT ITEMS TO RETURN</Text>
                  {returnItems.map((item, index) => (
                    <ReturnItemRow
                      key={item.itemId}
                      item={item}
                      onToggle={() => toggleReturnItem(index)}
                      onQuantityChange={(qty) => updateReturnItemQuantity(index, qty)}
                      currency={currency}
                    />
                  ))}
                </YStack>
              )}

              {/* Exchange product selection */}
              {mode === 'exchange' && (
                <YStack gap="$2">
                  <Text fontSize={12} fontWeight="600" color="#6B7280">SELECT EXCHANGE PRODUCTS</Text>

                  {/* Product search */}
                  <XStack
                    backgroundColor="#F9FAFB"
                    borderRadius="$2"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    alignItems="center"
                    borderWidth={1}
                    borderColor="#E5E7EB"
                    gap="$2"
                  >
                    <Search size={16} color="#9CA3AF" />
                    <Input
                      flex={1}
                      placeholder="Search products..."
                      value={productSearch}
                      onChangeText={setProductSearch}
                      borderWidth={0}
                      backgroundColor="transparent"
                      fontSize={13}
                      color="#111827"
                      placeholderTextColor="#9CA3AF"
                    />
                  </XStack>

                  {/* Product list */}
                  <YStack maxHeight={200}>
                    {productsLoading ? (
                      <YStack padding="$4" alignItems="center">
                        <ActivityIndicator size="small" color="#3B82F6" />
                      </YStack>
                    ) : filteredProducts.length === 0 ? (
                      <YStack padding="$4" alignItems="center">
                        <Package size={24} color="#9CA3AF" />
                        <Text fontSize={12} color="#9CA3AF" marginTop="$2">No products found</Text>
                      </YStack>
                    ) : (
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                        {filteredProducts.map((product) => (
                          <ExchangeProductCard
                            key={product.id}
                            product={product}
                            quantity={getExchangeQuantity(product.id)}
                            onAdd={() => addExchangeItem(product)}
                            onRemove={() => removeExchangeItem(product.id)}
                            currency={currency}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </YStack>

                  {/* Selected exchange items summary */}
                  {exchangeItems.length > 0 && (
                    <YStack
                      padding="$3"
                      backgroundColor="#ECFDF5"
                      borderRadius="$2"
                      borderWidth={1}
                      borderColor="#A7F3D0"
                    >
                      <Text fontSize={11} fontWeight="600" color="#059669" marginBottom="$1">
                        EXCHANGE ITEMS ({exchangeItems.length})
                      </Text>
                      {exchangeItems.map((item) => (
                        <XStack key={item.product.id} justifyContent="space-between" marginTop="$1">
                          <Text fontSize={12} color="#065F46">
                            {item.quantity}x {item.product.name}
                          </Text>
                          <Text fontSize={12} fontWeight="600" color="#059669">
                            +{formatCurrency(item.product.sellingPrice * item.quantity, currency)}
                          </Text>
                        </XStack>
                      ))}
                    </YStack>
                  )}
                </YStack>
              )}

              {/* Smart Calculation Display */}
              <YStack
                padding="$4"
                backgroundColor="#F9FAFB"
                borderRadius="$3"
                borderWidth={1}
                borderColor="#E5E7EB"
                gap="$2"
              >
                <Text fontSize={12} fontWeight="600" color="#6B7280" marginBottom="$1">
                  CALCULATION
                </Text>

                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#6B7280">Return Value</Text>
                  <Text fontSize={13} fontWeight="500" color="#DC2626">
                    -{formatCurrency(returnValue, currency)}
                  </Text>
                </XStack>

                {mode === 'exchange' && exchangeValue > 0 && (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#6B7280">Exchange Value</Text>
                    <Text fontSize={13} fontWeight="500" color="#10B981">
                      +{formatCurrency(exchangeValue, currency)}
                    </Text>
                  </XStack>
                )}

                <YStack height={1} backgroundColor="#E5E7EB" marginVertical="$1" />

                {refundAmount > 0 && (
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={14} fontWeight="600" color="#111827">Refund to Customer</Text>
                    <Text fontSize={18} fontWeight="bold" color="#DC2626">
                      {formatCurrency(refundAmount, currency)}
                    </Text>
                  </XStack>
                )}

                {additionalPayment > 0 && (
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={14} fontWeight="600" color="#111827">Customer Pays</Text>
                    <Text fontSize={18} fontWeight="bold" color="#10B981">
                      {formatCurrency(additionalPayment, currency)}
                    </Text>
                  </XStack>
                )}

                {refundAmount === 0 && additionalPayment === 0 && mode === 'exchange' && (
                  <XStack justifyContent="center" alignItems="center" paddingVertical="$2">
                    <Check size={16} color="#10B981" />
                    <Text fontSize={14} fontWeight="600" color="#10B981" marginLeft="$2">
                      Even Exchange - No Payment Required
                    </Text>
                  </XStack>
                )}
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
                        fontSize={11}
                        fontWeight={reason === r.value ? '600' : '400'}
                        color={reason === r.value ? '#3B82F6' : '#374151'}
                      >
                        {r.label}
                      </Text>
                    </YStack>
                  ))}
                </XStack>
              </YStack>

              {/* Refund destination (only for refunds, not exchanges with additional payment) */}
              {(mode === 'refund' || refundAmount > 0) && (
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
                            fontSize={10}
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
              )}

              {/* Notes */}
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="600" color="#6B7280">NOTES (Optional)</Text>
                <TextArea
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any additional notes..."
                  placeholderTextColor="#9CA3AF"
                  minHeight={70}
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
              backgroundColor={isLoading ? '#9CA3AF' : mode === 'exchange' ? '#10B981' : '#3B82F6'}
              borderRadius="$3"
              paddingVertical="$3"
              gap="$2"
              justifyContent="center"
              alignItems="center"
              cursor={isLoading ? 'not-allowed' : 'pointer'}
              hoverStyle={{ backgroundColor: isLoading ? '#9CA3AF' : mode === 'exchange' ? '#059669' : '#2563EB' }}
              pressStyle={{ opacity: 0.9 }}
              onPress={isLoading ? undefined : handleSubmit}
            >
              {mode === 'exchange' ? (
                <ArrowLeftRight size={16} color="white" />
              ) : (
                <RefreshCw size={16} color="white" />
              )}
              <Text fontSize={14} fontWeight="600" color="white">
                {isLoading
                  ? 'Processing...'
                  : mode === 'exchange'
                  ? additionalPayment > 0
                    ? `Exchange + Collect ${formatCurrency(additionalPayment, currency)}`
                    : refundAmount > 0
                    ? `Exchange + Refund ${formatCurrency(refundAmount, currency)}`
                    : 'Process Exchange'
                  : `Refund ${formatCurrency(refundAmount, currency)}`}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}

export default ExchangeRefundModal;
