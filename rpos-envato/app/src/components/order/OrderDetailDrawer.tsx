/**
 * OrderDetailDrawer - Comprehensive order detail view with actions
 * Updated for UI consistency with Products page
 */

import React, { useState } from 'react';
import { ScrollView, Modal, Dimensions } from 'react-native';
import { XStack, YStack, Text, TextArea } from 'tamagui';
import {
  X, User, CreditCard, Banknote, Smartphone, Clock, CheckCircle, Package,
  MessageSquare, History, Printer, Mail, RefreshCw, Phone, Award, ArrowLeftRight,
  DollarSign, Pencil,
} from '@tamagui/lucide-icons';
import { OrderStatusBadge, OrderStatus } from './OrderStatusBadge';
import { formatCurrency, formatDate } from '@/utils';
import type { Order, Currency } from '@/types';

// Consistent color scheme matching Products page
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
  gray: '#6B7280',
};

export interface OrderDetailDrawerProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (status: OrderStatus) => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onRefund?: () => void;
  onExchange?: () => void;
  onAddPayment?: () => void;  // For OPEN orders - navigate to payment screen
  onEditOrder?: () => void;   // For OPEN orders - load order in POS to continue editing
  onAddNote?: (note: string) => void;
  currency: Currency;
}

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  digital: Smartphone,
};

const STATUS_STEPS: OrderStatus[] = ['pending', 'processing', 'completed'];

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus as OrderStatus);

  return (
    <YStack
      gap="$2"
      padding="$4"
      backgroundColor="white"
      borderRadius="$3"
      borderWidth={1}
      borderColor="#E5E7EB"
    >
      <Text fontSize={12} fontWeight="600" color="#6B7280" marginBottom="$2">
        ORDER STATUS
      </Text>
      <XStack alignItems="center" justifyContent="space-between">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={step}>
              <YStack alignItems="center" gap="$1">
                <YStack
                  width={32}
                  height={32}
                  borderRadius={16}
                  backgroundColor={isCompleted ? COLORS.primary : '#E5E7EB'}
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={isCurrent ? 3 : 0}
                  borderColor={isCurrent ? `${COLORS.primary}40` : 'transparent'}
                >
                  <CheckCircle size={16} color={isCompleted ? 'white' : '#9CA3AF'} />
                </YStack>
                <Text
                  fontSize={10}
                  fontWeight={isCurrent ? '700' : '500'}
                  color={isCompleted ? COLORS.primary : '#6B7280'}
                  textTransform="capitalize"
                >
                  {step}
                </Text>
              </YStack>
              {index < STATUS_STEPS.length - 1 && (
                <YStack
                  flex={1}
                  height={2}
                  backgroundColor={index < currentIndex ? COLORS.primary : '#E5E7EB'}
                  marginHorizontal="$2"
                />
              )}
            </React.Fragment>
          );
        })}
      </XStack>
    </YStack>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <YStack
      backgroundColor="white"
      borderRadius="$3"
      borderWidth={1}
      borderColor="#E5E7EB"
      overflow="hidden"
    >
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        backgroundColor="#F9FAFB"
        alignItems="center"
        gap="$2"
      >
        <Icon size={14} color={COLORS.primary} />
        <Text fontSize={12} fontWeight="600" color="#6B7280" textTransform="uppercase">
          {title}
        </Text>
      </XStack>
      <YStack padding="$3">{children}</YStack>
    </YStack>
  );
}

export function OrderDetailDrawer({
  order,
  open,
  onClose,
  onStatusChange,
  onEdit,
  onPrint,
  onRefund,
  onExchange,
  onAddPayment,
  onEditOrder,
  onAddNote,
  currency,
}: OrderDetailDrawerProps) {
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!order) return null;

  const orderNumber = order.number || order.orderNumber || `#${order.id.slice(0, 6)}`;
  const payment = order.payment || { subTotal: order.subTotal || 0, discount: order.discount || 0, vat: order.tax || 0, total: order.total || 0 };
  const customerName = order.customer?.name || order.guestName || 'Walk-in Customer';
  const customerEmail = order.customer?.email;
  const customerPhone = order.customer?.phone;
  const items = order.items || [];
  const status = (order.status || 'completed') as OrderStatus;
  const paymentMethod = (order as any).paymentMethod || 'cash';
  const PaymentIcon = PAYMENT_ICONS[paymentMethod] || CreditCard;
  const notes = (order as any).notes || [];

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote?.(newNote.trim());
      setNewNote('');
      setShowNoteInput(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = Math.min(480, screenWidth * 0.9);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <XStack flex={1} justifyContent="flex-end" backgroundColor="rgba(0,0,0,0.5)">
        <YStack
          width={drawerWidth}
          flex={1}
          backgroundColor="white"
          shadowColor="rgba(0,0,0,0.2)"
          shadowOffset={{ width: -4, height: 0 }}
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
            backgroundColor="#F9FAFB"
          >
            <YStack>
              <Text fontSize="$5" fontWeight="bold" color="#111827">Order {orderNumber}</Text>
              <Text fontSize={12} color="#6B7280">
                {formatDate(order.createdAt, 'MMM d, yyyy h:mm a')}
              </Text>
            </YStack>
            <XStack alignItems="center" gap="$3">
              <OrderStatusBadge status={status} size="md" />
              <YStack
                padding="$2"
                borderRadius="$2"
                backgroundColor="#F3F4F6"
                cursor="pointer"
                hoverStyle={{ backgroundColor: '#E5E7EB' }}
                onPress={onClose}
              >
                <X size={20} color="#6B7280" />
              </YStack>
            </XStack>
          </XStack>

          {/* Scrollable content */}
          <ScrollView
            style={{ flex: 1, backgroundColor: '#F9FAFB' }}
            showsVerticalScrollIndicator={false}
          >
            <YStack padding="$4" gap="$4">
              {/* Status Timeline */}
              <StatusTimeline currentStatus={status} />

              {/* Customer & Payment cards row */}
              <XStack gap="$3">
                {/* Customer Info */}
                <YStack flex={1}>
                  <InfoCard title="Customer" icon={User}>
                    <Text fontSize="$3" fontWeight="600" color="#111827" marginBottom="$1">{customerName}</Text>
                    {customerEmail && (
                      <XStack alignItems="center" gap="$2" marginTop="$1">
                        <Mail size={12} color="#6B7280" />
                        <Text fontSize={12} color="#6B7280">{customerEmail}</Text>
                      </XStack>
                    )}
                    {customerPhone && (
                      <XStack alignItems="center" gap="$2" marginTop="$1">
                        <Phone size={12} color="#6B7280" />
                        <Text fontSize={12} color="#6B7280">{customerPhone}</Text>
                      </XStack>
                    )}
                    {order.customer && (
                      <XStack alignItems="center" gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#E5E7EB">
                        <Award size={14} color={COLORS.primary} />
                        <Text fontSize={11} color={COLORS.primary} fontWeight="500">Loyalty Member</Text>
                      </XStack>
                    )}
                  </InfoCard>
                </YStack>

                {/* Payment Info */}
                <YStack flex={1}>
                  <InfoCard title="Payment" icon={CreditCard}>
                    <XStack alignItems="center" gap="$2" marginBottom="$2">
                      <PaymentIcon size={18} color={COLORS.primary} />
                      <Text fontSize="$3" fontWeight="600" color="#111827" textTransform="capitalize">{paymentMethod}</Text>
                    </XStack>
                    <Text fontSize={11} color="#6B7280">
                      Status: <Text color={COLORS.success} fontWeight="500">Paid</Text>
                    </Text>
                    {onRefund && status === 'completed' && (
                      <Text
                        fontSize={11}
                        color={COLORS.primary}
                        marginTop="$2"
                        cursor="pointer"
                        onPress={onRefund}
                      >
                        Process Refund
                      </Text>
                    )}
                  </InfoCard>
                </YStack>
              </XStack>

              {/* Order Items */}
              <InfoCard title="Order Items" icon={Package}>
                {items.map((item: any, index: number) => (
                  <XStack
                    key={item.id || index}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$2"
                    borderBottomWidth={index < items.length - 1 ? 1 : 0}
                    borderBottomColor="#E5E7EB"
                  >
                    <YStack flex={1}>
                      <Text fontSize="$3" fontWeight="500" color="#111827" numberOfLines={1}>
                        {item.product?.name || item.name || 'Product'}
                      </Text>
                      <Text fontSize={11} color="#6B7280">
                        {formatCurrency(item.price || item.unitPrice || 0, currency)} × {item.quantity}
                      </Text>
                    </YStack>
                    <Text fontSize="$3" fontWeight="600" color="#111827">
                      {formatCurrency((item.price || item.unitPrice || 0) * (item.quantity || 1), currency)}
                    </Text>
                  </XStack>
                ))}
              </InfoCard>

              {/* Payment Summary */}
              <YStack
                backgroundColor="white"
                borderRadius="$3"
                borderWidth={1}
                borderColor="#E5E7EB"
                padding="$4"
                gap="$2"
              >
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#6B7280">Subtotal</Text>
                  <Text fontSize={13} color="#111827">{formatCurrency(payment.subTotal, currency)}</Text>
                </XStack>
                {payment.discount > 0 && (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color={COLORS.success}>Discount</Text>
                    <Text fontSize={13} color={COLORS.success}>-{formatCurrency(payment.discount, currency)}</Text>
                  </XStack>
                )}
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#6B7280">Tax</Text>
                  <Text fontSize={13} color="#111827">{formatCurrency(payment.vat || 0, currency)}</Text>
                </XStack>
                <YStack height={1} backgroundColor="#E5E7EB" marginVertical="$2" />
                <XStack justifyContent="space-between">
                  <Text fontSize="$4" fontWeight="bold" color="#111827">Total</Text>
                  <Text fontSize="$4" fontWeight="bold" color={COLORS.primary}>
                    {formatCurrency(payment.total, currency)}
                  </Text>
                </XStack>
              </YStack>

              {/* Notes Section */}
              <InfoCard title="Notes" icon={MessageSquare}>
                {notes.length === 0 && !showNoteInput && (
                  <Text fontSize={12} color="#9CA3AF" fontStyle="italic">No notes yet</Text>
                )}
                {notes.map((note: any, index: number) => (
                  <YStack key={index} marginBottom="$2">
                    <Text fontSize={13} color="#111827">{note.text}</Text>
                    <Text fontSize={10} color="#9CA3AF" marginTop="$1">
                      {note.author} • {formatDate(note.createdAt, 'MMM d, h:mm a')}
                    </Text>
                  </YStack>
                ))}
                {showNoteInput ? (
                  <YStack gap="$2" marginTop="$2">
                    <TextArea
                      value={newNote}
                      onChangeText={setNewNote}
                      placeholder="Add a note..."
                      minHeight={80}
                      borderColor="#D1D5DB"
                      backgroundColor="white"
                    />
                    <XStack gap="$2">
                      <XStack
                        paddingVertical="$2"
                        paddingHorizontal="$3"
                        borderRadius="$2"
                        backgroundColor="white"
                        borderWidth={1}
                        borderColor="#D1D5DB"
                        cursor="pointer"
                        hoverStyle={{ backgroundColor: '#F9FAFB' }}
                        onPress={() => setShowNoteInput(false)}
                      >
                        <Text fontSize={13} color="#374151">Cancel</Text>
                      </XStack>
                      <XStack
                        paddingVertical="$2"
                        paddingHorizontal="$3"
                        borderRadius="$2"
                        backgroundColor={COLORS.primary}
                        cursor="pointer"
                        hoverStyle={{ opacity: 0.9 }}
                        onPress={handleAddNote}
                      >
                        <Text fontSize={13} fontWeight="500" color="white">Add Note</Text>
                      </XStack>
                    </XStack>
                  </YStack>
                ) : (
                  <Text
                    fontSize={12}
                    color={COLORS.primary}
                    marginTop="$2"
                    cursor="pointer"
                    onPress={() => setShowNoteInput(true)}
                  >
                    + Add Note
                  </Text>
                )}
              </InfoCard>

              {/* Activity Log */}
              <InfoCard title="Activity" icon={History}>
                <YStack gap="$2">
                  <XStack alignItems="flex-start" gap="$2">
                    <YStack width={6} height={6} borderRadius={3} backgroundColor={COLORS.primary} marginTop={6} />
                    <YStack flex={1}>
                      <Text fontSize={12} color="#111827">Order created</Text>
                      <Text fontSize={10} color="#9CA3AF">
                        {formatDate(order.createdAt, 'MMM d, h:mm a')} • System
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
              </InfoCard>
            </YStack>
          </ScrollView>

          {/* Footer actions */}
          <XStack
            padding="$4"
            gap="$3"
            borderTopWidth={1}
            borderTopColor="#E5E7EB"
            backgroundColor="white"
          >
            <XStack
              flex={1}
              paddingVertical="$2.5"
              paddingHorizontal="$3"
              borderRadius="$3"
              backgroundColor="white"
              borderWidth={1}
              borderColor="#D1D5DB"
              alignItems="center"
              justifyContent="center"
              gap="$2"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#F9FAFB' }}
              pressStyle={{ opacity: 0.9 }}
              onPress={onPrint}
            >
              <Printer size={16} color="#6B7280" />
              <Text fontSize={14} fontWeight="500" color="#374151">Print</Text>
            </XStack>
            {/* OPEN order actions - Add Payment & Edit Order */}
            {status === 'open' && (
              <>
                {onEditOrder && (
                  <XStack
                    flex={1}
                    paddingVertical="$2.5"
                    paddingHorizontal="$3"
                    borderRadius="$3"
                    backgroundColor="white"
                    borderWidth={1}
                    borderColor="#D1D5DB"
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }}
                    pressStyle={{ opacity: 0.9 }}
                    onPress={onEditOrder}
                  >
                    <Pencil size={16} color={COLORS.primary} />
                    <Text fontSize={13} fontWeight="500" color={COLORS.primary}>Edit</Text>
                  </XStack>
                )}
                {onAddPayment && (
                  <XStack
                    flex={2}
                    paddingVertical="$2.5"
                    paddingHorizontal="$3"
                    borderRadius="$3"
                    backgroundColor={COLORS.success}
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                    cursor="pointer"
                    hoverStyle={{ opacity: 0.9 }}
                    pressStyle={{ opacity: 0.85 }}
                    onPress={onAddPayment}
                  >
                    <DollarSign size={16} color="white" />
                    <Text fontSize={14} fontWeight="600" color="white">Add Payment</Text>
                  </XStack>
                )}
              </>
            )}
            {status === 'pending' && onStatusChange && (
              <XStack
                flex={2}
                paddingVertical="$2.5"
                paddingHorizontal="$3"
                borderRadius="$3"
                backgroundColor={COLORS.success}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                cursor="pointer"
                hoverStyle={{ opacity: 0.9 }}
                pressStyle={{ opacity: 0.85 }}
                onPress={() => onStatusChange('completed')}
              >
                <CheckCircle size={16} color="white" />
                <Text fontSize={14} fontWeight="600" color="white">Complete Order</Text>
              </XStack>
            )}
            {status === 'completed' && (onRefund || onExchange) && (
              <>
                {onExchange && (
                  <XStack
                    flex={1}
                    paddingVertical="$2.5"
                    paddingHorizontal="$3"
                    borderRadius="$3"
                    backgroundColor="white"
                    borderWidth={1}
                    borderColor="#D1D5DB"
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }}
                    pressStyle={{ opacity: 0.9 }}
                    onPress={onExchange}
                  >
                    <ArrowLeftRight size={16} color="#10B981" />
                    <Text fontSize={13} fontWeight="500" color="#10B981">Exchange</Text>
                  </XStack>
                )}
                {onRefund && (
                  <XStack
                    flex={1}
                    paddingVertical="$2.5"
                    paddingHorizontal="$3"
                    borderRadius="$3"
                    backgroundColor="white"
                    borderWidth={1}
                    borderColor="#D1D5DB"
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }}
                    pressStyle={{ opacity: 0.9 }}
                    onPress={onRefund}
                  >
                    <RefreshCw size={16} color="#DC2626" />
                    <Text fontSize={13} fontWeight="500" color="#DC2626">Refund</Text>
                  </XStack>
                )}
              </>
            )}
          </XStack>
        </YStack>
      </XStack>
    </Modal>
  );
}

export default OrderDetailDrawer;
