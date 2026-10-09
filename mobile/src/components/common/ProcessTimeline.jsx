import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

const DEFAULT_STEPS = [
  { key: "submitted", label: "Request Submitted" },
  { key: "review", label: "Review & Pricing" },
  { key: "quote_ready", label: "Quotation Ready" },
  { key: "confirmed", label: "Booking Confirmed" },
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
    norm === "pending review"
  ) {
    return 1; // Step 2
  }

  return 0; // Step 1: Request Submitted
};

export const ProcessTimeline = ({
  status,
  currentStepIndex,
  steps = DEFAULT_STEPS,
  style,
}) => {
  const activeIndex = typeof currentStepIndex === "number"
    ? currentStepIndex
    : getStepIndexFromStatus(status);

  const totalSteps = steps.length;
  const progressRatio = totalSteps > 1 ? Math.min(activeIndex, totalSteps - 1) / (totalSteps - 1) : 0;
  const halfStepPercent = totalSteps > 0 ? (100 / (totalSteps * 2)) : 12.5;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.trackWrapper}>
        {/* Continuous connector line behind circles */}
        <View
          style={[
            styles.lineContainer,
            { left: `${halfStepPercent}%`, right: `${halfStepPercent}%` },
          ]}
        >
          <View style={styles.lineBackground} />
          <View
            style={[
              styles.lineProgress,
              { width: `${progressRatio * 100}%` },
            ]}
          />
        </View>

        {/* Responsive Step Columns */}
        <View style={styles.stepsRow}>
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isUpcoming = idx > activeIndex;

            return (
              <View key={step.key || idx} style={styles.stepCol}>
                {/* Node Circle */}
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCircleCompleted,
                    isCurrent && styles.nodeCircleCurrent,
                    isUpcoming && styles.nodeCircleUpcoming,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.nodeNumber,
                        isCurrent && styles.nodeNumberCurrent,
                        isUpcoming && styles.nodeNumberUpcoming,
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
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                    isUpcoming && styles.stepLabelUpcoming,
                  ]}
                  numberOfLines={2}
                >
                  {step.label}
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
    backgroundColor: colors.success,
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
    paddingHorizontal: 2,
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
  nodeCircleCompleted: {
    backgroundColor: colors.success,
  },
  nodeCircleCurrent: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  nodeCircleUpcoming: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  nodeNumber: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  nodeNumberCurrent: {
    color: colors.white,
  },
  nodeNumberUpcoming: {
    color: colors.foregroundMuted,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 12,
    fontFamily: typography.fontFamilies.medium,
  },
  stepLabelCompleted: {
    color: colors.success,
    fontWeight: "600",
  },
  stepLabelCurrent: {
    color: colors.foreground,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  stepLabelUpcoming: {
    color: colors.foregroundMuted,
    opacity: 0.75,
  },
});

export default ProcessTimeline;
