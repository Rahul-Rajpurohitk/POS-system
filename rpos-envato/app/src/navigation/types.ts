import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { ID } from '@/types';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
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
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
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
