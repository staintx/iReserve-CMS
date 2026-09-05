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
  UserPlus,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Navigation,
  FileText,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { formatCurrency, formatDate, formatTime } from "../../utils/format";

export const ManagerBookingDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [completing, setCompleting] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      const data = await managerApi.getBooking(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Failed to load manager booking detail:", error);
      Alert.alert("Error", "Could not load booking details.");
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

  const handleEmail = (emailAddress) => {
    if (!emailAddress) return;
    Linking.openURL(`mailto:${emailAddress}`).catch(() =>
      Alert.alert("Error", "Unable to open mail app.")
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
      Alert.alert("Error", "Could not open map directions.")
    );
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      const updatedNotes = await managerApi.addNote(bookingId, newNote.trim());
      setBooking((prev) => ({
        ...prev,
        event_manager_notes: updatedNotes,
      }));
      setNewNote("");
      Alert.alert("Success", "Operational note recorded.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  };

  const handleMarkCompleted = () => {
    Alert.alert(
      "Complete Event",
      "Are you sure you want to mark this event as completed? This confirms all services were rendered.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Completed",
          style: "default",
          onPress: async () => {
            try {
              setCompleting(true);
              const response = await managerApi.markCompleted(bookingId);
              setBooking(response.booking || { ...booking, status: "Completed" });
              Alert.alert("Event Completed", "The event has been successfully marked as completed.");
            } catch (error) {
              Alert.alert("Error", error.response?.data?.message || "Failed to complete event.");
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header title="Booking Details" onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader height={160} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
          <SkeletonLoader height={140} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
          <SkeletonLoader height={180} style={{ borderRadius: radius.lg }} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Header title="Booking Details" onBack={() => navigation.goBack()} />
        <View style={styles.errorCenter}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <AppButton title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    );
  }

  const customer = booking.customer_id || {};
  const customerName =
    customer.full_name ||
    `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.trim() ||
    "Client";
  const customerPhone = customer.phone || booking.contact_phone;
  const customerEmail = customer.email || booking.contact_email;

  const staffAssignments = booking.staff_assignments || [];
  const inventoryItems = booking.inventory_items || [];
  const isVerified = booking.equipment_manager_verified?.confirmed;
  const isCompleted = ["Completed", "completed"].includes(booking.status);

  return (
    <View style={styles.screen}>
      <Header
        title={`#${booking.reference || booking._id?.slice(-6).toUpperCase()}`}
        subtitle={booking.event_type || "Catering Event"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Overview Card */}
        <Card style={styles.card}>
          <View style={styles.overviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTypeTitle}>{booking.event_type || "Catering Event"}</Text>
              <Text style={styles.packageSubtitle}>
                {booking.package_id?.name || "Custom Package"}
              </Text>
            </View>
            <StatusBadge status={booking.status} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}>
                <Calendar size={15} color={colors.foregroundMuted} />
                <Text style={styles.infoText}>{formatDate(booking.event_date)}</Text>
              </View>
              {booking.start_time && (
                <View style={styles.infoRow}>
                  <Clock size={15} color={colors.foregroundMuted} />
                  <Text style={styles.infoText}>
                    {formatTime(booking.start_time)} ({booking.duration_hours || 4}h)
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.infoCol}>
              <View style={styles.infoRow}>
                <Users size={15} color={colors.foregroundMuted} />
                <Text style={styles.infoText}>{booking.guests || booking.pax || 0} Guests</Text>
              </View>
              <View style={styles.infoRow}>
                <FileText size={15} color={colors.foregroundMuted} />
                <Text style={styles.infoText}>
                  {formatCurrency(booking.total_price || booking.package_price || 0)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Client & Venue Contact Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Client Contact</Text>
          <View style={styles.clientInfoBlock}>
            <Text style={styles.clientDetailName}>{customerName}</Text>
            {customerPhone ? (
              <View style={styles.contactActionRow}>
                <TouchableOpacity
                  style={styles.quickContactBtn}
                  onPress={() => handleCall(customerPhone)}
                  activeOpacity={0.7}
                >
                  <Phone size={15} color={colors.primary} />
                  <Text style={styles.quickContactText}>{customerPhone}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {customerEmail ? (
              <TouchableOpacity
                style={styles.quickContactBtn}
                onPress={() => handleEmail(customerEmail)}
                activeOpacity={0.7}
              >
                <Mail size={15} color={colors.primary} />
                <Text style={styles.quickContactText}>{customerEmail}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Venue Location</Text>
          <View style={styles.venueRow}>
            <MapPin size={16} color={colors.foregroundMuted} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.venueAddress}>
                {[booking.street, booking.barangay, booking.municipality, "Batangas"]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {booking.landmark ? (
                <Text style={styles.landmarkText}>Landmark: {booking.landmark}</Text>
              ) : null}
            </View>
          </View>

          <AppButton
            title="Open Venue in Maps"
            variant="outline"
            size="sm"
            icon={Navigation}
            onPress={handleOpenMaps}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {/* Staff Assignments Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderAction}>
            <View>
              <Text style={styles.sectionHeading}>Assigned Staff</Text>
              <Text style={styles.sectionSubtext}>
                {staffAssignments.length} member{staffAssignments.length === 1 ? "" : "s"} deployed
              </Text>
            </View>
            <AppButton
              title={staffAssignments.length === 0 ? "Assign Staff" : "Modify Staff"}
              size="sm"
              variant={staffAssignments.length === 0 ? "primary" : "outline"}
              icon={UserPlus}
              onPress={() =>
                navigation.navigate("AssignStaffModal", {
                  bookingId: booking._id,
                  eventDate: booking.event_date,
                  existingAssignments: staffAssignments,
                  onSuccess: loadBooking,
                })
              }
            />
          </View>

          {staffAssignments.length === 0 ? (
            <View style={styles.unassignedBanner}>
              <AlertTriangle size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.unassignedTitle}>Staff Required</Text>
                <Text style={styles.unassignedSub}>
                  No staff members are assigned yet. Tap "Assign Staff" to check availability and assign roles.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.staffList}>
              {staffAssignments.map((assignment, index) => {
                const member = assignment.user_id || {};
                const name = member.full_name || assignment.name || "Staff Member";
                const roleTitle = assignment.role || member.position || "Catering Staff";
                return (
                  <View key={index} style={styles.staffItem}>
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffInitials}>
                        {name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>{name}</Text>
                      <Text style={styles.staffRole}>{roleTitle}</Text>
                    </View>
                    {member.phone ? (
                      <TouchableOpacity
                        style={styles.iconCircle}
                        onPress={() => handleCall(member.phone)}
                      >
                        <Phone size={14} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Equipment Verification Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderAction}>
            <View>
              <Text style={styles.sectionHeading}>Equipment Dispatch</Text>
              <Text style={styles.sectionSubtext}>
                {inventoryItems.length} inventory items booked
              </Text>
            </View>
            <AppButton
              title={isVerified ? "Re-verify Dispatch" : "Verify Dispatch"}
              size="sm"
              variant={isVerified ? "outline" : "primary"}
              icon={ShieldCheck}
              onPress={() =>
                navigation.navigate("EquipmentDispatchModal", {
                  bookingId: booking._id,
                  inventoryItems,
                  alreadyVerified: isVerified,
                  onSuccess: loadBooking,
                })
              }
            />
          </View>

          <View
            style={[
              styles.verificationStatusBanner,
              { backgroundColor: isVerified ? colors.successLight : colors.warningLight },
            ]}
          >
            {isVerified ? (
              <CheckCircle2 size={18} color={colors.success} />
            ) : (
              <AlertTriangle size={18} color={colors.warning} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.verificationStatusTitle,
                  { color: isVerified ? colors.success : colors.warning },
                ]}
              >
                {isVerified ? "Dispatched & Confirmed" : "Dispatch Verification Pending"}
              </Text>
              {booking.equipment_manager_verified?.confirmed_at ? (
                <Text style={styles.verificationMeta}>
                  Confirmed on {formatDate(booking.equipment_manager_verified.confirmed_at)}
                </Text>
              ) : null}
            </View>
          </View>

          {inventoryItems.length > 0 && (
            <View style={styles.inventoryList}>
              {inventoryItems.map((inv, idx) => (
                <View key={idx} style={styles.inventoryRow}>
                  <PackageCheck size={14} color={colors.textSubtle} />
                  <Text style={styles.inventoryName}>
                    {inv.name || inv.inventory_id?.name || "Catering Item"}
                  </Text>
                  <Text style={styles.inventoryQty}>× {inv.quantity || 1}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Operational Notes Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Manager Event Notes</Text>
          <Text style={styles.sectionSubtext}>
            Log logistical updates, special client requests, or operational instructions.
          </Text>

          <View style={styles.noteInputRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Type operational note..."
              placeholderTextColor={colors.textDisabled}
              value={newNote}
              onChangeText={setNewNote}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendNoteBtn,
                (!newNote.trim() || addingNote) && styles.sendNoteBtnDisabled,
              ]}
              onPress={handleAddNote}
              disabled={!newNote.trim() || addingNote}
            >
              <Send size={16} color={colors.white} />
            </TouchableOpacity>
          </View>

          {booking.event_manager_notes && booking.event_manager_notes.length > 0 ? (
            <View style={styles.notesList}>
              {booking.event_manager_notes.map((n, i) => (
                <View key={i} style={styles.noteItem}>
                  <Text style={styles.noteText}>{n.note}</Text>
                  <Text style={styles.noteDate}>
                    {n.created_at ? formatDate(n.created_at) : "Note"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyNotesText}>No operational notes recorded yet.</Text>
          )}
        </Card>

        {/* Complete Event Button */}
        {!isCompleted && (
          <AppButton
            title="Mark Event Completed"
            variant="primary"
            size="lg"
            loading={completing}
            icon={CheckCircle2}
            onPress={handleMarkCompleted}
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
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    marginBottom: spacing.md,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventTypeTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  packageSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoCol: {
    flex: 1,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    fontWeight: "500",
  },
  sectionHeading: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  sectionSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    marginTop: 1,
  },
  clientInfoBlock: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  clientDetailName: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.foreground,
  },
  contactActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  quickContactText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "600",
  },
  venueRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  venueAddress: {
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  landmarkText: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    marginTop: 2,
  },
  cardHeaderAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  unassignedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  unassignedTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.warning,
  },
  unassignedSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  staffList: {
    gap: spacing.xs,
  },
  staffItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.powder,
    alignItems: "center",
    justifyContent: "center",
  },
  staffInitials: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  staffName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  staffRole: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  verificationStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  verificationStatusTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  verificationMeta: {
    fontSize: 10,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  inventoryList: {
    gap: 6,
    marginTop: 4,
  },
  inventoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  inventoryName: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    flex: 1,
  },
  inventoryQty: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  noteInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: typography.sizes.xs,
    color: colors.foreground,
  },
  sendNoteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendNoteBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  notesList: {
    gap: spacing.xs,
  },
  noteItem: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    lineHeight: 18,
  },
  noteDate: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 4,
  },
  emptyNotesText: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    fontStyle: "italic",
    marginTop: 4,
  },
  completeBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.md,
  },
});

export default ManagerBookingDetailScreen;
