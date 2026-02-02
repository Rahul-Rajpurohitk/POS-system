export * from './currency';
export * from './id';

// Date formatting utilities
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Parse a date string ensuring it's treated as UTC if no timezone specified
 * Then convert to local timezone for display
 */
function parseToLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date;

  // Check if the string already has timezone info
  // UTC: ends with 'Z'
  // Offset: has +HH:MM or -HH:MM at the end (after the time part)
  const hasTimezoneInfo =
    date.endsWith('Z') ||
    /[+-]\d{2}:\d{2}$/.test(date) ||
    /[+-]\d{4}$/.test(date);

  // If no timezone info, assume UTC and append 'Z'
  const dateStr = hasTimezoneInfo ? date : date + 'Z';

  return parseISO(dateStr);
}

/**
 * Format date for display (converts UTC to local timezone)
 */
export function formatDate(
  date: string | Date,
  formatString: string = 'PPp'
): string {
  if (!date) return '';
  const dateObj = parseToLocalDate(date);
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatString);
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 * Converts UTC to local timezone
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return '';
  const dateObj = parseToLocalDate(date);
  if (!isValid(dateObj)) return '';
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Check if a coupon is expired
 */
export function isCouponExpired(expiredAt?: string): boolean {
  if (!expiredAt) return false;
  const expiryDate = parseISO(expiredAt);
  return isValid(expiryDate) && expiryDate < new Date();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Get initials from name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}
