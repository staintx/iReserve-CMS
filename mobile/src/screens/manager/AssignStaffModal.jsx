import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ShieldAlert,
  Search,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { formatDate } from "../../utils/format";

const COMMON_ROLES = [
  "Head Waiter / Captain",
  "Catering Service Staff",
  "Buffet Runner",
  "Kitchen Assistant",
  "Beverage & Bar Attendant",
  "Event Coordinator",
  "Logistics & Setup",
];

export const AssignStaffModal = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { bookingId, eventDate, existingAssignments = [], onSuccess } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allStaff, setAllStaff] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Current assignments state: array of { user_id, name, role, email, phone }
  const [assignments, setAssignments] = useState(() => {
    return existingAssignments.map((a) => ({
      user_id: a.user_id?._id || a.user_id,
      name: a.user_id?.full_name || a.name || "Staff",
      role: a.role || a.user_id?.position || "Catering Service Staff",
      email: a.user_id?.email || "",
      phone: a.user_id?.phone || "",
    }));
  });

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedStaffForRole, setSelectedStaffForRole] = useState(null);
  const [customRoleInput, setCustomRoleInput] = useState("");

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const data = await managerApi.getStaff({ event_date: eventDate });
      setAllStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load staff list:", error);
      Alert.alert("Error", "Could not load staff list.");
    } finally {
      setLoading(false);
    }
  }, [eventDate]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const isAssigned = (staffId) => {
    return assignments.some((a) => String(a.user_id) === String(staffId));
  };

  const handleToggleStaff = (staffMember) => {
    const staffId = staffMember._id;
    if (isAssigned(staffId)) {
      setAssignments((prev) => prev.filter((a) => String(a.user_id) !== String(staffId)));
    } else {
      if (!staffMember.is_available) {
        Alert.alert(
          "Schedule Conflict Warning",
          `${staffMember.full_name} is marked as ${staffMember.availability_status} on ${formatDate(eventDate)}. Are you sure you want to assign them anyway?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Assign Anyway",
              onPress: () => {
                setSelectedStaffForRole(staffMember);
                setRoleModalVisible(true);
              },
            },
          ]
        );
      } else {
        setSelectedStaffForRole(staffMember);
        setRoleModalVisible(true);
      }
    }
  };

  const handleConfirmRole = (role) => {
    if (!selectedStaffForRole) return;
    const finalRole = role || customRoleInput.trim() || selectedStaffForRole.position || "Catering Service Staff";

    setAssignments((prev) => [
      ...prev,
      {
        user_id: selectedStaffForRole._id,
        name: selectedStaffForRole.full_name,
        role: finalRole,
        email: selectedStaffForRole.email,
        phone: selectedStaffForRole.phone,
      },
    ]);

    setRoleModalVisible(false);
    setSelectedStaffForRole(null);
    setCustomRoleInput("");
  };

  const handleRemoveAssignment = (staffId) => {
    setAssignments((prev) => prev.filter((a) => String(a.user_id) !== String(staffId)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = assignments.map((a) => ({
        user_id: a.user_id,
        role: a.role,
        name: a.name,
      }));

      await managerApi.assignStaff(bookingId, payload);
      Alert.alert("Success", "Staff assignments saved successfully.");
      if (onSuccess) onSuccess();
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update staff assignments.");
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = allStaff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.full_name || "").toLowerCase().includes(q) ||
      (s.position || "").toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.screen}>
      <Header
        title="Assign Event Staff"
        subtitle={eventDate ? formatDate(eventDate) : "Schedule Roster"}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={22} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Currently Assigned Team Card */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Users size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              Assigned Team ({assignments.length})
            </Text>
          </View>

          {assignments.length === 0 ? (
            <View style={styles.emptyAssignedBox}>
              <Text style={styles.emptyAssignedText}>
                No staff currently selected. Tap any staff member below to add them to this event.
              </Text>
            </View>
          ) : (
            <View style={styles.assignedList}>
              {assignments.map((item) => (
                <View key={item.user_id} style={styles.assignedItem}>
                  <View style={styles.assignedAvatar}>
                    <Text style={styles.avatarInitials}>
                      {item.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.assignedName}>{item.name}</Text>
                    <Text style={styles.assignedRoleText}>{item.role}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveAssignment(item.user_id)}
                    style={styles.removeBtn}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Staff Availability Roster */}
        <View style={styles.rosterSectionHeader}>
          <Text style={styles.rosterHeading}>Available Personnel</Text>
          <Text style={styles.rosterSub}>
            Real-time conflict detection for {eventDate ? formatDate(eventDate) : "this date"}
          </Text>
        </View>

        <View style={styles.searchBar}>
          <Search size={16} color={colors.foregroundMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff by name or skill..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <SkeletonLoader height={70} style={{ borderRadius: radius.md }} />
            <SkeletonLoader height={70} style={{ borderRadius: radius.md }} />
            <SkeletonLoader height={70} style={{ borderRadius: radius.md }} />
          </View>
        ) : (
          <View style={styles.staffGrid}>
            {filteredStaff.map((member) => {
              const assigned = isAssigned(member._id);
              const isAvail = member.is_available;
              const statusText = member.availability_status || (isAvail ? "Available" : "Unavailable");

              let badgeBg = colors.successLight;
              let badgeColor = colors.success;
              if (statusText === "Booked") {
                badgeBg = colors.warningLight;
                badgeColor = colors.warning;
              } else if (statusText === "Unavailable") {
                badgeBg = colors.errorLight;
                badgeColor = colors.error;
              }

              return (
                <TouchableOpacity
                  key={member._id}
                  style={[
                    styles.memberCard,
                    assigned && styles.memberCardAssigned,
                  ]}
                  onPress={() => handleToggleStaff(member)}
                  activeOpacity={0.7}
                >
                  <View style={styles.memberTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      <Text style={styles.memberPosition}>
                        {member.position || "Catering Staff"}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberBottomRow}>
                    <Text style={styles.memberCount}>
                      {member.upcoming_count || 0} upcoming shifts
                    </Text>
                    <View
                      style={[
                        styles.toggleCheck,
                        assigned && styles.toggleCheckActive,
                      ]}
                    >
                      {assigned ? (
                        <CheckCircle2 size={16} color={colors.white} />
                      ) : (
                        <Plus size={16} color={colors.primary} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer Save Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        <AppButton
          title={`Save Assignments (${assignments.length} Selected)`}
          variant="primary"
          size="lg"
          loading={saving}
          onPress={handleSave}
        />
      </View>

      {/* Role Selection Modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Assign Role for {selectedStaffForRole?.full_name}
            </Text>
            <Text style={styles.modalSub}>Select or type the role for this event:</Text>

            <ScrollView style={styles.roleList} showsVerticalScrollIndicator={false}>
              {COMMON_ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={styles.roleItem}
                  onPress={() => handleConfirmRole(role)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleItemText}>{role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.customRoleBox}>
              <TextInput
                style={styles.customRoleInput}
                placeholder="Or specify custom role..."
                placeholderTextColor={colors.textDisabled}
                value={customRoleInput}
                onChangeText={setCustomRoleInput}
              />
              <AppButton
                title="Confirm"
                size="sm"
                variant="primary"
                disabled={!customRoleInput.trim()}
                onPress={() => handleConfirmRole(customRoleInput.trim())}
              />
            </View>

            <AppButton
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => {
                setRoleModalVisible(false);
                setSelectedStaffForRole(null);
              }}
              style={{ marginTop: spacing.xs }}
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
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  card: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  emptyAssignedBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  emptyAssignedText: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    textAlign: "center",
  },
  assignedList: {
    gap: spacing.xs,
  },
  assignedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  assignedAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.white,
  },
  assignedName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  assignedRoleText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "500",
  },
  removeBtn: {
    padding: 6,
  },
  rosterSectionHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  rosterHeading: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  rosterSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    marginTop: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.foreground,
  },
  staffGrid: {
    gap: spacing.xs,
  },
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  memberCardAssigned: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  memberTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  memberName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  memberPosition: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
  memberBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  memberCount: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
  },
  toggleCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCheckActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.base,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: "100%",
    maxHeight: "80%",
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  roleList: {
    maxHeight: 220,
    marginBottom: spacing.sm,
  },
  roleItem: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  roleItemText: {
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    fontWeight: "500",
  },
  customRoleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  customRoleInput: {
    flex: 1,
    height: 38,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
});

export default AssignStaffModal;
