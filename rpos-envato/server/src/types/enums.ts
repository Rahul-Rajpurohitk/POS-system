export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  DRIVER = 'driver',
  CUSTOMER = 'customer',
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
  OPEN = 'open',             // Order saved, awaiting payment (light orange)
  PENDING = 'pending',       // Order created, awaiting payment
  PROCESSING = 'processing', // Payment received, being prepared
  COMPLETED = 'completed',   // Order fulfilled
  CANCELLED = 'cancelled',   // Order cancelled before payment
  REFUNDED = 'refunded',     // Full refund processed
  PARTIALLY_REFUNDED = 'partially_refunded', // Partial refund
  ON_HOLD = 'on_hold',       // Order on hold (stock issue, etc.)
  FAILED = 'failed',         // Payment failed
  OUT_FOR_DELIVERY = 'out_for_delivery', // Order out for delivery
  DELIVERED = 'delivered',   // Order delivered
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

/**
 * Order Type - How the order was placed
 */
export enum OrderType {
  WALK_IN = 'walk_in',           // Customer walked into the store
  PHONE = 'phone',               // Phone order
  ONLINE = 'online',             // Online order (website/app)
  DOORDASH = 'doordash',         // DoorDash partner
  UBER_EATS = 'uber_eats',       // Uber Eats partner
  GRUBHUB = 'grubhub',           // Grubhub partner
  POSTMATES = 'postmates',       // Postmates partner
  SKIP_THE_DISHES = 'skip_the_dishes', // Skip the Dishes partner
  DELIVEROO = 'deliveroo',       // Deliveroo partner
  OTHER_PARTNER = 'other_partner', // Other delivery partner
}

// ============ DELIVERY MANAGEMENT ENUMS ============

/**
 * Driver Status - Availability states for delivery drivers
 */
export enum DriverStatus {
  OFFLINE = 'offline',           // Driver not working
  AVAILABLE = 'available',       // Driver ready to accept deliveries
  BUSY = 'busy',                 // Driver currently on a delivery
  ON_BREAK = 'on_break',         // Driver on scheduled break
}

/**
 * Vehicle Type - Driver transportation method
 */
export enum VehicleType {
  WALKING = 'walking',           // On foot (short distances)
  BICYCLE = 'bicycle',           // Bicycle delivery
  E_SCOOTER = 'e_scooter',       // Electric scooter
  MOTORCYCLE = 'motorcycle',     // Motorcycle/moped
  CAR = 'car',                   // Car delivery
}

/**
 * Delivery Status - Complete delivery lifecycle
 */
export enum DeliveryStatus {
  PENDING = 'pending',           // Order placed, awaiting store acceptance
  ACCEPTED = 'accepted',         // Store accepted, awaiting driver assignment
  ASSIGNED = 'assigned',         // Driver assigned, not yet started
  PICKING_UP = 'picking_up',     // Driver at store/picking up order
  PICKED_UP = 'picked_up',       // Driver has the order
  ON_THE_WAY = 'on_the_way',     // En route to customer
  NEARBY = 'nearby',             // Within 200m of destination
  DELIVERED = 'delivered',       // Successfully delivered
  CANCELLED = 'cancelled',       // Delivery cancelled
  FAILED = 'failed',             // Delivery attempt failed
}

/**
 * Delivery Zone Type - Zone definition method
 */
export enum DeliveryZoneType {
  RADIUS = 'radius',             // Circular zone by radius
  POLYGON = 'polygon',           // Custom polygon boundary
}

/**
 * Online Order Queue Status - Order acceptance queue states
 */
export enum OnlineOrderQueueStatus {
  PENDING = 'pending',           // Awaiting store acceptance
  ACCEPTED = 'accepted',         // Store accepted order
  EXPIRED = 'expired',           // Timed out (15 min default)
  REJECTED = 'rejected',         // Store rejected order
}
