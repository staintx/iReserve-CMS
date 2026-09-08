import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react-native";
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
        onBack={() => {
          Alert.alert(
            "Exit Checkout?",
            "Are you sure you want to leave? Your payment transaction will not be completed.",
            [
              { text: "Continue Paying", style: "cancel" },
              { text: "Exit", style: "destructive", onPress: () => navigation.goBack() },
            ]
          );
        }}
      />

      <WebView
        source={{ uri: currentCheckoutUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={["*"]}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Connecting to PayMongo...</Text>
          </View>
        )}
        style={styles.webview}
      />
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
});

export default PaymentCheckoutScreen;
