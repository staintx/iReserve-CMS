import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Utensils, CheckCircle2, ChevronRight, Tag } from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { resolveDishImage } from "../../constants/cateringData";
import AppButton from "./AppButton";
import { formatCurrency } from "../../utils/format";

export const DishDetailModal = ({ visible, dish, onClose, onSelectDish }) => {
  const insets = useSafeAreaInsets();

  if (!dish) return null;

  const imageUrl = resolveDishImage(dish);
  const price = Number(dish.price || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
          {/* Header handle & Close */}
          <View style={styles.sheetTopRow}>
            <View style={styles.courseBadge}>
              <Utensils size={13} color={colors.primary} />
              <Text style={styles.courseText}>{dish.category || "Catering Dish"}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Dish Photo */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
              {price > 0 && (
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>{formatCurrency(price)} / serving</Text>
                </View>
              )}
            </View>

            {/* Content Details */}
            <View style={styles.infoSection}>
              <Text style={styles.dishName}>{dish.name}</Text>

              <Text style={styles.dishDesc}>
                {dish.description ||
                  "Freshly prepared by Caezelle's culinary team using quality ingredients and signature savory marinades for your catering events."}
              </Text>

              <View style={styles.inclusionsCard}>
                <View style={styles.inclusionsHeader}>
                  <CheckCircle2 size={16} color={colors.primary} />
                  <Text style={styles.inclusionsTitle}>Catering Availability</Text>
                </View>
                <Text style={styles.inclusionsDesc}>
                  Available as part of our Buffet, Plated, or Special Combo packages. You can customize this dish into your event quotation.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action CTA */}
          <View style={styles.ctaRow}>
            <AppButton
              title="Add to Event Inquiry"
              variant="primary"
              size="lg"
              icon={ChevronRight}
              onPress={() => {
                onClose();
                if (onSelectDish) onSelectDish(dish);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: "85%",
    paddingTop: spacing.md,
    ...shadows.lg,
  },
  sheetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  courseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  courseText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.xs,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  priceTag: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  priceTagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  infoSection: {
    paddingVertical: spacing.md,
  },
  dishName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  dishDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    lineHeight: 22,
  },
  inclusionsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inclusionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  inclusionsTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  inclusionsDesc: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    lineHeight: 18,
  },
  ctaRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});

export default DishDetailModal;
