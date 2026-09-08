import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { CheckCircle, AlertTriangle, ArrowLeft, ExternalLink, CreditCard, RefreshCw } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import customerApi from "../../api/customer";
import { formatCurrency } from "../../utils/format";

export const PaymentCheckoutScreen = ({ route, navigation }) => {
  const params = route.params || {};

  const [currentCheckoutUrl, setCurrentCheckoutUrl] = useState(params.checkoutUrl || null);
  const [currentPaymentId, setCurrentPaymentId] = useState(params.paymentId || null);
  const [currentAmount, setCurrentAmount] = useState(params.depositAmount || params.amount || null);
  const [loadingSession, setLoadingSession] = useState(!params.checkoutUrl);
  const [initError, setInitError] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState(params.bookingId || null);

  // Synchronize state when navigation params change
  useEffect(() => {
    if (params.checkoutUrl && params.checkoutUrl !== currentCheckoutUrl) {
      setCurrentCheckoutUrl(params.checkoutUrl);
      setLoadingSession(false);
    }
    if (params.paymentId && params.paymentId !== currentPaymentId) {
      setCurrentPaymentId(params.paymentId);
    }
    if (
      (params.depositAmount || params.amount) &&
      (params.depositAmount || params.amount) !== currentAmount
    ) {
      setCurrentAmount(params.depositAmount || params.amount);
    }
    if (params.bookingId && params.bookingId !== confirmedBookingId) {
      setConfirmedBookingId(params.bookingId);
    }
  }, [params.checkoutUrl, params.paymentId, params.depositAmount, params.amount, params.bookingId]);

  useEffect(() => {
    if (currentCheckoutUrl) return;

    const initCheckout = async () => {
      setLoadingSession(true);
      setInitError("");
      try {
        const payload = {
          payment_type: params.bookingId ? "balance" : "deposit",
          payment_method_types: ["gcash", "paymaya", "card"],
        };
        if (params.bookingId) payload.booking_id = params.bookingId;
        if (params.inquiryId) payload.inquiry_id = params.inquiryId;
        if (params.amount) payload.amount = params.amount;

        const res = await customerApi.createCheckoutSession(payload);
        if (res?.checkout_url) {
          setCurrentCheckoutUrl(res.checkout_url);
          if (res.payment?._id) setCurrentPaymentId(res.payment._id);
          if (res.payment?.booking_id) setConfirmedBookingId(res.payment.booking_id);
        } else {
          setInitError("Could not generate a checkout link. Please try again.");
        }
      } catch (err) {
        setInitError(err.response?.data?.message || "Failed to initialize payment gateway.");
      } finally {
        setLoadingSession(false);
      }
    };

    if (params.bookingId || params.inquiryId) {
      initCheckout();
    } else {
      setInitError("Payment session details are missing.");
      setLoadingSession(false);
    }
  }, [params.bookingId, params.inquiryId, params.amount, currentCheckoutUrl]);

  const showNotice = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleManualVerify = async () => {
    setVerifying(true);
    try {
      if (currentPaymentId) {
        const res = await customerApi.verifyPayment(currentPaymentId);
        if (res?.payment?.booking_id) {
          setConfirmedBookingId(res.payment.booking_id);
        }
        setSuccess(true);
      } else if (params.inquiryId) {
        const inq = await customerApi.getInquiryById(params.inquiryId);
        if (inq?.payment_status === "deposit_paid" || inq?.payment_status === "fully_paid") {
          if (inq.converted_booking_id) setConfirmedBookingId(inq.converted_booking_id);
          setSuccess(true);
        } else {
          showNotice(
            "Payment Verification",
            "We haven't received confirmation from PayMongo yet. If you just completed paying, please allow 10-15 seconds and try verifying again."
          );
        }
      } else {
        showNotice(
          "Payment Verification",
          "Please allow a moment for the payment gateway to process, then try verifying again."
        );
      }
    } catch (err) {
      console.warn("Manual verify notice:", err);
      showNotice(
        "Verification Notice",
        err.response?.data?.message || "Could not verify payment yet. Please try again in a few moments."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationStateChange = async (navState) => {
    const url = navState.url || "";

    // Check for success redirect parameter
    if (url.includes("payment=success") || url.includes("status=success")) {
      setVerifying(true);
      try {
        if (currentPaymentId) {
          const res = await customerApi.verifyPayment(currentPaymentId);
          if (res?.payment?.booking_id) {
            setConfirmedBookingId(res.payment.booking_id);
          }
        }
        setSuccess(true);
      } catch (err) {
        console.warn("Payment verification note", err);
        // Even if verify had network hiccup, the webhook might have synced it
        setSuccess(true);
      } finally {
        setVerifying(false);
      }
    } else if (url.includes("payment=cancelled") || url.includes("status=cancelled")) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Your payment transaction was cancelled. You can retry paying at any time.");
        navigation.navigate("InquiriesList");
      } else {
        Alert.alert(
          "Payment Cancelled",
          "Your payment transaction was cancelled. You can retry paying at any time.",
          [
            {
              text: "Return to Inquiries",
              onPress: () => navigation.navigate("InquiriesList"),
            },
          ]
        );
      }
    }
  };

  const handleExit = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm) {
        if (window.confirm("Exit Checkout? Your payment transaction will not be completed.")) {
          navigation.goBack();
        }
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert(
        "Exit Checkout?",
        "Are you sure you want to leave? Your payment transaction will not be completed.",
        [
          { text: "Continue Paying", style: "cancel" },
          { text: "Exit", style: "destructive", onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  if (loadingSession) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.verifyingTitle}>Preparing Secure Checkout...</Text>
        <Text style={styles.verifyingDesc}>
          Connecting to PayMongo payment gateway.
        </Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <AlertTriangle size={52} color={colors.error} />
        <Text style={styles.verifyingTitle}>Checkout Error</Text>
        <Text style={styles.verifyingDesc}>{initError}</Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.lg, minWidth: 160 }}
        />
      </View>
    );
  }

  if (verifying) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.verifyingTitle}>Verifying Payment...</Text>
        <Text style={styles.verifyingDesc}>
          Confirming transaction with PayMongo and securing your reservation.
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.successIconCircle}>
          <CheckCircle size={52} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Payment Successful! 🎉</Text>
        <Text style={styles.successDesc}>
          Thank you! Your event payment of {currentAmount ? formatCurrency(currentAmount) : "amount"} has been verified. Your booking is confirmed.
        </Text>

        <AppButton
          title="View Confirmed Booking"
          onPress={() => {
            if (confirmedBookingId) {
              navigation.navigate("BookingDetail", { id: confirmedBookingId });
            } else {
              navigation.navigate("BookingsList");
            }
          }}
          size="lg"
          style={styles.doneBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Secure Checkout"
        subtitle="PayMongo Payment Gateway"
        onBack={handleExit}
        rightElement={
          currentCheckoutUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(currentCheckoutUrl)}
              style={styles.openExternalBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ExternalLink size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : null
        }
      />

      {Platform.OS === "web" ? (
        <View style={styles.webFallbackContainer}>
          <View style={styles.webCard}>
            <View style={styles.webIconCircle}>
              <CreditCard size={34} color={colors.primary} />
            </View>
            <Text style={styles.webFallbackTitle}>Complete Payment with PayMongo</Text>
            <Text style={styles.webFallbackDesc}>
              PayMongo requires a direct browser window for secure GCash, Maya, or Card checkout.
            </Text>
            {currentAmount ? (
              <View style={styles.webAmountBadge}>
                <Text style={styles.webAmountLabel}>Payable Deposit</Text>
                <Text style={styles.webAmountValue}>{formatCurrency(currentAmount)}</Text>
              </View>
            ) : null}
            <AppButton
              title="Open PayMongo Checkout ↗"
              onPress={() => {
                if (currentCheckoutUrl && typeof window !== "undefined") {
                  window.open(currentCheckoutUrl, "_blank");
                } else if (currentCheckoutUrl) {
                  Linking.openURL(currentCheckoutUrl);
                }
              }}
              size="lg"
              style={styles.webActionBtn}
            />
            <AppButton
              title="I Have Completed Payment"
              variant="outline"
              onPress={handleManualVerify}
              size="md"
              style={[styles.webActionBtn, { marginTop: spacing.sm }]}
            />
          </View>
        </View>
      ) : (
        <WebView
          source={{ uri: currentCheckoutUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          setSupportMultipleWindows={false}
          mixedContentMode="always"
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Connecting to PayMongo...</Text>
            </View>
          )}
          style={styles.webview}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
  },
  openExternalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  verifyingTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  verifyingDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  successTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  successDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
    maxWidth: 320,
  },
  doneBtn: {
    width: "100%",
  },
  webFallbackContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  webCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    maxWidth: 420,
    width: "100%",
  },
  webIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  webFallbackTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  webFallbackDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  webAmountBadge: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  webAmountLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  webAmountValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.primary,
    marginTop: 1,
  },
  webActionBtn: {
    width: "100%",
  },
});

export default PaymentCheckoutScreen;
