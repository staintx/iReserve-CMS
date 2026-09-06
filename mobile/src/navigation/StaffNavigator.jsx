import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Sun,
  Calendar,
  User,
} from "lucide-react-native";
import { colors } from "../constants/theme";
import FloatingTabBar from "../components/common/FloatingTabBar";

// Screens
import StaffTodayScreen from "../screens/staff/StaffTodayScreen";
import StaffAvailabilityScreen from "../screens/staff/StaffAvailabilityScreen";
import StaffProfileScreen from "../screens/staff/StaffProfileScreen";
import StaffEventDetailScreen from "../screens/staff/StaffEventDetailScreen";
import EquipmentChecklistScreen from "../screens/staff/EquipmentChecklistScreen";
import NotificationsScreen from "../screens/customer/NotificationsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const StaffTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="StaffToday"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="StaffToday"
        component={StaffTodayScreen}
        options={{
          tabBarLabel: "Today's Shift",
          tabBarIcon: ({ color, size }) => <Sun size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffAvailability"
        component={StaffAvailabilityScreen}
        options={{
          tabBarLabel: "Availability",
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size || 22} color={color} />,
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
      <Stack.Screen
        name="EquipmentChecklist"
        component={EquipmentChecklistScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
