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
import { Mail, Lock, Sparkles, Utensils, User, ShieldCheck, ChefHat } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppInput from "../../components/common/AppInput";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";

export const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, sessionExpired, clearSessionExpired } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email or username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      // RootNavigator will automatically route based on role
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Unable to sign in. Please verify your credentials.";
      setError(msg);
      if (msg.toLowerCase().includes("verify your email")) {
        Alert.alert(
          "Verification Required",
          "Please verify your email address before logging in.",
          [
            {
              text: "Verify Now",
              onPress: () =>
                navigation.navigate("OtpVerification", { email: email.trim() }),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword("Test1234!");
    setError("");
    setLoading(true);
    try {
      await login(demoEmail, "Test1234!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Unable to sign in with demo account.";
      setError(msg);
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
            paddingTop: insets.top + spacing.xl,
            paddingBottom: Platform.OS === "ios" ? insets.bottom + spacing.xl : spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Utensils size={30} color={colors.primary} />
          </View>
          <Text style={styles.brandName}>
            iReserve<Text style={styles.brandDot}>.</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Caezelle's Food, Catering & Services</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeDesc}>
            Sign in to manage your reservations, catering quotations, and events.
          </Text>
        </View>

        {/* Session Expired Banner */}
        {sessionExpired && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>
              Your session has expired. Please sign in again.
            </Text>
            <TouchableOpacity onPress={clearSessionExpired}>
              <Text style={styles.expiredBannerDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Banner */}
        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.form}>
          <AppInput
            ref={emailRef}
            label="Email or Username"
            placeholder="Enter your email or username"
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
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError("");
            }}
            leftIcon={Lock}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={() => navigation.navigate("ForgotPassword")}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <AppButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          {/* Quick Demo Access Pills */}
          <View style={styles.demoSection}>
            <View style={styles.demoDividerRow}>
              <View style={styles.demoDividerLine} />
              <Text style={styles.demoDividerText}>OR QUICK DEMO LOGIN</Text>
              <View style={styles.demoDividerLine} />
            </View>

            <View style={styles.demoPillsRow}>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => handleQuickDemo("mobile_tester@example.com")}
                disabled={loading}
                activeOpacity={0.7}
              >
                <User size={14} color={colors.primary} />
                <Text style={styles.demoPillText}>Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => handleQuickDemo("test_manager@example.com")}
                disabled={loading}
                activeOpacity={0.7}
              >
                <ShieldCheck size={14} color={colors.primary} />
                <Text style={styles.demoPillText}>Manager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => handleQuickDemo("test_staff@example.com")}
                disabled={loading}
                activeOpacity={0.7}
              >
                <ChefHat size={14} color={colors.primary} />
                <Text style={styles.demoPillText}>Staff</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLink}>Sign Up</Text>
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
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  brandName: {
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  brandDot: {
    color: colors.primary,
  },
  brandSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  welcomeSection: {
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  welcomeDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  expiredBannerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.warningText,
    flex: 1,
  },
  expiredBannerDismiss: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.warningDark,
    marginLeft: spacing.sm,
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
    lineHeight: 18,
  },
  form: {
    marginBottom: spacing.xl,
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  demoSection: {
    marginTop: spacing.xl,
  },
  demoDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  demoDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  demoDividerText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.foregroundMuted,
    marginHorizontal: spacing.sm,
    letterSpacing: 0.5,
  },
  demoPillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  demoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.pill,
    gap: 6,
  },
  demoPillText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
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
  registerLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
  },
});

export default LoginScreen;
