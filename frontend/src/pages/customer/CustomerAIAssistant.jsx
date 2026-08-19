import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Package,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Paperclip,
  Mic,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  sendZelleCustomerMessage,
  getZelleConversations,
  getZelleConversationById,
  deleteZelleConversation,
  clearZelleCustomerHistory,
} from "../../api/zelle";
import {
  PackageCarouselCard,
  DateAvailabilityCard,
  PaymentSummaryCard,
  InquiryConfirmationCard,
} from "../../components/chat/ZelleCards";
import ZelleMessage from "../../components/chat/ZelleMessage";
import useToast from "../../hooks/useToast";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { cn } from "@/lib/utils";
import logo from "../../assets/images/logo.jpg";

export default function CustomerAIAssistant() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sessions and Active Chat State
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState({});

  const messagesEndRef = useRef(null);

  // User Initials
  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  // 1. Fetch Conversations List
  const loadConversations = async (selectId = null, shouldLoadMessages = true) => {
    try {
      const res = await getZelleConversations();
      const list = res.conversations || [];
      setConversations(list);

      if (selectId) {
        setActiveConvId(selectId);
        if (shouldLoadMessages) {
          await loadConversationMessages(selectId);
        }
      } else if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
        if (shouldLoadMessages) {
          await loadConversationMessages(list[0].id);
        }
      } else if (list.length === 0 && shouldLoadMessages) {
        startNewConversation();
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  // 2. Load Messages for a specific session
  const loadConversationMessages = async (id) => {
    try {
      setLoading(true);
      const res = await getZelleConversationById(id);
      setMessages(res.messages || []);
      setActiveConvId(id);
    } catch (err) {
      notify("Could not load conversation history.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. Start a Fresh Conversation Session
  const startNewConversation = () => {
    setActiveConvId(null);
    setInput("");
    setMessages([
      {
        role: "model",
        text: `Hello ${user?.first_name || user?.full_name || "there"}! I'm **Zelle**, your personal catering concierge at Caezelle's. How can I help you today?`,
        ui_cards: [],
        timestamp: new Date(),
      },
    ]);
  };

  // 4. Delete Conversation
  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteZelleConversation(id);
      notify("Conversation removed.", "success");
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        if (remaining.length > 0) {
          loadConversationMessages(remaining[0].id);
        } else {
          startNewConversation();
        }
      }
    } catch (err) {
      notify("Failed to delete conversation.", "error");
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Send Message Handler
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput("");

    // Optimistic user message
    const userMsg = {
      role: "user",
      text: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendZelleCustomerMessage({
        message: query,
        conversation_id: activeConvId,
      });

      const modelMsg = {
        role: "model",
        text: data.text,
        ui_cards: data.ui_cards || [],
        tool_executions: data.tool_executions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMsg]);

      // If new conversation created or updated, refresh sessions list in sidebar
      if (data.conversation_id) {
        setActiveConvId(data.conversation_id);
        loadConversations(data.conversation_id, false);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "I apologize, but I encountered an issue processing your request. Please try asking again in a moment.",
          ui_cards: [],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Preset Quick Prompt Chips
  const QUICK_PROMPTS = [
    { label: "💳 Check my balance & pay", prompt: "What is my current payment balance and how can I pay?" },
    { label: "✨ View catering packages", prompt: "What catering packages are available?" },
    { label: "📅 Check date availability", prompt: "Can you check if December 20 is available for 100 guests?" },
    { label: "📋 My active inquiries", prompt: "Show me the status of my catering inquiries" },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50/60 dark:bg-background text-foreground overflow-hidden font-sans">
      {/* -------------------------------------------------------------
          LEFT SIDEBAR: Sessions & Navigation (Photo Style)
      ------------------------------------------------------------- */}
      <aside className="w-80 bg-white dark:bg-card border-r border-border/80 flex flex-col justify-between shrink-0 shadow-xs">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-primary text-white flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-sm text-foreground leading-tight">
                  Zelle Agent
                </h2>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Catering AI Concierge
                </span>
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => navigate("/customer/dashboard")}
              title="Return to Dashboard"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* New Conversation Button */}
          <div className="p-4">
            <Button
              type="button"
              className="w-full h-10 rounded-2xl bg-muted/60 hover:bg-muted text-foreground border border-border/80 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
              onClick={startNewConversation}
            >
              <Plus className="w-4 h-4 text-primary" />
              <span>New conversation</span>
            </Button>
          </div>

          {/* Quick Categories Navigation */}
          <div className="px-4 py-1 space-y-1 text-xs">
            <button
              type="button"
              onClick={() => handleSendMessage("What catering packages do you have?")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
            >
              <Package className="w-4 h-4 text-primary" />
              <span>Packages & Menu</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("Can I check availability for an event date?")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Date Availability</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("What is my current payment balance and how can I pay?")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Payments & Deposits</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("Show me my active inquiries")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>My Inquiries & Quotes</span>
            </button>
          </div>

          {/* Previous Conversations Section */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 block mb-2">
              Previous Conversations
            </span>

            {conversations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground px-3 italic py-2">
                No past chat sessions recorded.
              </p>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversationMessages(conv.id)}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer",
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                      <span className="truncate">{conv.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className={cn(
                        "p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                        isActive ? "hover:bg-blue-700 text-white" : "hover:bg-muted-foreground/10 text-muted-foreground"
                      )}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User Profile Footer (Photo Style) */}
        <div className="p-4 border-t border-border/80 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            onClick={() => navigate("/customer/profile")}
          >
            <div className="w-9 h-9 rounded-full bg-blue-600/15 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-foreground block truncate">
                {user?.full_name || "Customer Account"}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                ● Verified
              </span>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={logout}
            className="w-8 h-8 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          MAIN INTERACTION CANVAS (Photo Style)
      ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-background overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-14 px-6 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-xs text-foreground">
              {conversations.find((c) => c.id === activeConvId)?.title || "Catering Consultation"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => navigate("/customer/messages")}
            >
              💬 Human Support
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={startNewConversation}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
          {messages.map((msg, idx) => (
            <ZelleMessage
              key={idx}
              message={msg}
              onSelectPackage={(pkgName) => handleSendMessage(`I want to inquire about the ${pkgName}`)}
              onStartInquiry={(date) => handleSendMessage(`I would like to book for ${date}`)}
            />
          ))}

          {/* Loading Indicator (Photo Style) */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic py-2 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <span>Zelle Agent is checking catering records & rules...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* -------------------------------------------------------------
            BOTTOM FLOATING INPUT DOCK (Photo Style)
        ------------------------------------------------------------- */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-background dark:via-background shrink-0 max-w-4xl w-full mx-auto">
          {/* Quick Prompt Suggestion Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2.5 hide-scrollbar">
            {QUICK_PROMPTS.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Box Container */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-white dark:bg-card rounded-3xl border border-border/80 shadow-md p-2 pl-4 flex items-center gap-3 transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about packages, dates, quotations, or pay your deposit..."
              className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Support subtext */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 px-2">
            <span>Caezelle's Catering Assistant · Powered by Zelle AI</span>
            <span>Support: support@caezelles.ph</span>
          </div>
        </div>
      </main>
    </div>
  );
}
