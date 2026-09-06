import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { CheckCircle2, Clock, Sparkles } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export const StatusBadge = ({ status, size = "md", showDot = true, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  if (!status) return null;

  const normalized = String(status).trim().toLowerCase();

  let bgColor = colors.surfaceAlt;
  let textColor = colors.foreground;
  let borderColor = colors.cardBorder;
  let label = status;
  let isLive = false;
  let isConfirmed = false;

  if (
    normalized.includes("confirmed") ||
    normalized.includes("approved") ||
    normalized === "accepted" ||
    normalized === "deposit_paid" ||
    normalized === "proceed" ||
    normalized.includes("ready for event")
  ) {
    bgColor = colors.successLight;
    textColor = colors.successText;
    borderColor = colors.successBorder;
    isLive = true;
    isConfirmed = true;
  } else if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized === "draft"
  ) {
    bgColor = colors.warningLight;
    textColor = colors.warningDark;
    borderColor = colors.warningBorder;
    isLive = true;
  } else if (
    normalized.includes("ready") ||
    normalized.includes("scheduled") ||
    normalized.includes("sent") ||
    normalized === "ongoing"
  ) {
    bgColor = colors.primaryLight;
    textColor = colors.primary;
    borderColor = colors.powderBlue;
    isLive = true;
  } else if (
    normalized.includes("completed") ||
    normalized === "fully_paid"
  ) {
    bgColor = colors.primaryLight;
    textColor = colors.primary;
    borderColor = colors.powderBlue;
    isLive = false;
  } else if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("refund") ||
    normalized.includes("expired") ||
    normalized.includes("failed")
  ) {
    bgColor = colors.errorLight;
    textColor = colors.error;
    borderColor = colors.errorBorder;
    isLive = false;
  } else if (
    normalized.includes("revision")
  ) {
    bgColor = colors.primaryLight;
    textColor = colors.primaryHover;
    borderColor = colors.primaryBorder;
    isLive = true;
  }

  useEffect(() => {
    if (!isLive || !showDot || isConfirmed) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLive, showDot, isConfirmed, pulseAnim]);

  // Clean label mapping matching web
  if (normalized === "deposit_paid") label = "Deposit Paid";
  if (normalized === "fully_paid") label = "Fully Paid";
  if (normalized === "under review") label = "Under Review";
  if (normalized === "pending quote review") label = "Pending Quote Review";
  if (normalized === "quotation sent") label = "Quote Ready";

  const dotSize = size === "sm" ? 6 : 7;
  const iconSize = size === "sm" ? 12 : 13;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          paddingVertical: size === "sm" ? 3 : 4,
          paddingHorizontal: size === "sm" ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      {isConfirmed ? (
        <CheckCircle2
          size={iconSize}
          color={textColor}
          style={{ marginRight: 4 }}
        />
      ) : showDot && isLive ? (
        <View style={styles.dotContainer}>
          <Animated.View
            style={[
              styles.beaconWave,
              {
                width: dotSize * 1.8,
                height: dotSize * 1.8,
                borderRadius: dotSize * 0.9,
                backgroundColor: textColor,
                transform: [{ scale: pulseAnim }],
                opacity: 0.35,
              },
            ]}
          />
          <View
            style={[
              styles.beaconCenter,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: textColor,
              },
            ]}
          />
        </View>
      ) : null}

      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: size === "sm" ? typography.sizes.xs : typography.sizes.sm,
            fontFamily: typography.fontFamilies.bold,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dotContainer: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  beaconWave: {
    position: "absolute",
  },
  beaconCenter: {
    position: "absolute",
  },
  text: {
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});

export default StatusBadge;

