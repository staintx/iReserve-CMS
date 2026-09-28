import React, { useState, useEffect, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import useToast from "../../../hooks/useToast";
import { sendZelleAdminMessage } from "../../../api/zelle";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  Plus,
  Calendar,
  Package,
  Boxes,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { cn } from "@/lib/utils";
import ZelleMessage from "../../chat/ZelleMessage";
import assistantVideo from "@/assets/animations/ireserve-ai-assistant-icon.mp4";
import assistantAvatar from "@/assets/images/zelle-avatar.png";

// Route-aware smart suggestions with categories and icons
const getRouteSuggestions = (pathname) => {
  if (pathname.includes("/admin/bookings") || pathname.includes("/admin/inquiries")) {
    return [
      { icon: Calendar, label: "Check date availability for next month", prompt: "Check date availability for next month" },
      { icon: Clock, label: "Summarize pending inquiry requests", prompt: "Summarize pending inquiry requests" },
      { icon: FileText, label: "Overview of confirmed bookings this week", prompt: "Overview of confirmed bookings this week" },
    ];
  }
  if (pathname.includes("/admin/quotes")) {
    return [
      { icon: Package, label: "Recommend package for 150 guests", prompt: "Recommend package for 150 guests with popular add-ons" },
      { icon: FileText, label: "Calculate estimate for Debut package", prompt: "Calculate estimate for Debut package with 100 pax" },
      { icon: Boxes, label: "Check popular catering add-on pricing", prompt: "Check popular catering add-on pricing" },
    ];
  }
  if (pathname.includes("/admin/inventory")) {
    return [
      { icon: Boxes, label: "Check equipment stock & alerts", prompt: "Check equipment stock levels and list any low inventory alerts" },
      { icon: Boxes, label: "Check Tiffany chair availability", prompt: "How many Tiffany chairs are currently available?" },
      { icon: Package, label: "List low stock catering supplies", prompt: "List all low stock catering supplies" },
    ];
  }
  if (pathname.includes("/admin/messages")) {
    return [
      { icon: FileText, label: "Draft polite date-reschedule reply", prompt: "Draft a polite response informing customer about date conflict options" },
      { icon: HelpCircle, label: "Reservation deposit policy", prompt: "What is our deposit and payment timeline policy?" },
      { icon: Package, label: "List available beef menu items", prompt: "List all available beef menu items and dish descriptions" },
    ];
  }
  return [
    { icon: Calendar, label: "Check date availability", prompt: "Check calendar availability for next month" },
    { icon: Clock, label: "Summarize recent inquiries", prompt: "Summarize recent customer inquiries and status" },
    { icon: Boxes, label: "Audit low stock inventory", prompt: "Audit low stock inventory items" },
    { icon: Package, label: "Recommend package for 100 pax", prompt: "Recommend catering package for 100 pax" },
  ];
};

export default function AdminCopilotPanel() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const { notify } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = getRouteSuggestions(location.pathname);

  // Global event listener to open copilot
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

  // Keyboard shortcut listener (Ctrl+J or Cmd+J to toggle, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Auto scroll
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
  }, [messages, isLoading, isOpen]);

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
    setShowQuickPrompts(false);

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
      const serverMessage = err.response?.data?.text || err.response?.data?.message;
      const isConfigIssue =
        serverMessage?.toLowerCase().includes("offline") ||
        serverMessage?.toLowerCase().includes("maintenance");

      const userFriendlyText = isConfigIssue
        ? serverMessage
        : "I'm having trouble connecting to Zelle Copilot right now. Please try asking again in a moment.";

      notify(err.response?.data?.message || "Failed to reach Zelle Copilot.", "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: userFriendlyText,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConversationId(null);
    setMessages([]);
    setShowQuickPrompts(false);
  };

  if (!isOpen) return null;

  const isInitialState = messages.length === 0;

  const currentRouteName = (() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "Dashboard";
    return last.charAt(0).toUpperCase() + last.slice(1);
  })();

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Mobbin-style Right Slide-Over Flyout Panel */}
      <aside
        className={cn(
          "fixed top-2 right-2 bottom-2 z-50 rounded-2xl border border-border/80 shadow-2xl bg-card flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out animate-in slide-in-from-right-8 fade-in-80",
          isExpanded
            ? "w-[calc(100vw-1rem)] sm:w-[680px] lg:w-[740px]"
            : "w-[calc(100vw-1rem)] sm:w-[440px]"
        )}
      >
        {/* PANEL TOP HEADER */}
        <div className="bg-card px-4 py-3.5 border-b border-border/70 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8.5 h-8.5 rounded-full bg-white border border-border/80 shadow-2xs overflow-hidden flex items-center justify-center">
                <video
                  src={assistantVideo}
                  poster={assistantAvatar}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-125 select-none pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm text-foreground tracking-tight truncate">
                  Zelle Copilot
                </h2>
                <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
                  Admin AI
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Context: <span className="font-medium text-foreground">{currentRouteName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="New Chat / Reset Session"
              aria-label="New Chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer hidden sm:block"
              title={isExpanded ? "Collapse width" : "Expand width"}
              aria-label={isExpanded ? "Collapse width" : "Expand width"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close copilot"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* PANEL BODY */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/5 [scrollbar-width:thin]">
          {isInitialState ? (
            /* WELCOME / EMPTY STATE */
            <div className="h-full flex flex-col justify-center items-center py-6 px-2 text-center animate-in fade-in duration-300">
              {/* Glowing Hero Character Avatar */}
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-full bg-white border-2 border-primary/25 shadow-xl overflow-hidden flex items-center justify-center">
                  <video
                    src={assistantVideo}
                    poster={assistantAvatar}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-125 select-none pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                <div className="absolute -inset-2 rounded-full bg-primary/15 -z-10 blur-md animate-pulse" />
              </div>

              <h3 className="text-base font-bold text-foreground tracking-tight">
                Hey {user?.first_name || "Admin"}! 👋
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                I'm <strong>Zelle Copilot</strong>. Ask me anything about your catering reservations, stock levels, custom quotation calculations, or customer inquiries.
              </p>

              {/* Context Prompt Action Cards */}
              <div className="w-full mt-6 space-y-2 text-left">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Suggested Actions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/70 hover:border-border transition-all duration-150 cursor-pointer text-left shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {item.label}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE CONVERSATION STREAM */
            <div className="space-y-4 pb-2">
              {messages.map((msg, idx) => (
                <ZelleMessage key={idx} message={msg} isCopilot />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs italic text-muted-foreground bg-card border border-border/80 px-3.5 py-2.5 rounded-2xl w-fit animate-pulse shadow-2xs">
                  <Sparkles className="w-4 h-4 text-primary animate-spin" />
                  <span>Zelle Copilot is checking database and rules...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* QUICK PROMPT INJECTOR / DRAWER */}
        {showQuickPrompts && (
          <div className="p-3 bg-muted/40 border-t border-border/60 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Prompts
              </span>
              <button
                type="button"
                onClick={() => setShowQuickPrompts(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto [scrollbar-width:none]">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleSend(item.prompt);
                    setShowQuickPrompts(false);
                  }}
                  className="text-[11px] bg-card hover:bg-muted text-foreground px-2.5 py-1 rounded-lg border border-border/80 transition-colors text-left font-medium cursor-pointer shadow-2xs shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMPOSER / INPUT FOOTER */}
        <div className="p-3 bg-card border-t border-border/80 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setShowQuickPrompts(!showQuickPrompts)}
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer",
                showQuickPrompts
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/70"
              )}
              title="Show suggested prompts"
              aria-label="Suggested prompts"
            >
              <Plus className={cn("w-4 h-4 transition-transform", showQuickPrompts && "rotate-45")} />
            </button>

            <Input
              ref={inputRef}
              placeholder="Ask anything about your operations, inventory, quotes..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isLoading}
              className="text-xs h-10 rounded-xl border-input bg-background focus-visible:ring-1 focus-visible:ring-primary"
            />

            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !draft.trim()}
              className="h-10 w-10 rounded-xl shrink-0 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              title="Send prompt"
              aria-label="Send prompt"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
