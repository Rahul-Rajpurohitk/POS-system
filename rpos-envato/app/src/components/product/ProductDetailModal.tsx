import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, Input, TextArea } from 'tamagui';
import {
  X, Save, Package, DollarSign, Layers, Hash, FileText, AlertCircle,
  TrendingUp, Box, Check, Truck, Barcode, Tag, Store, Edit3, Trash2,
  Clock, ChevronRight, Copy, ExternalLink, MoreHorizontal, Eye,
  History, Settings, Share2, Printer,
} from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@/utils';
import { useSettingsStore } from '@/store';
import { useCategories } from '@/features/categories/hooks';
import { useUpdateProduct, useDeleteProduct } from '@/features/products/hooks';
import { PartnerToggle, PartnerStatus } from './PartnerToggle';
import { TagInput } from './TagInput';
import { SupplierSelector } from './SupplierSelector';
import { StockHistory } from './StockHistory';
import type { Product, Category, Supplier, PartnerAvailability } from '@/types';

/**
 * Full-Screen Product Detail Modal
 *
 * Design Philosophy:
 * - Full screen for comprehensive product management
 * - Tabbed interface for organized sections
 * - Professional, clean UI
 * - Scalable for future features (datasets, file uploads, business types)
 *
 * Architecture Notes:
 * - Built to support MSMC, Deli, Liquor retail stores
 * - Extensible for future dataset integration
 * - Ready for AI-powered file upload verification
 */

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
  warningLight: '#FEF3C7',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  dark: '#111827',
};

type TabId = 'overview' | 'inventory' | 'partners' | 'activity';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <Package size={16} /> },
  { id: 'inventory', label: 'Inventory', icon: <Box size={16} /> },
  { id: 'partners', label: 'Partners', icon: <Store size={16} /> },
  { id: 'activity', label: 'Activity', icon: <History size={16} /> },
];

// Validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  sellingPrice: z.number().min(0, 'Price must be positive'),
  purchasePrice: z.number().min(0, 'Cost must be positive'),
  quantity: z.number().int().min(0, 'Quantity must be positive'),
  categoryId: z.string().optional(),
  desc: z.string().optional(),
  brand: z.string().optional(),
  primaryBarcode: z.string().optional(),
  taxClass: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  defaultSupplierId: z.string().optional(),
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
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" gap="$2">
        {icon && (
          <YStack
            width={24}
            height={24}
            borderRadius={6}
            backgroundColor={COLORS.primaryLight}
            alignItems="center"
            justifyContent="center"
          >
            {icon}
          </YStack>
        )}
        <Text fontSize={12} fontWeight="600" color={COLORS.gray}>
          {label}
          {required && <Text color={COLORS.error}> *</Text>}
        </Text>
      </XStack>
      {children}
      {error && (
        <XStack alignItems="center" gap="$1" paddingLeft="$1">
          <AlertCircle size={12} color={COLORS.error} />
          <Text fontSize={11} color={COLORS.error}>{error}</Text>
        </XStack>
      )}
    </YStack>
  );
}

// Category selector
function CategorySelector({
  categories,
  value,
  onChange
}: {
  categories: Category[];
  value?: string;
  onChange: (value: string) => void;
}) {
  const categoryList: Category[] = Array.isArray(categories)
    ? categories
    : Array.isArray((categories as any)?.data)
      ? (categories as any).data
      : [];

  return (
    <XStack flexWrap="wrap" gap="$2">
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
        <Text fontSize={12} color={!value ? COLORS.white : COLORS.gray} fontWeight="500">
          None
        </Text>
      </XStack>

      {categoryList.map((cat) => {
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
              <YStack width={10} height={10} borderRadius={5} backgroundColor={catColor} />
            )}
            {isSelected && <Check size={14} color={COLORS.white} />}
            <Text fontSize={12} color={isSelected ? COLORS.white : '#374151'} fontWeight="500">
              {cat.name}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  subValue,
  icon,
  color = COLORS.primary,
  bgColor,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
}) {
  return (
    <YStack
      flex={1}
      backgroundColor={bgColor || COLORS.grayLight}
      padding="$3"
      borderRadius={12}
      gap="$1"
    >
      <XStack alignItems="center" gap="$2">
        {icon}
        <Text fontSize={11} color={COLORS.gray} fontWeight="500">{label}</Text>
      </XStack>
      <Text fontSize={20} fontWeight="800" color={color}>{value}</Text>
      {subValue && <Text fontSize={10} color={COLORS.gray}>{subValue}</Text>}
    </YStack>
  );
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  suppliers?: Supplier[];
  initialTab?: TabId;
  editMode?: boolean;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onSuccess,
  suppliers = [],
  initialTab = 'overview',
  editMode = false,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [isEditing, setIsEditing] = useState(editMode);
  const [partnerAvailability, setPartnerAvailability] = useState<PartnerAvailability>({});

  const { settings } = useSettingsStore();
  const { data: categories = [] } = useCategories();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

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
      brand: '',
      primaryBarcode: '',
      taxClass: 'standard',
      unitOfMeasure: 'each',
      defaultSupplierId: '',
      tags: [],
    },
  });

  const sellingPrice = watch('sellingPrice');
  const purchasePrice = watch('purchasePrice');
  const quantity = watch('quantity');

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
        brand: product.brand || '',
        primaryBarcode: product.primaryBarcode || '',
        taxClass: product.taxClass || 'standard',
        unitOfMeasure: product.unitOfMeasure || 'each',
        defaultSupplierId: product.defaultSupplierId || '',
        tags: product.tags || [],
      });
      setPartnerAvailability(product.partnerAvailability || {});
      setIsEditing(editMode);
      setActiveTab(initialTab);
    }
  }, [product, isOpen, reset, editMode, initialTab]);

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
          brand: data.brand || undefined,
          primaryBarcode: data.primaryBarcode || undefined,
          taxClass: data.taxClass || undefined,
          unitOfMeasure: data.unitOfMeasure || undefined,
          defaultSupplierId: data.defaultSupplierId || undefined,
          partnerAvailability,
          tags: data.tags || [],
        },
      });
      setIsEditing(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct.mutateAsync(product.id);
              onClose();
              onSuccess?.();
            } catch (error) {
              console.error('Failed to delete product:', error);
            }
          },
        },
      ]
    );
  };

  if (!product) return null;

  const categoryName = product.category?.name || 'Uncategorized';
  const categoryColor = product.category?.color || COLORS.gray;
  const stockStatus = (product.quantity ?? 0) === 0 ? 'out' : (product.quantity ?? 0) <= 10 ? 'low' : 'good';

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)">
        <YStack
          flex={1}
          margin="$4"
          marginHorizontal="$6"
          backgroundColor={COLORS.white}
          borderRadius={16}
          overflow="hidden"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.15}
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
            <XStack alignItems="center" gap="$4" flex={1}>
              {/* Product Image/Icon */}
              <YStack
                width={56}
                height={56}
                borderRadius={12}
                backgroundColor={COLORS.primaryLight}
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
              >
                {product.images?.[0] ? (
                  <YStack width="100%" height="100%" backgroundColor={COLORS.grayLight} />
                ) : (
                  <Package size={28} color={COLORS.primary} />
                )}
              </YStack>

              {/* Product Info */}
              <YStack flex={1} gap="$1">
                <XStack alignItems="center" gap="$2">
                  <Text fontSize={20} fontWeight="800" color={COLORS.dark}>
                    {product.name}
                  </Text>
                  <XStack
                    backgroundColor={`${categoryColor}20`}
                    paddingHorizontal="$2"
                    paddingVertical={3}
                    borderRadius={6}
                    alignItems="center"
                    gap={4}
                  >
                    <YStack width={8} height={8} borderRadius={4} backgroundColor={categoryColor} />
                    <Text fontSize={11} color={categoryColor} fontWeight="600">
                      {categoryName}
                    </Text>
                  </XStack>
                </XStack>
                <XStack alignItems="center" gap="$3">
                  <Text fontSize={13} color={COLORS.gray}>SKU: {product.sku}</Text>
                  {product.primaryBarcode && (
                    <>
                      <Text color={COLORS.border}>•</Text>
                      <XStack alignItems="center" gap="$1">
                        <Barcode size={12} color={COLORS.gray} />
                        <Text fontSize={13} color={COLORS.gray}>{product.primaryBarcode}</Text>
                      </XStack>
                    </>
                  )}
                  {product.brand && (
                    <>
                      <Text color={COLORS.border}>•</Text>
                      <Text fontSize={13} color={COLORS.gray}>Brand: {product.brand}</Text>
                    </>
                  )}
                </XStack>
              </YStack>
            </XStack>

            {/* Action Buttons */}
            <XStack alignItems="center" gap="$2">
              {isEditing ? (
                <>
                  <XStack
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius={8}
                    backgroundColor={COLORS.grayLight}
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#F3F4F6' }}
                    onPress={() => {
                      reset();
                      setIsEditing(false);
                    }}
                  >
                    <Text fontSize={13} fontWeight="600" color={COLORS.gray}>
                      Cancel
                    </Text>
                  </XStack>
                  <XStack
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius={8}
                    backgroundColor={isDirty ? COLORS.primary : '#D1D5DB'}
                    alignItems="center"
                    gap="$2"
                    cursor={isDirty ? 'pointer' : 'not-allowed'}
                    opacity={updateProduct.isPending ? 0.7 : 1}
                    hoverStyle={isDirty ? { backgroundColor: '#2563EB' } : {}}
                    onPress={isDirty ? handleSubmit(onSubmit) : undefined}
                  >
                    <Save size={14} color={COLORS.white} />
                    <Text fontSize={13} fontWeight="600" color={COLORS.white}>
                      {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </XStack>
                </>
              ) : (
                <>
                  <XStack
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius={8}
                    backgroundColor={COLORS.primaryLight}
                    alignItems="center"
                    gap="$2"
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: COLORS.primaryBorder }}
                    onPress={() => setIsEditing(true)}
                  >
                    <Edit3 size={14} color={COLORS.primary} />
                    <Text fontSize={13} fontWeight="600" color={COLORS.primary}>
                      Edit
                    </Text>
                  </XStack>
                  <XStack
                    padding="$2"
                    borderRadius={8}
                    backgroundColor={COLORS.grayLight}
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#F3F4F6' }}
                  >
                    <MoreHorizontal size={18} color={COLORS.gray} />
                  </XStack>
                </>
              )}
              <XStack
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
              </XStack>
            </XStack>
          </XStack>

          {/* Tabs */}
          <XStack
            paddingHorizontal="$5"
            backgroundColor={COLORS.grayLight}
            borderBottomWidth={1}
            borderBottomColor={COLORS.border}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <XStack
                  key={tab.id}
                  paddingHorizontal="$4"
                  paddingVertical="$3"
                  alignItems="center"
                  gap="$2"
                  cursor="pointer"
                  borderBottomWidth={2}
                  borderBottomColor={isActive ? COLORS.primary : 'transparent'}
                  marginBottom={-1}
                  hoverStyle={{ backgroundColor: isActive ? 'transparent' : '#F3F4F6' }}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <YStack opacity={isActive ? 1 : 0.6}>
                    {React.cloneElement(tab.icon as React.ReactElement, {
                      color: isActive ? COLORS.primary : COLORS.gray,
                    })}
                  </YStack>
                  <Text
                    fontSize={13}
                    fontWeight={isActive ? '700' : '500'}
                    color={isActive ? COLORS.primary : COLORS.gray}
                  >
                    {tab.label}
                  </Text>
                </XStack>
              );
            })}
          </XStack>

          {/* Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1, backgroundColor: COLORS.grayLight }}
              showsVerticalScrollIndicator={false}
            >
              <YStack padding="$5" gap="$4">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <>
                    {/* Stats Row */}
                    <XStack gap="$3">
                      <StatCard
                        label="Selling Price"
                        value={formatCurrency(product.sellingPrice, settings.currency)}
                        icon={<DollarSign size={14} color={COLORS.success} />}
                        color={COLORS.success}
                        bgColor={COLORS.successLight}
                      />
                      <StatCard
                        label="Cost Price"
                        value={formatCurrency(product.purchasePrice, settings.currency)}
                        icon={<DollarSign size={14} color={COLORS.gray} />}
                      />
                      <StatCard
                        label="Profit Margin"
                        value={`${marginInfo.margin.toFixed(1)}%`}
                        subValue={formatCurrency(marginInfo.profit, settings.currency)}
                        icon={<TrendingUp size={14} color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error} />}
                        color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}
                        bgColor={marginInfo.profit >= 0 ? COLORS.successLight : COLORS.errorLight}
                      />
                      <StatCard
                        label="In Stock"
                        value={product.quantity ?? 0}
                        subValue={stockStatus === 'good' ? 'Well stocked' : stockStatus === 'low' ? 'Low stock' : 'Out of stock'}
                        icon={<Box size={14} color={
                          stockStatus === 'good' ? COLORS.success :
                          stockStatus === 'low' ? COLORS.warning : COLORS.error
                        } />}
                        color={
                          stockStatus === 'good' ? COLORS.success :
                          stockStatus === 'low' ? COLORS.warning : COLORS.error
                        }
                        bgColor={
                          stockStatus === 'good' ? COLORS.successLight :
                          stockStatus === 'low' ? COLORS.warningLight : COLORS.errorLight
                        }
                      />
                    </XStack>

                    {/* Basic Info Card */}
                    <YStack
                      backgroundColor={COLORS.white}
                      borderRadius={12}
                      padding="$4"
                      gap="$4"
                    >
                      <XStack alignItems="center" gap="$2">
                        <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.primary} />
                        <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
                          Basic Information
                        </Text>
                      </XStack>

                      {isEditing ? (
                        <YStack gap="$4">
                          <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value } }) => (
                              <FormField label="Product Name" icon={<Package size={12} color={COLORS.primary} />} error={errors.name?.message} required>
                                <Input
                                  value={value}
                                  onChangeText={onChange}
                                  placeholder="Enter product name"
                                  backgroundColor={COLORS.white}
                                  borderWidth={1}
                                  borderColor={errors.name ? COLORS.error : COLORS.border}
                                  borderRadius={8}
                                  paddingHorizontal="$3"
                                  paddingVertical="$2"
                                  fontSize={13}
                                />
                              </FormField>
                            )}
                          />
                          <XStack gap="$3">
                            <YStack flex={1}>
                              <Controller
                                control={control}
                                name="sku"
                                render={({ field: { onChange, value } }) => (
                                  <FormField label="SKU" icon={<Hash size={12} color={COLORS.primary} />} error={errors.sku?.message} required>
                                    <Input
                                      value={value}
                                      onChangeText={onChange}
                                      placeholder="Enter SKU"
                                      backgroundColor={COLORS.white}
                                      borderWidth={1}
                                      borderColor={COLORS.border}
                                      borderRadius={8}
                                      paddingHorizontal="$3"
                                      paddingVertical="$2"
                                      fontSize={13}
                                    />
                                  </FormField>
                                )}
                              />
                            </YStack>
                            <YStack flex={1}>
                              <Controller
                                control={control}
                                name="brand"
                                render={({ field: { onChange, value } }) => (
                                  <FormField label="Brand" icon={<Tag size={12} color={COLORS.primary} />}>
                                    <Input
                                      value={value || ''}
                                      onChangeText={onChange}
                                      placeholder="Enter brand"
                                      backgroundColor={COLORS.white}
                                      borderWidth={1}
                                      borderColor={COLORS.border}
                                      borderRadius={8}
                                      paddingHorizontal="$3"
                                      paddingVertical="$2"
                                      fontSize={13}
                                    />
                                  </FormField>
                                )}
                              />
                            </YStack>
                            <YStack flex={1}>
                              <Controller
                                control={control}
                                name="primaryBarcode"
                                render={({ field: { onChange, value } }) => (
                                  <FormField label="Barcode" icon={<Barcode size={12} color={COLORS.primary} />}>
                                    <Input
                                      value={value || ''}
                                      onChangeText={onChange}
                                      placeholder="Enter barcode"
                                      backgroundColor={COLORS.white}
                                      borderWidth={1}
                                      borderColor={COLORS.border}
                                      borderRadius={8}
                                      paddingHorizontal="$3"
                                      paddingVertical="$2"
                                      fontSize={13}
                                    />
                                  </FormField>
                                )}
                              />
                            </YStack>
                          </XStack>
                          <Controller
                            control={control}
                            name="categoryId"
                            render={({ field: { onChange, value } }) => (
                              <FormField label="Category" icon={<Layers size={12} color={COLORS.primary} />}>
                                <CategorySelector categories={categories} value={value} onChange={onChange} />
                              </FormField>
                            )}
                          />
                          <Controller
                            control={control}
                            name="desc"
                            render={({ field: { onChange, value } }) => (
                              <FormField label="Description" icon={<FileText size={12} color={COLORS.primary} />}>
                                <TextArea
                                  value={value || ''}
                                  onChangeText={onChange}
                                  placeholder="Enter description"
                                  backgroundColor={COLORS.white}
                                  borderWidth={1}
                                  borderColor={COLORS.border}
                                  borderRadius={8}
                                  padding="$3"
                                  fontSize={13}
                                  minHeight={80}
                                />
                              </FormField>
                            )}
                          />
                        </YStack>
                      ) : (
                        <YStack gap="$3">
                          {product.desc && (
                            <YStack gap="$1">
                              <Text fontSize={12} color={COLORS.gray} fontWeight="500">Description</Text>
                              <Text fontSize={13} color={COLORS.dark} lineHeight={20}>
                                {product.desc}
                              </Text>
                            </YStack>
                          )}
                          <XStack gap="$4" flexWrap="wrap">
                            <YStack gap="$1" minWidth={120}>
                              <Text fontSize={11} color={COLORS.gray}>Tax Class</Text>
                              <Text fontSize={13} color={COLORS.dark} fontWeight="500">
                                {product.taxClass || 'Standard'}
                              </Text>
                            </YStack>
                            <YStack gap="$1" minWidth={120}>
                              <Text fontSize={11} color={COLORS.gray}>Unit</Text>
                              <Text fontSize={13} color={COLORS.dark} fontWeight="500">
                                {product.unitOfMeasure || 'Each'}
                              </Text>
                            </YStack>
                            {product.defaultSupplier && (
                              <YStack gap="$1" minWidth={120}>
                                <Text fontSize={11} color={COLORS.gray}>Default Supplier</Text>
                                <Text fontSize={13} color={COLORS.dark} fontWeight="500">
                                  {product.defaultSupplier.name}
                                </Text>
                              </YStack>
                            )}
                          </XStack>
                        </YStack>
                      )}
                    </YStack>

                    {/* Pricing Card */}
                    {isEditing && (
                      <YStack
                        backgroundColor={COLORS.white}
                        borderRadius={12}
                        padding="$4"
                        gap="$4"
                      >
                        <XStack alignItems="center" gap="$2">
                          <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.success} />
                          <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
                            Pricing
                          </Text>
                        </XStack>

                        <XStack gap="$3">
                          <Controller
                            control={control}
                            name="purchasePrice"
                            render={({ field: { onChange, value } }) => (
                              <YStack flex={1}>
                                <FormField label="Cost Price" icon={<DollarSign size={12} color={COLORS.gray} />}>
                                  <XStack
                                    backgroundColor={COLORS.white}
                                    borderWidth={1}
                                    borderColor={COLORS.border}
                                    borderRadius={8}
                                    alignItems="center"
                                    overflow="hidden"
                                  >
                                    <YStack paddingHorizontal="$3" paddingVertical="$2" backgroundColor={COLORS.grayLight}>
                                      <Text fontSize={13} color={COLORS.gray} fontWeight="600">$</Text>
                                    </YStack>
                                    <Input
                                      flex={1}
                                      value={value?.toString() || ''}
                                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                      keyboardType="decimal-pad"
                                      placeholder="0.00"
                                      backgroundColor="transparent"
                                      borderWidth={0}
                                      paddingHorizontal="$3"
                                      fontSize={13}
                                    />
                                  </XStack>
                                </FormField>
                              </YStack>
                            )}
                          />
                          <Controller
                            control={control}
                            name="sellingPrice"
                            render={({ field: { onChange, value } }) => (
                              <YStack flex={1}>
                                <FormField label="Selling Price" icon={<DollarSign size={12} color={COLORS.success} />}>
                                  <XStack
                                    backgroundColor={COLORS.white}
                                    borderWidth={1}
                                    borderColor={COLORS.border}
                                    borderRadius={8}
                                    alignItems="center"
                                    overflow="hidden"
                                  >
                                    <YStack paddingHorizontal="$3" paddingVertical="$2" backgroundColor={COLORS.successLight}>
                                      <Text fontSize={13} color={COLORS.success} fontWeight="600">$</Text>
                                    </YStack>
                                    <Input
                                      flex={1}
                                      value={value?.toString() || ''}
                                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                      keyboardType="decimal-pad"
                                      placeholder="0.00"
                                      backgroundColor="transparent"
                                      borderWidth={0}
                                      paddingHorizontal="$3"
                                      fontSize={13}
                                    />
                                  </XStack>
                                </FormField>
                              </YStack>
                            )}
                          />
                        </XStack>
                      </YStack>
                    )}

                    {/* Tags */}
                    <YStack
                      backgroundColor={COLORS.white}
                      borderRadius={12}
                      padding="$4"
                      gap="$4"
                    >
                      <XStack alignItems="center" gap="$2">
                        <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.purple} />
                        <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
                          Tags
                        </Text>
                      </XStack>

                      {isEditing ? (
                        <Controller
                          control={control}
                          name="tags"
                          render={({ field: { onChange, value } }) => (
                            <TagInput value={value || []} onChange={onChange} maxTags={10} />
                          )}
                        />
                      ) : (
                        <XStack flexWrap="wrap" gap="$1">
                          {(product.tags || []).length > 0 ? (
                            product.tags?.map((tag) => (
                              <XStack
                                key={tag}
                                backgroundColor={COLORS.purpleLight}
                                paddingHorizontal="$2"
                                paddingVertical={4}
                                borderRadius={6}
                              >
                                <Text fontSize={11} color={COLORS.purple} fontWeight="500">
                                  {tag}
                                </Text>
                              </XStack>
                            ))
                          ) : (
                            <Text fontSize={12} color={COLORS.gray}>No tags</Text>
                          )}
                        </XStack>
                      )}
                    </YStack>
                  </>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                  <StockHistory
                    product={product}
                    onAddStock={() => {/* Open add stock modal */}}
                    onViewAllHistory={() => {/* Navigate to full history */}}
                  />
                )}

                {/* Partners Tab */}
                {activeTab === 'partners' && (
                  <YStack
                    backgroundColor={COLORS.white}
                    borderRadius={12}
                    padding="$4"
                    gap="$4"
                  >
                    <XStack alignItems="center" gap="$2">
                      <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.primary} />
                      <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
                        Delivery Partner Availability
                      </Text>
                    </XStack>

                    <Text fontSize={13} color={COLORS.gray} lineHeight={20}>
                      Select which delivery platforms this product should be available on.
                      Products marked as available will be synced with partner catalogs.
                    </Text>

                    {isEditing ? (
                      <PartnerToggle
                        value={partnerAvailability}
                        onChange={setPartnerAvailability}
                        size="lg"
                      />
                    ) : (
                      <PartnerToggle
                        value={product.partnerAvailability || {}}
                        onChange={() => {}}
                        disabled
                        size="lg"
                      />
                    )}
                  </YStack>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <YStack
                    backgroundColor={COLORS.white}
                    borderRadius={12}
                    padding="$4"
                    gap="$4"
                  >
                    <XStack alignItems="center" gap="$2">
                      <YStack width={4} height={20} borderRadius={2} backgroundColor={COLORS.gray} />
                      <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
                        Activity Log
                      </Text>
                    </XStack>

                    <YStack gap="$3">
                      {/* Mock activity items */}
                      {[
                        { action: 'Product updated', user: 'John Manager', time: '2 hours ago' },
                        { action: 'Stock adjusted (+50)', user: 'Sarah Staff', time: 'Yesterday' },
                        { action: 'Price changed', user: 'John Manager', time: '3 days ago' },
                        { action: 'Product created', user: 'Admin', time: '2 weeks ago' },
                      ].map((item, index) => (
                        <XStack
                          key={index}
                          alignItems="center"
                          gap="$3"
                          paddingVertical="$2"
                          borderBottomWidth={index < 3 ? 1 : 0}
                          borderBottomColor={COLORS.border}
                        >
                          <YStack
                            width={32}
                            height={32}
                            borderRadius={16}
                            backgroundColor={COLORS.grayLight}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Clock size={14} color={COLORS.gray} />
                          </YStack>
                          <YStack flex={1}>
                            <Text fontSize={13} color={COLORS.dark} fontWeight="500">
                              {item.action}
                            </Text>
                            <Text fontSize={11} color={COLORS.gray}>
                              by {item.user}
                            </Text>
                          </YStack>
                          <Text fontSize={11} color={COLORS.gray}>{item.time}</Text>
                        </XStack>
                      ))}
                    </YStack>
                  </YStack>
                )}
              </YStack>
            </ScrollView>
          </KeyboardAvoidingView>
        </YStack>
      </YStack>
    </Modal>
  );
}

export default ProductDetailModal;
