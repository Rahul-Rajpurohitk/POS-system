// ============================================
// Common Types
// ============================================

export type ID = string;
export type LocalID = `local-${string}`;
export type SyncStatus = 'synced' | 'pending' | 'failed';
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface BaseEntity {
  id: ID;
  localId?: LocalID;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
}

// ============================================
// Settings & Configuration
// ============================================

export interface Language {
  code: string;
  name: string;
  nativeName?: string;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  isSuffix: boolean;
}

export interface PrinterDevice {
  address: string;
  name: string;
  type?: 'bluetooth' | 'usb' | 'network';
}

export interface AppSettings {
  language: Language;
  currency: Currency;
  tax: number;
  storeName: string;
  isDarkMode: boolean;
  isOfflineMode: boolean;
  connectedPrinter?: PrinterDevice;
}

// ============================================
// User & Authentication
// ============================================

export type UserRole = 'admin' | 'manager' | 'staff' | 'driver';

export interface User {
  id: ID;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Computed or separate name field
  avatar?: string;
  role: UserRole;
  businessName?: string;
}

export interface Staff extends User {
  status?: 'editing' | 'active';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
}

// ============================================
// Category
// ============================================

export interface Category extends BaseEntity {
  name: string;
  code?: string;
  image?: string;
  color?: string;
  parent?: ID;
  status?: 'editing';
}

// ============================================
// Supplier
// ============================================

export interface Supplier extends BaseEntity {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  status?: 'editing';
}

export interface SupplierRef {
  id: ID;
  name: string;
  code: string;
}

// ============================================
// Partner Availability
// ============================================

export interface PartnerAvailability {
  doordash?: boolean;
  ubereats?: boolean;
  grubhub?: boolean;
  postmates?: boolean;
  instacart?: boolean;
  [key: string]: boolean | undefined;  // For custom partners
}

export const PARTNER_COLORS: Record<string, string> = {
  doordash: '#FF3008',
  ubereats: '#5FB709',
  grubhub: '#F63440',
  postmates: '#000000',
  instacart: '#43B02A',
};

export const PARTNER_NAMES: Record<string, string> = {
  doordash: 'DoorDash',
  ubereats: 'Uber Eats',
  grubhub: 'Grubhub',
  postmates: 'Postmates',
  instacart: 'Instacart',
};

// ============================================
// Product
// ============================================

export interface Product extends BaseEntity {
  // Core fields
  name: string;
  sku: string;
  desc?: string;
  description?: string; // Alias for desc
  images: string[];
  quantity: number;
  stock?: number; // Alias for quantity
  sellingPrice: number;
  purchasePrice: number;
  category?: Category;
  categoryId?: ID;
  status?: 'editing';
  enabled?: boolean;

  // Sales tracking
  soldQuantity?: number;
  soldAmount?: number;
  profit?: number;

  // Partner-ready: Sourcing & Brand
  brand?: string;
  primaryBarcode?: string;
  taxClass?: string;
  unitOfMeasure?: string;

  // Partner-ready: Default Supplier
  defaultSupplierId?: ID;
  defaultSupplier?: SupplierRef;

  // Partner-ready: Shipping Dimensions
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;

  // Partner-ready: Availability & Tags
  partnerAvailability?: PartnerAvailability;
  tags?: string[];

  // Case/Pack Configuration
  packSize?: number;           // Units per pack (e.g., 6)
  packUnitName?: string;       // e.g., "6-pack", "box", "dozen"
  caseSize?: number;           // Units per case (e.g., 24) OR packs per case
  caseUnitName?: string;       // e.g., "case", "carton", "pallet"

  // Case/Pack Pricing
  casePurchasePrice?: number;  // Cost to buy one case
  caseSellingPrice?: number;   // Price to sell one case (wholesale)
  packPurchasePrice?: number;
  packSellingPrice?: number;

  // Sales Configuration
  allowUnitSales?: boolean;    // Can sell individual units?
  allowPackSales?: boolean;    // Can sell packs?
  allowCaseSales?: boolean;    // Can sell cases?
  minOrderQuantity?: number;   // Minimum units for ordering
  orderInCasesOnly?: boolean;  // Force case-based ordering from suppliers
}

// ============================================
// Customer
// ============================================

export interface Customer extends BaseEntity {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  status?: 'editing';
}

// ============================================
// Coupon
// ============================================

export type CouponType = 'fixed' | 'percentage';

export interface Coupon extends BaseEntity {
  code: string;
  name: string;
  type: CouponType;
  amount: number;
  expiredAt?: string;
  status?: 'editing';
}

// ============================================
// Order
// ============================================

export interface OrderItem {
  id: ID;
  product: Product;
  quantity: number;
  notes?: string;
}

export interface OrderPayment {
  subTotal: number;
  subtotal?: number; // Alias
  discount: number;
  vat: number;
  tax?: number; // Alias for vat
  total: number;
}

export type OrderStatus =
  | 'draft'
  | 'open'              // Order saved, awaiting payment (light orange)
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'on_hold'
  | 'out_for_delivery'
  | 'delivered';

export type PaymentMethodType =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'mobile_payment'
  | 'qr_code'
  | 'gift_card'
  | 'store_credit'
  | 'check'
  | 'bank_transfer'
  | 'split';

export type OrderTypeValue =
  | 'walk_in'
  | 'phone'
  | 'online'
  | 'doordash'
  | 'uber_eats'
  | 'grubhub'
  | 'postmates'
  | 'skip_the_dishes'
  | 'deliveroo'
  | 'other_partner';

export interface Order extends BaseEntity {
  number: string;
  orderNumber?: string; // Alias for number
  items: OrderItem[];
  payment: OrderPayment;
  customer?: Customer;
  coupon?: Coupon;
  createdBy: string;
  // Direct access fields (duplicated from payment for convenience)
  status?: OrderStatus;
  subTotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  guestName?: string;
  // Payment and order type
  paymentMethod?: PaymentMethodType;
  orderType?: OrderTypeValue;
  // Delivery fields
  isDelivery?: boolean;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryFee?: number;
  scheduledDeliveryTime?: string;
  notes?: string;
  // Driver assignment (for delivery tracking)
  driverId?: ID;
  delivery?: Delivery;
}

// ============================================
// Cart (POS)
// ============================================

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  customer: Customer | null;
  coupon: Coupon | null;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// Actual backend API response for paginated lists
export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RequestState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

// ============================================
// Sync Queue Types
// ============================================

export interface SyncQueueItem<T> {
  id: ID;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: T;
  timestamp: number;
  retries: number;
}

export interface SyncQueue {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  coupons: Coupon[];
  categories: Category[];
  deletedIds: {
    products: ID[];
    customers: ID[];
    coupons: ID[];
    categories: ID[];
    staffs: ID[];
  };
}

// ============================================
// Navigation Types
// ============================================

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;

  // Main Stack
  Main: undefined;
  Dashboard: undefined;
  POS: undefined;

  // Products
  Products: undefined;
  AddProduct: undefined;
  ProductDetail: { id: ID };
  EditProduct: { id: ID };

  // Categories
  Categories: undefined;
  AddCategory: undefined;
  EditCategory: { id: ID };

  // Customers
  Customers: undefined;
  AddCustomer: undefined;
  CustomerDetail: { id: ID };
  EditCustomer: { id: ID };

  // Coupons
  Coupons: undefined;
  AddCoupon: undefined;
  EditCoupon: { id: ID };

  // Orders
  Orders: undefined;
  OrderDetail: { id: ID };

  // Reports
  Reports: undefined;

  // Settings
  Settings: undefined;
  AddStaff: undefined;
  EditStaff: { id: ID };
  Printers: undefined;

  // Profile
  EditProfile: undefined;
  ChangePassword: undefined;
};

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type WithOptionalId<T extends { id: ID }> = Omit<T, 'id'> & { id?: ID };

// ============================================
// Driver & Delivery Types
// ============================================

export type DriverStatus = 'offline' | 'available' | 'busy' | 'on_break';

export type VehicleType = 'walking' | 'bicycle' | 'e_scooter' | 'motorcycle' | 'car';

export type DeliveryStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'picking_up'
  | 'picked_up'
  | 'on_the_way'
  | 'nearby'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export interface WorkingHours {
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface WorkingHoursConfig {
  monday?: WorkingHours;
  tuesday?: WorkingHours;
  wednesday?: WorkingHours;
  thursday?: WorkingHours;
  friday?: WorkingHours;
  saturday?: WorkingHours;
  sunday?: WorkingHours;
}

export interface DriverProfile extends BaseEntity {
  userId: ID;
  user?: User;
  businessId: ID;
  status: DriverStatus;
  vehicleType: VehicleType;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: string;
  activeDeliveryId?: ID;
  deliveriesToday: number;
  totalDeliveries: number;
  averageRating: number;
  totalRatings: number;
  workingHours?: WorkingHoursConfig;
  maxConcurrentDeliveries: number;
  enabled: boolean;
}

export interface Delivery extends BaseEntity {
  orderId: ID;
  order?: Order;
  businessId: ID;
  driverId?: ID;
  driver?: DriverProfile;
  status: DeliveryStatus;

  // Pickup (Store)
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;

  // Delivery (Customer)
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryInstructions?: string;

  // Customer
  customerName: string;
  customerPhone: string;

  // Tracking
  trackingToken: string;

  // Distance & Time
  distanceMeters?: number;
  estimatedDurationSeconds?: number;
  estimatedArrival?: string;

  // Fees
  deliveryFee: number;
  driverTip: number;

  // Timestamps
  acceptedAt?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;

  // Proof
  deliveryPhoto?: string;

  // Rating
  customerRating?: number;
  customerFeedback?: string;

  // Route
  routePolyline?: string;
  locationHistory?: Array<{ lat: number; lng: number; timestamp: number }>;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

export interface DeliveryRoute {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  steps?: Array<{
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
  }>;
}

export interface DeliveryETA {
  estimatedArrival: Date;
  durationSeconds: number;
  distanceMeters: number;
  trafficCondition?: 'light' | 'moderate' | 'heavy';
}

// Driver Stats
export interface DriverStats {
  totalDeliveries: number;
  deliveriesToday: number;
  averageRating: number;
  totalRatings: number;
  earningsToday?: number;
  earningsWeek?: number;
  completionRate?: number;
  averageDeliveryTime?: number;
}

// Delivery status display helpers
export const DELIVERY_STATUS_TEXT: Record<DeliveryStatus, string> = {
  pending: 'Order received',
  accepted: 'Preparing',
  assigned: 'Driver assigned',
  picking_up: 'Driver at store',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  nearby: 'Almost there',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: '#FFA500',
  accepted: '#4169E1',
  assigned: '#9370DB',
  picking_up: '#20B2AA',
  picked_up: '#32CD32',
  on_the_way: '#1E90FF',
  nearby: '#00CED1',
  delivered: '#228B22',
  cancelled: '#DC143C',
  failed: '#8B0000',
};

export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  walking: 'footprints',
  bicycle: 'bike',
  e_scooter: 'zap',
  motorcycle: 'bike',
  car: 'car',
};

export const VEHICLE_TYPE_NAMES: Record<VehicleType, string> = {
  walking: 'Walking',
  bicycle: 'Bicycle',
  e_scooter: 'E-Scooter',
  motorcycle: 'Motorcycle',
  car: 'Car',
};
