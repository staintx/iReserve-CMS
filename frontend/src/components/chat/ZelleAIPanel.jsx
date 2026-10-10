import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import useToast from "../../hooks/useToast";
import { listConversations, getMessages, sendMessage, createConversation, markConversationAsRead } from "../../api/messages";
import { sendZelleCustomerMessage, getZelleCustomerHistory, clearZelleCustomerHistory, getZelleConversations, getZelleConversationById } from "../../api/zelle";
import { getSocket } from "../../api/socket";
import { 
  Home, 
  MessageSquare, 
  HelpCircle, 
  X, 
  Minus, 
  Maximize2, 
  Minimize2,
  Headphones,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import ZelleAIFab from "./ZelleAIFab";
import HomeTab from "./hub/HomeTab";
import MessagesTab from "./hub/MessagesTab";
import HelpTab from "./hub/HelpTab";
import ChatThreadView from "./hub/ChatThreadView";

import brandLogo from "@/assets/images/logo.jpg";
import assistantAvatar from "@/assets/images/zelle-avatar.png";

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

  // Widget visibility & layout mode
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Tab routing: "home" | "messages" | "help" | "tasks" | "chat"
  const [activeTab, setActiveTab] = useState("home");
  const [previousTab, setPreviousTab] = useState("home");
  const [chatMode, setChatMode] = useState("zelle"); // "zelle" | "support"

  // Search passed from Home to Help
  const [helpSearchQuery, setHelpSearchQuery] = useState("");

  // --- Zelle AI State ---
  const [zelleMessages, setZelleMessages] = useState([]);
  const [isZelleLoading, setIsZelleLoading] = useState(false);
  const [zelleConvId, setZelleConvId] = useState(null);
  const [zelleConversationsList, setZelleConversationsList] = useState([]);

  const [guestSessionId] = useState(() => {
    let s = localStorage.getItem("zelle_session_id");
    if (!s) {
      s = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem("zelle_session_id", s);
    }
    return s;
  });

  // --- Support Staff Chat State ---
  const [supportConversation, setSupportConversation] = useState(null);
  const [allSupportConversations, setAllSupportConversations] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [isSupportSending, setIsSupportSending] = useState(false);

  const socketRef = useRef(null);

  // ── Lock mobile background body scroll when chatbot is open ──
  useEffect(() => {
    if (!isOpen || window.innerWidth >= 768) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
    };
  }, [isOpen]);

  // ── Listen to External Triggers (Contextual Helpers) ───────
  useEffect(() => {
    const handleContextualPrompt = (e) => {
      const { prompt, tab, mode } = e.detail || {};
      setIsOpen(true);
      setActiveTab("chat");
      if (mode) setChatMode(mode);

      if (prompt) {
        if (mode === "support") {
          setChatMode("support");
          handleSendSupport(prompt);
        } else {
          setChatMode("zelle");
          handleSendZelle(prompt);
        }
      }
    };

    window.addEventListener("open-zelle-chat", handleContextualPrompt);
    return () => window.removeEventListener("open-zelle-chat", handleContextualPrompt);
  }, []);

  // ── Load Zelle history & sessions on mount ────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchZelleHistory = async () => {
      try {
        const [history, convsRes] = await Promise.all([
          getZelleCustomerHistory(guestSessionId),
          getZelleConversations(guestSessionId).catch(() => ({ conversations: [] }))
        ]);
        if (!isMounted) return;

        // If multiple saved sessions exist, display them with their actual titles
        if (convsRes?.conversations?.length > 0) {
          setZelleConversationsList(
            convsRes.conversations.map((c) => ({
              id: c.id || c._id,
              title: c.title || "Catering Consultation",
              last_message: c.snippet || c.last_message || "Planning inquiry with Zelle AI",
              updatedAt: c.updatedAt || c.createdAt
            }))
          );
        } else if (history?.messages?.length > 0) {
          setZelleConversationsList([
            {
              id: history.conversation_id || "default",
              title: "Catering Consultation",
              last_message: history.messages[history.messages.length - 1]?.parts?.[0]?.text || history.messages[history.messages.length - 1]?.text,
              updatedAt: history.updatedAt || new Date().toISOString()
            }
          ]);
        } else {
          setZelleConversationsList([]);
        }

        if (history?.messages?.length > 0) {
          setZelleMessages(history.messages);
          setZelleConvId(history.conversation_id);
        } else {
          // Default initial AI welcome bubble
          const welcome = [
            {
              role: "model",
              text: `Hello! 👋 I'm **Zelle**, your AI Assistant for Caezelle's Catering Services.\n\nI can help you explore catering packages, check date availability, estimate budgets, or draft an inquiry for your upcoming event.\n\nHow can I assist you today?`,
              timestamp: new Date().toISOString(),
              ui_cards: [],
            },
          ];
          setZelleMessages(welcome);
        }
      } catch (err) {
        console.debug("Failed to load Zelle history:", err);
      }
    };

    fetchZelleHistory();
    return () => { isMounted = false; };
  }, [guestSessionId, user]);

  // ── Load Support staff conversations if logged in ──────────
  useEffect(() => {
    if (!user) {
      setAllSupportConversations([]);
      return;
    }

    let isMounted = true;
    const fetchSupportConvs = async () => {
      try {
        const list = await listConversations();
        if (!isMounted) return;
        if (Array.isArray(list)) {
          // In the floating chatbot widget, only present ONE unified support coordinator channel.
          // Full booking-specific inquiry histories belong on /customer/messages, not in this widget.
          const generalSupport = list.find((c) => c.type === "support" && !c.booking_id && !c.inquiry_id)
            || list.find((c) => !c.booking_id && !c.inquiry_id)
            || list[0];

          const consolidated = generalSupport ? [generalSupport] : [];
          setAllSupportConversations(consolidated);

          if (generalSupport) {
            setSupportConversation(generalSupport);
            const msgs = await getMessages(generalSupport._id);
            if (isMounted) setSupportMessages((prev) => mergeMessageLists(prev, msgs || [], generalSupport._id));
          }
        }
      } catch (err) {
        console.error("Error fetching support conversations:", err);
      }
    };

    fetchSupportConvs();
    return () => { isMounted = false; };
  }, [user]);

  // ── Socket listener for incoming support messages ──────────
  useEffect(() => {
    if (!user) return undefined;

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
  }, [supportConversation?._id, user]);

  // ── Send Zelle message ─────────────────────────────────────
  const handleSendZelle = async (textToSend) => {
    const trimmed = textToSend?.trim();
    if (!trimmed || isZelleLoading) return;

    const userMessage = {
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    setZelleMessages((prev) => [...prev, userMessage]);
    setIsZelleLoading(true);

    try {
      const response = await sendZelleCustomerMessage({
        message: trimmed,
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
        tool_executions: response?.tool_executions || [],
        timestamp: new Date().toISOString(),
      };

      setZelleMessages((prev) => [...prev, botMessage]);

      // Update conversations list snippet
      setZelleConversationsList([
        {
          id: response?.conversation_id || zelleConvId || "default",
          title: "Catering Consultation",
          last_message: botMessage.text,
          updatedAt: new Date().toISOString()
        }
      ]);
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

  // ── Reset Zelle conversation ───────────────────────────────
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

  // ── Send Support Staff message ─────────────────────────────
  const handleSendSupport = async (textToSend) => {
    const trimmed = textToSend?.trim();
    if (!trimmed || isSupportSending || !user) return;

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
        body: trimmed,
        attachments: [],
      });

      setSupportMessages((prev) => [...prev, optimisticMessage]);

      const newMsg = await sendMessage(activeConvId, {
        body: trimmed,
        client_message_id: clientMessageId,
      });

      setSupportMessages((prev) => mergeMessageIntoList(prev, newMsg));
    } catch (err) {
      notify("Failed to send message to coordinator.", "error");
    } finally {
      setIsSupportSending(false);
    }
  };

  // ── Navigation & conversation switching helpers ───────────
  const handleNavigateTab = (tab) => {
    setActiveTab(tab);
  };

  const handleStartChatFromHome = (initialPrompt = null) => {
    setPreviousTab("home");
    setActiveTab("chat");
    setChatMode("zelle");
    if (initialPrompt) {
      handleSendZelle(initialPrompt);
    }
  };

  const handleSelectZelleConversation = async (conv) => {
    setPreviousTab("messages");
    setChatMode("zelle");
    setActiveTab("chat");

    if (!conv?.id || String(conv.id) === String(zelleConvId)) return;

    try {
      setIsZelleLoading(true);
      const data = await getZelleConversationById(conv.id, guestSessionId);
      if (data?.messages) {
        setZelleConvId(data.conversation_id || conv.id);
        setZelleMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load conversation details:", err);
    } finally {
      setIsZelleLoading(false);
    }
  };

  const handleStartNewChat = () => {
    setZelleConvId(null);
    setZelleMessages([
      {
        role: "model",
        text: `Hello! 👋 I'm **Zelle**, your AI Assistant for Caezelle's Catering Services.\n\nHow can I help you with your catering plans today?`,
        timestamp: new Date().toISOString(),
        ui_cards: [],
      },
    ]);
    setPreviousTab("messages");
    setChatMode("zelle");
    setActiveTab("chat");
  };

  const handleOpenHelpSearch = (term) => {
    setHelpSearchQuery(term);
    setActiveTab("help");
  };

  const handleBackFromChat = () => {
    setActiveTab(previousTab || "home");
  };

  return (
    <>
      {/* Expanded Backdrop Overlay */}
      {isOpen && isExpanded && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in duration-300" 
          onClick={() => setIsExpanded(false)} 
        />
      )}

      {isOpen ? (
        <div
          className={cn(
            "fixed z-50 bg-white flex flex-col overflow-hidden overscroll-contain transition-all duration-300 ease-out font-sans",
            /* Mobile: Full screen covering the entire viewport */
            "inset-0 w-full h-full max-h-none rounded-none border-0 shadow-none",
            /* Desktop (sm+): Elegant floating panel or expanded modal */
            isExpanded
              ? "sm:inset-6 md:inset-10 sm:rounded-3xl md:w-[920px] md:h-[800px] md:max-h-[88vh] md:m-auto sm:border sm:border-slate-200/90 sm:shadow-2xl"
              : "sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[460px] md:w-[480px] sm:h-[680px] sm:max-h-[88vh] sm:rounded-3xl sm:border sm:border-slate-200/90 sm:shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3"
          )}
        >
          {/* ═══════════════════════════════════════════════════════ */}
          {/* TOP HEADER (Contextual per tab)                        */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeTab === "home" ? (
            /* Home Header with Brand, Avatar circles & Greeting */
            <div className="bg-gradient-to-b from-[#182C54] via-[#1E3563] to-[#2C4B8A] text-white p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 relative shrink-0 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                {/* Brand Logo & Title */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/10 p-0.5 border border-white/20 shrink-0">
                    <img src={brandLogo} alt="Caezelle" className="w-full h-full object-cover rounded-md" />
                  </div>
                  <span className="font-bold text-sm tracking-tight text-white/95">
                    Caezelle Catering
                  </span>
                </div>

                {/* Team Avatars & Close Control */}
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-1.5 overflow-hidden items-center">
                    <div className="w-7 h-7 rounded-full border-2 border-[#1E3563] overflow-hidden bg-white/20">
                      <img src={assistantAvatar} alt="Zelle" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-7 h-7 rounded-full border-2 border-[#1E3563] bg-[#2C4B8A] text-white font-bold text-[10px] flex items-center justify-center">
                      CS
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Large Welcome Greeting matching Reference */}
              <div className="pt-2">
                <h2 className="font-bold text-xl sm:text-2xl text-white tracking-tight leading-tight">
                  Hello {user ? user.full_name?.split(" ")[0] : "There"}!
                </h2>
                <p className="font-medium text-lg sm:text-xl text-white/85 leading-snug">
                  How can we help?
                </p>
              </div>
            </div>
          ) : activeTab !== "chat" ? (
            /* Standard Sub-view Header (Messages, Help) */
            <div className="p-3.5 px-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-slate-900 capitalize">
                {activeTab}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer hidden sm:block"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TAB CONTENTS                                            */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {activeTab === "home" && (
              <HomeTab
                user={user}
                onStartChat={handleStartChatFromHome}
                onOpenHelpSearch={handleOpenHelpSearch}
                onSelectShortcut={(prompt) => handleStartChatFromHome(prompt)}
              />
            )}

            {activeTab === "messages" && (
              <MessagesTab
                conversations={zelleConversationsList}
                supportConversations={allSupportConversations}
                onSelectZelleConversation={handleSelectZelleConversation}
                onSelectSupportConversation={(conv) => {
                  setPreviousTab("messages");
                  setSupportConversation(conv);
                  setChatMode("support");
                  setActiveTab("chat");
                }}
                onStartNewChat={handleStartNewChat}
                isLoggedIn={!!user}
              />
            )}

            {activeTab === "help" && (
              <HelpTab
                initialSearch={helpSearchQuery}
                onAskZelle={(prompt) => handleStartChatFromHome(prompt)}
              />
            )}

            {activeTab === "chat" && (
              <ChatThreadView
                user={user}
                mode={chatMode}
                onChangeMode={setChatMode}
                onBack={handleBackFromChat}
                zelleMessages={zelleMessages}
                isZelleLoading={isZelleLoading}
                onSendZelle={handleSendZelle}
                onResetZelle={handleResetZelle}
                supportMessages={supportMessages}
                isSupportLoading={isSupportLoading}
                isSupportSending={isSupportSending}
                onSendSupport={handleSendSupport}
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                onClose={() => setIsOpen(false)}
                onNavigateLogin={() => navigate("/login")}
                onNavigateSignup={() => navigate("/signup")}
              />
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* BOTTOM NAVIGATION BAR (Home, Messages, Help)            */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeTab !== "chat" && (
            <div className="bg-white border-t border-slate-200/90 py-2 sm:py-1.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-around shrink-0 shadow-2xs">
              {/* 1. Home */}
              <button
                type="button"
                onClick={() => handleNavigateTab("home")}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer",
                  activeTab === "home"
                    ? "text-[#2C4B8A] font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                )}
              >
                <div className={cn(
                  "p-1 rounded-full transition-colors",
                  activeTab === "home" ? "bg-[#2C4B8A]/10 text-[#2C4B8A]" : ""
                )}>
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight">Home</span>
              </button>

              {/* 2. Messages */}
              <button
                type="button"
                onClick={() => handleNavigateTab("messages")}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer",
                  activeTab === "messages"
                    ? "text-[#2C4B8A] font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                )}
              >
                <div className={cn(
                  "p-1 rounded-full transition-colors",
                  activeTab === "messages" ? "bg-[#2C4B8A]/10 text-[#2C4B8A]" : ""
                )}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight">Messages</span>
              </button>

              {/* 3. Help */}
              <button
                type="button"
                onClick={() => handleNavigateTab("help")}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer",
                  activeTab === "help"
                    ? "text-[#2C4B8A] font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                )}
              >
                <div className={cn(
                  "p-1 rounded-full transition-colors",
                  activeTab === "help" ? "bg-[#2C4B8A]/10 text-[#2C4B8A]" : ""
                )}>
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight">Help</span>
              </button>
            </div>
          )}

          {/* Floating Minimize Chevron for active state */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      ) : (
        <ZelleAIFab isOpen={false} onClick={() => setIsOpen(true)} />
      )}
    </>
  );
}
