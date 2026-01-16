import React, { useEffect, useMemo } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Input, TextArea } from 'tamagui';
import { X, Save, Package, DollarSign, Layers, Hash, FileText, AlertCircle } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useCategories } from '@/features/categories/hooks';
import { useUpdateProduct } from '@/features/products/hooks';
import type { Product, Category } from '@/types';

const COLORS = {
  primary: '#4F46E5',
  success: '#10B981',
  error: '#EF4444',
};

// Validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  sellingPrice: z.number().min(0, 'Price must be positive'),
  purchasePrice: z.number().min(0, 'Cost must be positive'),
  quantity: z.number().int().min(0, 'Quantity must be positive'),
  categoryId: z.string().optional(),
  desc: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, icon, error, children }: FormFieldProps) {
  return (
    <YStack gap="$1">
      <XStack alignItems="center" gap="$2">
        {icon}
        <Text fontSize={12} fontWeight="600" color="$colorSecondary" textTransform="uppercase">
          {label}
        </Text>
      </XStack>
      {children}
      {error && (
        <XStack alignItems="center" gap="$1">
          <AlertCircle size={12} color={COLORS.error} />
          <Text fontSize={11} color={COLORS.error}>{error}</Text>
        </XStack>
      )}
    </YStack>
  );
}

interface CategorySelectorProps {
  categories: Category[];
  value?: string;
  onChange: (value: string) => void;
}

function CategorySelector({ categories, value, onChange }: CategorySelectorProps) {
  // Handle various data structures: array, { data: array }, undefined
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray((categories as any)?.data)
      ? (categories as any).data
      : [];

  return (
    <XStack flexWrap="wrap" gap="$2">
      <YStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$2"
        backgroundColor={!value ? COLORS.primary : '$backgroundHover'}
        borderWidth={1}
        borderColor={!value ? COLORS.primary : '$borderColor'}
        cursor="pointer"
        onPress={() => onChange('')}
      >
        <Text fontSize={12} color={!value ? 'white' : '$color'} fontWeight="500">
          None
        </Text>
      </YStack>
      {categoryList.map((cat) => {
        const isSelected = value === cat.id;
        const catColor = cat.color || '#6B7280';
        return (
          <YStack
            key={cat.id}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$2"
            backgroundColor={isSelected ? catColor : '$backgroundHover'}
            borderWidth={1}
            borderColor={isSelected ? catColor : '$borderColor'}
            cursor="pointer"
            onPress={() => onChange(cat.id)}
          >
            <Text fontSize={12} color={isSelected ? 'white' : '$color'} fontWeight="500">
              {cat.name}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}

interface ProductEditDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProductEditDrawer({ product, isOpen, onClose, onSuccess }: ProductEditDrawerProps) {
  const { settings } = useSettingsStore();
  const { data: categories = [] } = useCategories();
  const updateProduct = useUpdateProduct();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      sellingPrice: 0,
      purchasePrice: 0,
      quantity: 0,
      categoryId: '',
      desc: '',
    },
  });

  // Watch prices for live margin calculation
  const sellingPrice = watch('sellingPrice');
  const purchasePrice = watch('purchasePrice');

  const marginInfo = useMemo(() => {
    const profit = (sellingPrice || 0) - (purchasePrice || 0);
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    return { profit, margin };
  }, [sellingPrice, purchasePrice]);

  // Reset form when product changes
  useEffect(() => {
    if (product && isOpen) {
      reset({
        name: product.name,
        sku: product.sku || '',
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        quantity: product.quantity ?? 0,
        categoryId: product.categoryId || product.category?.id || '',
        desc: product.desc || '',
      });
    }
  }, [product, isOpen, reset]);

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: {
          name: data.name,
          sku: data.sku,
          sellingPrice: data.sellingPrice,
          purchasePrice: data.purchasePrice,
          stock: data.quantity,
          categoryId: data.categoryId || undefined,
          description: data.desc || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  if (!product) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)">
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <YStack
          position="absolute"
          right={0}
          top={0}
          bottom={0}
          width={480}
          backgroundColor="$background"
          shadowColor="#000"
          shadowOffset={{ width: -4, height: 0 }}
          shadowOpacity={0.15}
          shadowRadius={20}
          elevation={10}
        >
          {/* Header */}
          <XStack
            padding="$4"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
            alignItems="center"
            justifyContent="space-between"
            backgroundColor="$cardBackground"
          >
            <YStack>
              <Text fontSize="$5" fontWeight="bold" color="$color">
                Edit Product
              </Text>
              <Text fontSize={12} color="$colorSecondary">
                Update product information
              </Text>
            </YStack>
            <YStack
              padding="$2"
              borderRadius="$2"
              backgroundColor="$backgroundHover"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '$backgroundPress' }}
              onPress={onClose}
            >
              <X size={20} color="$color" />
            </YStack>
          </XStack>

          {/* Form Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <YStack padding="$4" gap="$4">
                {/* Basic Information */}
                <YStack
                  backgroundColor="$cardBackground"
                  borderRadius="$3"
                  padding="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  gap="$4"
                >
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Basic Information
                  </Text>

                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField
                        label="Product Name"
                        icon={<Package size={14} color={COLORS.primary} />}
                        error={errors.name?.message}
                      >
                        <Input
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter product name"
                          borderWidth={1}
                          borderColor={errors.name ? COLORS.error : '$borderColor'}
                          borderRadius="$2"
                          size="$4"
                        />
                      </FormField>
                    )}
                  />

                  <Controller
                    control={control}
                    name="sku"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField
                        label="SKU"
                        icon={<Hash size={14} color={COLORS.primary} />}
                        error={errors.sku?.message}
                      >
                        <Input
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter SKU"
                          borderWidth={1}
                          borderColor={errors.sku ? COLORS.error : '$borderColor'}
                          borderRadius="$2"
                          size="$4"
                        />
                      </FormField>
                    )}
                  />

                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Category"
                        icon={<Layers size={14} color={COLORS.primary} />}
                      >
                        <CategorySelector
                          categories={categories}
                          value={value}
                          onChange={onChange}
                        />
                      </FormField>
                    )}
                  />

                  <Controller
                    control={control}
                    name="desc"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField
                        label="Description"
                        icon={<FileText size={14} color={COLORS.primary} />}
                      >
                        <TextArea
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter product description (optional)"
                          borderWidth={1}
                          borderColor="$borderColor"
                          borderRadius="$2"
                          minHeight={80}
                        />
                      </FormField>
                    )}
                  />
                </YStack>

                {/* Pricing */}
                <YStack
                  backgroundColor="$cardBackground"
                  borderRadius="$3"
                  padding="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  gap="$4"
                >
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Pricing
                  </Text>

                  <XStack gap="$3">
                    <Controller
                      control={control}
                      name="purchasePrice"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <YStack flex={1}>
                          <FormField
                            label="Purchase Cost"
                            icon={<DollarSign size={14} color="$colorSecondary" />}
                            error={errors.purchasePrice?.message}
                          >
                            <Input
                              value={value?.toString() || ''}
                              onChangeText={(text) => onChange(parseFloat(text) || 0)}
                              onBlur={onBlur}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              borderWidth={1}
                              borderColor={errors.purchasePrice ? COLORS.error : '$borderColor'}
                              borderRadius="$2"
                              size="$4"
                            />
                          </FormField>
                        </YStack>
                      )}
                    />

                    <Controller
                      control={control}
                      name="sellingPrice"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <YStack flex={1}>
                          <FormField
                            label="Selling Price"
                            icon={<DollarSign size={14} color={COLORS.success} />}
                            error={errors.sellingPrice?.message}
                          >
                            <Input
                              value={value?.toString() || ''}
                              onChangeText={(text) => onChange(parseFloat(text) || 0)}
                              onBlur={onBlur}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              borderWidth={1}
                              borderColor={errors.sellingPrice ? COLORS.error : '$borderColor'}
                              borderRadius="$2"
                              size="$4"
                            />
                          </FormField>
                        </YStack>
                      )}
                    />
                  </XStack>

                  {/* Live Margin Calculation */}
                  <YStack
                    backgroundColor={marginInfo.profit >= 0 ? '#ECFDF5' : '#FEE2E2'}
                    padding="$3"
                    borderRadius="$2"
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={12} color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}>
                        Profit Margin
                      </Text>
                      <XStack gap="$2" alignItems="center">
                        <Text fontSize="$4" fontWeight="bold" color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}>
                          {formatCurrency(marginInfo.profit, settings.currency)}
                        </Text>
                        <Text fontSize={12} color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}>
                          ({marginInfo.margin.toFixed(1)}%)
                        </Text>
                      </XStack>
                    </XStack>
                  </YStack>
                </YStack>

                {/* Inventory */}
                <YStack
                  backgroundColor="$cardBackground"
                  borderRadius="$3"
                  padding="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  gap="$4"
                >
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Inventory
                  </Text>

                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField
                        label="Current Stock"
                        icon={<Package size={14} color={COLORS.primary} />}
                        error={errors.quantity?.message}
                      >
                        <Input
                          value={value?.toString() || ''}
                          onChangeText={(text) => onChange(parseInt(text) || 0)}
                          onBlur={onBlur}
                          keyboardType="number-pad"
                          placeholder="0"
                          borderWidth={1}
                          borderColor={errors.quantity ? COLORS.error : '$borderColor'}
                          borderRadius="$2"
                          size="$4"
                        />
                      </FormField>
                    )}
                  />
                </YStack>
              </YStack>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Footer Actions */}
          <XStack
            padding="$4"
            borderTopWidth={1}
            borderTopColor="$borderColor"
            backgroundColor="$cardBackground"
            gap="$3"
          >
            <Button
              variant="secondary"
              flex={1}
              onPress={onClose}
            >
              <Text>Cancel</Text>
            </Button>
            <YStack
              flex={1}
              backgroundColor={isDirty ? COLORS.primary : '$borderColor'}
              borderRadius="$3"
              paddingVertical="$3"
              alignItems="center"
              justifyContent="center"
              cursor={isDirty ? 'pointer' : 'not-allowed'}
              opacity={updateProduct.isPending ? 0.7 : 1}
              hoverStyle={isDirty ? { opacity: 0.9 } : {}}
              pressStyle={isDirty ? { transform: [{ scale: 0.98 }] } : {}}
              onPress={isDirty ? handleSubmit(onSubmit) : undefined}
            >
              <XStack alignItems="center" gap="$2">
                <Save size={18} color="white" />
                <Text color="white" fontWeight="600">
                  {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}

export default ProductEditDrawer;
