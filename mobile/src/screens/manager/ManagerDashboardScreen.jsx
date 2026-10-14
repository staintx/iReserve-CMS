import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  CheckCircle2,
  MapPin,
  Bell,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  Info,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import managerApi from "../../api/manager";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import AppButton from "../../components/common/AppButton";
import NotificationBadge from "../../components/common/NotificationBadge";
import CoachMarkSequence from "../../components/common/CoachMarkSequence";
import AvailabilityModal from "../../components/common/AvailabilityModal";
import {
  formatDate,
  formatTime,
  formatEventStartTime,
  getBookingVenueLocation,
  getEventTimingStatus,
} from "../../utils/format";

const toDateKey = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ManagerDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);

  // Calendar & Availability states
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [availabilityData, setAvailabilityData] = useState({ month: "", unavailable: [], assignments: [] });
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const statsRef = useRef(null);
  const calendarRef = useRef(null);
  const eventsRef = useRef(null);

  const monthKey = useMemo(() => {
    return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarMonth]);

  const coachMarkSteps = useMemo(
    () => [
      {
        id: "manager_stats",
        title: "Operations Summary",
        description:
          "Monitor active assigned events under your lead and view successfully coordinated celebrations.",
        targetRef: statsRef,
        placement: "bottom",
      },
      {
        id: "manager_calendar",
        title: "Assigned Event Calendar",
        description:
          "Review your event dates on the calendar and tap 'Set My Availability' to manage your monthly schedule.",
        targetRef: calendarRef,
        placement: "bottom",
      },
      {
        id: "manager_events",
        title: "Scheduled Catering Events",
        description:
          "Scan upcoming event cards, check call times, venue addresses, and tap 'View Details' to conduct on-site operations.",
        targetRef: eventsRef,
        placement: "top",
      },
    ],
    []
  );

  const loadData = useCallback(async () => {
    try {
      const [upcomingRes, completedRes, availRes] = await Promise.all([
        managerApi.getBookings("upcoming").catch(() => []),
        managerApi.getBookings("completed").catch(() => []),
        managerApi.getAvailability(monthKey).catch(() => ({ month: monthKey, unavailable: [], assignments: [] })),
      ]);

      setUpcomingBookings(Array.isArray(upcomingRes) ? upcomingRes : []);
      setCompletedBookings(Array.isArray(completedRes) ? completedRes : []);
      setAvailabilityData(availRes || { month: monthKey, unavailable: [], assignments: [] });
    } catch (error) {
      console.error("Failed to load manager operations data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveAvailability = async () => {
    try {
      const availRes = await managerApi.getAvailability(monthKey);
      setAvailabilityData(availRes || { month: monthKey, unavailable: [], assignments: [] });
    } catch (err) {
      console.warn("Failed to refresh availability after modal save:", err);
    }
  };

  // Map active assignments by date
  const eventsByDate = useMemo(() => {
    const map = new Map();
    upcomingBookings.forEach((b) => {
      if (b.event_date) {
        const key = toDateKey(b.event_date);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(b);
      }
    });
    return map;
  }, [upcomingBookings]);

  // Calendar month grid
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calendarMonth]);

  const stepMonth = (delta) => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1));
  };

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDateEvents = eventsByDate.get(selectedDateKey) || [];
  const isSelectedDateUnavailable = (availabilityData.unavailable || []).includes(selectedDateKey);

  const openEvent = (id) => {
    navigation.navigate("ManagerBookingDetail", { bookingId: id });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.portalTitle}>Manager Portal</Text>
          <View style={styles.roleRow}>
            <ShieldCheck size={13} color="#D97706" />
            <Text style={styles.roleBadgeText}>Event Lead · Operations</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Bell size={20} color={colors.foreground} />
          <NotificationBadge count={unreadCount} />
        </TouchableOpacity>
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <SkeletonLoader height={90} style={{ marginBottom: spacing.md, borderRadius: radius.xl }} />
            <SkeletonLoader height={240} style={{ marginBottom: spacing.md, borderRadius: radius.xl }} />
            <SkeletonLoader height={200} style={{ borderRadius: radius.xl }} />
          </View>
        ) : (
          <>
            {/* SECTION A: Summary KPI Cards */}
            <View ref={statsRef} collapsable={false} style={styles.statsRow}>
              <Card
                style={styles.statCard}
                onPress={() => navigation.navigate("ManagerBookings", { tab: "upcoming" })}
              >
                <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
                  <CalendarIcon size={18} color="#4C81E0" />
                </View>
                <Text style={styles.statNumber}>{upcomingBookings.length}</Text>
                <Text style={styles.statLabel}>Assigned Events</Text>
                <Text style={styles.statSub}>Under your lead</Text>
              </Card>

              <Card
                style={styles.statCard}
                onPress={() => navigation.navigate("ManagerBookings", { tab: "completed" })}
              >
                <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
                  <CheckCircle2 size={18} color="#059669" />
                </View>
                <Text style={styles.statNumber}>{completedBookings.length}</Text>
                <Text style={styles.statLabel}>Completed Events</Text>
                <Text style={styles.statSub}>Coordinated</Text>
              </Card>
            </View>

            {/* SECTION B: Assigned Event Calendar */}
            <View ref={calendarRef} collapsable={false}>
              <Card style={styles.calendarCard}>
                {/* Calendar Header with Set My Availability Button */}
                <View style={styles.calendarHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.calendarTitleRow}>
                      <View style={styles.calIconWrap}>
                        <CalendarDays size={16} color="#D97706" />
                      </View>
                      <Text style={styles.calendarTitle}>Assigned Event Calendar</Text>
                    </View>
                    <Text style={styles.calendarSubtitle}>
                      Assigned event dates and your personal availability
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.setAvailabilityBtn}
                    onPress={() => setShowAvailabilityModal(true)}
                    activeOpacity={0.8}
                  >
                    <CalendarDays size={13} color="#FFFFFF" />
                    <Text style={styles.setAvailabilityBtnText}>Set Availability</Text>
                  </TouchableOpacity>
                </View>

                {/* Month Navigation Toolbar */}
                <View style={styles.monthToolbar}>
                  <Text style={styles.monthLabelText}>{monthLabel}</Text>
                  <View style={styles.monthBtnsRow}>
                    <TouchableOpacity
                      onPress={() => stepMonth(-1)}
                      style={styles.navSquareBtn}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={16} color={colors.foregroundDark} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const today = new Date();
                        setCalendarMonth(today);
                        setSelectedDate(today);
                      }}
                      style={styles.todayBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.todayBtnText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => stepMonth(1)}
                      style={styles.navSquareBtn}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={16} color={colors.foregroundDark} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Weekday Row */}
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w) => (
                    <Text key={w} style={styles.weekdayText}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Calendar Days Matrix */}
                <View style={styles.daysMatrix}>
                  {calendarDays.map((dateObj, idx) => {
                    if (!dateObj) {
                      return <View key={`empty-${idx}`} style={styles.emptyDayBox} />;
                    }

                    const dateKey = toDateKey(dateObj);
                    const isSelected = selectedDateKey === dateKey;
                    const isToday = toDateKey(new Date()) === dateKey;
                    const hasAssigned = eventsByDate.has(dateKey);
                    const isUnavailable = (availabilityData.unavailable || []).includes(dateKey);

                    return (
                      <TouchableOpacity
                        key={dateKey}
                        style={[
                          styles.dayBox,
                          isSelected && styles.dayBoxSelected,
                          hasAssigned && !isSelected && styles.dayBoxAssigned,
                          isUnavailable && !hasAssigned && !isSelected && styles.dayBoxUnavailable,
                          isToday && !isSelected && styles.dayBoxToday,
                        ]}
                        onPress={() => setSelectedDate(dateObj)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumText,
                            isSelected && styles.dayNumTextSelected,
                            hasAssigned && !isSelected && styles.dayNumTextAssigned,
                            isUnavailable && !hasAssigned && !isSelected && styles.dayNumTextUnavailable,
                          ]}
                        >
                          {dateObj.getDate()}
                        </Text>
                        <View style={styles.dotsRow}>
                          {hasAssigned && <View style={styles.assignedDot} />}
                          {isUnavailable && <View style={styles.unavailableDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected Date Information Panel */}
                <View style={styles.selectedDatePanel}>
                  <View style={styles.selectedDateHeader}>
                    <Text style={styles.selectedDateTitle}>
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <View style={styles.badgeRow}>
                      {isSelectedDateUnavailable && (
                        <View style={styles.offDutyBadge}>
                          <Text style={styles.offDutyBadgeText}>Marked Off-Duty</Text>
                        </View>
                      )}
                      {selectedDateEvents.length > 0 && (
                        <View style={styles.eventCountBadge}>
                          <Text style={styles.eventCountBadgeText}>
                            {selectedDateEvents.length} Event{selectedDateEvents.length === 1 ? "" : "s"} Assigned
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {selectedDateEvents.length === 0 ? (
                    <Text style={styles.noEventsText}>No assigned events on this date.</Text>
                  ) : (
                    <View style={styles.selectedEventsList}>
                      {selectedDateEvents.map((booking) => (
                        <View key={booking._id} style={styles.selectedEventItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.selectedEventType}>
                              {booking.event_type || "Catering Event"}
                            </Text>
                            <Text style={styles.selectedEventClient}>
                              Client: {booking.customer_id?.full_name || "Valued Client"}
                            </Text>
                            <View style={styles.eventMetaRow}>
                              <Clock size={11} color={colors.textSubtle} />
                              <Text style={styles.eventMetaText}>
                                {formatEventStartTime(booking.start_time)}
                              </Text>
                              <Text style={styles.metaSeparator}>•</Text>
                              <MapPin size={11} color={colors.textSubtle} />
                              <Text style={styles.eventMetaText} numberOfLines={1}>
                                {getBookingVenueLocation(booking)}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.viewDetailsBtn}
                            onPress={() => openEvent(booking._id)}
                            activeOpacity={0.8}
                          >
                            <Eye size={13} color="#FFFFFF" />
                            <Text style={styles.viewDetailsBtnText}>Details</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            </View>

            {/* SECTION C: Upcoming Scheduled Events */}
            <View ref={eventsRef} collapsable={false} style={styles.upcomingSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Scheduled Events</Text>
                <Text style={styles.sectionCountText}>
                  {upcomingBookings.length} event{upcomingBookings.length === 1 ? "" : "s"}
                </Text>
              </View>

              {upcomingBookings.length === 0 ? (
                <Card style={styles.emptyCard} variant="flat">
                  <CalendarIcon size={32} color={colors.textDisabled} />
                  <Text style={styles.emptyTitle}>No Upcoming Events</Text>
                  <Text style={styles.emptySubtitle}>
                    You do not have any active catering assignments under your lead right now.
                  </Text>
                </Card>
              ) : (
                upcomingBookings.map((booking) => {
                  const timing = getEventTimingStatus(booking);
                  const venue = getBookingVenueLocation(booking);
                  const isDepositPending =
                    booking.payment_status === "deposit_pending" ||
                    booking.status === "Deposit Pending";

                  return (
                    <Card
                      key={booking._id}
                      style={styles.eventCard}
                      onPress={() => openEvent(booking._id)}
                    >
                      {/* Top Row: Type, Status, Client, Ref */}
                      <View style={styles.eventCardHeader}>
                        <View style={{ flex: 1, marginRight: spacing.xs }}>
                          <Text style={styles.kickerText}>Assigned Event</Text>
                          <Text style={styles.eventCardTitle}>
                            {booking.event_type || "Catering Event"}
                          </Text>
                          <Text style={styles.clientRefText}>
                            Client: <Text style={styles.boldText}>{booking.customer_id?.full_name || "Client"}</Text> · Ref:{" "}
                            <Text style={styles.monoText}>
                              {booking.reference || booking._id?.slice(-6).toUpperCase()}
                            </Text>
                          </Text>
                        </View>
                        {isDepositPending && <StatusBadge status="Deposit Pending" />}
                      </View>

                      {/* Operational Details Grid */}
                      <View style={styles.eventCardBody}>
                        <View style={styles.eventCardCol}>
                          <View style={styles.infoRow}>
                            <CalendarIcon size={14} color="#4C81E0" />
                            <Text style={styles.dateText}>
                              {formatDate(booking.event_date)}
                            </Text>
                          </View>
                          <View style={styles.subInfoRow}>
                            <Clock size={12} color={colors.textSubtle} />
                            <Text style={styles.subInfoText}>
                              {formatEventStartTime(booking.start_time)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.eventCardCol}>
                          <View style={styles.infoRow}>
                            <MapPin size={14} color="#4C81E0" />
                            <Text style={styles.venueText} numberOfLines={2}>
                              {venue}
                            </Text>
                          </View>
                          <View style={styles.subInfoRow}>
                            <ShieldCheck size={12} color="#D97706" />
                            <Text style={styles.subInfoText}>Lead Coordinator</Text>
                          </View>
                        </View>
                      </View>

                      {/* Card Footer: Status & Action Button */}
                      <View style={styles.eventCardFooter}>
                        <View style={styles.statusSlot}>
                          {timing.isStarted && !timing.isFinished && (
                            <View style={styles.inProgressBadge}>
                              <Sparkles size={11} color="#059669" />
                              <Text style={styles.inProgressText}>In Progress</Text>
                            </View>
                          )}
                        </View>

                        <AppButton
                          title="View Details"
                          size="sm"
                          variant="primary"
                          icon={Eye}
                          onPress={() => openEvent(booking._id)}
                        />
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Availability Modal */}
      <AvailabilityModal
        visible={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        initialMonth={calendarMonth}
        initialUnavailable={availabilityData.unavailable || []}
        assignments={availabilityData.assignments || []}
        onSave={handleSaveAvailability}
        userRole="manager"
      />

      {/* First-Time Coach Marks */}
      <CoachMarkSequence screenKey="manager_dashboard" steps={coachMarkSteps} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTextCol: {
    flex: 1,
  },
  portalTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.bold,
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100, // account for floating tab bar
    gap: spacing.md,
  },
  loadingContainer: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: 2,
  },
  statSub: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  calendarCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  calendarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  calendarSubtitle: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  setAvailabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#4C81E0",
  },
  setAvailabilityBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#FFFFFF",
  },
  monthToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.powder,
    padding: spacing.xs,
    borderRadius: radius.md,
  },
  monthLabelText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    paddingLeft: spacing.xs,
  },
  monthBtnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navSquareBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  todayBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 2,
  },
  weekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textDisabled,
    textTransform: "uppercase",
  },
  daysMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    rowGap: 4,
  },
  emptyDayBox: {
    width: 38,
    height: 38,
  },
  dayBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dayBoxToday: {
    borderColor: colors.foregroundMuted,
  },
  dayBoxSelected: {
    borderColor: "#4C81E0",
    borderWidth: 1.5,
    backgroundColor: "#EFF6FF",
  },
  dayBoxAssigned: {
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
  },
  dayBoxUnavailable: {
    borderColor: "#FDA4AF",
    backgroundColor: "#FFF1F2",
  },
  dayNumText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  dayNumTextSelected: {
    color: "#4C81E0",
    fontFamily: typography.fontFamilies.bold,
  },
  dayNumTextAssigned: {
    color: "#92400E",
    fontFamily: typography.fontFamilies.bold,
  },
  dayNumTextUnavailable: {
    color: "#BE123C",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 1,
    height: 4,
  },
  assignedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F59E0B",
  },
  unavailableDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F43F5E",
  },
  selectedDatePanel: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.powder,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  selectedDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  selectedDateTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
  },
  offDutyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: "#FFE4E6",
  },
  offDutyBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.semiBold,
    color: "#BE123C",
  },
  eventCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: "#FEF3C7",
  },
  eventCountBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.semiBold,
    color: "#92400E",
  },
  noEventsText: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  selectedEventsList: {
    gap: spacing.xs,
    marginTop: 2,
  },
  selectedEventItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  selectedEventType: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  selectedEventClient: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  eventMetaText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  metaSeparator: {
    color: colors.textDisabled,
    fontSize: 10,
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: "#4C81E0",
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#FFFFFF",
  },
  upcomingSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  sectionCountText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundMuted,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  eventCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  eventCardHeader: {
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
  eventCardTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: 1,
  },
  clientRefText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  boldText: {
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  monoText: {
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  eventCardBody: {
    flexDirection: "row",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  eventCardCol: {
    flex: 1,
    gap: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 19,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  subInfoText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  venueText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundDark,
    flex: 1,
  },
  eventCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statusSlot: {
    minHeight: 24,
    justifyContent: "center",
  },
  inProgressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: "#ECFDF5",
  },
  inProgressText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: "#059669",
  },
});

export default ManagerDashboardScreen;
