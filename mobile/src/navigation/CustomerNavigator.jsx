import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  FileText,
  CalendarCheck,
  MessageSquare,
  User,
} from "lucide-react-native";
import { colors, typography, spacing, shadows } from "../constants/theme";

// Screens
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";
import InquiriesListScreen from "../screens/customer/InquiriesListScreen";
import BookingsListScreen from "../screens/customer/BookingsListScreen";
import CustomerMessagesScreen from "../screens/customer/CustomerMessagesScreen";
import CustomerProfileScreen from "../screens/customer/CustomerProfileScreen";

import InquiryWizardScreen from "../screens/customer/InquiryWizardScreen";
import QuotationDetailScreen from "../screens/customer/QuotationDetailScreen";
import PaymentCheckoutScreen from "../screens/customer/PaymentCheckoutScreen";
import BookingDetailScreen from "../screens/customer/BookingDetailScreen";
import PackagesScreen from "../screens/customer/PackagesScreen";
import PackageDetailScreen from "../screens/customer/PackageDetailScreen";
import CustomerChatThreadScreen from "../screens/customer/CustomerChatThreadScreen";
import ZelleChatScreen from "../screens/customer/ZelleChatScreen";
import NotificationsScreen from "../screens/customer/NotificationsScreen";

import { useSocket } from "../context/SocketContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomerTabs = () => {
  const { unreadMessagesCount } = useSocket();

  return (
    <Tab.Navigator
      initialRouteName="CustomerHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="InquiriesList"
        component={InquiriesListScreen}
        options={{
          tabBarLabel: "Inquiries",
          tabBarIcon: ({ color, size }) => <FileText size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="BookingsList"
        component={BookingsListScreen}
        options={{
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CustomerMessages"
        component={CustomerMessagesScreen}
        options={{
          tabBarLabel: "Messages",
          tabBarBadge:
            unreadMessagesCount > 0
              ? unreadMessagesCount > 99
                ? "99+"
                : unreadMessagesCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size || 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="CustomerTabs"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen
        name="InquiryWizard"
        component={InquiryWizardScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
      <Stack.Screen
        name="PaymentCheckout"
        component={PaymentCheckoutScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Packages" component={PackagesScreen} />
      <Stack.Screen name="PackageDetail" component={PackageDetailScreen} />
      <Stack.Screen name="CustomerChatThread" component={CustomerChatThreadScreen} />
      <Stack.Screen
        name="ZelleChat"
        component={ZelleChatScreen}
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
    borderTopColor: colors.cardBorder,
    height: Platform.OS === "ios" ? 86 : 66,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 26 : 10,
    ...shadows.sm,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
  },
});

export default CustomerNavigator;
