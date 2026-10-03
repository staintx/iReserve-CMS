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
import { User, Mail, Lock, ChevronLeft } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";

import { evaluatePassword, describePasswordGap } from "../../utils/passwordPolicy";
import { validateName } from "../../utils/validationRules";

export const RegisterScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const handleRegister = async () => {
    const firstNameErr = validateName(firstName, "First name", { min: 2, max: 50, required: true });
    if (firstNameErr) {
      setError(firstNameErr);
      return;
    }
    const lastNameErr = validateName(lastName, "Last name", { min: 2, max: 50, required: true });
    if (lastNameErr) {
      setError(lastNameErr);
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
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
      const response = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert(
        "Verification Code Sent",
        `We've sent a 6-digit verification code to ${email.trim()}.`,
        [
          {
            text: "Enter Code",
            onPress: () =>
              navigation.navigate("OtpVerification", { email: email.trim().toLowerCase() }),
          },
        ]
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please check your information and try again."
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

        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Join iReserve to browse catering packages, customize event menus, and track quotations.
          </Text>
        </View>

        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <AppInput
            ref={firstNameRef}
            label="First Name"
            placeholder="e.g. Juan"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              if (error) setError("");
            }}
            leftIcon={User}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
          />

          <AppInput
            ref={lastNameRef}
            label="Last Name"
            placeholder="e.g. Dela Cruz"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              if (error) setError("");
            }}
            leftIcon={User}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <AppInput
            ref={emailRef}
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError("");
            }}
            leftIcon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AppInput
            ref={passwordRef}
            label="Password"
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
                {evaluatePassword(password).results.map((rule) => (
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
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (error) setError("");
            }}
            leftIcon={Lock}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <AppButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
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
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorBannerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.error,
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

export default RegisterScreen;
