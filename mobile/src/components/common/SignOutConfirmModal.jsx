import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LogOut } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export const SignOutConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  title = "Sign Out?",
  message = "Are you sure you want to sign out? You will need to sign back in to access your inquiries, quotations, and reservations.",
  confirmText = "Sign Out",
  cancelText = "Stay Signed In",
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.dialogCard}>
              {/* Logout Icon Badge */}
              <View style={styles.iconCircle}>
                <View style={styles.iconInner}>
                  <LogOut size={26} color={colors.error || "#EF4444"} />
                </View>
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Action Buttons */}
              <View style={styles.buttonCol}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirm}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LogOut size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmBtnText}>{confirmText}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl || 28,
    paddingBottom: spacing.xl,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
      },
    }),
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.errorLight || "#FEF2F2",
    borderWidth: 1.5,
    borderColor: colors.errorBorder || "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: colors.error || "#EF4444",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 6px rgba(239, 68, 68, 0.15)",
      },
    }),
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundDark,
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  buttonCol: {
    width: "100%",
    gap: spacing.sm,
  },
  confirmBtn: {
    width: "100%",
    height: 48,
    backgroundColor: colors.error || "#EF4444",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: colors.error || "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
      },
    }),
  },
  confirmBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  cancelBtn: {
    width: "100%",
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: Platform.select({ ios: "600", android: undefined }),
    color: colors.foregroundDark,
  },
});

export default SignOutConfirmModal;
