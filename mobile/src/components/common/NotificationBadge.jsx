import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { colors, radius, typography } from "../../constants/theme";

export const NotificationBadge = ({ count = 0, style }) => {
  const scale = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;

  useEffect(() => {
    if (count > 0) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [count]);

  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          transform: [{ scale }],
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{displayCount}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary, // brand coral
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  text: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
});

export default NotificationBadge;
