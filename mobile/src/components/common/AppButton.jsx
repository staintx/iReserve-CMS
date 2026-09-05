import React, { useRef } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, View, Animated } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export const AppButton = ({
  title,
  onPress,
  variant = "primary", // primary | secondary | outline | ghost | danger
  size = "md", // sm | md | lg
  disabled = false,
  loading = false,
  icon: IconComponent = null,
  iconPosition = "left",
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  const getBackgroundColor = () => {
    if (disabled) return "#E0D7D0";
    if (isPrimary) return colors.primary;
    if (isSecondary) return colors.secondary;
    if (isDanger) return colors.error;
    if (isOutline || isGhost) return "transparent";
    return colors.primary;
  };

  const getBorderColor = () => {
    if (disabled) return "#E0D7D0";
    if (isOutline) return colors.primary;
    if (isDanger) return colors.error;
    return "transparent";
  };

  const getTextColor = () => {
    if (disabled) return "#9E8F84";
    if (isPrimary || isSecondary || isDanger) return colors.white;
    if (isOutline || isGhost) return colors.primary;
    return colors.white;
  };

  const getHeight = () => {
    if (size === "sm") return 38;
    if (size === "lg") return 54;
    return 46;
  };

  const getFontSize = () => {
    if (size === "sm") return typography.sizes.sm;
    if (size === "lg") return typography.sizes.md;
    return typography.sizes.base;
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: isOutline ? 1.5 : 0,
            height: getHeight(),
            paddingHorizontal: size === "sm" ? spacing.md : spacing.xl,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {IconComponent && iconPosition === "left" && (
              <View style={styles.iconLeft}>
                <IconComponent size={size === "sm" ? 16 : 18} color={getTextColor()} />
              </View>
            )}
            <Text
              style={[
                styles.text,
                {
                  color: getTextColor(),
                  fontSize: getFontSize(),
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {IconComponent && iconPosition === "right" && (
              <View style={styles.iconRight}>
                <IconComponent size={size === "sm" ? 16 : 18} color={getTextColor()} />
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    width: "100%",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});

export default AppButton;
