import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Clock,
  CalendarOff,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import StaffScheduleModal from "./StaffScheduleModal";

export const ManagerStaffScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

  // Selected staff for calendar modal
  const [selectedStaff, setSelectedStaff] = useState(null);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const data = await managerApi.getStaff();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load staff list:", error);
      Alert.alert("Error", "Could not load staff directory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStaff();
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Error", "Unable to launch phone dialer.")
    );
  };

  const handleEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() =>
      Alert.alert("Error", "Unable to launch email app.")
    );
  };

  const positions = useMemo(() => {
    const set = new Set();
    staffList.forEach((s) => {
      if (s.position) set.add(s.position);
    });
    return ["all", ...Array.from(set)];
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.position || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q);

      const matchPos = positionFilter === "all" || s.position === positionFilter;
      return matchSearch && matchPos;
    });
  }, [staffList, searchQuery, positionFilter]);

  const initials = (name) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <View style={styles.screen}>
      <Header
        title="Catering Personnel"
        subtitle="Staff roster & monthly availability schedules"
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.foregroundMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff by name, role, phone..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {positions.map((pos) => {
            const isSelected = positionFilter === pos;
            return (
              <TouchableOpacity
                key={pos}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setPositionFilter(pos)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {pos === "all" ? "All Personnel" : pos}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Staff Cards List */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonLoader height={110} borderRadius={radius.lg} />
            <SkeletonLoader height={110} borderRadius={radius.lg} />
            <SkeletonLoader height={110} borderRadius={radius.lg} />
          </View>
        ) : filteredStaff.length === 0 ? (
          <Card style={styles.emptyCard} variant="flat">
            <Users size={36} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No Staff Members Found</Text>
            <Text style={styles.emptySub}>Try adjusting your search query or role filter.</Text>
          </Card>
        ) : (
          filteredStaff.map((person) => {
            const isAvailable = !person.availability_status || person.availability_status === "Available";
            return (
              <Card
                key={person._id}
                style={styles.staffCard}
                onPress={() => setSelectedStaff(person)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{initials(person.full_name)}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.staffName}>{person.full_name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isAvailable ? colors.successLight : colors.warningLight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isAvailable ? colors.success : colors.warning },
                          ]}
                        >
                          {person.availability_status || "Available"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.staffPosition}>{person.position || "Catering Personnel"}</Text>
                  </View>
                </View>

                {/* Contact Shortcuts & Action */}
                <View style={styles.cardFooter}>
                  <View style={styles.contactRow}>
                    {person.phone ? (
                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => handleCall(person.phone)}
                      >
                        <Phone size={13} color={colors.primary} />
                        <Text style={styles.contactBtnText}>{person.phone}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {person.email ? (
                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => handleEmail(person.email)}
                      >
                        <Mail size={13} color={colors.foregroundMuted} />
                        <Text style={styles.contactBtnText} numberOfLines={1}>
                          {person.email}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.scheduleActionBtn}
                    onPress={() => setSelectedStaff(person)}
                  >
                    <Calendar size={13} color={colors.primary} />
                    <Text style={styles.scheduleActionText}>Schedule</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Staff Monthly Calendar Modal */}
      <StaffScheduleModal
        visible={Boolean(selectedStaff)}
        staffMember={selectedStaff}
        onClose={() => setSelectedStaff(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
  },
  filterPillsContainer: {
    marginVertical: spacing.sm,
  },
  filterPillsScroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.base,
  },
  staffCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarInitials: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primary,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  staffName: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.foreground,
  },
  staffPosition: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontWeight: "500",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contactRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flex: 1,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactBtnText: {
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  scheduleActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  scheduleActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
});

export default ManagerStaffScreen;
