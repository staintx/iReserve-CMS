import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Bell, Sparkles } from "lucide-react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { useSocket } from "../../context/SocketContext";
import NotificationBadge from "../common/NotificationBadge";

export const CustomerHeaderIcons = ({ navigation: propNavigation, style, zelleRef }) => {
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const { unreadCount = 0 } = useSocket() || {};

  return (
    <View style={[styles.headerIcons, style]}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => navigation.navigate("Notifications")}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unreadCount} unread`}
      >
        <Bell size={19} color={colors.foreground} />
        <NotificationBadge count={unreadCount} />
      </TouchableOpacity>

      <View ref={zelleRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.iconBtn, styles.zelleBtn]}
          onPress={() => navigation.navigate("ZelleChat")}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Ask Zelle AI Assistant"
        >
          <Sparkles size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  zelleBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.powder,
  },
});

export default CustomerHeaderIcons;
