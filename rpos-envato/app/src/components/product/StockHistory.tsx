import React, { useState } from 'react';
import { YStack, XStack, Text, Input, ScrollView } from 'tamagui';
import {
  Package, TrendingUp, TrendingDown, Clock, Truck, Plus,
  Calendar, DollarSign, User, ChevronRight, AlertTriangle,
  RefreshCw, FileText, CheckCircle,
} from '@tamagui/lucide-icons';
import type { Product, Supplier } from '@/types';

/**
 * Stock History Component
 *
 * Purpose: Replace "Shipping Details" with inventory/batch order tracking
 * This is more relevant for MSMC, Deli, and Liquor retail stores
 *
 * Features:
 * - Recent stock adjustments
 * - Last batch order details
 * - Reorder suggestions
 * - Stock trend visualization
 */

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
};

// Stock adjustment reasons
type AdjustmentType = 'purchase_order' | 'sale' | 'return' | 'damage' | 'count' | 'transfer';

interface StockAdjustment {
  id: string;
  type: AdjustmentType;
  quantity: number; // Positive = added, Negative = removed
  previousStock: number;
  newStock: number;
  date: string;
  note?: string;
  supplier?: { id: string; name: string };
  orderNumber?: string;
  unitCost?: number;
  totalCost?: number;
  createdBy?: string;
}

interface BatchOrder {
  id: string;
  orderNumber: string;
  supplier: { id: string; name: string; code: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  orderDate: string;
  receivedDate?: string;
  status: 'pending' | 'shipped' | 'received' | 'partial';
  note?: string;
}

// Mock data for demonstration - will be replaced with real API data
const MOCK_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: '1',
    type: 'purchase_order',
    quantity: 50,
    previousStock: 150,
    newStock: 200,
    date: '2024-01-15T10:30:00Z',
    supplier: { id: 's1', name: 'ABC Distributors' },
    orderNumber: 'PO-2024-0142',
    unitCost: 7.50,
    totalCost: 375.00,
    createdBy: 'John Manager',
  },
  {
    id: '2',
    type: 'sale',
    quantity: -12,
    previousStock: 200,
    newStock: 188,
    date: '2024-01-14T14:22:00Z',
    note: 'Daily sales',
  },
  {
    id: '3',
    type: 'damage',
    quantity: -3,
    previousStock: 188,
    newStock: 185,
    date: '2024-01-13T09:15:00Z',
    note: 'Damaged during storage',
    createdBy: 'Sarah Staff',
  },
];

const MOCK_LAST_ORDER: BatchOrder = {
  id: 'bo1',
  orderNumber: 'PO-2024-0142',
  supplier: { id: 's1', name: 'ABC Distributors', code: 'ABC' },
  quantity: 50,
  unitCost: 7.50,
  totalCost: 375.00,
  orderDate: '2024-01-12T00:00:00Z',
  receivedDate: '2024-01-15T10:30:00Z',
  status: 'received',
};

const getAdjustmentIcon = (type: AdjustmentType) => {
  switch (type) {
    case 'purchase_order':
      return <Truck size={14} color={COLORS.success} />;
    case 'sale':
      return <TrendingDown size={14} color={COLORS.primary} />;
    case 'return':
      return <RefreshCw size={14} color={COLORS.warning} />;
    case 'damage':
      return <AlertTriangle size={14} color={COLORS.error} />;
    case 'count':
      return <FileText size={14} color={COLORS.gray} />;
    case 'transfer':
      return <Package size={14} color={COLORS.primary} />;
    default:
      return <Package size={14} color={COLORS.gray} />;
  }
};

const getAdjustmentLabel = (type: AdjustmentType) => {
  const labels: Record<AdjustmentType, string> = {
    purchase_order: 'Purchase Order',
    sale: 'Sales',
    return: 'Customer Return',
    damage: 'Damage/Loss',
    count: 'Inventory Count',
    transfer: 'Transfer',
  };
  return labels[type] || type;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

interface StockHistoryProps {
  product: Product;
  adjustments?: StockAdjustment[];
  lastOrder?: BatchOrder | null;
  onAddStock?: () => void;
  onViewAllHistory?: () => void;
  compact?: boolean;
}

export function StockHistory({
  product,
  adjustments = MOCK_ADJUSTMENTS,
  lastOrder = MOCK_LAST_ORDER,
  onAddStock,
  onViewAllHistory,
  compact = false,
}: StockHistoryProps) {
  const currentStock = product.quantity ?? 0;
  const isLowStock = currentStock <= 10;
  const isOutOfStock = currentStock === 0;

  // Calculate reorder suggestion
  const avgDailySales = 5; // This would come from analytics
  const daysOfStock = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;
  const shouldReorder = daysOfStock <= 7;

  if (compact) {
    return (
      <YStack gap="$2">
        {/* Last Order Summary */}
        {lastOrder && (
          <XStack
            backgroundColor={COLORS.successLight}
            padding="$2"
            borderRadius={8}
            alignItems="center"
            gap="$2"
          >
            <Truck size={14} color={COLORS.success} />
            <YStack flex={1}>
              <Text fontSize={11} color={COLORS.success} fontWeight="600">
                Last Order: {lastOrder.quantity} units
              </Text>
              <Text fontSize={10} color={COLORS.gray}>
                {formatDate(lastOrder.receivedDate || lastOrder.orderDate)}
              </Text>
            </YStack>
          </XStack>
        )}

        {/* Reorder Alert */}
        {shouldReorder && (
          <XStack
            backgroundColor={COLORS.warningLight}
            padding="$2"
            borderRadius={8}
            alignItems="center"
            gap="$2"
          >
            <AlertTriangle size={14} color={COLORS.warning} />
            <Text fontSize={11} color="#92400E" fontWeight="500">
              ~{daysOfStock} days of stock remaining
            </Text>
          </XStack>
        )}
      </YStack>
    );
  }

  return (
    <YStack gap="$4">
      {/* Section Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <YStack
            width={32}
            height={32}
            borderRadius={8}
            backgroundColor={COLORS.primaryLight}
            alignItems="center"
            justifyContent="center"
          >
            <Package size={16} color={COLORS.primary} />
          </YStack>
          <YStack>
            <Text fontSize={14} fontWeight="700" color="#111827">
              Stock History
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Inventory orders & adjustments
            </Text>
          </YStack>
        </XStack>

        {onAddStock && (
          <XStack
            backgroundColor={COLORS.primary}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius={8}
            alignItems="center"
            gap="$1"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#2563EB' }}
            onPress={onAddStock}
          >
            <Plus size={14} color="white" />
            <Text fontSize={12} color="white" fontWeight="600">
              Add Stock
            </Text>
          </XStack>
        )}
      </XStack>

      {/* Stock Status Card */}
      <XStack
        backgroundColor={isOutOfStock ? COLORS.errorLight : isLowStock ? COLORS.warningLight : COLORS.grayLight}
        padding="$3"
        borderRadius={12}
        borderWidth={1}
        borderColor={isOutOfStock ? '#FECACA' : isLowStock ? '#FCD34D' : COLORS.border}
        justifyContent="space-between"
        alignItems="center"
      >
        <YStack>
          <Text fontSize={11} color={COLORS.gray} fontWeight="500">
            Current Stock Level
          </Text>
          <XStack alignItems="baseline" gap="$1">
            <Text
              fontSize={28}
              fontWeight="800"
              color={isOutOfStock ? COLORS.error : isLowStock ? COLORS.warning : '#111827'}
            >
              {currentStock}
            </Text>
            <Text fontSize={13} color={COLORS.gray}>units</Text>
          </XStack>
        </YStack>

        <YStack alignItems="flex-end" gap="$1">
          {shouldReorder ? (
            <XStack
              backgroundColor={COLORS.warning}
              paddingHorizontal="$2"
              paddingVertical={4}
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              <AlertTriangle size={12} color="white" />
              <Text fontSize={11} color="white" fontWeight="600">
                Reorder Soon
              </Text>
            </XStack>
          ) : (
            <XStack
              backgroundColor={COLORS.success}
              paddingHorizontal="$2"
              paddingVertical={4}
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              <CheckCircle size={12} color="white" />
              <Text fontSize={11} color="white" fontWeight="600">
                Well Stocked
              </Text>
            </XStack>
          )}
          <Text fontSize={10} color={COLORS.gray}>
            ~{daysOfStock} days remaining
          </Text>
        </YStack>
      </XStack>

      {/* Last Batch Order */}
      {lastOrder && (
        <YStack
          backgroundColor="white"
          borderRadius={12}
          borderWidth={1}
          borderColor={COLORS.border}
          overflow="hidden"
        >
          <XStack
            backgroundColor={COLORS.successLight}
            padding="$3"
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack alignItems="center" gap="$2">
              <Truck size={16} color={COLORS.success} />
              <Text fontSize={13} fontWeight="700" color={COLORS.success}>
                Last Batch Order
              </Text>
            </XStack>
            <XStack
              backgroundColor="white"
              paddingHorizontal="$2"
              paddingVertical={3}
              borderRadius={4}
            >
              <Text fontSize={10} color={COLORS.success} fontWeight="600">
                {lastOrder.orderNumber}
              </Text>
            </XStack>
          </XStack>

          <YStack padding="$3" gap="$3">
            <XStack justifyContent="space-between">
              <YStack>
                <Text fontSize={11} color={COLORS.gray}>Supplier</Text>
                <XStack alignItems="center" gap="$1">
                  <XStack
                    backgroundColor={COLORS.grayLight}
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={4}
                  >
                    <Text fontSize={10} color={COLORS.gray} fontWeight="600">
                      {lastOrder.supplier.code}
                    </Text>
                  </XStack>
                  <Text fontSize={13} fontWeight="600" color="#111827">
                    {lastOrder.supplier.name}
                  </Text>
                </XStack>
              </YStack>
              <YStack alignItems="flex-end">
                <Text fontSize={11} color={COLORS.gray}>Received</Text>
                <Text fontSize={13} fontWeight="600" color="#111827">
                  {formatDate(lastOrder.receivedDate || lastOrder.orderDate)}
                </Text>
              </YStack>
            </XStack>

            <XStack
              backgroundColor={COLORS.grayLight}
              padding="$2"
              borderRadius={8}
              justifyContent="space-around"
            >
              <YStack alignItems="center">
                <Text fontSize={10} color={COLORS.gray}>Quantity</Text>
                <Text fontSize={15} fontWeight="700" color="#111827">
                  {lastOrder.quantity}
                </Text>
              </YStack>
              <YStack width={1} backgroundColor={COLORS.border} />
              <YStack alignItems="center">
                <Text fontSize={10} color={COLORS.gray}>Unit Cost</Text>
                <Text fontSize={15} fontWeight="700" color="#111827">
                  {formatCurrency(lastOrder.unitCost)}
                </Text>
              </YStack>
              <YStack width={1} backgroundColor={COLORS.border} />
              <YStack alignItems="center">
                <Text fontSize={10} color={COLORS.gray}>Total</Text>
                <Text fontSize={15} fontWeight="700" color={COLORS.success}>
                  {formatCurrency(lastOrder.totalCost)}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      )}

      {/* Recent Adjustments */}
      <YStack gap="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={12} fontWeight="600" color="#111827">
            Recent Activity
          </Text>
          {onViewAllHistory && (
            <XStack
              alignItems="center"
              gap="$1"
              cursor="pointer"
              hoverStyle={{ opacity: 0.7 }}
              onPress={onViewAllHistory}
            >
              <Text fontSize={11} color={COLORS.primary} fontWeight="500">
                View All
              </Text>
              <ChevronRight size={12} color={COLORS.primary} />
            </XStack>
          )}
        </XStack>

        <YStack
          backgroundColor="white"
          borderRadius={12}
          borderWidth={1}
          borderColor={COLORS.border}
          overflow="hidden"
        >
          {adjustments.slice(0, 5).map((adjustment, index) => (
            <XStack
              key={adjustment.id}
              padding="$3"
              alignItems="center"
              gap="$3"
              borderBottomWidth={index < adjustments.length - 1 ? 1 : 0}
              borderBottomColor={COLORS.border}
            >
              <YStack
                width={32}
                height={32}
                borderRadius={8}
                backgroundColor={
                  adjustment.quantity > 0 ? COLORS.successLight :
                  adjustment.type === 'damage' ? COLORS.errorLight :
                  COLORS.grayLight
                }
                alignItems="center"
                justifyContent="center"
              >
                {getAdjustmentIcon(adjustment.type)}
              </YStack>

              <YStack flex={1}>
                <Text fontSize={12} fontWeight="600" color="#111827">
                  {getAdjustmentLabel(adjustment.type)}
                </Text>
                <Text fontSize={10} color={COLORS.gray}>
                  {formatDate(adjustment.date)}
                  {adjustment.supplier && ` • ${adjustment.supplier.name}`}
                </Text>
              </YStack>

              <YStack alignItems="flex-end">
                <Text
                  fontSize={14}
                  fontWeight="700"
                  color={adjustment.quantity > 0 ? COLORS.success : COLORS.error}
                >
                  {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
                </Text>
                <Text fontSize={10} color={COLORS.gray}>
                  {adjustment.previousStock} → {adjustment.newStock}
                </Text>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </YStack>
    </YStack>
  );
}

export default StockHistory;
