import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MessageSquare, ChevronRight, User } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import messagesApi from "../../api/messages";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatRelativeTime } from "../../utils/format";

export const CustomerMessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    setError("");
    try {
      const data = await messagesApi.listConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Unable to load conversations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Real-time socket message listener to bump conversations instantly
  useEffect(() => {
    if (!socket) return;

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
            target.unread_customer_count = (target.unread_customer_count || 0) + 1;
          }

          // Move updated conversation to top
          return [target, ...prev.filter((_, i) => i !== idx)];
        } else {
          // If brand new conversation not currently in list, refresh
          loadConversations();
          return prev;
        }
      });
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, user?._id, loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleOpenConversation = (item) => {
    // Optimistically reset unread counter on opening
    setConversations((prev) =>
      prev.map((c) =>
        c._id === item._id ? { ...c, unread_customer_count: 0 } : c
      )
    );

    navigation.navigate("CustomerChatThread", {
      conversationId: item._id,
      title: item.event_manager_id?.full_name || "Caezelle's Catering Team",
    });
  };

  const handleStartNewChat = async () => {
    try {
      const newConv = await messagesApi.createConversation({});
      navigation.navigate("CustomerChatThread", {
        conversationId: newConv._id,
        title: "Caezelle's Catering Team",
      });
    } catch (err) {
      loadConversations();
    }
  };

  const renderConversationItem = ({ item }) => {
    const unread = item.unread_customer_count || 0;
    const recipientName =
      item.event_manager_id?.full_name || "Catering Event Support";

    return (
      <Card
        style={styles.convCard}
        onPress={() => handleOpenConversation(item)}
      >
        <View style={styles.avatar}>
          <User size={20} color={colors.primary} />
        </View>

        <View style={styles.convBody}>
          <View style={styles.convHeader}>
            <Text style={styles.recipientName}>{recipientName}</Text>
            {item.last_message_at && (
              <Text style={styles.timeText}>
                {formatRelativeTime(item.last_message_at)}
              </Text>
            )}
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.lastMessage,
                unread > 0 && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {item.last_message || "Start a conversation..."}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Messages" showBack={false} />

      {loading ? (
        <LoadingState message="Loading your messages..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadConversations} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Have questions about packages or your booking? Send a message directly to our catering team."
          actionLabel="Message Catering Team"
          onAction={handleStartNewChat}
        />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
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
    paddingBottom: 110,
  },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderFocus,
  },
  convBody: {
    flex: 1,
  },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  recipientName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  timeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    flex: 1,
    marginRight: spacing.sm,
  },
  lastMessageUnread: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.bold,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
});

export default CustomerMessagesScreen;
