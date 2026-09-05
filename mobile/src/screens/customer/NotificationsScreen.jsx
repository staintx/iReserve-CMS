import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Bell, CheckCheck, ChevronRight, Inbox } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import notificationsApi from "../../api/notifications";
import { useSocket } from "../../context/SocketContext";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import Header from "../../components/common/Header";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatRelativeTime } from "../../utils/format";

export const NotificationsScreen = ({ navigation }) => {
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
      // Offline fallback: try reading cached notifications
      const cached = await getCachedData(CACHE_KEYS.NOTIFICATIONS);
      if (Array.isArray(cached) && cached.length > 0) {
        setNotifications(cached);
      } else {
        setError("Unable to load notifications. Please check your connection.");
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

    // Dynamic Navigation Routing based on notification payload
    if (item.meta?.booking_id) {
      navigation.navigate("BookingDetail", { id: item.meta.booking_id });
    } else if (item.meta?.inquiry_id) {
      navigation.navigate("QuotationDetail", { inquiryId: item.meta.inquiry_id });
    } else if (item.meta?.conversation_id) {
      navigation.navigate("CustomerChatThread", {
        conversationId: item.meta.conversation_id,
        title: "Catering Team",
      });
    }
  };

  const renderNotification = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contentRow}>
          <View style={[styles.dot, !item.is_read && styles.dotUnread]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !item.is_read && styles.titleUnread]}>
              {item.title}
            </Text>
            <Text style={styles.body}>{item.body || item.message}</Text>
            <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          <ChevronRight size={16} color={colors.foregroundMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <View style={styles.container}>
      <Header
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightElement={
          hasUnread ? (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={styles.markAllBtn}
              activeOpacity={0.7}
            >
              <CheckCheck size={18} color={colors.primary} />
              <Text style={styles.markAllText}>Mark read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

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
          contentContainerStyle={styles.listContent}
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
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.base,
  },
  notifCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notifCardUnread: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.cardBorder,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "transparent",
    marginRight: spacing.md,
  },
  dotUnread: {
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  titleUnread: {
    color: colors.foreground,
    fontWeight: "800",
  },
  body: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  time: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 4,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  markAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.primary,
  },
});

export default NotificationsScreen;
