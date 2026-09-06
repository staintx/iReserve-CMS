import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, Mail, ChevronLeft } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import authApi from "../../api/auth";

export const ForgotPasswordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to submit password reset request."
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
          styles.content,
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

        <Text style={styles.title}>
          {submitted ? "Check your email" : "Reset your password"}
        </Text>
        <Text style={styles.subtitle}>
          {submitted
            ? "We've sent a link to reset your password. Can't find the email? Check your spam folder or request a new link."
            : "Enter your registered email address and we'll send you instructions to reset your password."}
        </Text>

        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.emailHighlight}>{email}</Text>
            <AppButton
              title="Go to Login"
              onPress={() => navigation.navigate("Login")}
              size="lg"
              style={{ marginTop: spacing.xl, width: "100%" }}
            />
            <TouchableOpacity
              onPress={() => setSubmitted(false)}
              style={styles.resendLinkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.resendLinkText}>Resend link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <AppInput
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
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <AppButton
              title="Send Instructions"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
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
  title: {
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
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
  form: {
    width: "100%",
  },
  successCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  emailHighlight: {
    fontFamily: typography.fontFamilies.bold,
    fontSize: typography.sizes.base,
    color: colors.primary,
    textAlign: "center",
  },
  resendLinkBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  resendLinkText: {
    fontFamily: typography.fontFamilies.bold,
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
});

export default ForgotPasswordScreen;
