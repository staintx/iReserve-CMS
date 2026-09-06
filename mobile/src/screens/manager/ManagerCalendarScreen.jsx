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
  Clock,
  MapPin,
  CheckCircle2,
  CalendarOff,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import AppButton from "../../components/common/AppButton";
import { formatDate, formatTime } from "../../utils/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ManagerCalendarScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const [unavailableDates, setUnavailableDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  const monthString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const [availData, bookingsData] = await Promise.all([
        managerApi.getAvailability(monthString).catch(() => ({ unavailable: [] })),
        managerApi.getBookings().catch(() => []),
      ]);

      setUnavailableDates(availData?.unavailable || []);
      setEvents(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [monthString]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    // Empty cells before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, key: `empty-${i}` });
    }

    // Days in current month
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

  // Event date map
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((b) => {
      if (!b.event_date) return;
      const d = new Date(b.event_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [events]);

  const isSelectedUnavailable = unavailableDates.includes(selectedDateKey);
  const selectedDayEvents = eventsByDate[selectedDateKey] || [];

  const handleToggleDateAvailability = async () => {
    try {
      setSavingAvailability(true);
      let updatedList = [];
      if (isSelectedUnavailable) {
        // Remove from unavailable
        updatedList = unavailableDates.filter((d) => d !== selectedDateKey);
      } else {
        // Add to unavailable
        updatedList = [...unavailableDates, selectedDateKey];
      }

      await managerApi.setAvailability(monthString, updatedList);
      setUnavailableDates(updatedList);
      Alert.alert(
        "Availability Updated",
        isSelectedUnavailable
          ? `Date marked as Available.`
          : `Date marked as Unavailable.`
      );
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update availability.");
    } finally {
      setSavingAvailability(false);
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
        <Text style={styles.headerTitle}>Manager Calendar</Text>
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
        {/* Calendar Card */}
        <Card style={styles.calendarCard}>
          {/* Weekday headers */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Grid of days */}
          <View style={styles.grid}>
            {calendarDays.map((cell) => {
              if (!cell.dayNumber) {
                return <View key={cell.key} style={styles.cellEmpty} />;
              }

              const isSelected = cell.dateKey === selectedDateKey;
              const hasEvents = (eventsByDate[cell.dateKey] || []).length > 0;
              const isUnavailable = unavailableDates.includes(cell.dateKey);

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isUnavailable && !isSelected && styles.cellUnavailable,
                  ]}
                  onPress={() => setSelectedDateKey(cell.dateKey)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                      isUnavailable && !isSelected && styles.cellTextUnavailable,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>
                  <View style={styles.dotRow}>
                    {hasEvents && (
                      <View
                        style={[
                          styles.eventDot,
                          isSelected && { backgroundColor: colors.white },
                        ]}
                      />
                    )}
                    {isUnavailable && (
                      <View
                        style={[
                          styles.unavailDot,
                          isSelected && { backgroundColor: colors.accentLight },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendLabel}>Booked Event</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
              <Text style={styles.legendLabel}>Marked Unavailable</Text>
            </View>
          </View>
        </Card>

        {/* Selected Date Actions & Events */}
        <View style={styles.selectedHeader}>
          <Text style={styles.selectedDateTitle}>
            {formatDate(selectedDateKey)}
          </Text>
          <TouchableOpacity
            style={[
              styles.availToggleBtn,
              isSelectedUnavailable ? styles.availToggleBtnGreen : styles.availToggleBtnRed,
            ]}
            onPress={handleToggleDateAvailability}
            disabled={savingAvailability}
          >
            {savingAvailability ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                {isSelectedUnavailable ? (
                  <CheckCircle2 size={14} color={colors.white} />
                ) : (
                  <CalendarOff size={14} color={colors.white} />
                )}
                <Text style={styles.availToggleBtnText}>
                  {isSelectedUnavailable ? "Mark Available" : "Mark Unavailable"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Events for selected day */}
        {selectedDayEvents.length === 0 ? (
          <Card style={styles.noEventsCard} variant="flat">
            <CalendarIcon size={24} color={colors.textSubtle} />
            <Text style={styles.noEventsText}>No events scheduled for this day</Text>
          </Card>
        ) : (
          selectedDayEvents.map((item) => (
            <Card
              key={item._id}
              style={styles.eventItemCard}
              onPress={() =>
                navigation.navigate("ManagerBookingDetail", { bookingId: item._id })
              }
            >
              <View style={styles.eventItemTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventItemTitle}>{item.event_type || "Event"}</Text>
                  <Text style={styles.eventItemRef}>
                    Ref: #{item.reference || item._id?.slice(-6).toUpperCase()}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              {item.start_time && (
                <View style={styles.eventMetaRow}>
                  <Clock size={13} color={colors.foregroundMuted} />
                  <Text style={styles.eventMetaText}>
                    {formatTime(item.start_time)} ({item.duration_hours || 4}h)
                  </Text>
                </View>
              )}

              <View style={styles.eventMetaRow}>
                <MapPin size={13} color={colors.foregroundMuted} />
                <Text style={styles.eventMetaText} numberOfLines={1}>
                  {item.barangay ? `${item.barangay}, ` : ""}{item.municipality || "Batangas"}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
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
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  arrowBtn: {
    padding: 6,
  },
  monthLabelText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 120,
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
    fontFamily: typography.fontFamily.bold,
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
    borderRadius: radius.md,
  },
  cellSelected: {
    backgroundColor: colors.primary,
  },
  cellUnavailable: {
    backgroundColor: "#FEE2E2",
  },
  cellText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.foreground,
  },
  cellTextSelected: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
  },
  cellTextUnavailable: {
    color: colors.error,
  },
  dotRow: {
    flexDirection: "row",
    gap: 3,
    height: 6,
    alignItems: "center",
    marginTop: 2,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  unavailDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
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
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSubtle,
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  selectedDateTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  availToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  availToggleBtnRed: {
    backgroundColor: colors.error,
  },
  availToggleBtnGreen: {
    backgroundColor: colors.success,
  },
  availToggleBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  noEventsCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  noEventsText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSubtle,
  },
  eventItemCard: {
    marginBottom: spacing.sm,
  },
  eventItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  eventItemTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  eventItemRef: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  eventMetaText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
  },
});

export default ManagerCalendarScreen;
