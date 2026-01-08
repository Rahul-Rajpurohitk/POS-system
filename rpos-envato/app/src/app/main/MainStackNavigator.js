import React from 'react';
import { createStackNavigator } from 'react-navigation-stack';

import { headerWithoutButtonBack } from '@common/Header';
import ProductsScreen from './screens/Product/ProductsScreen';
import AddProductScreen from './screens/Product/AddProductScreen';
import ProductDetailScreen from './screens/Product/ProductDetailScreen';
import EditProductScreen from './screens/Product/EditProductScreen';

import CategoriesScreen from './screens/Category/CategoriesScreen';
import AddCategoryScreen from './screens/Category/AddCategoryScreen';
import EditCategoryScreen from './screens/Category/EditCategoryScreen';

import POSScreen from './screens/POSScreen';
import CustomersScreen from './screens/Customer/CustomersScreen';
import AddCustomerScreen from './screens/Customer/AddCustomerScreen';
import CustomerDetail from './screens/Customer/CustomerDetail';
import EditCustomerScreen from './screens/Customer/EditCustomerScreen';

import CouponsScreen from './screens/Coupon/CouponsScreen';
import AddCouponScreen from './screens/Coupon/AddCouponScreen';
import EditCouponScreen from './screens/Coupon/EditCouponScreen';
import SettingScreen from './screens/Setting/SettingScreen';
import AddStaffScreen from './screens/Setting/AddStaffScreen';
import EditStaffScreen from './screens/Setting/EditStaffScreen';
import ReportsScreen from './screens/Reports/ReportsScreen';
import DashboardScreen from './screens/DashboardScreen';
import OrderScreen from './screens/OrderScreen';
import EditProfileScreen from './screens/Profile/EditProfileScreen';
import ChangePassword from './screens/Profile/ChangePassword';
import PrintersScreen from './screens/PrintersScreen';

const categoryStackNavigator = createStackNavigator(
  {
    CategoriesScreen: {
      screen: CategoriesScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    AddCategory: {
      screen: AddCategoryScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    EditCategory: {
      screen: EditCategoryScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
  },
  {
    initialRouteName: 'CategoriesScreen',
  },
);

const productStackNavigator = createStackNavigator(
  {
    ProductsScreen: {
      screen: ProductsScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    AddProductScreen: {
      screen: AddProductScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    ProductDetailScreen: {
      screen: ProductDetailScreen,
      navigationOptions: {
        header: null,
      },
    },
    EditProduct: {
      screen: EditProductScreen,
      navigationOptions: {
        header: null,
      },
    },
  },
  {
    initialRouteName: 'ProductsScreen',
  },
);

const customerStackNavigator = createStackNavigator(
  {
    CustomersScreen: {
      screen: CustomersScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    AddCustomerScreen: {
      screen: AddCustomerScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    CustomerDetail: {
      screen: CustomerDetail,
      navigationOptions: {
        headerShown: false,
      },
    },
    EditCustomer: {
      screen: EditCustomerScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
  },
  {
    initialRouteName: 'CustomersScreen',
  },
);

const couponStackNavigator = createStackNavigator(
  {
    CouponsScreen: {
      screen: CouponsScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    AddCouponScreen: {
      screen: AddCouponScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    EditCoupon: {
      screen: EditCouponScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
  },
  {
    initialRouteName: 'CouponsScreen',
  },
);

const settingStack = createStackNavigator(
  {
    Setting: {
      screen: SettingScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    AddStaff: {
      screen: AddStaffScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    EditStaff: {
      screen: EditStaffScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    Printers: {
      screen: PrintersScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
  },
  {
    initialRouteName: 'Setting',
  },
);

const mainStackNavigator = createStackNavigator(
  {
    DashboardScreen: {
      screen: DashboardScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    POSScreen: {
      screen: POSScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    OrderScreen: {
      screen: OrderScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    Categories: {
      screen: categoryStackNavigator,
      navigationOptions: {
        headerShown: false,
      },
    },
    Products: {
      screen: productStackNavigator,
      navigationOptions: {
        headerShown: false,
      },
    },
    Customers: {
      screen: customerStackNavigator,
      navigationOptions: {
        headerShown: false,
      },
    },
    Coupon: {
      screen: couponStackNavigator,
      navigationOptions: {
        headerShown: false,
      },
    },
    Setting: {
      screen: settingStack,
      navigationOptions: {
        headerShown: false,
      },
    },
    EditProfileScreen: {
      screen: EditProfileScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
    ChangePassword: {
      screen: ChangePassword,
      navigationOptions: {
        headerShown: false,
      },
    },
    ReportsScreen: {
      screen: ReportsScreen,
      navigationOptions: {
        headerShown: false,
      },
    },
  },
  {
    initialRouteName: 'DashboardScreen',
    mode: 'card',
    navigationOptions: ({ navigation, screenProps }) => ({
      gestureEnabled: false,
      ...headerWithoutButtonBack({ navigation, screenProps }),
    }),
  },
);

export default mainStackNavigator;
