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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
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
import { formatCurrency, formatDate, formatTime } from "../../utils/format";

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
    customerApi.getPackages().then((pkgs) => {
      if (Array.isArray(pkgs)) setPackages(pkgs);
    }).catch(() => {});
  }, [loadBooking]);

  // Timeline Progress Calculation
  const timelineSteps = useMemo(() => {
    if (!booking) return [];

    const isCancelled = ["Cancelled", "cancelled", "refunded"].includes(booking.status);
    const isCompleted = ["Completed", "completed"].includes(booking.status);
    const isReady = ["Ready for Event", "ready for event"].includes(booking.status);
    const isOcular = ["Ocular Scheduled", "ocular scheduled"].includes(booking.status) || booking.ocular_visit?.status === "scheduled" || booking.ocular_visit?.status === "completed";
    const isDepositPaid = booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid";

    return [
      { id: "inquiry", label: "Inquiry & Quote", done: true },
      { id: "deposit", label: "Deposit Paid", done: isDepositPaid },
      { id: "ocular", label: "Ocular Inspection", done: booking.ocular_visit?.status === "completed" || booking.ocular_visit?.status === "skipped", active: isOcular },
      { id: "ready", label: "Ready for Event", done: isReady || isCompleted, active: isReady },
      { id: "completed", label: "Completed", done: isCompleted },
    ];
  }, [booking]);

  // Financial Calculations
  const totalPrice = Number(booking?.total_price || 0);
  const isDepositPaid = booking?.payment_status === "deposit_paid" || booking?.payment_status === "fully_paid";
  const depositAmount = Number(booking?.deposit_amount || (totalPrice * 0.3));
  const remainingBalance = isDepositPaid
    ? Math.max(0, totalPrice - depositAmount)
    : totalPrice;
  const canPayBalance = booking?.payment_status === "deposit_paid" && remainingBalance > 0;

  // Pay Remaining Balance via PayMongo
  const handlePayBalance = async () => {
    Alert.alert(
      "Pay Remaining Balance",
      `Proceed to pay the remaining balance of ${formatCurrency(remainingBalance)} via PayMongo (GCash / Maya / Card)?`,
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
              Alert.alert("Payment Error", err.response?.data?.message || "Failed to initialize balance checkout.");
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
    if (!changeNote.trim() && !changeDate && !changeGuests && !changeTime) {
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
      Alert.alert("Revisions Submitted", "Your proposed revisions were submitted for manager review.");
      setShowChangeModal(false);
      setChangeNote("");
      setChangeDate("");
      setChangeTime("");
      setChangeGuests("");
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
      Alert.alert("Upgrade Submitted", `Your upgrade request to ${selectedUpgradePkg.name} has been submitted.`);
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
      // Fallback: search conversations list
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
      Alert.alert("Chat Unavailable", "Could not start chat session. Please call or email the manager directly.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestOcular = () => {
    Alert.alert(
      "Request Ocular Inspection",
      "Would you like to request an on-site venue inspection by our team? We will coordinate with you to pick an ocular date.",
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

  const handleSkipOcular = () => {
    Alert.alert(
      "Skip Ocular Inspection",
      "Are you confident with your venue setup without a preliminary site inspection?",
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

  const handleRequestCancellation = () => {
    Alert.alert(
      "Request Cancellation & Refund",
      "Are you sure you want to request cancellation for this booking? A change request will be submitted to the administration.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Submit Cancellation Request",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await customerApi.requestCancellation(booking._id);
              Alert.alert("Request Submitted", "Your cancellation request has been submitted for administrative review.");
              loadBooking();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to submit cancellation request.");
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

  const isPast = booking.event_date && new Date(booking.event_date) < new Date();
  const isCompleted = ["Completed", "completed"].includes(booking.status);
  const canCancel = !isPast && !["Cancelled", "cancelled", "refunded", "Completed", "completed"].includes(booking.status);
  const hasPendingRevision = Boolean(booking.pending_revision || booking.revision_proposal);
  const pendingRev = booking.pending_revision || booking.revision_proposal;

  const menuItems = Array.isArray(booking.menu_items) ? booking.menu_items : [];
  const selectedDishes = Array.isArray(booking.selected_dishes) ? booking.selected_dishes : [];
  const displayDishes = menuItems.length > 0 ? menuItems : selectedDishes;

  return (
    <View style={styles.container}>
      <Header
        title={booking.reference || "Booking Details"}
        subtitle={booking.event_type}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Header */}
        <Card style={styles.statusHeaderCard} variant="flat">
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.bookingRefLabel}>Booking Reference</Text>
              <Text style={styles.bookingRefNumber}>{booking.reference || `CAZ-${String(booking._id).slice(-6).toUpperCase()}`}</Text>
            </View>
            <StatusBadge status={booking.status} />
          </View>

          {/* Timeline Visualizer */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeaderRow}>
              <Text style={styles.timelineHeading}>Order & Event Milestones</Text>
              <Text style={styles.timelineLiveBadge}>LIVE TRACKING</Text>
            </View>
            <View style={styles.stepsRow}>
              {timelineSteps.map((step, idx) => (
                <View key={step.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      step.done && styles.stepDotDone,
                      step.active && styles.stepDotActive,
                    ]}
                  >
                    {step.done ? (
                      <CheckCircle size={14} color={colors.white} />
                    ) : (
                      <Text style={[styles.stepNumber, step.active && styles.stepNumberActive]}>
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step.done && styles.stepLabelDone,
                      step.active && styles.stepLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Pending Revision Proposal Banner from Management */}
        {hasPendingRevision && (
          <Card style={styles.revisionNoticeCard}>
            <View style={styles.revisionHeaderRow}>
              <AlertCircle size={20} color={colors.warning} />
              <Text style={styles.revisionNoticeTitle}>Proposed Revision from Management</Text>
            </View>
            <Text style={styles.revisionNoticeSub}>
              Our event manager has proposed the following adjustments to your reservation:
            </Text>
            <View style={styles.revisionDetailsBox}>
              {pendingRev.event_date && (
                <Text style={styles.revItem}>• Date: {formatDate(pendingRev.event_date)}</Text>
              )}
              {pendingRev.start_time && (
                <Text style={styles.revItem}>• Time: {formatTime(pendingRev.start_time)}</Text>
              )}
              {pendingRev.guest_count && (
                <Text style={styles.revItem}>• Guest Capacity: {pendingRev.guest_count} Guests</Text>
              )}
              {pendingRev.total_price && (
                <Text style={styles.revItem}>• Revised Total: {formatCurrency(pendingRev.total_price)}</Text>
              )}
              {pendingRev.message && (
                <Text style={styles.revItemNote}>Note: "{pendingRev.message}"</Text>
              )}
            </View>
            <View style={styles.revisionActionRow}>
              <AppButton
                title="Accept Revisions"
                onPress={handleAcceptRevision}
                size="sm"
                loading={actionLoading}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <AppButton
                title="Decline"
                onPress={handleRejectRevision}
                variant="outline"
                size="sm"
                disabled={actionLoading}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {/* Event Schedule & Venue */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderWithAction}>
            <Text style={styles.sectionTitle}>Event Schedule & Venue</Text>
            {!isCompleted && !isPast && (
              <TouchableOpacity
                style={styles.headerActionPill}
                onPress={() => setShowChangeModal(true)}
              >
                <FileEdit size={13} color={colors.primary} />
                <Text style={styles.headerActionText}>Propose Changes</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoRow}>
            <Calendar size={18} color={colors.primary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Event Date</Text>
              <Text style={styles.infoValue}>{formatDate(booking.event_date)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock size={18} color={colors.primary} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Start Time & Service</Text>
              <Text style={styles.infoValue}>{formatTime(booking.start_time)} • {booking.service_type || "Catering & Setup"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Users size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.infoLabel}>Guest Capacity</Text>
                {!isCompleted && !isPast && (
                  <TouchableOpacity
                    onPress={() => setShowAddGuestsModal(true)}
                    style={styles.addGuestsInlineBtn}
                  >
                    <PlusCircle size={12} color={colors.primary} />
                    <Text style={styles.addGuestsInlineText}>Add Extra Guests</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.infoValue}>{booking.guest_count} Guests</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Venue Address</Text>
              <Text style={styles.infoValue}>
                {booking.delivery_method === "pickup"
                  ? "Customer Pick-up at Headquarters"
                  : `${booking.street ? `${booking.street}, ` : ""}${booking.barangay || ""}, ${booking.municipality || "Batangas"}`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Package & Inclusions */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderWithAction}>
            <Text style={styles.sectionTitle}>Selected Package</Text>
            {!isCompleted && !isPast && (
              <TouchableOpacity
                style={styles.headerActionPill}
                onPress={() => setShowUpgradeModal(true)}
              >
                <ArrowUpCircle size={13} color={colors.primary} />
                <Text style={styles.headerActionText}>Upgrade Package</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.packageBanner}>
            <Sparkles size={18} color={colors.primary} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.packageBannerTitle}>{booking.package_id?.name || "Custom Catering Package"}</Text>
              <Text style={styles.packageBannerSub}>{booking.package_id?.package_type || "Full Banquet Service"}</Text>
            </View>
          </View>

          {/* Food Menu Items */}
          {displayDishes.length > 0 && (
            <View style={styles.dishesSection}>
              <Text style={styles.subHeading}>Catering Menu Selections</Text>
              <View style={styles.dishesGrid}>
                {displayDishes.map((dish, i) => {
                  const dishName = dish.name || dish.item_name || (typeof dish === "string" ? dish : `Dish #${i + 1}`);
                  const dishCourse = dish.category || dish.course || "";
                  return (
                    <View key={i} style={styles.dishPill}>
                      <Utensils size={12} color={colors.primary} />
                      <Text style={styles.dishPillText} numberOfLines={1}>
                        {dishName} {dishCourse ? `(${dishCourse})` : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Dietary Requirements */}
          {Boolean(booking.dietary_notes || booking.allergies) && (
            <View style={styles.dietaryBox}>
              <ShieldCheck size={16} color={colors.warning} />
              <View style={{ marginLeft: spacing.xs, flex: 1 }}>
                <Text style={styles.dietaryTitle}>Dietary & Allergen Notes</Text>
                <Text style={styles.dietaryDesc}>{booking.dietary_notes || booking.allergies}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Assigned Manager & Messaging */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Event Operations Manager</Text>
          {booking.event_manager_id ? (
            <View>
              <View style={styles.managerRow}>
                <View style={styles.managerAvatar}>
                  <UserCheck size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.managerName}>
                    {booking.event_manager_id.full_name || "Assigned Manager"}
                  </Text>
                  <Text style={styles.managerPhone}>
                    {booking.event_manager_id.phone || booking.event_manager_id.email || "Catering Operations Lead"}
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
            <Text style={styles.unassignedNotice}>
              Our management team is reviewing logistics. Your dedicated Banquet Manager will be assigned shortly.
            </Text>
          )}
        </Card>

        {/* Ocular Inspection Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Site Inspection / Ocular</Text>
          {booking.ocular_visit?.status === "completed" ? (
            <View style={styles.ocularStatusBox}>
              <CheckCircle size={18} color={colors.success} />
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
              <Eye size={18} color={colors.primary} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.ocularTitle}>Ocular Visit Scheduled</Text>
                <Text style={styles.ocularDesc}>
                  Date: {formatDate(booking.ocular_visit.scheduled_date)} {booking.ocular_visit.scheduled_time || ""}
                </Text>
              </View>
            </View>
          ) : booking.ocular_visit?.status === "skipped" ? (
            <Text style={styles.ocularNoteText}>Ocular inspection was skipped.</Text>
          ) : (
            <View>
              <Text style={styles.ocularNoteText}>
                An on-site inspection ensures electrical outlets, table layout, and setup boundaries match your expectations.
              </Text>
              <View style={styles.ocularActionsRow}>
                <AppButton
                  title="Request Ocular"
                  onPress={handleRequestOcular}
                  size="sm"
                  style={{ flex: 1, marginRight: spacing.sm }}
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

        {/* Payment Summary & Pay Balance Action */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment & Invoicing</Text>

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

          {isDepositPaid && (
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Remaining Balance Due</Text>
              <Text style={[styles.financeValue, { color: remainingBalance > 0 ? colors.warning : colors.success }]}>
                {remainingBalance > 0 ? formatCurrency(remainingBalance) : "Fully Settled ✓"}
              </Text>
            </View>
          )}

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Payment Status</Text>
            <StatusBadge status={booking.payment_status || "pending"} size="sm" />
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
        </Card>

        {/* Star Rating & Review for Completed Events */}
        {isCompleted && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Event Review & Rating</Text>
            {bookingRating ? (
              <View style={styles.verifiedRatingBox}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
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
                    >
                      <Star
                        size={28}
                        color={star <= ratingStars ? colors.warning : colors.textDisabled}
                        fill={star <= ratingStars ? colors.warning : "transparent"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Tell us about the food taste, table setup, and banquet crew..."
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

        {/* Cancellation Option */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBookingBtn}
            onPress={handleRequestCancellation}
            disabled={actionLoading}
          >
            <Text style={styles.cancelBookingText}>Request Cancellation / Refund</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── MODAL 1: Propose Revision / Change Request ── */}
      <Modal visible={showChangeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Propose Booking Revisions</Text>
              <TouchableOpacity onPress={() => setShowChangeModal(false)}>
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

              <Text style={styles.inputLabel}>Notes & Reasons for Revision</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
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
        </View>
      </Modal>

      {/* ── MODAL 2: Add Extra Guests ── */}
      <Modal visible={showAddGuestsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Additional Guests</Text>
              <TouchableOpacity onPress={() => setShowAddGuestsModal(false)}>
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
        </View>
      </Modal>

      {/* ── MODAL 3: Upgrade Package ── */}
      <Modal visible={showUpgradeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Package Upgrade</Text>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {packages
                .filter((p) => String(p._id) !== String(booking.package_id?._id || booking.package_id))
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
                          {pkg.price_per_guest ? `${formatCurrency(pkg.price_per_guest)} / pax` : formatCurrency(pkg.setup_price || pkg.price || 0)}
                        </Text>
                      </View>
                      {isSelected && <CheckCircle size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}

              <AppButton
                title={selectedUpgradePkg ? `Request Upgrade to ${selectedUpgradePkg.name}` : "Choose a Package"}
                disabled={!selectedUpgradePkg}
                loading={actionLoading}
                onPress={handleUpgradePackage}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: Reject Revision ── */}
      <Modal visible={showRejectRevisionModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Revision Proposal</Text>
              <TouchableOpacity onPress={() => setShowRejectRevisionModal(false)}>
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
                variant="destructive"
                loading={actionLoading}
                onPress={confirmRejectRevision}
                style={{ flex: 1 }}
              />
            </View>
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
  statusHeaderCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.base,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  bookingRefLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  bookingRefNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 2,
  },
  timelineContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  timelineHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timelineLiveBadge: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    letterSpacing: 0.5,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 2,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotActive: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.foregroundMuted,
  },
  stepNumberActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  stepLabel: {
    fontSize: 10,
    color: colors.foregroundMuted,
    textAlign: "center",
    fontFamily: typography.fontFamily.medium,
    lineHeight: 13,
  },
  stepLabelDone: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bold,
  },
  stepLabelActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  revisionNoticeCard: {
    padding: spacing.md,
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  revisionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  revisionNoticeTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: "#b45309",
  },
  revisionNoticeSub: {
    fontSize: typography.sizes.xs,
    color: "#78350f",
    marginTop: 4,
  },
  revisionDetailsBox: {
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.sm,
  },
  revItem: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 2,
  },
  revItemNote: {
    fontSize: typography.sizes.xs,
    fontStyle: "italic",
    color: colors.foregroundMuted,
    marginTop: 4,
  },
  revisionActionRow: {
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  cardHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  headerActionText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  addGuestsInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addGuestsInlineText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: 2,
  },
  packageBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  packageBannerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  packageBannerSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  dishesSection: {
    marginTop: spacing.sm,
  },
  subHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  dishesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  dishPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  dishPillText: {
    fontSize: 11,
    color: colors.foreground,
    fontWeight: "500",
  },
  dietaryBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef3c7",
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  dietaryTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },
  dietaryDesc: {
    fontSize: 11,
    color: "#92400e",
    marginTop: 2,
  },
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  managerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  managerName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  managerPhone: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  unassignedNotice: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontStyle: "italic",
  },
  ocularStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  ocularTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  ocularDesc: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  ocularNoteText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  ocularActionsRow: {
    flexDirection: "row",
  },
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  financeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
  },
  financeValue: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.primary,
  },
  financeSubValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  verifiedRatingBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs,
  },
  ratingScoreText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  savedReviewText: {
    fontSize: typography.sizes.sm,
    fontStyle: "italic",
    color: colors.foreground,
    marginVertical: spacing.xs,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
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
    padding: 2,
  },
  reviewInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    minHeight: 70,
    textAlignVertical: "top",
  },
  cancelBookingBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBookingText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
    fontWeight: "800",
    color: colors.foreground,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foregroundMuted,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
  },
  pkgOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  pkgOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pkgOptionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  pkgOptionPrice: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
});

export default BookingDetailScreen;
