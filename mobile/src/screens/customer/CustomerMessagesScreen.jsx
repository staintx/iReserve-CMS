import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MessageSquare,
  Bell,
  CheckCheck,
  ChevronRight,
  User,
  Sparkles,
  Calendar,
  FileText,
  CreditCard,
  Utensils,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import messagesApi from "../../api/messages";
import notificationsApi from "../../api/notifications";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatRelativeTime } from "../../utils/format";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const CustomerMessagesScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    socket,
    unreadCount: socketNotifCount,
    decrementUnreadCount,
    clearUnreadCount,
  } = useSocket();

  // Segmented Tab: "messages" | "notifications" (Airbnb Reference)
  const initialTab =
    route?.params?.initialTab || route?.params?.tab || "messages";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Messages State
  const [conversations, setConversations] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [refreshingNotifs, setRefreshingNotifs] = useState(false);
  const [notifsError, setNotifsError] = useState("");

  // Sync tab if passed via navigation params
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    } else if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.initialTab, route?.params?.tab]);

  // --- Load Conversations ---
  const loadConversations = useCallback(async () => {
    setMessagesError("");
    try {
      const data = await messagesApi.listConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessagesError("Unable to load conversations.");
    } finally {
      setLoadingMessages(false);
      setRefreshingMessages(false);
    }
  }, []);

  // --- Load Notifications ---
  const loadNotifications = useCallback(async () => {
    setNotifsError("");
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
        setNotifsError("Unable to load notifications.");
      }
    } finally {
      setLoadingNotifs(false);
      setRefreshingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadNotifications();
  }, [loadConversations, loadNotifications]);

  // --- Real-time Socket Listeners ---
  useEffect(() => {
    if (!socket) return;

    // Incoming new message handler
    const handleNewMessage = (msg) => {
      setConversations((prev) => {
        const convId = String(msg.conversation_id);
        const idx = prev.findIndex((c) => String(c._id) === convId);

        if (idx >= 0) {
          const target = { ...prev[idx] };
          target.last_message = msg.body || "[Attachment]";
          target.last_message_at = msg.createdAt || new Date().toISOString();

          const isMe =
            String(msg.sender_id?._id || msg.sender_id) === String(user?._id);
          if (!isMe) {
            target.unread_customer_count =
              (target.unread_customer_count || 0) + 1;
          }

          return [target, ...prev.filter((_, i) => i !== idx)];
        } else {
          loadConversations();
          return prev;
        }
      });
    };

    // Incoming notification handler
    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => [
        newNotif,
        ...prev.filter((n) => n._id !== newNotif._id),
      ]);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, user?._id, loadConversations]);

  // Unread Counts
  const unreadMessagesTotal = useMemo(() => {
    return conversations.reduce(
      (acc, c) => acc + (c.unread_customer_count || 0),
      0
    );
  }, [conversations]);

  const unreadNotifsTotal = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Actions
  const onRefreshMessages = () => {
    setRefreshingMessages(true);
    loadConversations();
  };

  const onRefreshNotifs = () => {
    setRefreshingNotifs(true);
    loadNotifications();
  };

  const handleOpenConversation = (item) => {
    setConversations((prev) =>
      prev.map((c) =>
        c._id === item._id ? { ...c, unread_customer_count: 0 } : c
      )
    );

    navigation.navigate("CustomerChatThread", {
      conversationId: item._id,
      title: item.event_manager_id?.full_name || "Caezelle's Banquet Team",
    });
  };

  const handleStartNewChat = async () => {
    try {
      const newConv = await messagesApi.createConversation({});
      navigation.navigate("CustomerChatThread", {
        conversationId: newConv._id,
        title: "Caezelle's Banquet Team",
      });
    } catch (err) {
      loadConversations();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      clearUnreadCount();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn("Failed to mark all notifications read", err);
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

    if (item.meta?.booking_id) {
      navigation.navigate("BookingDetail", { id: item.meta.booking_id });
    } else if (item.meta?.inquiry_id) {
      navigation.navigate("QuotationDetail", { inquiryId: item.meta.inquiry_id });
    } else if (item.meta?.conversation_id) {
      navigation.navigate("CustomerChatThread", {
        conversationId: item.meta.conversation_id,
        title: "Caezelle's Banquet Team",
      });
    }
  };

  // --- Render Item: Airbnb Message Thread Row ---
  const renderMessageItem = ({ item }) => {
    const unread = item.unread_customer_count || 0;
    const recipientName =
      item.event_manager_id?.full_name || "Caezelle's Banquet Team";
    const contextTag = item.package_name || "Catering Services";

    return (
      <TouchableOpacity
        style={[styles.threadRow, unread > 0 && styles.threadRowUnread]}
        onPress={() => handleOpenConversation(item)}
        activeOpacity={0.7}
      >
        {/* Left Avatar (52px round) */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Utensils size={22} color={colors.primary} />
          </View>
          {unread > 0 && <View style={styles.unreadBadgeDot} />}
        </View>

        {/* Center Content */}
        <View style={styles.threadBody}>
          {/* Top Line: Sender Name · Context (Airbnb Reference) */}
          <View style={styles.senderLine}>
            <Text style={styles.senderName} numberOfLines={1}>
              {recipientName}
            </Text>
            <Text style={styles.senderContext} numberOfLines={1}>
              {" · "}{contextTag}
            </Text>
          </View>

          {/* Headline / Snippet: Bold if unread (Airbnb Reference) */}
          <Text
            style={[
              styles.messageSnippet,
              unread > 0 && styles.messageSnippetUnread,
            ]}
            numberOfLines={1}
          >
            {item.last_message || "Start a conversation with our catering team..."}
          </Text>

          {/* Bottom Line: Status / Timestamp Tag */}
          <View style={styles.statusLine}>
            <Text style={styles.statusText}>
              {unread > 0 ? "New message received" : "Catering support"}
            </Text>
            {item.last_message_at && (
              <Text style={styles.timestampText}>
                {" · "}{formatRelativeTime(item.last_message_at)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Render Item: Notification Row ---
  const renderNotificationItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notifRow,
          !item.is_read && styles.notifRowUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Notification Icon */}
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

        {/* Text Body */}
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

        {/* Unread indicator */}
        {!item.is_read && <View style={styles.notifUnreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Area with Safe Area Top (Airbnb Reference) */}
      <View
        style={[
          styles.headerWrap,
          { paddingTop: insets.top + (Platform.OS === "ios" ? 8 : 14) },
        ]}
      >
        {/* Screen Title: "Inbox" */}
        <View style={styles.titleRow}>
          <Text style={styles.largeTitle}>Inbox</Text>
          {activeTab === "notifications" && unreadNotifsTotal > 0 && (
            <TouchableOpacity
              style={styles.markReadBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <CheckCheck size={14} color={colors.primary} />
              <Text style={styles.markReadBtnText}>Mark read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Segmented Tab Bar: "Messages" | "Notifications" (Airbnb Reference) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "messages" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("messages")}
            activeOpacity={0.8}
          >
            <View style={styles.tabContentRow}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === "messages" && styles.tabTextActive,
                ]}
              >
                Messages
              </Text>
              {unreadMessagesTotal > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadMessagesTotal > 99 ? "99+" : unreadMessagesTotal}
                  </Text>
                </View>
              )}
            </View>
            {activeTab === "messages" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "notifications" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("notifications")}
            activeOpacity={0.8}
          >
            <View style={styles.tabContentRow}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === "notifications" && styles.tabTextActive,
                ]}
              >
                Notifications
              </Text>
              {unreadNotifsTotal > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadNotifsTotal > 99 ? "99+" : unreadNotifsTotal}
                  </Text>
                </View>
              )}
            </View>
            {activeTab === "notifications" && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Tab Content View */}
      {activeTab === "messages" ? (
        loadingMessages ? (
          <LoadingState message="Loading your conversations..." />
        ) : messagesError ? (
          <ErrorState message={messagesError} onRetry={loadConversations} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Have questions about menus, packages, or bookings? Send a message directly to our catering event coordinators."
            actionLabel="Message Catering Team"
            onAction={handleStartNewChat}
          />
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshingMessages}
                onRefresh={onRefreshMessages}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )
      ) : loadingNotifs ? (
        <LoadingState message="Loading notifications..." />
      ) : notifsError ? (
        <ErrorState message={notifsError} onRetry={loadNotifications} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up!"
          description="You'll receive notifications here when quotations are prepared, bookings update, or payments confirm."
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshingNotifs}
              onRefresh={onRefreshNotifs}
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
    backgroundColor: "#FFFFFF", // Crisp Airbnb white background
  },

  // --- Airbnb Top Header & Title ---
  headerWrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  largeTitle: {
    fontSize: 32,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  markReadBtnText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },

  // --- Segmented Tab Bar (Airbnb Reference) ---
  tabBar: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  tabBtn: {
    paddingVertical: 10,
    marginRight: 28,
    position: "relative",
  },
  tabBtnActive: {},
  tabContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.medium,
    fontWeight: "500",
    color: "#6B7280", // Light muted gray when inactive
  },
  tabTextActive: {
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#0F172A", // Bold black when active
  },
  tabBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: "#0F172A", // Solid active underline indicator
    borderRadius: 2,
  },

  // --- List Content ---
  listContent: {
    paddingTop: 8,
  },

  // --- Airbnb Message Thread Item ---
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  threadRowUnread: {
    backgroundColor: "rgba(239, 246, 255, 0.4)",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  unreadBadgeDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  threadBody: {
    flex: 1,
  },
  senderLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  senderName: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#0F172A",
    maxWidth: "60%",
  },
  senderContext: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.regular,
    color: "#6B7280",
    flex: 1,
  },
  messageSnippet: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.regular,
    color: "#374151",
    lineHeight: 19,
    marginBottom: 3,
  },
  messageSnippetUnread: {
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: typography.fontFamilies.regular,
  },
  timestampText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: typography.fontFamilies.regular,
  },

  // --- Notification Row ---
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
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

export default CustomerMessagesScreen;
