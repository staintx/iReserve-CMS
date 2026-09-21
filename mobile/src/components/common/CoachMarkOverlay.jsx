import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Check, X, Sparkles } from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const CoachMarkOverlay = ({
  visible,
  step,
  stepIndex = 0,
  totalSteps = 1,
  targetLayout = null, // { x, y, width, height }
  onNext,
  onSkip,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Subtle pulse animation on the highlight box
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, stepIndex]);

  if (!visible || !step) return null;

  const isLastStep = stepIndex === totalSteps - 1;

  // Determine target cutout dimensions with padding
  const padding = 6;
  const hasTarget =
    targetLayout &&
    targetLayout.width > 0 &&
    targetLayout.height > 0 &&
    targetLayout.x !== undefined &&
    targetLayout.y !== undefined;

  const cutout = hasTarget
    ? {
        x: Math.max(0, targetLayout.x - padding),
        y: Math.max(0, targetLayout.y - padding),
        width: Math.min(SCREEN_WIDTH, targetLayout.width + padding * 2),
        height: Math.min(SCREEN_HEIGHT, targetLayout.height + padding * 2),
      }
    : null;

  // Compute Tooltip Placement (above or below target)
  const tooltipWidth = Math.min(SCREEN_WIDTH - 32, 340);
  let tooltipStyle = {};
  let placement = step.placement || "auto";

  if (cutout) {
    if (placement === "auto") {
      // If target is in the upper 48% of screen, place tooltip below; else place above
      placement = cutout.y < SCREEN_HEIGHT * 0.48 ? "bottom" : "top";
    }

    if (placement === "bottom") {
      tooltipStyle = {
        top: Math.min(SCREEN_HEIGHT - 220, cutout.y + cutout.height + 14),
        left: Math.max(16, Math.min(SCREEN_WIDTH - tooltipWidth - 16, cutout.x + (cutout.width / 2) - (tooltipWidth / 2))),
      };
    } else {
      // Top placement
      tooltipStyle = {
        top: Math.max(insets.top + 20, cutout.y - 190),
        left: Math.max(16, Math.min(SCREEN_WIDTH - tooltipWidth - 16, cutout.x + (cutout.width / 2) - (tooltipWidth / 2))),
      };
    }
  } else {
    // Fallback: center of screen
    tooltipStyle = {
      top: SCREEN_HEIGHT / 2 - 100,
      left: (SCREEN_WIDTH - tooltipWidth) / 2,
    };
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onSkip || onDismiss}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Scrim Planes (4-plane cutout mechanism for cross-platform transparency) */}
        {cutout ? (
          <>
            {/* Top Plane */}
            <View
              style={[
                styles.scrimPlane,
                { top: 0, left: 0, right: 0, height: cutout.y },
              ]}
            />
            {/* Bottom Plane */}
            <View
              style={[
                styles.scrimPlane,
                {
                  top: cutout.y + cutout.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            {/* Left Plane */}
            <View
              style={[
                styles.scrimPlane,
                {
                  top: cutout.y,
                  left: 0,
                  width: cutout.x,
                  height: cutout.height,
                },
              ]}
            />
            {/* Right Plane */}
            <View
              style={[
                styles.scrimPlane,
                {
                  top: cutout.y,
                  left: cutout.x + cutout.width,
                  right: 0,
                  height: cutout.height,
                },
              ]}
            />

            {/* Glowing Spotlight Target Border */}
            <Animated.View
              style={[
                styles.spotlightHighlight,
                {
                  top: cutout.y,
                  left: cutout.x,
                  width: cutout.width,
                  height: cutout.height,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
              pointerEvents="none"
            />
          </>
        ) : (
          // Full scrim fallback if target is not measured
          <View style={[styles.scrimPlane, StyleSheet.absoluteFill]} />
        )}

        {/* Animated Tooltip Bubble Card */}
        <Animated.View
          style={[
            styles.tooltipCard,
            tooltipStyle,
            { width: tooltipWidth, opacity: fadeAnim },
          ]}
        >
          {/* Header Row: Step Badge & Skip Button */}
          <View style={styles.tooltipHeader}>
            <View style={styles.stepBadge}>
              <Sparkles size={12} color={colors.primary} />
              <Text style={styles.stepBadgeText}>
                Step {stepIndex + 1} of {totalSteps}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onSkip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip tour</Text>
            </TouchableOpacity>
          </View>

          {/* Title & Body */}
          <Text style={styles.tooltipTitle}>{step.title}</Text>
          <Text style={styles.tooltipDescription}>{step.description}</Text>

          {/* Footer Navigation */}
          <View style={styles.tooltipFooter}>
            {/* Progress Dots */}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i === stepIndex
                      ? styles.progressDotActive
                      : styles.progressDotInactive,
                  ]}
                />
              ))}
            </View>

            {/* Next / Got It Button */}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={onNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? "Got it" : "Next"}
              </Text>
              {isLastStep ? (
                <Check size={15} color={colors.white} />
              ) : (
                <ChevronRight size={15} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrimPlane: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  spotlightHighlight: {
    position: "absolute",
    borderRadius: radius.md,
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: "rgba(37, 99, 235, 0.06)",
    ...shadows.md,
  },
  tooltipCard: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderBrand,
    ...shadows.lg,
    zIndex: 10000,
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    gap: 4,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  skipButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.medium,
    fontWeight: "500",
    color: colors.textSubtle,
  },
  tooltipTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    marginVertical: spacing.xs,
    letterSpacing: -0.2,
  },
  tooltipDescription: {
    fontSize: 13.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  tooltipFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xxs,
  },
  progressDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  progressDotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  progressDotInactive: {
    width: 6,
    backgroundColor: colors.border,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    gap: 4,
    ...shadows.sm,
  },
  nextButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.white,
  },
});

export default CoachMarkOverlay;
