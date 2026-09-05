import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Minus,
  FileText,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import staffApi from "../../api/staff";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import AppButton from "../../components/common/AppButton";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import AnimatedStepper from "../../components/common/AnimatedStepper";
import { formatTime } from "../../utils/format";

export const EquipmentChecklistScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalNote, setGeneralNote] = useState("");

  // Items state: array of { inventory_id, name, quantity_booked, quantity_returned, quantity_damaged, notes }
  const [items, setItems] = useState([]);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffApi.getMyBooking(bookingId);
      setBooking(data);

      // Determine initial equipment list from equipment_returns or inventory_items
      const existingReturns = data.equipment_returns || [];
      const inventory = data.inventory_items || [];

      if (existingReturns.length > 0) {
        setItems(
          existingReturns.map((item) => ({
            inventory_id: item.inventory_id?._id || item.inventory_id,
            name: item.name || item.inventory_id?.name || "Inventory Item",
            quantity_booked: item.quantity_booked || 1,
            quantity_returned: item.quantity_returned !== undefined ? item.quantity_returned : item.quantity_booked || 1,
            quantity_damaged: item.quantity_damaged || 0,
            notes: item.notes || "",
          }))
        );
      } else if (inventory.length > 0) {
        setItems(
          inventory.map((inv) => ({
            inventory_id: inv.inventory_id?._id || inv.inventory_id,
            name: inv.name || inv.inventory_id?.name || "Inventory Item",
            quantity_booked: inv.quantity || 1,
            quantity_returned: inv.quantity || 1, // default all returned
            quantity_damaged: 0,
            notes: "",
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load equipment returns checklist:", error);
      Alert.alert("Error", "Could not load equipment details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const isEventStarted = () => {
    if (!booking) return false;
    if (["completed", "Completed", "ongoing"].includes(booking.status)) return true;
    if (!booking.event_date) return true;

    const d = new Date(booking.event_date);
    let hours = 0;
    let minutes = 0;
    if (booking.start_time) {
      const match = String(booking.start_time).trim().match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
      }
    }
    const startDateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);
    return new Date() >= startDateTime;
  };

  const handleAllUndamaged = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity_returned: item.quantity_booked,
        quantity_damaged: 0,
      }))
    );
  };

  const updateQuantity = (index, field, delta) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index] };
      const currentVal = current[field] || 0;
      const newVal = Math.max(0, currentVal + delta);

      if (field === "quantity_returned") {
        if (newVal + current.quantity_damaged <= current.quantity_booked) {
          current.quantity_returned = newVal;
        }
      } else if (field === "quantity_damaged") {
        if (current.quantity_returned + newVal <= current.quantity_booked) {
          current.quantity_damaged = newVal;
        }
      }

      copy[index] = current;
      return copy;
    });
  };

  const updateItemNotes = (index, text) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes: text };
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!isEventStarted()) {
      Alert.alert(
        "Returns Locked",
        `Equipment return verification is locked until the event starts (${formatTime(booking?.start_time) || "the scheduled time"}).`
      );
      return;
    }

    // Client-side validation: returned + damaged <= booked
    for (const it of items) {
      if ((it.quantity_returned || 0) + (it.quantity_damaged || 0) > it.quantity_booked) {
        Alert.alert(
          "Invalid Quantities",
          `Returned (${it.quantity_returned}) + Damaged (${it.quantity_damaged}) cannot exceed booked (${it.quantity_booked}) for ${it.name}.`
        );
        return;
      }
    }

    try {
      setSaving(true);
      await staffApi.submitEquipmentReturns(bookingId, {
        returns: items,
        note: generalNote.trim(),
      });

      Alert.alert(
        "Success",
        "Equipment returns verification submitted successfully.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        "Submission Failed",
        error.response?.data?.message || "Failed to submit equipment returns."
      );
    } finally {
      setSaving(false);
    }
  };

  const locked = !isEventStarted();

  return (
    <View style={styles.screen}>
      <Header
        title="Equipment Return Checklist"
        subtitle={booking?.reference ? `#${booking.reference}` : "Inventory Reconciliation"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {locked && (
          <Card style={styles.lockedBanner}>
            <View style={styles.lockedRow}>
              <Lock size={22} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedTitle}>Submission Currently Locked</Text>
                <Text style={styles.lockedSub}>
                  Equipment returns can only be filed once the event is underway or completed (scheduled for {formatTime(booking?.start_time) || "event time"}).
                </Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.topActionsRow}>
          <Text style={styles.listHeading}>
            Inventory Reconciliation ({items.length})
          </Text>
          {!locked && items.length > 0 && (
            <TouchableOpacity onPress={handleAllUndamaged} activeOpacity={0.7}>
              <Text style={styles.markAllBtnText}>All 100% Intact</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <SkeletonLoader height={120} style={{ borderRadius: radius.md }} />
            <SkeletonLoader height={120} style={{ borderRadius: radius.md }} />
          </View>
        ) : items.length === 0 ? (
          <Card style={styles.emptyCard} variant="flat">
            <PackageCheck size={36} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>No Equipment to Return</Text>
            <Text style={styles.emptySub}>
              There are no separate inventory items assigned for return verification.
            </Text>
          </Card>
        ) : (
          <View style={styles.itemList}>
            {items.map((item, index) => {
              const missingCount =
                item.quantity_booked - (item.quantity_returned + item.quantity_damaged);

              return (
                <Card key={index} style={styles.itemCard}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.bookedBadge}>
                      <Text style={styles.bookedText}>Booked: {item.quantity_booked}</Text>
                    </View>
                  </View>

                  {/* Steppers Row */}
                  <View style={styles.steppersContainer}>
                    {/* Returned Stepper */}
                    <View style={styles.stepperBox}>
                      <Text style={styles.stepperLabel}>Returned Intact</Text>
                      <AnimatedStepper
                        value={item.quantity_returned}
                        onChange={(val) => {
                          const delta = val - item.quantity_returned;
                          updateQuantity(index, "quantity_returned", delta);
                        }}
                        min={0}
                        max={item.quantity_booked - item.quantity_damaged}
                        disabled={locked}
                        size="sm"
                      />
                    </View>

                    {/* Damaged Stepper */}
                    <View style={styles.stepperBox}>
                      <Text style={[styles.stepperLabel, { color: colors.error }]}>Damaged</Text>
                      <AnimatedStepper
                        value={item.quantity_damaged}
                        onChange={(val) => {
                          const delta = val - item.quantity_damaged;
                          updateQuantity(index, "quantity_damaged", delta);
                        }}
                        min={0}
                        max={item.quantity_booked - item.quantity_returned}
                        disabled={locked}
                        size="sm"
                      />
                    </View>
                  </View>

                  {missingCount > 0 && (
                    <View style={styles.missingWarningRow}>
                      <AlertTriangle size={13} color={colors.warning} />
                      <Text style={styles.missingWarningText}>
                        {missingCount} piece{missingCount === 1 ? "" : "s"} missing / unreturned
                      </Text>
                    </View>
                  )}

                  {/* Optional Item Note if damaged or missing */}
                  {(item.quantity_damaged > 0 || missingCount > 0) && (
                    <TextInput
                      style={styles.itemNoteInput}
                      placeholder="Note cause of damage or missing details..."
                      placeholderTextColor={colors.textDisabled}
                      value={item.notes}
                      onChangeText={(t) => updateItemNotes(index, t)}
                      editable={!locked}
                    />
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* General Return Note */}
        {!locked && (
          <Card style={styles.generalNoteCard}>
            <View style={styles.noteHeader}>
              <FileText size={15} color={colors.foregroundMuted} />
              <Text style={styles.noteTitle}>General Return Notes</Text>
            </View>
            <TextInput
              style={styles.generalInput}
              placeholder="Add final inspection remarks or return warehouse location..."
              placeholderTextColor={colors.textDisabled}
              value={generalNote}
              onChangeText={setGeneralNote}
              multiline
            />
          </Card>
        )}
      </ScrollView>

      {/* Footer Submit Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        <AppButton
          title={locked ? "Returns Locked Until Start" : "Submit Equipment Returns"}
          variant="primary"
          size="lg"
          icon={ShieldCheck}
          disabled={locked || items.length === 0}
          loading={saving}
          onPress={handleSubmit}
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
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 110,
  },
  lockedBanner: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  lockedTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.warning,
  },
  lockedSub: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  topActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  listHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  markAllBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.primary,
  },
  itemList: {
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  itemCard: {
    padding: spacing.sm + 2,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.xs,
  },
  bookedBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bookedText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSubtle,
  },
  steppersContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  stepperBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.xs,
    alignItems: "center",
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundMuted,
    marginBottom: 4,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepperVal: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    minWidth: 20,
    textAlign: "center",
  },
  missingWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  missingWarningText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: "600",
  },
  itemNoteInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 11,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    textAlign: "center",
  },
  generalNoteCard: {
    marginBottom: spacing.lg,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  noteTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  generalInput: {
    height: 70,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    textAlignVertical: "top",
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

export default EquipmentChecklistScreen;
