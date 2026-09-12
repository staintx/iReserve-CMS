import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from "react-native";
import { colors, typography } from "../../constants/theme";

const MIN_DISPLAY_MS = 3000;

// Modern Apple-style ultra-smooth deceleration curve
export const SMOOTH_EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const AnimatedSplashScreen = ({
  isReady = false,
  slideAnim: externalSlideAnim,
  onAnimationComplete,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const startTimeRef = useRef(Date.now());
  const [hasStartedExit, setHasStartedExit] = useState(false);

  // Fallback if slideAnim is not provided by parent
  const fallbackSlideAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = externalSlideAnim || fallbackSlideAnim;

  // Logo animation values (appears first)
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoTranslateY = useRef(new Animated.Value(8)).current;

  // "iReserve" wordmark animation values (appears second)
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  // Fluid choreographed entrance
  useEffect(() => {
    // 1. Logo icon emerges smoothly
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 750,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 800,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. "iReserve" wordmark reveals underneath
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 650,
          easing: SMOOTH_EASE,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 650,
          easing: SMOOTH_EASE,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    return () => clearTimeout(textTimer);
  }, []);

  // Exit slide transition when ready (held for at least MIN_DISPLAY_MS)
  useEffect(() => {
    if (!isReady || hasStartedExit) return;

    const elapsed = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const exitTimer = setTimeout(() => {
      setHasStartedExit(true);

      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 580,
        easing: SMOOTH_EASE,
        useNativeDriver: true,
      }).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    }, remainingTime);

    return () => clearTimeout(exitTimer);
  }, [isReady, hasStartedExit, slideAnim, onAnimationComplete]);

  // Parallax translation: Splash gently recedes to the left as Login slides in
  const splashTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH * 0.32],
  });

  // Subtle scale-down gives physical depth
  const splashScale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  // Soft fade out towards the end of the slide
  const splashOpacity = slideAnim.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 0.6, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: splashOpacity,
          transform: [
            { translateX: splashTranslateX },
            { scale: splashScale },
          ],
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
    zIndex: 10,
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
