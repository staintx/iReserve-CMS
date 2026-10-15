import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  UserCheck,
  Sparkles,
  Info,
  AlertCircle,
  Utensils,
  Layers,
  Banknote,
  ExternalLink,
  CheckCircle2,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import staffApi from "../../api/staff";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { useAppDialog } from "../../context/DialogContext";
import {
  formatDate,
  formatCurrency,
  formatEventStartTime,
  getBookingVenueLocation,
  getEventTimingStatus,
  initialsOf,
} from "../../utils/format";

export const StaffEventDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { showAlertDialog } = useAppDialog();
  const { user } = useAuth();
  const bookingId = route?.params?.bookingId || route?.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      const data = await staffApi.getBooking(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Failed to load staff event detail:", error);
      showAlertDialog({
        title: "Event Unavailable",
        message: "Could not load assigned event details. Please check your connection and try again.",
        tone: "destructive",
        confirmText: "Dismiss",
      });
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

  const myRole = useMemo(() => {
    if (!booking) return "Crew";
    const assignments = booking.staff_assignments || [];
    const match = assignments.find(
      (item) => String(item.user_id?._id || item.user_id) === String(user?._id)
    );
    return match?.role || user?.position || "Catering Operations Crew";
  }, [booking, user]);

  const timing = useMemo(() => getEventTimingStatus(booking), [booking]);

  const teamByRole = useMemo(() => {
    if (!booking) return {};
    const map = {};
    (booking.staff_assignments || []).forEach((a) => {
      const role = a.role || "Staff";
      map[role] = map[role] || [];
      map[role].push(a);
    });
    return map;
  }, [booking]);

  const hasSupportingInfo = useMemo(() => {
    if (!booking) return false;
    const hasMenu = (booking.menu_items || []).length > 0;
    const hasServices =
      (booking.service_items || []).length > 0 || (booking.additional_charges || []).length > 0;
    const hasCrew = (booking.staff_assignments || []).length > 0;
    return hasMenu || hasServices || hasCrew;
  }, [booking]);

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() =>
      showAlertDialog({
        title: "Dialer Unavailable",
        message: "Unable to open phone dialer on this device.",
        tone: "destructive",
        confirmText: "Dismiss",
      })
    );
  };

  const handleEmail = (emailAddress) => {
    if (!emailAddress) return;
    Linking.openURL(`mailto:${emailAddress}`).catch(() =>
      showAlertDialog({
        title: "Email Unavailable",
        message: "Unable to open email client on this device.",
        tone: "destructive",
        confirmText: "Dismiss",
      })
    );
  };

  const handleOpenMaps = () => {
    if (!booking) return;
    const addressQuery = [
      booking.street,
      booking.barangay,
      booking.municipality,
      booking.province || "Batangas",
    ]
      .filter(Boolean)
      .join(", ") || getBookingVenueLocation(booking);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;
    Linking.openURL(url).catch(() =>
      showAlertDialog({
        title: "Navigation Unavailable",
        message: "Could not open map directions. Please check your map application.",
        tone: "destructive",
        confirmText: "Dismiss",
      })
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.foregroundDark} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Shift Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <SkeletonLoader height={140} style={{ borderRadius: radius.xl }} />
          <SkeletonLoader height={180} style={{ borderRadius: radius.xl }} />
          <SkeletonLoader height={200} style={{ borderRadius: radius.xl }} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.foregroundDark} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Shift Details</Text>
        </View>
        <Card style={styles.emptyCard} variant="flat">
          <AlertCircle size={32} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Event Not Found</Text>
          <Text style={styles.emptySubtitle}>
            The assigned event could not be found or you are not assigned to it.
          </Text>
          <AppButton
            title="Back to Bookings"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </View>
    );
  }

  const manager = booking.event_manager_id || null;
  const isCompleted = ["completed", "Completed"].includes(booking.status);
  const venueLocation = getBookingVenueLocation(booking);
  const clientName = booking.customer_id?.full_name || "Valued Client";
  const refCode = booking.reference || booking._id?.slice(-6).toUpperCase();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.foregroundDark} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: spacing.xs }}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {booking.event_type || "Catering Event"}
          </Text>
          <Text style={styles.topBarSubtitle}>Ref: #{refCode}</Text>
        </View>
        <StatusBadge status={booking.status || "Confirmed"} />
      </View>

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
        {/* SECTION 1: Event Name & Current Event Status */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kickerText}>Catering Assignment</Text>
              <Text style={styles.eventTitle}>{booking.event_type || "Catering Event"}</Text>
              <Text style={styles.clientRefText}>
                Client: <Text style={styles.boldText}>{clientName}</Text> · Ref:{" "}
                <Text style={styles.monoText}>{refCode}</Text>
              </Text>
            </View>

            <View style={styles.statusBadgesRow}>
              {isCompleted ? (
                <View style={styles.completedBadge}>
                  <CheckCircle2 size={12} color="#059669" />
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              ) : timing.isStarted && !timing.isFinished ? (
                <View style={styles.inProgressBadge}>
                  <Sparkles size={11} color="#059669" />
                  <Text style={styles.inProgressBadgeText}>In Progress</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Card>

        {/* SECTION 2: Date, Time & Venue */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Date, Time & Venue</Text>
          <View style={styles.specGrid}>
            <View style={styles.specBox}>
              <View style={styles.specBoxHeader}>
                <CalendarIcon size={14} color="#4C81E0" />
                <Text style={styles.specBoxTitle}>Date & Schedule</Text>
              </View>
              <Text style={styles.specBoxValue}>{formatDate(booking.event_date)}</Text>
              <View style={styles.specSubRow}>
                <Clock size={12} color={colors.textSubtle} />
                <Text style={styles.specSubText}>
                  {formatEventStartTime(booking.start_time)}
                </Text>
              </View>
              {booking.guest_count > 0 && (
                <Text style={styles.specGuestText}>
                  {booking.guest_count} guests ·{" "}
                  {booking.package_id?.name || booking.package_name_snapshot || "Standard Catering"}
                </Text>
              )}
            </View>

            <View style={styles.specBox}>
              <View style={styles.specBoxHeader}>
                <MapPin size={14} color="#4C81E0" />
                <Text style={styles.specBoxTitle}>Venue Location</Text>
                <TouchableOpacity onPress={handleOpenMaps} style={{ marginLeft: "auto" }}>
                  <Text style={styles.openMapsText}>Maps</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.specBoxValue} numberOfLines={2}>
                {venueLocation}
              </Text>
              {booking.venue_type && (
                <Text style={styles.specSubText}>Venue Type: {booking.venue_type}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* SECTION 3: Your Assigned Role */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Your Assigned Role</Text>
          <View style={styles.roleContainer}>
            <View style={styles.roleIconWrap}>
              <UserCheck size={18} color="#4C81E0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.myRoleTitle}>{myRole}</Text>
              <Text style={styles.myRoleSub}>Catering Operations Crew</Text>
            </View>
            <View style={styles.shiftStatusTag}>
              <Text style={styles.shiftStatusTagText}>
                {isCompleted ? "Completed Shift" : "Active Assignment"}
              </Text>
            </View>
          </View>
        </Card>

        {/* SECTION 4: Event Lead / Manager */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Event Lead / Manager</Text>
          {manager ? (
            <View style={styles.managerCard}>
              <View style={styles.managerAvatar}>
                <Text style={styles.managerAvatarText}>
                  {initialsOf(manager.full_name || manager.email, "MG")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.managerName}>{manager.full_name || "Manager Lead"}</Text>
                <Text style={styles.managerRole}>Lead Event Coordinator</Text>
              </View>

              <View style={styles.managerActionBtns}>
                {manager.phone && (
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => handleCall(manager.phone)}
                    activeOpacity={0.8}
                  >
                    <Phone size={13} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Call</Text>
                  </TouchableOpacity>
                )}
                {manager.email && (
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => handleEmail(manager.email)}
                    activeOpacity={0.8}
                  >
                    <Mail size={13} color="#4C81E0" />
                    <Text style={styles.actionBtnSecondaryText}>Email</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.unassignedBox}>
              <Text style={styles.unassignedText}>Lead coordinator not designated yet.</Text>
            </View>
          )}
        </Card>

        {/* SECTION 5: Important Event Instructions and Briefing */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleWithIcon}>
            <Info size={15} color="#4C81E0" />
            <Text style={styles.sectionHeading}>Event Instructions & Briefing</Text>
          </View>

          <View style={styles.briefingBox}>
            <Text style={styles.briefingTitle}>Dietary & Special Requests</Text>
            <Text style={styles.briefingBody}>
              {booking.dietary_restrictions ? `Dietary: ${booking.dietary_restrictions}. ` : ""}
              {booking.allergies ? `Allergies: ${booking.allergies}. ` : ""}
              {booking.special_requests ? `Special: ${booking.special_requests}. ` : ""}
              {booking.notes ||
                (!booking.dietary_restrictions && !booking.allergies && !booking.special_requests
                  ? "Standard catering protocol applies. No special dietary restrictions noted."
                  : "")}
            </Text>
          </View>

          {Number(booking.remaining_balance || 0) > 0 &&
            booking.balance_payment_preference === "in_person" && (
              <View style={styles.cashNoticeBox}>
                <Banknote size={15} color="#D97706" />
                <Text style={styles.cashNoticeText}>
                  Cash Collection: Client elected to settle remaining balance of{" "}
                  <Text style={styles.boldText}>{formatCurrency(booking.remaining_balance)}</Text> in
                  cash on-site to the event lead.
                </Text>
              </View>
            )}
        </Card>

        {/* SECTION 6: Supporting Information (Menu, Services, Crew Roster) */}
        {hasSupportingInfo && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Supporting Information</Text>

            {/* Menu Items */}
            {Array.isArray(booking.menu_items) && booking.menu_items.length > 0 && (
              <View style={styles.subSectionBlock}>
                <View style={styles.subHeadingRow}>
                  <Utensils size={14} color="#4C81E0" />
                  <Text style={styles.subHeadingText}>
                    Catering Menu ({booking.menu_items.length} Dishes)
                  </Text>
                </View>
                <View style={styles.dishesList}>
                  {booking.menu_items.map((dish, idx) => (
                    <View key={idx} style={styles.dishCard}>
                      <View style={styles.dishHeader}>
                        <Text style={styles.dishName}>
                          {dish.name || dish.dish_id?.name || "Catering Dish"}
                        </Text>
                        <Text style={styles.dishCategory}>
                          {dish.category || dish.dish_id?.category || "Main"}
                        </Text>
                      </View>
                      {dish.special_instructions && (
                        <View style={styles.dishInstructionBox}>
                          <Text style={styles.dishInstructionText}>
                            {dish.special_instructions}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Add-on Services */}
            {((Array.isArray(booking.service_items) && booking.service_items.length > 0) ||
              (Array.isArray(booking.additional_charges) && booking.additional_charges.length > 0)) && (
              <View style={styles.subSectionBlock}>
                <View style={styles.subHeadingRow}>
                  <Layers size={14} color="#4C81E0" />
                  <Text style={styles.subHeadingText}>Add-on Services & Setup Requirements</Text>
                </View>
                <View style={styles.servicesList}>
                  {(booking.service_items || []).map((srv, idx) => (
                    <View key={`srv-${idx}`} style={styles.serviceItem}>
                      <Text style={styles.serviceName}>{srv.name}</Text>
                      {srv.quantity > 1 && (
                        <Text style={styles.serviceQty}>Qty: {srv.quantity}</Text>
                      )}
                    </View>
                  ))}
                  {(booking.additional_charges || []).map((chg, idx) => (
                    <View key={`chg-${idx}`} style={styles.serviceItem}>
                      <Text style={styles.serviceName}>{chg.label}</Text>
                      {chg.reason && <Text style={styles.serviceNote}>{chg.reason}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Assigned Catering Crew */}
            {Array.isArray(booking.staff_assignments) && booking.staff_assignments.length > 0 && (
              <View style={styles.subSectionBlock}>
                <View style={styles.subHeadingRow}>
                  <Users size={14} color="#4C81E0" />
                  <Text style={styles.subHeadingText}>
                    Assigned Crew on Duty ({booking.staff_assignments.length})
                  </Text>
                </View>
                <View style={styles.crewList}>
                  {Object.entries(teamByRole).map(([roleName, members]) => (
                    <View key={roleName} style={styles.crewRoleGroup}>
                      <Text style={styles.crewRoleTitle}>
                        {roleName} ({members.length})
                      </Text>
                      {members.map((member, idx) => (
                        <View key={idx} style={styles.crewMemberRow}>
                          <Text style={styles.crewMemberName}>
                            {member.name || member.user_id?.full_name || "Crew Member"}
                          </Text>
                          {member.phone && (
                            <TouchableOpacity
                              onPress={() => handleCall(member.phone)}
                              style={styles.crewPhoneLink}
                              activeOpacity={0.7}
                            >
                              <Phone size={11} color="#4C81E0" />
                              <Text style={styles.crewPhoneText}>{member.phone}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.powder,
  },
  topBarTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  topBarSubtitle: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  loadingContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    margin: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
    textAlign: "center",
  },
  sectionCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  kickerText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: 2,
  },
  clientRefText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 3,
  },
  boldText: {
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  monoText: {
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  statusBadgesRow: {
    flexDirection: "row",
    gap: 4,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  completedBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#059669",
  },
  inProgressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  inProgressBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#059669",
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  specGrid: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  specBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.powder,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  specBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specBoxTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  openMapsText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  specBoxValue: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    lineHeight: 16,
  },
  specSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specSubText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  specGuestText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  roleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  myRoleTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  myRoleSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  shiftStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftStatusTagText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  managerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  managerAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  managerAvatarText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  managerName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  managerRole: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  managerActionBtns: {
    flexDirection: "row",
    gap: 4,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#4C81E0",
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#FFFFFF",
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    color: "#4C81E0",
  },
  unassignedBox: {
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.md,
  },
  unassignedText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    fontStyle: "italic",
  },
  briefingBox: {
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  briefingTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  briefingBody: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  cashNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  cashNoticeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: "#92400E",
    flex: 1,
    lineHeight: 16,
  },
  subSectionBlock: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  subHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subHeadingText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  dishesList: {
    gap: 4,
  },
  dishCard: {
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  dishHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dishName: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    flex: 1,
  },
  dishCategory: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
  },
  dishInstructionBox: {
    backgroundColor: "#FEF3C7",
    padding: 4,
    borderRadius: radius.xs,
    marginTop: 2,
  },
  dishInstructionText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.medium,
    color: "#92400E",
  },
  servicesList: {
    gap: 4,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceName: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  serviceQty: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  serviceNote: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  crewList: {
    gap: 6,
  },
  crewRoleGroup: {
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  crewRoleTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
  },
  crewMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  crewMemberName: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  crewPhoneLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  crewPhoneText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    color: "#4C81E0",
  },
});

export default StaffEventDetailScreen;
