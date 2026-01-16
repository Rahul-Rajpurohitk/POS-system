import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Input, TextArea, Select } from 'tamagui';
import { X, Save, Package, DollarSign, Layers, Hash, FileText, AlertCircle, TrendingUp, Box, Check, Truck, Barcode, Tag, Store, Scale, Ruler } from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useCategories } from '@/features/categories/hooks';
import { useUpdateProduct } from '@/features/products/hooks';
import { PartnerToggle } from './PartnerToggle';
import { TagInput } from './TagInput';
import { SupplierSelector } from './SupplierSelector';
import type { Product, Category, Supplier, PartnerAvailability } from '@/types';

// Clean, professional color palette
const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  // Partner-ready section colors
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  orangeBorder: '#FED7AA',
  violet: '#7C3AED',
  violetLight: '#EDE9FE',
  violetBorder: '#C4B5FD',
  teal: '#14B8A6',
  tealLight: '#F0FDFA',
  tealBorder: '#99F6E4',
};

// Validation schema with partner-ready fields
const productSchema = z.object({
  // Core fields
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  sellingPrice: z.number().min(0, 'Price must be positive'),
  purchasePrice: z.number().min(0, 'Cost must be positive'),
  quantity: z.number().int().min(0, 'Quantity must be positive'),
  categoryId: z.string().optional(),
  desc: z.string().optional(),
  // Partner-ready: Sourcing & Brand
  brand: z.string().optional(),
  primaryBarcode: z.string().optional(),
  taxClass: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  defaultSupplierId: z.string().optional(),
  // Partner-ready: Shipping Dimensions
  weight: z.number().min(0).optional(),
  weightUnit: z.string().optional(),
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  dimensionUnit: z.string().optional(),
  // Partner-ready: Tags
  tags: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// Clean form field component
function FormField({
  label,
  icon,
  error,
  children,
  required = false,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" gap="$2">
        <YStack
          width={28}
          height={28}
          borderRadius={6}
          backgroundColor={COLORS.primaryLight}
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </YStack>
        <Text fontSize={13} fontWeight="600" color={COLORS.gray}>
          {label}
          {required && <Text color={COLORS.error}> *</Text>}
        </Text>
      </XStack>
      {children}
      {error && (
        <XStack alignItems="center" gap="$1" paddingLeft="$1">
          <AlertCircle size={12} color={COLORS.error} />
          <Text fontSize={12} color={COLORS.error}>{error}</Text>
        </XStack>
      )}
    </YStack>
  );
}

// Modern category selector with color indicators
function CategorySelector({
  categories,
  value,
  onChange
}: {
  categories: Category[];
  value?: string;
  onChange: (value: string) => void;
}) {
  const categoryList = Array.isArray(categories)
    ? categories
    : Array.isArray((categories as any)?.data)
      ? (categories as any).data
      : [];

  return (
    <XStack flexWrap="wrap" gap="$2">
      {/* None option */}
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius={8}
        backgroundColor={!value ? COLORS.primary : COLORS.white}
        borderWidth={1}
        borderColor={!value ? COLORS.primary : COLORS.border}
        alignItems="center"
        gap="$2"
        cursor="pointer"
        hoverStyle={{ borderColor: COLORS.primary }}
        onPress={() => onChange('')}
      >
        {!value && <Check size={14} color={COLORS.white} />}
        <Text fontSize={13} color={!value ? COLORS.white : COLORS.gray} fontWeight="500">
          None
        </Text>
      </XStack>

      {/* Category options */}
      {categoryList.map((cat: Category) => {
        const isSelected = value === cat.id;
        const catColor = cat.color || COLORS.gray;
        return (
          <XStack
            key={cat.id}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius={8}
            backgroundColor={isSelected ? catColor : COLORS.white}
            borderWidth={1}
            borderColor={isSelected ? catColor : COLORS.border}
            alignItems="center"
            gap="$2"
            cursor="pointer"
            hoverStyle={{ borderColor: catColor }}
            onPress={() => onChange(cat.id)}
          >
            {!isSelected && (
              <YStack
                width={10}
                height={10}
                borderRadius={5}
                backgroundColor={catColor}
              />
            )}
            {isSelected && <Check size={14} color={COLORS.white} />}
            <Text fontSize={13} color={isSelected ? COLORS.white : '#374151'} fontWeight="500">
              {cat.name}
            </Text>
          </XStack>
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
  suppliers?: Supplier[];
}

export function ProductEditDrawer({ product, isOpen, onClose, onSuccess, suppliers = [] }: ProductEditDrawerProps) {
  const { settings } = useSettingsStore();
  const { data: categories = [] } = useCategories();
  const updateProduct = useUpdateProduct();

  // Partner availability state (separate from form as it's handled differently)
  const [partnerAvailability, setPartnerAvailability] = useState<PartnerAvailability>({});
  const [initialPartnerAvailability, setInitialPartnerAvailability] = useState<PartnerAvailability>({});

  // Track if partner availability changed
  const isPartnerDirty = JSON.stringify(partnerAvailability) !== JSON.stringify(initialPartnerAvailability);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty: isFormDirty },
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
      // Partner-ready fields
      brand: '',
      primaryBarcode: '',
      taxClass: 'standard',
      unitOfMeasure: 'each',
      defaultSupplierId: '',
      weight: undefined,
      weightUnit: 'kg',
      length: undefined,
      width: undefined,
      height: undefined,
      dimensionUnit: 'cm',
      tags: [],
    },
  });

  const sellingPrice = watch('sellingPrice');
  const purchasePrice = watch('purchasePrice');

  const marginInfo = useMemo(() => {
    const profit = (sellingPrice || 0) - (purchasePrice || 0);
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    return { profit, margin };
  }, [sellingPrice, purchasePrice]);

  useEffect(() => {
    if (product && isOpen) {
      reset({
        name: product.name,
        sku: product.sku || '',
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        quantity: product.quantity ?? 0,
        categoryId: product.categoryId || product.category?.id || '',
        desc: product.desc || product.description || '',
        // Partner-ready fields
        brand: product.brand || '',
        primaryBarcode: product.primaryBarcode || '',
        taxClass: product.taxClass || 'standard',
        unitOfMeasure: product.unitOfMeasure || 'each',
        defaultSupplierId: product.defaultSupplierId || '',
        weight: product.weight ?? undefined,
        weightUnit: product.weightUnit || 'kg',
        length: product.length ?? undefined,
        width: product.width ?? undefined,
        height: product.height ?? undefined,
        dimensionUnit: product.dimensionUnit || 'cm',
        tags: product.tags || [],
      });
      // Set partner availability and store initial value
      const initialPartners = product.partnerAvailability || {};
      setPartnerAvailability(initialPartners);
      setInitialPartnerAvailability(initialPartners);
    }
  }, [product, isOpen, reset]);

  // Combined dirty state
  const isDirty = isFormDirty || isPartnerDirty;

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
          // Partner-ready: Sourcing & Brand
          brand: data.brand || undefined,
          primaryBarcode: data.primaryBarcode || undefined,
          taxClass: data.taxClass || undefined,
          unitOfMeasure: data.unitOfMeasure || undefined,
          defaultSupplierId: data.defaultSupplierId || undefined,
          // Partner-ready: Shipping Dimensions
          weight: data.weight,
          weightUnit: data.weightUnit || undefined,
          length: data.length,
          width: data.width,
          height: data.height,
          dimensionUnit: data.dimensionUnit || undefined,
          // Partner-ready: Availability & Tags
          partnerAvailability,
          tags: data.tags || [],
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
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.4)">
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
          backgroundColor={COLORS.white}
          shadowColor="#000"
          shadowOffset={{ width: -8, height: 0 }}
          shadowOpacity={0.1}
          shadowRadius={24}
          elevation={10}
        >
          {/* Header */}
          <XStack
            paddingHorizontal="$5"
            paddingVertical="$4"
            borderBottomWidth={1}
            borderBottomColor={COLORS.border}
            alignItems="center"
            justifyContent="space-between"
            backgroundColor={COLORS.white}
          >
            <XStack alignItems="center" gap="$3">
              <YStack
                width={44}
                height={44}
                borderRadius={10}
                backgroundColor={COLORS.primaryLight}
                alignItems="center"
                justifyContent="center"
              >
                <Package size={22} color={COLORS.primary} />
              </YStack>
              <YStack>
                <Text fontSize={18} fontWeight="700" color="#111827">
                  Edit Product
                </Text>
                <Text fontSize={13} color={COLORS.gray}>
                  Update product information
                </Text>
              </YStack>
            </XStack>
            <YStack
              width={36}
              height={36}
              borderRadius={8}
              backgroundColor={COLORS.grayLight}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#F3F4F6' }}
              onPress={onClose}
            >
              <X size={20} color={COLORS.gray} />
            </YStack>
          </XStack>

          {/* Form Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1, backgroundColor: COLORS.grayLight }}
              showsVerticalScrollIndicator={false}
            >
              <YStack padding="$4" gap="$4">
                {/* Basic Information Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.primary} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Basic Information
                    </Text>
                  </XStack>

                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField
                        label="Product Name"
                        icon={<Package size={14} color={COLORS.primary} />}
                        error={errors.name?.message}
                        required
                      >
                        <Input
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter product name"
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={errors.name ? COLORS.error : COLORS.border}
                          borderRadius={8}
                          paddingHorizontal="$3"
                          paddingVertical="$3"
                          fontSize={14}
                          color="#111827"
                          placeholderTextColor={COLORS.gray}
                          focusStyle={{ borderColor: COLORS.primary }}
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
                        required
                      >
                        <Input
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter SKU code"
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={errors.sku ? COLORS.error : COLORS.border}
                          borderRadius={8}
                          paddingHorizontal="$3"
                          paddingVertical="$3"
                          fontSize={14}
                          color="#111827"
                          placeholderTextColor={COLORS.gray}
                          focusStyle={{ borderColor: COLORS.primary }}
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
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={COLORS.border}
                          borderRadius={8}
                          paddingHorizontal="$3"
                          paddingVertical="$3"
                          fontSize={14}
                          color="#111827"
                          placeholderTextColor={COLORS.gray}
                          minHeight={100}
                          focusStyle={{ borderColor: COLORS.primary }}
                        />
                      </FormField>
                    )}
                  />
                </YStack>

                {/* Pricing Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.success} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Pricing
                    </Text>
                  </XStack>

                  <XStack gap="$3">
                    <Controller
                      control={control}
                      name="purchasePrice"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <YStack flex={1}>
                          <FormField
                            label="Cost Price"
                            icon={<DollarSign size={14} color={COLORS.gray} />}
                            error={errors.purchasePrice?.message}
                          >
                            <XStack
                              backgroundColor={COLORS.white}
                              borderWidth={1}
                              borderColor={errors.purchasePrice ? COLORS.error : COLORS.border}
                              borderRadius={8}
                              alignItems="center"
                              overflow="hidden"
                            >
                              <YStack
                                paddingHorizontal="$3"
                                paddingVertical="$3"
                                backgroundColor={COLORS.grayLight}
                                borderRightWidth={1}
                                borderRightColor={COLORS.border}
                              >
                                <Text fontSize={14} color={COLORS.gray} fontWeight="600">$</Text>
                              </YStack>
                              <Input
                                flex={1}
                                value={value?.toString() || ''}
                                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                backgroundColor="transparent"
                                borderWidth={0}
                                paddingHorizontal="$3"
                                fontSize={14}
                                color="#111827"
                                placeholderTextColor={COLORS.gray}
                              />
                            </XStack>
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
                            <XStack
                              backgroundColor={COLORS.white}
                              borderWidth={1}
                              borderColor={errors.sellingPrice ? COLORS.error : COLORS.border}
                              borderRadius={8}
                              alignItems="center"
                              overflow="hidden"
                            >
                              <YStack
                                paddingHorizontal="$3"
                                paddingVertical="$3"
                                backgroundColor={COLORS.successLight}
                                borderRightWidth={1}
                                borderRightColor={COLORS.successBorder}
                              >
                                <Text fontSize={14} color={COLORS.success} fontWeight="600">$</Text>
                              </YStack>
                              <Input
                                flex={1}
                                value={value?.toString() || ''}
                                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                onBlur={onBlur}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                backgroundColor="transparent"
                                borderWidth={0}
                                paddingHorizontal="$3"
                                fontSize={14}
                                color="#111827"
                                placeholderTextColor={COLORS.gray}
                              />
                            </XStack>
                          </FormField>
                        </YStack>
                      )}
                    />
                  </XStack>

                  {/* Profit Margin Display */}
                  <XStack
                    backgroundColor={marginInfo.profit >= 0 ? COLORS.successLight : COLORS.errorLight}
                    padding="$3"
                    borderRadius={8}
                    borderWidth={1}
                    borderColor={marginInfo.profit >= 0 ? COLORS.successBorder : '#FECACA'}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <XStack alignItems="center" gap="$2">
                      <TrendingUp size={16} color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error} />
                      <Text fontSize={13} fontWeight="600" color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}>
                        Profit Margin
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize={16} fontWeight="700" color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}>
                        {formatCurrency(marginInfo.profit, settings.currency)}
                      </Text>
                      <YStack
                        backgroundColor={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}
                        paddingHorizontal="$2"
                        paddingVertical={2}
                        borderRadius={4}
                      >
                        <Text fontSize={11} fontWeight="600" color={COLORS.white}>
                          {marginInfo.margin.toFixed(1)}%
                        </Text>
                      </YStack>
                    </XStack>
                  </XStack>
                </YStack>

                {/* Inventory Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.warning} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Inventory
                    </Text>
                  </XStack>

                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormField
                        label="Current Stock"
                        icon={<Box size={14} color={COLORS.warning} />}
                        error={errors.quantity?.message}
                      >
                        <XStack
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={errors.quantity ? COLORS.error : COLORS.border}
                          borderRadius={8}
                          alignItems="center"
                          overflow="hidden"
                        >
                          <YStack
                            paddingHorizontal="$3"
                            paddingVertical="$3"
                            backgroundColor="#FEF3C7"
                            borderRightWidth={1}
                            borderRightColor="#FCD34D"
                          >
                            <Box size={16} color={COLORS.warning} />
                          </YStack>
                          <Input
                            flex={1}
                            value={value?.toString() || ''}
                            onChangeText={(text) => onChange(parseInt(text) || 0)}
                            onBlur={onBlur}
                            keyboardType="number-pad"
                            placeholder="0"
                            backgroundColor="transparent"
                            borderWidth={0}
                            paddingHorizontal="$3"
                            fontSize={14}
                            color="#111827"
                            placeholderTextColor={COLORS.gray}
                          />
                          <Text paddingRight="$3" fontSize={13} color={COLORS.gray}>units</Text>
                        </XStack>
                      </FormField>
                    )}
                  />
                </YStack>

                {/* Sourcing & Brand Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.primary} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Sourcing & Brand
                    </Text>
                  </XStack>

                  {suppliers.length > 0 && (
                    <Controller
                      control={control}
                      name="defaultSupplierId"
                      render={({ field: { onChange, value } }) => (
                        <FormField
                          label="Default Supplier"
                          icon={<Truck size={14} color={COLORS.primary} />}
                        >
                          <SupplierSelector
                            value={value || null}
                            onChange={(id) => onChange(id || '')}
                            suppliers={suppliers}
                            placeholder="Select supplier..."
                          />
                        </FormField>
                      )}
                    />
                  )}

                  <XStack gap="$3">
                    <Controller
                      control={control}
                      name="brand"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <YStack flex={1}>
                          <FormField
                            label="Brand"
                            icon={<Tag size={14} color={COLORS.primary} />}
                          >
                            <Input
                              value={value || ''}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              placeholder="Enter brand name"
                              backgroundColor={COLORS.white}
                              borderWidth={1}
                              borderColor={COLORS.border}
                              borderRadius={8}
                              paddingHorizontal="$3"
                              paddingVertical="$3"
                              fontSize={14}
                              color="#111827"
                              placeholderTextColor={COLORS.gray}
                              focusStyle={{ borderColor: COLORS.primary }}
                            />
                          </FormField>
                        </YStack>
                      )}
                    />

                    <Controller
                      control={control}
                      name="primaryBarcode"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <YStack flex={1}>
                          <FormField
                            label="Barcode / UPC"
                            icon={<Barcode size={14} color={COLORS.primary} />}
                          >
                            <Input
                              value={value || ''}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              placeholder="Enter barcode"
                              backgroundColor={COLORS.white}
                              borderWidth={1}
                              borderColor={COLORS.border}
                              borderRadius={8}
                              paddingHorizontal="$3"
                              paddingVertical="$3"
                              fontSize={14}
                              color="#111827"
                              placeholderTextColor={COLORS.gray}
                              focusStyle={{ borderColor: COLORS.primary }}
                            />
                          </FormField>
                        </YStack>
                      )}
                    />
                  </XStack>
                </YStack>

                {/* Partner Availability Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.purple} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Partner Availability
                    </Text>
                  </XStack>

                  <Text fontSize={12} color={COLORS.gray}>
                    Select which delivery partners this product is available for
                  </Text>

                  <PartnerToggle
                    value={partnerAvailability}
                    onChange={setPartnerAvailability}
                    size="md"
                  />
                </YStack>

                {/* Shipping Details Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.orange} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Shipping Details
                    </Text>
                  </XStack>

                  {/* Weight */}
                  <XStack gap="$3" alignItems="flex-end">
                    <Controller
                      control={control}
                      name="weight"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <YStack flex={2}>
                          <FormField
                            label="Weight"
                            icon={<Scale size={14} color={COLORS.orange} />}
                          >
                            <Input
                              value={value?.toString() || ''}
                              onChangeText={(text) => onChange(parseFloat(text) || undefined)}
                              onBlur={onBlur}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              backgroundColor={COLORS.white}
                              borderWidth={1}
                              borderColor={COLORS.border}
                              borderRadius={8}
                              paddingHorizontal="$3"
                              paddingVertical="$3"
                              fontSize={14}
                              color="#111827"
                              placeholderTextColor={COLORS.gray}
                              focusStyle={{ borderColor: COLORS.orange }}
                            />
                          </FormField>
                        </YStack>
                      )}
                    />

                    <Controller
                      control={control}
                      name="weightUnit"
                      render={({ field: { onChange, value } }) => (
                        <YStack flex={1}>
                          <XStack flexWrap="wrap" gap="$1">
                            {['kg', 'lb', 'oz', 'g'].map((unit) => (
                              <XStack
                                key={unit}
                                paddingHorizontal="$2"
                                paddingVertical="$2"
                                borderRadius={6}
                                backgroundColor={value === unit ? COLORS.orange : COLORS.white}
                                borderWidth={1}
                                borderColor={value === unit ? COLORS.orange : COLORS.border}
                                cursor="pointer"
                                hoverStyle={{ borderColor: COLORS.orange }}
                                onPress={() => onChange(unit)}
                              >
                                <Text fontSize={12} fontWeight="500" color={value === unit ? COLORS.white : COLORS.gray}>
                                  {unit}
                                </Text>
                              </XStack>
                            ))}
                          </XStack>
                        </YStack>
                      )}
                    />
                  </XStack>

                  {/* Dimensions */}
                  <FormField
                    label="Dimensions (L × W × H)"
                    icon={<Ruler size={14} color={COLORS.orange} />}
                  >
                    <XStack gap="$2" alignItems="center">
                      <Controller
                        control={control}
                        name="length"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            flex={1}
                            value={value?.toString() || ''}
                            onChangeText={(text) => onChange(parseFloat(text) || undefined)}
                            onBlur={onBlur}
                            keyboardType="decimal-pad"
                            placeholder="L"
                            backgroundColor={COLORS.white}
                            borderWidth={1}
                            borderColor={COLORS.border}
                            borderRadius={8}
                            paddingHorizontal="$2"
                            paddingVertical="$2"
                            fontSize={13}
                            textAlign="center"
                            color="#111827"
                            placeholderTextColor={COLORS.gray}
                            focusStyle={{ borderColor: COLORS.orange }}
                          />
                        )}
                      />
                      <Text color={COLORS.gray}>×</Text>
                      <Controller
                        control={control}
                        name="width"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            flex={1}
                            value={value?.toString() || ''}
                            onChangeText={(text) => onChange(parseFloat(text) || undefined)}
                            onBlur={onBlur}
                            keyboardType="decimal-pad"
                            placeholder="W"
                            backgroundColor={COLORS.white}
                            borderWidth={1}
                            borderColor={COLORS.border}
                            borderRadius={8}
                            paddingHorizontal="$2"
                            paddingVertical="$2"
                            fontSize={13}
                            textAlign="center"
                            color="#111827"
                            placeholderTextColor={COLORS.gray}
                            focusStyle={{ borderColor: COLORS.orange }}
                          />
                        )}
                      />
                      <Text color={COLORS.gray}>×</Text>
                      <Controller
                        control={control}
                        name="height"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            flex={1}
                            value={value?.toString() || ''}
                            onChangeText={(text) => onChange(parseFloat(text) || undefined)}
                            onBlur={onBlur}
                            keyboardType="decimal-pad"
                            placeholder="H"
                            backgroundColor={COLORS.white}
                            borderWidth={1}
                            borderColor={COLORS.border}
                            borderRadius={8}
                            paddingHorizontal="$2"
                            paddingVertical="$2"
                            fontSize={13}
                            textAlign="center"
                            color="#111827"
                            placeholderTextColor={COLORS.gray}
                            focusStyle={{ borderColor: COLORS.orange }}
                          />
                        )}
                      />

                      <Controller
                        control={control}
                        name="dimensionUnit"
                        render={({ field: { onChange, value } }) => (
                          <XStack gap="$1">
                            {['cm', 'in'].map((unit) => (
                              <XStack
                                key={unit}
                                paddingHorizontal="$2"
                                paddingVertical="$2"
                                borderRadius={6}
                                backgroundColor={value === unit ? COLORS.orange : COLORS.white}
                                borderWidth={1}
                                borderColor={value === unit ? COLORS.orange : COLORS.border}
                                cursor="pointer"
                                hoverStyle={{ borderColor: COLORS.orange }}
                                onPress={() => onChange(unit)}
                              >
                                <Text fontSize={12} fontWeight="500" color={value === unit ? COLORS.white : COLORS.gray}>
                                  {unit}
                                </Text>
                              </XStack>
                            ))}
                          </XStack>
                        )}
                      />
                    </XStack>
                  </FormField>
                </YStack>

                {/* Tags Section */}
                <YStack
                  backgroundColor={COLORS.white}
                  borderRadius={12}
                  padding="$4"
                  gap="$4"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 1 }}
                  shadowOpacity={0.05}
                  shadowRadius={3}
                  elevation={1}
                >
                  <XStack alignItems="center" gap="$2">
                    <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.violet} />
                    <Text fontSize={15} fontWeight="700" color="#111827">
                      Tags
                    </Text>
                  </XStack>

                  <Controller
                    control={control}
                    name="tags"
                    render={({ field: { onChange, value } }) => (
                      <TagInput
                        value={value || []}
                        onChange={onChange}
                        placeholder="Add tags for better organization..."
                        maxTags={10}
                      />
                    )}
                  />
                </YStack>
              </YStack>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Footer Actions */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$4"
            borderTopWidth={1}
            borderTopColor={COLORS.border}
            backgroundColor={COLORS.white}
            gap="$3"
          >
            <YStack
              flex={1}
              backgroundColor={COLORS.grayLight}
              borderRadius={10}
              paddingVertical="$3"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              borderWidth={1}
              borderColor={COLORS.border}
              hoverStyle={{ backgroundColor: '#F3F4F6' }}
              onPress={onClose}
            >
              <Text fontSize={14} fontWeight="600" color={COLORS.gray}>
                Cancel
              </Text>
            </YStack>
            <YStack
              flex={1}
              backgroundColor={isDirty ? COLORS.primary : '#D1D5DB'}
              borderRadius={10}
              paddingVertical="$3"
              alignItems="center"
              justifyContent="center"
              cursor={isDirty ? 'pointer' : 'not-allowed'}
              opacity={updateProduct.isPending ? 0.7 : 1}
              hoverStyle={isDirty ? { backgroundColor: '#2563EB' } : {}}
              onPress={isDirty ? handleSubmit(onSubmit) : undefined}
            >
              <XStack alignItems="center" gap="$2">
                <Save size={16} color={COLORS.white} />
                <Text fontSize={14} fontWeight="600" color={COLORS.white}>
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
