import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Calendar,
  User,
} from "lucide-react-native";
import { colors } from "../constants/theme";
import FloatingTabBar from "../components/common/FloatingTabBar";

// Screens
import ManagerDashboardScreen from "../screens/manager/ManagerDashboardScreen";
import ManagerBookingsScreen from "../screens/manager/ManagerBookingsScreen";
import ManagerProfileScreen from "../screens/manager/ManagerProfileScreen";
import ManagerBookingDetailScreen from "../screens/manager/ManagerBookingDetailScreen";
import ManagerCalendarScreen from "../screens/manager/ManagerCalendarScreen";
import NotificationsScreen from "../screens/customer/NotificationsScreen";
import CustomerChatThreadScreen from "../screens/customer/CustomerChatThreadScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ManagerTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="ManagerDashboard"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="ManagerDashboard"
        component={ManagerDashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ManagerBookings"
        component={ManagerBookingsScreen}
        options={{
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ManagerProfile"
        component={ManagerProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size || 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const ManagerNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="ManagerTabs"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
      <Stack.Screen name="ManagerBookingDetail" component={ManagerBookingDetailScreen} />
      <Stack.Screen name="BookingDetail" component={ManagerBookingDetailScreen} />
      <Stack.Screen name="ManagerCalendar" component={ManagerCalendarScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CustomerChatThread" component={CustomerChatThreadScreen} />
    </Stack.Navigator>
  );
};

export default ManagerNavigator;
