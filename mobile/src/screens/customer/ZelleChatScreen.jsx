import React, { useState, useRef, useEffect } from "react";
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
  Keyboard,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Sparkles,
  ArrowUp,
  Paperclip,
  SlidersHorizontal,
  Trash2,
  ChevronLeft,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import zelleApi from "../../api/zelle";

const SUGGESTED_PROMPTS = [
  "What is the booking & deposit process?",
  "Suggest a 100-guest wedding menu",
  "Estimate total cost for 150 guests",
  "What packages do you offer for birthdays?",
];

export const ZelleChatScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `mobile_zelle_${Date.now()}`);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async (overrideText) => {
    const textToSend = typeof overrideText === "string" ? overrideText : inputText;
    const clean = textToSend.trim();
    if (!clean || loading) return;

    const userMsg = { id: `user_${Date.now()}`, sender: "user", text: clean };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await zelleApi.chat({
        message: clean,
        session_id: sessionId,
      });

      const replyText =
        response?.response ||
        response?.reply ||
        "I'm sorry, I couldn't generate a response. Please try again.";
      const aiMsg = { id: `ai_${Date.now()}`, sender: "ai", text: replyText };
      setMessages((prev) => [...prev, aiMsg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text:
          "I'm having trouble connecting right now. Please check your network or try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderBubble = ({ item }) => {
    const isAi = item.sender === "ai";

    return (
      <View
        style={[
          styles.bubbleContainer,
          isAi ? styles.aiContainer : styles.userContainer,
        ]}
      >
        {isAi && (
          <View style={styles.aiAvatar}>
            <Sparkles size={14} color={colors.primary} />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isAi ? styles.aiBubble : styles.userBubble,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isAi ? styles.aiText : styles.userText,
            ]}
          >
            {item.text}
          </Text>
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
      {/* Header (Glovo Circular Back Button) */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("CustomerTabs", { screen: "CustomerHome" });
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerTitleCenter}>
          <Text style={styles.headerTitle}>iReserve Assistant</Text>
          <Text style={styles.headerSubtitle}>Powered by Caezelle AI</Text>
        </View>

        <TouchableOpacity
          onPress={() => setMessages([])}
          style={styles.clearBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Clear chat history"
        >
          <Trash2 size={18} color={colors.foregroundMuted} />
        </TouchableOpacity>
      </View>

      {/* Main Chat Area */}
      {messages.length === 0 ? (
        /* Empty / Welcome State */
        <ScrollView
          style={styles.welcomeScrollView}
          contentContainerStyle={[
            styles.welcomeContentContainer,
            isKeyboardVisible && styles.welcomeContentContainerKeyboard,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
          <View
            style={[
              styles.sparkleIconCircle,
              isKeyboardVisible && styles.sparkleIconCircleKeyboard,
            ]}
          >
            <Sparkles size={isKeyboardVisible ? 22 : 28} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.welcomeTitle,
              isKeyboardVisible && styles.welcomeTitleKeyboard,
            ]}
          >
            How can I help you with your catering today?
          </Text>
          <Text
            style={[
              styles.welcomeDesc,
              isKeyboardVisible && styles.welcomeDescKeyboard,
            ]}
          >
            Ask about menus, estimate guest budgets, check event dates, or compare catering tiers.
          </Text>

          {/* Quick Prompt Chips */}
          <View style={styles.promptList}>
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.promptChip,
                  isKeyboardVisible && styles.promptChipKeyboard,
                ]}
                onPress={() => handleSend(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderBubble}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      {loading && (
        <View style={styles.typingIndicator}>
          <Sparkles size={14} color={colors.primary} />
          <Text style={styles.typingText}>Agent is drafting response...</Text>
        </View>
      )}

      {/* Modern Chat Input Card */}
      <View
        style={[
          styles.inputWrapper,
          {
            paddingBottom: isKeyboardVisible
              ? spacing.xs
              : Math.max(insets.bottom, spacing.xs) + spacing.xs,
          },
        ]}
      >
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            placeholder="How can I help you today?"
            placeholderTextColor={colors.textSubtle}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            scrollEnabled
          />

          <View style={styles.inputActionsRow}>
            <View style={styles.mediaActionsLeft}>
              <TouchableOpacity
                style={styles.iconActionBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Attach file"
              >
                <Paperclip size={18} color={colors.foregroundMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Assistant options"
              >
                <SlidersHorizontal size={18} color={colors.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                Boolean(inputText.trim()) && styles.sendBtnActive,
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <ArrowUp
                  size={16}
                  color={inputText.trim() ? colors.white : colors.foregroundMuted}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.disclaimerText}>
          Agent is AI and can make mistakes. Please double-check responses.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 10,
    elevation: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerTitleCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
  },
  welcomeScrollView: {
    flex: 1,
  },
  welcomeContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  welcomeContentContainerKeyboard: {
    justifyContent: "flex-start",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sparkleIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  sparkleIconCircleKeyboard: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  welcomeTitleKeyboard: {
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  welcomeDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  welcomeDescKeyboard: {
    fontSize: typography.sizes.xs,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  promptList: {
    width: "100%",
    gap: spacing.sm,
  },
  promptChip: {
    paddingVertical: 12,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    ...shadows.sm,
  },
  promptChipKeyboard: {
    paddingVertical: 9,
  },
  promptChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.foreground,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  bubbleContainer: {
    flexDirection: "row",
    marginVertical: spacing.xs,
    maxWidth: "84%",
  },
  aiContainer: {
    alignSelf: "flex-start",
  },
  userContainer: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
    marginTop: 4,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderTopLeftRadius: radius.xs,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: radius.xs,
  },
  bubbleText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    lineHeight: 20,
  },
  aiText: {
    color: colors.foreground,
  },
  userText: {
    color: colors.white,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: 6,
  },
  typingText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  /* Input Card */
  inputWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    ...shadows.sm,
  },
  textInput: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    minHeight: 38,
    maxHeight: 110,
    paddingHorizontal: spacing.xs,
    paddingTop: Platform.OS === "ios" ? 4 : 2,
    paddingBottom: 6,
    textAlignVertical: "top",
  },
  inputActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
    marginTop: 2,
  },
  mediaActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  disclaimerText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 2,
  },
});

export default ZelleChatScreen;
