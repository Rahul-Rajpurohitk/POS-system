/**
 * OrderDetailDrawer - Comprehensive order detail view with actions
 */

import React, { useState } from 'react';
import { ScrollView, Modal, Dimensions } from 'react-native';
import { XStack, YStack, Text, TextArea } from 'tamagui';
import {
  X, User, CreditCard, Banknote, Smartphone, Clock, CheckCircle, Package,
  MessageSquare, History, Printer, Mail, MessageCircle, RefreshCw, Pencil,
  Phone, MapPin, Award,
} from '@tamagui/lucide-icons';
import { OrderStatusBadge, OrderStatus } from './OrderStatusBadge';
import { Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';
import type { Order, Currency } from '@/types';

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

function StatusTimeline({ currentStatus, history }: { currentStatus: string; history?: any[] }) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus as OrderStatus);

  return (
    <YStack gap="$2" padding="$4" backgroundColor="$backgroundHover" borderRadius="$3">
      <Text fontSize={12} fontWeight="600" color="$colorSecondary" marginBottom="$2">
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
                  backgroundColor={isCompleted ? '#8B5CF6' : '$borderColor'}
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={isCurrent ? 3 : 0}
                  borderColor={isCurrent ? '#8B5CF640' : 'transparent'}
                >
                  <CheckCircle size={16} color={isCompleted ? 'white' : '$colorSecondary'} />
                </YStack>
                <Text
                  fontSize={10}
                  fontWeight={isCurrent ? '700' : '500'}
                  color={isCompleted ? '#8B5CF6' : '$colorSecondary'}
                  textTransform="capitalize"
                >
                  {step}
                </Text>
              </YStack>
              {index < STATUS_STEPS.length - 1 && (
                <YStack
                  flex={1}
                  height={2}
                  backgroundColor={index < currentIndex ? '#8B5CF6' : '$borderColor'}
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
      backgroundColor="$cardBackground"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
    >
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        backgroundColor="$backgroundHover"
        alignItems="center"
        gap="$2"
      >
        <Icon size={14} color="#8B5CF6" />
        <Text fontSize={12} fontWeight="600" color="$colorSecondary" textTransform="uppercase">
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
          backgroundColor="$background"
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
            borderBottomColor="$borderColor"
            backgroundColor="$cardBackground"
          >
            <YStack>
              <Text fontSize="$5" fontWeight="bold">Order {orderNumber}</Text>
              <Text fontSize={12} color="$colorSecondary">
                {formatDate(order.createdAt, 'MMM d, yyyy h:mm a')}
              </Text>
            </YStack>
            <XStack alignItems="center" gap="$3">
              <OrderStatusBadge status={status} size="md" />
              <YStack
                padding="$2"
                borderRadius="$2"
                backgroundColor="$backgroundHover"
                cursor="pointer"
                hoverStyle={{ backgroundColor: '$borderColor' }}
                onPress={onClose}
              >
                <X size={20} color="$colorSecondary" />
              </YStack>
            </XStack>
          </XStack>

          {/* Scrollable content */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <YStack padding="$4" gap="$4">
              {/* Status Timeline */}
              <StatusTimeline currentStatus={status} />

              {/* Customer & Payment cards row */}
              <XStack gap="$3">
                {/* Customer Info */}
                <YStack flex={1}>
                  <InfoCard title="Customer" icon={User}>
                    <Text fontSize="$3" fontWeight="600" marginBottom="$1">{customerName}</Text>
                    {customerEmail && (
                      <XStack alignItems="center" gap="$2" marginTop="$1">
                        <Mail size={12} color="$colorSecondary" />
                        <Text fontSize={12} color="$colorSecondary">{customerEmail}</Text>
                      </XStack>
                    )}
                    {customerPhone && (
                      <XStack alignItems="center" gap="$2" marginTop="$1">
                        <Phone size={12} color="$colorSecondary" />
                        <Text fontSize={12} color="$colorSecondary">{customerPhone}</Text>
                      </XStack>
                    )}
                    {order.customer && (
                      <XStack alignItems="center" gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="$borderColor">
                        <Award size={14} color="#8B5CF6" />
                        <Text fontSize={11} color="#8B5CF6" fontWeight="500">Loyalty Member</Text>
                      </XStack>
                    )}
                  </InfoCard>
                </YStack>

                {/* Payment Info */}
                <YStack flex={1}>
                  <InfoCard title="Payment" icon={CreditCard}>
                    <XStack alignItems="center" gap="$2" marginBottom="$2">
                      <PaymentIcon size={18} color="#8B5CF6" />
                      <Text fontSize="$3" fontWeight="600" textTransform="capitalize">{paymentMethod}</Text>
                    </XStack>
                    <Text fontSize={11} color="$colorSecondary">
                      Status: <Text color="#10B981" fontWeight="500">Paid</Text>
                    </Text>
                    {onRefund && status === 'completed' && (
                      <Text
                        fontSize={11}
                        color="#8B5CF6"
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
                    borderBottomColor="$borderColor"
                  >
                    <YStack flex={1}>
                      <Text fontSize="$3" fontWeight="500" numberOfLines={1}>
                        {item.product?.name || item.name || 'Product'}
                      </Text>
                      <Text fontSize={11} color="$colorSecondary">
                        {formatCurrency(item.price || item.unitPrice || 0, currency)} × {item.quantity}
                      </Text>
                    </YStack>
                    <Text fontSize="$3" fontWeight="600">
                      {formatCurrency((item.price || item.unitPrice || 0) * (item.quantity || 1), currency)}
                    </Text>
                  </XStack>
                ))}
              </InfoCard>

              {/* Payment Summary */}
              <YStack
                backgroundColor="$cardBackground"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$borderColor"
                padding="$4"
                gap="$2"
              >
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="$colorSecondary">Subtotal</Text>
                  <Text fontSize={13}>{formatCurrency(payment.subTotal, currency)}</Text>
                </XStack>
                {payment.discount > 0 && (
                  <XStack justifyContent="space-between">
                    <Text fontSize={13} color="#10B981">Discount</Text>
                    <Text fontSize={13} color="#10B981">-{formatCurrency(payment.discount, currency)}</Text>
                  </XStack>
                )}
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="$colorSecondary">Tax</Text>
                  <Text fontSize={13}>{formatCurrency(payment.vat || 0, currency)}</Text>
                </XStack>
                <YStack height={1} backgroundColor="$borderColor" marginVertical="$2" />
                <XStack justifyContent="space-between">
                  <Text fontSize="$4" fontWeight="bold">Total</Text>
                  <Text fontSize="$4" fontWeight="bold" color="#8B5CF6">
                    {formatCurrency(payment.total, currency)}
                  </Text>
                </XStack>
              </YStack>

              {/* Notes Section */}
              <InfoCard title="Notes" icon={MessageSquare}>
                {notes.length === 0 && !showNoteInput && (
                  <Text fontSize={12} color="$colorSecondary" fontStyle="italic">No notes yet</Text>
                )}
                {notes.map((note: any, index: number) => (
                  <YStack key={index} marginBottom="$2">
                    <Text fontSize={13}>{note.text}</Text>
                    <Text fontSize={10} color="$colorSecondary" marginTop="$1">
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
                      borderColor="$borderColor"
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
                    color="#8B5CF6"
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
                    <YStack width={6} height={6} borderRadius={3} backgroundColor="#8B5CF6" marginTop={6} />
                    <YStack flex={1}>
                      <Text fontSize={12}>Order created</Text>
                      <Text fontSize={10} color="$colorSecondary">
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
            borderTopColor="$borderColor"
            backgroundColor="$cardBackground"
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
