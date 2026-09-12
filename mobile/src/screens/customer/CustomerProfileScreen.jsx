import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  User,
  Lock,
  LogOut,
  ChevronRight,
  X,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Utensils,
  Camera,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/auth";
import { evaluatePassword, describePasswordGap } from "../../utils/passwordPolicy";
import SignOutConfirmModal from "../../components/common/SignOutConfirmModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const CustomerProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Help Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);

  // User Initials Calculation
  const userInitials = React.useMemo(() => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.first_name) {
      return user.first_name.slice(0, 2).toUpperCase();
    }
    if (user?.full_name) {
      const parts = user.full_name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "CU";
  }, [user]);

  const displayName = React.useMemo(() => {
    if (user?.first_name) {
      return `${user.first_name} ${user.last_name || ""}`.trim();
    }
    return user?.full_name || "Valued Customer";
  }, [user]);

  const handleOpenEdit = () => {
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
    setPhone(user?.phone || "");
    setAddress(user?.address || "");
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert("Validation", "First name is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      updateUser(updated);
      setShowEditModal(false);
      Alert.alert("Success", "Your profile details have been updated.");
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update profile details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Validation", "Please enter your current password.");
      return;
    }
    const { isValid } = evaluatePassword(newPassword);
    if (!isValid) {
      Alert.alert("Password Policy", describePasswordGap(newPassword));
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
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to change password."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* 1. Caezelle's Signature Royal Blue Header Banner */}
      <View
        style={[
          styles.headerBanner,
          { paddingTop: insets.top + (Platform.OS === "ios" ? 10 : 16) },
        ]}
      >
        {/* Top Bar with Brand & Help Pill */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandTitleWrap}>
            <View style={styles.goldBrandDot} />
            <Text style={styles.headerBrandText}>iReserve • Caezelle's</Text>
          </View>

          <TouchableOpacity
            style={styles.helpPill}
            onPress={() => setShowHelpModal(true)}
            activeOpacity={0.8}
          >
            <HelpCircle size={14} color={colors.primaryDark} style={{ marginRight: 4 }} />
            <Text style={styles.helpPillText}>Help</Text>
          </TouchableOpacity>
        </View>

        {/* User Card Area (Initials Avatar + Name + Subtitle + Chevron) */}
        <TouchableOpacity
          style={styles.userBannerRow}
          onPress={handleOpenEdit}
          activeOpacity={0.85}
        >
          {/* Avatar Circle with Luxury Gold Border & Initials */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{userInitials}</Text>
          </View>

          {/* User Name & Details */}
          <View style={styles.userInfoWrap}>
            <Text style={styles.userNameText} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.userSubtitleText} numberOfLines={1}>
              {user?.email || "Manage catering account & preferences"}
            </Text>
          </View>

          {/* Right Chevron */}
          <ChevronRight size={22} color="rgba(255, 255, 255, 0.85)" />
        </TouchableOpacity>
      </View>

      {/* 2. White Curved Profile Sheet */}
      <View style={styles.sheetContainer}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 96 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Sheet Header */}
          <Text style={styles.sheetTitle}>Profile</Text>

          {/* Navigation Rows List */}
          <View style={styles.menuList}>
            {/* 1. Account */}
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={handleOpenEdit}
              activeOpacity={0.65}
            >
              <View style={styles.menuIconWrap}>
                <User size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Account</Text>
              <ChevronRight size={18} color={colors.textDisabled} />
            </TouchableOpacity>

            {/* 2. Password & Security */}
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.65}
            >
              <View style={styles.menuIconWrap}>
                <Lock size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Password & Security</Text>
              <ChevronRight size={18} color={colors.textDisabled} />
            </TouchableOpacity>

            {/* 3. Banquet Menu */}
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => navigation.navigate("Menu")}
              activeOpacity={0.65}
            >
              <View style={styles.menuIconWrap}>
                <Utensils size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Banquet Menu & Dishes</Text>
              <ChevronRight size={18} color={colors.textDisabled} />
            </TouchableOpacity>

            {/* 4. Event Gallery */}
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => navigation.navigate("Gallery")}
              activeOpacity={0.65}
            >
              <View style={styles.menuIconWrap}>
                <Camera size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemLabel}>Event Styling & Gallery</Text>
              <ChevronRight size={18} color={colors.textDisabled} />
            </TouchableOpacity>

            {/* 5. Sign Out */}
            <TouchableOpacity
              style={[styles.menuItemRow, styles.logoutRow]}
              onPress={handleLogout}
              activeOpacity={0.65}
            >
              <View style={[styles.menuIconWrap, styles.logoutIconWrap]}>
                <LogOut size={20} color={colors.error} />
              </View>
              <Text style={styles.logoutLabel}>Sign Out</Text>
              <ChevronRight size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* --- MODAL: Edit Profile --- */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Details</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
              />
              <AppInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
              />
              <AppInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 0917 123 4567"
                keyboardType="phone-pad"
              />
              <AppInput
                label="Event / Billing Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Enter street, city, province"
                multiline
              />

              <AppButton
                title="Save Changes"
                onPress={handleSaveProfile}
                loading={saving}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL: Change Password --- */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
              <AppInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                secureTextEntry
              />
              <AppInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                secureTextEntry
              />

              <AppButton
                title="Update Password"
                onPress={handleChangePassword}
                loading={passwordSaving}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL: Help & Support Menu --- */}
      <Modal
        visible={showHelpModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How can we help you?</Text>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.helpActionCard}
              onPress={() => {
                setShowHelpModal(false);
                navigation.navigate("CustomerMessages");
              }}
            >
              <View style={[styles.helpIconCircle, { backgroundColor: colors.primaryLight }]}>
                <MessageSquare size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helpActionTitle}>Chat with Banquet Team</Text>
                <Text style={styles.helpActionSub}>
                  Direct messaging with our reservation specialists
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textDisabled} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpActionCard}
              onPress={() => {
                setShowHelpModal(false);
                navigation.navigate("ZelleChat");
              }}
            >
              <View style={[styles.helpIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Sparkles size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helpActionTitle}>Ask Zelle AI Assistant</Text>
                <Text style={styles.helpActionSub}>
                  Instant answers on pricing, dishes & packages
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title="Sign Out of iReserve?"
        message="Are you sure you want to sign out? You will need your credentials to access your inquiries, quotations, and catering reservations."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },

  // --- Header Banner (Crisp Royal Blue & Gold Brand) ---
  headerBanner: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  goldBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentGold,
    marginRight: 8,
  },
  headerBrandText: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.2,
  },
  helpPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  helpPillText: {
    color: colors.primaryDark,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    fontSize: 12,
  },

  // User Card Row
  userBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.accentGold,
  },
  avatarInitials: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  userInfoWrap: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  userNameText: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.white,
    lineHeight: 24,
  },
  userSubtitleText: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.regular,
    color: "rgba(255, 255, 255, 0.82)",
    marginTop: 2,
  },

  // --- Curved White Sheet ---
  sheetContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  sheetTitle: {
    fontSize: 26,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.foregroundDark,
    marginBottom: 12,
  },

  // --- Menu Rows ---
  menuList: {
    marginTop: 4,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamilies.medium,
    fontWeight: "500",
    color: colors.foregroundDark,
  },
  logoutRow: {
    borderBottomWidth: 0,
    marginTop: 12,
    paddingVertical: 16,
  },
  logoutIconWrap: {
    backgroundColor: colors.errorLight,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.error,
  },

  // --- Modal Overlay & Box ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },

  // Help Action Cards
  helpActionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  helpIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  helpActionTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 2,
  },
  helpActionSub: {
    fontSize: 12,
    color: colors.foregroundMuted,
  },
});

export default CustomerProfileScreen;
