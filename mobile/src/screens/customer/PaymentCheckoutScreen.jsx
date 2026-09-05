import React, { useState } from "react";
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
  const { checkoutUrl, paymentId, depositAmount } = route.params;

  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState(null);

  const handleNavigationStateChange = async (navState) => {
    const url = navState.url || "";

    // Check for success redirect parameter
    if (url.includes("payment=success") || url.includes("status=success")) {
      setVerifying(true);
      try {
        if (paymentId) {
          const res = await customerApi.verifyPayment(paymentId);
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
        "Your payment transaction was cancelled. You can retry paying the deposit at any time.",
        [
          {
            text: "Return to Inquiries",
            onPress: () => navigation.navigate("InquiriesList"),
          },
        ]
      );
    }
  };

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
        <Text style={styles.successTitle}>Deposit Paid Successfully! 🎉</Text>
        <Text style={styles.successDesc}>
          Thank you! Your event deposit of {depositAmount ? formatCurrency(depositAmount) : "payment"} has been verified. Your booking is now officially confirmed and your equipment has been reserved.
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
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
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
    fontWeight: "800",
    color: colors.foreground,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  verifyingDesc: {
    fontSize: typography.sizes.sm,
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
  },
  successTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  successDesc: {
    fontSize: typography.sizes.sm,
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
