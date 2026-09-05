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

  return (
    <View style={[styles.container, style]}>
      <View style={styles.trackRow}>
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isUpcoming = idx > activeIndex;

          return (
            <React.Fragment key={step.key || idx}>
              {/* Node / Pin */}
              <View style={styles.nodeWrapper}>
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCircleCompleted,
                    isCurrent && styles.nodeCircleCurrent,
                    isUpcoming && styles.nodeCircleUpcoming,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color={colors.white} strokeWidth={3} />
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

              {/* Connecting Line (except after last step) */}
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    idx < activeIndex ? styles.connectorCompleted : styles.connectorUpcoming,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "relative",
  },
  nodeWrapper: {
    alignItems: "center",
    width: 68,
    zIndex: 2,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  nodeCircleCompleted: {
    backgroundColor: colors.success,
  },
  nodeCircleCurrent: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeCircleUpcoming: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  nodeNumber: {
    fontSize: 11,
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
    opacity: 0.7,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    marginTop: 11, // centers line with the 24px circle
    marginHorizontal: -4,
    zIndex: 1,
  },
  connectorCompleted: {
    backgroundColor: colors.success,
  },
  connectorUpcoming: {
    backgroundColor: colors.cardBorder,
  },
});

export default ProcessTimeline;
