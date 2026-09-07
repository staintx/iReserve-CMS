import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Modal,
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
  MessageSquare,
  Utensils,
  X,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import messagesApi from "../../api/messages";
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

  // Equipment Return Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      const data = await managerApi.getBooking(bookingId);
      setBooking(data);
      if (data?.equipment_manager_verified?.additional_notes) {
        setVerifyNotes(data.equipment_manager_verified.additional_notes);
      }
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

  const handleChatWithCustomer = async () => {
    const customer = booking.customer_id;
    if (!customer?._id && !customer) {
      Alert.alert("Customer info unavailable", "Customer profile record is missing.");
      return;
    }

    const customerId = customer._id || customer;
    try {
      const conv = await messagesApi.createConversation({
        participant_id: customerId,
        booking_id: booking._id,
      });

      navigation.navigate("CustomerChatThread", {
        conversationId: conv?._id || conv?.id,
        title: customer.full_name || "Client",
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
            title: customer.full_name || "Client",
          });
          return;
        }
      } catch {
        // Ignored
      }
      Alert.alert("Chat Unavailable", "Could not start in-app chat. Please call or email the customer directly.");
    }
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

  const handleConfirmEquipmentReturns = async () => {
    try {
      setSubmittingVerification(true);
      await managerApi.verifyEquipment(bookingId, {
        confirmed: true,
        additional_notes: verifyNotes.trim(),
      });
      setShowVerifyModal(false);
      Alert.alert("Verification Saved", "Equipment returns have been reconciled and verified.");
      loadBooking();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to verify equipment.");
    } finally {
      setSubmittingVerification(false);
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
  const equipmentReturns = booking.equipment_returns || [];
  const staffReports = booking.staff_reports || [];

  const isDispatchVerified = booking.equipment_manager_verified?.confirmed;
  const isCompleted = ["Completed", "completed"].includes(booking.status);

  const menuItems = Array.isArray(booking.menu_items) ? booking.menu_items : [];
  const selectedDishes = Array.isArray(booking.selected_dishes) ? booking.selected_dishes : [];
  const displayDishes = menuItems.length > 0 ? menuItems : selectedDishes;

  return (
    <View style={styles.screen}>
      <Header
        title={`#${booking.reference || booking._id?.slice(-6).toUpperCase()}`}
        subtitle={booking.event_type || "Catering Event"}
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
                <Text style={styles.infoText}>{booking.guest_count || booking.guests || 0} Guests</Text>
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

          {/* Chat with Client Action Button */}
          <AppButton
            title="Message Client in App"
            icon={MessageSquare}
            variant="outline"
            size="sm"
            onPress={handleChatWithCustomer}
            style={{ marginTop: spacing.sm }}
          />

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

        {/* Catering Menu & Food Selections Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Catering Menu & Course Inclusions</Text>
          {displayDishes.length === 0 ? (
            <Text style={styles.emptySubtext}>Menu items pending selection or standard banquet package spread.</Text>
          ) : (
            <View style={styles.dishesGrid}>
              {displayDishes.map((dish, idx) => {
                const dishName = dish.name || dish.item_name || (typeof dish === "string" ? dish : `Dish #${idx + 1}`);
                const course = dish.category || dish.course || "";
                return (
                  <View key={idx} style={styles.dishBadge}>
                    <Utensils size={12} color={colors.primary} />
                    <Text style={styles.dishBadgeText} numberOfLines={1}>
                      {dishName} {course ? `(${course})` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {Boolean(booking.dietary_notes || booking.allergies) && (
            <View style={styles.allergyAlertCard}>
              <AlertTriangle size={16} color="#b45309" />
              <View style={{ marginLeft: spacing.xs, flex: 1 }}>
                <Text style={styles.allergyAlertTitle}>Dietary & Allergen Notice</Text>
                <Text style={styles.allergyAlertDesc}>{booking.dietary_notes || booking.allergies}</Text>
              </View>
            </View>
          )}
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

        {/* Equipment Dispatch & Outgoing Inventory Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderAction}>
            <View>
              <Text style={styles.sectionHeading}>Equipment Dispatch</Text>
              <Text style={styles.sectionSubtext}>
                {inventoryItems.length} inventory items booked
              </Text>
            </View>
            <AppButton
              title={isDispatchVerified ? "Re-verify Dispatch" : "Verify Dispatch"}
              size="sm"
              variant={isDispatchVerified ? "outline" : "primary"}
              icon={ShieldCheck}
              onPress={() =>
                navigation.navigate("EquipmentDispatchModal", {
                  bookingId: booking._id,
                  inventoryItems,
                  alreadyVerified: isDispatchVerified,
                  onSuccess: loadBooking,
                })
              }
            />
          </View>

          <View
            style={[
              styles.verificationStatusBanner,
              { backgroundColor: isDispatchVerified ? colors.successLight : colors.warningLight },
            ]}
          >
            {isDispatchVerified ? (
              <CheckCircle2 size={18} color={colors.success} />
            ) : (
              <AlertTriangle size={18} color={colors.warning} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.verificationStatusTitle,
                  { color: isDispatchVerified ? colors.success : colors.warning },
                ]}
              >
                {isDispatchVerified ? "Dispatched & Confirmed" : "Dispatch Verification Pending"}
              </Text>
              {booking.equipment_manager_verified?.confirmed_at ? (
                <Text style={styles.verificationMeta}>
                  Confirmed on {formatDate(booking.equipment_manager_verified.confirmed_at)}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Equipment Returns & Post-Event Reconciliation Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderAction}>
            <View>
              <Text style={styles.sectionHeading}>Post-Event Equipment Returns</Text>
              <Text style={styles.sectionSubtext}>
                {equipmentReturns.length > 0 ? `${equipmentReturns.length} items logged by staff` : "Awaiting staff checklist return"}
              </Text>
            </View>
            <AppButton
              title="Verify Returns"
              size="sm"
              variant="outline"
              icon={ShieldCheck}
              onPress={() => setShowVerifyModal(true)}
            />
          </View>

          {equipmentReturns.length === 0 ? (
            <Text style={styles.emptySubtext}>
              Once catering staff complete on-site packing, returned, damaged, and missing gear counts will appear here for verification.
            </Text>
          ) : (
            <View style={styles.returnsTable}>
              {equipmentReturns.map((ret, i) => {
                const booked = Number(ret.quantity_booked || 1);
                const returned = Number(ret.quantity_returned || 0);
                const damaged = Number(ret.quantity_damaged || 0);
                const missing = Math.max(0, booked - (returned + damaged));
                const name = ret.name || ret.inventory_id?.item_name || ret.inventory_id?.name || "Equipment Item";

                return (
                  <View key={i} style={styles.returnRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.returnItemName}>{name}</Text>
                      {ret.notes ? <Text style={styles.returnItemNote}>"{ret.notes}"</Text> : null}
                    </View>
                    <View style={styles.returnCountsRow}>
                      <Text style={styles.countRet}>Ret: {returned}</Text>
                      {damaged > 0 && <Text style={styles.countDam}>Dam: {damaged}</Text>}
                      {missing > 0 && <Text style={styles.countMis}>Mis: {missing}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Staff Incident & Shift Reports Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>Staff Field Incident & Service Reports</Text>
          <Text style={styles.sectionSubtext}>
            Operational logs and remarks submitted by catering personnel on site.
          </Text>

          {staffReports.length === 0 ? (
            <Text style={styles.emptySubtext}>No on-site incident reports filed by crew.</Text>
          ) : (
            <View style={styles.reportsList}>
              {staffReports.map((r, i) => (
                <View key={i} style={styles.reportItemCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportRoleBadge}>{r.role || "Catering Crew"}</Text>
                    <Text style={styles.reportTime}>{r.created_at ? formatDate(r.created_at) : "Shift"}</Text>
                  </View>
                  <Text style={styles.reportContentText}>{r.note}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Manager Operational Notes Section */}
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

      {/* Verify Equipment Modal */}
      <Modal visible={showVerifyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Equipment Returns</Text>
              <TouchableOpacity onPress={() => setShowVerifyModal(false)}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Confirm that returned items, breakages, and missing tableware match the warehouse inspection.
            </Text>

            <Text style={styles.inputLabel}>Manager Verification Notes</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="e.g. All 12 chafing dishes returned clean. 2 glasses chipped."
              placeholderTextColor={colors.textDisabled}
              multiline
              value={verifyNotes}
              onChangeText={setVerifyNotes}
            />

            <AppButton
              title="Confirm & Save Verification"
              loading={submittingVerification}
              onPress={handleConfirmEquipmentReturns}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
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
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontStyle: "italic",
    paddingVertical: spacing.xs,
  },
  clientInfoBlock: {
    gap: spacing.xs,
  },
  clientDetailName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  contactActionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  quickContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  quickContactText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "600",
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  venueAddress: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    fontWeight: "600",
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 11,
    color: colors.foregroundMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  dishesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  dishBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  dishBadgeText: {
    fontSize: 11,
    color: colors.foreground,
    fontWeight: "500",
  },
  allergyAlertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef3c7",
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  allergyAlertTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#b45309",
  },
  allergyAlertDesc: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 2,
  },
  cardHeaderAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  unassignedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fffbeb",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  unassignedTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: "#b45309",
  },
  unassignedSub: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 2,
  },
  staffList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  staffInitials: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  staffName: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  staffRole: {
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  iconCircle: {
    padding: 6,
  },
  verificationStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  verificationStatusTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  verificationMeta: {
    fontSize: 10,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  returnsTable: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  returnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  returnItemName: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  returnItemNote: {
    fontSize: 10,
    fontStyle: "italic",
    color: colors.foregroundMuted,
  },
  returnCountsRow: {
    flexDirection: "row",
    gap: 6,
  },
  countRet: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
    backgroundColor: colors.successLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  countDam: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.error,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  countMis: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.warning,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  reportsList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reportItemCard: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  reportRoleBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  reportTime: {
    fontSize: 10,
    color: colors.foregroundMuted,
  },
  reportContentText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
  },
  noteInputRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  noteInput: {
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
  sendNoteBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendNoteBtnDisabled: {
    opacity: 0.5,
  },
  notesList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  noteItem: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  noteText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
  },
  noteDate: {
    fontSize: 10,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  emptyNotesText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: spacing.lg,
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
    marginBottom: spacing.sm,
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
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    textAlignVertical: "top",
  },
});

export default ManagerBookingDetailScreen;
