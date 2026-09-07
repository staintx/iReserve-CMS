import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  CalendarOff,
  Briefcase,
  Phone,
  Mail,
  UserCheck,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Card from "../../components/common/Card";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const StaffScheduleModal = ({ visible, onClose, staffMember }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarData, setCalendarData] = useState({ month: "", assignments: [], unavailable: [] });
  const [loading, setLoading] = useState(true);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const loadSchedule = useCallback(async () => {
    if (!staffMember?._id) return;
    try {
      setLoading(true);
      const data = await managerApi.getStaffCalendar(staffMember._id, monthString);
      setCalendarData(data || { month: monthString, assignments: [], unavailable: [] });
    } catch (error) {
      console.error("Failed to load staff member calendar:", error);
      setCalendarData({ month: monthString, assignments: [], unavailable: [] });
    } finally {
      setLoading(false);
    }
  }, [staffMember, monthString]);

  useEffect(() => {
    if (visible && staffMember) {
      loadSchedule();
    }
  }, [visible, staffMember, loadSchedule]);

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

  const assignedDatesMap = useMemo(() => {
    const map = new Map();
    (calendarData.assignments || []).forEach((a) => {
      if (!a.date) return;
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, a);
    });
    return map;
  }, [calendarData.assignments]);

  const unavailableDatesSet = useMemo(() => {
    return new Set(calendarData.unavailable || []);
  }, [calendarData.unavailable]);

  const monthLabel = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  if (!staffMember) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.staffName}>{staffMember.full_name}</Text>
              <Text style={styles.staffRole}>{staffMember.position || "Catering Personnel"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Briefcase size={16} color={colors.primary} />
                <Text style={styles.metricVal}>{(calendarData.assignments || []).length}</Text>
                <Text style={styles.metricLabel}>Shifts</Text>
              </View>
              <View style={styles.metricBox}>
                <CalendarOff size={16} color={colors.error} />
                <Text style={[styles.metricVal, { color: colors.error }]}>
                  {(calendarData.unavailable || []).length}
                </Text>
                <Text style={styles.metricLabel}>Unavailable</Text>
              </View>
              <View style={styles.metricBox}>
                <UserCheck size={16} color={colors.success} />
                <Text style={[styles.metricVal, { color: colors.success }]}>
                  {staffMember.availability_status || "Available"}
                </Text>
                <Text style={styles.metricLabel}>Status</Text>
              </View>
            </View>

            {/* Calendar Controls */}
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
                <ChevronLeft size={20} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthLabel}</Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
                <ChevronRight size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Weekday Labels */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((day, i) => (
                <Text key={i} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading staff schedule...</Text>
              </View>
            ) : (
              <View style={styles.daysGrid}>
                {calendarDays.map((day) => {
                  if (!day.dayNumber) {
                    return <View key={day.key} style={styles.dayCellEmpty} />;
                  }

                  const isAssigned = assignedDatesMap.has(day.dateKey);
                  const isUnavailable = unavailableDatesSet.has(day.dateKey);

                  return (
                    <View
                      key={day.key}
                      style={[
                        styles.dayCell,
                        isAssigned && styles.dayCellAssigned,
                        isUnavailable && styles.dayCellUnavailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumberText,
                          isAssigned && styles.dayNumberAssigned,
                          isUnavailable && styles.dayNumberUnavailable,
                        ]}
                      >
                        {day.dayNumber}
                      </Text>
                      {isAssigned && (
                        <View style={styles.assignedDot} />
                      )}
                      {isUnavailable && (
                        <View style={styles.unavailableDot} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Assigned Shift</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <Text style={styles.legendText}>Unavailable (Blackout)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.borderLight }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
            </View>

            {/* Assigned Events List for Month */}
            <View style={styles.eventsListSection}>
              <Text style={styles.eventsListTitle}>Upcoming Event Shifts This Month</Text>
              {(calendarData.assignments || []).length === 0 ? (
                <Text style={styles.noEventsText}>No catering shifts assigned for this month.</Text>
              ) : (
                (calendarData.assignments || []).map((ev, idx) => (
                  <View key={idx} style={styles.eventItemCard}>
                    <View style={styles.eventDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{ev.event_type || "Catering Event"}</Text>
                      <Text style={styles.eventSubtitle}>
                        Role: {ev.role || staffMember.position} • {ev.guest_count || 0} Pax
                      </Text>
                    </View>
                    <Text style={styles.eventDateBadge}>
                      {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  staffName: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.foreground,
  },
  staffRole: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  metricVal: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.foreground,
    marginVertical: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  monthTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  arrowBtn: {
    padding: spacing.xs,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xs,
  },
  weekdayText: {
    width: "14%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCellEmpty: {
    width: "14.28%",
    height: 38,
  },
  dayCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    marginVertical: 2,
  },
  dayCellAssigned: {
    backgroundColor: colors.primaryLight,
  },
  dayCellUnavailable: {
    backgroundColor: "#fee2e2",
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  dayNumberAssigned: {
    color: colors.primary,
    fontWeight: "800",
  },
  dayNumberUnavailable: {
    color: colors.error,
  },
  assignedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  unavailableDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.error,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
    fontSize: 10,
    color: colors.foregroundMuted,
    fontWeight: "500",
  },
  eventsListSection: {
    marginTop: spacing.xs,
  },
  eventsListTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  noEventsText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontStyle: "italic",
    paddingVertical: spacing.sm,
  },
  eventItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  eventTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  eventSubtitle: {
    fontSize: 10,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  eventDateBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
});

export default StaffScheduleModal;
