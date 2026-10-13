import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

const DEFAULT_STEPS = [
  { key: "submitted", label: "Request Submitted", shortLabel: "Submitted" },
  { key: "review", label: "Review & Pricing", shortLabel: "Review" },
  { key: "quote_ready", label: "Quotation Ready", shortLabel: "Quote Ready" },
  { key: "confirmed", label: "Booking Confirmed", shortLabel: "Confirmed" },
];

/**
 * Maps inquiry or booking status string to current step index (0-3)
 */
export const getStepIndexFromStatus = (status = "") => {
  const norm = String(status).toLowerCase().trim();

  if (
    norm.includes("confirmed") ||
    norm.includes("reserved") ||
    norm === "deposit_paid" ||
    norm === "accepted" ||
    norm === "booked" ||
    norm === "ready for event"
  ) {
    return 3; // Step 4
  }

  if (
    norm.includes("quotation") ||
    norm.includes("quote ready") ||
    norm.includes("quote sent") ||
    norm === "quotation sent"
  ) {
    return 2; // Step 3
  }

  if (
    norm.includes("review") ||
    norm.includes("pricing") ||
    norm === "under review" ||
    norm === "pending review" ||
    norm === "revision requested"
  ) {
    return 1; // Step 2
  }

  return 0; // Step 1: Request Submitted
};

export const ProcessTimeline = ({
  status,
  currentStepIndex,
  steps = DEFAULT_STEPS,
  compact = false,
  style,
}) => {
  const norm = String(status || "").toLowerCase().trim();
  const isCancelledOrExpired =
    norm.includes("cancel") ||
    norm.includes("reject") ||
    norm.includes("expired");

  const activeIndex = typeof currentStepIndex === "number"
    ? currentStepIndex
    : getStepIndexFromStatus(status);

  const totalSteps = steps.length;
  const progressRatio = totalSteps > 1
    ? (isCancelledOrExpired ? 0 : Math.min(activeIndex, totalSteps - 1) / (totalSteps - 1))
    : 0;
  const halfStepPercent = totalSteps > 0 ? (100 / (totalSteps * 2)) : 12.5;

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View style={styles.trackWrapper}>
        {/* Continuous connector line behind circles */}
        <View
          style={[
            styles.lineContainer,
            compact && styles.lineContainerCompact,
            { left: `${halfStepPercent}%`, right: `${halfStepPercent}%` },
          ]}
        >
          <View style={styles.lineBackground} />
          <View
            style={[
              styles.lineProgress,
              { width: `${progressRatio * 100}%` },
              isCancelledOrExpired && { backgroundColor: colors.textDisabled },
            ]}
          />
        </View>

        {/* Responsive Step Columns */}
        <View style={styles.stepsRow}>
          {steps.map((step, idx) => {
            const isCompleted = !isCancelledOrExpired && idx < activeIndex;
            const isCurrent = !isCancelledOrExpired && idx === activeIndex;
            const isUpcoming = isCancelledOrExpired || idx > activeIndex;

            return (
              <View key={step.key || idx} style={styles.stepCol}>
                {/* Node Circle */}
                <View
                  style={[
                    styles.nodeCircle,
                    compact && styles.nodeCircleCompact,
                    isCompleted && styles.nodeCircleCompleted,
                    isCurrent && styles.nodeCircleCurrent,
                    isUpcoming && styles.nodeCircleUpcoming,
                    isCancelledOrExpired && styles.nodeCircleCancelled,
                  ]}
                >
                  {isCompleted ? (
                    <Check
                      size={compact ? 9 : 11}
                      color={colors.white}
                      strokeWidth={compact ? 2.5 : 3}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.nodeNumber,
                        compact && styles.nodeNumberCompact,
                        isCurrent && styles.nodeNumberCurrent,
                        isUpcoming && styles.nodeNumberUpcoming,
                        isCancelledOrExpired && styles.nodeNumberCancelled,
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>

                {/* Step Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    compact && styles.stepLabelCompact,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                    isUpcoming && styles.stepLabelUpcoming,
                    isCancelledOrExpired && styles.stepLabelCancelled,
                  ]}
                  numberOfLines={compact ? 1 : 2}
                >
                  {compact ? (step.shortLabel || step.label) : step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  containerCompact: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  trackWrapper: {
    position: "relative",
    width: "100%",
  },
  lineContainer: {
    position: "absolute",
    top: 10,
    height: 2,
    zIndex: 1,
  },
  lineContainerCompact: {
    top: 7,
    height: 1.5,
  },
  lineBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.cardBorder,
  },
  lineProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    zIndex: 2,
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 1,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    zIndex: 3,
  },
  nodeCircleCompact: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 3,
  },
  nodeCircleCompleted: {
    backgroundColor: colors.success,
  },
  nodeCircleCurrent: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 2,
  },
  nodeCircleUpcoming: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  nodeCircleCancelled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  nodeNumber: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  nodeNumberCompact: {
    fontSize: 8.5,
    lineHeight: 10,
  },
  nodeNumberCurrent: {
    color: colors.white,
  },
  nodeNumberUpcoming: {
    color: colors.foregroundMuted,
  },
  nodeNumberCancelled: {
    color: colors.textDisabled,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 12,
    fontFamily: typography.fontFamilies.medium,
  },
  stepLabelCompact: {
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: -0.1,
  },
  stepLabelCompleted: {
    color: colors.successText,
    fontWeight: "600",
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  stepLabelUpcoming: {
    color: colors.foregroundMuted,
    opacity: 0.75,
  },
  stepLabelCancelled: {
    color: colors.textDisabled,
  },
});

export default ProcessTimeline;
