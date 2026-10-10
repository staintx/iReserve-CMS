import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { ChevronRight, Utensils } from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { resolveDishImage, CATEGORY_FALLBACK_IMAGES } from "../../constants/cateringData";

/**
 * DishCard
 * Simplified, discovery-oriented culinary card without individual retail pricing
 * or Inquire buttons. Prioritizes dish image, category, title, description,
 * and clear tap interaction.
 */
export const DishCard = ({ dish, onPress, style }) => {
  const [imageError, setImageError] = useState(false);

  if (!dish) return null;

  const resolvedImage = resolveDishImage(dish);
  const fallbackImage =
    CATEGORY_FALLBACK_IMAGES[dish.category] || CATEGORY_FALLBACK_IMAGES.default;
  const imageSource = imageError ? fallbackImage : resolvedImage;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${dish.name || "culinary dish"}`}
    >
      {/* Dish Media with fallback handling */}
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
            <Utensils size={22} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Dish Info Body */}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.courseBadge}>
            <Text style={styles.courseBadgeText}>
              {dish.category || "Catering Dish"}
            </Text>
          </View>
          <ChevronRight size={15} color={colors.textDisabled} />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {dish.name}
        </Text>

        {Boolean(dish.description) && (
          <Text style={styles.description} numberOfLines={3}>
            {dish.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
    minHeight: 104,
    ...shadows.xs,
  },
  imageContainer: {
    width: 92,
    height: 92,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 92,
    height: 92,
  },
  imagePlaceholder: {
    width: 92,
    height: 92,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    marginLeft: spacing.sm + 2,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  courseBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: "flex-start",
  },
  courseBadgeText: {
    fontSize: 9.5,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    lineHeight: 18,
    marginBottom: 3,
  },
  description: {
    fontSize: 11.5,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
});

export default DishCard;
