import React, { useState, useEffect, useRef, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import useToast from "../../../hooks/useToast";
import { sendZelleAdminMessage } from "../../../api/zelle";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  Maximize2,
  Minimize2,
  Calendar,
  Package,
  Boxes,
  HelpCircle,
  FileText,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Badge } from "../../ui/badge";
import { cn } from "@/lib/utils";
import ZelleMessage from "../../chat/ZelleMessage";

// Contextual suggestions based on active admin route
const getContextSuggestions = (pathname) => {
  if (pathname.includes("/admin/bookings") || pathname.includes("/admin/inquiries")) {
    return [
      "📅 Check date availability for next month",
      "🔍 Search pending inquiries",
      "📊 Summary of active bookings",
    ];
  }
  if (pathname.includes("/admin/quotes")) {
    return [
      "💡 Recommened packages for 150 guests",
      "💰 What are our most popular add-ons?",
      "📦 Check scaffold sizing rules",
    ];
  }
  if (pathname.includes("/admin/inventory")) {
    return [
      "📦 Check equipment stock levels",
      "🪑 How many Tiffany chairs are available?",
      "⚠️ Any low inventory alerts?",
    ];
  }
  if (pathname.includes("/admin/messages")) {
    return [
      "✉️ Draft a polite date-change response",
      "💳 Policy for booking deposits",
      "🍽️ List available beef menu items",
    ];
  }
  return [
    "📅 Check date availability",
    "🔍 Find recent inquiries",
    "📦 Check inventory levels",
    "💡 Package recommendation for 100 pax",
  ];
};

export default function AdminCopilotPanel() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: `Hello ${user?.first_name || "Admin"}! 👋 I'm **Zelle Copilot**, your catering assistant.\n\nI can help you look up real-time inventory, check date conflicts, query packages, or draft responses and quotations.\n\nHow can I help you right now?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const messagesEndRef = useRef(null);

  // Listen to global open event
  useEffect(() => {
    const handleOpenCopilot = (e) => {
      setIsOpen(true);
      if (e.detail?.prompt) {
        handleSend(e.detail.prompt);
      }
    };
    window.addEventListener("open-admin-copilot", handleOpenCopilot);
    return () => window.removeEventListener("open-admin-copilot", handleOpenCopilot);
  }, []);

  // Auto scroll
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [messages, isLoading, isOpen]);

  const suggestions = getContextSuggestions(location.pathname);

  const handleSend = async (overridePrompt = null) => {
    const promptToSend = (overridePrompt !== null ? overridePrompt : draft).trim();
    if (!promptToSend || isLoading) return;

    const userMessage = {
      role: "user",
      text: promptToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (overridePrompt === null) setDraft("");
    setIsLoading(true);

    try {
      const result = await sendZelleAdminMessage({
        message: promptToSend,
        conversation_id: conversationId,
      });

      if (result?.conversation_id) {
        setConversationId(result.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: result?.text || "No response received.",
          tool_executions: result?.tool_executions || [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reach Zelle Copilot.", "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "I encountered an error communicating with the AI service. Please verify your GEMINI_API_KEY.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConversationId(null);
    setMessages([
      {
        role: "model",
        text: `Session refreshed! How can I assist you with operations?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <>
      {isOpen ? (
        /* FLOATING COPILOT WINDOW (FlowAI Style) */
        <div
          className={cn(
            "fixed right-4 sm:right-6 z-50 rounded-3xl border border-border/80 shadow-2xl bg-card flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-out animate-in fade-in zoom-in-95",
            isExpanded
              ? "w-[94vw] sm:w-[540px] h-[88vh]"
              : "w-[92vw] sm:w-[410px] h-[580px] max-h-[82vh]"
          )}
          style={{ bottom: "1.5rem" }}
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-slate-900 via-primary/95 to-slate-900 text-white p-4 shadow-md flex items-center justify-between relative border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm text-white">Zelle Copilot</h3>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-white/15 text-amber-200 border-white/20">
                    Admin AI
                  </Badge>
                </div>
                <p className="text-[10px] text-white/70">Context: {location.pathname.split("/").pop() || "Dashboard"}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                title="Restart Session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? "Restore size" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                aria-label="Close copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CHAT STREAM */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            <div className="space-y-4 pb-2">
              {messages.map((msg, idx) => (
                <ZelleMessage key={idx} message={msg} isCopilot />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs italic text-muted-foreground bg-card border border-border/80 px-3 py-2 rounded-2xl w-fit animate-pulse">
                  <Sparkles className="w-4 h-4 text-primary animate-spin" />
                  <span>Zelle Copilot is checking database & rules...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* DYNAMIC CONTEXT CHIPS */}
          <div className="p-2.5 bg-card/90 border-t border-border/60">
            <p className="text-[10px] text-muted-foreground mb-1.5 px-1 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Suggested Actions:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto hide-scrollbar">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(suggestion)}
                  disabled={isLoading}
                  className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border/60 transition-colors text-left font-normal cursor-pointer shrink-0"
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
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Ask anything about inventory, quotes, schedules..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isLoading}
                className="text-xs h-10 rounded-2xl border-input bg-background"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !draft.trim()}
                className="h-10 w-10 rounded-2xl shrink-0 bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-transform"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* FLOATING COPILOT TRIGGER BUTTON IN ADMIN */
        <Button
          className="fixed right-6 z-30 h-13 px-4 rounded-full shadow-2xl bg-gradient-to-r from-slate-900 via-primary to-slate-900 text-white hover:scale-105 active:scale-95 transition-all duration-300 ease-out flex items-center gap-2 border-2 border-white/20 cursor-pointer animate-in fade-in zoom-in-75"
          style={{ bottom: "1.5rem" }}
          type="button"
          onClick={() => setIsOpen(true)}
          title="Open Zelle Admin Copilot"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="font-serif font-bold text-xs">Ask Zelle</span>
        </Button>
      )}
    </>
  );
}
