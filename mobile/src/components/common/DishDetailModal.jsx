import React, { useState } from "react";
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
import { X, Utensils, CheckCircle2, ChevronRight } from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { resolveDishImage, CATEGORY_FALLBACK_IMAGES } from "../../constants/cateringData";
import AppButton from "./AppButton";

export const DishDetailModal = ({ visible, dish, onClose, onSelectDish }) => {
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = useState(false);

  if (!dish) return null;

  const resolvedImage = resolveDishImage(dish);
  const fallbackImage =
    CATEGORY_FALLBACK_IMAGES[dish.category] || CATEGORY_FALLBACK_IMAGES.default;
  const imageSource = imageError ? fallbackImage : resolvedImage;

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
              accessibilityLabel="Close dish details"
            >
              <X size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Dish Photo */}
            <View style={styles.imageContainer}>
              {imageSource ? (
                <Image
                  source={{ uri: imageSource }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Utensils size={36} color={colors.primary} />
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
              title="Plan Event with Caezelle's"
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
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
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
