import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef, navigateGlobal } from "./navigationRef";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";
import AnimatedSplashScreen from "../components/common/AnimatedSplashScreen";

import AuthNavigator from "./AuthNavigator";
import CustomerNavigator from "./CustomerNavigator";
import ManagerNavigator from "./ManagerNavigator";
import StaffNavigator from "./StaffNavigator";

export { navigationRef, navigateGlobal };

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <View style={styles.rootContainer}>
      {/* Navigation Tree (mounted once auth check resolves) */}
      {!isLoading && (
        <NavigationContainer ref={navigationRef}>
          {!isAuthenticated ? (
            <AuthNavigator />
          ) : user?.role === "manager" || user?.role === "admin" ? (
            <ManagerNavigator />
          ) : user?.role === "staff" ? (
            <StaffNavigator />
          ) : user?.role === "customer" ? (
            <CustomerNavigator />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
      )}

      {/* Mobbin-style Animated Splash Overlay */}
      {!splashFinished && (
        <AnimatedSplashScreen
          isReady={!isLoading}
          onAnimationComplete={() => setSplashFinished(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

export default RootNavigator;

