import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  CreditCard,
  FileText,
  Calendar,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { navigateGlobal } from "../../navigation/RootNavigator";

// Event bus for app-wide notification toast triggers
const listeners = new Set();

export const showInAppNotification = (notification) => {
  listeners.forEach((listener) => listener(notification));
};

export const InAppNotificationBanner = () => {
  const insets = useSafeAreaInsets();
  const [currentNotif, setCurrentNotif] = useState(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);

  const dismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentNotif(null);
    });
  };

  useEffect(() => {
    const handleNotification = (notif) => {
      if (!notif) return;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      setCurrentNotif(notif);

      // Slide down
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4.5 seconds
      dismissTimer.current = setTimeout(() => {
        dismiss();
      }, 4500);
    };

    listeners.add(handleNotification);
    return () => {
      listeners.delete(handleNotification);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!currentNotif) return null;

  const handlePress = () => {
    const meta = currentNotif.meta || {};
    dismiss();

    if (meta.booking_id) {
      navigateGlobal("BookingDetail", { id: meta.booking_id });
    } else if (meta.inquiry_id) {
      navigateGlobal("QuotationDetail", { inquiryId: meta.inquiry_id });
    } else if (meta.conversation_id) {
      navigateGlobal("CustomerChatThread", {
        conversationId: meta.conversation_id,
        title: "Catering Team",
      });
    } else {
      navigateGlobal("Notifications");
    }
  };

  const getIcon = () => {
    const type = (currentNotif.type || "").toLowerCase();
    const title = (currentNotif.title || "").toLowerCase();

    if (type.includes("payment") || title.includes("payment") || title.includes("deposit")) {
      return <CreditCard size={18} color={colors.success} />;
    }
    if (type.includes("quote") || title.includes("quotation") || title.includes("inquiry")) {
      return <FileText size={18} color={colors.accentDark} />;
    }
    if (title.includes("assign") || title.includes("shift") || title.includes("event")) {
      return <Calendar size={18} color={colors.primary} />;
    }
    if (title.includes("message") || type.includes("chat")) {
      return <MessageSquare size={18} color={colors.primary} />;
    }
    return <Sparkles size={18} color={colors.primary} />;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        <View style={styles.iconCircle}>{getIcon()}</View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentNotif.title || "Notification"}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {currentNotif.body || currentNotif.message || ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={colors.textSubtle} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 9998,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.lg,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 2,
  },
  body: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  closeBtn: {
    padding: spacing.xs,
  },
});

export default InAppNotificationBanner;
