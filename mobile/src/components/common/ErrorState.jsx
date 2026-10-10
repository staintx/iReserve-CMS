import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { colors, spacing, typography } from "../../constants/theme";
import AppButton from "./AppButton";

export const ErrorState = ({
  title = "Something went wrong",
  message = "Unable to connect to server. Please check your connection and try again.",
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <AlertCircle size={36} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <View style={styles.actionWrapper}>
          <AppButton
            title="Try Again"
            onPress={onRetry}
            size="sm"
            icon={RefreshCw}
            variant="outline"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.sizes.base + 1,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  message: {
    fontSize: typography.sizes.xs + 1,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  actionWrapper: {
    marginTop: spacing.base,
  },
});

export default ErrorState;
