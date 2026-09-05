import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";

export const LoadingState = ({ message = "Loading...", style }) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {Boolean(message) && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    fontWeight: "500",
  },
});

export default LoadingState;
