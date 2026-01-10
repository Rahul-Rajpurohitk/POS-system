import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'tamagui';
import { Home, ShoppingCart, Package, ClipboardList, Menu } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList, ProductStackParamList, OrderStackParamList, MoreStackParamList } from './types';

// Screens
import DashboardScreen from '@/screens/main/DashboardScreen';
import POSScreen from '@/screens/main/POSScreen';
import ProductListScreen from '@/screens/products/ProductListScreen';
import AddProductScreen from '@/screens/products/AddProductScreen';
import ProductDetailScreen from '@/screens/products/ProductDetailScreen';
import EditProductScreen from '@/screens/products/EditProductScreen';
import CategoriesScreen from '@/screens/categories/CategoriesScreen';
import AddCategoryScreen from '@/screens/categories/AddCategoryScreen';
import EditCategoryScreen from '@/screens/categories/EditCategoryScreen';
import OrderListScreen from '@/screens/orders/OrderListScreen';
import OrderDetailScreen from '@/screens/orders/OrderDetailScreen';
import MoreMenuScreen from '@/screens/more/MoreMenuScreen';
import CustomersScreen from '@/screens/customers/CustomersScreen';
import AddCustomerScreen from '@/screens/customers/AddCustomerScreen';
import CustomerDetailScreen from '@/screens/customers/CustomerDetailScreen';
import EditCustomerScreen from '@/screens/customers/EditCustomerScreen';
import CouponsScreen from '@/screens/coupons/CouponsScreen';
import AddCouponScreen from '@/screens/coupons/AddCouponScreen';
import EditCouponScreen from '@/screens/coupons/EditCouponScreen';
import ReportsScreen from '@/screens/reports/ReportsScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import StaffScreen from '@/screens/settings/StaffScreen';
import AddStaffScreen from '@/screens/settings/AddStaffScreen';
import EditStaffScreen from '@/screens/settings/EditStaffScreen';
import PrintersScreen from '@/screens/settings/PrintersScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import ChangePasswordScreen from '@/screens/profile/ChangePasswordScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ProductStack = createNativeStackNavigator<ProductStackParamList>();
const OrderStack = createNativeStackNavigator<OrderStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

// Product Stack Navigator
function ProductNavigator() {
  return (
    <ProductStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductStack.Screen name="ProductList" component={ProductListScreen} />
      <ProductStack.Screen name="AddProduct" component={AddProductScreen} />
      <ProductStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProductStack.Screen name="EditProduct" component={EditProductScreen} />
      <ProductStack.Screen name="Categories" component={CategoriesScreen} />
      <ProductStack.Screen name="AddCategory" component={AddCategoryScreen} />
      <ProductStack.Screen name="EditCategory" component={EditCategoryScreen} />
    </ProductStack.Navigator>
  );
}

// Order Stack Navigator
function OrderNavigator() {
  return (
    <OrderStack.Navigator screenOptions={{ headerShown: false }}>
      <OrderStack.Screen name="OrderList" component={OrderListScreen} />
      <OrderStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrderStack.Navigator>
  );
}

// More Stack Navigator
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <MoreStack.Screen name="Customers" component={CustomersScreen} />
      <MoreStack.Screen name="AddCustomer" component={AddCustomerScreen} />
      <MoreStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <MoreStack.Screen name="EditCustomer" component={EditCustomerScreen} />
      <MoreStack.Screen name="Coupons" component={CouponsScreen} />
      <MoreStack.Screen name="AddCoupon" component={AddCouponScreen} />
      <MoreStack.Screen name="EditCoupon" component={EditCouponScreen} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="Staff" component={StaffScreen} />
      <MoreStack.Screen name="AddStaff" component={AddStaffScreen} />
      <MoreStack.Screen name="EditStaff" component={EditStaffScreen} />
      <MoreStack.Screen name="Printers" component={PrintersScreen} />
      <MoreStack.Screen name="Profile" component={ProfileScreen} />
      <MoreStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </MoreStack.Navigator>
  );
}

export function MainNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.cardBackground.val,
          borderTopColor: theme.borderColor.val,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: theme.primary.val,
        tabBarInactiveTintColor: theme.placeholderColor.val,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default MainNavigator;
