import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
  BackHandler,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  RefreshCw,
  Clock,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import customerApi from "../../api/customer";
import { formatCurrency } from "../../utils/format";
import { confirmAction, showAlertDialog } from "../../context/DialogContext";

export const PaymentCheckoutScreen = ({ route, navigation }) => {
  const params = route.params || {};
  const webViewRef = useRef(null);

  const isInquiryDeposit =
    Boolean(params.inquiryId) ||
    (!params.bookingId && (Boolean(params.depositAmount) || params.paymentType === "deposit"));

  const [currentCheckoutUrl, setCurrentCheckoutUrl] = useState(params.checkoutUrl || null);
  const [currentPaymentId, setCurrentPaymentId] = useState(params.paymentId || null);
  const [currentAmount, setCurrentAmount] = useState(params.depositAmount || params.amount || null);
  const [loadingSession, setLoadingSession] = useState(!params.checkoutUrl);
  const [initError, setInitError] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState(params.bookingId || null);

  const extractQueryParam = (url, paramName) => {
    try {
      const match = url.match(new RegExp(`[?&]${paramName}=([^&#]*)`));
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  };

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

  const handleReturn = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (params.inquiryId) {
      navigation.navigate("QuotationDetail", { inquiryId: params.inquiryId });
    } else if (params.bookingId) {
      navigation.navigate("BookingDetail", { id: params.bookingId });
    } else {
      navigation.navigate("CustomerTabs", { screen: "InquiriesList" });
    }
  }, [navigation, params.inquiryId, params.bookingId]);

  const handleRetry = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    } else if (currentCheckoutUrl) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(currentCheckoutUrl, "_blank");
      } else {
        Linking.openURL(currentCheckoutUrl);
      }
    }
  }, [currentCheckoutUrl]);

  const handleExit = useCallback(async () => {
    const shouldExit = await confirmAction({
      title: "Exit Checkout?",
      message:
        "Your payment transaction is not completed. If you exit now, your reservation or balance payment will remain pending until settled.",
      confirmText: "Exit Checkout",
      cancelText: "Continue Paying",
      tone: "warning",
      icon: AlertTriangle,
    });

    if (shouldExit) {
      handleReturn();
    }
  }, [handleReturn]);

  const handleManualVerify = async () => {
    setVerifying(true);
    try {
      if (currentPaymentId) {
        const res = await customerApi.verifyPayment(currentPaymentId);
        const pStatus = res?.payment?.status;
        if (res?.payment?.amount && !currentAmount) {
          setCurrentAmount(res.payment.amount);
        }

        if (pStatus === "approved") {
          if (res.payment?.booking_id) {
            setConfirmedBookingId(res.payment.booking_id);
          }
          setSuccess(true);
          return;
        } else if (pStatus === "rejected" || pStatus === "failed") {
          const shouldRetry = await confirmAction({
            title: "Payment Failed",
            message:
              "The payment transaction was rejected or failed. You can retry with another payment method or return.",
            tone: "destructive",
            confirmText: "Retry Payment",
            cancelText: isInquiryDeposit ? "Return to Inquiry" : "Return to Booking",
          });
          if (shouldRetry) {
            handleRetry();
          } else {
            handleReturn();
          }
          return;
        } else {
          showAlertDialog({
            title: "Payment Processing",
            message:
              "Payment is still being processed by the gateway. Please wait a few moments and tap 'Verify Payment Status' again.",
            tone: "info",
            confirmText: "Got It",
          });
          return;
        }
      } else if (params.inquiryId) {
        const inq = await customerApi.getInquiryById(params.inquiryId);
        if (inq?.payment_status === "deposit_paid" || inq?.payment_status === "fully_paid") {
          if (inq.converted_booking_id) setConfirmedBookingId(inq.converted_booking_id);
          setSuccess(true);
          return;
        } else {
          showAlertDialog({
            title: "Payment Not Verified Yet",
            message:
              "We haven't received confirmation from the gateway yet. If you just completed paying, please allow 10-15 seconds and try verifying again.",
            tone: "info",
            confirmText: "Got It",
          });
          return;
        }
      } else {
        showAlertDialog({
          title: "Payment Verification",
          message:
            "Please allow a moment for the payment gateway to process, then try verifying again.",
          tone: "info",
          confirmText: "Got It",
        });
      }
    } catch (err) {
      console.warn("Manual verify notice:", err);
      showAlertDialog({
        title: "Verification Notice",
        message:
          err.response?.data?.message ||
          "Could not verify payment yet. Please try again in a few moments.",
        tone: "warning",
        confirmText: "Got It",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationStateChange = async (navState) => {
    const url = navState.url || "";
    if (!url) return;

    // Check for success redirect parameter
    if (url.includes("payment=success") || url.includes("status=success")) {
      setVerifying(true);
      try {
        const resolvedPaymentId = currentPaymentId || extractQueryParam(url, "payment_id");
        if (resolvedPaymentId && !currentPaymentId) {
          setCurrentPaymentId(resolvedPaymentId);
        }
        const resolvedInquiryId = params.inquiryId || extractQueryParam(url, "inquiry_id");

        if (resolvedPaymentId) {
          const res = await customerApi.verifyPayment(resolvedPaymentId);
          const pStatus = res?.payment?.status;
          if (res?.payment?.amount && !currentAmount) {
            setCurrentAmount(res.payment.amount);
          }

          if (pStatus === "approved") {
            if (res.payment?.booking_id) {
              setConfirmedBookingId(res.payment.booking_id);
            }
            setSuccess(true);
            return;
          } else if (pStatus === "rejected" || pStatus === "failed") {
            const shouldRetry = await confirmAction({
              title: "Payment Failed",
              message:
                "The payment transaction was rejected or failed. You can retry with another payment method or return.",
              tone: "destructive",
              confirmText: "Retry Payment",
              cancelText: isInquiryDeposit ? "Return to Inquiry" : "Return to Booking",
            });
            if (shouldRetry) {
              handleRetry();
            } else {
              handleReturn();
            }
            return;
          } else {
            showAlertDialog({
              title: "Payment Processing",
              message:
                "We received your return from checkout, but confirmation is still processing with the gateway. Please tap 'Verify Payment Status' once complete.",
              tone: "info",
              confirmText: "Got It",
            });
            return;
          }
        } else if (resolvedInquiryId) {
          const inq = await customerApi.getInquiryById(resolvedInquiryId);
          if (inq?.payment_status === "deposit_paid" || inq?.payment_status === "fully_paid") {
            if (inq.converted_booking_id) setConfirmedBookingId(inq.converted_booking_id);
            setSuccess(true);
            return;
          } else {
            showAlertDialog({
              title: "Payment Processing",
              message:
                "Payment processing is underway. Please allow a few moments and tap 'Verify Payment Status' to confirm.",
              tone: "info",
              confirmText: "Got It",
            });
            return;
          }
        } else {
          showAlertDialog({
            title: "Payment Unverified",
            message:
              "We could not verify your transaction automatically. If you completed payment, please tap 'Verify Payment Status'.",
            tone: "warning",
            confirmText: "Got It",
          });
          return;
        }
      } catch (err) {
        console.warn("Payment verification error:", err);
        showAlertDialog({
          title: "Verification Check",
          message:
            err.response?.data?.message ||
            "Redirect received, but verification check could not be completed yet. Please tap 'Verify Payment Status'.",
          tone: "warning",
          confirmText: "Got It",
        });
      } finally {
        setVerifying(false);
      }
    } else if (
      url.includes("payment=cancelled") ||
      url.includes("status=cancelled") ||
      url.includes("payment=failed") ||
      url.includes("status=failed")
    ) {
      const isFail = url.includes("failed");
      const title = isFail ? "Payment Failed" : "Payment Cancelled";
      const message = isFail
        ? "Your payment transaction was declined or failed. Would you like to retry payment or return?"
        : isInquiryDeposit
        ? "Your payment transaction was cancelled. You can retry paying your deposit now or return to your inquiry."
        : "Your payment transaction was cancelled. You can retry paying now or return to your booking.";

      const shouldRetry = await confirmAction({
        title,
        message,
        tone: isFail ? "destructive" : "warning",
        confirmText: "Retry Payment",
        cancelText: isInquiryDeposit ? "Return to Inquiry" : "Return to Booking",
      });

      if (shouldRetry) {
        handleRetry();
      } else {
        handleReturn();
      }
    }
  };

  const handleSuccessDone = useCallback(() => {
    if (isInquiryDeposit) {
      if (params.inquiryId) {
        navigation.reset({
          index: 1,
          routes: [
            { name: "CustomerTabs", params: { screen: "InquiriesList" } },
            { name: "QuotationDetail", params: { inquiryId: params.inquiryId } },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "CustomerTabs", params: { screen: "InquiriesList" } }],
        });
      }
    } else {
      const targetId = params.bookingId || confirmedBookingId;
      if (targetId) {
        navigation.reset({
          index: 1,
          routes: [
            { name: "CustomerTabs", params: { screen: "BookingsList" } },
            { name: "BookingDetail", params: { id: targetId } },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "CustomerTabs", params: { screen: "BookingsList" } }],
        });
      }
    }
  }, [isInquiryDeposit, params.inquiryId, params.bookingId, confirmedBookingId, navigation]);

  // Intercept Android hardware back button to prevent accidental exit
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onBackPress = () => {
      if (success) {
        handleSuccessDone();
        return true;
      }
      handleExit();
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [handleExit, handleSuccessDone, success]);

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
          onPress={handleReturn}
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
          {isInquiryDeposit
            ? "Confirming deposit transaction with PayMongo and updating your inquiry status."
            : "Confirming transaction with PayMongo and updating your reservation."}
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
        <Text style={styles.successTitle}>Payment Successful</Text>
        <Text style={styles.successDesc}>
          {isInquiryDeposit
            ? `Thank you! Your event deposit of ${
                currentAmount ? formatCurrency(currentAmount) : "amount"
              } has been verified.`
            : `Thank you! Your payment of ${
                currentAmount ? formatCurrency(currentAmount) : "amount"
              } has been verified.`}
        </Text>

        {/* Clear Outcome & Next Steps Card */}
        <View style={styles.nextStepsCard}>
          <View style={styles.nextStepsHeader}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.nextStepsTitle}>Next Steps</Text>
          </View>
          <Text style={styles.nextStepsText}>
            {isInquiryDeposit
              ? "Your inquiry is now awaiting final admin confirmation and conversion into an official booking. Our banquet team will review your reservation schedule."
              : "Your payment records have been updated. You can review all event and payment details in your booking."}
          </Text>
        </View>

        <AppButton
          title={isInquiryDeposit ? "View Inquiry Details" : "View Booking Details"}
          onPress={handleSuccessDone}
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleManualVerify}
              style={styles.openExternalBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Verify Payment Status"
            >
              <RefreshCw size={17} color={colors.primary} />
            </TouchableOpacity>
            {currentCheckoutUrl ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(currentCheckoutUrl)}
                style={styles.openExternalBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Open External Browser"
              >
                <ExternalLink size={17} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
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
                <Text style={styles.webAmountLabel}>
                  {isInquiryDeposit ? "Payable Deposit" : "Remaining Balance Due"}
                </Text>
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
              title="Verify Payment Status"
              variant="outline"
              onPress={handleManualVerify}
              size="md"
              style={[styles.webActionBtn, { marginTop: spacing.sm }]}
            />
          </View>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  nextStepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    width: "100%",
    maxWidth: 340,
    marginBottom: spacing.xl,
  },
  nextStepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  nextStepsTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  nextStepsText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 18,
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

