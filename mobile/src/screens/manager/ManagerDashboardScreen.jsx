import React, { useState, useEffect, useCallback } from "react";
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
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  UserPlus,
  MapPin,
  Bell,
  Sparkles,
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
import { formatDate, formatTime } from "../../utils/format";

export const ManagerDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: [],
  });

  const loadSummary = useCallback(async () => {
    try {
      const data = await managerApi.getSummary();
      if (data) {
        setSummary(data);
      }
    } catch (error) {
      console.error("Failed to load manager summary:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSummary();
  };

  const counts = summary?.counts || { pending: 0, upcoming: 0, completed: 0 };
  const pendingStaff = summary?.quickActions?.pending || [];
  const upcomingEvents = summary?.quickActions?.upcoming || [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.greeting}>Manager Portal</Text>
          <Text style={styles.userName}>{user?.full_name || "Event Manager"}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.7}
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
            <SkeletonLoader height={100} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
            <SkeletonLoader height={180} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
            <SkeletonLoader height={240} style={{ borderRadius: radius.lg }} />
          </View>
        ) : (
          <>
            {/* Quick Metrics Bar */}
            <View style={styles.statsRow}>
              <Card
                style={[styles.statBox, { borderLeftColor: colors.warning, borderLeftWidth: 3.5 }]}
                onPress={() => navigation.navigate("ManagerBookings", { tab: "pending" })}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.warningLight }]}>
                  <UserPlus size={18} color={colors.warning} />
                </View>
                <Text style={styles.statNumber}>{counts.pending}</Text>
                <Text style={styles.statLabel}>Needs Staff</Text>
              </Card>

              <Card
                style={[styles.statBox, { borderLeftColor: colors.primary, borderLeftWidth: 3.5 }]}
                onPress={() => navigation.navigate("ManagerBookings", { tab: "upcoming" })}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Calendar size={18} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>{counts.upcoming}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </Card>

              <Card
                style={[styles.statBox, { borderLeftColor: colors.success, borderLeftWidth: 3.5 }]}
                onPress={() => navigation.navigate("ManagerBookings", { tab: "completed" })}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.successLight }]}>
                  <CheckCircle2 size={18} color={colors.success} />
                </View>
                <Text style={styles.statNumber}>{counts.completed}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </Card>
            </View>

            {/* Calendar Quick Access Card */}
            <Card
              style={styles.calendarBanner}
              onPress={() => navigation.navigate("ManagerCalendar")}
            >
              <View style={styles.calendarBannerContent}>
                <View style={styles.calendarIconContainer}>
                  <Sparkles size={22} color={colors.accentDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calendarBannerTitle}>Operational Calendar</Text>
                  <Text style={styles.calendarBannerSubtitle}>
                    View event dates, your availability & staff coverage
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.foregroundMuted} />
              </View>
            </Card>

            {/* Action Required: Unassigned Bookings */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <AlertCircle size={18} color={colors.warning} />
                <Text style={styles.sectionTitle}>Urgent: Assign Staff</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("ManagerBookings", { tab: "pending" })}
              >
                <Text style={styles.viewAllText}>View All ({counts.pending})</Text>
              </TouchableOpacity>
            </View>

            {pendingStaff.length === 0 ? (
              <Card style={styles.emptyCard} variant="flat">
                <CheckCircle2 size={32} color={colors.success} style={{ marginBottom: spacing.xs }} />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySubtitle}>
                  All upcoming bookings have catering and service staff assigned.
                </Text>
              </Card>
            ) : (
              pendingStaff.map((item) => (
                <Card
                  key={item._id}
                  style={styles.actionCard}
                  onPress={() =>
                    navigation.navigate("ManagerBookingDetail", { bookingId: item._id })
                  }
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTypeWrap}>
                      <Text style={styles.cardEventType}>{item.event_type || "Catering Event"}</Text>
                      <Text style={styles.cardReference}>Ref: #{item.reference || item._id?.slice(-6).toUpperCase()}</Text>
                    </View>
                    <StatusBadge status={item.status || "Pending"} />
                  </View>

                  <View style={styles.cardInfoRow}>
                    <Calendar size={14} color={colors.textSubtle} />
                    <Text style={styles.cardInfoText}>
                      {formatDate(item.event_date)} {item.start_time ? `• ${formatTime(item.start_time)}` : ""}
                    </Text>
                  </View>

                  <View style={styles.cardInfoRow}>
                    <MapPin size={14} color={colors.textSubtle} />
                    <Text style={styles.cardInfoText} numberOfLines={1}>
                      {item.barangay ? `${item.barangay}, ` : ""}{item.municipality || "Batangas"}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.guestCount}>
                      {item.guests || item.pax || 0} Guests
                    </Text>
                    <AppButton
                      title="Assign Staff"
                      size="sm"
                      variant="primary"
                      icon={UserPlus}
                      onPress={() =>
                        navigation.navigate("AssignStaffModal", {
                          bookingId: item._id,
                          eventDate: item.event_date,
                          existingAssignments: item.staff_assignments || [],
                        })
                      }
                    />
                  </View>
                </Card>
              ))
            )}

            {/* Upcoming Operations */}
            <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
              <View style={styles.sectionTitleRow}>
                <Clock size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("ManagerBookings", { tab: "upcoming" })}
              >
                <Text style={styles.viewAllText}>View All ({counts.upcoming})</Text>
              </TouchableOpacity>
            </View>

            {upcomingEvents.length === 0 ? (
              <Card style={styles.emptyCard} variant="flat">
                <Text style={styles.emptySubtitle}>No upcoming events scheduled right now.</Text>
              </Card>
            ) : (
              upcomingEvents.map((item) => (
                <Card
                  key={item._id}
                  style={styles.eventCard}
                  onPress={() =>
                    navigation.navigate("ManagerBookingDetail", { bookingId: item._id })
                  }
                >
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.cardEventType}>{item.event_type || "Event"}</Text>
                      <Text style={styles.cardCustomerName}>
                        {item.customer_id?.full_name ||
                          `${item.contact_first_name || ""} ${item.contact_last_name || ""}`.trim() ||
                          "Client"}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </View>

                  <View style={styles.eventMetaRow}>
                    <View style={styles.metaItem}>
                      <Calendar size={13} color={colors.foregroundMuted} />
                      <Text style={styles.metaText}>{formatDate(item.event_date)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Users size={13} color={colors.foregroundMuted} />
                      <Text style={styles.metaText}>
                        {(item.staff_assignments || []).length} Staff Assigned
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTextCol: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 120,
  },
  loadingContainer: {
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  calendarBanner: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderColor: colors.borderFocus,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  calendarBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  calendarIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  calendarBannerTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  calendarBannerSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  viewAllText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderRadius: radius.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
  },
  actionCard: {
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    borderColor: colors.borderLight,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  cardTypeWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardEventType: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  cardReference: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  cardCustomerName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  cardInfoText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  guestCount: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  eventCard: {
    marginBottom: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
  },
});

export default ManagerDashboardScreen;
