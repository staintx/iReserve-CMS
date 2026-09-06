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
  Mail,
  Phone,
  MapPin,
  Lock,
  LogOut,
  ChevronRight,
  Shield,
  FileText,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/auth";

export const CustomerProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);

  // Change Password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      updateUser(updated);
      setIsEditing(false);
      Alert.alert("Success", "Your profile details have been updated.");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Validation", "Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password Updated", "Your password has been changed successfully.");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      await logout();
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="My Profile" showBack={false} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Hero Badge */}
        <Card style={styles.heroCard} variant="flat">
          <View style={styles.avatarCircle}>
            <User size={36} color={colors.primary} />
          </View>
          <Text style={styles.heroName}>
            {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : user?.full_name || "Customer"}
          </Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </Card>

        {/* Profile Details Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={styles.editBtnText}>{isEditing ? "Cancel" : "Edit"}</Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={{ marginTop: spacing.sm }}>
              <AppInput label="First Name" value={firstName} onChangeText={setFirstName} />
              <AppInput label="Last Name" value={lastName} onChangeText={setLastName} />
              <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <AppInput label="Address" value={address} onChangeText={setAddress} />
              <AppButton
                title="Save Changes"
                onPress={handleSaveProfile}
                loading={saving}
                size="md"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          ) : (
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Mail size={16} color={colors.foregroundMuted} />
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{user?.email || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Phone size={16} color={colors.foregroundMuted} />
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{user?.phone || "Not set"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MapPin size={16} color={colors.foregroundMuted} />
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{user?.address || "Not set"}</Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Security / Password Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Security & Credentials</Text>
          {showPasswordModal ? (
            <View style={{ marginTop: spacing.sm }}>
              <AppInput
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
              <AppInput
                label="New Password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <AppInput
                label="Confirm New Password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <View style={{ flexDirection: "row", marginTop: spacing.sm }}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowPasswordModal(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                  size="md"
                />
                <AppButton
                  title="Update"
                  onPress={handleChangePassword}
                  loading={passwordSaving}
                  style={{ flex: 1 }}
                  size="md"
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.menuActionRow}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.7}
            >
              <Lock size={18} color={colors.foreground} />
              <Text style={styles.menuActionText}>Change Password</Text>
              <ChevronRight size={18} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={colors.error} style={{ marginRight: spacing.sm }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 130,
  },
  heroCard: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderFocus,
  },
  heroName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  heroEmail: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    textTransform: "uppercase",
    color: colors.foregroundMuted,
    letterSpacing: 0.5,
  },
  editBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  detailsList: {
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailTextWrapper: {
    marginLeft: spacing.md,
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    fontFamily: typography.fontFamily.medium,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    marginTop: 1,
  },
  menuActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  menuActionText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.foreground,
    marginLeft: spacing.md,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radius.pill,
    height: 52,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
});

export default CustomerProfileScreen;
