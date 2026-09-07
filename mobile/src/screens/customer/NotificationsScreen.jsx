import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  Calendar,
  FileText,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import notificationsApi from "../../api/notifications";
import { useSocket } from "../../context/SocketContext";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatRelativeTime } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export const NotificationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket, decrementUnreadCount, clearUnreadCount } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setError("");
    try {
      const response = await notificationsApi.getMine();
      const items = Array.isArray(response)
        ? response
        : response?.items || [];
      setNotifications(items);
      cacheData(CACHE_KEYS.NOTIFICATIONS, items);
    } catch (err) {
      const cached = await getCachedData(CACHE_KEYS.NOTIFICATIONS);
      if (Array.isArray(cached) && cached.length > 0) {
        setNotifications(cached);
      } else {
        setError("Unable to load notifications.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time live notification socket feed
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (newNotif) => {
      setNotifications((prev) => [
        newNotif,
        ...prev.filter((n) => n._id !== newNotif._id),
      ]);
    };

    socket.on("notification:new", handleNewNotif);

    return () => {
      socket.off("notification:new", handleNewNotif);
    };
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      clearUnreadCount();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn("Failed to mark all read", err);
    }
  };

  const handleNotificationPress = async (item) => {
    if (!item.is_read) {
      notificationsApi.markRead(item._id).catch(() => {});
      decrementUnreadCount(1);
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, is_read: true } : n))
      );
    }

    const role = user?.role;
    const isManager = role === "manager" || role === "admin";
    const isStaff = role === "staff";

    if (item.meta?.booking_id) {
      if (isManager) {
        navigation.navigate("ManagerBookingDetail", { bookingId: item.meta.booking_id, id: item.meta.booking_id });
      } else if (isStaff) {
        navigation.navigate("StaffEventDetail", { bookingId: item.meta.booking_id, id: item.meta.booking_id });
      } else {
        navigation.navigate("BookingDetail", { id: item.meta.booking_id, bookingId: item.meta.booking_id });
      }
    } else if (item.meta?.inquiry_id) {
      if (isManager) {
        navigation.navigate("ManagerBookings", { tab: "all" });
      } else {
        navigation.navigate("QuotationDetail", { inquiryId: item.meta.inquiry_id });
      }
    } else if (item.meta?.conversation_id) {
      navigation.navigate("CustomerChatThread", {
        conversationId: item.meta.conversation_id,
        title: isManager ? "Event Client" : isStaff ? "Event Team" : "Caezelle's Banquet Team",
      });
    }
  };

  const renderNotification = ({ item }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notifRow,
          !item.is_read && styles.notifRowUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.notifIconCircle,
            !item.is_read && styles.notifIconCircleUnread,
          ]}
        >
          {item.meta?.booking_id ? (
            <Calendar size={18} color={colors.primary} />
          ) : item.meta?.inquiry_id ? (
            <FileText size={18} color="#D97706" />
          ) : (
            <Bell size={18} color={colors.primary} />
          )}
        </View>

        <View style={styles.notifBody}>
          <View style={styles.notifHeaderRow}>
            <Text
              style={[
                styles.notifTitle,
                !item.is_read && styles.notifTitleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.notifTime}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>

          <Text
            style={[
              styles.notifMessage,
              !item.is_read && styles.notifMessageUnread,
            ]}
            numberOfLines={2}
          >
            {item.body || item.message}
          </Text>
        </View>

        {!item.is_read && <View style={styles.notifUnreadDot} />}
      </TouchableOpacity>
    );
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <View style={styles.container}>
      {/* Airbnb Header Bar */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: insets.top + (Platform.OS === "ios" ? 8 : 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        {hasUnread && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
            activeOpacity={0.7}
          >
            <CheckCheck size={14} color={colors.primary} />
            <Text style={styles.markAllText}>Mark read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up!"
          description="You will be notified live when quotes are issued, payments confirm, or events update."
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginLeft: 8,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  listContent: {
    paddingTop: 8,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  notifRowUnread: {
    backgroundColor: "rgba(239, 246, 255, 0.4)",
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  notifIconCircleUnread: {
    backgroundColor: colors.primaryLight,
  },
  notifBody: {
    flex: 1,
    marginRight: 8,
  },
  notifHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.medium,
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#0F172A",
  },
  notifTime: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: typography.fontFamilies.regular,
  },
  notifMessage: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  notifMessageUnread: {
    color: "#1F2937",
    fontFamily: typography.fontFamilies.medium,
  },
  notifUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

export default NotificationsScreen;
