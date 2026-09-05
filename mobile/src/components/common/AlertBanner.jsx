import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { CreditCard, AlertCircle, ChevronRight } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export const AlertBanner = ({
  icon: IconComponent = CreditCard,
  message = "Payment needed. One booking has a balance still to pay.",
  actionLabel = "Show them",
  onPress,
  variant = "warning", // warning | info | success
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "info":
        return {
          bg: colors.infoLight,
          border: colors.infoBorder,
          iconColor: colors.info,
          textColor: colors.foreground,
          linkColor: colors.primary,
        };
      case "success":
        return {
          bg: colors.successLight,
          border: colors.successBorder,
          iconColor: colors.success,
          textColor: colors.successText,
          linkColor: colors.success,
        };
      case "warning":
      default:
        return {
          bg: colors.warningLight,
          border: colors.warningBorder,
          iconColor: colors.warning,
          textColor: colors.warningText,
          linkColor: colors.warningDark,
        };
    }
  };

  const currentTheme = getVariantStyles();

  const content = (
    <View
      style={[
        styles.banner,
        { backgroundColor: currentTheme.bg, borderColor: currentTheme.border },
        style,
      ]}
    >
      <View style={styles.iconCol}>
        <IconComponent size={18} color={currentTheme.iconColor} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.messageText, { color: currentTheme.textColor }]}>
          {message}{" "}
          {actionLabel ? (
            <Text style={[styles.actionText, { color: currentTheme.linkColor }]}>
              {actionLabel}
            </Text>
          ) : null}
        </Text>
      </View>
      {onPress && (
        <ChevronRight size={16} color={currentTheme.iconColor} style={styles.chevron} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: spacing.xs,
  },
  iconCol: {
    marginRight: spacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  messageText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    lineHeight: 18,
  },
  actionText: {
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});

export default AlertBanner;
