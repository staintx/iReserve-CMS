import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShieldCheck, ChevronLeft, RotateCcw } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppButton from "../../components/common/AppButton";
import authApi from "../../api/auth";

export const OtpVerificationScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const initialEmail = route?.params?.email || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = cleanText.slice(-1);
    setOtp(newOtp);

    if (cleanText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authApi.verifyOtp({ email, otp: code });
      Alert.alert(
        "Email Verified! 🎉",
        "Your account is now activated. You may now sign in.",
        [
          {
            text: "Sign In",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid or expired verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError("");
    setResending(true);

    try {
      await authApi.resendOtp({ email });
      setCountdown(60);
      Alert.alert("Code Sent", "A new 6-digit code has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code.");
    } finally {
      setResending(false);
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
          <ShieldCheck size={34} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>
          Insert the 6-digit verification code that we sent to{"\n"}
          <Text style={styles.emailHighlight}>{email || "your email"}</Text>
        </Text>

        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* 6-box input */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputRefs.current[idx] = ref)}
              style={[
                styles.otpBox,
                Boolean(digit) && styles.otpBoxFilled,
                Boolean(error) && styles.otpBoxError,
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        <AppButton
          title="Verify & Continue"
          onPress={handleVerify}
          loading={loading}
          size="lg"
          style={styles.verifyBtn}
        />

        <View style={styles.resendSection}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Resend code in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>
                {resending ? "Sending..." : "Resend Code"}
              </Text>
            </TouchableOpacity>
          )}
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
  emailHighlight: {
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.xl,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  verifyBtn: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  resendSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  resendText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  countdownText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.textSubtle,
  },
  resendLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
  },
});

export default OtpVerificationScreen;
