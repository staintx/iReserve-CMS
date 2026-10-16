import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import {
  X,
  CreditCard,
  Banknote,
  Check,
  ShieldCheck,
  Lock,
  Calendar,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import { useAppDialog } from "../../context/DialogContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { getPaymentDueDate } from "../../utils/receiptHelpers";

export const PaymentChoiceModal = ({
  visible,
  onClose,
  booking,
  balanceAmount,
  onSuccess,
  onSelectOnline,
}) => {
  const { showAlertDialog } = useAppDialog();
  const [selectedMethod, setSelectedMethod] = useState("online");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current && booking) {
      setSelectedMethod(
        booking?.balance_payment_preference === "in_person" ? "in_person" : "online"
      );
      setNotes(booking?.balance_payment_notes || "");
      setSubmitting(false);
    }
    prevVisibleRef.current = visible;
  }, [visible, booking]);

  if (!visible || !booking) return null;

  const payable = Math.max(0, Number(balanceAmount ?? booking.remaining_balance ?? 0));
  const refCode = booking.reference || (booking._id ? `BK-${booking._id.slice(-6).toUpperCase()}` : "-");
  const dueDate = getPaymentDueDate(booking.event_date);

  const handleProceed = async () => {
    if (payable <= 0) {
      showAlertDialog({
        title: "Balance Settled",
        message: "No remaining balance found for this booking. All dues have been completed.",
        tone: "success",
        confirmText: "Close",
      });
      onClose();
      return;
    }

    if (selectedMethod === "online") {
      onSelectOnline?.(payable);
      onClose();
      return;
    }

    // In-Person Cash Settlement
    setSubmitting(true);
    try {
      await customerApi.setPaymentPreference({
        booking_id: booking._id,
        preference: "in_person",
        notes: notes.trim(),
      });

      showAlertDialog({
        title: "Cash Payment Confirmed",
        message: `In-person payment preference saved. Please prepare ${formatCurrency(
          payable
        )} in cash for your Event Manager after event completion.`,
        tone: "success",
        confirmText: "Done",
        onConfirm: () => onSuccess?.(),
      });
      onClose();
    } catch (err) {
      showAlertDialog({
        title: "Payment Preference Error",
        message: err.response?.data?.message || "Failed to save payment preference. Please try again.",
        tone: "destructive",
        confirmText: "Dismiss",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.sheetContainer}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScrollContent}
            >
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.headerTitle}>Settle Outstanding Balance</Text>
                  <Text style={styles.headerSubtitle}>
                    {booking.event_type || "Catering Event"} • {refCode}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeBtn}
                >
                  <X size={20} color={colors.textSubtle} />
                </TouchableOpacity>
              </View>

              {/* Amount Due Banner */}
              <View style={styles.amountBanner}>
                <View>
                  <Text style={styles.amountBannerLabel}>REMAINING BALANCE DUE</Text>
                  <Text style={styles.amountBannerValue}>{formatCurrency(payable)}</Text>
                </View>
                {dueDate && (
                  <View style={styles.dueDateWrap}>
                    <Calendar size={13} color="#4C81E0" />
                    <Text style={styles.dueDateText}>Due: {formatDate(dueDate)}</Text>
                  </View>
                )}
              </View>

              {/* Payment Method Selector */}
              <View style={styles.methodList}>
                {/* Option 1: Online PayMongo */}
                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    selectedMethod === "online" && styles.methodOptionActive,
                  ]}
                  onPress={() => setSelectedMethod("online")}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.methodRadio,
                      selectedMethod === "online" && styles.methodRadioActive,
                    ]}
                  >
                    {selectedMethod === "online" && <View style={styles.radioDot} />}
                  </View>

                  <View style={styles.methodIconBubble}>
                    <CreditCard size={20} color="#4C81E0" />
                  </View>

                  <View style={styles.methodTextWrap}>
                    <Text style={styles.methodTitle}>Pay Online (PayMongo)</Text>
                    <Text style={styles.methodSubtitle}>
                      GCash, Maya, Debit / Credit Card
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: In-Person Cash */}
                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    selectedMethod === "in_person" && styles.methodOptionActive,
                  ]}
                  onPress={() => setSelectedMethod("in_person")}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.methodRadio,
                      selectedMethod === "in_person" && styles.methodRadioActive,
                    ]}
                  >
                    {selectedMethod === "in_person" && <View style={styles.radioDot} />}
                  </View>

                  <View style={[styles.methodIconBubble, { backgroundColor: "#F1F5F9" }]}>
                    <Banknote size={20} color={colors.foregroundDark} />
                  </View>

                  <View style={styles.methodTextWrap}>
                    <Text style={styles.methodTitle}>Pay On-Site in Cash</Text>
                    <Text style={styles.methodSubtitle}>
                      Settle with your Event Manager on the day of the event
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* In-Person Note Input if selected */}
              {selectedMethod === "in_person" && (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>Notes for Banquet Team (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="e.g. Will prepare exact cash on event day..."
                    placeholderTextColor={colors.textDisabled}
                    value={notes || ""}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}

              {/* Security Banner */}
              <View style={styles.securityNote}>
                {selectedMethod === "online" ? (
                  <>
                    <Lock size={13} color={colors.success} style={{ marginRight: 6 }} />
                    <Text style={styles.securityNoteText}>
                      256-bit encrypted checkout processed securely via PayMongo
                    </Text>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} color="#4C81E0" style={{ marginRight: 6 }} />
                    <Text style={styles.securityNoteText}>
                      Official printed receipt provided upon cash turnover
                    </Text>
                  </>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.proceedBtn, submitting && { opacity: 0.7 }]}
                onPress={handleProceed}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.proceedBtnText}>
                    {selectedMethod === "online" ? "Proceed to Checkout" : "Confirm Cash Settlement"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
    ...Platform.select({
      web: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      },
    }),
  },
  keyboardAvoid: {
    width: "100%",
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.powder,
    alignItems: "center",
    justifyContent: "center",
  },
  amountBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 14,
  },
  amountBannerLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.textSubtle,
    letterSpacing: 0.5,
  },
  amountBannerValue: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.foregroundDark,
    marginTop: 2,
  },
  dueDateWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: "#4C81E0",
  },
  methodList: {
    gap: 10,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: colors.surface,
  },
  methodOptionActive: {
    borderColor: "#4C81E0",
    backgroundColor: "#F0F7FF",
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodRadioActive: {
    borderColor: "#4C81E0",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4C81E0",
  },
  methodIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodTextWrap: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
  },
  methodSubtitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  notesBlock: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.foregroundDark,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.foregroundDark,
    minHeight: 56,
    textAlignVertical: "top",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 16,
  },
  securityNoteText: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  proceedBtn: {
    backgroundColor: "#4C81E0",
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  proceedBtnText: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.white,
  },
});

export default PaymentChoiceModal;
