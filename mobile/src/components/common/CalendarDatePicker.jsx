import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseLocalDate = (value) => {
  if (!value) return new Date();
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "No date selected";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const CalendarDatePicker = ({
  selectedDate,
  onSelectDate,
  minDate,
  blockedDates = [],
  leadTimeDays = 4,
  label = "Select Event Date",
  style,
}) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayKey = useMemo(() => getDateKey(today), [today]);

  const minDateObj = useMemo(() => {
    if (minDate instanceof Date) {
      const d = new Date(minDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (typeof minDate === "string" && minDate.trim()) {
      const d = parseLocalDate(minDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const d = new Date();
    d.setDate(d.getDate() + (leadTimeDays || 4));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate, leadTimeDays]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = selectedDate ? parseLocalDate(selectedDate) : minDateObj;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // Sync calendar view month when selectedDate changes externally (e.g. fast date click)
  useEffect(() => {
    if (selectedDate) {
      const d = parseLocalDate(selectedDate);
      if (
        d.getFullYear() !== currentMonth.getFullYear() ||
        d.getMonth() !== currentMonth.getMonth()
      ) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [selectedDate]);

  const canGoPrev = useMemo(() => {
    const minMonth = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), 1);
    return currentMonth > minMonth;
  }, [currentMonth, minDateObj]);

  const prevMonth = () => {
    if (!canGoPrev) return;
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
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

  return (
    <View style={[styles.container, style]}>
      {/* Header Label */}
      {Boolean(label) && <Text style={styles.label}>{label}</Text>}

      {/* Calendar Card Container */}
      <View style={styles.calendarCard}>
        {/* Month Header Navigation */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
            onPress={prevMonth}
            disabled={!canGoPrev}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft
              size={18}
              color={canGoPrev ? colors.foreground : colors.textDisabled}
            />
          </TouchableOpacity>

          <View style={styles.monthTitleWrap}>
            <Calendar size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.monthTitleText}>{monthLabel}</Text>
          </View>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={nextMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Days of Week Header */}
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day) => (
            <View key={day} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Days Grid */}
        <View style={styles.daysGrid}>
          {calendarDays.map((d, index) => {
            if (!d) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateKey = getDateKey(d);
            const isSelected = selectedDate === dateKey;
            const isPast = d < minDateObj;
            const isBlocked = blockedDates.includes(dateKey);
            const isToday = dateKey === todayKey;
            const isDisabled = isPast || isBlocked;

            return (
              <View key={dateKey} style={styles.dayCell}>
                <TouchableOpacity
                  style={[
                    styles.dayBtn,
                    isSelected && styles.dayBtnSelected,
                    isToday && !isSelected && styles.dayBtnToday,
                    isBlocked && !isSelected && styles.dayBtnBlocked,
                  ]}
                  onPress={() => {
                    if (!isDisabled && onSelectDate) {
                      onSelectDate(dateKey);
                    }
                  }}
                  disabled={isDisabled}
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

                  {/* Red indicator dot for fully booked days */}
                  {isBlocked && !isSelected && (
                    <View style={styles.blockedDot} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Selected Date Summary Badge */}
        <View style={styles.selectionFooter}>
          <View style={styles.selectionLeft}>
            <View style={styles.selectionIconBox}>
              <CheckCircle2 size={16} color={colors.primary} />
            </View>
            <View style={styles.selectionTextCol}>
              <Text style={styles.selectionSubLabel}>Selected Schedule</Text>
              <Text style={styles.selectionDateText}>
                {formatDisplayDate(selectedDate)}
              </Text>
            </View>
          </View>
          <View style={styles.isoPill}>
            <Text style={styles.isoPillText}>{selectedDate || "YYYY-MM-DD"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      },
    }),
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: {
    opacity: 0.35,
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  monthTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundDark,
    letterSpacing: -0.2,
  },
  weekdaysRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  dayCell: {
    width: "14.285%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  dayBtn: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayBtnSelected: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 3px 8px rgba(44, 75, 138, 0.3)",
      },
    }),
  },
  dayBtnToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayBtnBlocked: {
    backgroundColor: colors.errorLight,
  },
  dayText: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: Platform.select({ ios: "600", android: undefined }),
    color: colors.foreground,
  },
  dayTextSelected: {
    color: colors.white,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
  },
  dayTextToday: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
  },
  dayTextDisabled: {
    color: colors.textDisabled,
    opacity: 0.45,
  },
  dayTextBlocked: {
    color: colors.error,
    textDecorationLine: "line-through",
  },
  blockedDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.error,
  },
  selectionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  selectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  selectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  selectionTextCol: {
    flex: 1,
  },
  selectionSubLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  selectionDateText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: Platform.select({ ios: "700", android: undefined }),
    color: colors.foregroundDark,
    marginTop: 1,
  },
  isoPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full || 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  isoPillText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.primary,
    letterSpacing: 0.2,
  },
});

export default CalendarDatePicker;
