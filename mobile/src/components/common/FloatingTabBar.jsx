import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { colors, radius, shadows, typography, spacing } from "../../constants/theme";

/**
 * FloatingTabBar — Baemin/Glovo inspired floating rounded pill navigation dock
 */
export const FloatingTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const badge = options.tabBarBadge;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={[
                styles.tabItem,
                isFocused && styles.tabItemFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: isFocused ? colors.primary : colors.textSubtle,
                  size: 22,
                })}
                {Boolean(badge) && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? colors.primary : colors.textSubtle,
                    fontFamily: isFocused
                      ? typography.fontFamilies.bold
                      : typography.fontFamilies.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 22 : 14,
    left: 14,
    right: 14,
    alignItems: "center",
  },
  dock: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.dock,
    borderWidth: 1.2,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.dock,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.xl,
  },
  tabItemFocused: {
    backgroundColor: colors.primaryLight,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
});

export default FloatingTabBar;
