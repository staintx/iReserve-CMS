import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
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
  const inputRef = useRef(null);

  const [textValue, setTextValue] = useState(String(value ?? 0));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(String(value ?? 0));
    }
  }, [value, isFocused]);

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
    const nextVal = Math.max(min, value - step);
    setTextValue(String(nextVal));
    onChange(nextVal);
  };

  const handlePlus = () => {
    if (disabled || value >= max) return;
    animatePress(plusScale);
    bumpValue();
    const nextVal = Math.min(max, value + step);
    setTextValue(String(nextVal));
    onChange(nextVal);
  };

  const handleChangeText = (text) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setTextValue(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    let parsed = parseInt(textValue, 10);
    if (isNaN(parsed) || parsed < min) {
      parsed = min;
    } else if (parsed > max) {
      parsed = max;
    }
    setTextValue(String(parsed));
    onChange(parsed);
  };

  const canMinus = !disabled && value > min;
  const canPlus = !disabled && value < max;

  const btnSize = size === "sm" ? 30 : size === "lg" ? 44 : 36;
  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;

  return (
    <View style={[styles.container, disabled && styles.containerDisabled, style]}>
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

      <Pressable
        onPress={() => {
          if (!disabled && inputRef.current) {
            inputRef.current.focus();
          }
        }}
        style={[
          styles.valueWrapper,
          isFocused && styles.valueWrapperFocused,
        ]}
      >
        <Animated.View style={{ transform: [{ scale: valueScale }], flexDirection: "row", alignItems: "center" }}>
          <TextInput
            ref={inputRef}
            style={[
              styles.valueInput,
              size === "sm" && styles.valueSmall,
              size === "lg" && styles.valueLarge,
              disabled && styles.valueDisabled,
            ]}
            value={textValue}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            keyboardType="number-pad"
            returnKeyType="done"
            editable={!disabled}
            selectTextOnFocus
            underlineColorAndroid="transparent"
          />
          {Boolean(unit) && <Text style={styles.unitText}>{unit}</Text>}
        </Animated.View>
      </Pressable>

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
  containerDisabled: {
    opacity: 0.6,
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    minWidth: 54,
    height: "100%",
    borderRadius: radius.md,
  },
  valueWrapperFocused: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  valueInput: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    minWidth: 32,
    paddingVertical: Platform.OS === "ios" ? 4 : 0,
    paddingHorizontal: 2,
    margin: 0,
    includeFontPadding: false,
  },
  valueSmall: {
    fontSize: typography.sizes.sm,
  },
  valueLarge: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
  },
  valueDisabled: {
    color: colors.foregroundMuted,
  },
  unitText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginLeft: 3,
    fontWeight: "600",
  },
});

export default AnimatedStepper;
