import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import AppButton from "../../components/common/AppButton";
import { formatCurrency, formatDate, formatTime } from "../../utils/format";

export const BookingDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route.params;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBooking = async () => {
    setError("");
    try {
      const data = await customerApi.getBookingById(id);
      setBooking(data);
    } catch (err) {
      setError("Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

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
  const canCancel = !isPast && !["Cancelled", "cancelled", "refunded", "Completed", "completed"].includes(booking.status);

  return (
    <View style={styles.container}>
      <Header
        title={booking.reference || "Booking Details"}
        subtitle={booking.event_type}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
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

          {/* Timeline Visualizer (Glovo Route Tracking Style) */}
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

        {/* Event Schedule & Venue */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Event Schedule & Venue</Text>
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
            <View>
              <Text style={styles.infoLabel}>Guest Capacity</Text>
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

        {/* Assigned Manager */}
        {booking.event_manager_id ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Event Manager</Text>
            <View style={styles.managerRow}>
              <View style={styles.managerAvatar}>
                <UserCheck size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.managerName}>
                  {booking.event_manager_id.full_name || "Assigned Manager"}
                </Text>
                <Text style={styles.managerPhone}>
                  {booking.event_manager_id.phone || booking.event_manager_id.email || "Catering Lead"}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

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

        {/* Payment Summary */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment & Invoicing</Text>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Total Event Price</Text>
            <Text style={styles.financeValue}>{formatCurrency(booking.total_price || 0)}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Payment Status</Text>
            <StatusBadge status={booking.payment_status || "pending"} size="sm" />
          </View>
        </Card>

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
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
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
});

export default BookingDetailScreen;
