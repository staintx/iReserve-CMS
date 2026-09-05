import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WifiOff, CheckCircle2 } from "lucide-react-native";
import { useNetwork } from "../../context/NetworkContext";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";

export const OfflineBanner = () => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
      // Slide down
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline) {
      // Transition from offline to restored
      setShowRestored(true);
      const timer = setTimeout(() => {
        // Slide up and hide
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setWasOffline(false);
          setShowRestored(false);
        });
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !wasOffline && !showRestored) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.xs,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.banner,
          showRestored ? styles.bannerRestored : styles.bannerOffline,
        ]}
      >
        {showRestored ? (
          <>
            <CheckCircle2 size={15} color="#15803D" style={styles.icon} />
            <Text style={styles.textRestored}>Back online — Synced</Text>
          </>
        ) : (
          <>
            <WifiOff size={15} color="#B45309" style={styles.icon} />
            <Text style={styles.textOffline}>
              Offline mode — Showing saved data
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    ...shadows.md,
    maxWidth: 340,
  },
  bannerOffline: {
    backgroundColor: "#FEF3C7", // warm amber tint
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  bannerRestored: {
    backgroundColor: "#DCFCE7", // soft emerald tint
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  icon: {
    marginRight: spacing.xs,
  },
  textOffline: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.1,
  },
  textRestored: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: "#166534",
    letterSpacing: 0.1,
  },
});

export default OfflineBanner;
