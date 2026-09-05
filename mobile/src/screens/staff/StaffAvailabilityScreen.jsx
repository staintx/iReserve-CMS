import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarOff,
  CheckCircle2,
  Info,
  CalendarCheck,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import staffApi from "../../api/staff";
import Card from "../../components/common/Card";
import AppButton from "../../components/common/AppButton";
import { formatDate } from "../../utils/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const StaffAvailabilityScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const loadAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffApi.getMyAvailability(monthString);
      setUnavailableDates(data?.unavailable || []);
      setAssignments(data?.assignments || []);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to load staff availability:", error);
    } finally {
      setLoading(false);
    }
  }, [monthString]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, key: `empty-${i}` });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        dayNumber: day,
        key: dateKey,
        dateKey,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const assignedDatesSet = useMemo(() => {
    const set = new Set();
    assignments.forEach((a) => {
      if (!a.date) return;
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      set.add(key);
    });
    return set;
  }, [assignments]);

  const handleToggleDay = (dateKey) => {
    if (assignedDatesSet.has(dateKey)) {
      Alert.alert(
        "Shift Already Assigned",
        "You already have a confirmed event shift on this day. Please contact your Event Operations Manager if you have a scheduling emergency."
      );
      return;
    }

    setUnavailableDates((prev) => {
      let updated;
      if (prev.includes(dateKey)) {
        updated = prev.filter((d) => d !== dateKey);
      } else {
        updated = [...prev, dateKey];
      }
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await staffApi.setMyAvailability(monthString, unavailableDates);
      setHasUnsavedChanges(false);
      Alert.alert("Saved", "Your availability schedule for this month has been updated.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Month Navigator Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shift Availability</Text>
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.monthLabelText}>{monthLabel}</Text>
          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <ChevronRight size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.bannerCard} variant="flat">
          <View style={styles.bannerRow}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.bannerText}>
              Tap any date to toggle between <Text style={{ fontWeight: "700" }}>Available</Text> and{" "}
              <Text style={{ fontWeight: "700", color: colors.error }}>Unavailable</Text>.
            </Text>
          </View>
        </Card>

        {/* Calendar Grid */}
        <Card style={styles.calendarCard}>
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {loading ? (
            <View style={{ height: 240, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.grid}>
              {calendarDays.map((cell) => {
                if (!cell.dayNumber) {
                  return <View key={cell.key} style={styles.cellEmpty} />;
                }

                const isAssigned = assignedDatesSet.has(cell.dateKey);
                const isUnavailable = unavailableDates.includes(cell.dateKey);

                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.cell,
                      isAssigned && styles.cellAssigned,
                      isUnavailable && !isAssigned && styles.cellUnavailable,
                    ]}
                    onPress={() => handleToggleDay(cell.dateKey)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        isAssigned && styles.cellTextAssigned,
                        isUnavailable && !isAssigned && styles.cellTextUnavailable,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>

                    <View style={styles.dotRow}>
                      {isAssigned && <View style={styles.assignedDot} />}
                      {isUnavailable && !isAssigned && <View style={styles.unavailableDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderWidth: 1 }]} />
              <Text style={styles.legendLabel}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: "#FDEAEA" }]} />
              <Text style={styles.legendLabel}>Unavailable</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: colors.primaryLight }]} />
              <Text style={styles.legendLabel}>Booked Shift</Text>
            </View>
          </View>
        </Card>

        {/* Selected Month Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Month Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Confirmed Shifts:</Text>
            <Text style={styles.summaryVal}>{assignments.length} events</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Blocked Days:</Text>
            <Text style={styles.summaryVal}>{unavailableDates.length} days</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Footer Save Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        <AppButton
          title={hasUnsavedChanges ? "Save Availability Changes" : "Availability Saved"}
          variant={hasUnsavedChanges ? "primary" : "outline"}
          size="lg"
          icon={CheckCircle2}
          disabled={!hasUnsavedChanges || saving}
          loading={saving}
          onPress={handleSave}
        />
      </View>
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
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  arrowBtn: {
    padding: 6,
  },
  monthLabelText: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  bannerCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.powder,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bannerText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    flex: 1,
    lineHeight: 18,
  },
  calendarCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSubtle,
    width: 40,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cellEmpty: {
    width: "14.28%",
    height: 48,
  },
  cell: {
    width: "14.28%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cellAssigned: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  cellUnavailable: {
    backgroundColor: "#FDEAEA",
    borderColor: "#F5B7B1",
  },
  cellText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  cellTextAssigned: {
    color: colors.primary,
    fontWeight: "700",
  },
  cellTextUnavailable: {
    color: colors.error,
    fontWeight: "700",
  },
  dotRow: {
    height: 4,
    marginTop: 2,
  },
  assignedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  unavailableDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.error,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  summaryVal: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});

export default StaffAvailabilityScreen;
