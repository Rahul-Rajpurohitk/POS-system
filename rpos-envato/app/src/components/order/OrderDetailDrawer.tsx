/**
 * OrderDetailDrawer - Order details with LIGHT theme (no dark backgrounds)
 * Matches Products page design consistency
 */

import React, { useState } from 'react';
import { ScrollView, Modal, Dimensions } from 'react-native';
import { XStack, YStack, Text, TextArea } from 'tamagui';
import {
  X, User, CreditCard, Banknote, Smartphone, CheckCircle, Package,
  MessageSquare, History, Printer, Mail, RefreshCw, Phone, Award, UserCheck,
} from '@tamagui/lucide-icons';
import { OrderStatusBadge, OrderStatus } from './OrderStatusBadge';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import type { Order, Currency } from '@/types';

// Light theme colors - explicit values, no dark mode
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    500: '#6B7280',
    700: '#374151',
    900: '#111827',
  }
};

export interface OrderDetailDrawerProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (status: OrderStatus) => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onRefund?: () => void;
  onAddNote?: (note: string) => void;
  currency: Currency;
}

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  digital: Smartphone,
};

const STATUS_STEPS: OrderStatus[] = ['pending', 'processing', 'completed'];

// Format date compactly
function formatCompactDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus as OrderStatus);

  return (
    <YStack
      gap="$2"
      padding="$4"
      backgroundColor="white"
      borderRadius="$3"
      borderWidth={1}
      borderColor={COLORS.gray[200]}
    >
      <Text fontSize={12} fontWeight="600" color={COLORS.gray[500]} marginBottom="$2">
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
                  backgroundColor={isCompleted ? COLORS.primary : COLORS.gray[200]}
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={isCurrent ? 3 : 0}
                  borderColor={isCurrent ? `${COLORS.primary}40` : 'transparent'}
                >
                  <CheckCircle size={16} color={isCompleted ? 'white' : COLORS.gray[500]} />
                </YStack>
                <Text
                  fontSize={10}
                  fontWeight={isCurrent ? '700' : '500'}
                  color={isCompleted ? COLORS.primary : COLORS.gray[500]}
                  textTransform="capitalize"
                >
                  {step}
                </Text>
              </YStack>
              {index < STATUS_STEPS.length - 1 && (
                <YStack
                  flex={1}
                  height={2}
                  backgroundColor={index < currentIndex ? COLORS.primary : COLORS.gray[200]}
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
      borderColor={COLORS.gray[200]}
      overflow="hidden"
    >
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        backgroundColor={COLORS.gray[50]}
        alignItems="center"
        gap="$2"
        borderBottomWidth={1}
        borderBottomColor={COLORS.gray[200]}
      >
        <Icon size={14} color={COLORS.primary} />
        <Text fontSize={12} fontWeight="600" color={COLORS.gray[500]} textTransform="uppercase">
          {title}
        </Text>
      </XStack>
      <YStack padding="$3" backgroundColor="white">{children}</YStack>
    </YStack>
  );
}

export function OrderDetailDrawer({
  order,
  open,
  onClose,
  onStatusChange,
  onPrint,
  onRefund,
  onAddNote,
  currency,
}: OrderDetailDrawerProps) {
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!order) return null;

  // Format order number properly - industry standard
  const rawNumber = order.number || order.orderNumber || order.id.slice(0, 6);
  const orderNumber = rawNumber.toString().startsWith('ORD') ? rawNumber : `ORD-${rawNumber}`;

  const payment = order.payment || {
    subTotal: order.subTotal || 0,
    discount: order.discount || 0,
    vat: order.tax || 0,
    total: order.total || 0
  };
  const customerName = order.customer?.name || order.guestName || 'Walk-in Customer';
  const customerEmail = order.customer?.email;
  const customerPhone = order.customer?.phone;
  const items = order.items || [];
  const status = (order.status || 'completed') as OrderStatus;
  const paymentMethod = (order as any).paymentMethod || 'cash';
  const PaymentIcon = PAYMENT_ICONS[paymentMethod] || CreditCard;
  const notes = (order as any).notes || [];
  const handledBy = (order as any).handledBy || (order as any).createdBy || 'System';

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote?.(newNote.trim());
      setNewNote('');
      setShowNoteInput(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = Math.min(500, screenWidth * 0.9);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <XStack flex={1} justifyContent="flex-end" backgroundColor="rgba(0,0,0,0.4)">
        <YStack
          width={drawerWidth}
          flex={1}
          backgroundColor={COLORS.gray[50]}
          shadowColor="rgba(0,0,0,0.15)"
          shadowOffset={{ width: -4, height: 0 }}
          shadowOpacity={1}
          shadowRadius={20}
        >
          {/* Header - Light background */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$4"
            justifyContent="space-between"
            alignItems="center"
            borderBottomWidth={1}
            borderBottomColor={COLORS.gray[200]}
            backgroundColor="white"
          >
            <YStack>
              <Text fontSize="$5" fontWeight="bold" color={COLORS.gray[900]}>
                {orderNumber}
              </Text>
              <Text fontSize={12} color={COLORS.gray[500]}>
                {formatCompactDate(order.createdAt)}
              </Text>
            </YStack>
            <XStack alignItems="center" gap="$3">
              <OrderStatusBadge status={status} size="md" />
              <YStack
                padding="$2"
                borderRadius="$2"
                backgroundColor={COLORS.gray[100]}
                cursor="pointer"
                hoverStyle={{ backgroundColor: COLORS.gray[200] }}
                onPress={onClose}
              >
                <X size={20} color={COLORS.gray[500]} />
              </YStack>
            </XStack>
          </XStack>

          {/* Scrollable content - Light gray background */}
          <ScrollView
            style={{ flex: 1, backgroundColor: COLORS.gray[50] }}
            showsVerticalScrollIndicator={false}
          >
            <YStack padding="$4" gap="$3">
              {/* Status Timeline */}
              <StatusTimeline currentStatus={status} />

              {/* Handled By */}
              <YStack
                backgroundColor="white"
                borderRadius="$3"
                borderWidth={1}
                borderColor={COLORS.gray[200]}
                padding="$3"
              >
                <XStack alignItems="center" gap="$2">
                  <YStack
                    width={28}
                    height={28}
                    borderRadius={14}
                    backgroundColor={`${COLORS.primary}15`}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <UserCheck size={14} color={COLORS.primary} />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={10} color={COLORS.gray[500]} textTransform="uppercase" fontWeight="600">
                      Handled By
                    </Text>
                    <Text fontSize={14} fontWeight="600" color={COLORS.gray[900]}>
                      {handledBy}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              {/* Customer & Payment cards row */}
              <XStack gap="$3">
                {/* Customer Info */}
                <YStack flex={1}>
                  <InfoCard title="Customer" icon={User}>
                    <Text fontSize={14} fontWeight="600" color={COLORS.gray[900]} marginBottom="$1">
                      {customerName}
                    </Text>
                    {customerEmail && (
                      <XStack alignItems="center" gap="$2" marginTop="$1">
                        <Mail size={12} color={COLORS.gray[500]} />
                        <Text fontSize={12} color={COLORS.gray[500]}>{customerEmail}</Text>
                      </XStack>
                    )}
                    {customerPhone && (
                      <XStack alignItems="center" gap="$2" marginTop="$1">
                        <Phone size={12} color={COLORS.gray[500]} />
                        <Text fontSize={12} color={COLORS.gray[500]}>{customerPhone}</Text>
                      </XStack>
                    )}
                    {order.customer && (
                      <XStack alignItems="center" gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor={COLORS.gray[200]}>
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
                      <Text fontSize={14} fontWeight="600" color={COLORS.gray[900]} textTransform="capitalize">
                        {paymentMethod}
                      </Text>
                    </XStack>
                    <Text fontSize={11} color={COLORS.gray[500]}>
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
                    borderBottomColor={COLORS.gray[200]}
                  >
                    <YStack flex={1}>
                      <Text fontSize={14} fontWeight="500" color={COLORS.gray[900]} numberOfLines={1}>
                        {item.product?.name || item.name || 'Product'}
                      </Text>
                      <Text fontSize={11} color={COLORS.gray[500]}>
                        {formatCurrency(item.price || item.unitPrice || 0, currency)} × {item.quantity}
                      </Text>
                    </YStack>
                    <Text fontSize={14} fontWeight="600" color={COLORS.gray[900]}>
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
                borderColor={COLORS.gray[200]}
                padding="$4"
                gap="$2"
              >
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color={COLORS.gray[500]}>Subtotal</Text>
                  <Text fontSize={13} color={COLORS.gray[900]}>{formatCurrency(payment.subTotal, currency)}</Text>
                </XStack>
                {payment.discount > 0 && (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color={COLORS.success}>Discount</Text>
                    <Text fontSize={13} color={COLORS.success}>-{formatCurrency(payment.discount, currency)}</Text>
                  </XStack>
                )}
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color={COLORS.gray[500]}>Tax</Text>
                  <Text fontSize={13} color={COLORS.gray[900]}>{formatCurrency(payment.vat || 0, currency)}</Text>
                </XStack>
                <YStack height={1} backgroundColor={COLORS.gray[200]} marginVertical="$2" />
                <XStack justifyContent="space-between">
                  <Text fontSize={16} fontWeight="bold" color={COLORS.gray[900]}>Total</Text>
                  <Text fontSize={16} fontWeight="bold" color={COLORS.primary}>
                    {formatCurrency(payment.total, currency)}
                  </Text>
                </XStack>
              </YStack>

              {/* Notes Section */}
              <InfoCard title="Notes" icon={MessageSquare}>
                {notes.length === 0 && !showNoteInput && (
                  <Text fontSize={12} color={COLORS.gray[500]} fontStyle="italic">No notes yet</Text>
                )}
                {notes.map((note: any, index: number) => (
                  <YStack key={index} marginBottom="$2">
                    <Text fontSize={13} color={COLORS.gray[900]}>{note.text}</Text>
                    <Text fontSize={10} color={COLORS.gray[500]} marginTop="$1">
                      {note.author} • {formatCompactDate(note.createdAt)}
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
                      borderColor={COLORS.gray[300]}
                      backgroundColor="white"
                      color={COLORS.gray[900]}
                    />
                    <XStack gap="$2">
                      <Button size="sm" variant="secondary" onPress={() => setShowNoteInput(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onPress={handleAddNote}>
                        Add Note
                      </Button>
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
                      <Text fontSize={12} color={COLORS.gray[900]}>Order created</Text>
                      <Text fontSize={10} color={COLORS.gray[500]}>
                        {formatCompactDate(order.createdAt)} • {handledBy}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
              </InfoCard>
            </YStack>
          </ScrollView>

          {/* Footer actions - Light background */}
          <XStack
            padding="$4"
            gap="$3"
            borderTopWidth={1}
            borderTopColor={COLORS.gray[200]}
            backgroundColor="white"
          >
            <Button
              flex={1}
              variant="secondary"
              onPress={onPrint}
              icon={<Printer size={16} />}
            >
              Print
            </Button>
            {status === 'pending' && onStatusChange && (
              <Button
                flex={2}
                onPress={() => onStatusChange('completed')}
                icon={<CheckCircle size={16} />}
              >
                Complete Order
              </Button>
            )}
            {status === 'completed' && onRefund && (
              <Button
                flex={2}
                variant="secondary"
                onPress={onRefund}
                icon={<RefreshCw size={16} />}
              >
                Process Refund
              </Button>
            )}
          </XStack>
        </YStack>
      </XStack>
    </Modal>
  );
}

export default OrderDetailDrawer;
