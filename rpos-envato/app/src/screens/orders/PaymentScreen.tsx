/**
 * PaymentScreen - Shared payment processing screen
 * Used by:
 * - POS checkout flow
 * - Add Payment action for OPEN orders
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ScrollView, ActivityIndicator, Alert, BackHandler } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  ArrowLeft, CreditCard, Banknote, Smartphone, Check, X,
  DollarSign, Percent, Gift, Calculator, CheckCircle, Plus, Trash2,
  QrCode, Wallet, Printer, Eye, ArrowRight, Download, FileText,
} from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';
import { DownloadPdfButton, DownloadPdfButtonGroup } from '@/components/pdf';
import { pdfService } from '@/services/pdf';
import type { ReceiptPdfData } from '@/services/pdf/types';
import { formatCurrency } from '@/utils';
import { useCartStore, useSettingsStore } from '@/store';
import { useOrder } from '@/features/orders/hooks';
import { useCustomers } from '@/features/customers/hooks';
import { useAppSettings } from '@/features/settings/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { orderKeys } from '@/features/orders/hooks';
import { post, put } from '@/services/api/client';
import type { OrderScreenProps } from '@/navigation/types';

// US State Tax Rates
const US_STATE_TAX_RATES: Record<string, number> = {
  'AL': 4, 'AK': 0, 'AZ': 5.6, 'AR': 6.5, 'CA': 7.25, 'CO': 2.9, 'CT': 6.35, 'DE': 0,
  'FL': 6, 'GA': 4, 'HI': 4, 'ID': 6, 'IL': 6.25, 'IN': 7, 'IA': 6, 'KS': 6.5,
  'KY': 6, 'LA': 4.45, 'ME': 5.5, 'MD': 6, 'MA': 6.25, 'MI': 6, 'MN': 6.875, 'MS': 7,
  'MO': 4.225, 'MT': 0, 'NE': 5.5, 'NV': 6.85, 'NH': 0, 'NJ': 6.625, 'NM': 5.125, 'NY': 8,
  'NC': 4.75, 'ND': 5, 'OH': 5.75, 'OK': 4.5, 'OR': 0, 'PA': 6, 'RI': 7, 'SC': 6,
  'SD': 4.5, 'TN': 7, 'TX': 6.25, 'UT': 6.1, 'VT': 6, 'VA': 5.3, 'WA': 6.5, 'WV': 6,
  'WI': 5, 'WY': 4, 'DC': 6,
};

// Payment method options
const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: '#10B981' },
  { id: 'card', label: 'Card', icon: CreditCard, color: '#8B5CF6' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, color: '#EC4899' },
  { id: 'split', label: 'Split', icon: Calculator, color: '#F59E0B' },
];

// Split payment method options
const SPLIT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: '#10B981' },
  { id: 'card', label: 'Card', icon: CreditCard, color: '#8B5CF6' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, color: '#EC4899' },
  { id: 'gift_card', label: 'Gift Card', icon: Gift, color: '#F59E0B' },
  { id: 'store_credit', label: 'Credit', icon: Wallet, color: '#3B82F6' },
];

// Quick cash amounts
const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

interface SplitPayment {
  id: string;
  method: string;
  amount: number;
}

export default function PaymentScreen({ navigation, route }: OrderScreenProps<'Payment'>) {
  const { orderId, fromPOS = false } = route.params || {};
  const { settings } = useSettingsStore();
  const queryClient = useQueryClient();
  const {
    items,
    customer,
    coupon,
    getSubTotal,
    getDiscount,
    clear,
    isEditingOrder,
    getEditingOrderId,
  } = useCartStore();

  // Fetch business settings for tax rate
  const { data: appSettings } = useAppSettings();

  // Calculate tax rate from business settings
  const taxRate = useMemo(() => {
    const businessState = (appSettings as any)?.state;
    const businessCountry = (appSettings as any)?.country || 'US';
    if (businessCountry === 'US' && businessState && US_STATE_TAX_RATES[businessState]) {
      return US_STATE_TAX_RATES[businessState];
    }
    return appSettings?.tax ?? settings.tax ?? 0;
  }, [appSettings, settings.tax]);

  // Snapshot cart data on mount to isolate from changes
  const snapshotRef = useRef<{
    items: typeof items;
    customer: typeof customer;
    coupon: typeof coupon;
    subTotal: number;
    discount: number;
  } | null>(null);

  // Capture cart data on mount
  useEffect(() => {
    if (fromPOS && items.length > 0 && !snapshotRef.current) {
      snapshotRef.current = {
        items: [...items],
        customer,
        coupon,
        subTotal: getSubTotal(),
        discount: getDiscount(),
      };
    }
  }, []);

  // Use snapshot data if available (POS flow), otherwise use live cart data
  const cartData = snapshotRef.current || {
    items,
    customer,
    coupon,
    subTotal: getSubTotal(),
    discount: getDiscount(),
  };

  // For existing OPEN orders, fetch the order data (skip if no orderId or coming from POS)
  const shouldFetchOrder = orderId && !fromPOS && !isEditingOrder();
  const { data: existingOrder, isLoading: orderLoading } = useOrder(shouldFetchOrder ? orderId : '');

  // Fetch customers for random assignment when no customer is selected
  const { data: customersData } = useCustomers({ limit: 50 });
  const customers = customersData ?? [];

  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);

  // Payment success state
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [changeAmount, setChangeAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  // Split payment state
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [newSplitMethod, setNewSplitMethod] = useState('cash');
  const [newSplitAmount, setNewSplitAmount] = useState('');

  // Handle back button - navigate to POS if came from POS
  const handleGoBack = useCallback(() => {
    if (fromPOS) {
      // Navigate to POS tab
      navigation.getParent()?.navigate('POS');
    } else {
      navigation.goBack();
    }
  }, [fromPOS, navigation]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });
    return () => backHandler.remove();
  }, [handleGoBack]);

  // Calculate totals - use snapshot for POS flow, order for existing orders
  const orderData = useMemo(() => {
    if (fromPOS || isEditingOrder()) {
      const subTotal = cartData.subTotal;
      const discount = cartData.discount;
      const taxableAmount = subTotal - discount;
      const tax = (taxableAmount * taxRate) / 100;
      const total = taxableAmount + tax;
      return {
        subTotal,
        discount,
        tax,
        taxRate,
        total,
        items: cartData.items,
        customer: cartData.customer,
      };
    } else if (existingOrder) {
      const payment = existingOrder.payment || {
        subTotal: existingOrder.subTotal || 0,
        discount: existingOrder.discount || 0,
        total: existingOrder.total || 0,
      };
      return {
        subTotal: payment.subTotal,
        discount: payment.discount,
        tax: payment.vat || 0,
        taxRate: 0,
        total: payment.total,
        items: existingOrder.items || [],
        customer: existingOrder.customer,
      };
    }
    return { subTotal: 0, discount: 0, tax: 0, taxRate: 0, total: 0, items: [], customer: null };
  }, [fromPOS, isEditingOrder, existingOrder, cartData, taxRate]);

  const total = orderData.total;
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = cashReceivedNum > total ? cashReceivedNum - total : 0;

  // Split payment calculations
  const splitTotal = useMemo(() =>
    splitPayments.reduce((sum, p) => sum + p.amount, 0),
    [splitPayments]
  );
  const splitRemaining = total - splitTotal;

  const handleQuickAmount = (amount: number) => {
    setCashReceived(amount.toString());
  };

  const handleExactAmount = () => {
    setCashReceived(total.toFixed(2));
  };

  // Split payment handlers
  const addSplitPayment = useCallback(() => {
    const amount = parseFloat(newSplitAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amount > splitRemaining) {
      Alert.alert('Amount Too High', `Maximum amount is ${formatCurrency(splitRemaining, settings.currency)}`);
      return;
    }
    setSplitPayments(prev => [
      ...prev,
      { id: Date.now().toString(), method: newSplitMethod, amount }
    ]);
    setNewSplitAmount('');
  }, [newSplitMethod, newSplitAmount, splitRemaining, settings.currency]);

  const removeSplitPayment = useCallback((id: string) => {
    setSplitPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const fillRemainingAmount = useCallback(() => {
    setNewSplitAmount(splitRemaining.toFixed(2));
  }, [splitRemaining]);

  const handleProcessPayment = async () => {
    console.log('[Order Flow] Starting payment process', {
      orderId,
      fromPOS,
      isEditing: isEditingOrder(),
      editingOrderId: getEditingOrderId(),
      paymentMethod,
      total,
      itemCount: cartData.items.length,
    });

    // Validation
    if (paymentMethod === 'cash' && cashReceivedNum < total) {
      Alert.alert('Insufficient Amount', 'Cash received is less than the total amount.');
      return;
    }
    if (paymentMethod === 'split' && splitRemaining > 0.01) {
      Alert.alert('Incomplete Payment', `Remaining amount: ${formatCurrency(splitRemaining, settings.currency)}`);
      return;
    }

    setProcessing(true);

    try {
      const editingOrderId = getEditingOrderId();
      const finalPaymentMethod = paymentMethod === 'split'
        ? `split:${splitPayments.map(p => p.method).join(',')}`
        : paymentMethod;

      // Randomly assign a customer if none selected (for demo purposes)
      const orderCustomer = cartData.customer;
      const orderCoupon = cartData.coupon;
      const randomCustomer = !orderCustomer && customers.length > 0
        ? customers[Math.floor(Math.random() * customers.length)]
        : null;

      const orderPayload = {
        items: cartData.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerId: orderCustomer?.id || randomCustomer?.id,
        couponId: orderCoupon?.id,
        paymentMethod: finalPaymentMethod,
        orderType: 'walk_in',
        status: 'completed',
        ...(paymentMethod === 'split' && {
          splitPayments: splitPayments.map(p => ({ method: p.method, amount: p.amount })),
        }),
        ...(paymentMethod === 'cash' && cashReceivedNum > 0 && {
          cashReceived: cashReceivedNum,
          changeGiven: change,
        }),
      };

      let createdOrderId: string | null = null;

      if (editingOrderId) {
        // Update existing OPEN order to COMPLETED
        const response = await put<{ success: boolean; data: any }>(`/orders/${editingOrderId}`, orderPayload);
        createdOrderId = editingOrderId;
        console.log('[Payment] Updated existing order:', editingOrderId);
      } else if (orderId && !fromPOS) {
        // Add payment to existing OPEN order (not from POS cart)
        const response = await put<{ success: boolean; data: any }>(`/orders/${orderId}`, {
          status: 'completed',
          paymentMethod: finalPaymentMethod,
        });
        createdOrderId = orderId;
        console.log('[Payment] Completed existing order:', orderId);
      } else {
        // New order from POS - capture the order ID from response
        const response = await post<{ success: boolean; data: any; message?: string }>('/orders', orderPayload);
        createdOrderId = response.data?.id || response.data?.order?.id || null;
        console.log('[Payment] Created new order:', createdOrderId, response);
      }

      // Invalidate queries for real-time updates
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      queryClient.invalidateQueries({ queryKey: orderKeys.recent() });
      if (editingOrderId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(editingOrderId) });
      }
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      }
      if (createdOrderId && createdOrderId !== editingOrderId && createdOrderId !== orderId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(createdOrderId) });
      }

      // Store payment details for success screen
      setChangeAmount(change);
      setPaidAmount(total);
      setCompletedOrderId(createdOrderId || editingOrderId || orderId || null);
      // Generate order number for receipt (use a timestamp-based format if not available from API)
      const orderNum = createdOrderId ? `ORD-${createdOrderId.slice(-8).toUpperCase()}` : `ORD-${Date.now().toString(36).toUpperCase()}`;
      setCompletedOrderNumber(orderNum);

      // Clear cart after successful payment
      clear();

      // Show success screen
      setPaymentSuccess(true);
    } catch (error: any) {
      console.error('Payment failed:', error);
      Alert.alert('Payment Failed', error?.message || 'Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle print receipt - generates PDF and opens print dialog
  const handlePrintReceipt = useCallback(async () => {
    if (isPrinting) return;

    setIsPrinting(true);
    try {
      // Build receipt data from order information
      const receiptData: ReceiptPdfData = {
        businessName: (appSettings as any)?.businessName || (appSettings as any)?.name || 'RPOS Store',
        businessAddress: (appSettings as any)?.address || '',
        businessPhone: (appSettings as any)?.phone || '',
        businessEmail: (appSettings as any)?.email || '',
        taxId: (appSettings as any)?.taxId || '',
        orderNumber: completedOrderNumber || completedOrderId || 'N/A',
        date: new Date().toISOString(),
        items: (snapshotRef.current?.items || cartData.items).map((item: any) => ({
          name: item.product?.name || item.name || 'Product',
          quantity: item.quantity,
          price: item.product?.sellingPrice || item.unitPrice || 0,
          total: (item.product?.sellingPrice || item.unitPrice || 0) * item.quantity,
          modifiers: item.modifiers?.map((m: any) => m.name || m) || [],
        })),
        subTotal: orderData.subTotal,
        discount: orderData.discount,
        tax: orderData.tax,
        total: paidAmount,
        paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
        amountPaid: paymentMethod === 'cash' ? parseFloat(cashReceived) || paidAmount : paidAmount,
        change: changeAmount,
        customerName: (orderData.customer as any)?.name || '',
        footer: 'Thank you for shopping with us!',
      };

      const result = await pdfService.generateReceipt(receiptData);

      if (result.success) {
        Alert.alert('Print Receipt', 'Receipt opened for printing. Use your browser\'s print dialog to print or save as PDF.');
      } else {
        Alert.alert('Print Failed', result.error || 'Failed to generate receipt');
      }
    } catch (error) {
      console.error('Print receipt error:', error);
      Alert.alert('Print Error', error instanceof Error ? error.message : 'Failed to print receipt');
    } finally {
      setIsPrinting(false);
    }
  }, [isPrinting, appSettings, settings, completedOrderNumber, completedOrderId, cartData.items, orderData, paidAmount, paymentMethod, cashReceived, changeAmount]);

  if (orderLoading && shouldFetchOrder) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text color="$colorSecondary" marginTop="$2">Loading order...</Text>
      </YStack>
    );
  }

  // Payment Success Screen
  if (paymentSuccess) {
    const handleNewOrder = () => {
      console.log('[Order Flow] New Order clicked', { fromPOS, completedOrderId });
      setPaymentSuccess(false);
      if (fromPOS) {
        // Reset Orders stack and navigate to POS tab
        console.log('[Order Flow] Resetting stack and navigating to POS');
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderList' }],
        });
        navigation.getParent()?.navigate('POS');
      } else {
        // Reset stack to OrderList to prevent stale navigation
        console.log('[Order Flow] Resetting stack to OrderList');
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderList' }],
        });
      }
    };

    const handleViewOrder = () => {
      console.log('[Order Flow] View Order clicked', { completedOrderId });
      if (completedOrderId) {
        // Reset stack with OrderList as base, then navigate to OrderDetail
        console.log('[Order Flow] Navigating to OrderDetail:', completedOrderId);
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderList' }],
        });
        // Navigate to OrderDetail after stack reset
        setTimeout(() => {
          navigation.navigate('OrderDetail', { id: completedOrderId });
        }, 100);
      } else {
        // Fallback to order list if no order ID (shouldn't happen)
        console.log('[Order Flow] No order ID, falling back to OrderList');
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrderList' }],
        });
      }
    };

    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center" padding="$6">
        {/* Success Animation Container */}
        <YStack
          backgroundColor="$cardBackground"
          padding="$6"
          borderRadius="$6"
          alignItems="center"
          gap="$4"
          width="100%"
          maxWidth={450}
          shadowColor="rgba(0,0,0,0.1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowRadius={20}
        >
          {/* Success Icon */}
          <YStack
            width={100}
            height={100}
            borderRadius={50}
            backgroundColor="#10B98120"
            justifyContent="center"
            alignItems="center"
          >
            <CheckCircle size={60} color="#10B981" />
          </YStack>

          {/* Success Message */}
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$7" fontWeight="bold" color="$color">Payment Successful!</Text>
            <Text fontSize="$3" color="$colorSecondary" textAlign="center">
              Transaction completed successfully
            </Text>
          </YStack>

          {/* Amount Details */}
          <YStack
            width="100%"
            backgroundColor="#F0FDF4"
            padding="$4"
            borderRadius="$3"
            gap="$2"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="#166534">Amount Paid</Text>
              <Text fontSize="$5" fontWeight="bold" color="#166534">
                {formatCurrency(paidAmount, settings.currency)}
              </Text>
            </XStack>
            {changeAmount > 0 && (
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="#166534">Change Due</Text>
                <Text fontSize="$4" fontWeight="600" color="#166534">
                  {formatCurrency(changeAmount, settings.currency)}
                </Text>
              </XStack>
            )}
            <XStack justifyContent="space-between" alignItems="center" paddingTop="$2">
              <Text fontSize="$2" color="#166534">Payment Method</Text>
              <Text fontSize="$3" color="#166534" textTransform="capitalize">
                {paymentMethod}
              </Text>
            </XStack>
          </YStack>

          {/* Action Buttons */}
          <YStack width="100%" gap="$3" paddingTop="$2">
            {/* PDF Download Buttons */}
            {completedOrderId && (
              <XStack gap="$3">
                <DownloadPdfButton
                  orderId={completedOrderId}
                  type="receipt"
                  variant="primary"
                  size="lg"
                  label="Download Receipt"
                  onSuccess={() => Alert.alert('Success', 'Receipt downloaded successfully!')}
                  onError={(error) => Alert.alert('Download Failed', error)}
                />
                <DownloadPdfButton
                  orderId={completedOrderId}
                  type="invoice"
                  variant="outlined"
                  size="lg"
                  label="Download Invoice"
                  onSuccess={() => Alert.alert('Success', 'Invoice downloaded successfully!')}
                  onError={(error) => Alert.alert('Download Failed', error)}
                />
              </XStack>
            )}

            {/* Print Receipt Button */}
            <Button
              size="$4"
              backgroundColor={isPrinting ? '#9CA3AF' : '#3B82F6'}
              borderRadius="$3"
              disabled={isPrinting}
              onPress={handlePrintReceipt}
            >
              <XStack gap="$2" alignItems="center">
                {isPrinting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Printer size={20} color="white" />
                )}
                <Text color="white" fontWeight="600">
                  {isPrinting ? 'Generating...' : 'Print Receipt'}
                </Text>
              </XStack>
            </Button>

            {/* Secondary Actions */}
            <XStack gap="$3">
              <Button
                flex={1}
                size="$4"
                backgroundColor="transparent"
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius="$3"
                onPress={handleViewOrder}
              >
                <XStack gap="$2" alignItems="center">
                  <Eye size={18} color="$color" />
                  <Text color="$color" fontWeight="500">View Order</Text>
                </XStack>
              </Button>

              <Button
                flex={1}
                size="$4"
                backgroundColor="#10B981"
                borderRadius="$3"
                onPress={handleNewOrder}
              >
                <XStack gap="$2" alignItems="center">
                  <ArrowRight size={18} color="white" />
                  <Text color="white" fontWeight="600">New Order</Text>
                </XStack>
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    );
  }

  const getMethodConfig = (methodId: string) =>
    SPLIT_METHODS.find(m => m.id === methodId) || SPLIT_METHODS[0];

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        alignItems="center"
        gap="$3"
      >
        <YStack
          padding="$2"
          borderRadius="$2"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '$backgroundHover' }}
          onPress={handleGoBack}
        >
          <ArrowLeft size={24} color="$color" />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="bold" color="$color">Payment</Text>
          <Text fontSize="$2" color="$colorSecondary">
            {isEditingOrder() ? 'Complete order payment' : 'Process payment'}
          </Text>
        </YStack>
        {/* Total Badge */}
        <YStack
          backgroundColor="#3B82F6"
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$3"
        >
          <Text fontSize={16} fontWeight="bold" color="white">
            {formatCurrency(total, settings.currency)}
          </Text>
        </YStack>
      </XStack>

      <XStack flex={1}>
        {/* Left Side - Order Summary */}
        <YStack width={360} padding="$4" backgroundColor="$cardBackground" borderRightWidth={1} borderRightColor="$borderColor">
          <Text fontSize="$4" fontWeight="600" color="$color" marginBottom="$3">
            Order Summary
          </Text>

          {/* Customer Info */}
          {orderData.customer && (
            <XStack
              padding="$2"
              backgroundColor="#EFF6FF"
              borderRadius="$2"
              marginBottom="$3"
              alignItems="center"
              gap="$2"
            >
              <YStack width={32} height={32} borderRadius={16} backgroundColor="#3B82F6" alignItems="center" justifyContent="center">
                <Text fontSize={12} fontWeight="bold" color="white">
                  {(orderData.customer as any).name?.charAt(0).toUpperCase() || 'C'}
                </Text>
              </YStack>
              <Text fontSize={13} color="#3B82F6" fontWeight="500">{(orderData.customer as any).name}</Text>
            </XStack>
          )}

          {/* Items List */}
          <ScrollView style={{ flex: 1, marginBottom: 16 }}>
            {orderData.items.map((item: any, index: number) => (
              <XStack
                key={item.id || index}
                paddingVertical="$2"
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
                justifyContent="space-between"
              >
                <YStack flex={1}>
                  <Text fontSize={13} color="$color" numberOfLines={1}>
                    {item.product?.name || item.name || 'Product'}
                  </Text>
                  <Text fontSize={11} color="$colorSecondary">
                    {item.quantity} x {formatCurrency(item.product?.sellingPrice || item.unitPrice || 0, settings.currency)}
                  </Text>
                </YStack>
                <Text fontSize={13} fontWeight="500" color="$color">
                  {formatCurrency((item.product?.sellingPrice || item.unitPrice || 0) * item.quantity, settings.currency)}
                </Text>
              </XStack>
            ))}
          </ScrollView>

          {/* Totals */}
          <YStack gap="$2" paddingTop="$3" borderTopWidth={1} borderTopColor="$borderColor">
            <XStack justifyContent="space-between">
              <Text fontSize={13} color="$colorSecondary">Subtotal</Text>
              <Text fontSize={13} color="$color">{formatCurrency(orderData.subTotal, settings.currency)}</Text>
            </XStack>
            {orderData.discount > 0 && (
              <XStack justifyContent="space-between">
                <Text fontSize={13} color="#10B981">Discount</Text>
                <Text fontSize={13} color="#10B981">-{formatCurrency(orderData.discount, settings.currency)}</Text>
              </XStack>
            )}
            {(orderData.tax > 0 || orderData.taxRate > 0) && (
              <XStack justifyContent="space-between">
                <Text fontSize={13} color="$colorSecondary">
                  Tax{orderData.taxRate > 0 ? ` (${orderData.taxRate}%)` : ''}
                </Text>
                <Text fontSize={13} color="$color">{formatCurrency(orderData.tax, settings.currency)}</Text>
              </XStack>
            )}
            <XStack justifyContent="space-between" paddingTop="$2" borderTopWidth={2} borderTopColor="$borderColor">
              <Text fontSize="$5" fontWeight="bold" color="$color">Total</Text>
              <Text fontSize="$6" fontWeight="bold" color="#3B82F6">
                {formatCurrency(total, settings.currency)}
              </Text>
            </XStack>
          </YStack>
        </YStack>

        {/* Right Side - Payment Methods */}
        <YStack flex={1} padding="$4">
          {/* Payment Method Selection */}
          <Text fontSize="$4" fontWeight="600" color="$color" marginBottom="$3">
            Payment Method
          </Text>
          <XStack gap="$3" marginBottom="$4">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <YStack
                  key={method.id}
                  flex={1}
                  padding="$3"
                  borderRadius="$3"
                  borderWidth={2}
                  borderColor={isSelected ? method.color : '$borderColor'}
                  backgroundColor={isSelected ? `${method.color}15` : '$cardBackground'}
                  alignItems="center"
                  gap="$2"
                  cursor="pointer"
                  hoverStyle={{ borderColor: method.color }}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <Icon size={24} color={isSelected ? method.color : '$colorSecondary'} />
                  <Text
                    fontSize={13}
                    fontWeight={isSelected ? '600' : '400'}
                    color={isSelected ? method.color : '$color'}
                  >
                    {method.label}
                  </Text>
                </YStack>
              );
            })}
          </XStack>

          <ScrollView style={{ flex: 1 }}>
            {/* Cash Payment Section */}
            {paymentMethod === 'cash' && (
              <YStack gap="$3">
                <Text fontSize={14} fontWeight="500" color="$color">Cash Received</Text>

                {/* Quick amounts */}
                <XStack gap="$2" flexWrap="wrap">
                  {QUICK_AMOUNTS.map((amount) => (
                    <YStack
                      key={amount}
                      paddingVertical="$2"
                      paddingHorizontal="$3"
                      borderRadius="$2"
                      backgroundColor={cashReceivedNum === amount ? '#3B82F620' : '$backgroundHover'}
                      borderWidth={cashReceivedNum === amount ? 1 : 0}
                      borderColor="#3B82F6"
                      cursor="pointer"
                      hoverStyle={{ backgroundColor: '#3B82F620' }}
                      onPress={() => handleQuickAmount(amount)}
                    >
                      <Text fontSize={13} color={cashReceivedNum === amount ? '#3B82F6' : '$color'}>
                        {formatCurrency(amount, settings.currency)}
                      </Text>
                    </YStack>
                  ))}
                  <YStack
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    borderRadius="$2"
                    backgroundColor="#10B98120"
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#10B98130' }}
                    onPress={handleExactAmount}
                  >
                    <Text fontSize={13} fontWeight="600" color="#10B981">Exact</Text>
                  </YStack>
                </XStack>

                {/* Cash input */}
                <XStack
                  backgroundColor="$cardBackground"
                  borderWidth={2}
                  borderColor="#10B981"
                  borderRadius="$3"
                  paddingHorizontal="$3"
                  paddingVertical="$3"
                  alignItems="center"
                  gap="$2"
                >
                  <DollarSign size={24} color="#10B981" />
                  <Input
                    flex={1}
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    fontSize={28}
                    fontWeight="bold"
                    borderWidth={0}
                    backgroundColor="transparent"
                    color="$color"
                  />
                </XStack>

                {/* Change display */}
                {cashReceivedNum > 0 && (
                  <XStack
                    padding="$3"
                    borderRadius="$3"
                    backgroundColor={change >= 0 ? '#10B98120' : '#FEE2E2'}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Text fontSize={14} fontWeight="500" color={change >= 0 ? '#10B981' : '#DC2626'}>
                      {change >= 0 ? 'Change Due' : 'Amount Remaining'}
                    </Text>
                    <Text fontSize={20} fontWeight="bold" color={change >= 0 ? '#10B981' : '#DC2626'}>
                      {formatCurrency(change >= 0 ? change : total - cashReceivedNum, settings.currency)}
                    </Text>
                  </XStack>
                )}
              </YStack>
            )}

            {/* Card Payment Section */}
            {paymentMethod === 'card' && (
              <YStack
                padding="$4"
                borderRadius="$3"
                backgroundColor="#8B5CF615"
                borderWidth={1}
                borderColor="#8B5CF640"
                alignItems="center"
                gap="$3"
              >
                <YStack width={64} height={64} borderRadius={32} backgroundColor="#8B5CF620" alignItems="center" justifyContent="center">
                  <CreditCard size={32} color="#8B5CF6" />
                </YStack>
                <Text fontSize={16} color="#8B5CF6" fontWeight="600">
                  Ready for Card Payment
                </Text>
                <Text fontSize={13} color="$colorSecondary" textAlign="center">
                  Insert, tap, or swipe card on terminal
                </Text>
                <YStack
                  marginTop="$2"
                  padding="$3"
                  backgroundColor="#8B5CF610"
                  borderRadius="$2"
                  width="100%"
                  alignItems="center"
                >
                  <Text fontSize={24} fontWeight="bold" color="#8B5CF6">
                    {formatCurrency(total, settings.currency)}
                  </Text>
                </YStack>
              </YStack>
            )}

            {/* Mobile Payment Section */}
            {paymentMethod === 'mobile' && (
              <YStack
                padding="$4"
                borderRadius="$3"
                backgroundColor="#EC489915"
                borderWidth={1}
                borderColor="#EC489940"
                alignItems="center"
                gap="$3"
              >
                <YStack width={64} height={64} borderRadius={32} backgroundColor="#EC489920" alignItems="center" justifyContent="center">
                  <QrCode size={32} color="#EC4899" />
                </YStack>
                <Text fontSize={16} color="#EC4899" fontWeight="600">
                  Mobile Payment
                </Text>
                <Text fontSize={13} color="$colorSecondary" textAlign="center">
                  Scan QR code or use NFC tap-to-pay
                </Text>
                <YStack
                  marginTop="$2"
                  padding="$3"
                  backgroundColor="#EC489910"
                  borderRadius="$2"
                  width="100%"
                  alignItems="center"
                >
                  <Text fontSize={24} fontWeight="bold" color="#EC4899">
                    {formatCurrency(total, settings.currency)}
                  </Text>
                </YStack>
              </YStack>
            )}

            {/* Split Payment Section */}
            {paymentMethod === 'split' && (
              <YStack gap="$3">
                {/* Remaining amount indicator */}
                <XStack
                  padding="$3"
                  borderRadius="$3"
                  backgroundColor={splitRemaining <= 0.01 ? '#10B98120' : '#FEF3C7'}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text fontSize={14} fontWeight="500" color={splitRemaining <= 0.01 ? '#10B981' : '#D97706'}>
                    {splitRemaining <= 0.01 ? 'Payment Complete' : 'Remaining'}
                  </Text>
                  <Text fontSize={18} fontWeight="bold" color={splitRemaining <= 0.01 ? '#10B981' : '#D97706'}>
                    {formatCurrency(Math.max(0, splitRemaining), settings.currency)}
                  </Text>
                </XStack>

                {/* Added split payments */}
                {splitPayments.length > 0 && (
                  <YStack gap="$2">
                    <Text fontSize={12} fontWeight="600" color="$colorSecondary">PAYMENTS ADDED</Text>
                    {splitPayments.map((payment) => {
                      const config = getMethodConfig(payment.method);
                      const Icon = config.icon;
                      return (
                        <XStack
                          key={payment.id}
                          padding="$3"
                          backgroundColor={`${config.color}15`}
                          borderRadius="$2"
                          borderWidth={1}
                          borderColor={`${config.color}40`}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <XStack alignItems="center" gap="$2">
                            <Icon size={18} color={config.color} />
                            <Text fontSize={13} fontWeight="500" color={config.color}>
                              {config.label}
                            </Text>
                          </XStack>
                          <XStack alignItems="center" gap="$2">
                            <Text fontSize={14} fontWeight="600" color={config.color}>
                              {formatCurrency(payment.amount, settings.currency)}
                            </Text>
                            <YStack
                              padding="$1"
                              borderRadius="$1"
                              backgroundColor="#FEE2E2"
                              cursor="pointer"
                              onPress={() => removeSplitPayment(payment.id)}
                            >
                              <Trash2 size={14} color="#DC2626" />
                            </YStack>
                          </XStack>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}

                {/* Add new split payment */}
                {splitRemaining > 0.01 && (
                  <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                    <Text fontSize={12} fontWeight="600" color="$colorSecondary">ADD PAYMENT</Text>

                    {/* Method selection */}
                    <XStack gap="$2" flexWrap="wrap">
                      {SPLIT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = newSplitMethod === method.id;
                        return (
                          <XStack
                            key={method.id}
                            paddingVertical="$2"
                            paddingHorizontal="$2"
                            borderRadius="$2"
                            borderWidth={1}
                            borderColor={isSelected ? method.color : '$borderColor'}
                            backgroundColor={isSelected ? `${method.color}15` : 'white'}
                            alignItems="center"
                            gap="$1"
                            cursor="pointer"
                            onPress={() => setNewSplitMethod(method.id)}
                          >
                            <Icon size={14} color={isSelected ? method.color : '$colorSecondary'} />
                            <Text fontSize={11} color={isSelected ? method.color : '$color'}>{method.label}</Text>
                          </XStack>
                        );
                      })}
                    </XStack>

                    {/* Amount input */}
                    <XStack gap="$2" alignItems="center">
                      <XStack
                        flex={1}
                        backgroundColor="white"
                        borderWidth={1}
                        borderColor="$borderColor"
                        borderRadius="$2"
                        paddingHorizontal="$2"
                        paddingVertical="$2"
                        alignItems="center"
                        gap="$1"
                      >
                        <DollarSign size={16} color="$colorSecondary" />
                        <Input
                          flex={1}
                          value={newSplitAmount}
                          onChangeText={setNewSplitAmount}
                          placeholder="Amount"
                          keyboardType="decimal-pad"
                          fontSize={14}
                          borderWidth={0}
                          backgroundColor="transparent"
                        />
                      </XStack>
                      <YStack
                        paddingVertical="$2"
                        paddingHorizontal="$2"
                        backgroundColor="#10B98120"
                        borderRadius="$2"
                        cursor="pointer"
                        onPress={fillRemainingAmount}
                      >
                        <Text fontSize={11} fontWeight="600" color="#10B981">Fill</Text>
                      </YStack>
                      <YStack
                        padding="$2"
                        backgroundColor="#3B82F6"
                        borderRadius="$2"
                        cursor="pointer"
                        onPress={addSplitPayment}
                      >
                        <Plus size={18} color="white" />
                      </YStack>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            )}
          </ScrollView>

          {/* Process Payment Button */}
          <YStack marginTop="$4">
            <XStack
              backgroundColor={processing ? '#9CA3AF' : '#10B981'}
              paddingVertical="$4"
              borderRadius="$3"
              justifyContent="center"
              alignItems="center"
              gap="$2"
              cursor={processing ? 'not-allowed' : 'pointer'}
              hoverStyle={!processing ? { opacity: 0.9 } : {}}
              pressStyle={!processing ? { opacity: 0.85 } : {}}
              onPress={!processing ? handleProcessPayment : undefined}
            >
              {processing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <CheckCircle size={20} color="white" />
              )}
              <Text fontSize={16} fontWeight="bold" color="white">
                {processing ? 'Processing...' : `Complete Payment - ${formatCurrency(total, settings.currency)}`}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  );
}
