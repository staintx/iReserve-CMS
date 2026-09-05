import React, { useState } from "react";
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
  X,
  PackageCheck,
  CheckSquare,
  Square,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import managerApi from "../../api/manager";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import AppButton from "../../components/common/AppButton";

export const EquipmentDispatchModal = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { bookingId, inventoryItems = [], alreadyVerified = false, onSuccess } = route.params;

  // Track checked items by index or inventory_id
  const [checkedMap, setCheckedMap] = useState(() => {
    const map = {};
    inventoryItems.forEach((_, idx) => {
      map[idx] = alreadyVerified; // If already verified, default all to checked
    });
    return map;
  });

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleCheck = (idx) => {
    setCheckedMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleSelectAll = () => {
    const allChecked = {};
    inventoryItems.forEach((_, idx) => {
      allChecked[idx] = true;
    });
    setCheckedMap(allChecked);
  };

  const allSelected =
    inventoryItems.length > 0 &&
    inventoryItems.every((_, idx) => Boolean(checkedMap[idx]));

  const handleConfirmVerification = async () => {
    try {
      setSubmitting(true);
      await managerApi.verifyEquipment(bookingId, {
        confirmed: true,
        additional_notes: notes.trim(),
      });

      Alert.alert(
        "Equipment Verified",
        "The inventory items and equipment have been officially verified for dispatch."
      );
      if (onSuccess) onSuccess();
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error.response?.data?.message || "Failed to submit verification."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Equipment Dispatch Check"
        subtitle="Logistics & Item Readiness"
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={22} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.bannerCard} variant="flat">
          <View style={styles.bannerContent}>
            <ShieldCheck size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Manager Sign-Off</Text>
              <Text style={styles.bannerSub}>
                Confirm each inventory piece has been inspected, sanitized, and loaded for transit.
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>
            Booked Equipment Checklist ({inventoryItems.length})
          </Text>
          <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
            <Text style={styles.selectAllText}>Mark All Ready</Text>
          </TouchableOpacity>
        </View>

        {inventoryItems.length === 0 ? (
          <Card style={styles.emptyCard} variant="flat">
            <PackageCheck size={32} color={colors.textSubtle} style={{ marginBottom: 4 }} />
            <Text style={styles.emptyTitle}>No Equipment Items Required</Text>
            <Text style={styles.emptySub}>
              This catering package does not have separate inventory items listed.
            </Text>
          </Card>
        ) : (
          <View style={styles.checklist}>
            {inventoryItems.map((item, idx) => {
              const isChecked = Boolean(checkedMap[idx]);
              const name = item.name || item.inventory_id?.name || "Inventory Item";
              const qty = item.quantity || 1;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.checkItem, isChecked && styles.checkItemChecked]}
                  onPress={() => toggleCheck(idx)}
                  activeOpacity={0.8}
                >
                  <View style={styles.checkboxWrapper}>
                    {isChecked ? (
                      <CheckSquare size={20} color={colors.primary} />
                    ) : (
                      <Square size={20} color={colors.textDisabled} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
                      {name}
                    </Text>
                    <Text style={styles.itemCategory}>
                      Category: {item.inventory_id?.category || "Catering Supplies"}
                    </Text>
                  </View>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>Qty: {qty}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Card style={styles.notesCard}>
          <View style={styles.notesHeaderRow}>
            <FileText size={16} color={colors.foregroundMuted} />
            <Text style={styles.notesHeading}>Dispatch & Inspection Notes</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes on packaging conditions, fragile items, or driver instructions..."
            placeholderTextColor={colors.textDisabled}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Card>
      </ScrollView>

      {/* Footer Confirm */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        <AppButton
          title={alreadyVerified ? "Update Dispatch Confirmation" : "Confirm Equipment Dispatch"}
          variant="primary"
          size="lg"
          icon={ShieldCheck}
          loading={submitting}
          onPress={handleConfirmVerification}
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
  closeBtn: {
    padding: 4,
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
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bannerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  bannerSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  listTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  selectAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 2,
  },
  checklist: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadows.sm,
  },
  checkItemChecked: {
    borderColor: colors.primary,
    backgroundColor: "#F4F7FC",
  },
  checkboxWrapper: {
    padding: 2,
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  itemNameChecked: {
    color: colors.primary,
  },
  itemCategory: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 1,
  },
  qtyBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  notesCard: {
    marginBottom: spacing.md,
  },
  notesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notesHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  notesInput: {
    height: 80,
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

export default EquipmentDispatchModal;
