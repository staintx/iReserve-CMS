import React from "react";
import { MessageSquare, Sparkles, HelpCircle, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import assistantAvatar from "@/assets/images/zelle-avatar.png";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "Just now";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo`;
    return `${Math.floor(diffMonths / 12)}y`;
  } catch (e) {
    return "Recently";
  }
}

export default function MessagesTab({
  conversations = [],
  supportConversations = [],
  onSelectZelleConversation,
  onSelectSupportConversation,
  onStartNewChat,
  isLoggedIn = false
}) {
  const hasZelle = conversations && conversations.length > 0;
  const hasSupport = supportConversations && supportConversations.length > 0;
  const hasAny = hasZelle || hasSupport;

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white font-sans">
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 divide-y divide-slate-100">
        {!hasAny ? (
          /* ── Empty State matching Reference (Image 6) ── */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3.5 my-auto py-16">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs">
              <MessageSquare className="w-6 h-6 text-slate-800" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">No messages</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px] leading-relaxed">
                Messages from the catering team and Zelle AI will be shown here
              </p>
            </div>
          </div>
        ) : (
          /* ── Conversation List matching Reference (Image 8) ── */
          <div className="space-y-1 py-1">
            {/* Zelle AI Conversations */}
            {conversations.map((conv, idx) => {
              const lastMsg = conv.snippet || conv.last_message || (conv.messages?.[conv.messages.length - 1]?.parts?.[0]?.text) || (conv.messages?.[conv.messages.length - 1]?.text) || "Start planning your catering...";
              const time = formatRelativeTime(conv.updatedAt || conv.createdAt);

              return (
                <button
                  key={conv._id || conv.id || idx}
                  type="button"
                  onClick={() => onSelectZelleConversation(conv)}
                  className="w-full flex items-start gap-3 py-3 px-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#2C4B8A]/10 border border-[#2C4B8A]/20 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                    <img 
                      src={assistantAvatar} 
                      alt="Zelle" 
                      className="w-full h-full object-cover rounded-full" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-[#2C4B8A] transition-colors truncate">
                        {conv.title || "Zelle AI Assistant"}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 group-hover:text-slate-700 transition-colors">
                      {typeof lastMsg === "string" ? lastMsg.replace(/[#*`_]/g, "") : "Catering consultation"}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Support Coordinator Conversations (if logged in) */}
            {supportConversations.map((conv, idx) => {
              const title = conv.booking_id?.event_type
                ? `${conv.booking_id.event_type} (${conv.booking_id.booking_number || conv.booking_id.reference || "Booking"})`
                : conv.inquiry_id?.event_type
                ? `${conv.inquiry_id.event_type} Inquiry`
                : "Caezelle Support Staff";

              const rawMsg = typeof conv.last_message === "object" ? conv.last_message?.body : conv.last_message;
              const lastMsg = rawMsg || conv.snippet || "Chat with event coordinators";
              const time = formatRelativeTime(conv.last_message_at || conv.updatedAt || conv.createdAt);

              return (
                <button
                  key={conv._id || idx}
                  type="button"
                  onClick={() => onSelectSupportConversation(conv)}
                  className="w-full flex items-start gap-3 py-3 px-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] font-bold flex items-center justify-center text-xs shrink-0">
                    CS
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-[#2C4B8A] transition-colors truncate">
                        {title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5 group-hover:text-slate-700 transition-colors">
                      {lastMsg}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Button (Navy Brand Color) ── */}
      <div className="p-4 pt-2 bg-white flex justify-center shrink-0 border-t border-slate-100">
        <button
          type="button"
          onClick={onStartNewChat}
          className="px-5 py-2.5 rounded-full bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-medium text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
        >
          <span>Ask a question</span>
          <HelpCircle className="w-4 h-4 text-[#D2B67C]" />
        </button>
      </div>
    </div>
  );
}
