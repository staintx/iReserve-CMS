import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, Lock, Key, ChevronLeft } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import authApi from "../../api/auth";
import { evaluatePassword, describePasswordGap } from "../../utils/passwordPolicy";

export const ResetPasswordScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const initialToken = route?.params?.token || "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const passwordEvaluation = evaluatePassword(password);

  const handleResetPassword = async () => {
    if (!token.trim()) {
      setError("Please enter your reset token or code.");
      return;
    }

    if (!password) {
      setError("Please enter your new password.");
      return;
    }

    const { isValid } = evaluatePassword(password);
    if (!isValid) {
      setError(describePasswordGap(password));
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.resetPassword({
        token: token.trim(),
        password,
      });

      Alert.alert(
        "Password Reset Complete! 🎉",
        "Your password has been updated. You can now sign in with your new credentials.",
        [
          {
            text: "Sign In",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. Please check your reset code or request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: Platform.OS === "ios" ? insets.bottom + spacing.xl : spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <KeyRound size={34} color={colors.primary} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Enter the reset token from your email and choose a strong new password for your iReserve account.
          </Text>
        </View>

        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <AppInput
            label="Reset Token / Code"
            placeholder="Paste reset token here"
            value={token}
            onChangeText={(text) => {
              setToken(text);
              if (error) setError("");
            }}
            leftIcon={Key}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AppInput
            ref={passwordRef}
            label="New Password"
            placeholder="Min 6 chars (A-Z, a-z, 0-9, special)"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError("");
            }}
            leftIcon={Lock}
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          />

          {password.length > 0 && (
            <View style={styles.passwordHintBox}>
              <View style={styles.policyRow}>
                {passwordEvaluation.results.map((rule) => (
                  <View
                    key={rule.id}
                    style={[
                      styles.policyChip,
                      rule.met ? styles.policyChipMet : styles.policyChipUnmet,
                    ]}
                  >
                    <Text
                      style={[
                        styles.policyChipText,
                        rule.met ? styles.policyTextMet : styles.policyTextUnmet,
                      ]}
                    >
                      {rule.met ? "✓ " : "• "}
                      {rule.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <AppInput
            ref={confirmPasswordRef}
            label="Confirm New Password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (error) setError("");
            }}
            leftIcon={Lock}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleResetPassword}
          />

          <AppButton
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.powder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    alignSelf: "flex-start",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
    width: "100%",
  },
  errorBannerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.error,
    textAlign: "center",
  },
  passwordHintBox: {
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.base,
    marginTop: -spacing.xs,
  },
  policyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  policyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  policyChipMet: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  policyChipUnmet: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  policyChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
  },
  policyTextMet: {
    color: colors.success,
    fontWeight: "700",
  },
  policyTextUnmet: {
    color: colors.foregroundMuted,
  },
  form: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  loginLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
  },
});

export default ResetPasswordScreen;
