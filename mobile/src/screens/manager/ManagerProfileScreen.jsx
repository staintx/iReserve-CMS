import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  User,
  Calendar,
  LogOut,
  Bell,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  FileCheck2,
  HelpCircle,
  RotateCcw,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useOnboarding } from "../../context/OnboardingContext";
import Card from "../../components/common/Card";
import SignOutConfirmModal from "../../components/common/SignOutConfirmModal";
import AvailabilityModal from "../../components/common/AvailabilityModal";
import { initialsOf } from "../../utils/format";
import { showAlertDialog } from "../../context/DialogContext";

export const ManagerProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { replayOnboarding, resetCoachMarks } = useOnboarding();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const initials = initialsOf(user?.full_name || user?.email, "MG");

  const handleReplayTour = () => {
    replayOnboarding();
  };

  const handleResetCoachMarks = async () => {
    await resetCoachMarks();
    showAlertDialog({
      title: "Feature Guides Reset",
      message:
        "First-time coach mark tips and guidance will be displayed again as you navigate manager operations.",
      tone: "info",
      confirmText: "Got It",
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manager Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{user?.full_name || "Event Manager"}</Text>
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color="#D97706" />
              <Text style={styles.roleText}>
                {user?.position || "Event Lead Coordinator"}
              </Text>
            </View>

            {user?.email && (
              <View style={styles.detailRow}>
                <Mail size={13} color={colors.textSubtle} />
                <Text style={styles.detailText}>{user.email}</Text>
              </View>
            )}

            {user?.phone && (
              <View style={styles.detailRow}>
                <Phone size={13} color={colors.textSubtle} />
                <Text style={styles.detailText}>{user.phone}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Quick Operations Menu */}
        <Text style={styles.sectionHeading}>Operations & Schedule</Text>
        <Card style={styles.menuCard} padding="none">
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowAvailabilityModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Calendar size={18} color="#4C81E0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Monthly Availability</Text>
              <Text style={styles.menuSub}>Manage blackout dates and off-duty schedule</Text>
            </View>
            <ChevronRight size={18} color={colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("ManagerBookings")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <FileCheck2 size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Managed Bookings</Text>
              <Text style={styles.menuSub}>Upcoming & completed catering events</Text>
            </View>
            <ChevronRight size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        </Card>

        {/* Help & First-Time Experience */}
        <Text style={styles.sectionHeading}>Help & First-Time Experience</Text>
        <Card style={styles.menuCard} padding="none">
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleReplayTour}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: "#F0FDF4" }]}>
              <HelpCircle size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Revisit Welcome Tour</Text>
              <Text style={styles.menuSub}>Replay the manager onboarding walkthrough</Text>
            </View>
            <ChevronRight size={18} color={colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleResetCoachMarks}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: colors.powder }]}>
              <RotateCcw size={18} color={colors.foregroundMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Reset Interactive Tips</Text>
              <Text style={styles.menuSub}>Show coach mark guidance again</Text>
            </View>
            <ChevronRight size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        </Card>

        {/* General Settings */}
        <Text style={styles.sectionHeading}>Preferences</Text>
        <Card style={styles.menuCard} padding="none">
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Bell size={18} color="#4C81E0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSub}>Event updates and operational alerts</Text>
            </View>
            <ChevronRight size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        </Card>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out of Manager Portal</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Caezelle's Catering Mobile v1.0.0 (Manager Build)</Text>
      </ScrollView>

      {/* Availability Modal */}
      <AvailabilityModal
        visible={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        userRole="manager"
      />

      {/* Logout Modal */}
      <SignOutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110, // dock clearance
    gap: spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.bold,
    color: "#4C81E0",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: "flex-start",
    marginVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: "#D97706",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  menuSub: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 56,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    marginTop: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.error,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
});

export default ManagerProfileScreen;
