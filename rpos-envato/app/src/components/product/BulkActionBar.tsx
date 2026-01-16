import React, { useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  X, CheckSquare, Square, Layers, Percent, Trash2, AlertTriangle,
  Check, ChevronDown,
} from '@tamagui/lucide-icons';
import { Button } from '@/components/ui';
import type { Product, Category } from '@/types';

// Professional blue theme instead of bright purple
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface BulkActionBarProps {
  selectedIds: string[];
  products: Product[];
  categories: Category[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkUpdateCategory: (categoryId: string) => Promise<void>;
  onBulkAdjustPrice: (adjustmentType: 'increase' | 'decrease', percentage: number) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  allSelected: boolean;
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = 'default',
  isLoading,
}: ConfirmModalProps) {
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center">
        <YStack
          backgroundColor="$cardBackground"
          borderRadius="$4"
          padding="$5"
          width={400}
          maxWidth="90%"
          gap="$4"
        >
          <XStack alignItems="center" gap="$2">
            {variant === 'danger' && <AlertTriangle size={24} color={COLORS.error} />}
            <Text fontSize="$5" fontWeight="bold" color="$color">{title}</Text>
          </XStack>

          <Text fontSize="$3" color="$colorSecondary">{message}</Text>

          <XStack gap="$3" justifyContent="flex-end">
            <Button variant="secondary" onPress={onClose} disabled={isLoading}>
              <Text>Cancel</Text>
            </Button>
            <YStack
              backgroundColor={variant === 'danger' ? COLORS.error : COLORS.primary}
              borderRadius="$3"
              paddingHorizontal="$4"
              paddingVertical="$2"
              cursor="pointer"
              opacity={isLoading ? 0.7 : 1}
              hoverStyle={{ opacity: 0.9 }}
              onPress={onConfirm}
            >
              <Text color="white" fontWeight="600">{isLoading ? 'Processing...' : confirmLabel}</Text>
            </YStack>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}

export function BulkActionBar({
  selectedIds,
  products,
  categories,
  onSelectAll,
  onClearSelection,
  onBulkUpdateCategory,
  onBulkAdjustPrice,
  onBulkDelete,
  allSelected,
}: BulkActionBarProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceAdjustment, setPriceAdjustment] = useState({ type: 'increase' as 'increase' | 'decrease', percentage: 10 });
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedIds.length;
  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  if (selectedCount === 0) return null;

  const handleCategoryUpdate = async () => {
    if (!selectedCategory) return;
    setIsProcessing(true);
    try {
      await onBulkUpdateCategory(selectedCategory);
      setShowCategoryModal(false);
      setSelectedCategory('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriceAdjust = async () => {
    setIsProcessing(true);
    try {
      await onBulkAdjustPrice(priceAdjustment.type, priceAdjustment.percentage);
      setShowPriceModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete();
      setShowDeleteModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <XStack
        backgroundColor="$cardBackground"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        gap="$4"
      >
        {/* Selection Info */}
        <XStack alignItems="center" gap="$2">
          <YStack
            padding="$1"
            borderRadius="$1"
            cursor="pointer"
            onPress={allSelected ? onClearSelection : onSelectAll}
          >
            {allSelected ? (
              <CheckSquare size={20} color={COLORS.primary} />
            ) : (
              <Square size={20} color={COLORS.primary} />
            )}
          </YStack>
          <Text color={COLORS.primary} fontWeight="600">
            {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
          </Text>
        </XStack>

        {/* Divider */}
        <YStack width={1} height={24} backgroundColor="$borderColor" />

        {/* Actions */}
        <XStack flex={1} gap="$2">
          {/* Update Category */}
          <XStack
            backgroundColor={COLORS.primary}
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            onPress={() => setShowCategoryModal(true)}
          >
            <Layers size={16} color="white" />
            <Text fontSize={12} color="white" fontWeight="500">Update Category</Text>
          </XStack>

          {/* Adjust Price */}
          <XStack
            backgroundColor={COLORS.primary}
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            onPress={() => setShowPriceModal(true)}
          >
            <Percent size={16} color="white" />
            <Text fontSize={12} color="white" fontWeight="500">Adjust Price</Text>
          </XStack>

          {/* Delete */}
          <XStack
            backgroundColor={COLORS.error}
            borderRadius="$2"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
            cursor="pointer"
            hoverStyle={{ opacity: 0.9 }}
            onPress={() => setShowDeleteModal(true)}
          >
            <Trash2 size={16} color="white" />
            <Text fontSize={12} color="white" fontWeight="500">Delete</Text>
          </XStack>
        </XStack>

        {/* Clear Selection */}
        <YStack
          padding="$2"
          borderRadius="$2"
          backgroundColor="$backgroundHover"
          cursor="pointer"
          hoverStyle={{ backgroundColor: '$backgroundPress' }}
          onPress={onClearSelection}
        >
          <X size={18} color="$colorSecondary" />
        </YStack>
      </XStack>

      {/* Category Update Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade" onRequestClose={() => setShowCategoryModal(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center">
          <YStack
            backgroundColor="$cardBackground"
            borderRadius="$4"
            padding="$5"
            width={400}
            maxWidth="90%"
            gap="$4"
          >
            <Text fontSize="$5" fontWeight="bold" color="$color">Update Category</Text>
            <Text fontSize="$3" color="$colorSecondary">
              Select a category to apply to {selectedCount} product{selectedCount !== 1 ? 's' : ''}:
            </Text>

            <YStack gap="$2">
              {(Array.isArray(categories) ? categories : []).map((cat) => (
                <XStack
                  key={cat.id}
                  backgroundColor={selectedCategory === cat.id ? '$backgroundHover' : 'transparent'}
                  borderWidth={1}
                  borderColor={selectedCategory === cat.id ? COLORS.primary : '$borderColor'}
                  borderRadius="$2"
                  padding="$3"
                  alignItems="center"
                  gap="$2"
                  cursor="pointer"
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <YStack
                    width={16}
                    height={16}
                    borderRadius={8}
                    backgroundColor={cat.color || '#6B7280'}
                  />
                  <Text fontSize="$3" color="$color" flex={1}>{cat.name}</Text>
                  {selectedCategory === cat.id && <Check size={16} color={COLORS.primary} />}
                </XStack>
              ))}
            </YStack>

            <XStack gap="$3" justifyContent="flex-end">
              <Button variant="secondary" onPress={() => setShowCategoryModal(false)}>
                <Text>Cancel</Text>
              </Button>
              <YStack
                backgroundColor={selectedCategory ? COLORS.primary : '$borderColor'}
                borderRadius="$3"
                paddingHorizontal="$4"
                paddingVertical="$2"
                cursor={selectedCategory ? 'pointer' : 'not-allowed'}
                opacity={isProcessing ? 0.7 : 1}
                onPress={selectedCategory ? handleCategoryUpdate : undefined}
              >
                <Text color="white" fontWeight="600">
                  {isProcessing ? 'Updating...' : 'Apply'}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </Modal>

      {/* Price Adjustment Modal */}
      <Modal visible={showPriceModal} transparent animationType="fade" onRequestClose={() => setShowPriceModal(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="center" alignItems="center">
          <YStack
            backgroundColor="$cardBackground"
            borderRadius="$4"
            padding="$5"
            width={400}
            maxWidth="90%"
            gap="$4"
          >
            <Text fontSize="$5" fontWeight="bold" color="$color">Adjust Price</Text>
            <Text fontSize="$3" color="$colorSecondary">
              Adjust prices for {selectedCount} product{selectedCount !== 1 ? 's' : ''}:
            </Text>

            {/* Type Toggle */}
            <XStack gap="$2">
              <YStack
                flex={1}
                backgroundColor={priceAdjustment.type === 'increase' ? COLORS.success : '$backgroundHover'}
                borderRadius="$2"
                padding="$3"
                alignItems="center"
                cursor="pointer"
                onPress={() => setPriceAdjustment({ ...priceAdjustment, type: 'increase' })}
              >
                <Text
                  fontSize="$3"
                  fontWeight="600"
                  color={priceAdjustment.type === 'increase' ? 'white' : '$color'}
                >
                  Increase
                </Text>
              </YStack>
              <YStack
                flex={1}
                backgroundColor={priceAdjustment.type === 'decrease' ? COLORS.error : '$backgroundHover'}
                borderRadius="$2"
                padding="$3"
                alignItems="center"
                cursor="pointer"
                onPress={() => setPriceAdjustment({ ...priceAdjustment, type: 'decrease' })}
              >
                <Text
                  fontSize="$3"
                  fontWeight="600"
                  color={priceAdjustment.type === 'decrease' ? 'white' : '$color'}
                >
                  Decrease
                </Text>
              </YStack>
            </XStack>

            {/* Percentage Input */}
            <YStack gap="$2">
              <Text fontSize={12} color="$colorSecondary">Percentage</Text>
              <XStack alignItems="center" gap="$2">
                <Input
                  flex={1}
                  value={priceAdjustment.percentage.toString()}
                  onChangeText={(text) => setPriceAdjustment({ ...priceAdjustment, percentage: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$2"
                  size="$4"
                />
                <Text fontSize="$4" color="$colorSecondary">%</Text>
              </XStack>
            </YStack>

            {/* Quick Percentage Buttons */}
            <XStack gap="$2" flexWrap="wrap">
              {[5, 10, 15, 20, 25].map((pct) => (
                <YStack
                  key={pct}
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius="$2"
                  backgroundColor={priceAdjustment.percentage === pct ? COLORS.primary : '$backgroundHover'}
                  cursor="pointer"
                  onPress={() => setPriceAdjustment({ ...priceAdjustment, percentage: pct })}
                >
                  <Text
                    fontSize={12}
                    color={priceAdjustment.percentage === pct ? 'white' : '$color'}
                    fontWeight="500"
                  >
                    {pct}%
                  </Text>
                </YStack>
              ))}
            </XStack>

            <XStack gap="$3" justifyContent="flex-end">
              <Button variant="secondary" onPress={() => setShowPriceModal(false)}>
                <Text>Cancel</Text>
              </Button>
              <YStack
                backgroundColor={priceAdjustment.type === 'increase' ? COLORS.success : COLORS.error}
                borderRadius="$3"
                paddingHorizontal="$4"
                paddingVertical="$2"
                cursor="pointer"
                opacity={isProcessing ? 0.7 : 1}
                onPress={handlePriceAdjust}
              >
                <Text color="white" fontWeight="600">
                  {isProcessing ? 'Applying...' : `${priceAdjustment.type === 'increase' ? 'Increase' : 'Decrease'} by ${priceAdjustment.percentage}%`}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Products"
        message={`Are you sure you want to delete ${selectedCount} product${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isProcessing}
      />
    </>
  );
}

export default BulkActionBar;
