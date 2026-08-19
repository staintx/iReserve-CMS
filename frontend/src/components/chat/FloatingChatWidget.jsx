import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import useToast from "../../hooks/useToast";
import { listConversations, getMessages, sendMessage, createConversation, markConversationAsRead } from "../../api/messages";
import { sendZelleCustomerMessage, getZelleCustomerHistory, clearZelleCustomerHistory } from "../../api/zelle";
import { getSocket } from "../../api/socket";
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  CheckCheck, 
  Sparkles, 
  LogIn, 
  User,
  ChevronRight,
  RotateCcw,
  Headphones,
  Calendar,
  Package,
  Layers
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import ZelleMessage from "./ZelleMessage";

const ZELLE_SUGGESTIONS = [
  "✨ Recommend wedding packages",
  "📅 Is Dec 15 available?",
  "💰 Package for 100 pax under ₱60k",
  "📝 Help me draft an inquiry",
  "🥩 What beef viands are available?"
];

const SUPPORT_QUICK_REPLIES = [
  "Can I modify my booking?",
  "What's included in my package?",
  "Payment options?",
  "Dietary restrictions"
];

const getMessageConversationId = (msg) => {
  if (!msg?.conversation_id) return null;
  return typeof msg.conversation_id === "object" ? msg.conversation_id?._id : msg.conversation_id;
};

const createOptimisticMessage = ({ clientMessageId, conversationId, user, body, attachments }) => ({
  _id: clientMessageId,
  client_message_id: clientMessageId,
  conversation_id: conversationId,
  sender_id: {
    _id: user._id,
    full_name: user.full_name,
    role: user.role,
    email: user.email
  },
  body,
  attachments,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pending: true
});

const mergeMessageIntoList = (list, message) => {
  if (!message) return list;
  const targetConvId = getMessageConversationId(message);
  const cleanList = targetConvId
    ? list.filter((item) => {
        const itemConvId = getMessageConversationId(item);
        return !itemConvId || String(itemConvId) === String(targetConvId);
      })
    : list;

  const clientMessageId = message.client_message_id;
  const messageId = message._id;
  const matchIndex = cleanList.findIndex((item) => {
    if (clientMessageId && (item.client_message_id === clientMessageId || String(item._id) === String(clientMessageId))) return true;
    if (messageId && (String(item._id) === String(messageId) || item.client_message_id === String(messageId))) return true;
    return false;
  });

  let next;
  if (matchIndex === -1) {
    next = [...cleanList, { ...message, pending: false }];
  } else {
    next = [...cleanList];
    next[matchIndex] = { ...next[matchIndex], ...message, pending: false };
  }

  const seenKeys = new Set();
  const result = [];
  for (const m of next) {
    const key = m._id ? String(m._id) : (m.client_message_id ? String(m.client_message_id) : null);
    if (key) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }
    result.push(m);
  }
  return result;
};

const mergeMessageLists = (existingMessages, fetchedMessages, targetConversationId = null) => {
  const existingForConv = targetConversationId
    ? existingMessages.filter((msg) => {
        const convId = getMessageConversationId(msg);
        return !convId || String(convId) === String(targetConversationId);
      })
    : existingMessages;

  const merged = [...existingForConv];
  for (const message of fetchedMessages || []) {
    const clientMessageId = message.client_message_id;
    const messageId = message._id;
    const matchIndex = merged.findIndex((item) => {
      if (clientMessageId && (item.client_message_id === clientMessageId || String(item._id) === String(clientMessageId))) return true;
      if (messageId && (String(item._id) === String(messageId) || item.client_message_id === String(messageId))) return true;
      return false;
    });

    if (matchIndex === -1) {
      merged.push({ ...message, pending: false });
    } else {
      merged[matchIndex] = { ...merged[matchIndex], ...message, pending: false };
    }
  }

  const seenKeys = new Set();
  const result = [];
  for (const m of merged) {
    const key = m._id ? String(m._id) : (m.client_message_id ? String(m.client_message_id) : null);
    if (key) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }
    result.push(m);
  }

  return result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export default function FloatingChatWidget() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("zelle"); // 'zelle' | 'support'

  // --- Zelle AI State ---
  const [zelleMessages, setZelleMessages] = useState([]);
  const [zelleDraft, setZelleDraft] = useState("");
  const [isZelleLoading, setIsZelleLoading] = useState(false);
  const [zelleConvId, setZelleConvId] = useState(null);
  const [guestSessionId, setGuestSessionId] = useState(() => {
    let s = localStorage.getItem("zelle_session_id");
    if (!s) {
      s = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem("zelle_session_id", s);
    }
    return s;
  });

  // --- Support Staff Chat State ---
  const [supportConversation, setSupportConversation] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportDraft, setSupportDraft] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [isSupportSending, setIsSupportSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const zelleEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Listen to external triggers (Contextual Inline Helpers!)
  useEffect(() => {
    const handleContextualPrompt = (e) => {
      const { prompt, tab } = e.detail || {};
      setIsOpen(true);
      if (tab) setActiveTab(tab);
      if (prompt) {
        if (activeTab === "zelle" || tab === "zelle") {
          handleSendZelle(prompt);
        } else {
          setSupportDraft(prompt);
        }
      }
    };

    window.addEventListener("open-zelle-chat", handleContextualPrompt);
    return () => window.removeEventListener("open-zelle-chat", handleContextualPrompt);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (activeTab === "zelle") {
        zelleEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [zelleMessages, isZelleLoading, supportMessages, typingUsers, isOpen, activeTab]);

  // Load Zelle conversation history on mount/open
  useEffect(() => {
    if (!isOpen || activeTab !== "zelle") return;

    let isMounted = true;
    const fetchZelleHistory = async () => {
      try {
        const history = await getZelleCustomerHistory(guestSessionId);
        if (!isMounted) return;
        if (history?.messages?.length > 0) {
          setZelleMessages(history.messages);
          setZelleConvId(history.conversation_id);
        } else {
          // Default initial AI welcome bubble
          setZelleMessages([
            {
              role: "model",
              text: `Hello! 👋 I'm **Zelle**, your AI Concierge for Caezelle's Catering Services.\n\nI can help you explore catering packages, check date availability, estimate budgets, or draft an inquiry for your upcoming event.\n\nHow can I assist you today?`,
              timestamp: new Date().toISOString(),
              ui_cards: [],
            },
          ]);
        }
      } catch (err) {
        console.debug("Failed to load Zelle history:", err);
      }
    };

    fetchZelleHistory();
    return () => { isMounted = false; };
  }, [isOpen, activeTab, user]);

  // Load Support staff conversation
  useEffect(() => {
    if (!isOpen || activeTab !== "support" || !user) return;

    let isMounted = true;
    const initSupportChat = async () => {
      setIsSupportLoading(true);
      try {
        const conversationsList = await listConversations();
        let supportConv = conversationsList?.find((c) => c.type === "support" || !c.booking_id);

        if (!supportConv) {
          supportConv = await createConversation({ customer_id: user._id });
        }

        if (!isMounted) return;
        setSupportConversation(supportConv);

        if (supportConv?._id) {
          const msgs = await getMessages(supportConv._id);
          if (isMounted) setSupportMessages((prev) => mergeMessageLists(prev, msgs || [], supportConv._id));
          await markConversationAsRead(supportConv._id).catch(() => {});
        }
      } catch (err) {
        console.error("Error loading support chat:", err);
      } finally {
        if (isMounted) setIsSupportLoading(false);
      }
    };

    initSupportChat();
    return () => { isMounted = false; };
  }, [isOpen, activeTab, user]);

  // Handle Send Zelle message
  const handleSendZelle = async (overrideText = null) => {
    const textToSend = (overrideText !== null ? overrideText : zelleDraft).trim();
    if (!textToSend || isZelleLoading) return;

    const userMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setZelleMessages((prev) => [...prev, userMessage]);
    if (overrideText === null) setZelleDraft("");
    setIsZelleLoading(true);

    try {
      const response = await sendZelleCustomerMessage({
        message: textToSend,
        conversation_id: zelleConvId,
        session_id: guestSessionId,
      });

      if (response?.conversation_id) {
        setZelleConvId(response.conversation_id);
      }

      const botMessage = {
        role: "model",
        text: response?.text || "I'm sorry, I couldn't generate a response. Please try again.",
        ui_cards: response?.ui_cards || [],
        timestamp: new Date().toISOString(),
      };

      setZelleMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reach Zelle AI.", "error");
      setZelleMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "I experienced a connection issue. Please check your network and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsZelleLoading(false);
    }
  };

  // Handle Reset Zelle conversation
  const handleResetZelle = async () => {
    try {
      await clearZelleCustomerHistory(zelleConvId);
      setZelleConvId(null);
      setZelleMessages([
        {
          role: "model",
          text: `Conversation restarted! How can I assist you with your catering plans?`,
          timestamp: new Date().toISOString(),
          ui_cards: [],
        },
      ]);
      notify("Zelle AI conversation reset.", "info");
    } catch (e) {
      notify("Could not reset chat.", "error");
    }
  };

  // Socket setup for Support tab
  useEffect(() => {
    if (!isOpen || activeTab !== "support" || !user) return undefined;

    const socket = getSocket();
    socketRef.current = socket;
    const joinedId = supportConversation?._id;

    if (!socket.connected) socket.connect();

    const handleNewMessage = (msg) => {
      if (!msg) return;
      const convId = typeof msg.conversation_id === "object" ? msg.conversation_id?._id : msg.conversation_id;
      if (!joinedId || String(convId) !== String(joinedId)) return;
      setSupportMessages((prev) => mergeMessageIntoList(prev, msg));
      markConversationAsRead(joinedId).catch(() => {});
    };

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [isOpen, activeTab, supportConversation?._id, user]);

  const handleSendSupport = async (overrideBody = null) => {
    const textToSend = (overrideBody !== null ? overrideBody : supportDraft).trim();
    if (!textToSend || isSupportSending || !user) return;

    setIsSupportSending(true);
    let activeConvId = supportConversation?._id;

    try {
      if (!activeConvId) {
        const created = await createConversation({ customer_id: user._id });
        setSupportConversation(created);
        activeConvId = created._id;
      }

      const clientMessageId = window.crypto?.randomUUID?.() || `msg-${Date.now()}`;
      const optimisticMessage = createOptimisticMessage({
        clientMessageId,
        conversationId: activeConvId,
        user,
        body: textToSend,
        attachments: [],
      });

      setSupportMessages((prev) => [...prev, optimisticMessage]);

      const newMsg = await sendMessage(activeConvId, {
        body: textToSend,
        client_message_id: clientMessageId,
      });

      setSupportMessages((prev) => mergeMessageIntoList(prev, newMsg));
      if (overrideBody === null) setSupportDraft("");
    } catch (err) {
      notify("Failed to send message.", "error");
    } finally {
      setIsSupportSending(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <div
          className="fixed right-4 sm:right-6 z-50 w-[92vw] max-w-95 sm:w-96 h-136 max-h-[84vh] rounded-3xl border border-border/80 shadow-2xl bg-card flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          style={{ bottom: "var(--chat-fab-bottom, 1.5rem)" }}
        >
          {/* HEADER WITH TABS */}
          <div className="bg-primary text-primary-foreground p-3.5 shadow-md relative flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                    {activeTab === "zelle" ? <Sparkles className="w-4 h-4 text-amber-300" /> : <Headphones className="w-4 h-4" />}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-primary rounded-full" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm leading-snug">
                    {activeTab === "zelle" ? "Zelle AI Concierge" : "Caezelle Support Team"}
                  </h3>
                  <p className="text-[10px] text-primary-foreground/80">
                    {activeTab === "zelle" ? "Instant 24/7 AI Assistance" : "Human Team • Replies in minutes"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {activeTab === "zelle" && (
                  <button
                    onClick={handleResetZelle}
                    className="text-primary-foreground/70 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                    title="Restart conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex items-center p-0.5 bg-black/20 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("zelle")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  activeTab === "zelle"
                    ? "bg-white text-primary shadow-xs"
                    : "text-primary-foreground/80 hover:text-white"
                )}
              >
                <Sparkles className="w-3 h-3" /> Zelle AI
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("support")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  activeTab === "support"
                    ? "bg-white text-primary shadow-xs"
                    : "text-primary-foreground/80 hover:text-white"
                )}
              >
                <Headphones className="w-3 h-3" /> Human Support
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ZELLE AI CONCIERGE */}
          {/* ========================================================================= */}
          {activeTab === "zelle" && (
            <>
              <ScrollArea className="flex-1 p-3.5 bg-muted/10">
                <div className="space-y-3.5 pb-2">
                  {zelleMessages.map((msg, index) => (
                    <ZelleMessage
                      key={index}
                      message={msg}
                      onSelectPackage={(pkgName) => handleSendZelle(`Tell me more about ${pkgName}`)}
                      onStartInquiry={(dateStr) => handleSendZelle(`I want to draft an inquiry for ${dateStr}`)}
                    />
                  ))}

                  {/* AI Typing Indicator */}
                  {isZelleLoading && (
                    <div className="flex items-center gap-2 text-xs italic text-muted-foreground bg-card border border-border/80 px-3 py-1.5 rounded-2xl w-fit animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span>Zelle is checking packages and data...</span>
                    </div>
                  )}

                  <div ref={zelleEndRef} />
                </div>
              </ScrollArea>

              {/* QUICK SUGGESTIONS */}
              <div className="p-2 bg-card/80 border-t border-border/60">
                <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                  {ZELLE_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendZelle(suggestion)}
                      disabled={isZelleLoading}
                      className="text-[11px] whitespace-nowrap bg-muted/80 hover:bg-muted text-foreground px-2.5 py-1 rounded-full border border-border/60 transition-colors font-medium shrink-0 cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT BAR */}
              <div className="p-3 bg-card border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendZelle();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Ask Zelle anything about packages, dates..."
                    value={zelleDraft}
                    onChange={(e) => setZelleDraft(e.target.value)}
                    disabled={isZelleLoading}
                    className="text-xs h-10 rounded-2xl border-input bg-background"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isZelleLoading || !zelleDraft.trim()}
                    className="h-10 w-10 rounded-2xl shrink-0 bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-transform"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: HUMAN SUPPORT STAFF */}
          {/* ========================================================================= */}
          {activeTab === "support" && (
            <>
              <ScrollArea className="flex-1 p-4 bg-muted/10">
                {!user ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto py-12">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-base text-foreground">Sign in to message our team</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sign in to message our staff coordinators directly and track custom quotes.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full pt-2">
                      <Button onClick={() => navigate("/login")} size="sm" className="flex-1 text-xs">
                        <LogIn className="w-3.5 h-3.5 mr-1" /> Log In
                      </Button>
                      <Button onClick={() => navigate("/signup")} variant="outline" size="sm" className="flex-1 text-xs">
                        Sign Up
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pb-2">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                        CS
                      </div>
                      <div className="bg-card border border-border/80 text-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-xs shadow-2xs max-w-[85%] leading-relaxed">
                        Hello! Welcome to Caezelle's Catering Support. How can our team help you today?
                      </div>
                    </div>

                    {isSupportLoading && (
                      <div className="text-center text-[11px] text-muted-foreground py-4 animate-pulse">
                        Loading messages...
                      </div>
                    )}

                    {supportMessages.map((msg) => {
                      const isMe = msg.sender_id?._id === user?._id;
                      return (
                        <div key={msg._id} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                              CS
                            </div>
                          )}
                          <div className={cn("flex flex-col max-w-[82%]", isMe ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "px-3.5 py-2.5 rounded-2xl text-xs whitespace-pre-wrap break-words shadow-2xs leading-relaxed",
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-xs"
                                  : "bg-card border border-border text-foreground rounded-bl-xs"
                              )}
                            >
                              {msg.body}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1 px-1">
                              <span>
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                              </span>
                              {isMe && <CheckCheck className="w-3 h-3 text-primary opacity-80" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {user && (
                <div className="p-3 bg-card border-t border-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendSupport();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      placeholder="Message our team directly..."
                      value={supportDraft}
                      onChange={(e) => setSupportDraft(e.target.value)}
                      disabled={isSupportSending}
                      className="text-xs h-10 rounded-2xl border-input bg-background"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isSupportSending || !supportDraft.trim()}
                      className="h-10 w-10 rounded-2xl shrink-0 bg-primary text-primary-foreground shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* TRIGGER BUTTON */
        <Button
          className="fixed right-4 sm:right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-primary to-amber-600 text-white hover:scale-105 active:scale-95 transition-all duration-300 ease-out flex items-center justify-center border-2 border-background cursor-pointer animate-in fade-in zoom-in-75"
          style={{ bottom: "var(--chat-fab-bottom, 1.5rem)" }}
          size="icon"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Zelle AI"
          title="Chat with Zelle AI"
        >
          <Sparkles className="w-6 h-6 text-amber-200" />
        </Button>
      )}
    </>
  );
}
