import type { Product } from '@/types';

/**
 * Product Utility Functions
 *
 * Helper functions for case/pack calculations,
 * stock display formatting, and pricing utilities.
 */

// ============ Unit Conversion ============

/**
 * Get total units per case
 * If packSize is set, caseSize represents packs per case
 */
export function getUnitsPerCase(product: Product): number {
  if (!product.caseSize) return 1;
  if (product.packSize) {
    // Case contains packs: caseSize = packs per case
    return product.caseSize * product.packSize;
  }
  // Case contains units directly
  return product.caseSize;
}

/**
 * Get units per pack
 */
export function getUnitsPerPack(product: Product): number {
  return product.packSize || 1;
}

/**
 * Calculate stock in cases with remainder
 */
export function getStockInCases(product: Product): { cases: number; remainder: number } {
  const unitsPerCase = getUnitsPerCase(product);
  return {
    cases: Math.floor(product.quantity / unitsPerCase),
    remainder: product.quantity % unitsPerCase,
  };
}

/**
 * Calculate stock in packs with remainder
 */
export function getStockInPacks(product: Product): { packs: number; remainder: number } {
  const unitsPerPack = getUnitsPerPack(product);
  return {
    packs: Math.floor(product.quantity / unitsPerPack),
    remainder: product.quantity % unitsPerPack,
  };
}

// ============ Price Calculations ============

/**
 * Get effective case purchase price (calculated if not explicitly set)
 */
export function getEffectiveCasePurchasePrice(product: Product): number {
  if (product.casePurchasePrice) return product.casePurchasePrice;
  return product.purchasePrice * getUnitsPerCase(product);
}

/**
 * Get effective case selling price (calculated if not explicitly set)
 */
export function getEffectiveCaseSellingPrice(product: Product): number {
  if (product.caseSellingPrice) return product.caseSellingPrice;
  return product.sellingPrice * getUnitsPerCase(product);
}

/**
 * Get effective pack purchase price
 */
export function getEffectivePackPurchasePrice(product: Product): number {
  if (product.packPurchasePrice) return product.packPurchasePrice;
  return product.purchasePrice * getUnitsPerPack(product);
}

/**
 * Get effective pack selling price
 */
export function getEffectivePackSellingPrice(product: Product): number {
  if (product.packSellingPrice) return product.packSellingPrice;
  return product.sellingPrice * getUnitsPerPack(product);
}

/**
 * Calculate profit margin percentage
 */
export function calculateMargin(sellingPrice: number, purchasePrice: number): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - purchasePrice) / sellingPrice) * 100;
}

/**
 * Calculate unit profit margin
 */
export function getUnitMargin(product: Product): number {
  return calculateMargin(product.sellingPrice, product.purchasePrice);
}

/**
 * Calculate case profit margin
 */
export function getCaseMargin(product: Product): number {
  return calculateMargin(
    getEffectiveCaseSellingPrice(product),
    getEffectiveCasePurchasePrice(product)
  );
}

/**
 * Get case discount percentage (savings vs buying individual units)
 */
export function getCaseDiscount(product: Product): number {
  if (!product.caseSellingPrice) return 0;
  const unitsPerCase = getUnitsPerCase(product);
  const unitTotal = product.sellingPrice * unitsPerCase;
  const caseSavings = unitTotal - product.caseSellingPrice;
  return (caseSavings / unitTotal) * 100;
}

// ============ Display Formatting ============

/**
 * Format stock display with cases and units
 */
export function formatStockDisplay(product: Product): string {
  if (!product.caseSize) {
    return `${product.quantity} ${product.unitOfMeasure || 'units'}`;
  }

  const { cases, remainder } = getStockInCases(product);
  const caseLabel = product.caseUnitName || 'cases';
  const unitLabel = product.unitOfMeasure || 'units';

  if (remainder === 0) {
    return `${cases} ${caseLabel} (${product.quantity} ${unitLabel})`;
  }
  return `${cases} ${caseLabel} + ${remainder} ${unitLabel} (${product.quantity} total)`;
}

/**
 * Format stock for compact display
 */
export function formatStockCompact(product: Product): string {
  if (!product.caseSize) {
    return `${product.quantity}`;
  }

  const { cases, remainder } = getStockInCases(product);
  if (remainder === 0) {
    return `${cases}c`;
  }
  return `${cases}c+${remainder}`;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format case price display
 */
export function formatCasePrice(product: Product): string {
  const casePrice = getEffectiveCaseSellingPrice(product);
  const unitsPerCase = getUnitsPerCase(product);
  const unitLabel = product.unitOfMeasure || 'units';
  return `${formatPrice(casePrice)}/${product.caseUnitName || 'case'} (${unitsPerCase} ${unitLabel})`;
}

/**
 * Format margin percentage
 */
export function formatMargin(margin: number): string {
  return `${margin.toFixed(1)}%`;
}

// ============ Product Configuration Checks ============

/**
 * Check if product has case configuration
 */
export function hasCaseConfig(product: Product): boolean {
  return product.caseSize !== undefined && product.caseSize !== null && product.caseSize > 0;
}

/**
 * Check if product has pack configuration
 */
export function hasPackConfig(product: Product): boolean {
  return product.packSize !== undefined && product.packSize !== null && product.packSize > 0;
}

/**
 * Check if product is configured for case-only ordering
 */
export function isCaseOnlyOrdering(product: Product): boolean {
  return product.orderInCasesOnly === true && hasCaseConfig(product);
}

/**
 * Get available sales units for a product
 */
export function getAvailableSalesUnits(product: Product): Array<'unit' | 'pack' | 'case'> {
  const units: Array<'unit' | 'pack' | 'case'> = [];

  if (product.allowUnitSales !== false) {
    units.push('unit');
  }
  if (product.allowPackSales && hasPackConfig(product)) {
    units.push('pack');
  }
  if (product.allowCaseSales && hasCaseConfig(product)) {
    units.push('case');
  }

  return units;
}

// ============ Reorder Calculations ============

/**
 * Calculate suggested reorder quantity in cases
 */
export function getSuggestedReorderCases(
  product: Product,
  avgDailySales: number,
  daysToStock: number = 30
): number {
  if (!hasCaseConfig(product)) return 0;

  const targetUnits = avgDailySales * daysToStock;
  const currentStock = product.quantity;
  const unitsNeeded = Math.max(0, targetUnits - currentStock);
  const unitsPerCase = getUnitsPerCase(product);

  return Math.ceil(unitsNeeded / unitsPerCase);
}

/**
 * Calculate days of stock remaining
 */
export function getDaysOfStock(product: Product, avgDailySales: number): number {
  if (avgDailySales <= 0) return 999;
  return Math.floor(product.quantity / avgDailySales);
}

/**
 * Check if product needs reordering
 */
export function needsReorder(
  product: Product,
  avgDailySales: number,
  reorderThresholdDays: number = 7
): boolean {
  const daysOfStock = getDaysOfStock(product, avgDailySales);
  return daysOfStock <= reorderThresholdDays;
}

// ============ Order Unit Conversions ============

/**
 * Convert case quantity to units
 */
export function casesToUnits(product: Product, caseQuantity: number): number {
  return caseQuantity * getUnitsPerCase(product);
}

/**
 * Convert pack quantity to units
 */
export function packsToUnits(product: Product, packQuantity: number): number {
  return packQuantity * getUnitsPerPack(product);
}

/**
 * Convert units to cases (with remainder)
 */
export function unitsToCases(product: Product, units: number): { cases: number; remainder: number } {
  const unitsPerCase = getUnitsPerCase(product);
  return {
    cases: Math.floor(units / unitsPerCase),
    remainder: units % unitsPerCase,
  };
}

/**
 * Convert units to packs (with remainder)
 */
export function unitsToPacks(product: Product, units: number): { packs: number; remainder: number } {
  const unitsPerPack = getUnitsPerPack(product);
  return {
    packs: Math.floor(units / unitsPerPack),
    remainder: units % unitsPerPack,
  };
}

// ============ Cost Calculations ============

/**
 * Calculate cost for ordering N cases
 */
export function calculateCaseOrderCost(product: Product, caseQuantity: number): number {
  return getEffectiveCasePurchasePrice(product) * caseQuantity;
}

/**
 * Calculate cost for ordering N packs
 */
export function calculatePackOrderCost(product: Product, packQuantity: number): number {
  return getEffectivePackPurchasePrice(product) * packQuantity;
}

/**
 * Get cost savings when buying in cases vs individual units
 */
export function getCaseCostSavings(product: Product, caseQuantity: number): number {
  if (!product.casePurchasePrice) return 0;

  const unitsPerCase = getUnitsPerCase(product);
  const totalUnits = caseQuantity * unitsPerCase;
  const unitCost = product.purchasePrice * totalUnits;
  const caseCost = product.casePurchasePrice * caseQuantity;

  return unitCost - caseCost;
}
