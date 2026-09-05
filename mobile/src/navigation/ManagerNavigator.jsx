import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  User,
} from "lucide-react-native";
import { colors } from "../constants/theme";

// Screens
import ManagerDashboardScreen from "../screens/manager/ManagerDashboardScreen";
import ManagerBookingsScreen from "../screens/manager/ManagerBookingsScreen";
import ManagerCalendarScreen from "../screens/manager/ManagerCalendarScreen";
import ManagerProfileScreen from "../screens/manager/ManagerProfileScreen";
import ManagerBookingDetailScreen from "../screens/manager/ManagerBookingDetailScreen";
import AssignStaffModal from "../screens/manager/AssignStaffModal";
import EquipmentDispatchModal from "../screens/manager/EquipmentDispatchModal";
import NotificationsScreen from "../screens/customer/NotificationsScreen";
import CustomerChatThreadScreen from "../screens/customer/CustomerChatThreadScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ManagerTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="ManagerDashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
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
          tabBarLabel: "Operations",
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ManagerCalendar"
        component={ManagerCalendarScreen}
        options={{
          tabBarLabel: "Calendar",
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
      <Stack.Screen
        name="AssignStaffModal"
        component={AssignStaffModal}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="EquipmentDispatchModal"
        component={EquipmentDispatchModal}
        options={{ presentation: "modal" }}
      />
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

export default ManagerNavigator;
