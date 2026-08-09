import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import useToast from "../../hooks/useToast";
import { listConversations, getMessages, sendMessage, createConversation, markConversationAsRead } from "../../api/messages";
import { getSocket } from "../../api/socket";
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  CheckCheck, 
  Sparkles, 
  LogIn, 
  User,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = [
  "Can I modify my booking?",
  "What's included in my package?",
  "Payment options?",
  "Dietary restrictions"
];

const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function FloatingChatWidget() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers, isOpen]);

  // Load support conversation when widget opens & user is logged in
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    const initChat = async () => {
      setIsLoading(true);
      try {
        let conversationsList = await listConversations();
        let supportConv = conversationsList?.find((c) => c.type === "support" || !c.booking_id);

        if (!supportConv) {
          supportConv = await createConversation({ customer_id: user._id });
        }

        if (!isMounted) return;
        setConversation(supportConv);

        if (supportConv?._id) {
          const msgs = await getMessages(supportConv._id);
          if (isMounted) setMessages(msgs || []);
          await markConversationAsRead(supportConv._id).catch(() => {});
        }
      } catch (err) {
        console.error("Error loading chat widget:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initChat();
    return () => { isMounted = false; };
  }, [isOpen, user]);

  // Real-time socket integration
  useEffect(() => {
    if (!isOpen || !conversation?._id || !user) return undefined;

    const socket = getSocket();
    socketRef.current = socket;

    const joinRoom = () => {
      if (conversation?._id && socket.connected) {
        socket.emit("conversation:join", conversation._id);
      }
    };

    if (!socket.connected) {
      socket.connect();
    }
    joinRoom();

    const onConnect = () => {
      joinRoom();
    };

    const handleNewMessage = (msg) => {
      if (!msg) return;
      const convId = typeof msg.conversation_id === "object" ? msg.conversation_id?._id : msg.conversation_id;
      if (String(convId) !== String(conversation._id)) return;

      setMessages((prev) => (prev.some((item) => item._id === msg._id) ? prev : [...prev, msg]));
      markConversationAsRead(conversation._id).catch(() => {});
    };

    const handleTypingStart = (payload) => {
      if (!payload?.user_id || payload.user_id === user?._id) return;
      setTypingUsers((prev) => (prev.some((item) => item.user_id === payload.user_id) ? prev : [...prev, payload]));
    };

    const handleTypingStop = (payload) => {
      if (!payload?.user_id) return;
      setTypingUsers((prev) => prev.filter((item) => item.user_id !== payload.user_id));
    };

    socket.on("connect", onConnect);
    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      if (conversation?._id && socket.connected) {
        socket.emit("conversation:leave", conversation._id);
      }
      socket.off("connect", onConnect);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      setTypingUsers([]);
    };
  }, [isOpen, conversation?._id, user]);

  const handleSend = async (overrideBody = null) => {
    const textToSend = (overrideBody !== null ? overrideBody : draft).trim();
    const attachmentsToSend = attachmentUrl.trim() 
      ? [{ url: attachmentUrl.trim(), fileName: "Attachment Link", fileType: "link" }] 
      : [];

    if ((!textToSend && attachmentsToSend.length === 0) || isSending) return;

    if (!user) {
      navigate("/login");
      return;
    }

    setIsSending(true);
    try {
      let activeConvId = conversation?._id;
      if (!activeConvId) {
        const created = await createConversation({ customer_id: user._id });
        setConversation(created);
        activeConvId = created._id;
      }

      const newMsg = await sendMessage(activeConvId, {
        body: textToSend,
        attachments: attachmentsToSend
      });

      setMessages((prev) => (prev.some((item) => item._id === newMsg._id) ? prev : [...prev, newMsg]));

      if (overrideBody === null) setDraft("");
      setAttachmentUrl("");
      setShowAttachmentInput(false);
      socketRef.current?.emit("typing:stop", conversation._id);
    } catch (err) {
      notify(err.response?.data?.message || "Could not send message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (!socketRef.current || !conversation?._id) return;
    socketRef.current.emit("typing:start", conversation._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", conversation._id);
    }, 1200);
  };

  const unreadCount = user
    ? messages.filter((m) => m.sender_id?._id !== user?._id).length
    : 0;

  return (
    <>
      {isOpen ? (
        /* OPEN CHAT CONVERSATION CARD (REPLACES TRIGGER CIRCLE) */
        <div
          className="fixed right-4 sm:right-6 z-50 w-[92vw] max-w-[360px] sm:w-[380px] h-[520px] max-h-[82vh] rounded-3xl border border-border/80 shadow-2xl bg-card flex flex-col overflow-hidden origin-bottom-right transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          style={{ bottom: "var(--chat-fab-bottom, 1.5rem)" }}
        >
          {/* HEADER */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shadow-md relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <MessageSquare className="w-5 h-5 fill-white/20" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-primary rounded-full" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm leading-snug">Caezelles Support</h3>
                <p className="text-[11px] text-primary-foreground/80">Usually replies in minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-white p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
              aria-label="Close chat"
              title="Close conversation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CHAT MESSAGES BODY */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            {!user ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto py-12">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-foreground">Chat with Caezelle's Support</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sign in to message our catering team directly and track your event inquiries.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full pt-2">
                  <Button onClick={() => navigate("/login")} size="sm" className="flex-1 text-xs">
                    <LogIn className="w-3.5 h-3.5 mr-1" /> Log In
                  </Button>
                  <Button onClick={() => navigate("/signup")} variant="outline" size="sm" className="flex-1 text-xs">
                    Sign Up
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {/* Auto Welcome bubble */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                    CS
                  </div>
                  <div className="bg-card border border-border/80 text-foreground px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-xs shadow-2xs max-w-[85%] leading-relaxed">
                    Hello! Welcome to Caezelles Catering. How can we help you today?
                  </div>
                </div>

                {isLoading && (
                  <div className="text-center text-[11px] text-muted-foreground py-4 animate-pulse">
                    Loading messages...
                  </div>
                )}

                {messages.map((msg) => {
                  const isMe = msg.sender_id?._id === user?._id;

                  return (
                    <div
                      key={msg._id}
                      className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                          CS
                        </div>
                      )}
                      <div className={cn("flex flex-col max-w-[82%]", isMe ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "px-3.5 py-2.5 rounded-2xl text-xs whitespace-pre-wrap break-words shadow-2xs leading-relaxed",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-xs"
                              : "bg-card border border-border text-foreground rounded-bl-xs"
                          )}
                        >
                          {msg.body}

                          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-border/30 pt-1.5">
                              {msg.attachments.map((att, aIdx) => (
                                <a
                                  key={aIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 text-[11px] underline"
                                >
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{att.fileName || att.url}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1 px-1">
                          <span>{formatTimeAgo(msg.createdAt)}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-primary opacity-80" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px] italic text-muted-foreground bg-card border border-border px-3 py-1 rounded-full w-fit">
                    <span>Team is typing</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* QUICK REPLIES */}
          {user && (
            <div className="p-2.5 bg-card/80 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground mb-1.5 px-1 font-medium">Quick replies:</p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto hide-scrollbar">
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(reply)}
                    disabled={isSending}
                    className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border/60 transition-colors text-left font-normal"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ATTACHMENT INPUT OVERLAY */}
          {showAttachmentInput && user && (
            <div className="px-3 py-1.5 bg-muted/40 border-t border-border flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Paste URL..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="h-7 text-xs bg-background flex-1"
              />
              <Button size="xs" variant="ghost" onClick={() => setShowAttachmentInput(false)} className="h-7 w-7 p-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* INPUT BAR */}
          {user ? (
            <div className="p-3 bg-card border-t border-border">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1 flex items-center">
                  <Input
                    placeholder="Type your message..."
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="pr-8 text-xs h-10 rounded-2xl border-input bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Attach link"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={isSending || (!draft.trim() && !attachmentUrl.trim())}
                  className="h-10 w-10 rounded-2xl shrink-0 bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="p-3 bg-card border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Full chat hub available in portal</span>
              <Button variant="ghost" size="xs" onClick={() => navigate("/customer/messages")} className="text-primary gap-1">
                Go to Inbox <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* COLLAPSED FLOATING TRIGGER BUTTON */
        <Button
          className="fixed right-4 sm:right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-300 ease-out flex items-center justify-center border-2 border-background cursor-pointer animate-in fade-in zoom-in-75"
          style={{ bottom: "var(--chat-fab-bottom, 1.5rem)" }}
          size="icon"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat widget"
          title="Chat with Caezelle Support"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 min-w-5 rounded-full px-1 flex items-center justify-center border-2 border-background animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      )}
    </>
  );
}
