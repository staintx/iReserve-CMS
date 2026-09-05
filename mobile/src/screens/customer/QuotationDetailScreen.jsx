import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Utensils,
  CreditCard,
  XCircle,
  Edit3,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { formatCurrency, formatDate, formatTime } from "../../utils/format";

export const QuotationDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { inquiryId, quotationId } = route.params;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Revision Modal
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  const loadQuotation = async () => {
    setError("");
    try {
      if (quotationId) {
        const data = await customerApi.getQuotationById(quotationId);
        setQuotation(data);
      } else if (inquiryId) {
        const quotes = await customerApi.getQuotationsForInquiry(inquiryId);
        if (Array.isArray(quotes) && quotes.length > 0) {
          // Sort to find latest version
          quotes.sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
          setQuotation(quotes[0]);
        } else {
          setQuotation(null);
        }
      }
    } catch (err) {
      setError("Unable to load quotation document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotation();
  }, [inquiryId, quotationId]);

  const handleAcceptAndPay = async () => {
    if (!quotation) return;

    Alert.alert(
      "Accept Quotation & Pay Deposit",
      `Accept this quotation and proceed to pay the initial deposit of ${formatCurrency(quotation.deposit_amount)} via PayMongo (GCash / Maya / Card)?`,
      [
        { text: "Review More", style: "cancel" },
        {
          text: "Proceed to Payment",
          onPress: async () => {
            setActionLoading(true);
            try {
              // 1. Accept quotation
              if (quotation.status !== "Accepted") {
                await customerApi.acceptQuotation(quotation._id);
              }

              // 2. Create PayMongo checkout session for deposit
              const checkoutRes = await customerApi.createCheckoutSession({
                inquiry_id: quotation.inquiry_id,
                amount: quotation.deposit_amount,
                payment_type: "deposit",
                payment_method_types: ["gcash", "paymaya", "card"],
              });

              if (checkoutRes?.checkout_url) {
                navigation.navigate("PaymentCheckout", {
                  checkoutUrl: checkoutRes.checkout_url,
                  paymentId: checkoutRes.payment?._id,
                  inquiryId: quotation.inquiry_id,
                  depositAmount: quotation.deposit_amount,
                });
              } else {
                Alert.alert("Checkout Initiated", "Quotation accepted. Please check payment status in bookings.");
                navigation.navigate("BookingsList");
              }
            } catch (err) {
              Alert.alert("Action Failed", err.response?.data?.message || "Failed to process quotation acceptance.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRequestRevision = async () => {
    if (!revisionNote.trim()) {
      Alert.alert("Note Required", "Please enter the adjustments or revisions you would like to request.");
      return;
    }

    setActionLoading(true);
    try {
      await customerApi.requestQuotationRevision(quotation._id, revisionNote.trim());
      setShowRevisionModal(false);
      setRevisionNote("");
      Alert.alert("Revision Requested", "Our event manager has received your feedback and will update the quotation.");
      loadQuotation();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit revision request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    Alert.alert(
      "Reject Quotation",
      "Are you sure you want to reject this quotation? You can still request another quote later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await customerApi.rejectQuotation(quotation._id);
              loadQuotation();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to reject quotation.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Quotation Document" onBack={() => navigation.goBack()} />
        <LoadingState message="Loading quotation details..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Quotation Document" onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={loadQuotation} />
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={styles.container}>
        <Header title="Quotation Document" onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <AlertCircle size={40} color={colors.secondary} />
          <Text style={styles.emptyTitle}>Quotation In Preparation</Text>
          <Text style={styles.emptyText}>
            Our event manager is currently reviewing your event requirements. Your itemized quote will appear here once ready.
          </Text>
        </View>
      </View>
    );
  }

  const isActionable = ["Sent", "Draft", "Revision Requested"].includes(quotation.status);
  const isAcceptedOrConverted = ["Accepted", "Converted to Booking"].includes(quotation.status);

  return (
    <View style={styles.container}>
      <Header
        title={`Quotation #${quotation.quotation_number || String(quotation._id).slice(-6).toUpperCase()}`}
        subtitle={`Version ${quotation.version_number || 1}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Header Card */}
        <Card style={styles.documentHeaderCard} variant="flat">
          <View style={styles.docRefRow}>
            <View>
              <Text style={styles.docBrand}>Caezelle's Catering</Text>
              <Text style={styles.docQuoteNumber}>
                {quotation.quotation_number || "Official Quotation"}
              </Text>
            </View>
            <StatusBadge status={quotation.status} />
          </View>

          {quotation.expiration_date && (
            <Text style={styles.expirationNotice}>
              Valid until: {formatDate(quotation.expiration_date)}
            </Text>
          )}

          {quotation.admin_notes ? (
            <View style={styles.adminNoteBox}>
              <Text style={styles.adminNoteLabel}>Manager's Message:</Text>
              <Text style={styles.adminNoteText}>{quotation.admin_notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Package & Event Baseline */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Package & Catering</Text>
          <View style={styles.lineItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineItemTitle}>{quotation.package_name || "Custom Catering Package"}</Text>
              <Text style={styles.lineItemSubtitle}>{quotation.guest_count || 0} Guests</Text>
            </View>
            <Text style={styles.lineItemPrice}>{formatCurrency(quotation.package_price || 0)}</Text>
          </View>

          {/* Inclusions */}
          {Array.isArray(quotation.package_inclusions) && quotation.package_inclusions.length > 0 && (
            <View style={styles.subList}>
              <Text style={styles.subListTitle}>Inclusions:</Text>
              {quotation.package_inclusions.map((inc, i) => (
                <Text key={i} style={styles.subListItem}>• {inc}</Text>
              ))}
            </View>
          )}
        </Card>

        {/* Menu Dishes */}
        {Array.isArray(quotation.menu_items) && quotation.menu_items.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Banquet Menu Selection</Text>
            {quotation.menu_items.map((item, idx) => (
              <View key={idx} style={styles.menuRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  <Text style={styles.menuItemMeta}>
                    {item.category || "Course"} • {item.quantity || 1} {item.unit || "serving"}
                  </Text>
                  {item.note ? <Text style={styles.menuItemNote}>{item.note}</Text> : null}
                </View>
                {item.price > 0 && (
                  <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Add-ons & Equipment */}
        {Array.isArray(quotation.add_ons) && quotation.add_ons.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Add-ons & Equipment Rentals</Text>
            {quotation.add_ons.map((addon, idx) => (
              <View key={idx} style={styles.lineItem}>
                <Text style={styles.lineItemTitle}>
                  {addon.name} (×{addon.quantity || 1})
                </Text>
                <Text style={styles.lineItemPrice}>
                  {formatCurrency((addon.price || 0) * (addon.quantity || 1))}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Additional Charges & Fees */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Logistics & Service Fees</Text>
          {quotation.transportation_fee > 0 && (
            <View style={styles.lineItem}>
              <Text style={styles.lineItemTitle}>Transportation / Delivery Fee</Text>
              <Text style={styles.lineItemPrice}>{formatCurrency(quotation.transportation_fee)}</Text>
            </View>
          )}

          {Array.isArray(quotation.additional_fees) &&
            quotation.additional_fees.map((fee, idx) => (
              <View key={idx} style={styles.lineItem}>
                <Text style={styles.lineItemTitle}>{fee.name || "Additional Fee"}</Text>
                <Text style={styles.lineItemPrice}>{formatCurrency(fee.amount)}</Text>
              </View>
            ))}

          {quotation.discounts > 0 && (
            <View style={styles.lineItem}>
              <Text style={[styles.lineItemTitle, { color: colors.success }]}>Special Discount</Text>
              <Text style={[styles.lineItemPrice, { color: colors.success }]}>
                -{formatCurrency(quotation.discounts)}
              </Text>
            </View>
          )}
        </Card>

        {/* Financial Summary */}
        <Card style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(quotation.subtotal || quotation.total_cost)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total Event Cost</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(quotation.total_cost)}</Text>
          </View>
          <View style={[styles.totalRow, styles.depositRow]}>
            <Text style={styles.depositLabel}>Required Initial Deposit</Text>
            <Text style={styles.depositValue}>{formatCurrency(quotation.deposit_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.balanceLabel}>Remaining Balance Due Before Event</Text>
            <Text style={styles.balanceValue}>{formatCurrency(quotation.remaining_balance)}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Action Bar */}
      {isActionable && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <AppButton
            title="Request Revision"
            onPress={() => setShowRevisionModal(true)}
            variant="outline"
            style={{ flex: 1, marginRight: spacing.sm }}
            size="md"
            disabled={actionLoading}
          />
          <AppButton
            title={`Accept & Pay ${formatCurrency(quotation.deposit_amount)}`}
            onPress={handleAcceptAndPay}
            loading={actionLoading}
            style={{ flex: 1.5 }}
            size="md"
          />
        </View>
      )}

      {/* Revision Modal */}
      <Modal visible={showRevisionModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Quotation Revision</Text>
              <TouchableOpacity onPress={() => setShowRevisionModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>
              Specify changes to guest count, dish choices, add-ons, or setup requirements:
            </Text>

            <AppInput
              placeholder="e.g. Please increase guests to 80, replace chicken with beef dish, and add 20 extra chairs."
              value={revisionNote}
              onChangeText={setRevisionNote}
              multiline
              numberOfLines={4}
            />

            <AppButton
              title="Submit Revision Request"
              onPress={handleRequestRevision}
              loading={actionLoading}
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  documentHeaderCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
    backgroundColor: colors.surfaceAlt,
  },
  docRefRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  docBrand: {
    fontSize: typography.sizes.xs,
    textTransform: "uppercase",
    fontWeight: "700",
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  docQuoteNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 2,
  },
  expirationNotice: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: spacing.xs,
  },
  adminNoteBox: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  adminNoteLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 2,
  },
  adminNoteText: {
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    lineHeight: 18,
  },
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    textTransform: "uppercase",
    color: colors.secondary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  lineItemTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  lineItemSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  lineItemPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  subList: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
  },
  subListTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foregroundMuted,
    marginBottom: 4,
  },
  subListItem: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 18,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  menuItemMeta: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  menuItemNote: {
    fontSize: 11,
    color: colors.secondary,
    fontStyle: "italic",
  },
  menuItemPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  totalCard: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
  },
  totalValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  grandTotalRow: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.foreground,
  },
  grandTotalValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "900",
    color: colors.primary,
  },
  depositRow: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.sm,
  },
  depositLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  depositValue: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.primary,
  },
  balanceLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  balanceValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.secondary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalCancel: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  modalPrompt: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    lineHeight: 20,
    marginBottom: spacing.base,
  },
});

export default QuotationDetailScreen;
