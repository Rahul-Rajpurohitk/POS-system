import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store';
import { useDriverStore } from '@/store/driverStore';
import type { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import DriverNavigator from './DriverNavigator';
import CustomerNavigator from './CustomerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Web linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['http://localhost:8081', 'rpos://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password',
          VerifyEmail: 'verify-email',
        },
      },
      Main: {
        screens: {
          Dashboard: '',
          POS: 'pos',
          Products: {
            initialRouteName: 'ProductList',
            screens: {
              ProductList: 'products',
              AddProduct: 'products/add',
              ProductDetail: 'products/:id',
              EditProduct: 'products/:id/edit',
              Categories: 'categories',
              AddCategory: 'categories/add',
              EditCategory: 'categories/:id/edit',
            },
          },
          Orders: {
            initialRouteName: 'OrderList',
            screens: {
              OrderList: 'orders',
              OrderDetail: 'orders/:id',
            },
          },
          More: {
            initialRouteName: 'MoreMenu',
            screens: {
              MoreMenu: 'more',
              Customers: 'customers',
              AddCustomer: 'customers/add',
              CustomerDetail: 'customers/:id',
              EditCustomer: 'customers/:id/edit',
              Coupons: 'coupons',
              AddCoupon: 'coupons/add',
              EditCoupon: 'coupons/:id/edit',
              Reports: 'reports',
              Settings: 'settings',
              Staff: 'staff',
              AddStaff: 'staff/add',
              EditStaff: 'staff/:id/edit',
              Printers: 'printers',
              Profile: 'profile',
              ChangePassword: 'change-password',
              AnalyticsDashboard: 'analytics',
              RevenueAnalytics: 'analytics/revenue',
              ProductAnalytics: 'analytics/products',
              CustomerAnalytics: 'analytics/customers',
              StaffAnalytics: 'analytics/staff',
              InventoryIntelligence: 'analytics/inventory',
            },
          },
        },
      },
      Driver: {
        screens: {
          DriverHome: 'driver',
          DeliveryMap: 'driver/map',
          DeliveryHistory: 'driver/history',
          DriverProfile: 'driver/profile',
        },
      },
      Customer: {
        screens: {
          CustomerHome: 'order',
          Menu: 'order/menu',
          Cart: 'order/cart',
          CustomerOrders: 'order/history',
          CustomerProfile: 'order/profile',
        },
      },
      Tracking: 'track/:trackingToken',
    },
  },
};

export function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore();
  const { profile } = useDriverStore();

  // Determine user type based on role
  const isDriver = user?.role === 'driver';
  const isCustomer = user?.role === 'customer';

  // Get the appropriate navigator based on user role
  const getNavigatorForRole = () => {
    if (!isAuthenticated) {
      return <Stack.Screen name="Auth" component={AuthNavigator} />;
    }

    // Driver role -> Driver App
    if (isDriver) {
      return (
        <>
          <Stack.Screen name="Driver" component={DriverNavigator} />
          <Stack.Screen name="Main" component={MainNavigator} />
        </>
      );
    }

    // Customer role -> Customer App
    if (isCustomer) {
      return (
        <>
          <Stack.Screen name="Customer" component={CustomerNavigator} />
          <Stack.Screen name="Main" component={MainNavigator} />
        </>
      );
    }

    // Default: POS Admin (admin/manager/staff)
    return (
      <>
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="Driver" component={DriverNavigator} />
        <Stack.Screen name="Customer" component={CustomerNavigator} />
      </>
    );
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {getNavigatorForRole()}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
