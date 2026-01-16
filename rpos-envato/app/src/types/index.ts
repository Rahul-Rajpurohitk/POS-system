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

export type UserRole = 'admin' | 'manager' | 'staff';

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
}

export interface OrderPayment {
  subTotal: number;
  discount: number;
  vat: number;
  total: number;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

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
