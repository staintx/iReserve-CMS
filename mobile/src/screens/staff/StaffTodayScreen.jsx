import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  CheckCircle2,
  Lock,
  Unlock,
  PackageCheck,
  ChevronRight,
  ShieldCheck,
  Sun,
  FileText,
  Bell,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import staffApi from "../../api/staff";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import NotificationBadge from "../../components/common/NotificationBadge";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import { formatDate, formatTime } from "../../utils/format";

export const StaffTodayScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBookings, setActiveBookings] = useState([]);
  const [isOfflineData, setIsOfflineData] = useState(false);

  const loadShifts = useCallback(async () => {
    try {
      const data = await staffApi.getMyBookings("active");
      const list = Array.isArray(data) ? data : [];
      setActiveBookings(list);
      setIsOfflineData(false);
      if (list.length > 0) {
        cacheData(CACHE_KEYS.STAFF_SHIFTS, list);
      }
    } catch (error) {
      console.error("Failed to load staff shifts:", error);
      const cached = await getCachedData(CACHE_KEYS.STAFF_SHIFTS);
      if (Array.isArray(cached) && cached.length > 0) {
        setActiveBookings(cached);
        setIsOfflineData(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
  };

  // Determine today's event or next upcoming event
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const todayEvent = activeBookings.find((b) => {
    if (!b.event_date) return false;
    const d = new Date(b.event_date);
    return d >= todayStart && d <= todayEnd;
  });

  const nextEvent = !todayEvent
    ? activeBookings.find((b) => {
        if (!b.event_date) return false;
        const d = new Date(b.event_date);
        return d > todayEnd;
      })
    : null;

  const currentDisplayEvent = todayEvent || nextEvent;

  // Check if event has started (for unlocking equipment verification and complete shift)
  const isEventStarted = (event) => {
    if (!event) return false;
    if (["completed", "Completed", "ongoing"].includes(event.status)) return true;
    if (!event.event_date) return true;

    const d = new Date(event.event_date);
    let hours = 0;
    let minutes = 0;
    if (event.start_time) {
      const match = String(event.start_time).trim().match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
      }
    }
    const startDateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);
    return now >= startDateTime;
  };

  const handleOpenMaps = (event) => {
    if (!event) return;
    const addressQuery = [
      event.street,
      event.barangay,
      event.municipality,
      "Batangas, Philippines",
    ]
      .filter(Boolean)
      .join(", ");
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open map navigation.")
    );
  };

  const unlocked = currentDisplayEvent ? isEventStarted(currentDisplayEvent) : false;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.greetingRow}>
            <Sun size={16} color={colors.accentDark} />
            <Text style={styles.greetingText}>Daily Shift Roster</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || "Staff Member"}</Text>
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

      {isOfflineData && (
        <View style={styles.offlineNotice}>
          <Text style={styles.offlineNoticeText}>
            ⚡ Offline mode: viewing saved shift details & venue addresses
          </Text>
        </View>
      )}

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
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            <SkeletonLoader height={220} style={{ borderRadius: radius.lg }} />
            <SkeletonLoader height={120} style={{ borderRadius: radius.lg }} />
          </View>
        ) : (
          <>
            {/* Hero Card: Today's Shift or Next Scheduled Event */}
            {currentDisplayEvent ? (
              <Card
                style={[
                  styles.heroCard,
                  todayEvent ? styles.heroCardToday : styles.heroCardUpcoming,
                ]}
              >
                <View style={styles.heroTopBadgeRow}>
                  <View
                    style={[
                      styles.dayStatusBadge,
                      { backgroundColor: todayEvent ? colors.successLight : colors.primaryLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayStatusText,
                        { color: todayEvent ? colors.success : colors.primary },
                      ]}
                    >
                      {todayEvent ? "Today's Assignment" : "Next Upcoming Shift"}
                    </Text>
                  </View>
                  <StatusBadge status={currentDisplayEvent.status} />
                </View>

                <Text style={styles.heroTitle}>
                  {currentDisplayEvent.event_type || "Catering Event"}
                </Text>
                <Text style={styles.heroRef}>
                  Booking Ref: #{currentDisplayEvent.reference || currentDisplayEvent._id?.slice(-6).toUpperCase()}
                </Text>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Calendar size={16} color={colors.foregroundMuted} />
                  <Text style={styles.metaValue}>
                    {formatDate(currentDisplayEvent.event_date)}
                  </Text>
                </View>

                {currentDisplayEvent.start_time && (
                  <View style={styles.metaRow}>
                    <Clock size={16} color={colors.foregroundMuted} />
                    <Text style={styles.metaValue}>
                      {formatTime(currentDisplayEvent.start_time)}
                      {currentDisplayEvent.duration_hours ? ` (${currentDisplayEvent.duration_hours}h shift)` : ""}
                    </Text>
                  </View>
                )}

                <View style={styles.metaRow}>
                  <MapPin size={16} color={colors.foregroundMuted} />
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {[
                      currentDisplayEvent.street,
                      currentDisplayEvent.barangay,
                      currentDisplayEvent.municipality,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Batangas Venue"}
                  </Text>
                </View>

                {/* Navigation Button */}
                <AppButton
                  title="Open Venue Directions"
                  variant="outline"
                  size="sm"
                  icon={Navigation}
                  onPress={() => handleOpenMaps(currentDisplayEvent)}
                  style={{ marginTop: spacing.sm }}
                />

                {/* Operational Actions */}
                <View style={styles.actionGrid}>
                  <AppButton
                    title="Event Details"
                    variant="secondary"
                    size="sm"
                    icon={FileText}
                    onPress={() =>
                      navigation.navigate("StaffEventDetail", {
                        bookingId: currentDisplayEvent._id,
                      })
                    }
                    style={{ flex: 1 }}
                  />

                  <AppButton
                    title={unlocked ? "Equipment Returns" : "Returns Locked"}
                    variant={unlocked ? "primary" : "ghost"}
                    size="sm"
                    icon={unlocked ? Unlock : Lock}
                    onPress={() => {
                      if (!unlocked) {
                        Alert.alert(
                          "Equipment Returns Locked",
                          `Equipment returns can only be filed once the event begins at ${formatTime(currentDisplayEvent.start_time) || "the scheduled time"}.`
                        );
                      } else {
                        navigation.navigate("EquipmentChecklist", {
                          bookingId: currentDisplayEvent._id,
                        });
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ) : (
              <Card style={styles.noShiftCard} variant="flat">
                <Sun size={36} color={colors.accentDark} style={{ marginBottom: spacing.xs }} />
                <Text style={styles.noShiftTitle}>No Shifts Scheduled</Text>
                <Text style={styles.noShiftSub}>
                  You do not have any active catering assignments right now. Make sure your availability calendar is up to date!
                </Text>
                <AppButton
                  title="Update My Availability"
                  variant="outline"
                  size="sm"
                  onPress={() => navigation.navigate("StaffAvailability")}
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            )}

            {/* Quick Access Card */}
            <Card
              style={styles.menuCard}
              onPress={() => navigation.navigate("StaffAvailability")}
            >
              <View style={styles.menuCardContent}>
                <View style={styles.iconCircle}>
                  <Calendar size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuCardTitle}>My Availability Calendar</Text>
                  <Text style={styles.menuCardSub}>
                    Block out personal days or view scheduled shifts
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textDisabled} />
              </View>
            </Card>

            {/* Upcoming Shifts List */}
            {activeBookings.length > 1 && (
              <>
                <Text style={styles.sectionHeading}>Upcoming Shifts</Text>
                {activeBookings
                  .filter((b) => b._id !== currentDisplayEvent?._id)
                  .map((item) => (
                    <Card
                      key={item._id}
                      style={styles.shiftCard}
                      onPress={() =>
                        navigation.navigate("StaffEventDetail", {
                          bookingId: item._id,
                        })
                      }
                    >
                      <View style={styles.shiftCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.shiftTitle}>
                            {item.event_type || "Catering Event"}
                          </Text>
                          <Text style={styles.shiftRef}>
                            Ref: #{item.reference || item._id?.slice(-6).toUpperCase()}
                          </Text>
                        </View>
                        <StatusBadge status={item.status} />
                      </View>

                      <View style={styles.shiftMetaRow}>
                        <Calendar size={13} color={colors.foregroundMuted} />
                        <Text style={styles.shiftMetaText}>
                          {formatDate(item.event_date)} {item.start_time ? `• ${formatTime(item.start_time)}` : ""}
                        </Text>
                      </View>
                    </Card>
                  ))}
              </>
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
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  greetingText: {
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
  heroCard: {
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  heroCardToday: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  heroCardUpcoming: {
    borderColor: colors.borderLight,
  },
  heroTopBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  dayStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dayStatusText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
  },
  heroTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  heroRef: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.foreground,
    flex: 1,
  },
  actionGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  noShiftCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
    borderRadius: radius.xl,
  },
  noShiftTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    marginBottom: 4,
  },
  noShiftSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  menuCard: {
    marginBottom: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  menuCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCardTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  menuCardSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  shiftCard: {
    marginBottom: spacing.sm,
  },
  shiftCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shiftTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  shiftRef: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 1,
  },
  shiftMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  shiftMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  offlineNotice: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    alignItems: "center",
  },
  offlineNoticeText: {
    fontSize: typography.sizes.xs,
    color: "#92400E",
    fontWeight: "700",
  },
});

export default StaffTodayScreen;
