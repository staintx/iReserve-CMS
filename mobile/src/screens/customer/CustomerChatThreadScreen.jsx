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
import { Send, AlertCircle, Clock } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import Header from "../../components/common/Header";
import messagesApi from "../../api/messages";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { formatTime } from "../../utils/format";

export const CustomerChatThreadScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { conversationId, title = "Catering Team" } = route.params;
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
          // De-duplicate incoming message by _id or client_message_id
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

      // Replace optimistic message with confirmed server message
      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === clientMsgId
            ? { ...savedMsg, client_message_id: clientMsgId }
            : m
        )
      );
    } catch (err) {
      console.warn("Failed to send chat message", err);
      // Mark optimistic message as failed
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
          styles.bubbleWrapper,
          isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper,
        ]}
      >
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
              <Clock size={10} color="rgba(255,255,255,0.6)" style={{ marginLeft: 3 }} />
            )}
            {item.isFailed && (
              <AlertCircle size={11} color="#EF4444" style={{ marginLeft: 3 }} />
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
      <Header title={title} onBack={() => navigation.goBack()} />

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
          placeholder="Type your message..."
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
            <Send size={18} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  bubbleWrapper: {
    marginVertical: 4,
    flexDirection: "row",
  },
  myBubbleWrapper: {
    justifyContent: "flex-end",
  },
  theirBubbleWrapper: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  theirBubble: {
    backgroundColor: colors.surfaceAlt,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  failedBubble: {
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: typography.sizes.base,
    lineHeight: 21,
  },
  myBubbleText: {
    color: colors.white,
  },
  theirBubbleText: {
    color: colors.foreground,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 3,
  },
  timeText: {
    fontSize: 10,
  },
  myTimeText: {
    color: "rgba(255,255,255,0.75)",
  },
  theirTimeText: {
    color: colors.foregroundMuted,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    fontSize: typography.sizes.base,
    color: colors.foreground,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
});

export default CustomerChatThreadScreen;
