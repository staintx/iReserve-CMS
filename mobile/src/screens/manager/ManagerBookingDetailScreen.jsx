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
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Phone,
  Mail,
  CheckCircle2,
  PackageCheck,
  Check,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  UserCheck,
  CreditCard,
  Receipt,
  Utensils,
  Layers,
  Banknote,
  ExternalLink,
  Lock,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  MessageSquare,
  XCircle,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatEventStartTime,
  getBookingVenueLocation,
  getEventTimingStatus,
  initialsOf,
  parseInclusion,
  buildDynamicChecklist,
} from "../../utils/format";

export const ManagerBookingDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const bookingId = route?.params?.bookingId || route?.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Specifications Expand Toggle
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);

  // Staff Attendance Section Expand Toggle
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(true);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);

  // Financial History See More Toggle
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);

  // Equipment Checklist Section Expand Toggle
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(true);
  const [checklist, setChecklist] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [savingAdditionalNotes, setSavingAdditionalNotes] = useState(false);

  // Inline Issue Notes State per Item
  const [openInlineNotes, setOpenInlineNotes] = useState({});
  const [inlineDrafts, setInlineDrafts] = useState({});
  const [savingItemKey, setSavingItemKey] = useState(null);

  // Inspection Done State
  const [submittingDone, setSubmittingDone] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      const data = await managerApi.getBooking(bookingId);
      setBooking(data);
      setChecklist(buildDynamicChecklist(data));
      setAdditionalNotes(data?.equipment_notes || "");
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

  const timing = useMemo(() => {
    return booking ? getEventTimingStatus(booking) : { isUpcoming: true, isStarted: false, isFinished: false };
  }, [booking]);

  const isCompleted = useMemo(() => {
    return Boolean(booking && ["completed", "Completed"].includes(booking.status));
  }, [booking]);

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() =>
      Alert.alert("Error", "Unable to open phone dialer.")
    );
  };

  const handleEmail = (emailAddress) => {
    if (!emailAddress) return;
    Linking.openURL(`mailto:${emailAddress}`).catch(() =>
      Alert.alert("Error", "Unable to open mail client.")
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
      Alert.alert("Error", "Could not open map directions.")
    );
  };

  // Staff Attendance Handlers
  const staffAssignments = booking?.staff_assignments || [];
  const markedStaffCount = staffAssignments.filter((s) => s.attendance_status === "present").length;
  const totalStaffCount = staffAssignments.length;

  const handleToggleAttendance = async (staffMember) => {
    if (isCompleted) {
      Alert.alert("Read-Only", "Completed bookings are read-only.");
      return;
    }

    const currentStatus = staffMember.attendance_status;
    const isPresent = currentStatus === "present";
    const nextStatus = isPresent ? "not_recorded" : "present";
    const targetUserId = staffMember.user_id?._id || staffMember.user_id;

    setUpdatingStaffId(targetUserId || staffMember._id);

    // Optimistic UI update
    setBooking((prev) => {
      if (!prev) return prev;
      const updatedAssignments = (prev.staff_assignments || []).map((sa) => {
        const match =
          (targetUserId && String(sa.user_id?._id || sa.user_id) === String(targetUserId)) ||
          String(sa._id) === String(staffMember._id);
        if (match) {
          return {
            ...sa,
            attendance_status: nextStatus,
            marked_at: isPresent ? null : new Date(),
          };
        }
        return sa;
      });
      return { ...prev, staff_assignments: updatedAssignments };
    });

    try {
      const payload = [
        {
          user_id: targetUserId,
          _id: staffMember._id,
          attendance_status: nextStatus,
        },
      ];
      await managerApi.updateStaffAttendance(booking._id, { attendance: payload });
    } catch (err) {
      Alert.alert("Error", "Failed to update staff attendance. Please try again.");
      loadBooking();
    } finally {
      setUpdatingStaffId(null);
    }
  };

  // Equipment Checklist Handlers
  const isChecklistDone = Boolean(booking?.equipment_checklist_done);
  const totalChecklistCount = checklist.length;
  const inspectedItemsCount = checklist.filter(
    (item) => item.is_inspected && item.status !== "not_inspected"
  ).length;

  const handleMarkItemStatus = async (itemKey, status) => {
    if (isCompleted || isChecklistDone) {
      Alert.alert("Locked", "Equipment inspection has been finalized or booking is completed.");
      return;
    }

    const nextInspected = status !== "not_inspected";
    const draftNote = inlineDrafts[itemKey] || "";

    // If marking incomplete and notes open, don't finalize until saved
    if (status === "incomplete") {
      setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: true }));
    }

    const updatedChecklist = checklist.map((item) => {
      if (item.item_key === itemKey) {
        return {
          ...item,
          status,
          is_inspected: nextInspected,
          notes: draftNote || item.notes,
        };
      }
      return item;
    });

    setChecklist(updatedChecklist);

    try {
      setSavingItemKey(itemKey);
      await managerApi.updateEquipmentChecklist(booking._id, updatedChecklist);
    } catch (err) {
      Alert.alert("Error", "Failed to save equipment inspection status.");
      loadBooking();
    } finally {
      setSavingItemKey(null);
    }
  };

  const handleSaveInlineNotes = async (itemKey) => {
    const draft = inlineDrafts[itemKey] || "";
    const updatedChecklist = checklist.map((item) => {
      if (item.item_key === itemKey) {
        return {
          ...item,
          notes: draft.trim(),
        };
      }
      return item;
    });

    setChecklist(updatedChecklist);
    setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: false }));

    try {
      setSavingItemKey(itemKey);
      await managerApi.updateEquipmentChecklist(booking._id, updatedChecklist);
    } catch (err) {
      Alert.alert("Error", "Failed to save equipment notes.");
    } finally {
      setSavingItemKey(null);
    }
  };

  const handleSaveAdditionalNotes = async () => {
    try {
      setSavingAdditionalNotes(true);
      await managerApi.updateEquipmentNotes(booking._id, {
        equipment_notes: additionalNotes.trim(),
      });
      Alert.alert("Saved", "Additional equipment inspection notes saved.");
    } catch (err) {
      Alert.alert("Error", "Failed to save additional equipment notes.");
    } finally {
      setSavingAdditionalNotes(false);
    }
  };

  const handleMarkInspectionDone = () => {
    if (inspectedItemsCount < totalChecklistCount) {
      Alert.alert(
        "Incomplete Inspection",
        `Only ${inspectedItemsCount} of ${totalChecklistCount} items have been inspected. Please inspect all items before marking as complete.`
      );
      return;
    }

    Alert.alert(
      "Finalize Equipment Inspection",
      "Are you sure all equipment has been verified on-site? This will officially record your inspection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Complete",
          style: "default",
          onPress: async () => {
            try {
              setSubmittingDone(true);
              await managerApi.markEquipmentChecklistDone(booking._id);
              setBooking((prev) => ({ ...prev, equipment_checklist_done: true }));
              Alert.alert("Success", "Equipment inspection marked as complete.");
            } catch (err) {
              Alert.alert("Error", "Failed to finalize equipment inspection.");
            } finally {
              setSubmittingDone(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.foregroundDark} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Event Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <SkeletonLoader height={160} style={{ borderRadius: radius.xl }} />
          <SkeletonLoader height={200} style={{ borderRadius: radius.xl }} />
          <SkeletonLoader height={220} style={{ borderRadius: radius.xl }} />
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
          <Text style={styles.topBarTitle}>Event Details</Text>
        </View>
        <Card style={styles.emptyCard} variant="flat">
          <AlertCircle size={32} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Event Not Found</Text>
          <Text style={styles.emptySubtitle}>The assigned event could not be loaded.</Text>
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

  const clientName = booking.customer_id?.full_name || "Valued Client";
  const refCode = booking.reference || booking._id?.slice(-6).toUpperCase();
  const venueAddress = getBookingVenueLocation(booking);
  const isDepositPending =
    booking.payment_status === "deposit_pending" || booking.status === "Deposit Pending";

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
        {isDepositPending ? (
          <StatusBadge status="Deposit Pending" />
        ) : (
          <StatusBadge status={booking.status} />
        )}
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
        {/* TOP BANNER: Overview & Identity */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kickerText}>Assigned Catering Event</Text>
              <Text style={styles.overviewTitle}>{booking.event_type || "Catering Event"}</Text>
              <Text style={styles.overviewClient}>
                Client: <Text style={styles.boldText}>{clientName}</Text>
              </Text>
            </View>
            {timing.isStarted && !timing.isFinished && (
              <View style={styles.inProgressBadge}>
                <Sparkles size={11} color="#059669" />
                <Text style={styles.inProgressText}>In Progress</Text>
              </View>
            )}
          </View>
        </Card>

        {/* ========================================================= */}
        {/* SECTION 1: BOOKING SPECIFICATIONS (Quick + Expandable)   */}
        {/* ========================================================= */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.secIconBox, { backgroundColor: "#EFF6FF" }]}>
                <FileText size={16} color="#4C81E0" />
              </View>
              <Text style={styles.sectionHeading}>Booking Specifications</Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsSpecsExpanded(!isSpecsExpanded)}
              style={styles.expandToggleBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.expandToggleText}>
                {isSpecsExpanded ? "Hide Specs" : "View All"}
              </Text>
              {isSpecsExpanded ? (
                <ChevronUp size={15} color="#4C81E0" />
              ) : (
                <ChevronDown size={15} color="#4C81E0" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Summary Grid (Always Visible) */}
          <View style={styles.specQuickGrid}>
            {/* Category 1: Event & Schedule */}
            <View style={styles.specBox}>
              <Text style={styles.specBoxTitle}>Event & Schedule</Text>
              <View style={styles.specItemRow}>
                <CalendarIcon size={13} color="#4C81E0" />
                <Text style={styles.specItemText}>{formatDate(booking.event_date)}</Text>
              </View>
              <View style={styles.specItemRow}>
                <Clock size={13} color={colors.textSubtle} />
                <Text style={styles.specItemText}>
                  {formatEventStartTime(booking.start_time)}
                </Text>
              </View>
              {booking.guest_count > 0 && (
                <View style={styles.specItemRow}>
                  <Users size={13} color={colors.textSubtle} />
                  <Text style={styles.specItemText}>{booking.guest_count} Expected Guests</Text>
                </View>
              )}
            </View>

            {/* Category 2: Venue Location */}
            <View style={styles.specBox}>
              <View style={styles.specBoxTitleRow}>
                <Text style={styles.specBoxTitle}>Venue Location</Text>
                <TouchableOpacity onPress={handleOpenMaps} activeOpacity={0.7}>
                  <Text style={styles.openMapsLink}>Open Maps</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.specItemRow}>
                <MapPin size={13} color="#4C81E0" />
                <Text style={styles.specItemText} numberOfLines={2}>
                  {venueAddress}
                </Text>
              </View>
              {booking.venue_type && (
                <Text style={styles.specItemSub}>Venue Type: {booking.venue_type}</Text>
              )}
            </View>

            {/* Category 3: Customer Details & Contact */}
            <View style={[styles.specBox, { width: "100%" }]}>
              <Text style={styles.specBoxTitle}>Customer Contact</Text>
              <View style={styles.contactRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{clientName}</Text>
                  {booking.customer_id?.email && (
                    <Text style={styles.contactEmail}>{booking.customer_id.email}</Text>
                  )}
                </View>

                <View style={styles.contactBtnsRow}>
                  {booking.customer_id?.phone && (
                    <TouchableOpacity
                      style={styles.contactActionBtn}
                      onPress={() => handleCall(booking.customer_id.phone)}
                      activeOpacity={0.8}
                    >
                      <Phone size={13} color="#4C81E0" />
                      <Text style={styles.contactActionBtnText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  {booking.customer_id?.email && (
                    <TouchableOpacity
                      style={styles.contactActionBtn}
                      onPress={() => handleEmail(booking.customer_id.email)}
                      activeOpacity={0.8}
                    >
                      <Mail size={13} color="#4C81E0" />
                      <Text style={styles.contactActionBtnText}>Email</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* EXPANDED VIEW: Complete Specifications */}
          {isSpecsExpanded && (
            <View style={styles.expandedSpecsContainer}>
              {/* Package Inclusions Breakdown */}
              {Array.isArray(booking.package_inclusions) && booking.package_inclusions.length > 0 && (
                <View style={styles.expandedSectionBlock}>
                  <Text style={styles.expandedSectionHeading}>Package Inclusions</Text>
                  <View style={styles.inclusionsList}>
                    {booking.package_inclusions.map((inc, idx) => {
                      const parsed = parseInclusion(inc);
                      return (
                        <View key={idx} style={styles.inclusionItem}>
                          <CheckCircle2 size={13} color="#059669" />
                          <Text style={styles.inclusionText}>
                            {parsed ? `${parsed.name}${parsed.qty ? ` (${parsed.qty})` : ""}` : String(inc)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Food Menu Dishes */}
              {Array.isArray(booking.menu_items) && booking.menu_items.length > 0 && (
                <View style={styles.expandedSectionBlock}>
                  <View style={styles.subHeadingRow}>
                    <Utensils size={14} color="#4C81E0" />
                    <Text style={styles.expandedSectionHeading}>
                      Food Menu ({booking.menu_items.length} Dishes)
                    </Text>
                  </View>
                  <View style={styles.menuItemsGrid}>
                    {booking.menu_items.map((dish, idx) => (
                      <View key={idx} style={styles.dishCard}>
                        <View style={styles.dishTopRow}>
                          <Text style={styles.dishName}>
                            {dish.name || dish.dish_id?.name || "Catering Dish"}
                          </Text>
                          <Text style={styles.dishCategory}>
                            {dish.category || dish.dish_id?.category || "Main"}
                          </Text>
                        </View>
                        {dish.special_instructions && (
                          <View style={styles.dishNoteBox}>
                            <Text style={styles.dishNoteText}>{dish.special_instructions}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Add-ons & Extra Services */}
              {((Array.isArray(booking.service_items) && booking.service_items.length > 0) ||
                (Array.isArray(booking.additional_charges) && booking.additional_charges.length > 0)) && (
                <View style={styles.expandedSectionBlock}>
                  <View style={styles.subHeadingRow}>
                    <Layers size={14} color="#4C81E0" />
                    <Text style={styles.expandedSectionHeading}>Add-ons & Extra Services</Text>
                  </View>
                  <View style={styles.servicesGrid}>
                    {(booking.service_items || []).map((srv, idx) => (
                      <View key={`srv-${idx}`} style={styles.serviceCard}>
                        <Text style={styles.serviceName}>{srv.name}</Text>
                        {srv.quantity > 1 && (
                          <Text style={styles.serviceQty}>Qty: {srv.quantity}</Text>
                        )}
                      </View>
                    ))}
                    {(booking.additional_charges || []).map((chg, idx) => (
                      <View key={`chg-${idx}`} style={styles.serviceCard}>
                        <Text style={styles.serviceName}>{chg.label}</Text>
                        {chg.reason && <Text style={styles.serviceNote}>{chg.reason}</Text>}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Adjustments & Logistics */}
              <View style={styles.expandedSectionBlock}>
                <Text style={styles.expandedSectionHeading}>Adjustments & Logistics</Text>
                <View style={styles.logisticsBox}>
                  {booking.dietary_restrictions ? (
                    <Text style={styles.logisticsItem}>
                      <Text style={styles.boldText}>Dietary:</Text> {booking.dietary_restrictions}
                    </Text>
                  ) : null}
                  {booking.allergies ? (
                    <Text style={styles.logisticsItem}>
                      <Text style={styles.boldText}>Allergies:</Text> {booking.allergies}
                    </Text>
                  ) : null}
                  {booking.special_requests ? (
                    <Text style={styles.logisticsItem}>
                      <Text style={styles.boldText}>Special Requests:</Text> {booking.special_requests}
                    </Text>
                  ) : null}
                  {!booking.dietary_restrictions && !booking.allergies && !booking.special_requests && (
                    <Text style={styles.logisticsItem}>
                      Standard catering protocol applies. No special restrictions noted.
                    </Text>
                  )}
                </View>

                {Number(booking.remaining_balance || 0) > 0 &&
                  booking.balance_payment_preference === "in_person" && (
                    <View style={styles.cashNoticeBox}>
                      <Banknote size={15} color="#D97706" />
                      <Text style={styles.cashNoticeText}>
                        Cash Collection: Client elected to settle remaining balance of{" "}
                        <Text style={styles.boldText}>
                          {formatCurrency(booking.remaining_balance)}
                        </Text>{" "}
                        in cash on-site to event lead.
                      </Text>
                    </View>
                  )}
              </View>
            </View>
          )}
        </Card>

        {/* ========================================================= */}
        {/* SECTION 2: STAFF ATTENDANCE (Toggle Present / Absent)      */}
        {/* ========================================================= */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.secIconBox, { backgroundColor: "#FEF3C7" }]}>
                <UserCheck size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.sectionHeading}>Staff Attendance</Text>
                <Text style={styles.sectionSubHeading}>
                  {markedStaffCount} of {totalStaffCount} crew marked present
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsAttendanceOpen(!isAttendanceOpen)}
              style={styles.expandToggleBtn}
              activeOpacity={0.7}
            >
              {isAttendanceOpen ? (
                <ChevronUp size={16} color="#4C81E0" />
              ) : (
                <ChevronDown size={16} color="#4C81E0" />
              )}
            </TouchableOpacity>
          </View>

          {isAttendanceOpen && (
            <View style={styles.attendanceBody}>
              {staffAssignments.length === 0 ? (
                <View style={styles.emptyAttendanceBox}>
                  <Text style={styles.emptyAttendanceText}>
                    No crew members assigned to this event yet.
                  </Text>
                </View>
              ) : (
                staffAssignments.map((member, idx) => {
                  const staffName =
                    member.name ||
                    member.user_id?.full_name ||
                    member.user_id?.name ||
                    `Staff Crew #${idx + 1}`;
                  const isPresent = member.attendance_status === "present";
                  const isUpdating = updatingStaffId === (member.user_id?._id || member.user_id || member._id);

                  return (
                    <View key={member._id || idx} style={styles.staffMemberRow}>
                      {/* Attendance Toggle Checkbox */}
                      <TouchableOpacity
                        style={[
                          styles.attendanceCheckbox,
                          isPresent && styles.attendanceCheckboxActive,
                        ]}
                        onPress={() => handleToggleAttendance(member)}
                        disabled={isUpdating || isCompleted}
                        activeOpacity={0.7}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={isPresent ? "#FFFFFF" : "#4C81E0"} />
                        ) : isPresent ? (
                          <Check size={14} color="#FFFFFF" />
                        ) : null}
                      </TouchableOpacity>

                      {/* Staff Avatar */}
                      <View style={styles.staffAvatar}>
                        <Text style={styles.staffAvatarText}>{initialsOf(staffName, "ST")}</Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, marginRight: spacing.xs }}>
                        <Text style={styles.staffMemberName} numberOfLines={1}>
                          {staffName}
                        </Text>
                        <Text style={styles.staffMemberRole}>
                          Role: {member.role || member.user_id?.position || "Catering Crew"}
                        </Text>
                      </View>

                      {/* Phone call button */}
                      {member.phone && (
                        <TouchableOpacity
                          style={styles.staffPhoneBtn}
                          onPress={() => handleCall(member.phone)}
                          activeOpacity={0.8}
                        >
                          <Phone size={13} color="#4C81E0" />
                        </TouchableOpacity>
                      )}

                      {/* Status indicator */}
                      <View
                        style={[
                          styles.staffStatusTag,
                          isPresent ? styles.staffStatusTagPresent : styles.staffStatusTagNotRecorded,
                        ]}
                      >
                        <Text
                          style={[
                            styles.staffStatusTagText,
                            isPresent ? styles.staffStatusTagTextPresent : styles.staffStatusTagTextNotRecorded,
                          ]}
                        >
                          {isPresent ? "Present" : "Not Recorded"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </Card>

        {/* ========================================================= */}
        {/* SECTION 3: FINANCIAL & HISTORY (Read-Only for Manager)    */}
        {/* ========================================================= */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.secIconBox, { backgroundColor: "#F0FDF4" }]}>
                <CreditCard size={16} color="#059669" />
              </View>
              <View>
                <Text style={styles.sectionHeading}>Financial Overview</Text>
                <Text style={styles.sectionSubHeading}>Payment transactions (Read-Only)</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsPaymentHistoryOpen(!isPaymentHistoryOpen)}
              style={styles.expandToggleBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.expandToggleText}>
                {isPaymentHistoryOpen ? "Hide History" : "See More"}
              </Text>
              {isPaymentHistoryOpen ? (
                <ChevronUp size={15} color="#4C81E0" />
              ) : (
                <ChevronDown size={15} color="#4C81E0" />
              )}
            </TouchableOpacity>
          </View>

          {/* Summary Banner */}
          <View style={styles.financialBanner}>
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Total Amount</Text>
              <Text style={styles.financialAmount}>
                {formatCurrency(booking.total_amount)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Balance Due</Text>
              <Text style={styles.financialAmountDue}>
                {formatCurrency(booking.remaining_balance || 0)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Payment Status</Text>
              <Text style={styles.financialStatusText}>
                {booking.payment_status?.replace(/_/g, " ").toUpperCase() || "PENDING"}
              </Text>
            </View>
          </View>

          {/* Expandable Payment Transaction History */}
          {isPaymentHistoryOpen && (
            <View style={styles.paymentHistoryContainer}>
              <Text style={styles.paymentHistoryTitle}>Payment Transaction History</Text>
              {!Array.isArray(booking.payments) || booking.payments.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  No payment transaction records logged for this booking.
                </Text>
              ) : (
                booking.payments.map((p, idx) => (
                  <View key={p._id || idx} style={styles.paymentRow}>
                    <Receipt size={14} color={colors.textSubtle} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentMethod}>
                        {p.payment_method?.toUpperCase() || "ONLINE / CASH"}
                      </Text>
                      <Text style={styles.paymentDate}>{formatDateTime(p.created_at || p.payment_date)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                      <Text style={styles.paymentStatusBadge}>{p.status || "Completed"}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </Card>

        {/* ========================================================= */}
        {/* SECTION 4: EQUIPMENT CHECK (Expandable, Item-by-Item)      */}
        {/* ========================================================= */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.secIconBox, { backgroundColor: "#EFF6FF" }]}>
                <PackageCheck size={16} color="#4C81E0" />
              </View>
              <View>
                <Text style={styles.sectionHeading}>Equipment & Setup Check</Text>
                <Text style={styles.sectionSubHeading}>
                  {inspectedItemsCount} of {totalChecklistCount} items inspected
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsEquipmentOpen(!isEquipmentOpen)}
              style={styles.expandToggleBtn}
              activeOpacity={0.7}
            >
              {isEquipmentOpen ? (
                <ChevronUp size={16} color="#4C81E0" />
              ) : (
                <ChevronDown size={16} color="#4C81E0" />
              )}
            </TouchableOpacity>
          </View>

          {isEquipmentOpen && (
            <View style={styles.equipmentBody}>
              {/* Checklist Done Banner */}
              {isChecklistDone && (
                <View style={styles.inspectionDoneBanner}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.inspectionDoneBannerText}>
                    Equipment inspection verified on-site by Event Lead coordinator.
                  </Text>
                </View>
              )}

              {checklist.length === 0 ? (
                <View style={styles.emptyChecklistBox}>
                  <Text style={styles.emptyChecklistText}>
                    No physical package equipment or setup inclusions registered.
                  </Text>
                </View>
              ) : (
                checklist.map((item) => {
                  const isComplete = item.status === "complete";
                  const isIncomplete = item.status === "incomplete";
                  const isNotesOpen = openInlineNotes[item.item_key];
                  const draftNote = inlineDrafts[item.item_key] ?? item.notes ?? "";

                  return (
                    <View key={item.item_key} style={styles.checkItemCard}>
                      <View style={styles.checkItemTopRow}>
                        <View style={{ flex: 1, marginRight: spacing.xs }}>
                          <Text style={styles.checkItemCategory}>{item.category}</Text>
                          <Text style={styles.checkItemName}>{item.name}</Text>
                          {item.quantity != null && (
                            <Text style={styles.checkItemQuantity}>
                              Dispatched: {item.quantity} {item.unit || "pcs"}
                            </Text>
                          )}
                        </View>

                        {/* Status badge */}
                        <View
                          style={[
                            styles.itemStatusBadge,
                            isComplete
                              ? styles.itemStatusComplete
                              : isIncomplete
                              ? styles.itemStatusIncomplete
                              : styles.itemStatusNotInspected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.itemStatusBadgeText,
                              isComplete
                                ? styles.itemStatusTextComplete
                                : isIncomplete
                                ? styles.itemStatusTextIncomplete
                                : styles.itemStatusTextNotInspected,
                            ]}
                          >
                            {isComplete
                              ? "Complete"
                              : isIncomplete
                              ? "Issue / Incomplete"
                              : "Not Inspected"}
                          </Text>
                        </View>
                      </View>

                      {/* Display saved note snippet if any */}
                      {item.notes && !isNotesOpen && (
                        <View style={styles.itemSavedNoteBox}>
                          <Text style={styles.itemSavedNoteText}>Note: {item.notes}</Text>
                        </View>
                      )}

                      {/* Actions: Complete vs Incomplete & Add Note */}
                      {!isChecklistDone && !isCompleted && (
                        <View style={styles.checkItemActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.actionToggleBtn,
                              isComplete && styles.actionToggleBtnCompleteActive,
                            ]}
                            onPress={() => handleMarkItemStatus(item.item_key, "complete")}
                            activeOpacity={0.8}
                          >
                            <Check size={13} color={isComplete ? "#FFFFFF" : "#059669"} />
                            <Text
                              style={[
                                styles.actionToggleBtnText,
                                isComplete && styles.actionToggleBtnTextActive,
                              ]}
                            >
                              Complete
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.actionToggleBtn,
                              isIncomplete && styles.actionToggleBtnIncompleteActive,
                            ]}
                            onPress={() => handleMarkItemStatus(item.item_key, "incomplete")}
                            activeOpacity={0.8}
                          >
                            <AlertCircle size={13} color={isIncomplete ? "#FFFFFF" : "#DC2626"} />
                            <Text
                              style={[
                                styles.actionToggleBtnText,
                                isIncomplete && styles.actionToggleBtnTextActive,
                              ]}
                            >
                              Incomplete
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.notesToggleBtn}
                            onPress={() =>
                              setOpenInlineNotes((prev) => ({
                                ...prev,
                                [item.item_key]: !prev[item.item_key],
                              }))
                            }
                            activeOpacity={0.7}
                          >
                            <Text style={styles.notesToggleBtnText}>
                              {isNotesOpen ? "Close Note" : item.notes ? "Edit Note" : "Add Note"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Inline Note Editor */}
                      {isNotesOpen && !isChecklistDone && !isCompleted && (
                        <View style={styles.inlineNoteEditor}>
                          <TextInput
                            style={styles.inlineNoteInput}
                            placeholder="Specify issue (e.g. 2 damaged, missing on arrival)..."
                            placeholderTextColor={colors.textDisabled}
                            value={draftNote}
                            onChangeText={(val) =>
                              setInlineDrafts((prev) => ({ ...prev, [item.item_key]: val }))
                            }
                          />
                          <TouchableOpacity
                            style={styles.inlineNoteSaveBtn}
                            onPress={() => handleSaveInlineNotes(item.item_key)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.inlineNoteSaveBtnText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {/* Additional Notes Box */}
              <View style={styles.additionalNotesSection}>
                <Text style={styles.additionalNotesLabel}>Additional Equipment / Shift Notes</Text>
                <TextInput
                  style={styles.additionalNotesInput}
                  placeholder="Record general equipment conditions, delivery notes, or logistical updates..."
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={3}
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  editable={!isChecklistDone && !isCompleted}
                />
                {!isChecklistDone && !isCompleted && (
                  <TouchableOpacity
                    style={styles.saveAdditionalNotesBtn}
                    onPress={handleSaveAdditionalNotes}
                    disabled={savingAdditionalNotes}
                    activeOpacity={0.8}
                  >
                    {savingAdditionalNotes ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveAdditionalNotesBtnText}>Save Shift Notes</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Final Inspection Footer Button */}
              {!isChecklistDone && !isCompleted && (
                <View style={styles.inspectionFooter}>
                  <AppButton
                    title={submittingDone ? "Finalizing Inspection..." : "Mark Inspection Complete"}
                    variant="primary"
                    icon={CheckCircle2}
                    disabled={submittingDone || inspectedItemsCount < totalChecklistCount}
                    onPress={handleMarkInspectionDone}
                  />
                  {inspectedItemsCount < totalChecklistCount && (
                    <Text style={styles.inspectionHint}>
                      Inspect all {totalChecklistCount} items above before completing inspection.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </Card>
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
  },
  overviewCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewHeader: {
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
  overviewTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: 2,
  },
  overviewClient: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 3,
  },
  boldText: {
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  inProgressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: "#ECFDF5",
  },
  inProgressText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#059669",
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  secIconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  sectionSubHeading: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  expandToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.powder,
  },
  expandToggleText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  specQuickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  specBox: {
    width: "48.5%",
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.powder,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  specBoxTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  specBoxTitle: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
  },
  openMapsLink: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  specItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specItemText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
    flex: 1,
  },
  specItemSub: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  contactName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  contactEmail: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  contactBtnsRow: {
    flexDirection: "row",
    gap: 4,
  },
  contactActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  contactActionBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  expandedSpecsContainer: {
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  expandedSectionBlock: {
    gap: spacing.xs,
  },
  expandedSectionHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  subHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inclusionsList: {
    gap: 4,
  },
  inclusionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  inclusionText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    flex: 1,
  },
  menuItemsGrid: {
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
  dishTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dishName: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    flex: 1,
  },
  dishCategory: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
  },
  dishNoteBox: {
    backgroundColor: "#FEF3C7",
    padding: 4,
    borderRadius: radius.xs,
    marginTop: 2,
  },
  dishNoteText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.medium,
    color: "#92400E",
  },
  servicesGrid: {
    gap: 4,
  },
  serviceCard: {
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
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    flex: 1,
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
  logisticsBox: {
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  logisticsItem: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
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
    marginTop: 4,
  },
  cashNoticeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: "#92400E",
    flex: 1,
    lineHeight: 16,
  },
  attendanceBody: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  emptyAttendanceBox: {
    padding: spacing.md,
    alignItems: "center",
  },
  emptyAttendanceText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  staffMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  attendanceCheckbox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceCheckboxActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  staffAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  staffMemberName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  staffMemberRole: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  staffPhoneBtn: {
    padding: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  staffStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  staffStatusTagPresent: {
    backgroundColor: "#ECFDF5",
  },
  staffStatusTagNotRecorded: {
    backgroundColor: colors.borderLight,
  },
  staffStatusTagText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.semiBold,
  },
  staffStatusTagTextPresent: {
    color: "#059669",
  },
  staffStatusTagTextNotRecorded: {
    color: colors.foregroundMuted,
  },
  financialBanner: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "space-between",
  },
  financialCol: {
    flex: 1,
    alignItems: "center",
  },
  financialDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  financialLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
  },
  financialAmount: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: 2,
  },
  financialAmountDue: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: "#DC2626",
    marginTop: 2,
  },
  financialStatusText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#059669",
    marginTop: 2,
  },
  paymentHistoryContainer: {
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  paymentHistoryTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  emptyHistoryText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  paymentMethod: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  paymentDate: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  paymentAmount: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  paymentStatusBadge: {
    fontSize: 9.5,
    fontFamily: typography.fontFamilies.semiBold,
    color: "#059669",
  },
  equipmentBody: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  inspectionDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: spacing.sm,
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  inspectionDoneBannerText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#059669",
    flex: 1,
  },
  emptyChecklistBox: {
    padding: spacing.md,
    alignItems: "center",
  },
  emptyChecklistText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  checkItemCard: {
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  checkItemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  checkItemCategory: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
  },
  checkItemName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: 1,
  },
  checkItemQuantity: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  itemStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  itemStatusComplete: {
    backgroundColor: "#ECFDF5",
  },
  itemStatusIncomplete: {
    backgroundColor: "#FEF2F2",
  },
  itemStatusNotInspected: {
    backgroundColor: colors.border,
  },
  itemStatusBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.semiBold,
  },
  itemStatusTextComplete: {
    color: "#059669",
  },
  itemStatusTextIncomplete: {
    color: "#DC2626",
  },
  itemStatusTextNotInspected: {
    color: colors.foregroundMuted,
  },
  itemSavedNoteBox: {
    backgroundColor: "#FFFBEB",
    padding: 4,
    borderRadius: radius.xs,
  },
  itemSavedNoteText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.medium,
    color: "#92400E",
  },
  checkItemActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  actionToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionToggleBtnCompleteActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  actionToggleBtnIncompleteActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  actionToggleBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  actionToggleBtnTextActive: {
    color: "#FFFFFF",
  },
  notesToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: "auto",
  },
  notesToggleBtnText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  inlineNoteEditor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  inlineNoteInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
  },
  inlineNoteSaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#4C81E0",
  },
  inlineNoteSaveBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#FFFFFF",
  },
  additionalNotesSection: {
    gap: 4,
    marginTop: spacing.xs,
  },
  additionalNotesLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  additionalNotesInput: {
    backgroundColor: colors.powder,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    minHeight: 60,
    textAlignVertical: "top",
  },
  saveAdditionalNotesBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#4C81E0",
    marginTop: 2,
  },
  saveAdditionalNotesBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#FFFFFF",
  },
  inspectionFooter: {
    marginTop: spacing.xs,
    gap: 4,
  },
  inspectionHint: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
  },
});

export default ManagerBookingDetailScreen;
