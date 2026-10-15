import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CreditCard,
  Receipt,
  RefreshCcw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Filter,
  X,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import useRealTimeRefresh from "../../utils/useRealTimeRefresh";
import { formatCurrency, formatDate } from "../../utils/format";
import {
  getPaymentDueDate,
  isBookingOverdue,
  getReceiptNumber,
} from "../../utils/receiptHelpers";
import CustomerReceiptModal from "../../components/customer/CustomerReceiptModal";
import PaymentChoiceModal from "../../components/customer/PaymentChoiceModal";
import { showAlertDialog } from "../../context/DialogContext";

const BRAND_BLUE = "#4C81E0";

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Successful" },
  { key: "pending", label: "Pending" },
  { key: "refund", label: "Refunds" },
];

export const CustomerPaymentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Paying target indicator
  const [payingTargetId, setPayingTargetId] = useState(null);

  // Modals state
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  const [choiceBooking, setChoiceBooking] = useState(null);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);

  // Intercept Android hardware back button when either receipt or payment choice modal is open
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onBackPress = () => {
      if (receiptModalVisible) {
        setReceiptModalVisible(false);
        return true;
      }
      if (choiceModalVisible) {
        setChoiceModalVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [receiptModalVisible, choiceModalVisible]);

  // Fetch Payments & Bookings
  const loadData = useCallback(async () => {
    setError("");
    try {
      const [paymentsData, bookingsData, bizData] = await Promise.all([
        customerApi.getPayments(),
        customerApi.getBookings(),
        customerApi.getBusinessInfo().catch(() => null),
      ]);

      setPayments(Array.isArray(paymentsData) ? paymentsData : paymentsData?.data || []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : bookingsData?.data || []);
      if (bizData) setBusinessInfo(bizData);
    } catch (err) {
      console.warn("Error loading payments data:", err);
      setError("Unable to load payment records. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates subscription
  useRealTimeRefresh(() => {
    loadData();
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ── Calculation Helpers (Matching Web Portal 1:1) ──
  const getBookingPaidAmount = useCallback(
    (bookingId) => {
      return payments
        .filter(
          (p) =>
            String(p.booking_id?._id || p.booking_id) === String(bookingId) &&
            (p.payment_type || "").toLowerCase() !== "refund" &&
            Number(p.amount) > 0 &&
            ["approved", "paid", "successful"].includes((p.status || "").toLowerCase())
        )
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    },
    [payments]
  );

  const getBookingRefundAmount = useCallback(
    (bookingId) => {
      return payments
        .filter(
          (p) =>
            String(p.booking_id?._id || p.booking_id) === String(bookingId) &&
            ((p.payment_type || "").toLowerCase() === "refund" || Number(p.amount) < 0) &&
            ["approved", "paid", "successful", "refunded"].includes(
              (p.status || "").toLowerCase()
            )
        )
        .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
    },
    [payments]
  );

  const getBookingRemainingBalance = useCallback(
    (booking) => {
      if (!booking) return 0;
      const rawStatus = (booking.status || "").toLowerCase();
      if (["cancelled", "canceled", "rejected", "refunded"].includes(rawStatus)) return 0;
      const total = Number(booking.total_price || 0);
      const paid = getBookingPaidAmount(booking._id);
      const refunded = getBookingRefundAmount(booking._id);
      const netPaid = Math.max(0, paid - refunded);
      return Math.max(0, total - netPaid);
    },
    [getBookingPaidAmount, getBookingRefundAmount]
  );

  // Bookings with outstanding balances due
  const actionableBalanceBookings = useMemo(() => {
    return bookings
      .filter(
        (b) => !["cancelled", "refunded"].includes((b.status || "").toLowerCase())
      )
      .map((b) => {
        const remaining = getBookingRemainingBalance(b);
        const paid = getBookingPaidAmount(b._id);
        const isDepositStage =
          (b.status || "").toLowerCase().includes("deposit") ||
          b.payment_status === "pending" ||
          paid === 0;

        const progress =
          b.total_price > 0
            ? Math.min(100, Math.round((paid / b.total_price) * 100))
            : 0;

        const dueDate = getPaymentDueDate(b.event_date);
        const isOverdue = isBookingOverdue(b, paid);

        return {
          ...b,
          paidAmount: paid,
          remainingBalance: remaining,
          isDepositStage,
          progress,
          dueDate,
          isOverdue,
        };
      })
      .filter((b) => b.remainingBalance > 0);
  }, [bookings, getBookingPaidAmount, getBookingRemainingBalance]);

  // Filtered itemized payment transactions
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const isRefund =
          (p.payment_type || "").toLowerCase() === "refund" || Number(p.amount) < 0;
        const pStatus = String(p.status || "").toLowerCase();

        // 1. Status Filter Tab
        if (statusFilter !== "all") {
          if (statusFilter === "refund") {
            if (!isRefund) return false;
          } else if (statusFilter === "approved") {
            if (!["approved", "successful", "paid", "refunded"].includes(pStatus)) {
              return false;
            }
          } else if (statusFilter === "pending") {
            if (pStatus !== "pending") return false;
          }
        }

        // 2. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const b = p.booking_id;
          const eventType = (b?.event_type || "").toLowerCase();
          const ref = (b?.reference || "").toLowerCase();
          const pRef = (p.gateway_reference || p.reference_number || "").toLowerCase();
          const type = (p.payment_type || "").toLowerCase();
          const method = (p.method || p.payment_method || "").toLowerCase();
          const isRefStr = isRefund ? "refund" : "";

          return (
            eventType.includes(q) ||
            ref.includes(q) ||
            pRef.includes(q) ||
            type.includes(q) ||
            method.includes(q) ||
            isRefStr.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.paid_at || 0);
        const dateB = new Date(b.createdAt || b.paid_at || 0);
        return dateB - dateA;
      });
  }, [payments, statusFilter, searchQuery]);

  // Open Receipt Modal
  const handleOpenReceipt = (payment, booking = null) => {
    const matchedBooking =
      booking ||
      bookings.find(
        (b) => String(b._id) === String(payment.booking_id?._id || payment.booking_id)
      ) ||
      payment.booking_id;

    setReceiptPayment(payment);
    setReceiptBooking(matchedBooking);
    setReceiptModalVisible(true);
  };

  // Handle Payment Initiation for a Booking
  const handleStartPayment = (booking) => {
    if (booking.isDepositStage) {
      // Direct checkout for deposit stage
      initiateDepositCheckout(booking);
    } else {
      // Balance payment: open choice modal (online vs in-person cash)
      setChoiceBooking(booking);
      setChoiceModalVisible(true);
    }
  };

  const initiateDepositCheckout = async (booking) => {
    setPayingTargetId(booking._id);
    try {
      const res = await customerApi.createCheckoutSession({
        booking_id: booking._id,
        amount: booking.remainingBalance,
        payment_type: "deposit",
        payment_method_types: ["gcash", "paymaya", "card"],
      });

      if (res?.checkout_url) {
        navigation.navigate("PaymentCheckout", {
          checkoutUrl: res.checkout_url,
          paymentId: res.payment?._id,
          depositAmount: booking.remainingBalance,
          bookingId: booking._id,
        });
      } else {
        showAlertDialog({
          title: "Checkout Notice",
          message: "Could not generate checkout link. Please try again in a few moments.",
          tone: "warning",
        });
      }
    } catch (err) {
      showAlertDialog({
        title: "Payment Error",
        message: err.response?.data?.message || "Failed to initialize payment checkout.",
        tone: "destructive",
      });
    } finally {
      setPayingTargetId(null);
    }
  };

  const handleOnlineCheckoutFromChoice = async (payable) => {
    if (!choiceBooking) return;
    setPayingTargetId(choiceBooking._id);
    try {
      const res = await customerApi.createCheckoutSession({
        booking_id: choiceBooking._id,
        amount: payable,
        payment_type: "balance",
        payment_method_types: ["gcash", "paymaya", "card"],
      });

      if (res?.checkout_url) {
        navigation.navigate("PaymentCheckout", {
          checkoutUrl: res.checkout_url,
          paymentId: res.payment?._id,
          amount: payable,
          bookingId: choiceBooking._id,
        });
      } else {
        showAlertDialog({
          title: "Checkout Notice",
          message: "Could not generate checkout link. Please try again in a few moments.",
          tone: "warning",
        });
      }
    } catch (err) {
      showAlertDialog({
        title: "Payment Error",
        message: err.response?.data?.message || "Failed to initialize balance checkout.",
        tone: "destructive",
      });
    } finally {
      setPayingTargetId(null);
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status, isRefund = false) => {
    const s = String(status || "").toLowerCase();
    if (isRefund) {
      return (
        <View style={[styles.badgeBase, styles.badgeRefund]}>
          <RefreshCcw size={11} color={BRAND_BLUE} style={{ marginRight: 3 }} />
          <Text style={[styles.badgeText, { color: BRAND_BLUE }]}>Refunded</Text>
        </View>
      );
    }

    if (["approved", "successful", "paid"].includes(s)) {
      return (
        <View style={[styles.badgeBase, styles.badgeSuccess]}>
          <CheckCircle2 size={11} color={colors.success} style={{ marginRight: 3 }} />
          <Text style={[styles.badgeText, { color: colors.success }]}>Successful</Text>
        </View>
      );
    }

    if (s === "pending") {
      return (
        <View style={[styles.badgeBase, styles.badgePending]}>
          <Clock size={11} color={colors.warning} style={{ marginRight: 3 }} />
          <Text style={[styles.badgeText, { color: colors.warning }]}>Pending</Text>
        </View>
      );
    }

    return (
      <View style={[styles.badgeBase, styles.badgeFailed]}>
        <XCircle size={11} color={colors.error} style={{ marginRight: 3 }} />
        <Text style={[styles.badgeText, { color: colors.error }]}>Failed</Text>
      </View>
    );
  };

  // Milestone Label Resolver
  const renderMilestoneLabel = (type, isRefund = false) => {
    const t = String(type || "").toLowerCase();
    if (isRefund || t === "refund") return "Refund";
    if (t === "deposit") return "Deposit";
    if (t === "balance") return "Balance payment";
    if (t === "full") return "Full payment";
    return "Event payment";
  };

  // Payment Method Label Resolver
  const renderMethodLabel = (p) => {
    const isRefund = (p.payment_type || "").toLowerCase() === "refund" || Number(p.amount) < 0;
    if (isRefund) return "Original payment method";
    const m = String(p.method || p.payment_method || "PayMongo").toLowerCase();
    if (m.includes("gcash")) return "GCash";
    if (m.includes("maya")) return "Maya";
    if (m.includes("card")) return "Card";
    if (m.includes("cash")) return "Cash settlement";
    if (m.includes("bank")) return "Bank transfer";
    return "PayMongo";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── 1. Clean Mobile Screen Header ── */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: insets.top + (Platform.OS === "ios" ? 8 : 12) },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("CustomerTabs", { screen: "CustomerProfile" });
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Back to Profile"
        >
          <ArrowLeft size={22} color={colors.foregroundDark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Payments & Receipts</Text>

        <View style={{ width: 36 }} />
      </View>

      {/* ── 2. Scrollable Body Content (Continuous Vertical Scrolling) ── */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={BRAND_BLUE} />
          <Text style={styles.loadingText}>Loading payment records...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerLoading}>
          <XCircle size={40} color={colors.error} />
          <Text style={styles.errorTitle}>Error Loading Records</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 48 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND_BLUE}
              colors={[BRAND_BLUE]}
            />
          }
        >
          {/* ── SECTION A: OUTSTANDING BALANCES ── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <CreditCard size={17} color={BRAND_BLUE} />
                <Text style={styles.sectionTitle}>Outstanding Balances</Text>
              </View>
              {actionableBalanceBookings.length > 0 && (
                <View style={styles.actionCountPill}>
                  <Text style={styles.actionCountText}>
                    {actionableBalanceBookings.length} Action Needed
                  </Text>
                </View>
              )}
            </View>

            {actionableBalanceBookings.length === 0 ? (
              /* Calm State: No Balances Due */
              <View style={styles.settledCard}>
                <View style={styles.settledIconBubble}>
                  <ShieldCheck size={22} color={colors.success} />
                </View>
                <View style={styles.settledTextWrap}>
                  <Text style={styles.settledTitle}>All accounts are up to date</Text>
                  <Text style={styles.settledSub}>
                    You have no outstanding balances or pending payments due at this time.
                  </Text>
                </View>
              </View>
            ) : (
              /* Outstanding Balance Items */
              <View style={styles.balancesList}>
                {actionableBalanceBookings.map((b) => (
                  <View key={b._id} style={styles.balanceCard}>
                    {/* Top Row: Event Title, Reference & Status Tag */}
                    <View style={styles.balanceCardTop}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.balanceEventTitle} numberOfLines={1}>
                          {b.event_type || "Catering Event"}
                        </Text>
                        <View style={styles.balanceRefRow}>
                          <Text style={styles.balanceRefText}>
                            {b.reference || `BK-${b._id.slice(-6).toUpperCase()}`}
                          </Text>
                          {b.event_date && (
                            <>
                              <Text style={styles.dotDivider}>•</Text>
                              <Text style={styles.balanceDateText}>
                                {formatDate(b.event_date)}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Status Tag */}
                      <View
                        style={[
                          styles.stagePill,
                          b.isDepositStage ? styles.stagePillDeposit : styles.stagePillBalance,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stagePillText,
                            b.isDepositStage
                              ? { color: BRAND_BLUE }
                              : { color: colors.warningDark },
                          ]}
                        >
                          {b.isDepositStage ? "Deposit Due" : "Balance Due"}
                        </Text>
                      </View>
                    </View>

                    {/* Middle: Progress Bar */}
                    <View style={styles.balanceProgressWrap}>
                      <View style={styles.progressInfoRow}>
                        <Text style={styles.progressLabel}>
                          Paid{" "}
                          <Text style={{ fontWeight: "700", color: colors.success }}>
                            {formatCurrency(b.paidAmount)}
                          </Text>{" "}
                          of {formatCurrency(b.total_price)}
                        </Text>
                        <Text style={styles.progressPercent}>{b.progress}%</Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${b.progress}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Bottom: Due Amount & Action Buttons */}
                    <View style={styles.balanceCardBottom}>
                      <View>
                        <Text style={styles.dueAmountLabel}>AMOUNT DUE</Text>
                        <Text style={styles.dueAmountValue}>
                          {formatCurrency(b.remainingBalance)}
                        </Text>
                        {b.dueDate && (
                          <Text style={styles.dueNoticeText}>
                            Due by {formatDate(b.dueDate)}
                          </Text>
                        )}
                      </View>

                      <View style={styles.balanceActionsWrap}>
                        <TouchableOpacity
                          style={styles.viewBookingBtn}
                          onPress={() => navigation.navigate("BookingDetail", { id: b._id })}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewBookingBtnText}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.payNowBtn}
                          onPress={() => handleStartPayment(b)}
                          disabled={payingTargetId === b._id}
                          activeOpacity={0.85}
                        >
                          {payingTargetId === b._id ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <>
                              <CreditCard size={14} color={colors.white} />
                              <Text style={styles.payNowBtnText}>
                                {b.isDepositStage ? "Pay Deposit" : "Pay Balance"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── SECTION B: PAYMENT HISTORY ── */}
          <View style={[styles.sectionContainer, { marginTop: 24 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Receipt size={17} color={BRAND_BLUE} />
                <Text style={styles.sectionTitle}>Payment History</Text>
              </View>
              <Text style={styles.historyCountText}>
                {filteredPayments.length} transaction{filteredPayments.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {/* Filter Search & Status Chips */}
            <View style={styles.filterControlsWrap}>
              {/* Search Bar */}
              <View style={styles.searchWrap}>
                <Search size={15} color={colors.textDisabled} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search transactions or reference..."
                  placeholderTextColor={colors.textDisabled}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={15} color={colors.textDisabled} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
              >
                {FILTER_TABS.map((tab) => {
                  const isActive = statusFilter === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                      onPress={() => setStatusFilter(tab.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Vertically Scrollable Transaction List */}
            {filteredPayments.length === 0 ? (
              <View style={styles.emptyTransactionsCard}>
                <Receipt size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No payment records found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery.trim() || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "Transactions and official receipts will appear here once payments are made."}
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {filteredPayments.map((p) => {
                  const isRefund =
                    (p.payment_type || "").toLowerCase() === "refund" ||
                    Number(p.amount) < 0;

                  const b =
                    bookings.find(
                      (item) =>
                        String(item._id) === String(p.booking_id?._id || p.booking_id)
                    ) || p.booking_id;

                  const eventTitle = b?.event_type || p.inquiry_id?.event_type || "Catering Event";
                  const refCode = b?.reference || p.inquiry_id?.reference || "-";
                  const dateStr = formatDate(p.paid_at || p.createdAt);
                  const receiptNum = getReceiptNumber(p);

                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        styles.transactionCard,
                        isRefund && styles.transactionCardRefund,
                      ]}
                      onPress={() => handleOpenReceipt(p, b)}
                      activeOpacity={0.75}
                    >
                      {/* Top Row: Event Name & Status */}
                      <View style={styles.txTopRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.txEventTitle} numberOfLines={1}>
                            {eventTitle}
                          </Text>
                          <View style={styles.txMetaRow}>
                            <Text style={styles.txRefText}>{refCode}</Text>
                            <Text style={styles.dotDivider}>•</Text>
                            <Text style={styles.txDateText}>{dateStr}</Text>
                          </View>
                        </View>
                        {renderStatusBadge(p.status, isRefund)}
                      </View>

                      {/* Middle Details: Type & Method */}
                      <View style={styles.txMidRow}>
                        <View style={styles.txTypeTag}>
                          <Text style={styles.txTypeText}>
                            {renderMilestoneLabel(p.payment_type, isRefund)}
                          </Text>
                        </View>
                        <Text style={styles.txMethodText}>• {renderMethodLabel(p)}</Text>
                        {p.metadata?.reason && (
                          <Text style={styles.txReasonText} numberOfLines={1}>
                            ({p.metadata.reason})
                          </Text>
                        )}
                      </View>

                      {/* Bottom Row: Amount & Receipt Button */}
                      <View style={styles.txBottomRow}>
                        <View>
                          <Text style={styles.txAmountLabel}>
                            {isRefund ? "REFUND CREDITED" : "AMOUNT"}
                          </Text>
                          <Text
                            style={[
                              styles.txAmountValue,
                              isRefund && { color: BRAND_BLUE },
                            ]}
                          >
                            {isRefund
                              ? `− ${formatCurrency(Math.abs(p.amount))}`
                              : formatCurrency(p.amount)}
                          </Text>
                        </View>

                        <View style={styles.viewReceiptPill}>
                          {isRefund ? (
                            <RefreshCcw size={12} color={BRAND_BLUE} style={{ marginRight: 4 }} />
                          ) : (
                            <Receipt size={12} color={BRAND_BLUE} style={{ marginRight: 4 }} />
                          )}
                          <Text style={styles.viewReceiptText}>
                            {isRefund ? "Voucher" : "Receipt"}
                          </Text>
                          <ChevronRight size={13} color={BRAND_BLUE} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Receipt Modal ── */}
      <CustomerReceiptModal
        visible={receiptModalVisible}
        onClose={() => setReceiptModalVisible(false)}
        payment={receiptPayment}
        booking={receiptBooking}
        businessInfo={businessInfo}
      />

      {/* ── Balance Payment Choice Modal ── */}
      <PaymentChoiceModal
        visible={choiceModalVisible}
        onClose={() => setChoiceModalVisible(false)}
        booking={choiceBooking}
        balanceAmount={choiceBooking?.remainingBalance}
        onSuccess={loadData}
        onSelectOnline={handleOnlineCheckoutFromChoice}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    fontSize: 13,
  },

  // Section Headers
  sectionContainer: {
    width: "100%",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  actionCountPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  actionCountText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#92400E",
  },

  // Settled / Empty State
  settledCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  settledIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  settledTextWrap: {
    flex: 1,
  },
  settledTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  settledSub: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 2,
    lineHeight: 16,
  },

  // Outstanding Balances Cards
  balancesList: {
    gap: 12,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  balanceCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  balanceEventTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  balanceRefRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  balanceRefText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.textSubtle,
  },
  dotDivider: {
    fontSize: 11,
    color: colors.textDisabled,
    marginHorizontal: 5,
  },
  balanceDateText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
  },
  stagePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  stagePillDeposit: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  stagePillBalance: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  stagePillText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  balanceProgressWrap: {
    marginTop: 12,
  },
  progressInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  progressPercent: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.textSubtle,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  balanceCardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  dueAmountLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.textSubtle,
    letterSpacing: 0.5,
  },
  dueAmountValue: {
    fontSize: 18,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.foregroundDark,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  dueNoticeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  balanceActionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewBookingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
  },
  viewBookingBtnText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
  },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  payNowBtnText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.white,
  },

  // Payment History Section
  historyCountText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.medium,
    color: colors.textSubtle,
  },
  filterControlsWrap: {
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.foregroundDark,
    paddingVertical: 0,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: BRAND_BLUE,
    borderColor: BRAND_BLUE,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.medium,
    fontWeight: "500",
    color: colors.foregroundMuted,
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },

  // Transactions List
  transactionsList: {
    gap: 10,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  transactionCardRefund: {
    backgroundColor: "#F8FAFF",
    borderColor: "#BFDBFE",
  },
  txTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  txEventTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  txRefText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundMuted,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txDateText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
  },
  badgeBase: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  badgePending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  badgeRefund: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  badgeFailed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  txMidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
    gap: 4,
  },
  txTypeTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txTypeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
  },
  txMethodText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
  },
  txReasonText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    fontStyle: "italic",
  },
  txBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  txAmountLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.textDisabled,
    letterSpacing: 0.4,
  },
  txAmountValue: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.foregroundDark,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  viewReceiptPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  viewReceiptText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: BRAND_BLUE,
    marginRight: 2,
  },
  emptyTransactionsCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
});

export default CustomerPaymentsScreen;
