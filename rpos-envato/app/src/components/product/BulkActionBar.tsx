import React, { useState } from 'react';
import { Modal } from 'react-native';
import { YStack, XStack, Text, Input, ScrollView } from 'tamagui';
import {
  X, CheckSquare, Square, Layers, Percent, Trash2, AlertTriangle,
  Check, TrendingUp, TrendingDown, Tag,
} from '@tamagui/lucide-icons';
import type { Product, Category } from '@/types';

// Modern color palette
const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',
  warning: '#F59E0B',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
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
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.4)" justifyContent="center" alignItems="center">
        <YStack
          backgroundColor={COLORS.white}
          borderRadius={16}
          width={420}
          maxWidth="90%"
          overflow="hidden"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.15}
          shadowRadius={24}
          elevation={12}
        >
          {/* Header */}
          <XStack
            paddingHorizontal={24}
            paddingVertical={20}
            borderBottomWidth={1}
            borderBottomColor={COLORS.border}
            alignItems="center"
            justifyContent="space-between"
            backgroundColor={variant === 'danger' ? COLORS.errorLight : COLORS.white}
          >
            <XStack alignItems="center" gap={12}>
              {variant === 'danger' && (
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor={COLORS.errorLight}
                  borderWidth={2}
                  borderColor={COLORS.errorBorder}
                  alignItems="center"
                  justifyContent="center"
                >
                  <AlertTriangle size={20} color={COLORS.error} />
                </YStack>
              )}
              <Text fontSize={18} fontWeight="700" color="#111827">{title}</Text>
            </XStack>
            <YStack
              padding={8}
              borderRadius={8}
              backgroundColor={COLORS.grayLight}
              cursor="pointer"
              hoverStyle={{ backgroundColor: COLORS.border }}
              onPress={onClose}
            >
              <X size={18} color={COLORS.gray} />
            </YStack>
          </XStack>

          {/* Content */}
          <YStack padding={24}>
            <Text fontSize={15} color={COLORS.gray} lineHeight={22}>
              {message}
            </Text>
          </YStack>

          {/* Footer */}
          <XStack
            paddingHorizontal={24}
            paddingVertical={16}
            gap={12}
            justifyContent="flex-end"
            borderTopWidth={1}
            borderTopColor={COLORS.border}
            backgroundColor={COLORS.grayLight}
          >
            <XStack
              paddingHorizontal={20}
              paddingVertical={10}
              borderRadius={8}
              backgroundColor={COLORS.white}
              borderWidth={1}
              borderColor={COLORS.border}
              cursor="pointer"
              hoverStyle={{ backgroundColor: COLORS.grayLight }}
              onPress={onClose}
              opacity={isLoading ? 0.5 : 1}
            >
              <Text fontSize={14} fontWeight="600" color={COLORS.gray}>Cancel</Text>
            </XStack>
            <XStack
              paddingHorizontal={20}
              paddingVertical={10}
              borderRadius={8}
              backgroundColor={variant === 'danger' ? COLORS.error : COLORS.primary}
              cursor="pointer"
              opacity={isLoading ? 0.7 : 1}
              hoverStyle={{ opacity: 0.9 }}
              onPress={onConfirm}
              alignItems="center"
              gap={8}
            >
              {variant === 'danger' && <Trash2 size={16} color="white" />}
              <Text fontSize={14} fontWeight="600" color="white">
                {isLoading ? 'Processing...' : confirmLabel}
              </Text>
            </XStack>
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
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.4)" justifyContent="center" alignItems="center">
          <YStack
            backgroundColor={COLORS.white}
            borderRadius={16}
            width={440}
            maxWidth="90%"
            overflow="hidden"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.15}
            shadowRadius={24}
            elevation={12}
          >
            {/* Header */}
            <XStack
              paddingHorizontal={24}
              paddingVertical={20}
              borderBottomWidth={1}
              borderBottomColor={COLORS.border}
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack alignItems="center" gap={12}>
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor={COLORS.primaryLight}
                  borderWidth={2}
                  borderColor={COLORS.primaryBorder}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Layers size={20} color={COLORS.primary} />
                </YStack>
                <YStack>
                  <Text fontSize={18} fontWeight="700" color="#111827">Update Category</Text>
                  <Text fontSize={13} color={COLORS.gray}>
                    {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
                  </Text>
                </YStack>
              </XStack>
              <YStack
                padding={8}
                borderRadius={8}
                backgroundColor={COLORS.grayLight}
                cursor="pointer"
                hoverStyle={{ backgroundColor: COLORS.border }}
                onPress={() => setShowCategoryModal(false)}
              >
                <X size={18} color={COLORS.gray} />
              </YStack>
            </XStack>

            {/* Content */}
            <YStack padding={24} gap={16}>
              <Text fontSize={14} fontWeight="600" color="#374151">
                Select a category
              </Text>

              <ScrollView maxHeight={280}>
                <YStack gap={8}>
                  {(Array.isArray(categories) ? categories : []).map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <XStack
                        key={cat.id}
                        backgroundColor={isSelected ? COLORS.primaryLight : COLORS.white}
                        borderWidth={2}
                        borderColor={isSelected ? COLORS.primary : COLORS.border}
                        borderRadius={12}
                        padding={14}
                        alignItems="center"
                        gap={12}
                        cursor="pointer"
                        hoverStyle={{
                          backgroundColor: isSelected ? COLORS.primaryLight : COLORS.grayLight,
                          borderColor: isSelected ? COLORS.primary : '#D1D5DB'
                        }}
                        onPress={() => setSelectedCategory(cat.id)}
                      >
                        <YStack
                          width={36}
                          height={36}
                          borderRadius={10}
                          backgroundColor={cat.color || '#6B7280'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Tag size={18} color="white" />
                        </YStack>
                        <Text fontSize={15} fontWeight="500" color="#111827" flex={1}>
                          {cat.name}
                        </Text>
                        <YStack
                          width={24}
                          height={24}
                          borderRadius={12}
                          backgroundColor={isSelected ? COLORS.primary : COLORS.grayLight}
                          borderWidth={isSelected ? 0 : 2}
                          borderColor={COLORS.border}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </YStack>
                      </XStack>
                    );
                  })}
                </YStack>
              </ScrollView>
            </YStack>

            {/* Footer */}
            <XStack
              paddingHorizontal={24}
              paddingVertical={16}
              gap={12}
              justifyContent="flex-end"
              borderTopWidth={1}
              borderTopColor={COLORS.border}
              backgroundColor={COLORS.grayLight}
            >
              <XStack
                paddingHorizontal={20}
                paddingVertical={10}
                borderRadius={8}
                backgroundColor={COLORS.white}
                borderWidth={1}
                borderColor={COLORS.border}
                cursor="pointer"
                hoverStyle={{ backgroundColor: COLORS.grayLight }}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text fontSize={14} fontWeight="600" color={COLORS.gray}>Cancel</Text>
              </XStack>
              <XStack
                paddingHorizontal={20}
                paddingVertical={10}
                borderRadius={8}
                backgroundColor={selectedCategory ? COLORS.primary : COLORS.border}
                cursor={selectedCategory ? 'pointer' : 'not-allowed'}
                opacity={isProcessing ? 0.7 : 1}
                hoverStyle={selectedCategory ? { opacity: 0.9 } : {}}
                onPress={selectedCategory ? handleCategoryUpdate : undefined}
                alignItems="center"
                gap={8}
              >
                <Check size={16} color="white" />
                <Text fontSize={14} fontWeight="600" color="white">
                  {isProcessing ? 'Applying...' : 'Apply Category'}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      </Modal>

      {/* Price Adjustment Modal */}
      <Modal visible={showPriceModal} transparent animationType="fade" onRequestClose={() => setShowPriceModal(false)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.4)" justifyContent="center" alignItems="center">
          <YStack
            backgroundColor={COLORS.white}
            borderRadius={16}
            width={460}
            maxWidth="90%"
            overflow="hidden"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.15}
            shadowRadius={24}
            elevation={12}
          >
            {/* Header */}
            <XStack
              paddingHorizontal={24}
              paddingVertical={20}
              borderBottomWidth={1}
              borderBottomColor={COLORS.border}
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack alignItems="center" gap={12}>
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor={COLORS.primaryLight}
                  borderWidth={2}
                  borderColor={COLORS.primaryBorder}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Percent size={20} color={COLORS.primary} />
                </YStack>
                <YStack>
                  <Text fontSize={18} fontWeight="700" color="#111827">Adjust Prices</Text>
                  <Text fontSize={13} color={COLORS.gray}>
                    {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
                  </Text>
                </YStack>
              </XStack>
              <YStack
                padding={8}
                borderRadius={8}
                backgroundColor={COLORS.grayLight}
                cursor="pointer"
                hoverStyle={{ backgroundColor: COLORS.border }}
                onPress={() => setShowPriceModal(false)}
              >
                <X size={18} color={COLORS.gray} />
              </YStack>
            </XStack>

            {/* Content */}
            <YStack padding={24} gap={24}>
              {/* Adjustment Type Toggle */}
              <YStack gap={10}>
                <Text fontSize={14} fontWeight="600" color="#374151">
                  Adjustment Type
                </Text>
                <XStack gap={12}>
                  <XStack
                    flex={1}
                    backgroundColor={priceAdjustment.type === 'increase' ? COLORS.successLight : COLORS.white}
                    borderWidth={2}
                    borderColor={priceAdjustment.type === 'increase' ? COLORS.success : COLORS.border}
                    borderRadius={12}
                    padding={16}
                    alignItems="center"
                    justifyContent="center"
                    gap={10}
                    cursor="pointer"
                    hoverStyle={{
                      backgroundColor: priceAdjustment.type === 'increase' ? COLORS.successLight : COLORS.grayLight,
                    }}
                    onPress={() => setPriceAdjustment({ ...priceAdjustment, type: 'increase' })}
                  >
                    <YStack
                      width={36}
                      height={36}
                      borderRadius={18}
                      backgroundColor={priceAdjustment.type === 'increase' ? COLORS.success : COLORS.grayLight}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <TrendingUp size={20} color={priceAdjustment.type === 'increase' ? 'white' : COLORS.gray} />
                    </YStack>
                    <YStack>
                      <Text
                        fontSize={15}
                        fontWeight="600"
                        color={priceAdjustment.type === 'increase' ? COLORS.success : '#374151'}
                      >
                        Increase
                      </Text>
                      <Text fontSize={12} color={COLORS.gray}>
                        Raise prices
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack
                    flex={1}
                    backgroundColor={priceAdjustment.type === 'decrease' ? COLORS.errorLight : COLORS.white}
                    borderWidth={2}
                    borderColor={priceAdjustment.type === 'decrease' ? COLORS.error : COLORS.border}
                    borderRadius={12}
                    padding={16}
                    alignItems="center"
                    justifyContent="center"
                    gap={10}
                    cursor="pointer"
                    hoverStyle={{
                      backgroundColor: priceAdjustment.type === 'decrease' ? COLORS.errorLight : COLORS.grayLight,
                    }}
                    onPress={() => setPriceAdjustment({ ...priceAdjustment, type: 'decrease' })}
                  >
                    <YStack
                      width={36}
                      height={36}
                      borderRadius={18}
                      backgroundColor={priceAdjustment.type === 'decrease' ? COLORS.error : COLORS.grayLight}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <TrendingDown size={20} color={priceAdjustment.type === 'decrease' ? 'white' : COLORS.gray} />
                    </YStack>
                    <YStack>
                      <Text
                        fontSize={15}
                        fontWeight="600"
                        color={priceAdjustment.type === 'decrease' ? COLORS.error : '#374151'}
                      >
                        Decrease
                      </Text>
                      <Text fontSize={12} color={COLORS.gray}>
                        Lower prices
                      </Text>
                    </YStack>
                  </XStack>
                </XStack>
              </YStack>

              {/* Percentage Input */}
              <YStack gap={10}>
                <Text fontSize={14} fontWeight="600" color="#374151">
                  Percentage Amount
                </Text>
                <XStack
                  backgroundColor={COLORS.grayLight}
                  borderRadius={12}
                  borderWidth={2}
                  borderColor={COLORS.border}
                  padding={4}
                  alignItems="center"
                >
                  <YStack
                    width={48}
                    height={48}
                    backgroundColor={COLORS.white}
                    borderRadius={8}
                    alignItems="center"
                    justifyContent="center"
                    marginRight={4}
                  >
                    <Text fontSize={18} fontWeight="700" color={COLORS.primary}>%</Text>
                  </YStack>
                  <Input
                    flex={1}
                    value={priceAdjustment.percentage.toString()}
                    onChangeText={(text) => setPriceAdjustment({ ...priceAdjustment, percentage: parseInt(text) || 0 })}
                    keyboardType="number-pad"
                    backgroundColor="transparent"
                    borderWidth={0}
                    fontSize={24}
                    fontWeight="700"
                    color="#111827"
                    textAlign="center"
                    paddingHorizontal={16}
                  />
                </XStack>
              </YStack>

              {/* Quick Percentage Buttons */}
              <YStack gap={10}>
                <Text fontSize={14} fontWeight="600" color="#374151">
                  Quick Select
                </Text>
                <XStack gap={10} flexWrap="wrap">
                  {[5, 10, 15, 20, 25, 30, 50].map((pct) => {
                    const isActive = priceAdjustment.percentage === pct;
                    return (
                      <YStack
                        key={pct}
                        paddingHorizontal={20}
                        paddingVertical={12}
                        borderRadius={10}
                        backgroundColor={isActive ? COLORS.primary : COLORS.white}
                        borderWidth={2}
                        borderColor={isActive ? COLORS.primary : COLORS.border}
                        cursor="pointer"
                        hoverStyle={{
                          backgroundColor: isActive ? COLORS.primary : COLORS.grayLight,
                          borderColor: isActive ? COLORS.primary : '#D1D5DB',
                        }}
                        onPress={() => setPriceAdjustment({ ...priceAdjustment, percentage: pct })}
                      >
                        <Text
                          fontSize={15}
                          fontWeight="600"
                          color={isActive ? 'white' : '#374151'}
                        >
                          {pct}%
                        </Text>
                      </YStack>
                    );
                  })}
                </XStack>
              </YStack>

              {/* Preview */}
              <YStack
                backgroundColor={priceAdjustment.type === 'increase' ? COLORS.successLight : COLORS.errorLight}
                borderRadius={12}
                padding={16}
                borderLeftWidth={4}
                borderLeftColor={priceAdjustment.type === 'increase' ? COLORS.success : COLORS.error}
              >
                <Text fontSize={13} color={COLORS.gray} marginBottom={4}>
                  Preview
                </Text>
                <Text fontSize={16} fontWeight="600" color={priceAdjustment.type === 'increase' ? COLORS.success : COLORS.error}>
                  {priceAdjustment.type === 'increase' ? '↑' : '↓'} {priceAdjustment.percentage}% {priceAdjustment.type} on all selected products
                </Text>
              </YStack>
            </YStack>

            {/* Footer */}
            <XStack
              paddingHorizontal={24}
              paddingVertical={16}
              gap={12}
              justifyContent="flex-end"
              borderTopWidth={1}
              borderTopColor={COLORS.border}
              backgroundColor={COLORS.grayLight}
            >
              <XStack
                paddingHorizontal={20}
                paddingVertical={12}
                borderRadius={10}
                backgroundColor={COLORS.white}
                borderWidth={1}
                borderColor={COLORS.border}
                cursor="pointer"
                hoverStyle={{ backgroundColor: COLORS.grayLight }}
                onPress={() => setShowPriceModal(false)}
              >
                <Text fontSize={14} fontWeight="600" color={COLORS.gray}>Cancel</Text>
              </XStack>
              <XStack
                paddingHorizontal={24}
                paddingVertical={12}
                borderRadius={10}
                backgroundColor={priceAdjustment.type === 'increase' ? COLORS.success : COLORS.error}
                cursor="pointer"
                opacity={isProcessing ? 0.7 : 1}
                hoverStyle={{ opacity: 0.9 }}
                onPress={handlePriceAdjust}
                alignItems="center"
                gap={8}
              >
                {priceAdjustment.type === 'increase' ? (
                  <TrendingUp size={18} color="white" />
                ) : (
                  <TrendingDown size={18} color="white" />
                )}
                <Text fontSize={14} fontWeight="600" color="white">
                  {isProcessing ? 'Applying...' : `Apply ${priceAdjustment.percentage}% ${priceAdjustment.type === 'increase' ? 'Increase' : 'Decrease'}`}
                </Text>
              </XStack>
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
