import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import {
  Package, Truck, Ruler, Tag, DollarSign, Barcode, Building2,
  Scale, Box, Calendar, MapPin, Hash, Info, AlertCircle,
} from '@tamagui/lucide-icons';
import type { Product, Supplier } from '@/types';

/**
 * Product Info Sections - Reusable UI Components
 *
 * Design Philosophy:
 * - Domain-driven component design for retail POS
 * - Extensible for MSMC, Deli, Liquor store types
 * - Follows business entity relationships
 * - Ready for future dataset integration
 */

const COLORS = {
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  gray: '#6B7280',
  grayLight: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
  dark: '#111827',
};

// ============ Reusable Base Components ============

interface InfoSectionProps {
  title: string;
  icon?: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * InfoSection - Reusable card wrapper with title
 */
export function InfoSection({
  title,
  icon,
  accentColor = COLORS.primary,
  children,
  action,
}: InfoSectionProps) {
  return (
    <YStack
      backgroundColor={COLORS.white}
      borderRadius={12}
      padding="$4"
      gap="$3"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <YStack width={4} height={20} borderRadius={2} backgroundColor={accentColor} />
          {icon && (
            <YStack
              width={28}
              height={28}
              borderRadius={8}
              backgroundColor={`${accentColor}15`}
              alignItems="center"
              justifyContent="center"
            >
              {icon}
            </YStack>
          )}
          <Text fontSize={15} fontWeight="700" color={COLORS.dark}>
            {title}
          </Text>
        </XStack>
        {action}
      </XStack>
      {children}
    </YStack>
  );
}

interface InfoItemProps {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
  emptyText?: string;
  highlight?: boolean;
  minWidth?: number;
}

/**
 * InfoItem - Single key-value display
 */
export function InfoItem({
  label,
  value,
  icon,
  emptyText = 'Not set',
  highlight = false,
  minWidth = 120,
}: InfoItemProps) {
  const displayValue = value !== null && value !== undefined && value !== '' ? value : emptyText;
  const isEmpty = !value;

  return (
    <YStack gap="$1" minWidth={minWidth}>
      <XStack alignItems="center" gap="$1">
        {icon}
        <Text fontSize={11} color={COLORS.gray} fontWeight="500">
          {label}
        </Text>
      </XStack>
      <Text
        fontSize={13}
        color={isEmpty ? COLORS.gray : highlight ? COLORS.primary : COLORS.dark}
        fontWeight={isEmpty ? '400' : '600'}
        opacity={isEmpty ? 0.6 : 1}
      >
        {displayValue}
      </Text>
    </YStack>
  );
}

interface InfoGridProps {
  children: React.ReactNode;
  columns?: number;
}

/**
 * InfoGrid - Grid layout for info items
 */
export function InfoGrid({ children, columns = 3 }: InfoGridProps) {
  return (
    <XStack gap="$4" flexWrap="wrap">
      {children}
    </XStack>
  );
}

// ============ Domain-Specific Sections ============

interface SupplierSectionProps {
  supplier?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  onViewSupplier?: () => void;
}

/**
 * SupplierSection - Display supplier/sourcing information
 */
export function SupplierSection({ supplier, onViewSupplier }: SupplierSectionProps) {
  return (
    <InfoSection
      title="Supplier & Sourcing"
      icon={<Building2 size={14} color={COLORS.orange} />}
      accentColor={COLORS.orange}
      action={
        supplier && onViewSupplier ? (
          <XStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius={6}
            backgroundColor={COLORS.orangeLight}
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#FFEDD5' }}
            onPress={onViewSupplier}
          >
            <Text fontSize={11} color={COLORS.orange} fontWeight="600">
              View Supplier
            </Text>
          </XStack>
        ) : undefined
      }
    >
      {supplier ? (
        <XStack
          backgroundColor={COLORS.orangeLight}
          padding="$3"
          borderRadius={10}
          alignItems="center"
          gap="$3"
        >
          <YStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={COLORS.orange}
            alignItems="center"
            justifyContent="center"
          >
            <Building2 size={20} color={COLORS.white} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={14} fontWeight="700" color={COLORS.dark}>
              {supplier.name}
            </Text>
            {supplier.code && (
              <XStack alignItems="center" gap="$1">
                <Text fontSize={11} color={COLORS.gray}>Code:</Text>
                <XStack
                  backgroundColor={COLORS.white}
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={4}
                >
                  <Text fontSize={11} color={COLORS.orange} fontWeight="600">
                    {supplier.code}
                  </Text>
                </XStack>
              </XStack>
            )}
          </YStack>
        </XStack>
      ) : (
        <XStack
          backgroundColor={COLORS.grayLight}
          padding="$3"
          borderRadius={10}
          alignItems="center"
          gap="$3"
        >
          <YStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={COLORS.border}
            alignItems="center"
            justifyContent="center"
          >
            <Building2 size={20} color={COLORS.gray} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={13} color={COLORS.gray} fontWeight="500">
              No default supplier assigned
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Assign a supplier to track sourcing
            </Text>
          </YStack>
        </XStack>
      )}
    </InfoSection>
  );
}

interface DimensionsSectionProps {
  weight?: number | null;
  weightUnit?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string;
}

/**
 * DimensionsSection - Display shipping dimensions
 */
export function DimensionsSection({
  weight,
  weightUnit = 'kg',
  length,
  width,
  height,
  dimensionUnit = 'cm',
}: DimensionsSectionProps) {
  const hasDimensions = length || width || height;
  const hasWeight = weight;
  const hasAnyData = hasDimensions || hasWeight;

  return (
    <InfoSection
      title="Shipping Dimensions"
      icon={<Ruler size={14} color={COLORS.purple} />}
      accentColor={COLORS.purple}
    >
      {hasAnyData ? (
        <XStack gap="$4" flexWrap="wrap">
          {/* Weight */}
          <YStack
            flex={1}
            minWidth={140}
            backgroundColor={COLORS.purpleLight}
            padding="$3"
            borderRadius={10}
            gap="$2"
          >
            <XStack alignItems="center" gap="$2">
              <Scale size={14} color={COLORS.purple} />
              <Text fontSize={11} color={COLORS.purple} fontWeight="600">
                Weight
              </Text>
            </XStack>
            <Text fontSize={18} fontWeight="800" color={COLORS.dark}>
              {hasWeight ? `${weight} ${weightUnit}` : 'Not set'}
            </Text>
          </YStack>

          {/* Dimensions */}
          <YStack
            flex={2}
            minWidth={200}
            backgroundColor={COLORS.grayLight}
            padding="$3"
            borderRadius={10}
            gap="$2"
          >
            <XStack alignItems="center" gap="$2">
              <Box size={14} color={COLORS.gray} />
              <Text fontSize={11} color={COLORS.gray} fontWeight="600">
                Dimensions (L x W x H)
              </Text>
            </XStack>
            {hasDimensions ? (
              <XStack alignItems="baseline" gap="$1">
                <Text fontSize={18} fontWeight="800" color={COLORS.dark}>
                  {length || '-'} x {width || '-'} x {height || '-'}
                </Text>
                <Text fontSize={12} color={COLORS.gray}>{dimensionUnit}</Text>
              </XStack>
            ) : (
              <Text fontSize={14} color={COLORS.gray}>Not set</Text>
            )}
          </YStack>
        </XStack>
      ) : (
        <XStack
          backgroundColor={COLORS.grayLight}
          padding="$3"
          borderRadius={10}
          alignItems="center"
          gap="$3"
        >
          <YStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={COLORS.border}
            alignItems="center"
            justifyContent="center"
          >
            <Ruler size={20} color={COLORS.gray} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={13} color={COLORS.gray} fontWeight="500">
              No dimensions set
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Add weight and dimensions for shipping calculations
            </Text>
          </YStack>
        </XStack>
      )}
    </InfoSection>
  );
}

interface IdentifiersSectionProps {
  sku: string;
  barcode?: string | null;
  brand?: string | null;
}

/**
 * IdentifiersSection - SKU, Barcode, Brand info
 */
export function IdentifiersSection({ sku, barcode, brand }: IdentifiersSectionProps) {
  return (
    <InfoSection
      title="Product Identifiers"
      icon={<Barcode size={14} color={COLORS.primary} />}
      accentColor={COLORS.primary}
    >
      <XStack gap="$3" flexWrap="wrap">
        {/* SKU Card */}
        <YStack
          flex={1}
          minWidth={140}
          backgroundColor={COLORS.primaryLight}
          padding="$3"
          borderRadius={10}
          gap="$1"
        >
          <XStack alignItems="center" gap="$1">
            <Hash size={12} color={COLORS.primary} />
            <Text fontSize={10} color={COLORS.primary} fontWeight="600">SKU</Text>
          </XStack>
          <Text fontSize={15} fontWeight="700" color={COLORS.dark} numberOfLines={1}>
            {sku || 'Not set'}
          </Text>
        </YStack>

        {/* Barcode Card */}
        <YStack
          flex={1}
          minWidth={140}
          backgroundColor={barcode ? COLORS.successLight : COLORS.grayLight}
          padding="$3"
          borderRadius={10}
          gap="$1"
        >
          <XStack alignItems="center" gap="$1">
            <Barcode size={12} color={barcode ? COLORS.success : COLORS.gray} />
            <Text fontSize={10} color={barcode ? COLORS.success : COLORS.gray} fontWeight="600">
              Barcode/UPC
            </Text>
          </XStack>
          <Text
            fontSize={15}
            fontWeight={barcode ? '700' : '500'}
            color={barcode ? COLORS.dark : COLORS.gray}
            numberOfLines={1}
          >
            {barcode || 'Not set'}
          </Text>
        </YStack>

        {/* Brand Card */}
        <YStack
          flex={1}
          minWidth={140}
          backgroundColor={brand ? COLORS.purpleLight : COLORS.grayLight}
          padding="$3"
          borderRadius={10}
          gap="$1"
        >
          <XStack alignItems="center" gap="$1">
            <Tag size={12} color={brand ? COLORS.purple : COLORS.gray} />
            <Text fontSize={10} color={brand ? COLORS.purple : COLORS.gray} fontWeight="600">
              Brand
            </Text>
          </XStack>
          <Text
            fontSize={15}
            fontWeight={brand ? '700' : '500'}
            color={brand ? COLORS.dark : COLORS.gray}
            numberOfLines={1}
          >
            {brand || 'Not set'}
          </Text>
        </YStack>
      </XStack>
    </InfoSection>
  );
}

interface TaxUnitSectionProps {
  taxClass?: string;
  unitOfMeasure?: string;
  description?: string | null;
}

/**
 * TaxUnitSection - Tax class and unit of measure
 */
export function TaxUnitSection({ taxClass, unitOfMeasure, description }: TaxUnitSectionProps) {
  return (
    <InfoSection
      title="Classification"
      icon={<Info size={14} color={COLORS.gray} />}
      accentColor={COLORS.gray}
    >
      <YStack gap="$3">
        <InfoGrid>
          <InfoItem
            label="Tax Class"
            value={taxClass || 'standard'}
            icon={<DollarSign size={10} color={COLORS.gray} />}
          />
          <InfoItem
            label="Unit of Measure"
            value={unitOfMeasure || 'each'}
            icon={<Package size={10} color={COLORS.gray} />}
          />
        </InfoGrid>

        {description && (
          <YStack
            backgroundColor={COLORS.grayLight}
            padding="$3"
            borderRadius={8}
            gap="$1"
          >
            <Text fontSize={11} color={COLORS.gray} fontWeight="500">
              Description
            </Text>
            <Text fontSize={13} color={COLORS.dark} lineHeight={20}>
              {description}
            </Text>
          </YStack>
        )}
      </YStack>
    </InfoSection>
  );
}

interface TagsSectionProps {
  tags?: string[];
}

/**
 * TagsSection - Product tags display
 */
export function TagsSection({ tags = [] }: TagsSectionProps) {
  return (
    <InfoSection
      title="Tags"
      icon={<Tag size={14} color={COLORS.purple} />}
      accentColor={COLORS.purple}
    >
      {tags.length > 0 ? (
        <XStack flexWrap="wrap" gap="$2">
          {tags.map((tag) => (
            <XStack
              key={tag}
              backgroundColor={COLORS.purpleLight}
              paddingHorizontal="$3"
              paddingVertical="$1"
              borderRadius={8}
            >
              <Text fontSize={12} color={COLORS.purple} fontWeight="600">
                {tag}
              </Text>
            </XStack>
          ))}
        </XStack>
      ) : (
        <XStack alignItems="center" gap="$2" paddingVertical="$2">
          <Tag size={16} color={COLORS.gray} />
          <Text fontSize={12} color={COLORS.gray}>
            No tags assigned
          </Text>
        </XStack>
      )}
    </InfoSection>
  );
}

// ============ Case/Pack Section ============

interface CasePackSectionProps {
  product: Product;
  onEditCaseConfig?: () => void;
}

/**
 * CasePackSection - Display case/pack configuration and stock
 * For liquor stores, wholesale, and case-based ordering
 */
export function CasePackSection({ product, onEditCaseConfig }: CasePackSectionProps) {
  const hasCaseConfig = product.caseSize && product.caseSize > 0;
  const hasPackConfig = product.packSize && product.packSize > 0;

  // Calculate units per case (considering packs if configured)
  const unitsPerCase = hasCaseConfig
    ? hasPackConfig
      ? product.caseSize! * product.packSize!
      : product.caseSize!
    : 1;

  // Calculate stock in cases
  const stockInCases = hasCaseConfig ? Math.floor(product.quantity / unitsPerCase) : 0;
  const stockRemainder = hasCaseConfig ? product.quantity % unitsPerCase : product.quantity;

  // Calculate effective case prices
  const effectiveCasePurchasePrice = product.casePurchasePrice || (product.purchasePrice * unitsPerCase);
  const effectiveCaseSellingPrice = product.caseSellingPrice || (product.sellingPrice * unitsPerCase);

  // Calculate case discount (savings vs buying individual units)
  const caseDiscount = product.caseSellingPrice
    ? ((product.sellingPrice * unitsPerCase - product.caseSellingPrice) / (product.sellingPrice * unitsPerCase)) * 100
    : 0;

  if (!hasCaseConfig) {
    return (
      <InfoSection
        title="Packaging"
        icon={<Package size={14} color={COLORS.orange} />}
        accentColor={COLORS.orange}
        action={
          onEditCaseConfig ? (
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
              backgroundColor={COLORS.orangeLight}
              cursor="pointer"
              hoverStyle={{ backgroundColor: '#FFEDD5' }}
              onPress={onEditCaseConfig}
            >
              <Text fontSize={11} color={COLORS.orange} fontWeight="600">
                Configure
              </Text>
            </XStack>
          ) : undefined
        }
      >
        <XStack
          backgroundColor={COLORS.grayLight}
          padding="$3"
          borderRadius={10}
          alignItems="center"
          gap="$3"
        >
          <YStack
            width={40}
            height={40}
            borderRadius={10}
            backgroundColor={COLORS.border}
            alignItems="center"
            justifyContent="center"
          >
            <Package size={20} color={COLORS.gray} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={13} color={COLORS.gray} fontWeight="500">
              Sold individually
            </Text>
            <Text fontSize={11} color={COLORS.gray}>
              Configure case/pack settings for bulk ordering
            </Text>
          </YStack>
        </XStack>
      </InfoSection>
    );
  }

  return (
    <InfoSection
      title="Case/Pack Configuration"
      icon={<Package size={14} color={COLORS.orange} />}
      accentColor={COLORS.orange}
      action={
        onEditCaseConfig ? (
          <XStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius={6}
            backgroundColor={COLORS.orangeLight}
            cursor="pointer"
            hoverStyle={{ backgroundColor: '#FFEDD5' }}
            onPress={onEditCaseConfig}
          >
            <Text fontSize={11} color={COLORS.orange} fontWeight="600">
              Edit
            </Text>
          </XStack>
        ) : undefined
      }
    >
      <YStack gap="$3">
        {/* Case Configuration */}
        <XStack gap="$3" flexWrap="wrap">
          {/* Case Size Card */}
          <YStack
            flex={1}
            minWidth={140}
            backgroundColor={COLORS.orangeLight}
            padding="$3"
            borderRadius={10}
            gap="$1"
          >
            <Text fontSize={10} color={COLORS.orange} fontWeight="600">
              {product.caseUnitName || 'Case'} Size
            </Text>
            <XStack alignItems="baseline" gap="$1">
              <Text fontSize={20} fontWeight="800" color={COLORS.dark}>
                {unitsPerCase}
              </Text>
              <Text fontSize={12} color={COLORS.gray}>
                {product.unitOfMeasure || 'units'}/{product.caseUnitName || 'case'}
              </Text>
            </XStack>
            {hasPackConfig && (
              <Text fontSize={10} color={COLORS.gray}>
                ({product.caseSize} packs × {product.packSize} {product.unitOfMeasure || 'units'})
              </Text>
            )}
          </YStack>

          {/* Case Cost Card */}
          <YStack
            flex={1}
            minWidth={140}
            backgroundColor={COLORS.grayLight}
            padding="$3"
            borderRadius={10}
            gap="$1"
          >
            <Text fontSize={10} color={COLORS.gray} fontWeight="600">
              Case Cost
            </Text>
            <Text fontSize={20} fontWeight="800" color={COLORS.dark}>
              ${effectiveCasePurchasePrice.toFixed(2)}
            </Text>
            <Text fontSize={10} color={COLORS.gray}>
              ${(effectiveCasePurchasePrice / unitsPerCase).toFixed(2)}/{product.unitOfMeasure || 'unit'}
            </Text>
          </YStack>

          {/* Case Price Card */}
          <YStack
            flex={1}
            minWidth={140}
            backgroundColor={COLORS.successLight}
            padding="$3"
            borderRadius={10}
            gap="$1"
          >
            <Text fontSize={10} color={COLORS.success} fontWeight="600">
              Case Price
            </Text>
            <Text fontSize={20} fontWeight="800" color={COLORS.dark}>
              ${effectiveCaseSellingPrice.toFixed(2)}
            </Text>
            {caseDiscount > 0 && (
              <XStack
                backgroundColor={COLORS.success}
                paddingHorizontal={6}
                paddingVertical={2}
                borderRadius={4}
                alignSelf="flex-start"
              >
                <Text fontSize={9} color={COLORS.white} fontWeight="600">
                  Save {caseDiscount.toFixed(1)}%
                </Text>
              </XStack>
            )}
          </YStack>
        </XStack>

        {/* Current Stock in Cases */}
        <YStack
          backgroundColor={COLORS.orangeLight}
          padding="$3"
          borderRadius={10}
          gap="$2"
        >
          <Text fontSize={11} color={COLORS.orange} fontWeight="600">
            Current Stock
          </Text>
          <XStack alignItems="baseline" gap="$2">
            <Text fontSize={28} fontWeight="800" color={COLORS.dark}>
              {stockInCases}
            </Text>
            <Text fontSize={14} color={COLORS.gray} fontWeight="500">
              {product.caseUnitName || 'cases'}
            </Text>
            {stockRemainder > 0 && (
              <XStack alignItems="baseline" gap="$1">
                <Text fontSize={14} color={COLORS.gray}>+</Text>
                <Text fontSize={18} fontWeight="700" color={COLORS.dark}>
                  {stockRemainder}
                </Text>
                <Text fontSize={12} color={COLORS.gray}>
                  {product.unitOfMeasure || 'units'}
                </Text>
              </XStack>
            )}
          </XStack>
          <Text fontSize={11} color={COLORS.gray}>
            Total: {product.quantity} {product.unitOfMeasure || 'units'}
          </Text>
        </YStack>

        {/* Sales Configuration */}
        <XStack gap="$2" flexWrap="wrap">
          {product.allowUnitSales !== false && (
            <XStack
              backgroundColor={COLORS.successLight}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              <Text fontSize={10} color={COLORS.success} fontWeight="600">
                Unit Sales
              </Text>
            </XStack>
          )}
          {product.allowPackSales && hasPackConfig && (
            <XStack
              backgroundColor={COLORS.primaryLight}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              <Text fontSize={10} color={COLORS.primary} fontWeight="600">
                Pack Sales
              </Text>
            </XStack>
          )}
          {product.allowCaseSales && (
            <XStack
              backgroundColor={COLORS.orangeLight}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              <Text fontSize={10} color={COLORS.orange} fontWeight="600">
                Case Sales
              </Text>
            </XStack>
          )}
          {product.orderInCasesOnly && (
            <XStack
              backgroundColor={COLORS.warningLight}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={6}
              alignItems="center"
              gap="$1"
            >
              <Text fontSize={10} color={COLORS.warning} fontWeight="600">
                Order in Cases Only
              </Text>
            </XStack>
          )}
        </XStack>
      </YStack>
    </InfoSection>
  );
}

// ============ Complete Overview Component ============

interface ProductOverviewProps {
  product: Product;
  isEditing?: boolean;
  children?: React.ReactNode; // For edit form when editing
}

/**
 * ProductOverview - Complete overview display for a product
 * Uses domain-driven sections for retail POS
 */
export function ProductOverview({ product, isEditing = false, children }: ProductOverviewProps) {
  if (isEditing && children) {
    return <>{children}</>;
  }

  return (
    <YStack gap="$3">
      {/* Product Identifiers */}
      <IdentifiersSection
        sku={product.sku}
        barcode={product.primaryBarcode}
        brand={product.brand}
      />

      {/* Supplier & Sourcing */}
      <SupplierSection supplier={product.defaultSupplier} />

      {/* Shipping Dimensions */}
      <DimensionsSection
        weight={product.weight}
        weightUnit={product.weightUnit}
        length={product.length}
        width={product.width}
        height={product.height}
        dimensionUnit={product.dimensionUnit}
      />

      {/* Classification */}
      <TaxUnitSection
        taxClass={product.taxClass}
        unitOfMeasure={product.unitOfMeasure}
        description={product.desc || product.description}
      />

      {/* Tags */}
      <TagsSection tags={product.tags} />
    </YStack>
  );
}

export default ProductOverview;
