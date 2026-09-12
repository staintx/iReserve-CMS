import React, { useState, useRef } from "react";
import { View, StyleSheet, Animated, useWindowDimensions } from "react-native";
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

export const RootNavigator = ({ fontsLoaded = true }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // 0 = Splash active, 1 = Login / main app fully revealed
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isReady = !isLoading && fontsLoaded;

  // Modern horizontal slide-in for the incoming login / main screen
  const screenTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  const screenOpacity = slideAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.85, 1, 1],
  });

  const animatedAppStyle = !splashFinished
    ? [
        styles.appContainer,
        {
          transform: [{ translateX: screenTranslateX }],
          opacity: screenOpacity,
        },
      ]
    : styles.appContainerResting;

  return (
    <View style={styles.rootContainer}>
      {/* 1. Splash Screen rendered underneath */}
      {!splashFinished && (
        <AnimatedSplashScreen
          isReady={isReady}
          slideAnim={slideAnim}
          onAnimationComplete={() => setSplashFinished(true)}
        />
      )}

      {/* 2. Navigation Tree rendered on top and slides in from the right */}
      {isReady && (
        <Animated.View style={animatedAppStyle}>
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
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  appContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    zIndex: 20,
  },
  appContainerResting: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

export default RootNavigator;

