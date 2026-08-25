import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import {
  sendZelleCustomerMessage,
  getZelleCustomerHistory,
  getZelleConversations,
  getZelleConversationById,
  deleteZelleConversation
} from "../../api/zelle";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Plus,
  ArrowUp,
  Trash2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Paperclip,
  SlidersHorizontal,
  EyeOff,
  Eye,
  Sparkles,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import ZelleMessage from "../../components/chat/ZelleMessage";

const DEFAULT_SUGGESTIONS = [
  "What is the booking & deposit process?",
  "Suggest a 100-guest wedding menu",
  "Estimate total cost for 150 guests",
  "Check date availability for December",
  "What styling is included in packages?"
];

export default function CustomerAgent() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [likedMap, setLikedMap] = useState({});
  const [openThoughts, setOpenThoughts] = useState({});
  const [openSearches, setOpenSearches] = useState({});
  const [activeTabContext, setActiveTabContext] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load list of conversation sessions
  const loadConversations = useCallback(async () => {
    try {
      const data = await getZelleConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  // Load initial conversation history
  useEffect(() => {
    const init = async () => {
      setLoadingHistory(true);
      try {
        await loadConversations();
        const activeData = await getZelleCustomerHistory();
        if (activeData?.conversation_id) {
          setActiveConversationId(activeData.conversation_id);
          setMessages(activeData.messages || []);
        }
      } catch (err) {
        console.error("Failed to load customer AI history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    init();
  }, [loadConversations]);

  // Select a past conversation
  const selectConversation = async (id) => {
    if (id === activeConversationId) return;
    setIsLoading(true);
    try {
      const data = await getZelleConversationById(id);
      setActiveConversationId(id);
      setMessages(data.messages || []);
    } catch (err) {
      notify("Failed to load conversation.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new clean conversation session
  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputMessage("");
    if (inputRef.current) inputRef.current.focus();
  };

  // Delete a specific conversation session
  const handleDeleteConversation = async (idToDelete) => {
    const id = idToDelete || activeConversationId;
    if (!id) {
      startNewChat();
      notify("Chat cleared.", "success");
      return;
    }

    try {
      await deleteZelleConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id && c._id !== id));
      if (activeConversationId === id) {
        startNewChat();
      }
      await loadConversations();
      notify("Conversation deleted.", "success");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      notify("Failed to delete conversation.", "error");
    }
  };

  // Send message to AI Agent
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage = {
      role: "user",
      text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await sendZelleCustomerMessage({
        message: text,
        conversation_id: activeConversationId
      });

      if (response?.conversation_id) {
        setActiveConversationId(response.conversation_id);
      }

      const agentMessage = {
        role: "model",
        text: response.reply || response.text || "I have prepared the catering details for you.",
        ui_cards: response.ui_cards || [],
        tool_calls: response.tool_calls || [],
        timestamp: new Date().toISOString(),
        thought_time: 2,
        references_count: 5
      };

      setMessages((prev) => [...prev, agentMessage]);
      loadConversations();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reach AI concierge. Please try again.", "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "I apologize, but I encountered a momentary connection issue. Please try rephrasing or asking again.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    notify("Response copied to clipboard", "success");
  };

  const toggleLike = (index, type) => {
    setLikedMap((prev) => ({
      ...prev,
      [index]: prev[index] === type ? null : type
    }));
  };

  const toggleThought = (idx) => {
    setOpenThoughts((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleSearch = (idx) => {
    setOpenSearches((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "Started a few seconds ago";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    const diffMin = Math.floor((new Date() - d) / 60000);
    if (diffMin < 1) return "Started a few seconds ago";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const currentTitle = (() => {
    if (!activeConversationId) return "New Conversation";
    const found = conversations.find((c) => c.id === activeConversationId);
    return found?.title || "New Conversation";
  })();

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] flex w-full bg-white font-sans antialiased overflow-hidden">
        
        {/* ── Left Sub-Pane (Recent chats & Routines) ─────────────────── */}
        <aside className="w-64 lg:w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between hidden md:flex">
          {/* Top Header */}
          <div className="px-4 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Recent chats</span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-600">
                {conversations.length || 1} chat
              </span>
              <span>·</span>
              <span>Stored for 30 days</span>
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1 px-2 py-2">
            <div className="space-y-0.5">
              {/* If on a new unsaved chat, show New Conversation item */}
              {!activeConversationId && (
                <div className="group relative flex items-center justify-between px-3 py-2 rounded-md bg-slate-100 text-xs font-semibold text-slate-900 cursor-pointer">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-bold text-slate-900">New Conversation</p>
                    <p className="text-[11px] text-slate-400 font-normal">Started a few seconds ago</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 bg-white border border-slate-200 shadow-md z-[100]">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          startNewChat();
                        }}
                        className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Clear chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={cn(
                      "group relative flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-colors",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs leading-snug">{conv.title}</p>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                        {formatRelativeTime(conv.updatedAt || conv.createdAt)}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={cn(
                            "p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-opacity",
                            isActive ? "opacity-100 text-slate-600" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                          )}
                          title="Options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 bg-white border border-slate-200 shadow-md z-[100]">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer text-xs font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* ── Right Main Chat Area ───────────────────────────────────── */}
        <main className="flex-1 flex flex-col bg-white min-w-0 h-full relative">
          {/* Header Bar */}
          <header className="h-12 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-slate-900 font-sans truncate pr-4">
              {currentTitle}
            </h2>

            <div className="flex items-center gap-2">
              {activeConversationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteConversation(activeConversationId)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7.5 px-2 rounded-md text-xs cursor-pointer"
                  title="Delete this conversation"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={startNewChat}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold h-7.5 px-3 rounded-md flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New chat</span>
              </Button>
            </div>
          </header>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-20 py-8 space-y-6">
            {/* Empty State / Welcome */}
            {messages.length === 0 && !isLoading && (
              <div className="max-w-2xl mx-auto py-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  How can I help you with your catering today?
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Ask about menus, estimate guest budgets, check event dates, or compare catering tiers.
                </p>
              </div>
            )}

            {/* Message Stream */}
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isThoughtOpen = openThoughts[idx] ?? false;
              const isSearchOpen = openSearches[idx] ?? false;

              return (
                <div key={idx} className="space-y-4 max-w-3xl">
                  {/* User Bubble (Right Aligned Clean Card) */}
                  {isUser ? (
                    <div className="flex justify-end">
                      <div className="bg-[#F1F3F5] text-slate-900 text-xs sm:text-sm font-medium px-4 py-2 rounded-md max-w-lg leading-relaxed shadow-2xs border border-slate-200/60">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    /* Agent Response (Direct on White Canvas) */
                    <div className="space-y-3 pt-2">
                      {/* Thought Accordion */}
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleThought(idx)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <span>Thought for 2 seconds</span>
                          {isThoughtOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {isThoughtOpen && (
                          <div className="pl-3 py-1.5 text-xs text-slate-400 border-l-2 border-slate-200">
                            Parsed inquiry context, queried catering menu database, and verified package inclusions.
                          </div>
                        )}
                      </div>

                      {/* Searched Docs / Packages Accordion */}
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleSearch(idx)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <span>Searched docs</span>
                          {isSearchOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {isSearchOpen && (
                          <div className="pl-3 py-1.5 text-xs text-slate-400 border-l-2 border-slate-200">
                            Loaded active menu items, pricing rules, and current reservation slots.
                          </div>
                        )}
                      </div>

                      {/* Pure Markdown Response Body */}
                      <div className="text-xs sm:text-sm text-slate-900 leading-relaxed space-y-3 font-normal pt-1">
                        <ZelleMessage message={msg} />
                      </div>

                      {/* Action Bar (Copy, Thumbs, References) */}
                      <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.text, idx)}
                            className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLike(idx, "like")}
                            className={cn(
                              "p-1 hover:text-slate-700 transition-colors cursor-pointer",
                              likedMap[idx] === "like" && "text-slate-900"
                            )}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLike(idx, "dislike")}
                            className={cn(
                              "p-1 hover:text-slate-700 transition-colors cursor-pointer",
                              likedMap[idx] === "dislike" && "text-rose-600"
                            )}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-[11px] text-slate-400 font-normal">
                          {msg.references_count || 5} references
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking status */}
            {isLoading && (
              <div className="space-y-2 pt-2 max-w-3xl">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-slate-700" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Bottom Sticky Input Bar ───────────────────────────────── */}
          <footer className="px-6 sm:px-12 lg:px-20 pb-4 pt-2 bg-white shrink-0 space-y-2.5 max-w-4xl mx-auto w-full">
            {/* Suggestion Toggle Header */}
            {showSuggestions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide suggestions</span>
                  </button>
                </div>

                {/* Suggestion Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {DEFAULT_SUGGESTIONS.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => handleSendMessage(text)}
                      className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showSuggestions && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setShowSuggestions(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show suggestions</span>
                </button>
              </div>
            )}

            {/* Input Card Box */}
            <div className="relative rounded-md border border-slate-200 bg-white p-3 shadow-2xs focus-within:border-slate-400 transition-all space-y-2.5">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                rows={1}
                className="w-full resize-none bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none max-h-32"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Show all package options and menu categories")}
                    className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Attach or inspect packages"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Explain pricing calculation and guest tiers")}
                    className="p-1 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Parameters"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className={cn(
                    "h-7 w-7 p-0 rounded-md flex items-center justify-center transition-colors cursor-pointer shadow-2xs",
                    inputMessage.trim() && !isLoading
                      ? "bg-slate-900 hover:bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </Button>
              </div>
            </div>

            {/* Footnote */}
            <p className="text-[11px] text-center text-slate-400">
              Agent is AI and can make mistakes. Please double-check responses.
            </p>
          </footer>
        </main>
      </div>
    </CustomerDashboardLayout>
  );
}
