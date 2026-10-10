import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  UserCheck,
  CreditCard,
  Utensils,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Star,
  PlusCircle,
  ArrowUpCircle,
  FileEdit,
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Phone,
  Info,
  PackagePlus,
  Store,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import customerApi from "../../api/customer";
import messagesApi from "../../api/messages";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import AppButton from "../../components/common/AppButton";
import { formatCurrency, formatDate, formatTime, formatShortDate } from "../../utils/format";

export const BookingDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const id = route?.params?.id || route?.params?.bookingId;

  const [booking, setBooking] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showAddGuestsModal, setShowAddGuestsModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showRejectRevisionModal, setShowRejectRevisionModal] = useState(false);
  const [rejectRevisionReason, setRejectRevisionReason] = useState("");

  // Change Request Form State
  const [changeDate, setChangeDate] = useState("");
  const [changeTime, setChangeTime] = useState("");
  const [changeGuests, setChangeGuests] = useState("");
  const [changeVenue, setChangeVenue] = useState("");
  const [changeNote, setChangeNote] = useState("");

  // Add Guests State
  const [extraGuests, setExtraGuests] = useState("10");

  // Upgrade Package State
  const [selectedUpgradePkg, setSelectedUpgradePkg] = useState(null);

  // Rating & Review State
  const [bookingRating, setBookingRating] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Copy feedback state
  const [copiedRef, setCopiedRef] = useState(false);

  const loadBooking = useCallback(async () => {
    setError("");
    try {
      const data = await customerApi.getBookingById(id);
      setBooking(data);

      // If completed, fetch any submitted rating
      if (["Completed", "completed"].includes(data?.status)) {
        try {
          const ratingData = await customerApi.getRatingByBooking(id);
          if (ratingData?.rating || ratingData?._id) {
            setBookingRating(ratingData);
          }
        } catch {
          // No rating exists yet
        }
      }
    } catch (err) {
      setError("Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
    // Preload packages for upgrade options
    customerApi
      .getPackages()
      .then((pkgs) => {
        if (Array.isArray(pkgs)) setPackages(pkgs);
      })
      .catch(() => {});
  }, [loadBooking]);

  // Status flags matching website logic
  const rawStatus = (booking?.status || "").toLowerCase();
  const isCancelled = ["cancelled", "refunded", "canceled", "rejected"].includes(rawStatus);
  const isCompleted = ["completed", "event completed"].includes(rawStatus);
  const isReady = ["ready for event", "ready_for_event", "ready"].includes(rawStatus);
  const isDepositPaid =
    booking?.payment_status === "deposit_paid" || booking?.payment_status === "fully_paid";
  const isFullyPaid = booking?.payment_status === "fully_paid";
  const isPast = booking?.event_date && new Date(booking.event_date) < new Date();
  const canCancel = !isPast && !isCancelled && !isCompleted;

  const hasPendingRevision = Boolean(
    (booking?.pending_revision && booking?.pending_revision?.status === "pending_customer_approval") ||
      booking?.revision_proposal
  );
  const pendingRev = booking?.pending_revision || booking?.revision_proposal;

  // Financial Calculations
  const totalPrice = Number(booking?.total_price || 0);
  const depositAmount = Number(booking?.deposit_amount || Math.round(totalPrice * 0.5));
  const paidAmount = Number(
    booking?.paid_amount || (isFullyPaid ? totalPrice : isDepositPaid ? depositAmount : 0)
  );
  const remainingBalance = isFullyPaid
    ? 0
    : isDepositPaid
    ? Math.max(0, totalPrice - paidAmount)
    : totalPrice;
  const canPayBalance =
    !isCancelled &&
    remainingBalance > 0 &&
    (booking?.payment_status === "deposit_paid" || booking?.payment_status === "partially_paid");

  const isOverdue = Boolean(
    isPast && remainingBalance > 0 && !isCancelled
  );

  // Milestone Stepper Calculation (Consistent 5 steps matching website)
  const isOcularDone =
    booking?.ocular_visit?.status === "completed" || booking?.ocular_visit?.status === "skipped";
  const isOcularActive =
    rawStatus === "ocular scheduled" || booking?.ocular_visit?.status === "scheduled";

  const timelineSteps = useMemo(() => {
    return [
      { id: "inquiry", label: "Inquiry & Quote", done: true },
      { id: "deposit", label: "Deposit Paid", done: isDepositPaid },
      { id: "ocular", label: "Ocular Visit", done: isOcularDone, active: isOcularActive },
      { id: "ready", label: "Ready for Event", done: isReady || isCompleted, active: isReady },
      { id: "completed", label: "Completed", done: isCompleted },
    ];
  }, [isDepositPaid, isOcularDone, isOcularActive, isReady, isCompleted]);

  // Milestone Progress Ratio for connector bar
  const activeStepIndex = useMemo(() => {
    if (isCancelled) return -1;
    if (isCompleted) return 4;
    if (isReady) return 3;
    if (isOcularActive || isOcularDone) return 2;
    if (isDepositPaid) return 1;
    return 0;
  }, [isCancelled, isCompleted, isReady, isOcularActive, isOcularDone, isDepositPaid]);

  const progressPercent = useMemo(() => {
    if (activeStepIndex <= 0) return 0;
    return Math.min(100, (activeStepIndex / 4) * 100);
  }, [activeStepIndex]);

  // Calm Stage Guide Explanation (matching website guideMeta)
  const stageGuide = useMemo(() => {
    if (isCancelled) {
      return {
        title: "Reservation Cancelled",
        description:
          booking?.cancellation_reason ||
          "This reservation was cancelled and is no longer active. All visits and actions are closed.",
        tone: "rose",
      };
    }
    if (hasPendingRevision) {
      return {
        title: "Revision Awaiting Review",
        description:
          "Management has proposed schedule or pricing adjustments below. Please review and respond.",
        tone: "amber",
      };
    }
    if (isOverdue) {
      return {
        title: "Payment Overdue",
        description:
          "Event date has passed with an outstanding balance. Please settle your balance promptly.",
        tone: "rose",
      };
    }
    if (["deposit pending", "pending deposit"].includes(rawStatus) || (!isDepositPaid && !isFullyPaid)) {
      return {
        title: "Deposit Required",
        description:
          "An initial deposit is needed to guarantee your date and allow our kitchen team to stage provisions.",
        tone: "amber",
      };
    }
    if (isOcularActive) {
      return {
        title: "Ocular Visit Scheduled",
        description: `Our team will visit your venue on ${
          booking?.ocular_visit?.scheduled_date
            ? formatDate(booking.ocular_visit.scheduled_date)
            : "the scheduled date"
        } to review layout and outlets.`,
        tone: "blue",
      };
    }
    if (isReady) {
      return {
        title: "Ready for Event",
        description:
          "All preparations, menu items, and logistics are finalized. Our banquet team will arrive promptly.",
        tone: "emerald",
      };
    }
    if (isCompleted) {
      return {
        title: "Event Concluded",
        description:
          "Thank you for celebrating with Caezelle's! Please take a moment to rate your catering experience.",
        tone: "slate",
      };
    }
    return {
      title: "Booking Confirmed",
      description:
        "Your event reservation is confirmed. Our banquet coordinator is actively managing logistics.",
      tone: "blue",
    };
  }, [isCancelled, hasPendingRevision, isOverdue, rawStatus, isDepositPaid, isFullyPaid, isOcularActive, isReady, isCompleted, booking]);

  // Reference Code & Copy Action
  const refCode =
    booking?.reference ||
    (booking?._id ? `CAZ-${String(booking._id).slice(-6).toUpperCase()}` : "CAZ-000000");

  const handleCopyReference = () => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(refCode);
    }
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    Alert.alert("Reference Copied", `Booking reference #${refCode} copied to clipboard.`);
  };

  // Pay Remaining Balance via PayMongo
  const handlePayBalance = async () => {
    Alert.alert(
      "Pay Remaining Balance",
      `Proceed to pay the remaining balance of ${formatCurrency(
        remainingBalance
      )} via PayMongo (GCash / Maya / Card)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed to Checkout",
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await customerApi.createCheckoutSession({
                booking_id: booking._id,
                amount: remainingBalance,
                payment_type: "balance",
                payment_method_types: ["gcash", "paymaya", "card"],
              });

              if (res?.checkout_url) {
                navigation.navigate("PaymentCheckout", {
                  checkoutUrl: res.checkout_url,
                  paymentId: res.payment?._id,
                  depositAmount: remainingBalance,
                });
              } else {
                Alert.alert("Checkout Initiated", "Check payment confirmation shortly.");
                loadBooking();
              }
            } catch (err) {
              Alert.alert(
                "Payment Error",
                err.response?.data?.message || "Failed to initialize balance checkout."
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Submit Change Proposal
  const handleSubmitChangeRequest = async () => {
    if (!changeNote.trim() && !changeDate && !changeGuests && !changeTime && !changeVenue) {
      Alert.alert("Information Required", "Please describe the changes you want to propose.");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        message: changeNote.trim() || "Customer requested booking revisions",
      };
      if (changeDate) payload.event_date = changeDate;
      if (changeTime) payload.start_time = changeTime;
      if (changeGuests) payload.guest_count = Number(changeGuests);
      if (changeVenue) payload.venue_type = changeVenue;

      await customerApi.proposeRevision(booking._id, payload);
      Alert.alert(
        "Revisions Submitted",
        "Your proposed revisions were submitted for manager review."
      );
      setShowChangeModal(false);
      setChangeNote("");
      setChangeDate("");
      setChangeTime("");
      setChangeGuests("");
      setChangeVenue("");
      loadBooking();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit revision proposal.");
    } finally {
      setActionLoading(false);
    }
  };

  // Accept Management Revision Proposal
  const handleAcceptRevision = async () => {
    Alert.alert(
      "Accept Proposed Revision",
      "Confirm accepting the revised event schedule, guest count, and pricing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept Revisions",
          onPress: async () => {
            setActionLoading(true);
            try {
              await customerApi.acceptRevision(booking._id);
              Alert.alert("Accepted", "The revised booking details are now official.");
              loadBooking();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to accept revision.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Reject Management Revision Proposal (Cross-platform modal)
  const handleRejectRevision = () => {
    setRejectRevisionReason("");
    setShowRejectRevisionModal(true);
  };

  const confirmRejectRevision = async () => {
    setActionLoading(true);
    try {
      await customerApi.rejectRevision(
        booking._id,
        rejectRevisionReason.trim() || "Customer declined revision"
      );
      Alert.alert("Declined", "The revision proposal has been declined.");
      setShowRejectRevisionModal(false);
      setRejectRevisionReason("");
      loadBooking();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to decline revision.");
    } finally {
      setActionLoading(false);
    }
  };

  // Add Additional Guests
  const handleAddGuests = async () => {
    const count = parseInt(extraGuests, 10);
    if (!count || count <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid number of additional guests.");
      return;
    }

    setActionLoading(true);
    try {
      await customerApi.addGuests(booking._id, count);
      Alert.alert("Guests Added", `Successfully added ${count} additional guests to your event.`);
      setShowAddGuestsModal(false);
      loadBooking();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to add guests.");
    } finally {
      setActionLoading(false);
    }
  };

  // Upgrade Package
  const handleUpgradePackage = async () => {
    if (!selectedUpgradePkg) {
      Alert.alert("Selection Required", "Please select a package to upgrade to.");
      return;
    }

    setActionLoading(true);
    try {
      await customerApi.upgradeBooking(booking._id, selectedUpgradePkg._id);
      Alert.alert(
        "Upgrade Submitted",
        `Your upgrade request to ${selectedUpgradePkg.name} has been submitted.`
      );
      setShowUpgradeModal(false);
      loadBooking();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to upgrade package.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Star Rating & Review
  const handleSubmitRating = async () => {
    if (!ratingReview.trim()) {
      Alert.alert("Review Required", "Please write a short review sharing your experience.");
      return;
    }

    setSubmittingRating(true);
    try {
      const payload = {
        booking_id: booking._id,
        rating: ratingStars,
        review: ratingReview.trim(),
      };
      await customerApi.submitRating(payload);
      Alert.alert("Thank You!", "Your rating and feedback have been shared.");
      setBookingRating({ rating: ratingStars, review: ratingReview.trim() });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Open Chat with Assigned Manager
  const handleChatWithManager = async () => {
    if (!booking.event_manager_id) {
      Alert.alert("Manager Not Assigned", "An event manager will be assigned to your booking shortly.");
      return;
    }

    try {
      setActionLoading(true);
      const managerId = booking.event_manager_id._id || booking.event_manager_id;
      const conv = await messagesApi.createConversation({
        participant_id: managerId,
        booking_id: booking._id,
      });

      navigation.navigate("CustomerChatThread", {
        conversationId: conv?._id || conv?.id,
        title: booking.event_manager_id.full_name || "Event Manager",
      });
    } catch (err) {
      try {
        const convList = await messagesApi.listConversations();
        const existing = Array.isArray(convList)
          ? convList.find((c) => String(c.booking_id) === String(booking._id))
          : null;
        if (existing) {
          navigation.navigate("CustomerChatThread", {
            conversationId: existing._id,
            title: booking.event_manager_id.full_name || "Event Manager",
          });
          return;
        }
      } catch {
        // Ignored
      }
      Alert.alert(
        "Chat Unavailable",
        "Could not start chat session. Please call or message the manager directly."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Request Ocular
  const handleRequestOcular = () => {
    Alert.alert(
      "Request Ocular Inspection",
      "Would you like to request an on-site venue inspection by our team? We will coordinate with you to confirm the date.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Ocular",
          onPress: async () => {
            setActionLoading(true);
            try {
              const d = new Date();
              d.setDate(d.getDate() + 3);
              await customerApi.requestOcular(booking._id, {
                scheduled_date: d.toISOString().split("T")[0],
                notes: "Customer requested ocular inspection via mobile app.",
              });
              Alert.alert("Ocular Requested", "Our team will contact you to confirm the site visit schedule.");
              loadBooking();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to request ocular.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Skip Ocular
  const handleSkipOcular = () => {
    Alert.alert(
      "Skip Ocular Inspection",
      "Are you confident with your venue setup without an on-site inspection?",
      [
        { text: "Keep Ocular", style: "cancel" },
        {
          text: "Skip Ocular",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await customerApi.skipOcular(booking._id);
              Alert.alert("Ocular Skipped", "Proceeding directly to event preparation.");
              loadBooking();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to skip ocular.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Request Cancellation
  const handleRequestCancellation = () => {
    Alert.alert(
      "Request Cancellation / Refund",
      "Are you sure you want to request cancellation for this booking? A formal request will be submitted to management.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Submit Cancellation Request",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await customerApi.requestCancellation(booking._id);
              Alert.alert(
                "Request Submitted",
                "Your cancellation request has been submitted for administrative review."
              );
              loadBooking();
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to submit cancellation request."
              );
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
        <Header title="Booking Details" onBack={() => navigation.goBack()} />
        <LoadingState message="Loading reservation details..." />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.container}>
        <Header title="Booking Details" onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={loadBooking} />
      </View>
    );
  }

  // Dishes & items
  const menuItems = Array.isArray(booking.menu_items) ? booking.menu_items : [];
  const selectedDishes = Array.isArray(booking.selected_dishes) ? booking.selected_dishes : [];
  const displayDishes = menuItems.length > 0 ? menuItems : selectedDishes;
  const totalDishesCount = displayDishes.length;
  const serviceItemsCount = Array.isArray(booking.service_items) ? booking.service_items.length : 0;

  // Address string
  const formattedAddress =
    booking.delivery_method === "pickup"
      ? (booking.pickup_location || "Store Premises Pickup (Caezelle's HQ)")
      : [booking.street, booking.barangay, booking.municipality, booking.province]
          .filter(Boolean)
          .join(", ") || "Venue Address on file";

  return (
    <View style={styles.container}>
      <Header
        title="Booking Details"
        subtitle={`#${refCode}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── SECTION 1: OVERVIEW HERO CARD ── */}
        <Card style={styles.overviewHeroCard} variant="flat">
          {/* Title & Status Badge Row */}
          <View style={styles.overviewTopRow}>
            <View style={styles.overviewTitleWrap}>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {booking.event_type || "Catering Event"}
              </Text>
            </View>
            <StatusBadge status={isOverdue ? "overdue" : booking.status} size="sm" />
          </View>

          {/* Sub-badges: Revision Tag & Copyable Reference */}
          <View style={styles.overviewTagsRow}>
            <TouchableOpacity
              style={styles.refCodeBadge}
              onPress={handleCopyReference}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.refCodeText}>#{refCode}</Text>
              <Copy size={11} color={colors.foregroundMuted} />
            </TouchableOpacity>

            {booking.is_revised && (
              <View style={styles.revisedBadge}>
                <Text style={styles.revisedBadgeText}>
                  Revised · v{booking.revision_count || 1}
                </Text>
              </View>
            )}

            {isPast && (
              <View style={styles.pastBadge}>
                <Text style={styles.pastBadgeText}>Past Event</Text>
              </View>
            )}
          </View>

          {/* Quick Specifications Strip */}
          <View style={styles.overviewSpecsStrip}>
            <View style={styles.specChip}>
              <Calendar size={13} color={colors.primary} />
              <Text style={styles.specChipText} numberOfLines={1}>
                {booking.event_date ? formatShortDate(booking.event_date) : "Date TBD"}
                {booking.start_time ? ` · ${formatTime(booking.start_time)}` : ""}
              </Text>
            </View>

            <View style={styles.specChip}>
              <Users size={13} color={colors.primary} />
              <Text style={styles.specChipText}>{booking.guest_count || 0} Guests</Text>
            </View>

            <View style={styles.specChip}>
              <Utensils size={13} color={colors.primary} />
              <Text style={styles.specChipText} numberOfLines={1}>
                {booking.service_type || "Food & Setup"}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── SECTION 2: ORDER & EVENT MILESTONES ── */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTitleWithIcon}>
              <Clock size={15} color={colors.primary} />
              <Text style={styles.sectionTitle}>Order & Event Milestones</Text>
            </View>
            <View style={styles.liveTrackingPill}>
              <Text style={styles.liveTrackingText}>LIVE TRACKING</Text>
            </View>
          </View>

          {/* Connected Stepper */}
          <View style={styles.stepperContainer}>
            {/* Background line */}
            <View style={styles.stepperTrack}>
              <View
                style={[
                  styles.stepperTrackFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>

            {/* Step Nodes */}
            <View style={styles.stepperStepsRow}>
              {timelineSteps.map((step, idx) => {
                const isStepCompleted = step.done;
                const isStepCurrent = step.active || (!isStepCompleted && idx === activeStepIndex);

                return (
                  <View key={step.id} style={styles.stepperCol}>
                    <View
                      style={[
                        styles.stepperDot,
                        isStepCompleted && styles.stepperDotDone,
                        isStepCurrent && styles.stepperDotActive,
                      ]}
                    >
                      {isStepCompleted ? (
                        <Check size={12} color={colors.white} strokeWidth={3} />
                      ) : (
                        <Text
                          style={[
                            styles.stepperNumber,
                            isStepCurrent && styles.stepperNumberActive,
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepperLabel,
                        isStepCompleted && styles.stepperLabelDone,
                        isStepCurrent && styles.stepperLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Calm Stage Guide Note */}
          <View
            style={[
              styles.stageGuideBox,
              stageGuide.tone === "rose" && styles.stageGuideRose,
              stageGuide.tone === "amber" && styles.stageGuideAmber,
              stageGuide.tone === "emerald" && styles.stageGuideEmerald,
            ]}
          >
            <Info
              size={14}
              color={
                stageGuide.tone === "rose"
                  ? colors.error
                  : stageGuide.tone === "amber"
                  ? colors.warning
                  : colors.primary
              }
              style={{ marginTop: 2, marginRight: spacing.xs }}
            />
            <Text style={styles.stageGuideText}>
              <Text style={styles.stageGuideTitle}>{stageGuide.title}: </Text>
              {stageGuide.description}
            </Text>
          </View>
        </Card>

        {/* ── SECTION 3: PENDING REVISION PROPOSAL (HIGH PRIORITY) ── */}
        {hasPendingRevision && (
          <Card style={styles.revisionNoticeCard} variant="outlined">
            <View style={styles.revisionHeaderRow}>
              <View style={styles.revisionIconWrap}>
                <AlertCircle size={18} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.revisionNoticeTitle}>Proposed Revision from Management</Text>
                <Text style={styles.revisionNoticeSub}>
                  Our event manager proposed adjustments to your reservation:
                </Text>
              </View>
            </View>

            <View style={styles.revisionDetailsBox}>
              {pendingRev.event_date && (
                <View style={styles.revRow}>
                  <Text style={styles.revLabel}>Event Date:</Text>
                  <Text style={styles.revValue}>{formatDate(pendingRev.event_date)}</Text>
                </View>
              )}
              {pendingRev.start_time && (
                <View style={styles.revRow}>
                  <Text style={styles.revLabel}>Start Time:</Text>
                  <Text style={styles.revValue}>{formatTime(pendingRev.start_time)}</Text>
                </View>
              )}
              {pendingRev.guest_count && (
                <View style={styles.revRow}>
                  <Text style={styles.revLabel}>Guest Capacity:</Text>
                  <Text style={styles.revValue}>{pendingRev.guest_count} Guests</Text>
                </View>
              )}
              {pendingRev.total_price && (
                <View style={styles.revRow}>
                  <Text style={styles.revLabel}>Revised Total:</Text>
                  <Text style={[styles.revValue, { color: colors.primary, fontWeight: "700" }]}>
                    {formatCurrency(pendingRev.total_price)}
                  </Text>
                </View>
              )}
              {pendingRev.message && (
                <View style={styles.revNoteWrap}>
                  <Text style={styles.revNoteLabel}>Note from Manager:</Text>
                  <Text style={styles.revNoteText}>"{pendingRev.message}"</Text>
                </View>
              )}
            </View>

            <View style={styles.revisionActionRow}>
              <AppButton
                title="Accept Revisions"
                icon={CheckCircle}
                onPress={handleAcceptRevision}
                size="sm"
                loading={actionLoading}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Decline"
                icon={X}
                onPress={handleRejectRevision}
                variant="outline"
                size="sm"
                disabled={actionLoading}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {/* ── SECTION 4: EVENT SCHEDULE & VENUE ── */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Event Schedule & Venue</Text>
            {!isCompleted && !isPast && !isCancelled && (
              <TouchableOpacity
                style={styles.headerActionPill}
                onPress={() => setShowChangeModal(true)}
                activeOpacity={0.7}
              >
                <FileEdit size={12} color={colors.primary} />
                <Text style={styles.headerActionText}>Propose Changes</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Date Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Calendar size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContentCol}>
              <Text style={styles.infoLabel}>Event Date</Text>
              <Text style={styles.infoValue}>{formatDate(booking.event_date)}</Text>
            </View>
          </View>

          {/* Time & Service Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Clock size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContentCol}>
              <Text style={styles.infoLabel}>Start Time & Service</Text>
              <Text style={styles.infoValue}>
                {formatTime(booking.start_time)} • {booking.service_type || "Catering & Setup"}
              </Text>
            </View>
          </View>

          {/* Guest Attendance Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Users size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContentCol}>
              <View style={styles.labelWithActionRow}>
                <Text style={styles.infoLabel}>Guest Capacity</Text>
                {!isCompleted && !isPast && !isCancelled && (
                  <TouchableOpacity
                    onPress={() => setShowAddGuestsModal(true)}
                    style={styles.inlineActionBtn}
                    activeOpacity={0.7}
                  >
                    <PlusCircle size={11} color={colors.primary} />
                    <Text style={styles.inlineActionText}>Add Extra Guests</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.infoValue}>{booking.guest_count || 0} Guests</Text>
            </View>
          </View>

          {/* Venue Address Row */}
          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.infoIconCol}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContentCol}>
              <Text style={styles.infoLabel}>Venue Address & Staging</Text>
              <Text style={styles.infoValue}>{formattedAddress}</Text>
              {booking.landmark && (
                <Text style={styles.landmarkText}>Landmark: {booking.landmark}</Text>
              )}
            </View>
          </View>

          {/* Styling Palette (if configured) */}
          {Array.isArray(booking.event_palette) && booking.event_palette.length > 0 && (
            <View style={styles.paletteSection}>
              <Text style={styles.infoLabel}>Event Color Palette</Text>
              <View style={styles.palettePillsRow}>
                {booking.event_palette.map((c, i) => (
                  <View key={i} style={styles.palettePill}>
                    <Text style={styles.palettePillText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* ── SECTION 5: SELECTED PACKAGE & MENU ── */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Selected Package</Text>
            {!isCompleted && !isPast && !isCancelled && (
              <TouchableOpacity
                style={styles.headerActionPill}
                onPress={() => setShowUpgradeModal(true)}
                activeOpacity={0.7}
              >
                <ArrowUpCircle size={12} color={colors.primary} />
                <Text style={styles.headerActionText}>Upgrade Package</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Package Banner */}
          <View style={styles.packageBanner}>
            <View style={styles.packageIconWrap}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.packageBannerTitle}>
                {booking.package_id?.name || booking.package_name_snapshot || "Custom Catering Package"}
              </Text>
              <Text style={styles.packageBannerSub}>
                {booking.package_id?.description ||
                  booking.package_id?.package_type ||
                  "Curated catering selections and banquet setup"}
              </Text>
            </View>
          </View>

          {/* Summary Metric Chips */}
          <View style={styles.metricsChipsRow}>
            {totalDishesCount > 0 && (
              <View style={styles.metricChip}>
                <Utensils size={12} color={colors.primary} />
                <Text style={styles.metricChipText}>{totalDishesCount} dishes included</Text>
              </View>
            )}
            {booking.package_id?.inclusions?.length > 0 && (
              <View style={styles.metricChip}>
                <CheckCircle2 size={12} color={colors.success} />
                <Text style={styles.metricChipText}>
                  {booking.package_id.inclusions.length} setup inclusions
                </Text>
              </View>
            )}
            {serviceItemsCount > 0 && (
              <View style={styles.metricChip}>
                <PackagePlus size={12} color={colors.primary} />
                <Text style={styles.metricChipText}>{serviceItemsCount} add-on items</Text>
              </View>
            )}
          </View>

          {/* Dishes Selections */}
          {displayDishes.length > 0 && (
            <View style={styles.dishesSection}>
              <Text style={styles.subHeading}>Catering Menu Selections</Text>
              <View style={styles.dishesGrid}>
                {displayDishes.map((dish, i) => {
                  const dishName =
                    dish.name || dish.item_name || (typeof dish === "string" ? dish : `Dish #${i + 1}`);
                  const dishCourse = dish.category || dish.course || "";
                  return (
                    <View key={i} style={styles.dishPill}>
                      <Utensils size={11} color={colors.primary} />
                      <Text style={styles.dishPillText} numberOfLines={1}>
                        {dishName} {dishCourse ? `(${dishCourse})` : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Dietary Requirements Alert */}
          {Boolean(
            booking.dietary_notes ||
              booking.allergies ||
              booking.special_requests ||
              booking.dietary_restrictions
          ) && (
            <View style={styles.dietaryBox}>
              <ShieldCheck size={14} color={colors.warning} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: spacing.xs, flex: 1 }}>
                <Text style={styles.dietaryTitle}>Dietary & Allergen Notes</Text>
                <Text style={styles.dietaryDesc}>
                  {booking.allergies ? `Allergies: ${booking.allergies}. ` : ""}
                  {booking.dietary_restrictions || booking.dietary_notes || booking.special_requests}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* ── SECTION 6: PAYMENT & INVOICING ── */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTitleWithIcon}>
              <CreditCard size={15} color={colors.primary} />
              <Text style={styles.sectionTitle}>Payment & Invoicing</Text>
            </View>
            <StatusBadge status={booking.payment_status || "pending"} size="sm" />
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Total Event Price</Text>
            <Text style={styles.financeValue}>{formatCurrency(totalPrice)}</Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Deposit Required / Paid</Text>
            <Text style={styles.financeSubValue}>
              {isDepositPaid ? "✓ Paid " : "Due: "}
              {formatCurrency(depositAmount)}
            </Text>
          </View>

          <View style={[styles.financeRow, styles.financeBalanceRow]}>
            <Text style={styles.financeBalanceLabel}>
              {isFullyPaid ? "Payment Status" : isCancelled ? "Balance Closed" : "Remaining Balance Due"}
            </Text>
            <Text
              style={[
                styles.financeBalanceValue,
                { color: remainingBalance > 0 && !isCancelled ? colors.warningDark : colors.success },
              ]}
            >
              {isFullyPaid ? "Fully Settled ✓" : isCancelled ? "Closed" : formatCurrency(remainingBalance)}
            </Text>
          </View>

          {/* Pay Remaining Balance Button */}
          {canPayBalance && (
            <AppButton
              title={`Pay Remaining Balance (${formatCurrency(remainingBalance)})`}
              icon={CreditCard}
              size="md"
              loading={actionLoading}
              onPress={handlePayBalance}
              style={{ marginTop: spacing.md }}
            />
          )}

          {isOverdue && remainingBalance > 0 && (
            <View style={styles.overdueAlertBox}>
              <AlertTriangle size={13} color={colors.error} />
              <Text style={styles.overdueAlertText}>
                Balance settlement is overdue. Please complete checkout to close your invoice.
              </Text>
            </View>
          )}
        </Card>

        {/* ── SECTION 7: EVENT OPERATIONS MANAGER ── */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Event Operations Manager</Text>
          </View>

          {booking.event_manager_id ? (
            <View>
              <View style={styles.managerRow}>
                <View style={styles.managerAvatar}>
                  <UserCheck size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.managerName}>
                    {booking.event_manager_id.full_name || "Assigned Manager"}
                  </Text>
                  <Text style={styles.managerRole}>
                    Catering Operations Lead • {booking.event_manager_id.phone || "Available on Chat"}
                  </Text>
                </View>
              </View>

              <AppButton
                title="Message Event Manager"
                icon={MessageSquare}
                variant="outline"
                size="sm"
                onPress={handleChatWithManager}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : (
            <View style={styles.unassignedBox}>
              <Info size={14} color={colors.foregroundMuted} />
              <Text style={styles.unassignedNotice}>
                Our operations team is finalizing logistics. Your dedicated Banquet Manager will be
                assigned shortly.
              </Text>
            </View>
          )}

          {/* Customer contact on file */}
          {(booking.contact_first_name || booking.contact_phone) && (
            <View style={styles.contactOnFileBox}>
              <Text style={styles.contactOnFileLabel}>Customer Contact on File:</Text>
              <Text style={styles.contactOnFileValue}>
                {booking.contact_first_name} {booking.contact_last_name}
                {booking.contact_phone ? ` • ${booking.contact_phone}` : ""}
              </Text>
            </View>
          )}
        </Card>

        {/* ── SECTION 8: SITE INSPECTION / OCULAR ── */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Site Inspection / Ocular</Text>
          </View>

          {booking.ocular_visit?.status === "completed" ? (
            <View style={styles.ocularStatusBox}>
              <CheckCircle size={16} color={colors.success} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.ocularTitle}>Ocular Visit Completed</Text>
                <Text style={styles.ocularDesc}>
                  Outcome: <Text style={{ fontWeight: "700" }}>{booking.ocular_visit.outcome || "Proceed"}</Text>
                  {booking.ocular_visit.notes ? ` • ${booking.ocular_visit.notes}` : ""}
                </Text>
              </View>
            </View>
          ) : booking.ocular_visit?.status === "scheduled" ? (
            <View style={styles.ocularStatusBox}>
              <Eye size={16} color={colors.primary} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.ocularTitle}>Ocular Visit Scheduled</Text>
                <Text style={styles.ocularDesc}>
                  Scheduled Date: {formatDate(booking.ocular_visit.scheduled_date)}{" "}
                  {booking.ocular_visit.scheduled_time || ""}
                </Text>
              </View>
            </View>
          ) : booking.ocular_visit?.status === "skipped" ? (
            <View style={styles.ocularSkippedBox}>
              <Text style={styles.ocularSkippedText}>
                Site ocular inspection was skipped by customer request.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.ocularNoteText}>
                An on-site inspection ensures electrical outlets, table layout, and setup
                boundaries match your expectations.
              </Text>
              <View style={styles.ocularActionsRow}>
                <AppButton
                  title="Request Ocular"
                  onPress={handleRequestOcular}
                  size="sm"
                  style={{ flex: 1 }}
                  loading={actionLoading}
                />
                <AppButton
                  title="Skip Ocular"
                  onPress={handleSkipOcular}
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                />
              </View>
            </View>
          )}
        </Card>

        {/* ── SECTION 9: EVENT REVIEW & RATING (COMPLETED ONLY) ── */}
        {isCompleted && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Event Review & Rating</Text>
            </View>

            {bookingRating ? (
              <View style={styles.verifiedRatingBox}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      color={star <= bookingRating.rating ? colors.warning : colors.border}
                      fill={star <= bookingRating.rating ? colors.warning : "transparent"}
                    />
                  ))}
                  <Text style={styles.ratingScoreText}>{bookingRating.rating}.0 / 5.0</Text>
                </View>
                <Text style={styles.savedReviewText}>"{bookingRating.review}"</Text>
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={12} color={colors.success} />
                  <Text style={styles.verifiedBadgeText}>Verified Customer Review</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.ratingPrompt}>
                  How was your banquet experience with Caezelle's? Share your review:
                </Text>
                <View style={styles.interactiveStarsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRatingStars(star)}
                      style={styles.starBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Star
                        size={26}
                        color={star <= ratingStars ? colors.warning : colors.textDisabled}
                        fill={star <= ratingStars ? colors.warning : "transparent"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Tell us about the food taste, table setup, and banquet staff..."
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  value={ratingReview}
                  onChangeText={setRatingReview}
                />
                <AppButton
                  title="Submit Rating & Review"
                  icon={Send}
                  size="sm"
                  loading={submittingRating}
                  onPress={handleSubmitRating}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
          </Card>
        )}

        {/* ── SECTION 10: CANCELLATION OPTION ── */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBookingBtn}
            onPress={handleRequestCancellation}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBookingText}>Request Cancellation / Refund</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── MODAL 1: Propose Revision / Change Request ── */}
      <Modal visible={showChangeModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Propose Booking Revisions</Text>
              <TouchableOpacity
                onPress={() => setShowChangeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>New Event Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={booking.event_date ? booking.event_date.split("T")[0] : "2026-10-15"}
                placeholderTextColor={colors.textDisabled}
                value={changeDate}
                onChangeText={setChangeDate}
              />

              <Text style={styles.inputLabel}>New Start Time</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={booking.start_time || "12:00 PM"}
                placeholderTextColor={colors.textDisabled}
                value={changeTime}
                onChangeText={setChangeTime}
              />

              <Text style={styles.inputLabel}>New Guest Count</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={String(booking.guest_count || 50)}
                placeholderTextColor={colors.textDisabled}
                keyboardType="numeric"
                value={changeGuests}
                onChangeText={setChangeGuests}
              />

              <Text style={styles.inputLabel}>New Venue Type (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={booking.venue_type || "e.g. Covered Pavilion"}
                placeholderTextColor={colors.textDisabled}
                value={changeVenue}
                onChangeText={setChangeVenue}
              />

              <Text style={styles.inputLabel}>Notes & Reasons for Revision</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 80, textAlignVertical: "top" }]}
                placeholder="Explain the changes you would like to request..."
                placeholderTextColor={colors.textDisabled}
                multiline
                value={changeNote}
                onChangeText={setChangeNote}
              />

              <AppButton
                title="Submit Revision Proposal"
                loading={actionLoading}
                onPress={handleSubmitChangeRequest}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 2: Add Extra Guests ── */}
      <Modal visible={showAddGuestsModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Additional Guests</Text>
              <TouchableOpacity
                onPress={() => setShowAddGuestsModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Current Guest Capacity: <Text style={{ fontWeight: "700" }}>{booking.guest_count} Pax</Text>
            </Text>

            <Text style={styles.inputLabel}>Number of Additional Guests</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 10"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              value={extraGuests}
              onChangeText={setExtraGuests}
            />

            <AppButton
              title={`Confirm +${extraGuests || 0} Extra Guests`}
              loading={actionLoading}
              onPress={handleAddGuests}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 3: Upgrade Package ── */}
      <Modal visible={showUpgradeModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContainer, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Package Upgrade</Text>
              <TouchableOpacity
                onPress={() => setShowUpgradeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {packages
                .filter(
                  (p) => String(p._id) !== String(booking.package_id?._id || booking.package_id)
                )
                .map((pkg) => {
                  const isSelected = selectedUpgradePkg?._id === pkg._id;
                  return (
                    <TouchableOpacity
                      key={pkg._id}
                      style={[styles.pkgOption, isSelected && styles.pkgOptionSelected]}
                      onPress={() => setSelectedUpgradePkg(pkg)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pkgOptionTitle}>{pkg.name}</Text>
                        <Text style={styles.pkgOptionPrice}>
                          {pkg.price_per_guest
                            ? `${formatCurrency(pkg.price_per_guest)} / pax`
                            : formatCurrency(pkg.setup_price || pkg.price || 0)}
                        </Text>
                      </View>
                      {isSelected && <CheckCircle size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}

              <AppButton
                title={
                  selectedUpgradePkg
                    ? `Request Upgrade to ${selectedUpgradePkg.name}`
                    : "Choose a Package"
                }
                disabled={!selectedUpgradePkg}
                loading={actionLoading}
                onPress={handleUpgradePackage}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 4: Reject Revision ── */}
      <Modal visible={showRejectRevisionModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Revision Proposal</Text>
              <TouchableOpacity
                onPress={() => setShowRejectRevisionModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Please let management know why this proposed revision does not meet your needs.
            </Text>

            <Text style={styles.inputLabel}>Reason for Declining</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 80, textAlignVertical: "top" }]}
              multiline
              placeholder="e.g. Schedule conflict, budget mismatch, prefer previous package..."
              placeholderTextColor={colors.textDisabled}
              value={rejectRevisionReason}
              onChangeText={setRejectRevisionReason}
            />

            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => setShowRejectRevisionModal(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Decline"
                variant="danger"
                loading={actionLoading}
                onPress={confirmRejectRevision}
                style={{ flex: 1 }}
              />
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
    paddingHorizontal: spacing.base, // Tightened from spacing.xl (24) to spacing.base (16)
    paddingTop: spacing.md,
  },

  // ── Overview Hero Card ──
  overviewHeroCard: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.xs,
  },
  overviewTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  overviewTitleWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  overviewTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  refCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  refCodeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
    letterSpacing: 0.5,
  },
  revisedBadge: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  revisedBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#B45309",
  },
  pastBadge: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pastBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: colors.textDisabled,
  },
  overviewSpecsStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  specChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  specChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundDark,
    fontWeight: "600",
  },

  // ── Section Card Common ──
  sectionCard: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionHeaderTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    letterSpacing: 0.2,
    flex: 1,
  },
  headerActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  headerActionText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  liveTrackingPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  liveTrackingText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // ── Milestone Stepper ──
  stepperContainer: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  stepperTrack: {
    position: "absolute",
    top: 13,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.border,
    zIndex: 1,
  },
  stepperTrackFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  stepperStepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2,
  },
  stepperCol: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 2,
  },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stepperDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepperDotActive: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  stepperNumber: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textDisabled,
    fontWeight: "700",
  },
  stepperNumberActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  stepperLabel: {
    fontSize: 10,
    color: colors.foregroundMuted,
    textAlign: "center",
    fontFamily: typography.fontFamilies.medium,
    lineHeight: 12,
  },
  stepperLabelDone: {
    color: colors.foregroundDark,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  stepperLabelActive: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },

  // Stage Guide Box
  stageGuideBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  stageGuideRose: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  stageGuideAmber: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  stageGuideEmerald: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  stageGuideText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    lineHeight: 16,
    flex: 1,
  },
  stageGuideTitle: {
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },

  // ── Pending Revision Card ──
  revisionNoticeCard: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderColor: colors.warningBorder,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  revisionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  revisionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    alignItems: "center",
    justifyContent: "center",
  },
  revisionNoticeTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.warningDark,
  },
  revisionNoticeSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  revisionDetailsBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderWidth: 1,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    marginVertical: spacing.md,
  },
  revRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  revLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  revValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
  },
  revNoteWrap: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  revNoteLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  revNoteText: {
    fontSize: typography.sizes.xs,
    fontStyle: "italic",
    color: colors.foregroundDark,
    marginTop: 2,
  },
  revisionActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  // ── Info Rows inside Section Card ──
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoIconCol: {
    width: 28,
    alignItems: "flex-start",
    marginTop: 2,
  },
  infoContentCol: {
    flex: 1,
  },
  labelWithActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inlineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineActionText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
    marginTop: 1,
  },
  landmarkText: {
    fontSize: 11,
    color: colors.foregroundMuted,
    fontStyle: "italic",
    marginTop: 2,
  },

  // Palette pills
  paletteSection: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  palettePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  palettePill: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  palettePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundDark,
  },

  // ── Package Card ──
  packageBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  packageIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  packageBannerTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  packageBannerSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  metricsChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: spacing.sm,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  metricChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundDark,
    fontWeight: "600",
  },
  dishesSection: {
    marginTop: spacing.xs,
  },
  subHeading: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  dishesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dishPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  dishPillText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundDark,
    fontWeight: "500",
  },
  dietaryBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  dietaryTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#92400E",
  },
  dietaryDesc: {
    fontSize: 11,
    color: "#92400E",
    marginTop: 2,
    lineHeight: 15,
  },

  // ── Payment Card ──
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  financeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  financeValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  financeSubValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
  },
  financeBalanceRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: 4,
  },
  financeBalanceLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  financeBalanceValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
  },
  overdueAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  overdueAlertText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: "600",
    flex: 1,
  },

  // ── Manager Card ──
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  managerName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  managerRole: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  unassignedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
  },
  unassignedNotice: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 16,
    flex: 1,
  },
  contactOnFileBox: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contactOnFileLabel: {
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  contactOnFileValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
    marginTop: 1,
  },

  // ── Ocular Card ──
  ocularStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  ocularTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  ocularDesc: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  ocularSkippedBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
  },
  ocularSkippedText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontStyle: "italic",
  },
  ocularNoteText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  ocularActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  // ── Rating & Review ──
  verifiedRatingBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: spacing.xs,
  },
  ratingScoreText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  savedReviewText: {
    fontSize: typography.sizes.xs,
    fontStyle: "italic",
    color: colors.foregroundDark,
    marginVertical: spacing.xs,
    lineHeight: 16,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
  },
  ratingPrompt: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.sm,
  },
  interactiveStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  starBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.foregroundDark,
    minHeight: 72,
    textAlignVertical: "top",
  },

  // ── Cancellation ──
  cancelBookingBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  cancelBookingText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontWeight: "600",
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: spacing.base,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundMuted,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.sizes.sm,
    color: colors.foregroundDark,
    minHeight: 44,
  },
  pkgOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pkgOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pkgOptionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  pkgOptionPrice: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
});

export default BookingDetailScreen;

