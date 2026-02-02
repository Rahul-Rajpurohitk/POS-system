import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'tamagui';
import { Home, Map, History, User } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DriverTabParamList, DriverStackParamList } from './types';

// Driver Screens
import DriverHomeScreen from '@/screens/driver/DriverHomeScreen';
import DeliveryMapScreen from '@/screens/driver/DeliveryMapScreen';
import DeliveryHistoryScreen from '@/screens/driver/DeliveryHistoryScreen';
import DriverProfileScreen from '@/screens/driver/DriverProfileScreen';
import DeliveryDetailScreen from '@/screens/driver/DeliveryDetailScreen';

const Tab = createBottomTabNavigator<DriverTabParamList>();
const DriverStack = createNativeStackNavigator<DriverStackParamList>();

// Driver Stack Navigator (for modals and detail screens)
export function DriverStackNavigator() {
  return (
    <DriverStack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <DriverStack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
    </DriverStack.Navigator>
  );
}

export function DriverNavigator() {
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
        name="DriverHome"
        component={DriverHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="DeliveryMap"
        component={DeliveryMapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => <Map size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="DeliveryHistory"
        component={DeliveryHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="DriverProfile"
        component={DriverProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default DriverNavigator;
