import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography, shadows } from "../../constants/theme";
import AppButton from "./AppButton";

export const FloatingActionBar = ({
  label,
  value,
  subvalue,
  buttonTitle,
  onButtonPress,
  buttonLoading = false,
  buttonDisabled = false,
  buttonVariant = "primary",
  secondaryButtonTitle,
  onSecondaryButtonPress,
  children,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md) + (Platform.OS === "android" ? spacing.xs : 0),
        },
        style,
      ]}
    >
      {children ? (
        children
      ) : (
        <View style={styles.contentRow}>
          {(Boolean(label) || Boolean(value)) && (
            <View style={styles.priceColumn}>
              {Boolean(label) && <Text style={styles.label}>{label}</Text>}
              {Boolean(value) && <Text style={styles.value}>{value}</Text>}
              {Boolean(subvalue) && <Text style={styles.subvalue}>{subvalue}</Text>}
            </View>
          )}

          <View style={styles.actionsColumn}>
            {Boolean(secondaryButtonTitle) && (
              <AppButton
                title={secondaryButtonTitle}
                onPress={onSecondaryButtonPress}
                variant="outline"
                size="md"
                style={styles.secondaryBtn}
              />
            )}
            {Boolean(buttonTitle) && (
              <AppButton
                title={buttonTitle}
                onPress={onButtonPress}
                loading={buttonLoading}
                disabled={buttonDisabled}
                variant={buttonVariant}
                size="md"
                style={styles.primaryBtn}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.base,
    ...shadows.md,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceColumn: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.4,
    marginTop: 1,
  },
  subvalue: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    marginTop: 1,
  },
  actionsColumn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  primaryBtn: {
    minWidth: 130,
  },
  secondaryBtn: {
    minWidth: 90,
  },
});

export default FloatingActionBar;
