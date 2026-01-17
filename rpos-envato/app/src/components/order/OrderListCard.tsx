/**
 * OrderListCard - Mobile-optimized card view for orders
 */

import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import {
  User, Clock, CreditCard, Banknote, Smartphone, Eye, Pencil, Printer, MoreHorizontal,
  ShoppingCart,
} from '@tamagui/lucide-icons';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatCurrency, formatDate } from '@/utils';
import type { Order, Currency } from '@/types';

export interface OrderListCardProps {
  order: Order;
  currency: Currency;
  onView: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onMore?: () => void;
  showActions?: boolean;
}

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  digital: Smartphone,
};

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const orderDate = new Date(date);
  const diffMs = now.getTime() - orderDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(orderDate, 'MMM d');
}

export function OrderListCard({
  order,
  currency,
  onView,
  onEdit,
  onPrint,
  onMore,
  showActions = true,
}: OrderListCardProps) {
  const orderNumber = order.number || order.orderNumber || `#${order.id.slice(0, 6)}`;
  const payment = order.payment || { subTotal: order.subTotal || 0, discount: order.discount || 0, total: order.total || 0 };
  const customerName = order.customer?.name || order.guestName || 'Walk-in Customer';
  const customerPhone = order.customer?.phone;
  const items = order.items || [];
  const itemCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
  const status = order.status || 'completed';
  const paymentMethod = (order as any).paymentMethod || 'cash';
  const PaymentIcon = PAYMENT_ICONS[paymentMethod] || CreditCard;

  // Get first 2 item names for preview
  const itemPreview = items.slice(0, 2).map((item: any) =>
    item.product?.name || item.name || 'Item'
  );
  const moreItems = items.length > 2 ? items.length - 2 : 0;

  return (
    <YStack
      backgroundColor="$cardBackground"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
      shadowColor="rgba(0,0,0,0.05)"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={1}
      shadowRadius={4}
      marginBottom="$3"
    >
      {/* Card header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        justifyContent="space-between"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        backgroundColor="$backgroundHover"
      >
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$4" fontWeight="700" color="#8B5CF6">{orderNumber}</Text>
        </XStack>
        <XStack alignItems="center" gap="$3">
          <XStack alignItems="center" gap="$1">
            <Clock size={12} color="$colorSecondary" />
            <Text fontSize={11} color="$colorSecondary">{getRelativeTime(order.createdAt)}</Text>
          </XStack>
          <OrderStatusBadge status={status} size="sm" pulse={status === 'pending'} />
        </XStack>
      </XStack>

      {/* Card body - clickable */}
      <YStack
        padding="$4"
        gap="$3"
        cursor="pointer"
        hoverStyle={{ backgroundColor: '$backgroundHover' }}
        pressStyle={{ opacity: 0.9 }}
        onPress={onView}
      >
        {/* Customer info */}
        <XStack alignItems="center" gap="$3">
          <YStack
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="#8B5CF620"
            alignItems="center"
            justifyContent="center"
          >
            <User size={20} color="#8B5CF6" />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$3" fontWeight="600" numberOfLines={1}>{customerName}</Text>
            {customerPhone && (
              <Text fontSize={12} color="$colorSecondary">{customerPhone}</Text>
            )}
          </YStack>
        </XStack>

        {/* Divider */}
        <YStack height={1} backgroundColor="$borderColor" marginVertical="$1" />

        {/* Items preview */}
        <XStack alignItems="flex-start" gap="$2">
          <ShoppingCart size={16} color="$colorSecondary" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize={12} color="$colorSecondary" marginBottom="$1">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
            {itemPreview.map((name, index) => (
              <Text key={index} fontSize={13} color="$color" numberOfLines={1}>
                • {name}
              </Text>
            ))}
            {moreItems > 0 && (
              <Text fontSize={12} color="$colorSecondary" fontStyle="italic">
                +{moreItems} more items
              </Text>
            )}
          </YStack>
        </XStack>

        {/* Divider */}
        <YStack height={1} backgroundColor="$borderColor" marginVertical="$1" />

        {/* Payment info */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            <PaymentIcon size={16} color="$colorSecondary" />
            <Text fontSize={12} color="$colorSecondary" textTransform="capitalize">
              {paymentMethod} Payment
            </Text>
          </XStack>
          <Text fontSize="$5" fontWeight="bold" color="$color">
            {formatCurrency(payment.total, currency)}
          </Text>
        </XStack>
      </YStack>

      {/* Action buttons */}
      {showActions && (
        <XStack
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$backgroundHover"
        >
          <YStack
            flex={1}
            paddingVertical="$3"
            alignItems="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$borderColor' }}
            pressStyle={{ opacity: 0.7 }}
            onPress={onView}
          >
            <XStack alignItems="center" gap="$2">
              <Eye size={16} color="#8B5CF6" />
              <Text fontSize={12} fontWeight="500" color="#8B5CF6">View</Text>
            </XStack>
          </YStack>

          <YStack width={1} backgroundColor="$borderColor" />

          <YStack
            flex={1}
            paddingVertical="$3"
            alignItems="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$borderColor' }}
            pressStyle={{ opacity: 0.7 }}
            onPress={onEdit}
          >
            <XStack alignItems="center" gap="$2">
              <Pencil size={16} color="$colorSecondary" />
              <Text fontSize={12} fontWeight="500" color="$colorSecondary">Edit</Text>
            </XStack>
          </YStack>

          <YStack width={1} backgroundColor="$borderColor" />

          <YStack
            flex={1}
            paddingVertical="$3"
            alignItems="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$borderColor' }}
            pressStyle={{ opacity: 0.7 }}
            onPress={onPrint}
          >
            <XStack alignItems="center" gap="$2">
              <Printer size={16} color="$colorSecondary" />
              <Text fontSize={12} fontWeight="500" color="$colorSecondary">Print</Text>
            </XStack>
          </YStack>

          <YStack width={1} backgroundColor="$borderColor" />

          <YStack
            flex={1}
            paddingVertical="$3"
            alignItems="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '$borderColor' }}
            pressStyle={{ opacity: 0.7 }}
            onPress={onMore}
          >
            <XStack alignItems="center" gap="$2">
              <MoreHorizontal size={16} color="$colorSecondary" />
              <Text fontSize={12} fontWeight="500" color="$colorSecondary">More</Text>
            </XStack>
          </YStack>
        </XStack>
      )}
    </YStack>
  );
}

export default OrderListCard;
