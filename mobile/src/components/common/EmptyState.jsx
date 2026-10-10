import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Inbox } from "lucide-react-native";
import { colors, spacing, typography } from "../../constants/theme";
import AppButton from "./AppButton";

export const EmptyState = ({
  icon: IconComponent = Inbox,
  title = "Nothing here yet",
  description = "Items will appear here once available.",
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <IconComponent size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <View style={styles.actionWrapper}>
          <AppButton title={actionLabel} onPress={onAction} size="md" />
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
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.borderFocus,
  },
  title: {
    fontSize: typography.sizes.base + 1,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  description: {
    fontSize: typography.sizes.xs + 1,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  actionWrapper: {
    marginTop: spacing.base,
  },
});

export default EmptyState;
