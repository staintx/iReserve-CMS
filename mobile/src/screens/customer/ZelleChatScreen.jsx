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
  Send,
  ChevronLeft,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import zelleApi from "../../api/zelle";

const LOADING_PHASES = [
  "Reading your catering inquiry...",
  "Checking packages and availability...",
  "Formatting personalized recommendations...",
];

const SUGGESTED_PROMPTS = [
  "✨ Recommend wedding packages",
  "📅 Is Dec 15 available?",
  "💰 Package for 100 pax under ₱60k",
  "📝 Help me draft an inquiry",
  "🥩 What beef viands are available?",
  "What is the booking & deposit process?",
];

export const ZelleChatScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `mobile_zelle_${Date.now()}`);
  const [conversationId, setConversationId] = useState(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);

  const flatListRef = useRef(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Dynamic multi-stage loading indicator while AI is generating
  useEffect(() => {
    if (!loading) {
      setLoadingPhaseIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [loading]);

  const handleSend = async (overrideText) => {
    const textToSend = typeof overrideText === "string" ? overrideText : inputText;
    const clean = textToSend.trim();
    if (!clean || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: clean,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await zelleApi.chat({
        message: clean,
        session_id: sessionId,
        conversation_id: conversationId || undefined,
      });

      if (response?.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const replyText =
        response?.text ||
        response?.response ||
        response?.reply ||
        "I'm sorry, I couldn't generate a response. Please try again.";
      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: replyText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text:
          "I'm having trouble connecting right now. Please check your network or try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
          {item.timestamp && (
            <Text
              style={[
                styles.bubbleTime,
                isAi ? styles.aiBubbleTime : styles.userBubbleTime,
              ]}
            >
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingBubbleContainer}>
        <View style={styles.aiAvatar}>
          <Sparkles size={14} color={colors.primary} />
        </View>
        <View style={styles.loadingBubble}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.loadingBubbleText}>
            {LOADING_PHASES[loadingPhaseIndex]}
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
      {/* Header */}
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
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>iReserve Assistant</Text>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.headerSubtitle}>Powered by Caezelle AI</Text>
        </View>

        {/* Right Spacer balances the Back button without a trash icon */}
        <View style={styles.headerRightSpacer} />
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
                disabled={loading}
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
          ListFooterComponent={renderLoadingFooter}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      {/* Quick Suggestions Strip (Zelle website style, visible when messages exist and keyboard is dismissed) */}
      {!isKeyboardVisible && messages.length > 0 && (
        <View style={styles.suggestionsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionPill}
                onPress={() => handleSend(prompt)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionPillText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Modern Chat Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: isKeyboardVisible
              ? Platform.OS === "ios"
                ? spacing.xs
                : spacing.sm
              : Math.max(insets.bottom, spacing.sm),
          },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Ask Zelle about packages, dates, menu..."
          placeholderTextColor={colors.textDisabled}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          textAlignVertical="center"
          returnKeyType="default"
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            inputText.trim() && !loading ? styles.sendBtnActive : styles.sendBtnDisabled,
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
            <Send
              size={18}
              color={inputText.trim() ? colors.white : colors.textDisabled}
            />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 10,
    elevation: 2,
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
  headerTitleCenter: {
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  headerRightSpacer: {
    width: 38,
    height: 38,
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
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
    fontSize: 17,
    lineHeight: 21,
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
    marginBottom: spacing.xs,
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
    borderColor: colors.cardBorder,
    alignItems: "center",
    ...shadows.sm,
  },
  promptChipKeyboard: {
    paddingVertical: 8,
  },
  promptChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.foreground,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
  bubbleTime: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  aiBubbleTime: {
    color: colors.textSubtle,
  },
  userBubbleTime: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  loadingBubbleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: spacing.xs,
    maxWidth: "84%",
    alignSelf: "flex-start",
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
  },
  loadingBubbleText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  /* Quick Suggestions */
  suggestionsBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing.xs,
  },
  suggestionsScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  suggestionPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suggestionPillText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
  },
  /* Input Bar */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    minHeight: 42,
    maxHeight: 100,
    marginRight: spacing.xs + 2,
    textAlignVertical: "center",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
});

export default ZelleChatScreen;
