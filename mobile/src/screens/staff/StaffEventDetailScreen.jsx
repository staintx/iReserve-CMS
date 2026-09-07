import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  Mail,
  Lock,
  Unlock,
  PackageCheck,
  Send,
  Navigation,
  CheckCircle2,
  FileText,
  AlertTriangle,
  UserCheck,
  Utensils,
  MessageSquare,
  ShieldAlert,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import staffApi from "../../api/staff";
import messagesApi from "../../api/messages";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { formatDate, formatTime } from "../../utils/format";

const QUICK_TAGS = [
  "All Smooth ✓",
  "Late Start ⏰",
  "Missing Gear ⚠️",
  "Damaged Items 💥",
  "Leftover Food 🍲",
  "Extra Hours ⏱️",
];

export const StaffEventDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const bookingId = route?.params?.bookingId || route?.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [completingShift, setCompletingShift] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      const data = await staffApi.getMyBooking(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Failed to load staff booking detail:", error);
      Alert.alert("Error", "Could not load shift details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBooking();
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() =>
      Alert.alert("Error", "Unable to open phone dialer.")
    );
  };

  const handleOpenMaps = () => {
    if (!booking) return;
    const addressQuery = [
      booking.street,
      booking.barangay,
      booking.municipality,
      "Batangas, Philippines",
    ]
      .filter(Boolean)
      .join(", ");
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open map navigation.")
    );
  };

  const handleChatWithManager = async () => {
    if (!booking.event_manager_id) {
      Alert.alert("No Manager Assigned", "An operations lead will be assigned shortly.");
      return;
    }

    const managerId = booking.event_manager_id._id || booking.event_manager_id;
    try {
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
      Alert.alert("Chat Unavailable", "Please call the manager directly using the phone shortcut.");
    }
  };

  const isEventStarted = () => {
    if (!booking) return false;
    if (["completed", "Completed", "ongoing"].includes(booking.status)) return true;
    if (!booking.event_date) return true;

    const d = new Date(booking.event_date);
    let hours = 0;
    let minutes = 0;
    if (booking.start_time) {
      const match = String(booking.start_time).trim().match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
      }
    }
    const startDateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);
    return new Date() >= startDateTime;
  };

  const handleSelectQuickTag = (tag) => {
    if (reportNote.includes(tag)) {
      setReportNote((prev) => prev.replace(`[${tag}] `, "").replace(`[${tag}]`, "").trim());
    } else {
      setReportNote((prev) => `[${tag}] ${prev}`.trim());
    }
  };

  const handleSubmitReport = async () => {
    if (!reportNote.trim()) return;
    try {
      setSubmittingReport(true);
      const res = await staffApi.submitReport(bookingId, {
        note: reportNote.trim(),
        role: "Service Staff",
      });
      setBooking((prev) => ({
        ...prev,
        staff_reports: res.staff_reports || [
          ...(prev.staff_reports || []),
          { note: reportNote.trim(), created_at: new Date() },
        ],
      }));
      setReportNote("");
      Alert.alert("Report Filed", "Your shift incident / operational note has been recorded.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to submit report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleCompleteShift = () => {
    if (!isEventStarted()) {
      Alert.alert(
        "Shift In Progress",
        `Shifts cannot be marked complete before the event begins at ${formatTime(booking.start_time) || "the scheduled time"}.`
      );
      return;
    }

    Alert.alert(
      "Complete Shift",
      "Confirm that all assigned catering and service responsibilities are finished for this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Completion",
          onPress: async () => {
            try {
              setCompletingShift(true);
              const response = await staffApi.completeEvent(bookingId);
              setBooking(response.booking || { ...booking, status: "Completed" });
              Alert.alert("Success", "Event shift marked as completed!");
            } catch (error) {
              Alert.alert("Error", error.response?.data?.message || "Failed to complete event.");
            } finally {
              setCompletingShift(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header title="Shift Details" onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader height={160} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
          <SkeletonLoader height={140} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header title="Shift Details" onBack={() => navigation.goBack()} />
        <View style={styles.errorCenter}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Shift Not Found</Text>
          <AppButton title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    );
  }

  const manager = booking.event_manager_id;
  const staffAssignments = booking.staff_assignments || [];
  const reports = booking.staff_reports || [];
  const started = isEventStarted();
  const isCompleted = ["Completed", "completed"].includes(booking.status);

  const menuItems = Array.isArray(booking.menu_items) ? booking.menu_items : [];
  const selectedDishes = Array.isArray(booking.selected_dishes) ? booking.selected_dishes : [];
  const displayDishes = menuItems.length > 0 ? menuItems : selectedDishes;
  const hasDietaryWarning = Boolean(booking.dietary_notes || booking.allergies);

  return (
    <View style={styles.screen}>
      <Header
        title={`#${booking.reference || booking._id?.slice(-6).toUpperCase()}`}
        subtitle={booking.event_type || "Catering Shift"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* CRITICAL SAFETY ALERT: Food Allergies & Dietary Restrictions */}
        {hasDietaryWarning && (
          <Card style={styles.allergyAlertCard}>
            <View style={styles.allergyAlertHeader}>
              <AlertTriangle size={18} color="#b45309" />
              <Text style={styles.allergyAlertTitle}>ALLERGY & DIETARY ALERT</Text>
            </View>
            <Text style={styles.allergyAlertText}>
              {booking.dietary_notes || booking.allergies}
            </Text>
            <Text style={styles.allergyAlertFooter}>
              Please inform the Head Cook and exercise strict cross-contamination safety during plating and buffet service.
            </Text>
          </Card>
        )}

        {/* Schedule & Overview Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTypeTitle}>{booking.event_type || "Catering Event"}</Text>
              <Text style={styles.refText}>
                Reference: #{booking.reference || booking._id?.slice(-6).toUpperCase()}
              </Text>
            </View>
            <StatusBadge status={booking.status} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Calendar size={15} color={colors.foregroundMuted} />
            <Text style={styles.infoText}>{formatDate(booking.event_date)}</Text>
          </View>

          {booking.start_time && (
            <View style={styles.infoRow}>
              <Clock size={15} color={colors.foregroundMuted} />
              <Text style={styles.infoText}>
                {formatTime(booking.start_time)} ({booking.duration_hours || 4} hours duration)
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Users size={15} color={colors.foregroundMuted} />
            <Text style={styles.infoText}>{booking.guest_count || 0} Expected Guests</Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={15} color={colors.foregroundMuted} />
            <Text style={styles.infoText} numberOfLines={2}>
              {[booking.street, booking.barangay, booking.municipality, "Batangas"]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>

          <AppButton
            title="Open Maps Directions"
            variant="outline"
            size="sm"
            icon={Navigation}
            onPress={handleOpenMaps}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {/* Assigned Catering Food Menu */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Banquet Menu Breakdown</Text>
          <Text style={styles.sectionSub}>
            Courses and dishes being served for this event
          </Text>

          {displayDishes.length === 0 ? (
            <Text style={styles.emptyMenuText}>Standard buffet menu package assigned.</Text>
          ) : (
            <View style={styles.dishesGrid}>
              {displayDishes.map((dish, idx) => {
                const dishName = dish.name || dish.item_name || (typeof dish === "string" ? dish : `Dish #${idx + 1}`);
                const course = dish.category || dish.course || "";
                return (
                  <View key={idx} style={styles.dishPill}>
                    <Utensils size={12} color={colors.primary} />
                    <Text style={styles.dishPillText} numberOfLines={1}>
                      {dishName} {course ? `(${course})` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Equipment Verification Action */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeading}>Equipment Return Checklist</Text>
              <Text style={styles.sectionSub}>
                Reconcile and inspect catering items returned from this event
              </Text>
            </View>
            <View
              style={[
                styles.lockBadge,
                { backgroundColor: started ? colors.successLight : colors.warningLight },
              ]}
            >
              {started ? (
                <Unlock size={14} color={colors.success} />
              ) : (
                <Lock size={14} color={colors.warning} />
              )}
              <Text
                style={[
                  styles.lockBadgeText,
                  { color: started ? colors.success : colors.warning },
                ]}
              >
                {started ? "Unlocked" : "Locked"}
              </Text>
            </View>
          </View>

          <AppButton
            title={started ? "Open Equipment Checklist" : "Locked Until Event Start"}
            variant={started ? "primary" : "ghost"}
            size="md"
            icon={PackageCheck}
            onPress={() => {
              if (!started) {
                Alert.alert(
                  "Checklist Locked",
                  `Equipment returns can only be filed once the event starts at ${formatTime(booking.start_time) || "the scheduled time"}.`
                );
              } else {
                navigation.navigate("EquipmentChecklist", {
                  bookingId: booking._id,
                });
              }
            }}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {/* Manager & Team Contact */}
        {manager && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeading}>Event Operations Manager</Text>
            <View style={styles.contactBlock}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{manager.full_name || "Manager"}</Text>
                {manager.phone ? (
                  <TouchableOpacity
                    style={styles.callRow}
                    onPress={() => handleCall(manager.phone)}
                  >
                    <Phone size={13} color={colors.primary} />
                    <Text style={styles.callText}>{manager.phone}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.chatIconBtn}
                onPress={handleChatWithManager}
              >
                <MessageSquare size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Co-Workers / Team Roster */}
        {staffAssignments.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionHeading}>Service Team ({staffAssignments.length})</Text>
            </View>

            <View style={styles.rosterList}>
              {staffAssignments.map((sa, i) => {
                const staffMember = sa.user_id || {};
                const name = staffMember.full_name || sa.name || "Colleague";
                const role = sa.role || staffMember.position || "Catering Staff";
                return (
                  <View key={i} style={styles.rosterItem}>
                    <View style={styles.rosterAvatar}>
                      <Text style={styles.rosterInitials}>
                        {name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterName}>{name}</Text>
                      <Text style={styles.rosterRole}>{role}</Text>
                    </View>
                    {staffMember.phone ? (
                      <TouchableOpacity
                        style={styles.phoneIconBtn}
                        onPress={() => handleCall(staffMember.phone)}
                      >
                        <Phone size={13} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Shift Reports & Incident Notes with Quick Tags */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Shift Incident & Service Reports</Text>
          <Text style={styles.sectionSub}>
            Document any damages, client feedback, or notable service details.
          </Text>

          {/* Quick Tags Pills */}
          <Text style={styles.quickTagsLabel}>Quick Incident Tags (Tap to Add):</Text>
          <View style={styles.quickTagsContainer}>
            {QUICK_TAGS.map((tag, idx) => {
              const isSelected = reportNote.includes(tag);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.quickTagPill, isSelected && styles.quickTagPillActive]}
                  onPress={() => handleSelectQuickTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickTagText, isSelected && styles.quickTagTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.reportInputRow}>
            <TextInput
              style={styles.reportInput}
              placeholder="Enter shift notes or incident details..."
              placeholderTextColor={colors.textDisabled}
              value={reportNote}
              onChangeText={setReportNote}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendReportBtn,
                (!reportNote.trim() || submittingReport) && styles.sendReportBtnDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={!reportNote.trim() || submittingReport}
            >
              <Send size={16} color={colors.white} />
            </TouchableOpacity>
          </View>

          {reports.length > 0 ? (
            <View style={styles.reportsList}>
              {reports.map((r, idx) => (
                <View key={idx} style={styles.reportCard}>
                  <Text style={styles.reportNoteText}>{r.note}</Text>
                  <Text style={styles.reportDate}>
                    {r.created_at ? formatDate(r.created_at) : "Report"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyReportsText}>No reports filed for this shift yet.</Text>
          )}
        </Card>

        {/* Complete Shift Button */}
        {!isCompleted && (
          <AppButton
            title="Complete Shift & Services"
            variant="primary"
            size="lg"
            icon={CheckCircle2}
            loading={completingShift}
            onPress={handleCompleteShift}
            style={styles.completeBtn}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  scrollContent: {
    padding: spacing.base,
  },
  card: {
    marginBottom: spacing.md,
  },
  allergyAlertCard: {
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fde68a",
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  allergyAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  allergyAlertTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#b45309",
    letterSpacing: 0.5,
  },
  allergyAlertText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: "#78350f",
    marginVertical: 2,
  },
  allergyAlertFooter: {
    fontSize: 10,
    color: "#92400e",
    marginTop: 4,
    fontStyle: "italic",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventTypeTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  refText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  emptyMenuText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontStyle: "italic",
  },
  dishesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  dishPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  contactBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  contactName: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  callText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "600",
  },
  chatIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rosterList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  rosterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rosterInitials: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  rosterName: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  rosterRole: {
    fontSize: 10,
    color: colors.foregroundMuted,
  },
  phoneIconBtn: {
    padding: 6,
  },
  quickTagsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  quickTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  quickTagPill: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  quickTagPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickTagText: {
    fontSize: 10,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  quickTagTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  reportInputRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  reportInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    minHeight: 44,
  },
  sendReportBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendReportBtnDisabled: {
    opacity: 0.5,
  },
  reportsList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  reportCard: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  reportNoteText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
  },
  reportDate: {
    fontSize: 10,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  emptyReportsText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  completeBtn: {
    marginTop: spacing.sm,
  },
  errorCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.md,
  },
});

export default StaffEventDetailScreen;
