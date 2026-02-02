import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'tamagui';
import { Home, UtensilsCrossed, ShoppingCart, ClipboardList, User } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from 'tamagui';
import type { CustomerTabParamList, CustomerStackParamList } from './types';
import { useCustomerStore } from '@/store/customerStore';

// Customer Screens
import CustomerHomeScreen from '@/screens/customer/CustomerHomeScreen';
import MenuScreen from '@/screens/customer/MenuScreen';
import CartScreen from '@/screens/customer/CartScreen';
import OrderHistoryScreen from '@/screens/customer/OrderHistoryScreen';
import CustomerProfileScreen from '@/screens/customer/CustomerProfileScreen';
import CheckoutScreen from '@/screens/customer/CheckoutScreen';
import OrderTrackingScreen from '@/screens/customer/OrderTrackingScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();

// Cart Badge Component
function CartBadge() {
  const cartItemCount = useCustomerStore((s) => s.getCartItemCount());
  const theme = useTheme();

  if (cartItemCount === 0) return null;

  return (
    <View
      position="absolute"
      top={-4}
      right={-8}
      backgroundColor="$primary"
      borderRadius={10}
      minWidth={18}
      height={18}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={4}
    >
      <Text color="white" fontSize={10} fontWeight="bold">
        {cartItemCount > 99 ? '99+' : cartItemCount}
      </Text>
    </View>
  );
}

// Customer Stack Navigator (for modals and detail screens)
export function CustomerStackNavigator() {
  return (
    <CustomerStack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <CustomerStack.Screen name="Checkout" component={CheckoutScreen} />
      <CustomerStack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </CustomerStack.Navigator>
  );
}

export function CustomerNavigator() {
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
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <UtensilsCrossed size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingCart size={size} color={color} />
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="CustomerOrders"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default CustomerNavigator;
