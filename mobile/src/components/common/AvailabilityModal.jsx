import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarOff,
  Trash2,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import staffApi from "../../api/staff";
import AppButton from "./AppButton";
import Card from "./Card";
import AppDialog from "./AppDialog";
import { confirmAction, showAlertDialog } from "../../context/DialogContext";
import InAppNotificationBanner, { showInAppNotification } from "./InAppNotificationBanner";

const toDateKey = (date) => {
  if (!date) return "";
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  const key = toDateKey(dateStr);
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return String(dateStr);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const QUICK_PRESETS = [
  "Day Off",
  "Personal Leave",
  "Personal Appointment",
  "Staff Training",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_ARRAY = Object.freeze([]);

export const AvailabilityModal = ({
  visible,
  onClose,
  initialMonth,
  initialUnavailable = EMPTY_ARRAY,
  assignments = EMPTY_ARRAY,
  onSave,
  userRole = "staff",
}) => {
  const insets = useSafeAreaInsets();
  const api = userRole === "manager" ? managerApi : staffApi;

  const [activeTab, setActiveTab] = useState("form"); // "form" | "saved"
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return initialMonth ? new Date(initialMonth) : new Date();
  });
  const [selectedDates, setSelectedDates] = useState([]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Saved records
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialUnavailableRef = useRef(initialUnavailable);
  useEffect(() => {
    initialUnavailableRef.current = initialUnavailable;
  }, [initialUnavailable]);

  const monthString = useMemo(() => {
    const yr = calendarMonth.getFullYear();
    const mo = String(calendarMonth.getMonth() + 1).padStart(2, "0");
    return `${yr}-${mo}`;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarMonth]);

  // Load saved availability records from server
  const loadSavedRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const data = await api.getAvailability("", { upcoming: "true" });
      if (data?.records && Array.isArray(data.records)) {
        setRecords(
          data.records
            .filter((r) => Boolean(r && (r.date || r._id)))
            .map((r, idx) => ({
              _id: r._id || `temp-${idx}`,
              date: toDateKey(r.date),
              reason: r.reason || "",
            }))
        );
      } else if (data?.unavailable && Array.isArray(data.unavailable)) {
        setRecords(
          data.unavailable.map((d, idx) => ({
            _id: typeof d === "object" ? d._id || `temp-${idx}` : `temp-${idx}`,
            date: toDateKey(typeof d === "string" ? d : d.date || ""),
            reason: typeof d === "object" ? d.reason || "" : "",
          }))
        );
      }
    } catch {
      const fallback = initialUnavailableRef.current;
      if (Array.isArray(fallback)) {
        setRecords(
          fallback.map((d, idx) => ({
            _id: typeof d === "object" ? d._id || `init-${idx}` : `init-${idx}`,
            date: toDateKey(typeof d === "string" ? d : d.date || ""),
            reason: typeof d === "object" ? d.reason || "" : "",
          }))
        );
      }
    } finally {
      setLoadingRecords(false);
    }
  }, [api]);

  // Set of dates already saved as unavailable in normalized YYYY-MM-DD
  const savedUnavailableDatesSet = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      const k = toDateKey(r.date);
      if (k) set.add(k);
    });
    return set;
  }, [records]);

  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      loadSavedRecords();
      setSelectedDates([]);
      setReason("");
      setActiveTab("form");
      if (initialMonth) {
        const d = new Date(initialMonth);
        if (!isNaN(d.getTime())) {
          setCalendarMonth(d);
        }
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, loadSavedRecords, initialMonth]);

  // Android hardware back-button handling
  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      if (dialogConfig?.visible) {
        if (!isDeleting) {
          setDialogConfig(null);
        }
        return true;
      }
      if (onClose) {
        onClose();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [visible, dialogConfig, isDeleting, onClose]);

  // Assigned dates lookup
  const assignedDatesSet = useMemo(() => {
    const set = new Set();
    assignments.forEach((a) => {
      const rawDate = a.date || a.event_date;
      if (rawDate) {
        set.add(toDateKey(rawDate));
      }
    });
    return set;
  }, [assignments]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, key: `empty-${i}` });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        key: dateKey,
        dateKey,
      });
    }

    return days;
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleToggleDate = (dateKey) => {
    if (!dateKey) return;

    // 1. Check if date has a confirmed shift assignment
    if (assignedDatesSet.has(dateKey)) {
      setDialogConfig({
        visible: true,
        title: "Confirmed Shift Assigned",
        message:
          "You have a confirmed event assigned on this day. Please contact your manager if you have an emergency.",
        tone: "warning",
        icon: Clock,
        confirmText: "Understood",
        cancelText: null,
      });
      return;
    }

    // 2. Check if date is already marked as unavailable in saved records
    if (savedUnavailableDatesSet.has(dateKey)) {
      const existing = records.find((r) => toDateKey(r.date) === dateKey);
      const reasonDetail = existing?.reason ? ` (Reason: ${existing.reason})` : "";
      setDialogConfig({
        visible: true,
        title: "Date Already Unavailable",
        message: `${formatDateDisplay(dateKey)} is already marked as unavailable in your saved off-duty schedule${reasonDetail}.`,
        tone: "info",
        icon: CalendarOff,
        confirmText: "Understood",
        cancelText: null,
      });
      return;
    }

    // 3. Toggle date selection for current session (prevents duplicates)
    setSelectedDates((prev) => {
      if (prev.includes(dateKey)) {
        return prev.filter((d) => d !== dateKey);
      } else {
        return [...prev, dateKey];
      }
    });
  };

  const handleSave = async () => {
    if (submitting) return;

    if (selectedDates.length === 0) {
      setDialogConfig({
        visible: true,
        title: "No Dates Selected",
        message: "Please tap one or more calendar dates to mark as off-duty before saving.",
        tone: "info",
        icon: CalendarOff,
        confirmText: "Got It",
        cancelText: null,
      });
      return;
    }

    // Deduplicate and filter out any dates already in saved records
    const uniqueSelectedDates = Array.from(new Set(selectedDates.map(toDateKey).filter(Boolean)));
    const freshDates = uniqueSelectedDates.filter((d) => !savedUnavailableDatesSet.has(d));

    if (freshDates.length === 0) {
      setDialogConfig({
        visible: true,
        title: "Dates Already Saved",
        message: "All selected dates are already marked as unavailable in your saved off-duty schedule.",
        tone: "info",
        icon: CalendarOff,
        confirmText: "Understood",
        cancelText: null,
      });
      setSelectedDates([]);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        dates: freshDates,
        reason: reason.trim() || "Day Off",
      };

      await api.setAvailability(payload);
      showInAppNotification({
        title: "Availability Saved",
        message: `${freshDates.length} off-duty ${freshDates.length === 1 ? "date" : "dates"} saved successfully.`,
        type: "success",
      });
      if (onSave) {
        onSave(payload, freshDates);
      }
      await loadSavedRecords();
      setSelectedDates([]);
      setReason("");
      setActiveTab("saved");
    } catch (err) {
      setDialogConfig({
        visible: true,
        title: "Update Failed",
        message: err.response?.data?.message || "Failed to update availability schedule. Please try again.",
        tone: "destructive",
        confirmText: "Dismiss",
        cancelText: null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = (record) => {
    if (!record || deletingId || isDeleting) return;

    const formattedDate = formatDateDisplay(record.date);

    setDialogConfig({
      visible: true,
      title: "Remove Off-Duty Date",
      message: `Are you sure you want to remove off-duty status for ${formattedDate} and mark this day as available again?`,
      tone: "destructive",
      icon: Trash2,
      confirmText: "Remove Date",
      cancelText: "Keep Date",
      loading: false,
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          setDeletingId(record._id || record.date);

          const hasValidId =
            record._id &&
            !String(record._id).startsWith("temp-") &&
            !String(record._id).startsWith("init-");

          if (hasValidId) {
            await api.removeAvailability(record._id, { params: { date: record.date } });
          } else {
            await api.removeAvailability("", { params: { date: record.date } });
          }

          // Successfully removed from backend: remove from local state
          setRecords((prev) =>
            prev.filter((r) => {
              if (hasValidId && r._id === record._id) return false;
              return toDateKey(r.date) !== toDateKey(record.date);
            })
          );

          if (onSave) {
            onSave({ refreshOnly: true });
          }

          // Close confirmation dialog
          setDialogConfig(null);

          // Success notification feedback
          showInAppNotification({
            title: "Off-Duty Date Removed",
            message: `${formattedDate} is now marked as available.`,
            type: "success",
          });

          // Refresh in background
          loadSavedRecords();
        } catch (err) {
          setDialogConfig({
            visible: true,
            title: "Could Not Remove Date",
            message:
              err.response?.data?.message ||
              "Failed to remove availability record. Please try again.",
            tone: "destructive",
            confirmText: "Dismiss",
            cancelText: null,
            onConfirm: () => setDialogConfig(null),
          });
        } finally {
          setIsDeleting(false);
          setDeletingId(null);
        }
      },
      onCancel: () => {
        // Canceling leaves saved date unchanged
        setDialogConfig(null);
      },
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Backdrop dismiss tap area */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTapArea} />
        </TouchableWithoutFeedback>

        {/* Bottom sheet card */}
        <View
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <View style={styles.iconCircle}>
                  <CalendarDays size={18} color={colors.primary} />
                </View>
                <Text style={styles.title}>Set My Availability</Text>
              </View>
              <Text style={styles.subtitle}>
                Record personal off-duty dates and view your blackout schedule
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.foregroundMuted} />
            </TouchableOpacity>
          </View>

          {/* Segmented Controls */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "form" && styles.tabBtnActive]}
              onPress={() => setActiveTab("form")}
              activeOpacity={0.8}
            >
              <CalendarOff size={15} color={activeTab === "form" ? colors.primary : colors.textSubtle} />
              <Text style={[styles.tabBtnText, activeTab === "form" && styles.tabBtnTextActive]}>
                Set Dates Off {selectedDates.length > 0 ? `(${selectedDates.length})` : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "saved" && styles.tabBtnActive]}
              onPress={() => setActiveTab("saved")}
              activeOpacity={0.8}
            >
              <Clock size={15} color={activeTab === "saved" ? colors.primary : colors.textSubtle} />
              <Text style={[styles.tabBtnText, activeTab === "saved" && styles.tabBtnTextActive]}>
                Saved Off-Duty ({records.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "form" ? (
              <View style={styles.formSection}>
                {/* Month navigation */}
                <View style={styles.monthNav}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.7}>
                    <ChevronLeft size={20} color={colors.foregroundDark} />
                  </TouchableOpacity>
                  <Text style={styles.monthLabelText}>{monthLabel}</Text>
                  <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} activeOpacity={0.7}>
                    <ChevronRight size={20} color={colors.foregroundDark} />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w) => (
                    <Text key={w} style={styles.weekdayText}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Days grid */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((d) => {
                    if (!d.dayNumber) {
                      return <View key={d.key} style={styles.emptyDayCell} />;
                    }

                    const isSelected = selectedDates.includes(d.dateKey);
                    const isAssigned = assignedDatesSet.has(d.dateKey);
                    const isSavedOff = savedUnavailableDatesSet.has(d.dateKey);
                    const isToday = toDateKey(new Date()) === d.dateKey;

                    return (
                      <TouchableOpacity
                        key={d.key}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isSavedOff && !isSelected && styles.dayCellSavedOff,
                          isAssigned && styles.dayCellAssigned,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => handleToggleDate(d.dateKey)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            isSelected && styles.dayNumberSelected,
                            isSavedOff && !isSelected && styles.dayNumberSavedOff,
                            isAssigned && styles.dayNumberAssigned,
                          ]}
                        >
                          {d.dayNumber}
                        </Text>
                        {isAssigned && (
                          <View style={styles.assignedDot} />
                        )}
                        {!isAssigned && isSavedOff && (
                          <View style={styles.savedDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Selected</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#F43F5E" }]} />
                    <Text style={styles.legendText}>Off-Duty</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                    <Text style={styles.legendText}>Assigned</Text>
                  </View>
                </View>

                {/* Reason Presets */}
                <View style={styles.reasonSection}>
                  <Text style={styles.inputLabel}>Reason / Tag (Optional)</Text>
                  <View style={styles.presetsWrap}>
                    {QUICK_PRESETS.map((preset) => {
                      const isChosen = reason === preset;
                      return (
                        <TouchableOpacity
                          key={preset}
                          style={[styles.presetChip, isChosen && styles.presetChipActive]}
                          onPress={() => setReason(isChosen ? "" : preset)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isChosen && styles.presetChipTextActive,
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    style={styles.textInput}
                    placeholder="Or type a custom note..."
                    placeholderTextColor={colors.textDisabled}
                    value={reason}
                    onChangeText={setReason}
                    maxLength={100}
                  />
                </View>

                <AppButton
                  title={submitting ? "Saving Schedule..." : `Save ${selectedDates.length > 0 ? `${selectedDates.length} ` : ""}Off-Duty Date${selectedDates.length === 1 ? "" : "s"}`}
                  variant="primary"
                  onPress={handleSave}
                  disabled={submitting || selectedDates.length === 0}
                  style={styles.saveBtn}
                />
              </View>
            ) : (
              <View style={styles.savedSection}>
                {loadingRecords ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loaderText}>Loading saved schedule...</Text>
                  </View>
                ) : records.length === 0 ? (
                  <Card style={styles.emptySavedCard} variant="flat">
                    <CalendarDays size={32} color={colors.textDisabled} />
                    <Text style={styles.emptySavedTitle}>No Off-Duty Dates Recorded</Text>
                    <Text style={styles.emptySavedSubtitle}>
                      You currently have no blackout dates recorded. Tap "Set Dates Off" to add your planned unavailable dates.
                    </Text>
                  </Card>
                ) : (
                  <View style={styles.recordsList}>
                    {records.map((r, idx) => (
                      <View key={r._id || idx} style={styles.recordCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recordDateText}>{formatDateDisplay(r.date)}</Text>
                          <Text style={styles.recordReasonText}>
                            {r.reason ? `Reason: ${r.reason}` : "Marked Unavailable"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteRecord(r)}
                          disabled={isDeleting || deletingId === (r._id || r.date)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove off-duty date for ${formatDateDisplay(r.date)}`}
                        >
                          {deletingId === (r._id || r.date) ? (
                            <ActivityIndicator size="small" color={colors.error} />
                          ) : (
                            <Trash2 size={16} color={colors.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        {/* In-Modal Notification Banner (Above bottom sheet and backdrop) */}
        <InAppNotificationBanner inModal />

        {/* In-Modal Dialog Overlay Layer (Independent of bottom sheet layout) */}
        {dialogConfig?.visible ? (
          <AppDialog
            inline
            visible={Boolean(dialogConfig?.visible)}
            title={dialogConfig.title}
            message={dialogConfig.message}
            tone={dialogConfig.tone || "primary"}
            icon={dialogConfig.icon}
            highlight={dialogConfig.highlight}
            confirmText={dialogConfig.confirmText || "Confirm"}
            cancelText={dialogConfig.cancelText}
            loading={dialogConfig.loading || isDeleting}
            dismissOnBackdrop={dialogConfig.dismissOnBackdrop !== false && !isDeleting}
            onConfirm={dialogConfig.onConfirm || (() => setDialogConfig(null))}
            onCancel={dialogConfig.onCancel || (() => setDialogConfig(null))}
            onClose={() => setDialogConfig(null)}
          >
            {dialogConfig.children}
          </AppDialog>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  backdropTapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: "90%",
    minHeight: 520,
    overflow: "hidden",
    ...shadows.xl,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.powder,
  },
  tabsContainer: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: colors.powder,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.xs,
  },
  tabBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  formSection: {
    gap: spacing.md,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  navBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.powder,
  },
  monthLabelText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  weekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textDisabled,
    textTransform: "uppercase",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    rowGap: 6,
  },
  emptyDayCell: {
    width: 38,
    height: 42,
  },
  dayCell: {
    width: 38,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dayCellToday: {
    borderColor: colors.foregroundMuted,
  },
  dayCellSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  dayCellSavedOff: {
    backgroundColor: "#FFE4E6",
    borderColor: "#FDA4AF",
  },
  dayCellAssigned: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  dayNumberText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundDark,
  },
  dayNumberSelected: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
  },
  dayNumberSavedOff: {
    color: "#BE123C",
    fontFamily: typography.fontFamilies.bold,
  },
  dayNumberAssigned: {
    color: "#92400E",
    fontFamily: typography.fontFamilies.bold,
  },
  assignedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D97706",
    marginTop: 2,
  },
  savedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E11D48",
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  reasonSection: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  presetsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.powder,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundDark,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  savedSection: {
    paddingTop: spacing.xs,
  },
  loaderWrap: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  loaderText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  emptySavedCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  emptySavedTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
    marginTop: spacing.xs,
  },
  emptySavedSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  recordsList: {
    gap: spacing.sm,
  },
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  recordDateText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundDark,
  },
  recordReasonText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AvailabilityModal;
