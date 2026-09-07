import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Send,
  AlertCircle,
  Clock,
  ChevronLeft,
  Utensils,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import messagesApi from "../../api/messages";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { formatTime } from "../../utils/format";

export const CustomerChatThreadScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { conversationId, title = "Caezelle's Banquet Team" } = route.params;
  const { user, token } = useAuth();
  const { socket, setActiveConversationId } = useSocket();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);

  // Suppress in-app banners for this conversation while active
  useEffect(() => {
    if (setActiveConversationId) {
      setActiveConversationId(conversationId);
    }
    return () => {
      if (setActiveConversationId) {
        setActiveConversationId(null);
      }
    };
  }, [conversationId, setActiveConversationId]);

  // Load initial message history
  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const data = await messagesApi.getMessages(conversationId);
        if (isMounted) {
          setMessages(Array.isArray(data) ? data : []);
          messagesApi.markAsRead(conversationId).catch(() => {});
        }
      } catch (err) {
        console.warn("Error fetching chat messages", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // Socket room listener & real-time message handler
  useEffect(() => {
    if (!socket) return;

    socket.emit("conversation:join", { conversationId, token });

    const handleNewMessage = (payload) => {
      if (String(payload.conversation_id) === String(conversationId)) {
        setMessages((prev) => {
          const existingIdx = prev.findIndex(
            (m) =>
              String(m._id) === String(payload._id) ||
              (payload.client_message_id &&
                m.client_message_id === payload.client_message_id)
          );

          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = payload;
            return copy;
          }
          return [...prev, payload];
        });

        messagesApi.markAsRead(conversationId).catch(() => {});
      }
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.emit("conversation:leave", conversationId);
    };
  }, [socket, conversationId, token]);

  const handleSend = async () => {
    const clean = inputText.trim();
    if (!clean || sending) return;

    const clientMsgId = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage = {
      _id: clientMsgId,
      client_message_id: clientMsgId,
      conversation_id: conversationId,
      sender_id: {
        _id: user?._id,
        full_name: user?.full_name,
        role: user?.role,
      },
      body: clean,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setInputText("");
    setMessages((prev) => [...prev, optimisticMessage]);
    flatListRef.current?.scrollToEnd({ animated: true });
    setSending(true);

    try {
      const savedMsg = await messagesApi.sendMessage(conversationId, clean, {
        client_message_id: clientMsgId,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === clientMsgId
            ? { ...savedMsg, client_message_id: clientMsgId }
            : m
        )
      );
    } catch (err) {
      console.warn("Failed to send chat message", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === clientMsgId
            ? { ...m, isFailed: true }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessageBubble = ({ item }) => {
    const isMe =
      String(item.sender_id?._id || item.sender_id) === String(user?._id);

    return (
      <View
        style={[
          styles.bubbleRow,
          isMe ? styles.myBubbleRow : styles.theirBubbleRow,
        ]}
      >
        {/* If incoming message, display small team avatar */}
        {!isMe && (
          <View style={styles.teamAvatarWrap}>
            <Utensils size={14} color={colors.primary} />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isMe ? styles.myBubble : styles.theirBubble,
            item.isFailed && styles.failedBubble,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isMe ? styles.myBubbleText : styles.theirBubbleText,
            ]}
          >
            {item.body}
          </Text>

          <View style={styles.bubbleFooter}>
            <Text
              style={[
                styles.timeText,
                isMe ? styles.myTimeText : styles.theirTimeText,
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
            {item.isOptimistic && !item.isFailed && (
              <Clock
                size={10}
                color="rgba(255,255,255,0.7)"
                style={{ marginLeft: 4 }}
              />
            )}
            {item.isFailed && (
              <AlertCircle size={11} color="#EF4444" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      enabled={Platform.OS === "ios"}
    >
      {/* Sleek Modern Header */}
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

        <View style={styles.headerTitleWrap}>
          <View style={styles.headerAvatarWrap}>
            <Utensils size={16} color={colors.primary} />
            <View style={styles.onlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSubtitle}>
              Banquet Coordinator · Online
            </Text>
          </View>
        </View>
      </View>

      {/* Catering Inquiry Context Strip */}
      <View style={styles.contextStrip}>
        <ShieldCheck size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.contextStripText} numberOfLines={1}>
          Official Caezelle Catering Reservation Support Channel
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageBubble}
          keyExtractor={(item, idx) => item._id || String(idx)}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          { paddingBottom: insets.bottom + spacing.xs },
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask a question about your event..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Send size={17} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: "#059669",
    marginTop: 1,
  },
  contextStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primaryBorder,
  },
  contextStripText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    fontWeight: "500",
    color: colors.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bubbleRow: {
    marginVertical: 4,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  myBubbleRow: {
    justifyContent: "flex-end",
  },
  theirBubbleRow: {
    justifyContent: "flex-start",
  },
  teamAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  failedBubble: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.fontFamilies.regular,
  },
  myBubbleText: {
    color: colors.white,
  },
  theirBubbleText: {
    color: "#0F172A",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
  },
  myTimeText: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  theirTimeText: {
    color: "#9CA3AF",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    maxHeight: 100,
    fontSize: 14,
    color: "#0F172A",
    marginRight: 10,
    fontFamily: typography.fontFamilies.regular,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
});

export default CustomerChatThreadScreen;
