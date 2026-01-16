import React, { useState, useMemo, useCallback } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { YStack, XStack, Text, ScrollView, Input, TextArea } from 'tamagui';
import {
  ArrowLeft, Camera, Barcode, Package, DollarSign, Box, Tag, Truck,
  Tags as TagsIcon, Check, AlertCircle, TrendingUp, Plus, Image as ImageIcon,
  Percent, Hash, FileText, Layers, Scale, Ruler, ChevronDown, X, Sparkles,
} from '@tamagui/lucide-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PartnerToggle, TagInput, SupplierSelector } from '@/components/product';
import { useCreateProduct } from '@/features/products';
import { useCategories } from '@/features/categories';
import { useSuppliers } from '@/features/suppliers';
import type { ProductScreenProps } from '@/navigation/types';
import type { PartnerAvailability, Category } from '@/types';

// Professional color palette
const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  success: '#10B981',
  successLight: '#D1FAE5',
  successBorder: '#A7F3D0',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningBorder: '#FCD34D',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  teal: '#14B8A6',
  tealLight: '#CCFBF1',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  dark: '#111827',
};

// Validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().optional(),
  brand: z.string().optional(),
  primaryBarcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  defaultSupplierId: z.string().optional(),
  sellingPrice: z.string().refine(v => v === '' || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), 'Invalid price'),
  purchasePrice: z.string().refine(v => v === '' || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), 'Invalid price'),
  quantity: z.string().refine(v => v === '' || (!isNaN(parseInt(v)) && parseInt(v) >= 0), 'Invalid quantity'),
  minStock: z.string().optional(),
  taxClass: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  weight: z.string().optional(),
  weightUnit: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  dimensionUnit: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

// Form field wrapper component
function FormField({
  label,
  icon,
  iconColor = COLORS.primary,
  iconBg = COLORS.primaryLight,
  error,
  required = false,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" gap="$2">
        {icon && (
          <YStack
            width={26}
            height={26}
            borderRadius={6}
            backgroundColor={iconBg}
            alignItems="center"
            justifyContent="center"
          >
            {icon}
          </YStack>
        )}
        <Text fontSize={13} fontWeight="600" color={COLORS.gray}>
          {label}
          {required && <Text color={COLORS.error}> *</Text>}
        </Text>
      </XStack>
      {children}
      {hint && !error && (
        <Text fontSize={11} color={COLORS.gray}>{hint}</Text>
      )}
      {error && (
        <XStack alignItems="center" gap="$1">
          <AlertCircle size={12} color={COLORS.error} />
          <Text fontSize={12} color={COLORS.error}>{error}</Text>
        </XStack>
      )}
    </YStack>
  );
}

// Section card component
function Section({
  title,
  icon,
  accentColor = COLORS.primary,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <YStack
      backgroundColor={COLORS.white}
      borderRadius={12}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.05}
      shadowRadius={3}
      elevation={1}
      overflow="hidden"
    >
      <Pressable onPress={collapsible ? () => setIsOpen(!isOpen) : undefined}>
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          alignItems="center"
          gap="$2"
          borderBottomWidth={isOpen ? 1 : 0}
          borderBottomColor={COLORS.border}
        >
          <YStack width={4} height={20} borderRadius={2} backgroundColor={accentColor} />
          <YStack
            width={32}
            height={32}
            borderRadius={8}
            backgroundColor={accentColor + '15'}
            alignItems="center"
            justifyContent="center"
          >
            {icon}
          </YStack>
          <Text fontSize={15} fontWeight="700" color={COLORS.dark} flex={1}>
            {title}
          </Text>
          {collapsible && (
            <ChevronDown
              size={18}
              color={COLORS.gray}
              style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
            />
          )}
        </XStack>
      </Pressable>
      {isOpen && (
        <YStack padding="$4" gap="$4">
          {children}
        </YStack>
      )}
    </YStack>
  );
}

// Category chip selector
function CategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value?: string;
  onChange: (value: string) => void;
}) {
  const categoryList = Array.isArray(categories) ? categories : [];

  return (
    <XStack flexWrap="wrap" gap="$2">
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius={20}
        backgroundColor={!value ? COLORS.primary : COLORS.white}
        borderWidth={1}
        borderColor={!value ? COLORS.primary : COLORS.border}
        alignItems="center"
        gap="$1"
        cursor="pointer"
        hoverStyle={{ borderColor: COLORS.primary }}
        onPress={() => onChange('')}
      >
        {!value && <Check size={14} color={COLORS.white} />}
        <Text fontSize={13} color={!value ? COLORS.white : COLORS.gray} fontWeight="500">
          None
        </Text>
      </XStack>
      {categoryList.map((cat) => {
        const isSelected = value === cat.id;
        const catColor = cat.color || COLORS.primary;
        return (
          <XStack
            key={cat.id}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius={20}
            backgroundColor={isSelected ? catColor : COLORS.white}
            borderWidth={1}
            borderColor={isSelected ? catColor : COLORS.border}
            alignItems="center"
            gap="$1"
            cursor="pointer"
            hoverStyle={{ borderColor: catColor }}
            onPress={() => onChange(cat.id)}
          >
            {!isSelected && (
              <YStack width={10} height={10} borderRadius={5} backgroundColor={catColor} />
            )}
            {isSelected && <Check size={14} color={COLORS.white} />}
            <Text fontSize={13} color={isSelected ? COLORS.white : COLORS.dark} fontWeight="500">
              {cat.name}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

// Unit selector pills
function UnitPills({
  options,
  value,
  onChange,
  accentColor = COLORS.primary,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  accentColor?: string;
}) {
  return (
    <XStack gap="$1" flexWrap="wrap">
      {options.map((opt) => (
        <XStack
          key={opt}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius={6}
          backgroundColor={value === opt ? accentColor : COLORS.white}
          borderWidth={1}
          borderColor={value === opt ? accentColor : COLORS.border}
          cursor="pointer"
          hoverStyle={{ borderColor: accentColor }}
          onPress={() => onChange(opt)}
        >
          <Text
            fontSize={12}
            fontWeight="600"
            color={value === opt ? COLORS.white : COLORS.gray}
          >
            {opt}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

export default function AddProductScreen({ navigation }: ProductScreenProps<'AddProduct'>) {
  const createProduct = useCreateProduct();
  const { data: categories = [] } = useCategories();
  const { data: suppliersData } = useSuppliers();
  const suppliers = Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || [];

  const [partnerAvailability, setPartnerAvailability] = useState<PartnerAvailability>({});
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      brand: '',
      primaryBarcode: '',
      description: '',
      categoryId: '',
      defaultSupplierId: '',
      sellingPrice: '',
      purchasePrice: '',
      quantity: '0',
      minStock: '10',
      taxClass: 'standard',
      unitOfMeasure: 'each',
      weight: '',
      weightUnit: 'kg',
      length: '',
      width: '',
      height: '',
      dimensionUnit: 'cm',
    },
  });

  const sellingPrice = watch('sellingPrice');
  const purchasePrice = watch('purchasePrice');

  // Calculate margin and profit
  const marginInfo = useMemo(() => {
    const sell = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(purchasePrice) || 0;
    if (sell <= 0) return null;
    const profit = sell - cost;
    const margin = (profit / sell) * 100;
    return { profit, margin, isLow: margin < 15 };
  }, [sellingPrice, purchasePrice]);

  const onSubmit = useCallback((data: ProductForm) => {
    createProduct.mutate(
      {
        name: data.name,
        sku: data.sku || undefined,
        brand: data.brand || undefined,
        primaryBarcode: data.primaryBarcode || undefined,
        description: data.description || undefined,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        purchasePrice: parseFloat(data.purchasePrice) || 0,
        stock: parseInt(data.quantity) || 0,
        minStock: data.minStock ? parseInt(data.minStock) : undefined,
        categoryId: data.categoryId || undefined,
        defaultSupplierId: data.defaultSupplierId || undefined,
        taxClass: data.taxClass || undefined,
        unitOfMeasure: data.unitOfMeasure || undefined,
        partnerAvailability: Object.keys(partnerAvailability).length > 0 ? partnerAvailability : undefined,
        tags: tags.length > 0 ? tags : undefined,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        weightUnit: data.weightUnit || undefined,
        length: data.length ? parseFloat(data.length) : undefined,
        width: data.width ? parseFloat(data.width) : undefined,
        height: data.height ? parseFloat(data.height) : undefined,
        dimensionUnit: data.dimensionUnit || undefined,
        images: images.length > 0 ? images : undefined,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (error) => Alert.alert('Error', error.message || 'Failed to create product'),
      }
    );
  }, [createProduct, navigation, partnerAvailability, tags, images]);

  const handleAddImage = useCallback(() => {
    Alert.alert(
      'Add Product Image',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => {} },
        { text: 'Choose from Library', onPress: () => {} },
        { text: 'Enter URL', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handleScanBarcode = useCallback(() => {
    Alert.alert('Barcode Scanner', 'Camera barcode scanning coming soon!');
  }, []);

  const generateSKU = useCallback(() => {
    const name = watch('name');
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setValue('sku', `${prefix}-${random}`);
  }, [watch, setValue]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <YStack flex={1} backgroundColor={COLORS.grayLight}>
        {/* Header */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          alignItems="center"
          gap="$3"
          backgroundColor={COLORS.white}
          borderBottomWidth={1}
          borderBottomColor={COLORS.border}
        >
          <XStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={COLORS.grayLight}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#F3F4F6' }}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={COLORS.dark} />
          </XStack>

          <YStack flex={1}>
            <Text fontSize={18} fontWeight="700" color={COLORS.dark}>
              Add Product
            </Text>
            <Text fontSize={12} color={COLORS.gray}>
              Create a new product for your inventory
            </Text>
          </YStack>

          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius={10}
            backgroundColor={createProduct.isPending ? COLORS.grayLight : COLORS.primary}
            alignItems="center"
            justifyContent="center"
            cursor={createProduct.isPending ? 'not-allowed' : 'pointer'}
            hoverStyle={!createProduct.isPending ? { backgroundColor: '#2563EB' } : {}}
            pressStyle={!createProduct.isPending ? { transform: [{ scale: 0.98 }] } : {}}
            onPress={!createProduct.isPending ? handleSubmit(onSubmit) : undefined}
          >
            <XStack alignItems="center" gap="$2">
              {createProduct.isPending ? (
                <Text fontSize={14} fontWeight="600" color={COLORS.gray}>Saving...</Text>
              ) : (
                <>
                  <Check size={18} color={COLORS.white} />
                  <Text fontSize={14} fontWeight="600" color={COLORS.white}>Save Product</Text>
                </>
              )}
            </XStack>
          </XStack>
        </XStack>

        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack padding="$4" gap="$4">
            {/* Product Image Section */}
            <Section
              title="Product Images"
              icon={<ImageIcon size={16} color={COLORS.purple} />}
              accentColor={COLORS.purple}
            >
              <YStack gap="$3">
                <XStack gap="$3" flexWrap="wrap">
                  {/* Main Image Placeholder */}
                  <YStack
                    width={140}
                    height={140}
                    borderRadius={12}
                    borderWidth={2}
                    borderColor={COLORS.border}
                    borderStyle="dashed"
                    backgroundColor={COLORS.grayLight}
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    hoverStyle={{ borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight }}
                    onPress={handleAddImage}
                  >
                    <YStack
                      width={48}
                      height={48}
                      borderRadius={24}
                      backgroundColor={COLORS.purpleLight}
                      alignItems="center"
                      justifyContent="center"
                      marginBottom="$2"
                    >
                      <Camera size={24} color={COLORS.purple} />
                    </YStack>
                    <Text fontSize={13} fontWeight="600" color={COLORS.purple}>
                      Add Image
                    </Text>
                    <Text fontSize={11} color={COLORS.gray}>
                      or drag & drop
                    </Text>
                  </YStack>

                  {/* Additional image slots */}
                  {[1, 2, 3].map((i) => (
                    <YStack
                      key={i}
                      width={80}
                      height={80}
                      borderRadius={10}
                      borderWidth={1}
                      borderColor={COLORS.border}
                      borderStyle="dashed"
                      backgroundColor={COLORS.grayLight}
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      hoverStyle={{ borderColor: COLORS.purple }}
                      onPress={handleAddImage}
                    >
                      <Plus size={20} color={COLORS.gray} />
                    </YStack>
                  ))}
                </XStack>
                <Text fontSize={11} color={COLORS.gray}>
                  Upload up to 4 images. First image will be used as the main product photo.
                </Text>
              </YStack>
            </Section>

            {/* Basic Information */}
            <Section
              title="Basic Information"
              icon={<Package size={16} color={COLORS.primary} />}
              accentColor={COLORS.primary}
            >
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    label="Product Name"
                    icon={<Package size={14} color={COLORS.primary} />}
                    error={errors.name?.message}
                    required
                  >
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter product name"
                      backgroundColor={COLORS.white}
                      borderWidth={1}
                      borderColor={errors.name ? COLORS.error : COLORS.border}
                      borderRadius={10}
                      paddingHorizontal="$3"
                      paddingVertical="$3"
                      fontSize={14}
                      color={COLORS.dark}
                      placeholderTextColor={COLORS.gray}
                      focusStyle={{ borderColor: COLORS.primary }}
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
                      <FormField
                        label="SKU"
                        icon={<Hash size={14} color={COLORS.primary} />}
                        hint="Auto-generated if blank"
                      >
                        <XStack gap="$2">
                          <Input
                            flex={1}
                            value={value}
                            onChangeText={onChange}
                            placeholder="PRD-XXXXXX"
                            backgroundColor={COLORS.white}
                            borderWidth={1}
                            borderColor={COLORS.border}
                            borderRadius={10}
                            paddingHorizontal="$3"
                            paddingVertical="$3"
                            fontSize={14}
                            color={COLORS.dark}
                            placeholderTextColor={COLORS.gray}
                            focusStyle={{ borderColor: COLORS.primary }}
                          />
                          <XStack
                            width={44}
                            height={44}
                            borderRadius={10}
                            backgroundColor={COLORS.primaryLight}
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            hoverStyle={{ backgroundColor: COLORS.primaryBorder }}
                            onPress={generateSKU}
                          >
                            <Sparkles size={18} color={COLORS.primary} />
                          </XStack>
                        </XStack>
                      </FormField>
                    )}
                  />
                </YStack>

                <YStack flex={1}>
                  <Controller
                    control={control}
                    name="brand"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Brand"
                        icon={<Tag size={14} color={COLORS.primary} />}
                      >
                        <Input
                          value={value}
                          onChangeText={onChange}
                          placeholder="Brand name"
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={COLORS.border}
                          borderRadius={10}
                          paddingHorizontal="$3"
                          paddingVertical="$3"
                          fontSize={14}
                          color={COLORS.dark}
                          placeholderTextColor={COLORS.gray}
                          focusStyle={{ borderColor: COLORS.primary }}
                        />
                      </FormField>
                    )}
                  />
                </YStack>
              </XStack>

              <Controller
                control={control}
                name="primaryBarcode"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    label="Barcode"
                    icon={<Barcode size={14} color={COLORS.primary} />}
                  >
                    <XStack gap="$2">
                      <Input
                        flex={1}
                        value={value}
                        onChangeText={onChange}
                        placeholder="UPC / EAN / SKU barcode"
                        backgroundColor={COLORS.white}
                        borderWidth={1}
                        borderColor={COLORS.border}
                        borderRadius={10}
                        paddingHorizontal="$3"
                        paddingVertical="$3"
                        fontSize={14}
                        color={COLORS.dark}
                        placeholderTextColor={COLORS.gray}
                        focusStyle={{ borderColor: COLORS.primary }}
                      />
                      <XStack
                        width={44}
                        height={44}
                        borderRadius={10}
                        backgroundColor={COLORS.grayLight}
                        alignItems="center"
                        justifyContent="center"
                        cursor="pointer"
                        hoverStyle={{ backgroundColor: '#F3F4F6' }}
                        onPress={handleScanBarcode}
                      >
                        <Barcode size={18} color={COLORS.gray} />
                      </XStack>
                    </XStack>
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
                name="description"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    label="Description"
                    icon={<FileText size={14} color={COLORS.primary} />}
                  >
                    <TextArea
                      value={value}
                      onChangeText={onChange}
                      placeholder="Product description (optional)"
                      backgroundColor={COLORS.white}
                      borderWidth={1}
                      borderColor={COLORS.border}
                      borderRadius={10}
                      padding="$3"
                      fontSize={14}
                      color={COLORS.dark}
                      placeholderTextColor={COLORS.gray}
                      minHeight={80}
                      focusStyle={{ borderColor: COLORS.primary }}
                    />
                  </FormField>
                )}
              />
            </Section>

            {/* Pricing Section */}
            <Section
              title="Pricing"
              icon={<DollarSign size={16} color={COLORS.success} />}
              accentColor={COLORS.success}
            >
              <XStack gap="$3">
                <YStack flex={1}>
                  <Controller
                    control={control}
                    name="purchasePrice"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Cost Price"
                        icon={<DollarSign size={14} color={COLORS.gray} />}
                        iconBg={COLORS.grayLight}
                        error={errors.purchasePrice?.message}
                        required
                      >
                        <XStack
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={errors.purchasePrice ? COLORS.error : COLORS.border}
                          borderRadius={10}
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
                            value={value}
                            onChangeText={onChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            backgroundColor="transparent"
                            borderWidth={0}
                            paddingHorizontal="$3"
                            fontSize={15}
                            fontWeight="600"
                            color={COLORS.dark}
                            placeholderTextColor={COLORS.gray}
                          />
                        </XStack>
                      </FormField>
                    )}
                  />
                </YStack>

                <YStack flex={1}>
                  <Controller
                    control={control}
                    name="sellingPrice"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Selling Price"
                        icon={<DollarSign size={14} color={COLORS.success} />}
                        iconBg={COLORS.successLight}
                        error={errors.sellingPrice?.message}
                        required
                      >
                        <XStack
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={errors.sellingPrice ? COLORS.error : COLORS.border}
                          borderRadius={10}
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
                            value={value}
                            onChangeText={onChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            backgroundColor="transparent"
                            borderWidth={0}
                            paddingHorizontal="$3"
                            fontSize={15}
                            fontWeight="600"
                            color={COLORS.dark}
                            placeholderTextColor={COLORS.gray}
                          />
                        </XStack>
                      </FormField>
                    )}
                  />
                </YStack>
              </XStack>

              {/* Margin Calculator */}
              {marginInfo && (
                <XStack
                  backgroundColor={marginInfo.isLow ? COLORS.warningLight : COLORS.successLight}
                  padding="$3"
                  borderRadius={10}
                  borderWidth={1}
                  borderColor={marginInfo.isLow ? COLORS.warningBorder : COLORS.successBorder}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <XStack alignItems="center" gap="$2">
                    <TrendingUp size={18} color={marginInfo.isLow ? COLORS.warning : COLORS.success} />
                    <YStack>
                      <Text fontSize={12} color={marginInfo.isLow ? COLORS.warning : COLORS.success} fontWeight="600">
                        Profit Margin
                      </Text>
                      {marginInfo.isLow && (
                        <Text fontSize={10} color={COLORS.warning}>Low margin warning</Text>
                      )}
                    </YStack>
                  </XStack>
                  <XStack alignItems="center" gap="$3">
                    <YStack alignItems="flex-end">
                      <Text fontSize={11} color={COLORS.gray}>Profit</Text>
                      <Text fontSize={16} fontWeight="700" color={marginInfo.profit >= 0 ? COLORS.success : COLORS.error}>
                        ${marginInfo.profit.toFixed(2)}
                      </Text>
                    </YStack>
                    <YStack
                      backgroundColor={marginInfo.isLow ? COLORS.warning : COLORS.success}
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      borderRadius={6}
                    >
                      <Text fontSize={13} fontWeight="700" color={COLORS.white}>
                        {marginInfo.margin.toFixed(1)}%
                      </Text>
                    </YStack>
                  </XStack>
                </XStack>
              )}
            </Section>

            {/* Inventory Section */}
            <Section
              title="Inventory"
              icon={<Box size={16} color={COLORS.warning} />}
              accentColor={COLORS.warning}
            >
              <XStack gap="$3">
                <YStack flex={1}>
                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Initial Stock"
                        icon={<Box size={14} color={COLORS.warning} />}
                        iconBg={COLORS.warningLight}
                        error={errors.quantity?.message}
                      >
                        <XStack
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={COLORS.border}
                          borderRadius={10}
                          alignItems="center"
                          overflow="hidden"
                        >
                          <Input
                            flex={1}
                            value={value}
                            onChangeText={onChange}
                            keyboardType="number-pad"
                            placeholder="0"
                            backgroundColor="transparent"
                            borderWidth={0}
                            paddingHorizontal="$3"
                            paddingVertical="$3"
                            fontSize={15}
                            fontWeight="600"
                            color={COLORS.dark}
                            placeholderTextColor={COLORS.gray}
                          />
                          <Text paddingRight="$3" fontSize={13} color={COLORS.gray}>units</Text>
                        </XStack>
                      </FormField>
                    )}
                  />
                </YStack>

                <YStack flex={1}>
                  <Controller
                    control={control}
                    name="minStock"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Low Stock Alert"
                        icon={<AlertCircle size={14} color={COLORS.error} />}
                        iconBg={COLORS.errorLight}
                        hint="Get notified when stock is low"
                      >
                        <XStack
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={COLORS.border}
                          borderRadius={10}
                          alignItems="center"
                          overflow="hidden"
                        >
                          <Input
                            flex={1}
                            value={value}
                            onChangeText={onChange}
                            keyboardType="number-pad"
                            placeholder="10"
                            backgroundColor="transparent"
                            borderWidth={0}
                            paddingHorizontal="$3"
                            paddingVertical="$3"
                            fontSize={15}
                            fontWeight="600"
                            color={COLORS.dark}
                            placeholderTextColor={COLORS.gray}
                          />
                          <Text paddingRight="$3" fontSize={13} color={COLORS.gray}>units</Text>
                        </XStack>
                      </FormField>
                    )}
                  />
                </YStack>
              </XStack>

              <Controller
                control={control}
                name="unitOfMeasure"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    label="Unit of Measure"
                    icon={<Scale size={14} color={COLORS.warning} />}
                    iconBg={COLORS.warningLight}
                  >
                    <UnitPills
                      options={['each', 'piece', 'lb', 'kg', 'oz', 'g', 'L', 'ml']}
                      value={value || 'each'}
                      onChange={onChange}
                      accentColor={COLORS.warning}
                    />
                  </FormField>
                )}
              />
            </Section>

            {/* Supplier Section */}
            {suppliers.length > 0 && (
              <Section
                title="Supplier"
                icon={<Truck size={16} color={COLORS.teal} />}
                accentColor={COLORS.teal}
                collapsible
                defaultOpen={false}
              >
                <Controller
                  control={control}
                  name="defaultSupplierId"
                  render={({ field: { onChange, value } }) => (
                    <FormField
                      label="Default Supplier"
                      icon={<Truck size={14} color={COLORS.teal} />}
                      iconBg={COLORS.tealLight}
                      hint="Used when creating purchase orders"
                    >
                      <SupplierSelector
                        suppliers={suppliers}
                        value={value || null}
                        onChange={(id) => onChange(id || '')}
                        placeholder="Select supplier..."
                      />
                    </FormField>
                  )}
                />
              </Section>
            )}

            {/* Partner Availability */}
            <Section
              title="Partner Availability"
              icon={<Truck size={16} color={COLORS.orange} />}
              accentColor={COLORS.orange}
              collapsible
              defaultOpen={false}
            >
              <Text fontSize={12} color={COLORS.gray} marginBottom="$2">
                Select which delivery partners can list this product
              </Text>
              <PartnerToggle
                value={partnerAvailability}
                onChange={setPartnerAvailability}
                size="md"
              />
            </Section>

            {/* Tags */}
            <Section
              title="Tags & Keywords"
              icon={<TagsIcon size={16} color={COLORS.purple} />}
              accentColor={COLORS.purple}
              collapsible
              defaultOpen={false}
            >
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="Add tags for better searchability..."
                maxTags={10}
              />
              <Text fontSize={11} color={COLORS.gray} marginTop="$2">
                Tags help customers find products. Press Enter or comma to add.
              </Text>
            </Section>

            {/* Shipping & Dimensions */}
            <Section
              title="Shipping & Dimensions"
              icon={<Ruler size={16} color={COLORS.gray} />}
              accentColor={COLORS.gray}
              collapsible
              defaultOpen={false}
            >
              <XStack gap="$3" alignItems="flex-end">
                <YStack flex={2}>
                  <Controller
                    control={control}
                    name="weight"
                    render={({ field: { onChange, value } }) => (
                      <FormField
                        label="Weight"
                        icon={<Scale size={14} color={COLORS.gray} />}
                        iconBg={COLORS.grayLight}
                      >
                        <Input
                          value={value}
                          onChangeText={onChange}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          backgroundColor={COLORS.white}
                          borderWidth={1}
                          borderColor={COLORS.border}
                          borderRadius={10}
                          paddingHorizontal="$3"
                          paddingVertical="$3"
                          fontSize={14}
                          color={COLORS.dark}
                          placeholderTextColor={COLORS.gray}
                        />
                      </FormField>
                    )}
                  />
                </YStack>
                <YStack flex={1}>
                  <Controller
                    control={control}
                    name="weightUnit"
                    render={({ field: { onChange, value } }) => (
                      <UnitPills
                        options={['kg', 'lb', 'oz', 'g']}
                        value={value || 'kg'}
                        onChange={onChange}
                      />
                    )}
                  />
                </YStack>
              </XStack>

              <FormField
                label="Dimensions (L × W × H)"
                icon={<Ruler size={14} color={COLORS.gray} />}
                iconBg={COLORS.grayLight}
              >
                <XStack gap="$2" alignItems="center">
                  <Controller
                    control={control}
                    name="length"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        flex={1}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="L"
                        textAlign="center"
                        backgroundColor={COLORS.white}
                        borderWidth={1}
                        borderColor={COLORS.border}
                        borderRadius={8}
                        paddingVertical="$2"
                        fontSize={13}
                        color={COLORS.dark}
                      />
                    )}
                  />
                  <Text color={COLORS.gray}>×</Text>
                  <Controller
                    control={control}
                    name="width"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        flex={1}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="W"
                        textAlign="center"
                        backgroundColor={COLORS.white}
                        borderWidth={1}
                        borderColor={COLORS.border}
                        borderRadius={8}
                        paddingVertical="$2"
                        fontSize={13}
                        color={COLORS.dark}
                      />
                    )}
                  />
                  <Text color={COLORS.gray}>×</Text>
                  <Controller
                    control={control}
                    name="height"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        flex={1}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="H"
                        textAlign="center"
                        backgroundColor={COLORS.white}
                        borderWidth={1}
                        borderColor={COLORS.border}
                        borderRadius={8}
                        paddingVertical="$2"
                        fontSize={13}
                        color={COLORS.dark}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="dimensionUnit"
                    render={({ field: { onChange, value } }) => (
                      <UnitPills
                        options={['cm', 'in']}
                        value={value || 'cm'}
                        onChange={onChange}
                      />
                    )}
                  />
                </XStack>
              </FormField>
            </Section>

            {/* Bottom spacing for scroll */}
            <YStack height={100} />
          </YStack>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
