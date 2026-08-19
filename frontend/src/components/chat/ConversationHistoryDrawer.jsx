import React from "react";
import { MessageSquare, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export default function ConversationHistoryDrawer({
  isOpen,
  conversations,
  activeConvId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border/80 shadow-lg flex flex-col transition-transform duration-300 z-10",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-sm mb-2 text-foreground">Previous Conversations</h3>
        <Button
          onClick={onNewConversation}
          variant="default"
          size="sm"
          className="w-full text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-2" /> New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {conversations.length === 0 ? (
          <div className="text-center p-4 text-xs text-muted-foreground mt-4">
            No previous conversations.
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex flex-col gap-1 rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate flex-1 flex items-center gap-1.5">
                      {isActive && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                      {conv.title || "Conversation"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all shrink-0"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] opacity-70">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
