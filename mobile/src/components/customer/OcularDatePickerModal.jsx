import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import customerApi from "../../api/customer";
import AppButton from "../common/AppButton";
import { formatDate } from "../../utils/format";
import { getOcularDateLimits, toDateKey } from "../../utils/ocularHelper";

const TIME_SLOTS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const OcularDatePickerModal = ({
  visible,
  onClose,
  onSubmit,
  onSkip,
  booking,
  initialDate = "",
  initialTime = "10:00 AM",
  initialNotes = "",
  submitting = false,
}) => {
  const [blockedDates, setBlockedDates] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [notes, setNotes] = useState(initialNotes || "");

  // Date limit constraints derived from booking rules
  const dateLimits = useMemo(() => {
    return getOcularDateLimits(booking);
  }, [booking]);

  const {
    todayKey,
    minAllowedDate,
    minAllowedDateKey,
    maxAllowedDate,
    maxAllowedDateKey,
    isWedding,
    hasAvailableDates,
  } = dateLimits;

  // Fetch administrator blocked dates
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setLoadingBlocked(true);

    customerApi
      .getBlockedDates()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const keys = list
          .map((b) => (b.date ? String(b.date).split("T")[0] : null))
          .filter(Boolean);
        setBlockedDates(keys);
      })
      .catch((err) => {
        console.warn("[OcularDatePickerModal] Failed to load blocked dates:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingBlocked(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Date validator function
  const isDateSelectable = useMemo(() => {
    return (dateObj) => {
      if (!dateObj) return false;
      const key = toDateKey(dateObj);
      if (!key) return false;
      // Must be after today (minAllowedDateKey = tomorrow)
      if (key < minAllowedDateKey) return false;
      // Must not exceed maxAllowedDate (wedding 7 days prior; regular 1 day prior)
      if (maxAllowedDateKey && key > maxAllowedDateKey) return false;
      // Must not be admin-blocked
      if (blockedDates.includes(key)) return false;
      return true;
    };
  }, [minAllowedDateKey, maxAllowedDateKey, blockedDates]);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate && isDateSelectable(new Date(initialDate))) {
      return toDateKey(new Date(initialDate));
    }
    return "";
  });

  // Selected time slot
  const [selectedTime, setSelectedTime] = useState(initialTime || "10:00 AM");

  // Current calendar month view
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDate && !isNaN(new Date(initialDate).getTime())) {
      const d = new Date(initialDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    if (minAllowedDate) {
      return new Date(minAllowedDate.getFullYear(), minAllowedDate.getMonth(), 1);
    }
    return new Date();
  });

  // Re-sync when modal opens or initialDate changes
  useEffect(() => {
    if (visible) {
      setValidationError("");
      if (initialNotes) setNotes(initialNotes);
      if (initialDate && isDateSelectable(new Date(initialDate))) {
        setSelectedDate(toDateKey(new Date(initialDate)));
        const d = new Date(initialDate);
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      } else if (hasAvailableDates && minAllowedDate) {
        // Default to first valid date
        setSelectedDate(minAllowedDateKey);
        setCurrentMonth(new Date(minAllowedDate.getFullYear(), minAllowedDate.getMonth(), 1));
      }
    }
  }, [visible, initialDate, minAllowedDateKey, hasAvailableDates, isDateSelectable]);

  // Calendar navigation constraints
  const isPrevMonthDisabled = useMemo(() => {
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    const minYear = minAllowedDate.getFullYear();
    const minMonth = minAllowedDate.getMonth();
    return curYear < minYear || (curYear === minYear && curMonth <= minMonth);
  }, [currentMonth, minAllowedDate]);

  const isNextMonthDisabled = useMemo(() => {
    if (!maxAllowedDate) return false;
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    const maxYear = maxAllowedDate.getFullYear();
    const maxMonth = maxAllowedDate.getMonth();
    return curYear > maxYear || (curYear === maxYear && curMonth >= maxMonth);
  }, [currentMonth, maxAllowedDate]);

  const prevMonth = () => {
    if (isPrevMonthDisabled) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Calendar days grid generator
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  // Day selection handler
  const handleSelectDay = (dateObj) => {
    setValidationError("");
    if (!dateObj) return;
    const key = toDateKey(dateObj);

    if (blockedDates.includes(key)) {
      setValidationError("This date has been marked unavailable by catering management. Please select an alternate date.");
      return;
    }

    if (key < minAllowedDateKey) {
      setValidationError("Site visits must be scheduled at least 1 day in advance. You cannot select today or a past date.");
      return;
    }

    if (maxAllowedDateKey && key > maxAllowedDateKey) {
      if (isWedding) {
        setValidationError("Wedding ocular visits must be completed at least 7 days before your event to allow for stage, floral, and layout coordination.");
      } else {
        setValidationError("Ocular visits must be scheduled before the event date.");
      }
      return;
    }

    setSelectedDate(key);
  };

  // Form submit handler
  const handleSubmit = async () => {
    setValidationError("");

    if (!selectedDate) {
      setValidationError("Please select a date on the calendar.");
      return;
    }

    if (!selectedTime) {
      setValidationError("Please select a preferred time slot.");
      return;
    }

    if (blockedDates.includes(selectedDate)) {
      setValidationError("This date has been marked unavailable by catering management. Please select an alternate date.");
      return;
    }

    if (!isDateSelectable(new Date(selectedDate))) {
      setValidationError("The selected date is outside the allowable scheduling window.");
      return;
    }

    if (typeof onSubmit === "function") {
      try {
        await onSubmit(selectedDate, selectedTime, notes);
      } catch (err) {
        setValidationError(err.response?.data?.message || err.message || "Failed to schedule ocular visit.");
      }
    }
  };

  const canSkip = !booking?.ocular_visit?.is_required && typeof onSkip === "function";

  const eventTitle = booking?.event_type || booking?.package_name || "Event Venue Inspection";
  const formattedEventDate = booking?.event_date ? formatDate(booking.event_date) : "";
  const formattedMaxDate = maxAllowedDate ? formatDate(maxAllowedDate) : "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <View style={styles.kickerBadge}>
                <Sparkles size={11} color={colors.gold || "#D2B67C"} />
                <Text style={styles.kickerText}>Site Visit Inspection</Text>
              </View>
              <Text style={styles.modalTitle}>Schedule Ocular Visit</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                Pick an on-site inspection schedule for {eventTitle}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* Policy & Deadline Info Card */}
            <View style={styles.policyCard}>
              <View style={styles.policyIconCol}>
                <Info size={16} color={colors.primary} />
              </View>
              <View style={styles.policyTextCol}>
                <Text style={styles.policyTitle}>Scheduling Guidelines</Text>
                <Text style={styles.policyDesc}>
                  {isWedding ? (
                    <>
                      Weddings require ocular inspections at least{" "}
                      <Text style={{ fontWeight: "700" }}>7 days before the event</Text>
                      {formattedMaxDate ? ` (by ${formattedMaxDate})` : ""} to finalize stage layout, floral styling, and power boundaries.
                    </>
                  ) : (
                    <>
                      Physical site visits must be scheduled at least{" "}
                      <Text style={{ fontWeight: "700" }}>1 day before your event</Text>
                      {formattedMaxDate ? ` (by ${formattedMaxDate})` : ""}. Same-day inspections are not accepted.
                    </>
                  )}
                </Text>
              </View>
            </View>

            {/* Ineligible Warning if Event Date is Too Close */}
            {!hasAvailableDates && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={16} color={colors.warningDark || "#B45309"} />
                <Text style={styles.warningBannerText}>
                  No available dates remain before the advance scheduling cutoff. Event preparations will proceed directly based on your submitted venue specifications.
                </Text>
              </View>
            )}

            {/* Validation Error Banner */}
            {Boolean(validationError) && (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color={colors.error} />
                <Text style={styles.errorBannerText}>{validationError}</Text>
              </View>
            )}

            {/* ── SECTION 1: CALENDAR DATE PICKER ── */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <CalendarIcon size={15} color={colors.primary} />
                <Text style={styles.sectionLabel}>1. Select Inspection Date</Text>
                {loadingBlocked && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
              </View>

              <View style={styles.calendarCard}>
                {/* Month Navigation */}
                <View style={styles.monthHeaderRow}>
                  <TouchableOpacity
                    onPress={prevMonth}
                    disabled={isPrevMonthDisabled}
                    style={[styles.monthNavBtn, isPrevMonthDisabled && styles.monthNavBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronLeft
                      size={18}
                      color={isPrevMonthDisabled ? colors.textDisabled : colors.foreground}
                    />
                  </TouchableOpacity>

                  <Text style={styles.monthLabelText}>{monthLabel}</Text>

                  <TouchableOpacity
                    onPress={nextMonth}
                    disabled={isNextMonthDisabled}
                    style={[styles.monthNavBtn, isNextMonthDisabled && styles.monthNavBtnDisabled]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronRight
                      size={18}
                      color={isNextMonthDisabled ? colors.textDisabled : colors.foreground}
                    />
                  </TouchableOpacity>
                </View>

                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((wd) => (
                    <View key={wd} style={styles.weekdayCell}>
                      <Text style={styles.weekdayText}>{wd}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((d, index) => {
                    if (!d) {
                      return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const dateKey = toDateKey(d);
                    const isSelected = selectedDate === dateKey;
                    const isToday = dateKey === todayKey;
                    const isBlocked = blockedDates.includes(dateKey);
                    const isSelectable = isDateSelectable(d);
                    const isDisabled = !isSelectable;

                    return (
                      <View key={dateKey} style={styles.dayCell}>
                        <TouchableOpacity
                          style={[
                            styles.dayBtn,
                            isSelected && styles.dayBtnSelected,
                            isToday && !isSelected && styles.dayBtnToday,
                            isBlocked && !isSelected && styles.dayBtnBlocked,
                            isDisabled && !isSelected && !isBlocked && styles.dayBtnDisabled,
                          ]}
                          onPress={() => handleSelectDay(d)}
                          disabled={!isSelectable && !isBlocked}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.dayTextSelected,
                              isToday && !isSelected && styles.dayTextToday,
                              isDisabled && styles.dayTextDisabled,
                              isBlocked && styles.dayTextBlocked,
                            ]}
                          >
                            {d.getDate()}
                          </Text>

                          {isBlocked && !isSelected && (
                            <View style={styles.blockedDot} />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* Legend Row */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendText}>Selected</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary, borderWidth: 1 }]} />
                    <Text style={styles.legendText}>Today</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", borderWidth: 1 }]} />
                    <Text style={styles.legendText}>Blocked</Text>
                  </View>
                </View>
              </View>

              {/* Selected Date Confirmation Pill */}
              {Boolean(selectedDate) && (
                <View style={styles.selectionSummaryPill}>
                  <CheckCircle2 size={15} color={colors.success || "#10B981"} />
                  <Text style={styles.selectionSummaryText}>
                    Selected Date: <Text style={{ fontWeight: "700" }}>{formatDate(selectedDate)}</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* ── SECTION 2: TIME SLOT PICKER ── */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Clock size={15} color={colors.primary} />
                <Text style={styles.sectionLabel}>2. Select Inspection Time Slot</Text>
              </View>

              <View style={styles.timeSlotsGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSlotActive = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeSlotBtn, isSlotActive && styles.timeSlotBtnActive]}
                      onPress={() => {
                        setSelectedTime(slot);
                        setValidationError("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeSlotText, isSlotActive && styles.timeSlotTextActive]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── SECTION 3: NOTES & ACCESS INSTRUCTIONS ── */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>3. Venue Notes & Access Instructions (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Gate pass required at subdivision gate, contact coordinator Ms. Ana at venue entrance, inquire about electrical panel location..."
                placeholderTextColor={colors.textDisabled}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <AppButton
              title="Confirm Ocular Request"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!hasAvailableDates || submitting}
              style={{ flex: 1 }}
            />

            {canSkip && (
              <AppButton
                title="Skip Inspection"
                variant="outline"
                onPress={onSkip}
                disabled={submitting}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: colors.surface || "#FFFFFF",
    borderTopLeftRadius: radius.xl || 20,
    borderTopRightRadius: radius.xl || 20,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.md,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder || "#E2E8F0",
  },
  kickerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full || 999,
    backgroundColor: "rgba(210, 182, 124, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(210, 182, 124, 0.35)",
    marginBottom: 4,
  },
  kickerText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark || "#1E3A8A",
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: typography.sizes.lg || 18,
    fontWeight: "700",
    color: colors.foreground || "#0F172A",
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs || 12,
    color: colors.foregroundMuted || "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt || "#F1F5F9",
  },
  scrollBody: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  // Policy banner
  policyCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt || "#F8FAFC",
    borderRadius: radius.md || 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder || "#E2E8F0",
    gap: spacing.xs,
  },
  policyIconCol: {
    paddingTop: 2,
  },
  policyTextCol: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary || "#2C4B8A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  policyDesc: {
    fontSize: typography.sizes.xs || 12,
    color: colors.foregroundMuted || "#475569",
    marginTop: 2,
    lineHeight: 16,
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 15,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.errorLight || "#FEE2E2",
    borderColor: colors.errorBorder || "#FCA5A5",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.error || "#DC2626",
    lineHeight: 16,
  },

  // Section
  sectionWrap: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm || 13,
    fontWeight: "700",
    color: colors.foreground || "#0F172A",
  },

  // Calendar
  calendarCard: {
    backgroundColor: colors.surface || "#FFFFFF",
    borderRadius: radius.lg || 12,
    borderWidth: 1,
    borderColor: colors.cardBorder || "#E2E8F0",
    padding: spacing.sm,
    ...shadows.xs,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  monthLabelText: {
    fontSize: typography.sizes.sm || 14,
    fontWeight: "700",
    color: colors.foreground || "#0F172A",
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt || "#F8FAFC",
  },
  monthNavBtnDisabled: {
    opacity: 0.35,
  },
  weekdaysRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder || "#E2E8F0",
    paddingBottom: 6,
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundMuted || "#64748B",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtn: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md || 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: "relative",
  },
  dayBtnSelected: {
    backgroundColor: colors.primary || "#2C4B8A",
  },
  dayBtnToday: {
    borderWidth: 1.5,
    borderColor: colors.primary || "#2C4B8A",
  },
  dayBtnBlocked: {
    backgroundColor: "#FEE2E2",
    opacity: 0.7,
  },
  dayBtnDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground || "#0F172A",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextToday: {
    color: colors.primary || "#2C4B8A",
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: colors.textDisabled || "#94A3B8",
  },
  dayTextBlocked: {
    color: colors.error || "#DC2626",
    textDecorationLine: "line-through",
  },
  blockedDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.error || "#DC2626",
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.base,
    marginTop: spacing.xs,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: colors.foregroundMuted || "#64748B",
    fontWeight: "500",
  },

  selectionSummaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    marginTop: 6,
  },
  selectionSummaryText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "500",
  },

  // Time slots
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlotBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md || 8,
    backgroundColor: colors.surfaceAlt || "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.cardBorder || "#E2E8F0",
  },
  timeSlotBtnActive: {
    backgroundColor: colors.primary || "#2C4B8A",
    borderColor: colors.primary || "#2C4B8A",
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground || "#0F172A",
  },
  timeSlotTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Notes
  notesInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder || "#CBD5E1",
    borderRadius: radius.md || 8,
    padding: spacing.sm,
    fontSize: typography.sizes.xs || 12,
    color: colors.foreground || "#0F172A",
    backgroundColor: colors.surface || "#FFFFFF",
    minHeight: 70,
    textAlignVertical: "top",
  },

  // Footer
  modalFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || "#E2E8F0",
  },
});

export default OcularDatePickerModal;
