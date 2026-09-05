import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "../../constants/theme";

export const AppText = ({
  children,
  variant = "body", // display | h1 | h2 | h3 | body | subtext | caption | label
  color = colors.foreground,
  weight = "normal", // normal | medium | bold | semibold
  align = "left",
  style,
  numberOfLines,
  ...props
}) => {
  const getFontWeight = () => {
    switch (weight) {
      case "bold":
        return "700";
      case "semibold":
        return "600";
      case "medium":
        return "500";
      default:
        return "400";
    }
  };

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles[variant] || styles.body,
        {
          color,
          fontWeight: getFontWeight(),
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  display: {
    fontSize: typography.sizes.display,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: typography.sizes.title,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: typography.sizes.xxl,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: typography.sizes.xl,
    lineHeight: 26,
  },
  body: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  subtext: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  caption: {
    fontSize: typography.sizes.xs,
    lineHeight: 15,
  },
  label: {
    fontSize: typography.sizes.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

export default AppText;
