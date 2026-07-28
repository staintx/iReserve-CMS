import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { getConversation, getMessages, sendMessage } from "../../api/messages";
import useToast from "../../hooks/useToast";
import { AuthContext } from "../../context/AuthContext";
import { getSocket } from "../../api/socket";
import { Send, ChevronLeft, User, MoreVertical } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "@/lib/utils";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

const getTitle = (conversation) => {
  if (conversation?.booking_id?.event_type) {
    return `${conversation.booking_id.event_type} - ${formatShortDate(conversation.booking_id.event_date)}`;
  }
  if (conversation?.inquiry_id?.event_type) {
    return `${conversation.inquiry_id.event_type} - ${formatShortDate(conversation.inquiry_id.event_date)}`;
  }
  return "Support Chat";
};

export default function CustomerMessageThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { notify } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const title = useMemo(() => getTitle(conversation), [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [conversationData, messageData] = await Promise.all([
          getConversation(id),
          getMessages(id)
        ]);
        if (!isMounted) return;
        setConversation(conversationData);
        setMessages(messageData || []);
      } catch (err) {
        notify(err.response?.data?.message || "We could not load this conversation.", "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (id) load();
    return () => { isMounted = false; };
  }, [id, notify]);

  useEffect(() => {
    if (!id) return undefined;
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    socket.emit("conversation:join", id);

    const handleNewMessage = (message) => {
      if (String(message?.conversation_id) !== String(id)) return;
      setMessages((prev) => (prev.some((item) => item._id === message._id) ? prev : [...prev, message]));
    };

    const handleTypingStart = (payload) => {
      if (!payload?.user_id || payload.user_id === user?._id) return;
      setTypingUsers((prev) => (prev.some((item) => item.user_id === payload.user_id) ? prev : [...prev, payload]));
    };

    const handleTypingStop = (payload) => {
      if (!payload?.user_id) return;
      setTypingUsers((prev) => prev.filter((item) => item.user_id !== payload.user_id));
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.emit("conversation:leave", id);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      setTypingUsers([]);
    };
  }, [id, user?._id]);

  const handleSend = async () => {
    const nextBody = draft.trim();
    if (!nextBody || isSending) return;
    setIsSending(true);
    try {
      const message = await sendMessage(id, nextBody);
      setMessages((prev) => (prev.some((item) => item._id === message._id) ? prev : [...prev, message]));
      setDraft("");
      socketRef.current?.emit("typing:stop", id);
    } catch (err) {
      notify(err.response?.data?.message || "We could not send your message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    if (!socketRef.current || !id) return;
    socketRef.current.emit("typing:start", id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", id);
    }, 1200);
  };

  const typingLabel = typingUsers.length
    ? `${typingUsers.map((item) => item.name).join(", ")} is typing...`
    : "";

  return (
    <CustomerDashboardLayout
      title="Messages"
      subtitle="Communicate with Caezelle's Catering team"
    >
      <div className="max-w-4xl mx-auto h-[calc(100vh-280px)] min-h-[500px]">
        <Card className="h-full flex flex-col border-border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/customer/messages")} className="text-muted-foreground">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight truncate max-w-[200px] sm:max-w-xs">{title}</h3>
                <p className="text-xs text-muted-foreground">{conversation?.manager_id?.full_name || "Caezelle's Support"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                Support Chat
              </span>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {isLoading && <div className="text-center text-muted-foreground text-sm my-4 animate-pulse">Loading messages...</div>}
              {!isLoading && messages.length === 0 && (
                <div className="text-center my-12">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id?._id === user?._id;
                const initials = (msg.sender_id?.full_name || msg.sender_id?.role || "U").slice(0, 2).toUpperCase();
                const showAvatar = idx === 0 || messages[idx - 1]?.sender_id?._id !== msg.sender_id?._id;

                return (
                  <div key={msg._id} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", showAvatar ? "bg-muted text-muted-foreground" : "invisible")}>
                        {initials}
                      </div>
                    )}
                    
                    <div className={cn("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                      <div 
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-card border border-border text-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.body}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {typingLabel && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs italic ml-10">
                  {typingLabel}
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-end gap-2 max-w-3xl mx-auto"
            >
              <div className="relative flex-1">
                <textarea
                  className="flex w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[50px] max-h-[150px] resize-none"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                className="h-[50px] w-[50px] rounded-full shrink-0"
                disabled={isSending || !draft.trim()}
              >
                <Send className="w-5 h-5 ml-1" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </CustomerDashboardLayout>
  );
}
