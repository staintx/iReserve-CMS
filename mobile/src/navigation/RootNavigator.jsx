import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { colors, typography, spacing } from "../constants/theme";

import AuthNavigator from "./AuthNavigator";
import CustomerNavigator from "./CustomerNavigator";
import ManagerNavigator from "./ManagerNavigator";
import StaffNavigator from "./StaffNavigator";

export const navigationRef = createNavigationContainerRef();

export const navigateGlobal = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>C</Text>
        </View>
        <Text style={styles.brandTitle}>Caezelle's Catering</Text>
        <Text style={styles.brandSubtitle}>Food & Events Management</Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.role === "manager" ? (
        <ManagerNavigator />
      ) : user?.role === "staff" ? (
        <StaffNavigator />
      ) : user?.role === "customer" ? (
        <CustomerNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: typography.sizes.title,
    fontWeight: "800",
    color: colors.white,
  },
  brandTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    marginTop: 4,
    letterSpacing: 0.2,
  },
});

export default RootNavigator;
