import type { Currency } from '@/types';

/**
 * Format a number as currency
 * Preserves the original app's formatting logic
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: Currency,
  options?: {
    showSymbol?: boolean;
    decimals?: number;
  }
): string {
  const { showSymbol = true, decimals = 2 } = options || {};

  // Handle non-numeric values gracefully
  const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;

  // Format the number with proper decimals
  const formattedValue = numValue.toFixed(decimals);

  // Add thousand separators
  const parts = formattedValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const numberString = parts.join('.');

  if (!showSymbol) {
    return numberString;
  }

  // Apply symbol based on suffix preference
  if (currency.isSuffix) {
    return `${numberString} ${currency.symbol}`;
  }

  return `${currency.symbol}${numberString}`;
}

/**
 * Parse a currency string back to number
 */
export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Round to currency precision (2 decimal places)
 * Matches original app's rounding logic
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Round with single decimal precision
 * Used in original POS calculations: Math.round(value * 10) / 10
 */
export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Common currencies for the app
 */
export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', isSuffix: false },
  { code: 'EUR', symbol: '€', name: 'Euro', isSuffix: false },
  { code: 'GBP', symbol: '£', name: 'British Pound', isSuffix: false },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', isSuffix: false },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', isSuffix: true },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', isSuffix: false },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', isSuffix: false },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', isSuffix: false },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', isSuffix: false },
  { code: 'KRW', symbol: '₩', name: 'Korean Won', isSuffix: false },
];

/**
 * Get currency by code
 */
export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
