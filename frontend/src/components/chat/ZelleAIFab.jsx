import React, { useState, useEffect } from "react";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ZelleAIFab({ isOpen, onClick }) {
  // Toggle between 'message' and 'ai' states to playfully communicate dual-purpose
  const [iconState, setIconState] = useState("message"); // 'message' or 'ai'

  useEffect(() => {
    if (isOpen) return; // Don't animate while panel is open

    const interval = setInterval(() => {
      setIconState((prev) => (prev === "message" ? "ai" : "message"));
    }, 4000); // Switch every 4 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 group overflow-hidden border border-white/20",
        isOpen ? "bg-slate-800 text-white rotate-90" : ""
      )}
      aria-label={isOpen ? "Close Assistant" : "Open Zelle Assistant"}
    >
      {/* Backgrounds */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          isOpen ? "opacity-100 bg-slate-800" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-blue-600 transition-opacity duration-700",
          !isOpen && iconState === "message" ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-amber-500 transition-opacity duration-700",
          !isOpen && iconState === "ai" ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Icons */}
      <div className="relative z-10 flex items-center justify-center">
        <X
          className={cn(
            "absolute w-6 h-6 transition-all duration-500",
            isOpen ? "opacity-100 rotate-0 scale-100 text-white" : "opacity-0 -rotate-90 scale-50"
          )}
        />
        <MessageSquare
          className={cn(
            "absolute w-6 h-6 transition-all duration-700",
            !isOpen && iconState === "message"
              ? "opacity-100 rotate-0 scale-100 text-white"
              : "opacity-0 rotate-90 scale-50"
          )}
        />
        <Sparkles
          className={cn(
            "absolute w-6 h-6 transition-all duration-700",
            !isOpen && iconState === "ai"
              ? "opacity-100 rotate-0 scale-100 text-amber-200"
              : "opacity-0 -rotate-90 scale-50"
          )}
        />
      </div>

    </button>
  );
}
