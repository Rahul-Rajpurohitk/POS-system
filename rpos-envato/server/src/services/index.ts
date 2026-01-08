// Export all services
export { default as authService, AuthService } from './auth.service';
export { default as orderService, OrderService } from './order.service';
export { default as productService, ProductService } from './product.service';
export { default as categoryService, CategoryService } from './category.service';
export { default as customerService, CustomerService } from './customer.service';
export { default as couponService, CouponService } from './coupon.service';
export { default as logService, LogService } from './log.service';

// New production-grade services
export { paymentService } from './payment.service';
export { analyticsService } from './analytics.service';
export { receiptService } from './receipt.service';
export { inventoryService } from './inventory.service';
export { auditService, AuditEventType } from './audit.service';

// Cache & Real-time services
export { cacheService } from './cache.service';
export { realtimeService, RealtimeEvent } from './realtime.service';
export { reliableRealtimeService, EventPriority } from './realtime-reliable.service';

// Shift & EOD services
export { shiftService } from './shift.service';
export { eodService } from './eod.service';

// Gift Card & Loyalty services
export { giftCardService } from './giftcard.service';
export { loyaltyService } from './loyalty.service';

// Multi-location service
export { locationService } from './location.service';

// Barcode & SKU service
export { barcodeService } from './barcode.service';

// Supplier & Purchase Order services
export { supplierService } from './supplier.service';

// Reporting services
export { reportService } from './report.service';

// Offline sync service
export { offlineSyncService, SyncOperation, SyncStatus, ConflictResolution } from './offline-sync.service';

// Order processing (unified)
export { orderProcessingService } from './order-processing.service';
