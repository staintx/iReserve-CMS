import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import {
  X,
  Receipt,
  RefreshCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import SerratedDivider from "../common/SerratedDivider";
import {
  OFFICIAL_BUSINESS_NAME,
  getReceiptNumber,
  getReceiptMilestoneLabel,
  getReceiptPaymentMethod,
  getReceiptCustomerDetails,
  getReceiptBookingDetails,
  getReceiptBusinessInfo,
  getReceiptFinancials,
  formatReceiptCurrency,
  formatReceiptDateTime,
  formatReceiptEventDate,
} from "../../utils/receiptHelpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const CustomerReceiptModal = ({
  visible,
  onClose,
  payment,
  booking,
  businessInfo,
}) => {
  if (!visible || !payment) return null;

  const isRefund =
    String(payment.payment_type || "").toLowerCase() === "refund" ||
    Number(payment.amount) < 0;

  const receiptNumber = getReceiptNumber(payment);
  const biz = getReceiptBusinessInfo(businessInfo);
  const customer = getReceiptCustomerDetails(payment, booking);
  const bookingDetails = getReceiptBookingDetails(payment, booking);
  const financials = getReceiptFinancials(payment, booking);

  const milestoneLabel = getReceiptMilestoneLabel(payment.payment_type);
  const methodLabel = getReceiptPaymentMethod(payment);
  const paidAt = payment.paid_at || payment.createdAt;

  // Safe client-facing reference
  const transactionRef =
    payment.gateway_reference ||
    payment.reference_number ||
    payment.metadata?.reference_number ||
    receiptNumber;

  const status = financials.status;
  const isApproved = financials.isApproved;

  const statusLabel = isRefund
    ? isApproved
      ? "REFUND COMPLETED"
      : "REFUND PENDING"
    : isApproved
    ? "PAID & APPROVED"
    : status === "pending"
    ? "PENDING VERIFICATION"
    : status.toUpperCase();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Top Bar with Title & Close Button */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrap,
                  isRefund ? styles.refundIconWrap : styles.receiptIconWrap,
                ]}
              >
                {isRefund ? (
                  <RefreshCcw size={18} color="#4C81E0" />
                ) : (
                  <Receipt size={18} color="#4C81E0" />
                )}
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isRefund ? "Refund Voucher" : "Payment Receipt"}
                </Text>
                <Text style={styles.headerSubtitle}>{receiptNumber}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
              accessibilityLabel="Close receipt"
            >
              <X size={20} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Receipt Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* 1. Official Business Header */}
            <View style={styles.brandSection}>
              <View style={styles.brandIconBubble}>
                <Building2 size={24} color="#4C81E0" />
              </View>
              <Text style={styles.brandName}>{OFFICIAL_BUSINESS_NAME}</Text>
              <Text style={styles.brandAddress}>{biz.address}</Text>
              <Text style={styles.brandContact}>
                {[biz.phone, biz.email].filter(Boolean).join(" • ")}
              </Text>

              {/* Status Pill */}
              <View
                style={[
                  styles.statusPill,
                  isRefund
                    ? styles.statusPillRefund
                    : isApproved
                    ? styles.statusPillSuccess
                    : styles.statusPillPending,
                ]}
              >
                {isApproved ? (
                  <CheckCircle2
                    size={12}
                    color={isRefund ? "#4C81E0" : colors.success}
                    style={{ marginRight: 4 }}
                  />
                ) : (
                  <Clock size={12} color={colors.warning} style={{ marginRight: 4 }} />
                )}
                <Text
                  style={[
                    styles.statusPillText,
                    isRefund
                      ? { color: "#4C81E0" }
                      : isApproved
                      ? { color: colors.success }
                      : { color: colors.warning },
                  ]}
                >
                  {statusLabel}
                </Text>
              </View>
              <Text style={styles.copyBadge}>Customer Acknowledgment Copy</Text>
            </View>

            {/* Serrated Divider */}
            <SerratedDivider
              color="#F1F5F9"
              teethCount={26}
              teethHeight={6}
              style={{ marginVertical: 12 }}
            />

            {/* 2. Customer Information */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Client Name</Text>
                <Text style={styles.detailValueBold}>{customer.name}</Text>
              </View>
              {customer.email && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{customer.email}</Text>
                </View>
              )}
              {customer.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{customer.phone}</Text>
                </View>
              )}
            </View>

            {/* 3. Event & Reservation Details */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Event Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking Reference</Text>
                <Text style={styles.detailValueMono}>{bookingDetails.bookingRef}</Text>
              </View>
              {bookingDetails.eventType && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Type</Text>
                  <Text style={styles.detailValueBold}>{bookingDetails.eventType}</Text>
                </View>
              )}
              {bookingDetails.packageName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Package</Text>
                  <Text style={styles.detailValue}>{bookingDetails.packageName}</Text>
                </View>
              )}
              {bookingDetails.eventDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Date</Text>
                  <Text style={styles.detailValue}>
                    {formatReceiptEventDate(bookingDetails.eventDate, { long: true })}
                  </Text>
                </View>
              )}
              {bookingDetails.guestCount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guest Count</Text>
                  <Text style={styles.detailValue}>{bookingDetails.guestCount} guests</Text>
                </View>
              )}
              {bookingDetails.venue && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Venue</Text>
                  <Text style={styles.detailValue}>{bookingDetails.venue}</Text>
                </View>
              )}
            </View>

            {/* 4. Payment Transaction Details */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Transaction Info</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Milestone</Text>
                <Text style={styles.detailValueBold}>{milestoneLabel}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{methodLabel}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Date</Text>
                <Text style={styles.detailValue}>{formatReceiptDateTime(paidAt)}</Text>
              </View>
              {transactionRef && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reference No.</Text>
                  <Text style={styles.detailValueMono}>{transactionRef}</Text>
                </View>
              )}
              {payment.metadata?.reason && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Note / Reason</Text>
                  <Text style={styles.detailValue}>{payment.metadata.reason}</Text>
                </View>
              )}
            </View>

            {/* 5. Financial Summary Box */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {isRefund ? "Refund Amount" : "Amount Paid"}
                </Text>
                <Text
                  style={[
                    styles.summaryAmount,
                    isRefund ? { color: "#4C81E0" } : { color: colors.foregroundDark },
                  ]}
                >
                  {formatReceiptCurrency(financials.amountPaid, { isRefund })}
                </Text>
              </View>

              {financials.totalBookingAmount != null && financials.totalBookingAmount > 0 && (
                <View style={[styles.detailRow, { marginTop: 8 }]}>
                  <Text style={styles.summarySubLabel}>Total Booking Amount</Text>
                  <Text style={styles.summarySubValue}>
                    {formatReceiptCurrency(financials.totalBookingAmount)}
                  </Text>
                </View>
              )}

              {financials.remainingBalance != null && !isRefund && (
                <View style={[styles.detailRow, { marginTop: 4 }]}>
                  <Text style={styles.summarySubLabel}>Remaining Balance</Text>
                  <Text
                    style={[
                      styles.summarySubValue,
                      financials.remainingBalance > 0
                        ? { color: "#4C81E0", fontWeight: "700" }
                        : { color: colors.success, fontWeight: "700" },
                    ]}
                  >
                    {financials.remainingBalance > 0
                      ? formatReceiptCurrency(financials.remainingBalance)
                      : "Settled (₱0.00)"}
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom Security Assurance */}
            <View style={styles.securityFooter}>
              <ShieldCheck size={14} color={colors.textDisabled} />
              <Text style={styles.securityText}>
                Official customer copy verified by iReserve reservation management
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Done Button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
    ...Platform.select({
      web: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      },
    }),
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptIconWrap: {
    backgroundColor: "#EFF6FF",
  },
  refundIconWrap: {
    backgroundColor: "#EFF6FF",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    fontVariant: ["tabular-nums"],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.powder,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  brandSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
  brandIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brandName: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.foregroundDark,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  brandAddress: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 2,
  },
  brandContact: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 10,
  },
  statusPillSuccess: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusPillPending: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusPillRefund: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  copyBadge: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBlock: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 3.5,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    textAlign: "right",
    flex: 1.5,
  },
  detailValueBold: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
    textAlign: "right",
    flex: 1.5,
  },
  detailValueMono: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  summaryAmount: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  summarySubLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
  },
  summarySubValue: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundDark,
    fontVariant: ["tabular-nums"],
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  securityText: {
    fontSize: 10,
    color: colors.textDisabled,
    textAlign: "center",
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  doneBtn: {
    backgroundColor: "#4C81E0",
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.white,
  },
});

export default CustomerReceiptModal;
