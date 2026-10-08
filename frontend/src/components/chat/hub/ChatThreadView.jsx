import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  RotateCcw, 
  Sparkles, 
  Headphones, 
  Send, 
  Maximize2, 
  Minimize2, 
  Minus, 
  X,
  User,
  LogIn,
  CheckCheck,
  Bot
} from "lucide-react";
import { ScrollArea } from "../../ui/scroll-area";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import ZelleMessage from "../ZelleMessage";
import assistantAvatar from "@/assets/images/zelle-avatar.png";

const LOADING_PHASES = [
  "Reading your catering inquiry...",
  "Checking packages and availability...",
  "Formatting personalized recommendations..."
];

const QUICK_SUGGESTIONS = [
  "✨ Recommend wedding packages",
  "📅 Is Dec 15 available?",
  "💰 Package for 100 pax under ₱60k",
  "📝 Help me draft an inquiry",
  "🥩 What beef viands are available?"
];

export default function ChatThreadView({
  user,
  mode = "zelle", // "zelle" | "support"
  onChangeMode,
  onBack,
  // Zelle state
  zelleMessages = [],
  isZelleLoading = false,
  onSendZelle,
  onResetZelle,
  // Support state
  supportMessages = [],
  isSupportLoading = false,
  isSupportSending = false,
  onSendSupport,
  // Window controls
  isExpanded = false,
  onToggleExpand,
  onClose,
  onNavigateLogin,
  onNavigateSignup
}) {
  const [draft, setDraft] = useState("");
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const messagesEndRef = useRef(null);

  // Dynamic multi-stage loading indicator while AI is processing
  useEffect(() => {
    if (!isZelleLoading) {
      setLoadingPhaseIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2400);

    return () => clearInterval(interval);
  }, [isZelleLoading]);

  // Auto-scroll on new message or loading change
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => clearTimeout(timer);
  }, [zelleMessages, supportMessages, isZelleLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    if (mode === "zelle") {
      onSendZelle(text);
    } else {
      onSendSupport(text);
    }
    setDraft("");
  };

  const handleSuggestionClick = (prompt) => {
    if (mode === "zelle") {
      onSendZelle(prompt);
    } else {
      setDraft(prompt);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans">
      {/* ── Contextual Chat Header ──────────────────────────── */}
      <div className="bg-[#2C4B8A] text-white p-3 pt-[max(0.75rem,env(safe-area-inset-top))] px-3.5 shadow-xs relative flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Avatar with live status dot */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center overflow-hidden border border-white/20 shadow-2xs">
                {mode === "zelle" ? (
                  <img src={assistantAvatar} alt="Zelle AI" className="w-full h-full object-cover" />
                ) : (
                  <Headphones className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#2C4B8A] rounded-full" />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-white truncate">
                {mode === "zelle" ? "Zelle AI Assistant" : "Caezelle Support Staff"}
              </h3>
              <p className="text-[10px] text-white/80 font-normal truncate mt-0.5">
                {mode === "zelle" ? "AI Catering & Event Planner" : "Human Event Coordinator"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {mode === "zelle" && (
              <button
                type="button"
                onClick={onResetZelle}
                className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                title="Restart conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleExpand}
              className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector Pill (Zelle AI vs Staff Coordinator) */}
        <div className="flex items-center p-0.5 bg-black/20 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => onChangeMode("zelle")}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              mode === "zelle"
                ? "bg-white text-[#2C4B8A] shadow-2xs font-bold"
                : "text-white/80 hover:text-white hover:bg-white/10"
            )}
          >
            <Sparkles className="w-3 h-3" /> Zelle AI
          </button>
          <button
            type="button"
            onClick={() => onChangeMode("support")}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              mode === "support"
                ? "bg-white text-[#2C4B8A] shadow-2xs font-bold"
                : "text-white/80 hover:text-white hover:bg-white/10"
            )}
          >
            <Headphones className="w-3 h-3" /> Message Staff
          </button>
        </div>
      </div>

      {/* ── Chat Messages Scroll Area ───────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-3 min-w-0">
        {mode === "zelle" ? (
          <>
            {zelleMessages.map((msg, index) => (
              <ZelleMessage
                key={index}
                message={msg}
                onSelectPackage={(pkgName) => onSendZelle(`Tell me more about ${pkgName}`)}
                onStartInquiry={(dateStr) => onSendZelle(`I want to draft an inquiry for ${dateStr}`)}
              />
            ))}

            {/* Dynamic Multi-Step AI Typing & Data Loading Indicator */}
            {isZelleLoading && (
              <div className="flex items-center gap-2.5 text-xs text-slate-700 bg-white border border-slate-200/90 px-3.5 py-2.5 rounded-2xl rounded-tl-sm w-fit shadow-2xs animate-in fade-in duration-300">
                <div className="w-4 h-4 rounded-full border-2 border-[#2C4B8A] border-t-transparent animate-spin shrink-0" />
                <span className="font-medium tracking-tight">
                  {LOADING_PHASES[loadingPhaseIndex]}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          /* Human Support Mode */
          !user ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3.5 my-auto py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shadow-2xs">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Sign in to message our staff</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                  Sign in to chat directly with our event coordinators and track custom quotes.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full max-w-xs pt-1">
                <Button 
                  onClick={onNavigateLogin} 
                  size="sm" 
                  className="flex-1 text-xs h-8.5 rounded-lg bg-[#2C4B8A] hover:bg-[#1E3563] text-white cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1" /> Log In
                </Button>
                <Button 
                  onClick={onNavigateSignup} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs h-8.5 rounded-lg border-slate-200 cursor-pointer"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  CS
                </div>
                <div className="bg-white border border-slate-200 text-slate-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs shadow-2xs max-w-[85%] leading-relaxed">
                  Hello {user.full_name || "there"}! Welcome to Caezelle's Catering Support. How can our team help you with your upcoming event?
                </div>
              </div>

              {isSupportLoading && (
                <div className="text-center text-xs text-slate-400 py-4 animate-pulse">
                  Loading conversations...
                </div>
              )}

              {supportMessages.map((msg) => {
                const isMe = msg.sender_id?._id === user?._id;
                return (
                  <div key={msg._id} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] font-bold flex items-center justify-center text-[10px] shrink-0 mb-1">
                        CS
                      </div>
                    )}
                    <div className={cn("flex flex-col max-w-[85%]", isMe ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "px-3.5 py-2.5 rounded-2xl text-xs whitespace-pre-wrap break-words shadow-2xs leading-relaxed",
                          isMe
                            ? "bg-[#2C4B8A] text-white rounded-tr-sm"
                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
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
          )
        )}
      </div>

      {/* ── Quick Suggestions Pills (Zelle Mode) ─────────────── */}
      {mode === "zelle" && (
        <div className="p-2 px-3 bg-white border-t border-slate-200/70 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {QUICK_SUGGESTIONS.map((sugg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(sugg)}
                disabled={isZelleLoading}
                className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3 py-1 rounded-full border border-slate-200/80 transition-colors font-medium shrink-0 cursor-pointer disabled:opacity-50"
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input Bar ────────────────────────────────────────── */}
      {(mode === "zelle" || (mode === "support" && user)) && (
        <div className="p-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={mode === "zelle" ? "Ask Zelle about packages, dates, menu..." : "Message coordinator directly..."}
              disabled={mode === "zelle" ? isZelleLoading : isSupportSending}
              className="text-xs h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-1.5 focus-visible:ring-[#2C4B8A]"
            />
            <Button
              type="submit"
              size="icon"
              disabled={(mode === "zelle" ? isZelleLoading : isSupportSending) || !draft.trim()}
              className="h-10 w-10 rounded-xl shrink-0 bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-xs cursor-pointer disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
