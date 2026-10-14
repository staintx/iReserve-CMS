import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  CalendarCheck,
  User,
} from "lucide-react-native";
import { colors } from "../constants/theme";
import FloatingTabBar from "../components/common/FloatingTabBar";

// Screens
import StaffDashboardScreen from "../screens/staff/StaffDashboardScreen";
import StaffBookingsScreen from "../screens/staff/StaffBookingsScreen";
import StaffProfileScreen from "../screens/staff/StaffProfileScreen";
import StaffEventDetailScreen from "../screens/staff/StaffEventDetailScreen";
import StaffAvailabilityScreen from "../screens/staff/StaffAvailabilityScreen";
import NotificationsScreen from "../screens/customer/NotificationsScreen";
import CustomerChatThreadScreen from "../screens/customer/CustomerChatThreadScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const StaffTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="StaffDashboard"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="StaffDashboard"
        component={StaffDashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffBookings"
        component={StaffBookingsScreen}
        options={{
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const StaffNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="StaffTabs"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="StaffTabs" component={StaffTabs} />
      <Stack.Screen name="StaffEventDetail" component={StaffEventDetailScreen} />
      <Stack.Screen name="BookingDetail" component={StaffEventDetailScreen} />
      <Stack.Screen name="StaffAvailability" component={StaffAvailabilityScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CustomerChatThread" component={CustomerChatThreadScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    height: Platform.OS === "ios" ? 84 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default StaffNavigator;
