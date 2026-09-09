import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { colors, typography } from "../../constants/theme";

const MIN_DISPLAY_MS = 600;

// Modern Apple-style ultra-smooth deceleration curve
const SMOOTH_EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const AnimatedSplashScreen = ({ isReady = false, onAnimationComplete }) => {
  const startTimeRef = useRef(Date.now());
  const [hasStartedExit, setHasStartedExit] = useState(false);

  // Logo animation values (appears first)
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoTranslateY = useRef(new Animated.Value(6)).current;

  // "iReserve" wordmark animation values (appears second)
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  // Container exit dissolve
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Fluid choreographed entrance
  useEffect(() => {
    // 1. Logo icon emerges swiftly
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 350,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 380,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 380,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. "iReserve" wordmark reveals underneath
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          easing: SMOOTH_EASE,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 300,
          easing: SMOOTH_EASE,
          useNativeDriver: true,
        }),
      ]).start();
    }, 120);

    return () => clearTimeout(textTimer);
  }, []);

  // Exit dissolve when ready (held for at least MIN_DISPLAY_MS)
  useEffect(() => {
    if (!isReady || hasStartedExit) return;

    const elapsed = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const exitTimer = setTimeout(() => {
      setHasStartedExit(true);
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    }, remainingTime);

    return () => clearTimeout(exitTimer);
  }, [isReady, hasStartedExit, onAnimationComplete]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
        },
      ]}
      pointerEvents={hasStartedExit ? "none" : "auto"}
    >
      {/* Centered Brand: Logo first, then "iReserve" below */}
      <View style={styles.centerBlock}>
        <Animated.Image
          source={require("../../../assets/images/splash-icon.png")}
          style={[
            styles.logoMark,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: logoTranslateY },
              ],
            },
          ]}
          resizeMode="contain"
        />

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.brandTitle}>iReserve</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    width: 86,
    height: 86,
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 26,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundDark,
    letterSpacing: -0.5,
  },
});

export default AnimatedSplashScreen;
