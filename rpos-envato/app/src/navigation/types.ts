import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { ID } from '@/types';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  VerifyEmail: { email: string };
};

// Main Tab Navigator
export type MainTabParamList = {
  Dashboard: undefined;
  POS: undefined;
  Products: NavigatorScreenParams<ProductStackParamList>;
  Orders: NavigatorScreenParams<OrderStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
};

// Product Stack
export type ProductStackParamList = {
  ProductList: undefined;
  AddProduct: undefined;
  ProductImport: undefined;
  ProductDetail: { id: ID };
  EditProduct: { id: ID };
  Categories: undefined;
  AddCategory: undefined;
  EditCategory: { id: ID };
};

// Order Stack
export type OrderStackParamList = {
  OrderList: undefined;
  OrderDetail: { id: ID };
  Payment: { orderId?: ID; fromPOS?: boolean };  // Shared payment screen - orderId optional for new POS orders
};

// More Stack (Settings, Customers, Coupons, etc.)
export type MoreStackParamList = {
  MoreMenu: undefined;
  Customers: undefined;
  AddCustomer: undefined;
  CustomerDetail: { id: ID };
  EditCustomer: { id: ID };
  Coupons: undefined;
  AddCoupon: undefined;
  EditCoupon: { id: ID };
  Reports: undefined;
  Settings: undefined;
  Staff: undefined;
  AddStaff: undefined;
  EditStaff: { id: ID };
  Printers: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  // Analytics Screens
  AnalyticsDashboard: undefined;
  RevenueAnalytics: undefined;
  ProductAnalytics: undefined;
  CustomerAnalytics: undefined;
  StaffAnalytics: undefined;
  InventoryIntelligence: undefined;
};

// Driver Tab Navigator
export type DriverTabParamList = {
  DriverHome: undefined;
  DeliveryMap: { deliveryId?: ID };
  DeliveryHistory: undefined;
  DriverProfile: undefined;
};

// Driver Stack (for nested navigation within driver tabs)
export type DriverStackParamList = {
  DeliveryDetail: { deliveryId: ID };
  DeliveryComplete: { deliveryId: ID };
  ReportIssue: { deliveryId: ID };
};

// Customer Tab Navigator
export type CustomerTabParamList = {
  CustomerHome: undefined;
  Menu: { categoryId?: ID };
  Cart: undefined;
  CustomerOrders: undefined;
  CustomerProfile: undefined;
};

// Customer Stack (for nested navigation within customer tabs)
export type CustomerStackParamList = {
  ProductDetail: { productId: ID };
  Checkout: undefined;
  OrderTracking: { orderId: ID; trackingToken?: string };
  OrderDetail: { orderId: ID };
  AddAddress: undefined;
  EditAddress: { addressId: string };
  ApplyCoupon: undefined;
};

// Updated Root Stack to include role-based navigation
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Driver: NavigatorScreenParams<DriverTabParamList>;
  Customer: NavigatorScreenParams<CustomerTabParamList>;
  // Public tracking (no auth required)
  Tracking: { trackingToken: string };
};

// Screen Props Types
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type ProductScreenProps<T extends keyof ProductStackParamList> = NativeStackScreenProps<ProductStackParamList, T>;
export type OrderScreenProps<T extends keyof OrderStackParamList> = NativeStackScreenProps<OrderStackParamList, T>;
export type MoreScreenProps<T extends keyof MoreStackParamList> = NativeStackScreenProps<MoreStackParamList, T>;
export type DriverTabScreenProps<T extends keyof DriverTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type DriverScreenProps<T extends keyof DriverStackParamList> = NativeStackScreenProps<DriverStackParamList, T>;
export type CustomerTabScreenProps<T extends keyof CustomerTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type CustomerScreenProps<T extends keyof CustomerStackParamList> = NativeStackScreenProps<CustomerStackParamList, T>;
