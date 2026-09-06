import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, MapPin, Users, Sparkles, CheckCircle2, ChevronRight } from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import AppButton from "./AppButton";

export const GalleryLightboxModal = ({ visible, item, onClose, onInquireSetup }) => {
  const insets = useSafeAreaInsets();

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
          {/* Top Bar with Close Button */}
          <View style={styles.topBar}>
            <View style={styles.categoryBadge}>
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.categoryText}>{item.category || "Event Setup"}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Image & Detail Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: item.image_url }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.title}>{item.title}</Text>

              {Boolean(item.venue) && (
                <View style={styles.metaRow}>
                  <MapPin size={15} color={colors.primary} />
                  <Text style={styles.venueText}>{item.venue}</Text>
                </View>
              )}

              {Boolean(item.pax) && (
                <View style={styles.metaRow}>
                  <Users size={15} color={colors.foregroundMuted} />
                  <Text style={styles.paxText}>Capacity: {item.pax}</Text>
                </View>
              )}

              {Boolean(item.description) && (
                <Text style={styles.description}>{item.description}</Text>
              )}

              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <View style={styles.tagWrap}>
                  {item.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagPill}>
                      <CheckCircle2 size={12} color={colors.primary} />
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action CTA */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
            <AppButton
              title="Inquire for this Setup"
              variant="primary"
              size="lg"
              icon={ChevronRight}
              onPress={() => {
                onClose();
                if (onInquireSetup) onInquireSetup(item);
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
    backgroundColor: "rgba(10, 15, 29, 0.88)",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 20,
  },
  imageWrapper: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    aspectRatio: 16 / 10,
    width: "100%",
    ...shadows.lg,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  venueText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
  paxText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
  },
  description: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.foreground,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary,
  },
  bottomBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});

export default GalleryLightboxModal;
