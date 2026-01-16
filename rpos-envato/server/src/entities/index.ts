// Export all TypeORM entities
export { Business } from './Business.entity';
export { User } from './User.entity';
export { Category } from './Category.entity';
export { Customer } from './Customer.entity';
export { Coupon } from './Coupon.entity';
export { Product } from './Product.entity';
export { Order, OrderStatus, TaxType, PaymentMethod } from './Order.entity';
export { OrderItem } from './OrderItem.entity';
export { Payment, PaymentStatus, CardBrand } from './Payment.entity';
export { Refund, RefundStatus, RefundMethod } from './Refund.entity';
export { File } from './File.entity';

// Shift & Cash Management
export { Shift, CashMovement, ShiftStatus, CashMovementType } from './Shift.entity';

// End of Day Reports
export { EODReport, EODReportStatus } from './EODReport.entity';

// Gift Card System
export { GiftCard, GiftCardTransaction, GiftCardStatus, GiftCardType } from './GiftCard.entity';

// Loyalty Program
export {
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyReward,
  LoyaltyProgramType,
  LoyaltyTransactionType,
  RewardType,
} from './Loyalty.entity';

// Multi-Location Support
export {
  Location,
  LocationInventory,
  StockTransfer,
  StockTransferItem,
  LocationStatus,
  LocationType,
  TransferStatus,
} from './Location.entity';

// Barcode & SKU System
export {
  ProductBarcode,
  SKUConfiguration,
  ProductBatch,
  BarcodeScanLog,
  BarcodeType,
  BarcodeStatus,
  BatchStatus,
  ScanType,
  SKUFormat,
} from './Barcode.entity';

// Supplier & Purchase Orders
export {
  Supplier,
  SupplierProduct,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderReceiving,
  PurchaseOrderReceivingItem,
  SupplierPayment,
  SupplierStatus,
  PaymentTerms,
  PurchaseOrderStatus,
  SupplierPaymentMethod,
  SupplierPaymentStatus,
} from './Supplier.entity';

// Stock Adjustments (Inventory Tracking)
export {
  StockAdjustment,
  StockAdjustmentType,
  StockAdjustmentStatus,
} from './StockAdjustment.entity';

// Product Activity (Audit Trail)
export {
  ProductActivity,
  ProductActivityType,
} from './ProductActivity.entity';

// Price History (Price Tracking)
export {
  PriceHistory,
  PriceChangeType,
  PriceChangeReason,
} from './PriceHistory.entity';

// Product Import Jobs
export {
  ProductImportJob,
  ImportJobStatus,
  DuplicateAction,
  ImportRowError,
  ImportRowResult,
  ImportSummary,
} from './ProductImportJob.entity';

// Array of all entities for TypeORM configuration
export const entities = [
  'Business',
  'User',
  'Category',
  'Customer',
  'Coupon',
  'Product',
  'Order',
  'OrderItem',
  'Payment',
  'Refund',
  'File',
  // Shift & Cash
  'Shift',
  'CashMovement',
  // EOD
  'EODReport',
  // Gift Cards
  'GiftCard',
  'GiftCardTransaction',
  // Loyalty
  'LoyaltyProgram',
  'LoyaltyTier',
  'LoyaltyAccount',
  'LoyaltyTransaction',
  'LoyaltyReward',
  // Multi-Location
  'Location',
  'LocationInventory',
  'StockTransfer',
  'StockTransferItem',
  // Barcodes
  'ProductBarcode',
  'SKUConfiguration',
  'ProductBatch',
  'BarcodeScanLog',
  // Suppliers
  'Supplier',
  'SupplierProduct',
  'PurchaseOrder',
  'PurchaseOrderItem',
  'PurchaseOrderReceiving',
  'PurchaseOrderReceivingItem',
  'SupplierPayment',
  // Stock Adjustments
  'StockAdjustment',
  // Product Activity
  'ProductActivity',
  // Price History
  'PriceHistory',
  // Product Import Jobs
  'ProductImportJob',
];
