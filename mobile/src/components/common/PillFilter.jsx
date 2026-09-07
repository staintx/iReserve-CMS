import React, { useRef } from "react";
import { ScrollView, Text, StyleSheet, Pressable, View, Animated } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

const FilterPill = ({ item, isSelected, onSelect }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const key = typeof item === "string" ? item : item.key;
  const label = typeof item === "string" ? item : item.label;
  const count = typeof item === "object" ? item.count : undefined;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => onSelect(key)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pill, isSelected ? styles.pillActive : styles.pillInactive]}
      >
        <Text style={[styles.pillText, isSelected ? styles.pillTextActive : styles.pillTextInactive]}>
          {label}
        </Text>
        {typeof count === "number" && (
          <View style={[styles.countBadge, isSelected ? styles.countBadgeActive : styles.countBadgeInactive]}>
            <Text style={[styles.countText, isSelected ? styles.countTextActive : styles.countTextInactive]}>
              {count}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

export const PillFilter = ({
  items = [],
  selectedKey,
  onSelect,
  style,
  contentContainerStyle,
}) => {
  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      >
        {items.map((item) => {
          const key = typeof item === "string" ? item : item.key;
          return (
            <FilterPill
              key={key}
              item={item}
              isSelected={selectedKey === key}
              onSelect={onSelect}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    alignItems: "center",
    gap: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.full,
    borderWidth: 1.2,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  pillTextActive: {
    color: colors.white,
  },
  pillTextInactive: {
    color: colors.foreground,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  countBadgeInactive: {
    backgroundColor: colors.powder,
  },
  countText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  countTextActive: {
    color: colors.white,
  },
  countTextInactive: {
    color: colors.foregroundMuted,
  },
});

export default PillFilter;
