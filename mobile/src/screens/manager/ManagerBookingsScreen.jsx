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
  Calendar,
  Users,
  MapPin,
  Clock,
  Filter,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import EmptyState from "../../components/common/EmptyState";
import PillFilter from "../../components/common/PillFilter";
import { formatDate, formatTime } from "../../utils/format";

const TABS = [
  { key: "pending", label: "Needs Staff" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All Bookings" },
];

export const ManagerBookingsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const initialTab = route.params?.tab || "pending";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route.params?.tab]);

  const loadBookings = useCallback(async (tabKey) => {
    try {
      const statusParam = tabKey === "all" ? null : tabKey;
      const data = await managerApi.getBookings(statusParam);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load manager bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadBookings(activeTab);
  }, [activeTab, loadBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings(activeTab);
  };

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter((b) => {
      const ref = (b.reference || b._id || "").toLowerCase();
      const type = (b.event_type || "").toLowerCase();
      const customer = (
        b.customer_id?.full_name ||
        `${b.contact_first_name || ""} ${b.contact_last_name || ""}`
      ).toLowerCase();
      const mun = (b.municipality || "").toLowerCase();
      return ref.includes(q) || type.includes(q) || customer.includes(q) || mun.includes(q);
    });
  }, [bookings, searchQuery]);

  const renderItem = ({ item }) => {
    const customerName =
      item.customer_id?.full_name ||
      `${item.contact_first_name || ""} ${item.contact_last_name || ""}`.trim() ||
      "Customer";
    const staffCount = (item.staff_assignments || []).length;
    const hasStaff = staffCount > 0;

    return (
      <Card
        style={styles.card}
        onPress={() =>
          navigation.navigate("ManagerBookingDetail", { bookingId: item._id })
        }
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.eventTitle}>{item.event_type || "Catering Event"}</Text>
            <Text style={styles.referenceText}>
              Ref: #{item.reference || item._id?.slice(-6).toUpperCase()}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.clientRow}>
          <Text style={styles.clientName}>{customerName}</Text>
          <Text style={styles.guestCount}>{item.guests || item.pax || 0} guests</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.foregroundMuted} />
            <Text style={styles.metaText}>{formatDate(item.event_date)}</Text>
          </View>
          {item.start_time && (
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.foregroundMuted} />
              <Text style={styles.metaText}>{formatTime(item.start_time)}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaItem}>
          <MapPin size={14} color={colors.foregroundMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.barangay ? `${item.barangay}, ` : ""}{item.municipality || "Batangas"}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View
            style={[
              styles.staffBadge,
              { backgroundColor: hasStaff ? colors.successLight : colors.warningLight },
            ]}
          >
            <Users size={12} color={hasStaff ? colors.success : colors.warning} />
            <Text
              style={[
                styles.staffBadgeText,
                { color: hasStaff ? colors.success : colors.warning },
              ]}
            >
              {hasStaff ? `${staffCount} Staff Assigned` : "No Staff Assigned"}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textSubtle} />
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Operations</Text>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.foregroundMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings by client, ref, or type..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Tab Filters */}
        <PillFilter
          items={TABS}
          selectedKey={activeTab}
          onSelect={setActiveTab}
          contentContainerStyle={{ paddingHorizontal: 0 }}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      {/* List / Content */}
      {loading ? (
        <View style={styles.loadingWrapper}>
          <SkeletonLoader height={140} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
          <SkeletonLoader height={140} style={{ marginBottom: spacing.md, borderRadius: radius.lg }} />
          <SkeletonLoader height={140} style={{ borderRadius: radius.lg }} />
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
            <EmptyState
              icon={Calendar}
              title={
                activeTab === "pending"
                  ? "No Unassigned Bookings"
                  : activeTab === "upcoming"
                  ? "No Upcoming Events"
                  : "No Bookings Found"
              }
              message={
                activeTab === "pending"
                  ? "Every upcoming booking currently has service staff assigned."
                  : "Check other tabs or search terms."
              }
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  activeTabBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  activeTabText: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  loadingWrapper: {
    padding: spacing.base,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  eventTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  referenceText: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    marginTop: 2,
  },
  clientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  clientName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  guestCount: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  metaGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  staffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  staffBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
  },
});

export default ManagerBookingsScreen;
