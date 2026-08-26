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
  Layers,
  History,
  Maximize2,
  Minimize2,
  Minus
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import ZelleMessage from "./ZelleMessage";
import ZelleAIFab from "./ZelleAIFab";
import ConversationHistoryDrawer from "./ConversationHistoryDrawer";

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

export default function ZelleAIPanel() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [allConversations, setAllConversations] = useState([]);
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
              text: `Hello! 👋 I'm **Zelle**, your AI Assistant for Caezelle's Catering Services.\n\nI can help you explore catering packages, check date availability, estimate budgets, or draft an inquiry for your upcoming event.\n\nHow can I assist you today?`,
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
      {isOpen && isExpanded && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" 
          onClick={() => setIsExpanded(false)} 
        />
      )}
      {isOpen ? (
        <div
          className={cn(
            "fixed z-50 border border-slate-200 shadow-2xl bg-white flex flex-col overflow-hidden transition-all duration-300 ease-out font-sans",
            isExpanded
              ? "inset-4 sm:inset-10 rounded-md md:w-[880px] md:h-[760px] md:max-h-[85vh] md:m-auto"
              : "right-4 sm:right-6 w-[92vw] max-w-95 sm:w-96 h-136 max-h-[84vh] rounded-md origin-bottom-right animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          )}
          style={!isExpanded ? { bottom: "var(--chat-fab-bottom, 1.5rem)" } : {}}
        >
          {/* HISTORY DRAWER */}
          {user && activeTab === "zelle" && (
            <ConversationHistoryDrawer
              isOpen={isHistoryOpen}
              conversations={allConversations}
              activeConvId={zelleConvId}
              onSelectConversation={(id) => { setIsHistoryOpen(false); }}
              onDeleteConversation={(id) => {}}
              onNewConversation={() => { handleResetZelle(); setIsHistoryOpen(false); }}
            />
          )}

          {/* HEADER WITH TABS */}
          <div className="bg-[#2C4B8A] text-white p-3.5 px-4 shadow-2xs relative flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-md bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-2xs">
                    {activeTab === "zelle" ? <Sparkles className="w-4 h-4 text-amber-300" /> : <Headphones className="w-4 h-4 text-white" />}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#2C4B8A] rounded-full" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm leading-tight text-white">
                    {activeTab === "zelle" ? "Zelle AI Assistant" : "Caezelle Support Team"}
                  </h3>
                  <p className="text-[10px] text-white/80 font-normal mt-0.5">
                    {activeTab === "zelle" ? "Event Planning Assistant" : "Event Coordinator Support"}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-0.5">
                {activeTab === "zelle" && (
                  <button
                    onClick={handleResetZelle}
                    className="text-white/80 hover:text-white p-1.5 rounded hover:bg-white/15 transition-colors cursor-pointer"
                    title="Restart conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {user && activeTab === "zelle" && (
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="text-white/80 hover:text-white p-1.5 rounded hover:bg-white/15 transition-colors cursor-pointer"
                    title="Previous Conversations"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white/80 hover:text-white p-1.5 rounded hover:bg-white/15 transition-colors cursor-pointer hidden sm:block"
                  aria-label={isExpanded ? "Collapse window" : "Expand window"}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded hover:bg-white/15 transition-colors cursor-pointer"
                  aria-label="Minimize chat"
                  title="Minimize chat"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded hover:bg-white/15 transition-colors cursor-pointer"
                  aria-label="Close chat"
                  title="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex items-center p-0.5 bg-black/20 rounded-md border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("zelle")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === "zelle"
                    ? "bg-white text-[#2C4B8A] shadow-2xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Sparkles className={cn("w-3 h-3", activeTab === "zelle" ? "text-amber-500" : "text-white/80")} /> Zelle AI
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("support")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  activeTab === "support"
                    ? "bg-white text-[#2C4B8A] shadow-2xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Headphones className={cn("w-3 h-3", activeTab === "support" ? "text-[#2C4B8A]" : "text-white/80")} /> Message Staff
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ZELLE AI ASSISTANT */}
          {/* ========================================================================= */}
          {activeTab === "zelle" && (
            <>
              <ScrollArea className="flex-1 p-3.5 bg-slate-50/50">
                <div className="space-y-3 pb-2">
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
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-md w-fit shadow-2xs animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-[#2C4B8A] animate-spin" />
                      <span>Zelle is checking packages and data...</span>
                    </div>
                  )}

                  <div ref={zelleEndRef} />
                </div>
              </ScrollArea>

              {/* QUICK SUGGESTIONS */}
              <div className="p-2.5 px-3 bg-white border-t border-slate-200/80 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {ZELLE_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendZelle(suggestion)}
                      disabled={isZelleLoading}
                      className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200/80 transition-colors font-medium shrink-0 cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT BAR */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
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
                    className="text-xs h-9 rounded-md border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isZelleLoading || !zelleDraft.trim()}
                    className="h-9 w-9 rounded-md shrink-0 bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
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
              <ScrollArea className="flex-1 p-3.5 bg-slate-50/50">
                {!user ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto py-12">
                    <div className="w-12 h-12 rounded-md bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-900">Sign in to message our team</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Sign in to message our staff coordinators directly and track custom quotes.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full pt-2">
                      <Button onClick={() => navigate("/login")} size="sm" className="flex-1 text-xs h-8 rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white">
                        <LogIn className="w-3.5 h-3.5 mr-1" /> Log In
                      </Button>
                      <Button onClick={() => navigate("/signup")} variant="outline" size="sm" className="flex-1 text-xs h-8 rounded-md border-slate-200">
                        Sign Up
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#2C4B8A]/10 text-[#2C4B8A] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        CS
                      </div>
                      <div className="bg-white border border-slate-200 text-slate-800 px-3.5 py-2.5 rounded-md text-xs shadow-2xs max-w-[85%] leading-relaxed">
                        Hello! Welcome to Caezelle's Catering Support. How can our team help you today?
                      </div>
                    </div>

                    {isSupportLoading && (
                      <div className="text-center text-[11px] text-slate-400 py-4 animate-pulse">
                        Loading messages...
                      </div>
                    )}

                    {supportMessages.map((msg) => {
                      const isMe = msg.sender_id?._id === user?._id;
                      return (
                        <div key={msg._id} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-md bg-[#2C4B8A]/10 text-[#2C4B8A] font-bold flex items-center justify-center text-[10px] shrink-0 mb-1">
                              CS
                            </div>
                          )}
                          <div className={cn("flex flex-col max-w-[82%]", isMe ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "px-3.5 py-2.5 rounded-md text-xs whitespace-pre-wrap break-words shadow-2xs leading-relaxed",
                                isMe
                                  ? "bg-[#2C4B8A] text-white"
                                  : "bg-white border border-slate-200 text-slate-800"
                              )}
                            >
                              {msg.body}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1">
                              <span>
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                              </span>
                              {isMe && <CheckCheck className="w-3 h-3 text-[#2C4B8A]" />}
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
                <div className="p-3 bg-white border-t border-slate-200 shrink-0">
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
                      className="text-xs h-9 rounded-md border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isSupportSending || !supportDraft.trim()}
                      className="h-9 w-9 rounded-md shrink-0 bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <ZelleAIFab isOpen={false} onClick={() => setIsOpen(true)} />
      )}
    </>
  );
}
