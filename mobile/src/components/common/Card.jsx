import React, { useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { colors, radius, shadows, spacing } from "../../constants/theme";

export const Card = ({
  children,
  onPress,
  style,
  variant = "default", // default | elevated | outlined | flat
  padding = "base", // none | sm | base | lg
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const getPadding = () => {
    switch (padding) {
      case "none":
        return 0;
      case "sm":
        return spacing.sm;
      case "lg":
        return spacing.lg;
      default:
        return spacing.base;
    }
  };

  const cardContent = (
    <View
      style={[
        styles.base,
        styles[variant],
        { padding: getPadding() },
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {cardContent}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={[style]}>
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  default: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  elevated: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.surfaceAlt,
  },
});

export default Card;
