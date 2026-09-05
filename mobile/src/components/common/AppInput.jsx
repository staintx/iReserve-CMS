import React, { useState, forwardRef } from "react";
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export const AppInput = forwardRef(({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  secureTextEntry = false,
  leftIcon: LeftIcon = null,
  keyboardType = "default",
  autoCapitalize = "none",
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...restProps
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          multiline && { height: numberOfLines * 24 + 24, alignItems: "flex-start" },
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
        ]}
      >
        {LeftIcon && (
          <View style={styles.leftIconWrapper}>
            <LeftIcon size={18} color={error ? colors.error : isFocused ? colors.primary : colors.foregroundMuted} />
          </View>
        )}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.textInput,
            multiline && { textAlignVertical: "top", paddingTop: 10 },
            inputStyle,
          ]}
          {...restProps}
        />

        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIconWrapper}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={colors.foregroundMuted} />
            ) : (
              <Eye size={18} color={colors.foregroundMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

AppInput.displayName = "AppInput";

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    width: "100%",
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderWidth: 1.2,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    // Note: NEVER add elevation here on Android! Dynamic elevation causes Android view hierarchy
    // to recreate elevation layers, which forces the native EditText to blur and closes the keyboard.
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },
  inputWrapperError: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: colors.errorLight,
  },
  inputWrapperDisabled: {
    opacity: 0.6,
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    height: "100%",
    color: colors.foreground,
    fontSize: typography.sizes.base,
    paddingVertical: 0,
  },
  rightIconWrapper: {
    padding: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    marginTop: spacing.xs,
  },
});

export default AppInput;
