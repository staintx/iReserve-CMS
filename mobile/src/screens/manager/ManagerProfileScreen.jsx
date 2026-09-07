import React from "react";
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
  Shield,
  Phone,
  Mail,
  FileCheck2,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";

export const ManagerProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      await logout();
      return;
    }
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out of the manager portal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const initials = (user?.full_name || "Manager")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
              <Shield size={12} color={colors.primary} />
              <Text style={styles.roleText}>
                {user?.position || "Event Operations Manager"}
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
        <Text style={styles.sectionHeading}>Operations & Roster</Text>
        <Card style={styles.menuCard} padding="none">
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("ManagerCalendar")}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Calendar size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Availability & Schedule</Text>
              <Text style={styles.menuSub}>Set your monthly blackout dates</Text>
            </View>
            <ChevronRight size={18} color={colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("ManagerBookings", { tab: "all" })}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: colors.secondaryLight }]}>
              <FileCheck2 size={18} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>All Managed Events</Text>
              <Text style={styles.menuSub}>View past, current, and planned catering</Text>
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
            <View style={[styles.menuIconWrap, { backgroundColor: colors.accentLight }]}>
              <Bell size={18} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSub}>Inquiry alerts and staff assignments</Text>
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
          <Text style={styles.logoutText}>Sign Out of Portal</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Caezelle's Catering Mobile v1.0.0 (Manager Build)</Text>
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.foreground,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 120,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  avatarText: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
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
  menuCard: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    gap: spacing.md,
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
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  menuSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
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
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    marginTop: spacing.md,
  },
  logoutText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  versionText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.textDisabled,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});

export default ManagerProfileScreen;
