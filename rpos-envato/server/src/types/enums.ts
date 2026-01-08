export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum AuthType {
  EMAIL = 'email',
}

export enum CouponType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  VND = 'VND',
  JPY = 'JPY',
  INR = 'INR',
}

export enum Language {
  EN = 'en',
  VI = 'vi',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum LogType {
  NEW_PRODUCT = 'NewProduct',
  EDIT_PRODUCT = 'EditProduct',
  NEW_ORDER = 'NewOrder',
  ORDER_PAID = 'OrderPaid',
  ORDER_REFUNDED = 'OrderRefunded',
  ORDER_CANCELLED = 'OrderCancelled',
  INVENTORY_ADJUSTED = 'InventoryAdjusted',
}

export enum QueueProvider {
  BULLMQ = 'bullmq',
  SQS = 'sqs',
}

// ============ NEW ENUMS FOR PRODUCTION POS ============

/**
 * Order Status - Complete lifecycle management
 */
export enum OrderStatus {
  DRAFT = 'draft',           // Order being created, not finalized
  PENDING = 'pending',       // Order created, awaiting payment
  PROCESSING = 'processing', // Payment received, being prepared
  COMPLETED = 'completed',   // Order fulfilled
  CANCELLED = 'cancelled',   // Order cancelled before payment
  REFUNDED = 'refunded',     // Full refund processed
  PARTIALLY_REFUNDED = 'partially_refunded', // Partial refund
  ON_HOLD = 'on_hold',       // Order on hold (stock issue, etc.)
  FAILED = 'failed',         // Payment failed
}

/**
 * Payment Method Types
 */
export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  MOBILE_PAYMENT = 'mobile_payment',  // Apple Pay, Google Pay
  QR_CODE = 'qr_code',
  GIFT_CARD = 'gift_card',
  STORE_CREDIT = 'store_credit',
  CHECK = 'check',
  BANK_TRANSFER = 'bank_transfer',
  SPLIT = 'split',           // Multiple payment methods
}

/**
 * Payment Status
 */
export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized', // Card authorized, not captured
  CAPTURED = 'captured',     // Payment captured/completed
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  VOIDED = 'voided',
  EXPIRED = 'expired',
}

/**
 * Refund Status
 */
export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * Refund Reason
 */
export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  DEFECTIVE_PRODUCT = 'defective_product',
  WRONG_ITEM = 'wrong_item',
  NOT_AS_DESCRIBED = 'not_as_described',
  DUPLICATE_ORDER = 'duplicate_order',
  FRAUD = 'fraud',
  OTHER = 'other',
}

/**
 * Discount Type (enhanced)
 */
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
  VOLUME = 'volume',
  EMPLOYEE = 'employee',
  LOYALTY = 'loyalty',
}

/**
 * Tax Type
 */
export enum TaxType {
  INCLUSIVE = 'inclusive', // Tax included in price
  EXCLUSIVE = 'exclusive', // Tax added to price
  EXEMPT = 'exempt',       // No tax
}

/**
 * Inventory Adjustment Type
 */
export enum InventoryAdjustmentType {
  SALE = 'sale',
  RETURN = 'return',
  RESTOCK = 'restock',
  DAMAGE = 'damage',
  THEFT = 'theft',
  TRANSFER = 'transfer',
  AUDIT = 'audit',
  EXPIRY = 'expiry',
}

/**
 * Report Period
 */
export enum ReportPeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
}

/**
 * Cash Drawer Action
 */
export enum CashDrawerAction {
  OPEN_SALE = 'open_sale',
  OPEN_NO_SALE = 'open_no_sale',
  CASH_IN = 'cash_in',
  CASH_OUT = 'cash_out',
  COUNT = 'count',
}
