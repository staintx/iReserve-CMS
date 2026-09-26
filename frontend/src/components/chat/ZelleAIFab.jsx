import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import assistantVideo from "@/assets/animations/ireserve-ai-assistant-icon.mp4";
import assistantAvatar from "@/assets/images/zelle-avatar.png";

export default function ZelleAIFab({ isOpen, onClick }) {
  // Toggle between 'ai' (Zelle character) and 'message' (Support staff) states
  const [iconState, setIconState] = useState("ai"); // 'ai' or 'message'
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) return; // Don't animate while panel is open

    const interval = setInterval(() => {
      setIconState((prev) => (prev === "ai" ? "message" : "ai"));
    }, 4500); // Switch every 4.5 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  // Ensure video reliably autoplays inline
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "chat-fab group fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]",
        isOpen ? "bg-slate-800 text-white rotate-90" : ""
      )}
      aria-label={
        isOpen
          ? "Close Assistant"
          : iconState === "ai"
          ? "Open Zelle AI Event Planning Assistant"
          : "Chat with Caezelle Support Team"
      }
    >
      {/* ── State 1: Zelle AI Character (Video + Avatar fallback) ── */}
      <div
        className={cn(
          "absolute inset-0 rounded-full overflow-hidden bg-white flex items-center justify-center transition-all duration-700 ease-in-out",
          !isOpen && iconState === "ai"
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-75 -rotate-12 pointer-events-none"
        )}
      >
        <video
          ref={videoRef}
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

      {/* ── State 2: Caezelle Support (Message icon & Brand gradient) ── */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-tr from-[#1E3563] via-[#2C4B8A] to-[#3B66BD] flex items-center justify-center transition-all duration-700 ease-in-out",
          !isOpen && iconState === "message"
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-75 rotate-12 pointer-events-none"
        )}
      >
        <MessageSquare
          className={cn(
            "w-6 h-6 text-white transition-all duration-500",
            !isOpen && iconState === "message"
              ? "scale-100 opacity-100"
              : "scale-75 opacity-0"
          )}
        />
      </div>

      {/* ── State 3: Open / Close Trigger (X Icon) ── */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-slate-800 flex items-center justify-center transition-all duration-500",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
        )}
      >
        <X className="w-6 h-6 text-white" />
      </div>

      {/* ── Outer Ring / Border ── */}
      <div className="absolute inset-0 rounded-full border-2 border-white shadow-xs pointer-events-none z-10" />

      {/* ── Hover Pill Tooltip (Desktop) ── */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/95 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-white/10 z-30">
        {iconState === "ai" ? (
          <>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Ask Zelle AI</span>
          </>
        ) : (
          <>
            <MessageSquare className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <span>Caezelle Support</span>
          </>
        )}
      </div>
    </button>
  );
}
