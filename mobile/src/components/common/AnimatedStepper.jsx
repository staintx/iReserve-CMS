import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Plus, Minus } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export const AnimatedStepper = ({
  value = 0,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  size = "md", // sm | md | lg
  disabled = false,
  unit = "",
  style,
}) => {
  const minusScale = useRef(new Animated.Value(1)).current;
  const plusScale = useRef(new Animated.Value(1)).current;
  const valueScale = useRef(new Animated.Value(1)).current;

  const animatePress = (anim) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        speed: 50,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const bumpValue = () => {
    Animated.sequence([
      Animated.timing(valueScale, {
        toValue: 1.15,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(valueScale, {
        toValue: 1,
        speed: 50,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMinus = () => {
    if (disabled || value <= min) return;
    animatePress(minusScale);
    bumpValue();
    onChange(Math.max(min, value - step));
  };

  const handlePlus = () => {
    if (disabled || value >= max) return;
    animatePress(plusScale);
    bumpValue();
    onChange(Math.min(max, value + step));
  };

  const canMinus = !disabled && value > min;
  const canPlus = !disabled && value < max;

  const btnSize = size === "sm" ? 30 : size === "lg" ? 44 : 36;
  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ scale: minusScale }] }}>
        <Pressable
          onPress={handleMinus}
          disabled={!canMinus}
          style={[
            styles.button,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
            !canMinus && styles.buttonDisabled,
          ]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Minus size={iconSize} color={canMinus ? colors.foreground : colors.textDisabled} />
        </Pressable>
      </Animated.View>

      <View style={styles.valueWrapper}>
        <Animated.Text
          style={[
            styles.valueText,
            size === "sm" && styles.valueSmall,
            size === "lg" && styles.valueLarge,
            { transform: [{ scale: valueScale }] },
          ]}
        >
          {value}
        </Animated.Text>
        {Boolean(unit) && <Text style={styles.unitText}>{unit}</Text>}
      </View>

      <Animated.View style={{ transform: [{ scale: plusScale }] }}>
        <Pressable
          onPress={handlePlus}
          disabled={!canPlus}
          style={[
            styles.button,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
            !canPlus && styles.buttonDisabled,
          ]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Plus size={iconSize} color={canPlus ? colors.foreground : colors.textDisabled} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  buttonDisabled: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    opacity: 0.5,
  },
  valueWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    minWidth: 44,
  },
  valueText: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  valueSmall: {
    fontSize: typography.sizes.sm,
  },
  valueLarge: {
    fontSize: typography.sizes.xl,
  },
  unitText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginLeft: 3,
    fontWeight: "500",
  },
});

export default AnimatedStepper;
