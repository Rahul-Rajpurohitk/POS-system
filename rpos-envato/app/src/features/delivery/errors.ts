/**
 * Delivery System Error Handling
 * Centralized error types, messages, and utilities
 */

import type { DeliveryStatus, DriverStatus } from '@/types';

// ============================================
// Error Codes
// ============================================

export const DeliveryErrorCode = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // Order errors
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_ACCEPTED: 'ORDER_ALREADY_ACCEPTED',
  ORDER_EXPIRED: 'ORDER_EXPIRED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',

  // Delivery errors
  DELIVERY_NOT_FOUND: 'DELIVERY_NOT_FOUND',
  DELIVERY_ALREADY_ASSIGNED: 'DELIVERY_ALREADY_ASSIGNED',
  DELIVERY_COMPLETED: 'DELIVERY_COMPLETED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',

  // Driver errors
  DRIVER_NOT_FOUND: 'DRIVER_NOT_FOUND',
  DRIVER_NOT_AVAILABLE: 'DRIVER_NOT_AVAILABLE',
  DRIVER_BUSY: 'DRIVER_BUSY',
  NO_DRIVERS_AVAILABLE: 'NO_DRIVERS_AVAILABLE',

  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  OUT_OF_DELIVERY_ZONE: 'OUT_OF_DELIVERY_ZONE',
  INVALID_PHONE: 'INVALID_PHONE',

  // Permission errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Unknown
  UNKNOWN: 'UNKNOWN',
} as const;

export type DeliveryErrorCodeType = typeof DeliveryErrorCode[keyof typeof DeliveryErrorCode];

// ============================================
// User-Friendly Error Messages
// ============================================

export const ErrorMessages: Record<DeliveryErrorCodeType, string> = {
  [DeliveryErrorCode.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
  [DeliveryErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
  [DeliveryErrorCode.SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',

  [DeliveryErrorCode.ORDER_NOT_FOUND]: 'This order could not be found.',
  [DeliveryErrorCode.ORDER_ALREADY_ACCEPTED]: 'This order has already been accepted.',
  [DeliveryErrorCode.ORDER_EXPIRED]: 'This order has expired and can no longer be accepted.',
  [DeliveryErrorCode.ORDER_CANCELLED]: 'This order has been cancelled.',

  [DeliveryErrorCode.DELIVERY_NOT_FOUND]: 'This delivery could not be found.',
  [DeliveryErrorCode.DELIVERY_ALREADY_ASSIGNED]: 'A driver is already assigned to this delivery.',
  [DeliveryErrorCode.DELIVERY_COMPLETED]: 'This delivery has already been completed.',
  [DeliveryErrorCode.INVALID_STATUS_TRANSITION]: 'Cannot update delivery to the requested status.',

  [DeliveryErrorCode.DRIVER_NOT_FOUND]: 'The selected driver could not be found.',
  [DeliveryErrorCode.DRIVER_NOT_AVAILABLE]: 'The selected driver is no longer available.',
  [DeliveryErrorCode.DRIVER_BUSY]: 'The selected driver is currently busy with another delivery.',
  [DeliveryErrorCode.NO_DRIVERS_AVAILABLE]: 'No drivers are currently available. Please try again later.',

  [DeliveryErrorCode.INVALID_ADDRESS]: 'The delivery address is invalid.',
  [DeliveryErrorCode.OUT_OF_DELIVERY_ZONE]: 'The delivery address is outside our delivery zone.',
  [DeliveryErrorCode.INVALID_PHONE]: 'The phone number provided is invalid.',

  [DeliveryErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
  [DeliveryErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',

  [DeliveryErrorCode.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

// ============================================
// Error Class
// ============================================

export class DeliveryError extends Error {
  code: DeliveryErrorCodeType;
  userMessage: string;
  details?: Record<string, unknown>;
  isRetryable: boolean;

  constructor(
    code: DeliveryErrorCodeType,
    details?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(ErrorMessages[code] || ErrorMessages[DeliveryErrorCode.UNKNOWN]);
    this.name = 'DeliveryError';
    this.code = code;
    this.userMessage = ErrorMessages[code] || ErrorMessages[DeliveryErrorCode.UNKNOWN];
    this.details = details;
    this.isRetryable = isRetryableError(code);

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// ============================================
// Error Utilities
// ============================================

/**
 * Determines if an error code represents a retryable error
 */
export function isRetryableError(code: DeliveryErrorCodeType): boolean {
  const retryableCodes: DeliveryErrorCodeType[] = [
    DeliveryErrorCode.NETWORK_ERROR,
    DeliveryErrorCode.TIMEOUT,
    DeliveryErrorCode.SERVER_ERROR,
  ];
  return retryableCodes.includes(code);
}

/**
 * Parse API error response into DeliveryError
 */
export function parseApiError(error: unknown): DeliveryError {
  // Handle Axios errors
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverCode = error.response?.data?.code;
    const serverMessage = error.response?.data?.message;

    // Map HTTP status codes
    if (!error.response) {
      return new DeliveryError(DeliveryErrorCode.NETWORK_ERROR);
    }

    if (status === 401) {
      return new DeliveryError(DeliveryErrorCode.UNAUTHORIZED);
    }

    if (status === 403) {
      return new DeliveryError(DeliveryErrorCode.FORBIDDEN);
    }

    if (status === 404) {
      return new DeliveryError(DeliveryErrorCode.ORDER_NOT_FOUND, { message: serverMessage });
    }

    if (status === 408 || error.code === 'ECONNABORTED') {
      return new DeliveryError(DeliveryErrorCode.TIMEOUT);
    }

    if (status && status >= 500) {
      return new DeliveryError(DeliveryErrorCode.SERVER_ERROR);
    }

    // Try to map server error code
    const errorCodes = Object.values(DeliveryErrorCode) as string[];
    if (serverCode && errorCodes.includes(serverCode)) {
      return new DeliveryError(serverCode as DeliveryErrorCodeType, { message: serverMessage });
    }
  }

  // Handle network errors
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return new DeliveryError(DeliveryErrorCode.NETWORK_ERROR);
  }

  // Handle DeliveryError passthrough
  if (error instanceof DeliveryError) {
    return error;
  }

  // Unknown error
  return new DeliveryError(DeliveryErrorCode.UNKNOWN, {
    originalMessage: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Check if error is an Axios error
 */
function isAxiosError(error: unknown): error is {
  response?: { status: number; data?: { code?: string; message?: string } };
  code?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as { isAxiosError: boolean }).isAxiosError === true
  );
}

/**
 * Get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof DeliveryError) {
    return error.userMessage;
  }

  const parsed = parseApiError(error);
  return parsed.userMessage;
}

/**
 * Determine if error should trigger a retry
 */
export function shouldRetry(error: unknown, retryCount: number, maxRetries = 3): boolean {
  if (retryCount >= maxRetries) {
    return false;
  }

  const parsed = parseApiError(error);
  return parsed.isRetryable;
}

// ============================================
// Status Validation
// ============================================

const VALID_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['assigned', 'cancelled'],
  assigned: ['picking_up', 'cancelled'],
  picking_up: ['picked_up', 'cancelled'],
  picked_up: ['on_the_way', 'cancelled'],
  on_the_way: ['nearby', 'delivered', 'failed'],
  nearby: ['delivered', 'failed'],
  delivered: [],
  cancelled: [],
  failed: [],
};

/**
 * Validate if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: DeliveryStatus,
  newStatus: DeliveryStatus
): { valid: boolean; error?: string } {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions) {
    return {
      valid: false,
      error: `Unknown status: ${currentStatus}`,
    };
  }

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'none'}`,
    };
  }

  return { valid: true };
}

// ============================================
// Retry Configuration
// ============================================

export const RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,

  /**
   * Calculate delay for exponential backoff
   */
  getDelay(retryCount: number): number {
    const delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, retryCount);
    return Math.min(delay, this.maxDelayMs);
  },
};

// ============================================
// Toast/Alert Helpers
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export const DeliveryToasts = {
  orderAccepted: (): ToastMessage => ({
    type: 'success',
    title: 'Order Accepted',
    message: 'The order has been accepted and is ready for driver assignment.',
  }),

  orderRejected: (): ToastMessage => ({
    type: 'warning',
    title: 'Order Rejected',
    message: 'The order has been rejected and the customer will be notified.',
  }),

  driverAssigned: (driverName: string): ToastMessage => ({
    type: 'success',
    title: 'Driver Assigned',
    message: `${driverName} has been assigned to this delivery.`,
  }),

  deliveryCompleted: (): ToastMessage => ({
    type: 'success',
    title: 'Delivery Completed',
    message: 'The delivery has been marked as completed.',
  }),

  deliveryCancelled: (): ToastMessage => ({
    type: 'warning',
    title: 'Delivery Cancelled',
    message: 'The delivery has been cancelled.',
  }),

  connectionLost: (): ToastMessage => ({
    type: 'error',
    title: 'Connection Lost',
    message: 'Unable to connect to the server. Retrying...',
    duration: 5000,
  }),

  connectionRestored: (): ToastMessage => ({
    type: 'success',
    title: 'Connection Restored',
    message: 'You are back online.',
  }),

  newOrderReceived: (): ToastMessage => ({
    type: 'info',
    title: 'New Order',
    message: 'A new online order has been received.',
  }),

  orderExpiringSoon: (minutes: number): ToastMessage => ({
    type: 'warning',
    title: 'Order Expiring Soon',
    message: `An order will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
  }),

  fromError: (error: unknown): ToastMessage => ({
    type: 'error',
    title: 'Error',
    message: getErrorMessage(error),
  }),
};
