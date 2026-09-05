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
import { Mail, Lock, Sparkles, Utensils } from "lucide-react-native";
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
            <Utensils size={32} color={colors.primary} />
          </View>
          <Text style={styles.brandName}>Caezelle's</Text>
          <Text style={styles.brandSubtitle}>Catering & Event Services</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeDesc}>
            Sign in to manage your reservations, quotations, and events.
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
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.powder,
  },
  brandName: {
    fontSize: typography.sizes.title,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.secondary,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  welcomeSection: {
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  welcomeDesc: {
    fontSize: typography.sizes.sm,
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
    color: colors.warning,
    flex: 1,
    fontWeight: "500",
  },
  expiredBannerDismiss: {
    fontSize: typography.sizes.xs,
    color: colors.warning,
    fontWeight: "700",
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
    color: colors.error,
    fontWeight: "500",
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
    color: colors.primary,
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
  },
  registerLink: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: "700",
  },
});

export default LoginScreen;
