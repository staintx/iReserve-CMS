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
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CreditCard,
  Calendar,
  Sparkles,
  X,
  Clock,
  Trash2,
  Lock,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const getToneConfig = (tone = "primary") => {
  switch (tone) {
    case "destructive":
    case "danger":
      return {
        iconBg: colors.errorLight || "#FEF2F2",
        iconBorder: colors.errorBorder || "#FECACA",
        iconColor: colors.error || "#DC2626",
        confirmBtnBg: colors.error || "#DC2626",
        confirmBtnText: "#FFFFFF",
        badgeBg: "#FEE2E2",
        badgeText: "#991B1B",
        DefaultIcon: AlertTriangle,
      };
    case "warning":
      return {
        iconBg: colors.warningLight || "#FFFBEB",
        iconBorder: colors.warningBorder || "#FDE68A",
        iconColor: colors.warning || "#D97706",
        confirmBtnBg: colors.warningDark || "#B45309",
        confirmBtnText: "#FFFFFF",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
        DefaultIcon: AlertCircle,
      };
    case "success":
      return {
        iconBg: colors.successLight || "#ECFDF5",
        iconBorder: colors.successBorder || "#A7F3D0",
        iconColor: colors.success || "#059669",
        confirmBtnBg: colors.success || "#059669",
        confirmBtnText: "#FFFFFF",
        badgeBg: "#D1FAE5",
        badgeText: "#065F46",
        DefaultIcon: CheckCircle2,
      };
    case "info":
      return {
        iconBg: colors.infoLight || "#EFF6FF",
        iconBorder: colors.infoBorder || "#BFDBFE",
        iconColor: colors.info || "#2563EB",
        confirmBtnBg: colors.info || "#2563EB",
        confirmBtnText: "#FFFFFF",
        badgeBg: "#DBEAFE",
        badgeText: "#1E40AF",
        DefaultIcon: Info,
      };
    case "primary":
    default:
      return {
        iconBg: colors.primaryLight || "#EFF6FF",
        iconBorder: colors.primaryBorder || "#BFDBFE",
        iconColor: colors.primary || "#4C81E0",
        confirmBtnBg: colors.primary || "#4C81E0",
        confirmBtnText: "#FFFFFF",
        badgeBg: "#EFF6FF",
        badgeText: colors.primaryDark || "#1E3A8A",
        DefaultIcon: CheckCircle2,
      };
  }
};

export const AppDialog = ({
  visible,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  tone = "primary",
  icon: CustomIcon,
  highlight,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading: externalLoading = false,
  dismissOnBackdrop = true,
  inline = false,
  children,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading || internalLoading;

  const toneConfig = getToneConfig(tone);
  const IconComponent = CustomIcon || toneConfig.DefaultIcon;

  const handleConfirm = async () => {
    if (isLoading) return;
    if (!onConfirm) {
      if (onClose) onClose();
      return;
    }

    try {
      setInternalLoading(true);
      const res = onConfirm();
      if (res && typeof res.then === "function") {
        await res;
      }
      if (onClose) onClose();
    } catch (err) {
      console.warn("AppDialog onConfirm error:", err);
    } finally {
      setInternalLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    if (isLoading || !dismissOnBackdrop) return;
    handleCancel();
  };

  const renderHighlight = () => {
    if (!highlight) return null;

    if (React.isValidElement(highlight)) {
      return <View style={styles.highlightWrapper}>{highlight}</View>;
    }

    if (typeof highlight === "object") {
      const { label, value, badge, details } = highlight;
      return (
        <View style={styles.highlightCard}>
          {badge ? (
            <View style={[styles.badgePill, { backgroundColor: toneConfig.badgeBg }]}>
              <Text style={[styles.badgeText, { color: toneConfig.badgeText }]}>
                {badge}
              </Text>
            </View>
          ) : null}

          {label ? <Text style={styles.highlightLabel}>{label}</Text> : null}
          {value ? <Text style={styles.highlightValue}>{value}</Text> : null}

          {Array.isArray(details) && details.length > 0 ? (
            <View style={styles.detailsList}>
              {details.map((d, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>{d.label}</Text>
                  <Text style={styles.detailRowValue}>{d.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.highlightCard}>
        <Text style={styles.highlightValue}>{String(highlight)}</Text>
      </View>
    );
  };

  if (!visible) return null;

  const dialogContent = (
    <TouchableWithoutFeedback onPress={handleBackdropPress}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
          enabled={false}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.dialogCard}>
              {/* Visual Icon Badge */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: toneConfig.iconBg,
                    borderColor: toneConfig.iconBorder,
                  },
                ]}
              >
                <View style={styles.iconInner}>
                  <IconComponent size={24} color={toneConfig.iconColor} />
                </View>
              </View>

              {/* Dialog Title */}
              {title ? <Text style={styles.title}>{title}</Text> : null}

              {/* Scrollable Content Body to guarantee zero clipping on mobile screens */}
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {message ? <Text style={styles.message}>{message}</Text> : null}

                {renderHighlight()}

                {children}
              </ScrollView>

              {/* Mobile Action Buttons (Thumb-friendly vertical stack) */}
              <View style={styles.buttonCol}>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: toneConfig.confirmBtnBg },
                    isLoading && styles.btnDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={isLoading}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={confirmText}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={toneConfig.confirmBtnText} />
                  ) : (
                    <Text
                      style={[
                        styles.confirmBtnText,
                        { color: toneConfig.confirmBtnText },
                      ]}
                    >
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>

                {cancelText ? (
                  <TouchableOpacity
                    style={[styles.cancelBtn, isLoading && styles.btnDisabled]}
                    onPress={handleCancel}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={cancelText}
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );

  if (inline) {
    return (
      <View style={styles.inlineOverlayRoot} pointerEvents="box-none">
        {dialogContent}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      {dialogContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  inlineOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
    zIndex: 99999,
    elevation: 999,
  },
  keyboardContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCard: {
    width: "100%",
    maxWidth: 384,
    backgroundColor: colors.surface || "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: 28,
    paddingBottom: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight || "#F1F5F9",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.22)",
      },
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08)",
      },
    }),
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundDark || "#0F172A",
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  scrollArea: {
    width: "100%",
    maxHeight: Math.min(280, SCREEN_HEIGHT * 0.38),
    marginBottom: spacing.lg,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: spacing.xxs,
  },
  message: {
    fontSize: typography.sizes.sm || 14,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted || "#4B5563",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  highlightWrapper: {
    width: "100%",
    marginTop: spacing.xs,
  },
  highlightCard: {
    width: "100%",
    backgroundColor: colors.surfaceAlt || "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border || "#E2E8F0",
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  badgePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontSize: typography.sizes.micro || 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  highlightLabel: {
    fontSize: typography.sizes.xs || 12,
    fontFamily: typography.fontFamilies.medium,
    color: colors.textSubtle || "#6B7280",
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: typography.sizes.lg || 18,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundDark || "#0F172A",
    letterSpacing: -0.2,
  },
  detailsList: {
    width: "100%",
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight || "#F1F5F9",
    paddingTop: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  detailRowLabel: {
    fontSize: typography.sizes.xs || 12,
    color: colors.textSubtle || "#6B7280",
  },
  detailRowValue: {
    fontSize: typography.sizes.xs || 12,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark || "#0F172A",
  },
  buttonCol: {
    width: "100%",
    gap: spacing.sm,
  },
  confirmBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
      },
    }),
  },
  confirmBtnText: {
    fontSize: typography.sizes.base || 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    letterSpacing: -0.2,
  },
  cancelBtn: {
    width: "100%",
    height: 48,
    backgroundColor: colors.surfaceAlt || "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border || "#E2E8F0",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: typography.sizes.sm || 14,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: Platform.select({ ios: "600", android: undefined }),
    color: colors.foregroundDark || "#0F172A",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AppDialog;
