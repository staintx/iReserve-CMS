import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  Utensils,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Check,
  Package,
  Edit3,
  X,
  AlertCircle,
  RefreshCw,
  Layers,
  Users,
  CheckCircle2,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import customerApi from "../../api/customer";
import messagesApi from "../../api/messages";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { formatCurrency, formatDate, formatShortDate, formatTime } from "../../utils/format";
import { groupInclusions } from "../../utils/packageDisplay";

export const QuotationDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { inquiryId, quotationId } = route.params;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  const quickTags = [
    "Adjust Guest Count",
    "Change Menu Items",
    "Update Event Time",
    "Modify Setup / Equipment",
  ];

  const handleOpenChat = async () => {
    const targetInquiryId =
      quotation?.inquiry_id?._id || quotation?.inquiry_id || inquiryId;
    if (!targetInquiryId) return;

    try {
      setActionLoading(true);
      const conv = await messagesApi.createConversation({
        inquiry_id: targetInquiryId,
      });

      navigation.navigate("CustomerChatThread", {
        conversationId: conv?._id || conv?.id,
        title: quotation?.event_type || quotation?.event_snapshot?.event_type
          ? `Inquiry: ${quotation?.event_type || quotation?.event_snapshot?.event_type}`
          : "Caezelle's Event Support",
        conversation: conv,
      });
    } catch (err) {
      try {
        const convList = await messagesApi.listConversations();
        const existing = Array.isArray(convList)
          ? convList.find((c) => {
              const inq = c.inquiry_id?._id || c.inquiry_id;
              return String(inq) === String(targetInquiryId);
            })
          : null;
        if (existing) {
          navigation.navigate("CustomerChatThread", {
            conversationId: existing._id,
            title: existing.inquiry_id?.event_type
              ? `Inquiry: ${existing.inquiry_id.event_type}`
              : "Caezelle's Event Support",
            conversation: existing,
          });
          return;
        }
      } catch {}
      Alert.alert(
        "Chat Unavailable",
        "Could not start chat session for this inquiry."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const loadQuotation = async () => {
    setError("");
    try {
      if (quotationId) {
        const data = await customerApi.getQuotationById(quotationId);
        setQuotation(data);
      } else if (inquiryId) {
        const quotes = await customerApi.getQuotationsForInquiry(inquiryId);
        if (Array.isArray(quotes) && quotes.length > 0) {
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

    const proceed = () => {
      executePaymentFlow();
    };

    const confirmMsg = `Accept this quotation and proceed to pay the initial deposit of ${formatCurrency(
      quotation.deposit_amount
    )} via PayMongo (GCash / Maya / Card)? Once paid, your event date is secured.`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm) {
        if (window.confirm(confirmMsg)) {
          proceed();
        }
      } else {
        proceed();
      }
    } else {
      Alert.alert(
        "Accept Quotation & Pay Deposit",
        confirmMsg,
        [
          { text: "Review More", style: "cancel" },
          { text: "Proceed to Payment", onPress: proceed },
        ]
      );
    }
  };

  const executePaymentFlow = async () => {
    setActionLoading(true);
    try {
      // 1. Accept quotation if not already accepted or awaiting final confirmation
      const isAlreadyAcceptedOrAwaiting =
        quotation.status === "Awaiting Final Confirmation" ||
        quotation.status === "Accepted";

      if (!isAlreadyAcceptedOrAwaiting) {
        try {
          await customerApi.acceptQuotation(quotation._id);
        } catch (acceptErr) {
          console.warn("Quotation accept notice:", acceptErr);
          const msg = acceptErr.response?.data?.message || "";
          if (
            !msg.includes("already") &&
            !msg.includes("Awaiting") &&
            !msg.includes("accepted")
          ) {
            throw acceptErr;
          }
        }
      }

      // 2. Resolve clean inquiry ID string
      const targetInqId =
        typeof quotation?.inquiry_id === "object" && quotation?.inquiry_id !== null
          ? quotation.inquiry_id._id
          : quotation?.inquiry_id || inquiryId;

      if (!targetInqId) {
        throw new Error("Missing inquiry identifier for this quotation.");
      }

      // 3. Create PayMongo checkout session for deposit
      const checkoutRes = await customerApi.createCheckoutSession({
        inquiry_id: String(targetInqId),
        amount: Number(quotation.deposit_amount),
        payment_type: "deposit",
        payment_method_types: ["gcash", "paymaya", "card"],
      });

      if (checkoutRes?.checkout_url) {
        navigation.navigate("PaymentCheckout", {
          checkoutUrl: checkoutRes.checkout_url,
          paymentId: checkoutRes.payment?._id,
          inquiryId: String(targetInqId),
          depositAmount: quotation.deposit_amount,
        });
      } else {
        const infoMsg = "Quotation accepted. Please check payment status in your bookings list.";
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(infoMsg);
        } else {
          Alert.alert("Checkout Initiated", infoMsg);
        }
        navigation.navigate("BookingsList");
      }
    } catch (err) {
      console.error("Payment initiation error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to process quotation payment.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`Payment Notice: ${errorMsg}`);
      } else {
        Alert.alert("Payment Notice", errorMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNote.trim()) {
      const msg = "Please describe the adjustments or revisions you would like our team to make.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(msg);
      } else {
        Alert.alert("Note Required", msg);
      }
      return;
    }

    setActionLoading(true);
    try {
      await customerApi.requestQuotationRevision(quotation._id, revisionNote.trim());
      setShowRevisionModal(false);
      setRevisionNote("");
      const successMsg = "Our banquet manager has received your feedback and will update the quotation.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(successMsg);
      } else {
        Alert.alert("Revision Requested", successMsg);
      }
      loadQuotation();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to submit revision request.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(errMsg);
      } else {
        Alert.alert("Error", errMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Grouped inclusions using the ported helper
  const inclusionGroups = useMemo(() => {
    return groupInclusions(quotation?.package_inclusions || []);
  }, [quotation?.package_inclusions]);

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
          <AlertCircle size={44} color={colors.secondary} />
          <Text style={styles.emptyTitle}>Quotation In Preparation</Text>
          <Text style={styles.emptyText}>
            Our banquet team is reviewing your event requirements. Your itemized quote will appear here once ready.
          </Text>
        </View>
      </View>
    );
  }

  const snapshot = quotation.event_snapshot || null;
  const isPastExpiry = Boolean(
    quotation.expiration_date &&
      new Date(quotation.expiration_date).setHours(23, 59, 59, 999) < Date.now()
  );
  const eventDateVal = snapshot?.event_date;
  const isWithinLockout = Boolean(
    eventDateVal &&
      new Date(eventDateVal).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000
  );
  const isExpired = isPastExpiry || isWithinLockout;

  const isDepositPaid =
    quotation.status === "Accepted" ||
    quotation.status === "Converted to Booking" ||
    quotation.inquiry_payment_status === "deposit_paid" ||
    quotation.inquiry_payment_status === "fully_paid";

  const isRevisionPending = quotation.status === "Revision Requested";

  const canPayDeposit =
    !isDepositPaid &&
    !isExpired &&
    ["Sent", "Draft", "Revision Requested", "Awaiting Final Confirmation"].includes(
      quotation.status
    );

  const canRequestRevision =
    !isDepositPaid &&
    !isExpired &&
    ["Sent", "Draft", "Awaiting Final Confirmation"].includes(quotation.status);

  const isActionable = !isDepositPaid && (canPayDeposit || isRevisionPending);

  // Check if fees exist to avoid empty card
  const additionalFees = (Array.isArray(quotation.additional_fees) ? quotation.additional_fees : [])
    .filter((fee) => Number(fee?.amount) > 0);
  const hasFees =
    Number(quotation.transportation_fee) > 0 ||
    Number(quotation.equipment_fee) > 0 ||
    Number(quotation.decoration_fee) > 0 ||
    additionalFees.length > 0 ||
    Number(quotation.discounts) > 0;

  // Deductions & Adjustments
  const startingPrice = Number(quotation.package_starting_price || 0);
  const removedInclusions = (Array.isArray(quotation.removed_inclusions) ? quotation.removed_inclusions : [])
    .filter((entry) => entry?.name);
  const inclusionAdjustments = (
    Array.isArray(quotation.inclusion_adjustments) ? quotation.inclusion_adjustments : []
  ).filter((entry) => entry?.name && Number(entry?.amount));
  const showPackageBreakdown =
    startingPrice > 0 && (removedInclusions.length > 0 || inclusionAdjustments.length > 0);

  // Event Context
  const eventDateFormatted = snapshot?.event_date ? formatDate(snapshot.event_date) : null;
  const startTimeFormatted = snapshot?.start_time ? formatTime(snapshot.start_time) : null;
  const venueAddress = [
    snapshot?.street,
    snapshot?.barangay,
    snapshot?.municipality,
    snapshot?.province,
  ].filter(Boolean).join(", ") || snapshot?.venue_type || null;
  const eventType = snapshot?.event_type || quotation.event_type || null;
  const guestCount = quotation.guest_count || snapshot?.guest_count || 0;
  const hasEventDetails = Boolean(eventDateFormatted || guestCount > 0 || venueAddress || eventType);

  return (
    <View style={styles.container}>
      <Header
        title={`Quotation #${quotation.quotation_number || String(quotation._id).slice(-6).toUpperCase()}`}
        subtitle={`Version ${Number(quotation.version_number) || 1}.0`}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            onPress={handleOpenChat}
            style={styles.headerChatBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <MessageSquare size={19} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (isActionable ? 108 : 36) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Header & Authority Card */}
        <View style={styles.documentHeaderCard}>
          <View style={styles.docRefRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.brandRow}>
                <View style={styles.brandBadgeDot} />
                <Text style={styles.docBrand}>Caezelle's Catering</Text>
              </View>
              <Text style={styles.docQuoteNumber}>
                {quotation.quotation_number || "Official Quotation"}
              </Text>
            </View>
            <StatusBadge status={quotation.status} />
          </View>

          {/* Expiration or Validity Notice */}
          <View style={styles.metaRow}>
            <Clock size={13} color={isExpired ? colors.error : colors.textSubtle} />
            <Text style={[styles.metaText, isExpired && { color: colors.error, fontWeight: "600" }]}>
              {quotation.expiration_date
                ? `${isExpired ? "Expired on " : "Valid until: "}${formatDate(quotation.expiration_date)}`
                : "Valid for 7 days upon receipt"}
            </Text>
          </View>

          {/* Manager's Note / AI Recommendation Box (Craft floor compliant: no 3px stripe) */}
          {quotation.admin_notes ? (
            <View style={styles.managerNoteBox}>
              <View style={styles.managerNoteHeader}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={styles.managerNoteTitle}>
                  {quotation.admin_notes.toLowerCase().includes("ai suggestion")
                    ? "Event Setup Recommendation"
                    : "Banquet Manager's Note"}
                </Text>
              </View>
              <Text style={styles.managerNoteBody}>{quotation.admin_notes}</Text>
            </View>
          ) : null}

          {/* Customer Change Request Status Notice */}
          {quotation.customer_response && (
            <View style={styles.customerResponseBox}>
              <View style={styles.customerResponseHeader}>
                <RefreshCw size={13} color={isRevisionPending ? colors.warningDark : colors.primary} />
                <Text
                  style={[
                    styles.customerResponseTitle,
                    { color: isRevisionPending ? colors.warningDark : colors.primary },
                  ]}
                >
                  {isRevisionPending ? "Your Change Request is Under Review" : "Your Earlier Feedback"}
                </Text>
              </View>
              <Text style={styles.customerResponseBody}>"{quotation.customer_response}"</Text>
            </View>
          )}
        </View>

        {/* Event Schedule & Logistics Overview (Context for the customer) */}
        {hasEventDetails && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Event Information</Text>
            <View style={styles.eventGridCard}>
              <View style={styles.eventGridRow}>
                <View style={styles.eventGridItem}>
                  <View style={styles.gridIconWrap}>
                    <Calendar size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gridItemLabel}>Date & Time</Text>
                    <Text style={styles.gridItemValue}>
                      {eventDateFormatted || "To be confirmed"}
                    </Text>
                    {startTimeFormatted && (
                      <Text style={styles.gridItemSub}>{startTimeFormatted}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.eventGridItem}>
                  <View style={styles.gridIconWrap}>
                    <Users size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gridItemLabel}>Guests & Event</Text>
                    <Text style={styles.gridItemValue}>
                      {guestCount > 0 ? `${guestCount} Guests` : "Count TBA"}
                    </Text>
                    {eventType && <Text style={styles.gridItemSub}>{eventType}</Text>}
                  </View>
                </View>
              </View>

              {venueAddress && (
                <View style={styles.eventAddressRow}>
                  <View style={styles.gridIconWrap}>
                    <MapPin size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gridItemLabel}>Venue / Location</Text>
                    <Text style={styles.gridItemValue} numberOfLines={2}>
                      {venueAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Package & Categorized Inclusions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Package & Inclusions</Text>
          <View style={styles.cardBox}>
            <View style={styles.packageHeaderRow}>
              <View style={styles.packageIconWrap}>
                <Package size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.packageName}>
                  {quotation.package_name || "Custom Catering Package"}
                </Text>
                <Text style={styles.packagePax}>
                  {guestCount > 0 ? `${guestCount} Guests Capacity` : "Tailored Setup"}
                </Text>
              </View>
              <Text style={styles.packagePrice}>
                {formatCurrency(quotation.package_price || 0)}
              </Text>
            </View>

            {/* Deduction Breakdown if modified from starting price */}
            {showPackageBreakdown && (
              <View style={styles.deductionBox}>
                <View style={styles.deductionRow}>
                  <Text style={styles.deductionLabel}>Package starting price</Text>
                  <Text style={styles.deductionValue}>{formatCurrency(startingPrice)}</Text>
                </View>
                {removedInclusions.map((rem, idx) => (
                  <View key={idx} style={styles.deductionRow}>
                    <Text style={styles.deductionLabel} numberOfLines={1}>
                      Removed: {rem.name}
                    </Text>
                    <Text style={[styles.deductionValue, { color: colors.success }]}>
                      − {formatCurrency(rem.deduction || 0)}
                    </Text>
                  </View>
                ))}
                {inclusionAdjustments.map((adj, idx) => (
                  <View key={`adj-${idx}`} style={styles.deductionRow}>
                    <Text style={styles.deductionLabel} numberOfLines={1}>
                      Qty adj ({adj.quantity} instead of {adj.base_quantity}): {adj.name}
                    </Text>
                    <Text
                      style={[
                        styles.deductionValue,
                        { color: Number(adj.amount) < 0 ? colors.success : colors.foreground },
                      ]}
                    >
                      {Number(adj.amount) < 0 ? "− " : "+ "}
                      {formatCurrency(Math.abs(Number(adj.amount) || 0))}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Categorized Inclusions (cleanly grouped without [Bracket] noise) */}
            {inclusionGroups.length > 0 && (
              <View style={styles.inclusionsWrapper}>
                <Text style={styles.inclusionsSectionTitle}>PACKAGE INCLUSIONS</Text>

                {inclusionGroups.map((group, gIdx) => (
                  <View key={gIdx} style={styles.inclusionGroup}>
                    {group.category && (
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryPill} />
                        <Text style={styles.categoryTitle}>{group.category}</Text>
                      </View>
                    )}

                    <View style={styles.itemsList}>
                      {group.items.map((item, iIdx) => (
                        <View key={iIdx} style={styles.inclusionItemRow}>
                          <View style={styles.checkIconWrap}>
                            <Check size={11} color={colors.primary} />
                          </View>
                          <Text style={styles.inclusionItemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          {item.qty && (
                            <View style={styles.quantityBadge}>
                              <Text style={styles.quantityBadgeText}>{item.qty}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Banquet Menu Selection (if any) */}
        {Array.isArray(quotation.menu_items) && quotation.menu_items.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>
              Banquet Menu Selection ({quotation.menu_items.length})
            </Text>
            <View style={styles.cardBox}>
              {quotation.menu_items.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.menuRow,
                    idx === quotation.menu_items.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.menuCourseBadge}>
                    <Utensils size={13} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemMeta}>
                      {item.category || "Course"} • {item.quantity || 1} {item.unit || "serving"}
                    </Text>
                    {item.note ? <Text style={styles.menuItemNote}>{item.note}</Text> : null}
                  </View>
                  {Number(item.price) > 0 && (
                    <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add-ons & Equipment Rentals (if any) */}
        {Array.isArray(quotation.add_ons) && quotation.add_ons.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Add-ons & Equipment Rentals</Text>
            <View style={styles.cardBox}>
              {quotation.add_ons.map((addon, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.addonRow,
                    idx === quotation.add_ons.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addonTitle}>
                      {addon.name}
                      <Text style={styles.addonQty}> (×{addon.quantity || 1})</Text>
                    </Text>
                    {addon.note ? <Text style={styles.addonNote}>{addon.note}</Text> : null}
                  </View>
                  <Text style={styles.addonPrice}>
                    {formatCurrency((addon.price || 0) * (addon.quantity || 1))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Logistics & Service Fees (ONLY rendered when fees exist!) */}
        {hasFees && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Logistics & Service Fees</Text>
            <View style={styles.cardBox}>
              {Number(quotation.transportation_fee) > 0 && (
                <View style={styles.feeLineItem}>
                  <Text style={styles.feeLabel}>Transportation / Delivery Fee</Text>
                  <Text style={styles.feeAmount}>
                    {formatCurrency(quotation.transportation_fee)}
                  </Text>
                </View>
              )}

              {additionalFees.map((fee, idx) => (
                <View key={idx} style={styles.feeLineItem}>
                  <Text style={styles.feeLabel}>{fee.name || "Additional Service Fee"}</Text>
                  <Text style={styles.feeAmount}>{formatCurrency(fee.amount)}</Text>
                </View>
              ))}

              {Number(quotation.discounts) > 0 && (
                <View style={styles.feeLineItem}>
                  <Text style={[styles.feeLabel, { color: colors.success }]}>
                    Special Discount Applied
                  </Text>
                  <Text style={[styles.feeAmount, { color: colors.success }]}>
                    − {formatCurrency(quotation.discounts)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Financial Ticket / Cost Breakdown (Professional Receipt Style) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Cost Breakdown</Text>
          <View style={styles.ticketCard}>
            <View style={styles.ticketTopBar}>
              <Text style={styles.ticketTitle}>Official Quotation Summary</Text>
              <Text style={styles.ticketSub}>Official Estimate</Text>
            </View>

            <View style={styles.ticketBody}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Base Package ({quotation.guest_count || 0} pax)
                </Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(quotation.package_price || quotation.subtotal || 0)}
                </Text>
              </View>

              {Number(quotation.transportation_fee) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Transportation & Logistics</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(quotation.transportation_fee)}
                  </Text>
                </View>
              )}

              {additionalFees.map((fee, idx) => (
                <View key={`ticket-fee-${idx}`} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{fee.name || "Additional Fee"}</Text>
                  <Text style={styles.totalValue}>{formatCurrency(fee.amount)}</Text>
                </View>
              ))}

              {Number(quotation.discounts) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.success }]}>
                    Discount Applied
                  </Text>
                  <Text style={[styles.totalValue, { color: colors.success }]}>
                    − {formatCurrency(quotation.discounts)}
                  </Text>
                </View>
              )}

              <View style={styles.grandTotalDivider} />

              <View style={styles.grandTotalRow}>
                <View>
                  <Text style={styles.grandTotalLabel}>Total Event Cost</Text>
                  <Text style={styles.grandTotalSub}>All charges inclusive</Text>
                </View>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(quotation.total_cost || 0)}
                </Text>
              </View>
            </View>

            {/* Downpayment Highlight Ticket Footer */}
            <View style={styles.ticketFooter}>
              <View style={styles.downpaymentHighlightBox}>
                <View style={styles.downpaymentBadgeRow}>
                  <View style={styles.downpaymentPill}>
                    <Text style={styles.downpaymentPillText}>DOWNPAYMENT REQUIRED</Text>
                  </View>
                  <Text style={styles.downpaymentLockText}>Locks in your reserved date</Text>
                </View>

                <View style={styles.downpaymentAmountRow}>
                  <Text style={styles.downpaymentAmountLabel}>Initial Deposit Due:</Text>
                  <Text style={styles.downpaymentAmountValue}>
                    {formatCurrency(quotation.deposit_amount || 0)}
                  </Text>
                </View>
                <Text style={styles.downpaymentExplanation}>
                  Pay this deposit to lock in your event date. Once paid, our banquet team will confirm
                  and prepare your event schedule.
                </Text>
              </View>

              {/* Remaining Balance Row - Clean, non-squished formatting */}
              <View style={styles.balanceContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.balanceTitle}>Remaining Balance</Text>
                  <Text style={styles.balanceSubtitle}>Payable before the event date</Text>
                </View>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(quotation.remaining_balance || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Banquet Team Direct Chat Card */}
        <TouchableOpacity
          style={styles.chatHelperCard}
          onPress={handleOpenChat}
          activeOpacity={0.8}
        >
          <View style={styles.chatHelperIconWrap}>
            <MessageSquare size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHelperTitle}>Questions about this quotation?</Text>
            <Text style={styles.chatHelperSubtitle}>
              Chat directly with our banquet team about menus, headcounts, or schedule.
            </Text>
          </View>
          <ChevronRight size={16} color={colors.foregroundMuted} />
        </TouchableOpacity>

        {/* Secure Online Checkout Notice */}
        <View style={styles.securityNoticeCard}>
          <ShieldCheck size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.securityTitle}>Secure Online Downpayment</Text>
            <Text style={styles.securityDesc}>
              Powered by PayMongo. GCash, Maya, and Visa/Mastercard accepted with instant digital
              receipt and real-time status update.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Deposit Already Paid Confirmation Banner */}
      {isDepositPaid && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) + spacing.xs },
          ]}
        >
          <View style={styles.depositPaidBar}>
            <CheckCircle2 size={18} color={colors.success} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.depositPaidTitle}>Deposit Confirmed & Event Secured</Text>
              <Text style={styles.depositPaidSub}>
                Your event date is locked in. Our banquet team is preparing your arrangements.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Fixed Bottom Action Bar */}
      {isActionable && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) + spacing.xs },
          ]}
        >
          {isRevisionPending ? (
            <View style={styles.revisionPendingBar}>
              <RefreshCw size={16} color={colors.warningDark} style={{ marginRight: 8 }} />
              <Text style={styles.revisionPendingText}>
                Revision Request Under Review by Banquet Team
              </Text>
            </View>
          ) : (
            <View style={styles.actionButtonsRow}>
              {/* Revision Button: Guaranteed single-line fit with Edit icon */}
              {canRequestRevision && (
                <TouchableOpacity
                  style={styles.revisionBtn}
                  onPress={() => setShowRevisionModal(true)}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                >
                  <Edit3 size={15} color={colors.foreground} style={{ marginRight: 6 }} />
                  <Text style={styles.revisionBtnText} numberOfLines={1}>
                    Revision
                  </Text>
                </TouchableOpacity>
              )}

              {/* Pay Deposit Button: Sized for prominence with clear currency badge */}
              {canPayDeposit && (
                <TouchableOpacity
                  style={[styles.payBtn, !canRequestRevision && { flex: 1 }]}
                  onPress={handleAcceptAndPay}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={styles.payBtnInner}>
                      <CreditCard size={17} color={colors.white} style={{ marginRight: 8 }} />
                      <View style={styles.payBtnTextCol}>
                        <Text style={styles.payBtnLabel} numberOfLines={1}>
                          Pay Deposit
                        </Text>
                        <Text style={styles.payBtnAmount} numberOfLines={1}>
                          {formatCurrency(quotation.deposit_amount || 0)}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Revision Modal (Modern Bottom Sheet with Quick Suggestions) */}
      <Modal visible={showRevisionModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setShowRevisionModal(false)}
          />

          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + spacing.md }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Request Quotation Revision</Text>
                <Text style={styles.modalSub}>
                  Our banquet manager will adjust the quotation based on your notes.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRevisionModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.foregroundMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Suggestion Chips */}
            <View style={styles.quickTagsContainer}>
              {quickTags.map((tag, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickTagChip}
                  onPress={() => {
                    setRevisionNote((prev) =>
                      prev ? `${prev.trim()}\n• ${tag}: ` : `• ${tag}: `
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.revisionInput}
              placeholder="e.g. Please adjust the guest count to 80, add 2 round tables, and include beef dishes."
              placeholderTextColor={colors.textDisabled}
              value={revisionNote}
              onChangeText={setRevisionNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRevisionModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleRequestRevision}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    padding: spacing.base,
  },

  // Document Header Card
  documentHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  docRefRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  brandBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  docBrand: {
    fontSize: typography.sizes.xs,
    textTransform: "uppercase",
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  docQuoteNumber: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },

  // Manager's Note Box (craft-floor compliant: soft tinted card, no 3px border-left)
  managerNoteBox: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  managerNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  managerNoteTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
  managerNoteBody: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    lineHeight: 19,
  },

  // Customer Response Box
  customerResponseBox: {
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  customerResponseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  customerResponseTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
  },
  customerResponseBody: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Common Section Container
  sectionContainer: {
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    textTransform: "uppercase",
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  cardBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },

  // Event Details Grid Card
  eventGridCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  eventGridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  eventGridItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  gridIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  gridItemLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gridItemValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: 2,
  },
  gridItemSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  eventAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  // Package Header
  packageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  packageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  packageName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  packagePax: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  packagePrice: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },

  // Deductions Box
  deductionBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  deductionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  deductionLabel: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginRight: spacing.sm,
  },
  deductionValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },

  // Inclusions Subsection
  inclusionsWrapper: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  inclusionsSectionTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  inclusionGroup: {
    marginBottom: spacing.sm + 2,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    marginTop: 4,
  },
  categoryPill: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  categoryTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemsList: {
    gap: 5,
    paddingLeft: 2,
  },
  inclusionItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  checkIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  inclusionItemName: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    lineHeight: 18,
  },
  quantityBadge: {
    backgroundColor: colors.powder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: 6,
  },
  quantityBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },

  // Menu Rows
  menuRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuCourseBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  menuItemName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  menuItemMeta: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  menuItemNote: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.primary,
    marginTop: 2,
  },
  menuItemPrice: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },

  // Addon Rows
  addonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  addonTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  addonQty: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  addonNote: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  addonPrice: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },

  // Logistics & Fees
  feeLineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  feeLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
  },
  feeAmount: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },

  // Ticket Card (Financial Breakdown)
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    ...shadows.md,
  },
  ticketTopBar: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  ticketSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  ticketBody: {
    padding: spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  totalLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  totalValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  grandTotalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  grandTotalLabel: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
  },
  grandTotalSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  grandTotalValue: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // Ticket Footer & Downpayment Box
  ticketFooter: {
    padding: spacing.base,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  downpaymentHighlightBox: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: spacing.md,
  },
  downpaymentBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  downpaymentPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  downpaymentPillText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  downpaymentLockText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.primaryDark,
  },
  downpaymentAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  downpaymentAmountLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
  },
  downpaymentAmountValue: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  downpaymentExplanation: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 15,
  },

  // Remaining Balance Row (Generous spacing, no squished text!)
  balanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  balanceTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  balanceSubtitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  balanceAmount: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },

  // Direct Banquet Chat Helper Card
  chatHelperCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  chatHelperIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHelperTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  chatHelperSubtitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 15,
  },

  // Security Trust Notice Card
  securityNoticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.base,
  },
  securityTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  securityDesc: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 15,
  },

  // Bottom Sticky Action Bar (Fixing the wrapping bug!)
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.dock,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  revisionBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.powder,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  revisionBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    letterSpacing: 0.1,
  },
  payBtn: {
    flex: 1.85,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  payBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnTextCol: {
    alignItems: "flex-start",
  },
  payBtnLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.powderBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  payBtnAmount: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.white,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  revisionPendingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  revisionPendingText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.warningDark,
  },
  depositPaidBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  depositPaidTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.successText,
  },
  depositPaidSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },

  // Header chat button
  headerChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 290,
  },

  // Revision Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalBackdropTap: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    ...shadows.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: spacing.sm,
  },
  quickTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
  },
  quickTagChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  quickTagText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
  },
  revisionInput: {
    minHeight: 110,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.powder,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  modalSubmitBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
});

export default QuotationDetailScreen;
