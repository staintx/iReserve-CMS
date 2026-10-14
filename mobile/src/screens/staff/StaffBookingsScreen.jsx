import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  Eye,
  UserCheck,
  X,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import staffApi from "../../api/staff";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import AppButton from "../../components/common/AppButton";
import {
  formatDate,
  formatEventStartTime,
  getBookingVenueLocation,
  getEventTimingStatus,
} from "../../utils/format";

export const StaffBookingsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initialTab = route?.params?.tab === "completed" ? "completed" : "upcoming";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab === "completed" ? "completed" : "upcoming");
    }
  }, [route?.params?.tab]);

  const loadBookings = useCallback(async () => {
    try {
      const [upcomingRes, completedRes] = await Promise.all([
        staffApi.getBookings("active").catch(() => []),
        staffApi.getBookings("completed").catch(() => []),
      ]);
      setUpcomingBookings(Array.isArray(upcomingRes) ? upcomingRes : []);
      setCompletedBookings(Array.isArray(completedRes) ? completedRes : []);
    } catch (error) {
      console.error("Failed to load staff bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getMyAssignedRole = (booking) => {
    const assignments = booking?.staff_assignments || [];
    const match = assignments.find(
      (item) => String(item.user_id?._id || item.user_id) === String(user?._id)
    );
    return match?.role || user?.position || "Catering Operations Crew";
  };

  const currentList = activeTab === "completed" ? completedBookings : upcomingBookings;

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter((b) => {
      const ref = (b.reference || b._id || "").toLowerCase();
      const type = (b.event_type || "").toLowerCase();
      const client = (b.customer_id?.full_name || "").toLowerCase();
      const venue = getBookingVenueLocation(b).toLowerCase();
      return ref.includes(q) || type.includes(q) || client.includes(q) || venue.includes(q);
    });
  }, [currentList, searchQuery]);

  const renderItem = ({ item }) => {
    const timing = getEventTimingStatus(item);
    const venue = getBookingVenueLocation(item);
    const myRole = getMyAssignedRole(item);

    return (
      <Card
        style={styles.card}
        onPress={() =>
          navigation.navigate("StaffEventDetail", { bookingId: item._id })
        }
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: spacing.xs }}>
            <Text style={styles.kickerText}>Catering Assignment</Text>
            <Text style={styles.eventTitle}>{item.event_type || "Catering Event"}</Text>
            <Text style={styles.clientRefText}>
              Client: <Text style={styles.boldText}>{item.customer_id?.full_name || "Valued Client"}</Text> · Ref:{" "}
              <Text style={styles.monoText}>
                {item.reference || item._id?.slice(-6).toUpperCase()}
              </Text>
            </Text>
          </View>
          <StatusBadge status={item.status || "Confirmed"} />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.cardCol}>
            <View style={styles.metaRow}>
              <CalendarIcon size={14} color="#4C81E0" />
              <Text style={styles.metaDateText}>{formatDate(item.event_date)}</Text>
            </View>
            <View style={styles.metaSubRow}>
              <Clock size={12} color={colors.textSubtle} />
              <Text style={styles.metaSubText}>{formatEventStartTime(item.start_time)}</Text>
            </View>
          </View>

          <View style={styles.cardCol}>
            <View style={styles.metaRow}>
              <MapPin size={14} color="#4C81E0" />
              <Text style={styles.metaVenueText} numberOfLines={2}>
                {venue}
              </Text>
            </View>
            <View style={styles.metaSubRow}>
              <UserCheck size={12} color="#4C81E0" />
              <Text style={styles.metaSubText} numberOfLines={1}>
                Role: <Text style={styles.boldText}>{myRole}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
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
            onPress={() =>
              navigation.navigate("StaffEventDetail", { bookingId: item._id })
            }
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assigned Bookings</Text>
        <Text style={styles.headerSubtitle}>
          Review your assigned catering shifts, monitor schedules, and check venue locations
        </Text>
      </View>

      {/* Segmented Controls & Search Toolbar */}
      <View style={styles.toolbar}>
        {/* Tab switcher */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "upcoming" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("upcoming")}
            activeOpacity={0.8}
          >
            <CalendarIcon
              size={14}
              color={activeTab === "upcoming" ? "#4C81E0" : colors.textSubtle}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "upcoming" && styles.segmentBtnTextActive,
              ]}
            >
              Upcoming
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === "upcoming" ? styles.countBadgeActive : styles.countBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  activeTab === "upcoming" && styles.countBadgeTextActive,
                ]}
              >
                {upcomingBookings.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "completed" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("completed")}
            activeOpacity={0.8}
          >
            <CheckCircle2
              size={14}
              color={activeTab === "completed" ? "#059669" : colors.textSubtle}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "completed" && styles.segmentBtnTextActive,
              ]}
            >
              Completed
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === "completed"
                  ? styles.countBadgeCompleted
                  : styles.countBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  activeTab === "completed" && styles.countBadgeTextCompleted,
                ]}
              >
                {completedBookings.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={styles.searchWrap}>
          <Search size={15} color={colors.textDisabled} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client, event or ref..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <X size={15} color={colors.textSubtle} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <SkeletonLoader height={140} style={{ marginBottom: spacing.sm, borderRadius: radius.xl }} />
          <SkeletonLoader height={140} style={{ marginBottom: spacing.sm, borderRadius: radius.xl }} />
          <SkeletonLoader height={140} style={{ borderRadius: radius.xl }} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard} variant="flat">
              <CalendarIcon size={32} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>
                {activeTab === "completed" ? "No completed events found" : "No upcoming events found"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "Try clearing your search query to see more events."
                  : activeTab === "completed"
                  ? "Completed catering shifts will be archived here."
                  : "You have no upcoming catering shifts scheduled at the moment."}
              </Text>
            </Card>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  headerSubtitle: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: colors.powder,
    padding: 3,
    borderRadius: radius.lg,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: radius.md,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.xs,
  },
  segmentBtnText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  segmentBtnTextActive: {
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countBadgeInactive: {
    backgroundColor: colors.border,
  },
  countBadgeActive: {
    backgroundColor: "#DBEAFE",
  },
  countBadgeCompleted: {
    backgroundColor: "#D1FAE5",
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  countBadgeTextActive: {
    color: "#2563EB",
  },
  countBadgeTextCompleted: {
    color: "#059669",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.powder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 38,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    paddingVertical: 0,
  },
  loaderContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100, // dock clearance
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHeader: {
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
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  cardBody: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cardCol: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 18,
  },
  metaDateText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  metaSubText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  metaVenueText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundDark,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 2,
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
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
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
    maxWidth: 280,
  },
});

export default StaffBookingsScreen;
