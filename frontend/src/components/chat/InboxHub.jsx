import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import useToast from "../../hooks/useToast";
import { listConversations, getConversation, getMessages, sendMessage, markConversationAsRead } from "../../api/messages";
import { getZelleResponseDraft } from "../../api/zelle";
import { getSocket } from "../../api/socket";
import { 
  Search, 
  Send, 
  User, 
  Calendar, 
  Clock, 
  Sparkles, 
  Info, 
  Paperclip, 
  X, 
  CheckCheck, 
  ChevronRight,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

const formatDateHeader = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getInitials = (nameStr) => {
  const parts = String(nameStr || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getConversationTitle = (conv, currentUser) => {
  if (!conv) return "Conversation";
  if (conv.booking_id?.event_type) {
    const d = conv.booking_id.event_date ? new Date(conv.booking_id.event_date).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "";
    return `${conv.booking_id.event_type} ${d ? `(${d})` : ""}`;
  }
  if (conv.inquiry_id?.event_type) {
    const d = conv.inquiry_id.event_date ? new Date(conv.inquiry_id.event_date).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "";
    return `Inquiry: ${conv.inquiry_id.event_type} ${d ? `(${d})` : ""}`;
  }
  if (currentUser?.role === "customer") {
    return conv.event_manager_id?.full_name || "Caezelle's Event Support";
  }
  return conv.customer_id?.full_name || conv.customer_id?.email || "Support Chat";
};

const getThreadAvatarName = (conv, currentUser) => {
  if (currentUser?.role === "customer") {
    return conv.event_manager_id?.full_name || "Caezelle Support";
  }
  return conv.customer_id?.full_name || conv.customer_id?.email || "Guest";
};

const getThreadSubtitle = (conv, currentUser) => {
  if (currentUser?.role === "customer") {
    if (conv.event_manager_id?.full_name) {
      return `Manager: ${conv.event_manager_id.full_name}`;
    }
    return "Support Team";
  }
  return conv.customer_id?.full_name || conv.customer_id?.email || "Customer";
};

const getCodeBadge = (conv) => {
  if (conv?.booking_id?._id || conv?.booking_id?.booking_number) {
    const idStr = conv.booking_id.booking_number || conv.booking_id._id.slice(-6).toUpperCase();
    return { text: `EVT-${idStr}`, type: "event" };
  }
  if (conv?.inquiry_id?._id || conv?.inquiry_id?.inquiry_number) {
    const idStr = conv.inquiry_id.inquiry_number || conv.inquiry_id._id.slice(-6).toUpperCase();
    return { text: `INQ-${idStr}`, type: "inquiry" };
  }
  return { text: "SUPPORT", type: "support" };
};

const QUICK_REPLIES = [
  "Thank you for reaching out! Our team is reviewing your event details.",
  "Your booking request has been updated. Please let us know if you need any adjustments.",
  "Could you please confirm your estimated guest headcount?",
  "We have sent you the customized quotation details for your review."
];

const getMessageConversationId = (msg) => {
  if (!msg?.conversation_id) return null;
  return typeof msg.conversation_id === "object" ? msg.conversation_id?._id : msg.conversation_id;
};

const createOptimisticMessage = ({ clientMessageId, conversationId, user, body, attachments }) => ({
  _id: clientMessageId,
  client_message_id: clientMessageId,
  conversation_id: conversationId,
  sender_id: {
    _id: user._id,
    full_name: user.full_name,
    role: user.role,
    email: user.email
  },
  body,
  attachments,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pending: true
});

const mergeMessageIntoList = (list, message) => {
  if (!message) return list;
  const targetConvId = getMessageConversationId(message);
  const cleanList = targetConvId
    ? list.filter((item) => {
        const itemConvId = getMessageConversationId(item);
        return !itemConvId || String(itemConvId) === String(targetConvId);
      })
    : list;

  const clientMessageId = message.client_message_id;
  const messageId = message._id;
  const matchIndex = cleanList.findIndex((item) => {
    if (clientMessageId && (item.client_message_id === clientMessageId || String(item._id) === String(clientMessageId))) return true;
    if (messageId && (String(item._id) === String(messageId) || item.client_message_id === String(messageId))) return true;
    return false;
  });

  let next;
  if (matchIndex === -1) {
    next = [...cleanList, { ...message, pending: false }];
  } else {
    next = [...cleanList];
    next[matchIndex] = { ...next[matchIndex], ...message, pending: false };
  }

  const seenKeys = new Set();
  const result = [];
  for (const m of next) {
    const key = m._id ? String(m._id) : (m.client_message_id ? String(m.client_message_id) : null);
    if (key) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }
    result.push(m);
  }
  return result;
};

const mergeMessageLists = (existingMessages, fetchedMessages, targetConversationId = null) => {
  const existingForConv = targetConversationId
    ? existingMessages.filter((msg) => {
        const convId = getMessageConversationId(msg);
        return !convId || String(convId) === String(targetConversationId);
      })
    : existingMessages;

  const merged = [...existingForConv];
  for (const message of fetchedMessages || []) {
    const clientMessageId = message.client_message_id;
    const messageId = message._id;
    const matchIndex = merged.findIndex((item) => {
      if (clientMessageId && (item.client_message_id === clientMessageId || String(item._id) === String(clientMessageId))) return true;
      if (messageId && (String(item._id) === String(messageId) || item.client_message_id === String(messageId))) return true;
      return false;
    });

    if (matchIndex === -1) {
      merged.push({ ...message, pending: false });
    } else {
      merged[matchIndex] = { ...merged[matchIndex], ...message, pending: false };
    }
  }

  const seenKeys = new Set();
  const result = [];
  for (const m of merged) {
    const key = m._id ? String(m._id) : (m.client_message_id ? String(m.client_message_id) : null);
    if (key) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }
    result.push(m);
  }

  return result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const sendMessageThroughSocket = (socket, payload) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket unavailable"));
      return;
    }

    socket.emit("message:send", payload, (response) => {
      if (!response?.ok) {
        reject(new Error(response?.message || "Could not send message."));
        return;
      }
      resolve(response.message);
    });
  });
};

const sendMessageWithFallback = async ({ socket, activeId, payload }) => {
  if (socket?.connected) {
    try {
      return await sendMessageThroughSocket(socket, payload);
    } catch (socketErr) {
      console.debug("Socket send failed, falling back to REST:", socketErr.message);
    }
  }

  return sendMessage(activeId, payload);
};

export default function InboxHub({ basePath = "/admin/messages" }) {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { notify } = useToast();

  const isCustomerRole = user?.role === "customer";

  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(routeId || null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);

  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showDetailsPane, setShowDetailsPane] = useState(!isCustomerRole);

  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const pendingThreadFetchRef = useRef(new Set());
  const isInitialScroll = useRef(true);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const upsertThreadFromConversation = (conversation) => {
    if (!conversation?._id) return;

    setThreads((prev) => {
      const threadIndex = prev.findIndex((thread) => String(thread._id) === String(conversation._id));
      if (threadIndex === -1) {
        return [conversation, ...prev];
      }

      const next = [...prev];
      next[threadIndex] = { ...next[threadIndex], ...conversation };
      return next;
    });
  };

  const ensureThreadLoaded = async (conversationId) => {
    const key = String(conversationId);
    if (pendingThreadFetchRef.current.has(key)) return;

    pendingThreadFetchRef.current.add(key);
    try {
      const conversation = await getConversation(conversationId);
      upsertThreadFromConversation(conversation);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Failed to sync conversation thread", err);
      }
    } finally {
      pendingThreadFetchRef.current.delete(key);
    }
  };

  useEffect(() => {
    if (routeId && routeId !== activeId) {
      setActiveId(routeId);
    }
  }, [routeId]);

  const loadThreads = async (autoSelect = true) => {
    try {
      setIsLoadingThreads(true);
      const data = await listConversations();
      setThreads(data || []);
      
      if (autoSelect && !routeId && data && data.length > 0) {
        setActiveId(data[0]._id);
        navigate(`${basePath}/${data[0]._id}`, { replace: true });
      }
    } catch (err) {
      notify(err.response?.data?.message || "Could not load messages.", "error");
    } finally {
      setIsLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    setActiveConversation(null);
    setMessages([]);
    setIsLoadingMessages(true);

    const loadConversationDetails = async () => {
      try {
        const [convData, msgData] = await Promise.all([
          getConversation(activeId),
          getMessages(activeId)
        ]);
        if (!isMounted) return;
        setActiveConversation(convData);
        setMessages((prev) => mergeMessageLists(prev, msgData || [], activeId));

        await markConversationAsRead(activeId).catch(() => {});
        setThreads((prev) =>
          prev.map((t) =>
            t._id === activeId
              ? {
                  ...t,
                  unread_admin_count: isCustomerRole ? t.unread_admin_count : 0,
                  unread_customer_count: isCustomerRole ? 0 : t.unread_customer_count
                }
              : t
          )
        );
      } catch (err) {
        if (err.response?.status !== 404) {
          notify(err.response?.data?.message || "Could not load conversation.", "error");
        }
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    };

    loadConversationDetails();
    return () => { isMounted = false; };
  }, [activeId, isCustomerRole]);

  // Active Conversation Live Polling Net (Every 3 seconds)
  useEffect(() => {
    if (!activeId) return;

    const pollInterval = setInterval(async () => {
      try {
        const [fetchedMsgs, fetchedThreads] = await Promise.all([
          getMessages(activeId).catch(() => null),
          listConversations().catch(() => null)
        ]);

        if (fetchedMsgs && Array.isArray(fetchedMsgs)) {
          setMessages((prev) => mergeMessageLists(prev, fetchedMsgs, activeId));
        }
        if (fetchedThreads && Array.isArray(fetchedThreads)) {
          setThreads(fetchedThreads);
        }
      } catch (e) {
        // silent catch
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activeId]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    const joinedConversationId = activeIdRef.current;

    const joinActiveRoom = () => {
      if (joinedConversationId && socket.connected) {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        socket.emit("conversation:join", { conversationId: joinedConversationId, token });
      }
    };

    if (!socket.connected) {
      socket.connect();
    } else {
      joinActiveRoom();
    }

    const onConnect = () => {
      joinActiveRoom();
    };

    const handleNewMessage = (msg) => {
      if (!msg) return;
      const convId = getMessageConversationId(msg);
      if (!convId) return;

      const currentId = activeIdRef.current;
      const isCurrentThread = currentId && String(convId) === String(currentId);

      if (isCurrentThread) {
        setMessages((prev) => mergeMessageIntoList(prev, msg));
        markConversationAsRead(currentId).catch(() => {});
      }

      let shouldLoadThread = false;
      setThreads((prev) => {
        const threadIndex = prev.findIndex((t) => String(t._id) === String(convId));
        if (threadIndex === -1) {
          shouldLoadThread = true;
          return prev;
        }

        const targetThread = prev[threadIndex];
        const msgSnippet = msg.body || (msg.attachments?.length ? "[Attachment]" : "New message");
        const updatedThread = {
          ...targetThread,
          last_message: msgSnippet,
          last_message_at: msg.createdAt || new Date().toISOString(),
          unread_admin_count: isCustomerRole
            ? targetThread.unread_admin_count
            : isCurrentThread ? 0 : (targetThread.unread_admin_count || 0) + 1,
          unread_customer_count: !isCustomerRole
            ? targetThread.unread_customer_count
            : isCurrentThread ? 0 : (targetThread.unread_customer_count || 0) + 1
        };

        const nextThreads = [...prev];
        nextThreads.splice(threadIndex, 1);
        return [updatedThread, ...nextThreads];
      });

      if (shouldLoadThread) {
        ensureThreadLoaded(convId);
      }
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
      if (joinedConversationId && socket.connected) {
        socket.emit("conversation:leave", joinedConversationId);
      }
      socket.off("connect", onConnect);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      setTypingUsers([]);
    };
  }, [activeId, user?._id, isCustomerRole]);



  const handleSend = async (overrideBody = null) => {
    const textToSend = (overrideBody !== null ? overrideBody : draft).trim();
    const attachmentsToSend = attachmentUrl.trim()
      ? [{ url: attachmentUrl.trim(), fileName: "Attachment Link", fileType: "link" }]
      : [];

    if ((!textToSend && attachmentsToSend.length === 0) || isSending || !activeId) return;

    setIsSending(true);
    const clientMessageId = window.crypto?.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticMessage = createOptimisticMessage({
      clientMessageId,
      conversationId: activeId,
      user,
      body: textToSend,
      attachments: attachmentsToSend
    });

    setMessages((prev) => [...prev, optimisticMessage]);
    const optimisticThreadUpdate = {
      last_message: textToSend || (attachmentsToSend.length ? "[Attachment]" : "New message"),
      last_message_at: optimisticMessage.createdAt
    };
    setThreads((prev) => {
      const threadIndex = prev.findIndex((t) => String(t._id) === String(activeId));
      if (threadIndex === -1) return prev;
      const targetThread = prev[threadIndex];
      const updatedThread = { ...targetThread, ...optimisticThreadUpdate };
      const nextThreads = [...prev];
      nextThreads.splice(threadIndex, 1);
      return [updatedThread, ...nextThreads];
    });
    try {
      const sendPayload = {
        conversationId: activeId,
        body: textToSend,
        attachments: attachmentsToSend,
        client_message_id: clientMessageId,
        token: typeof window !== "undefined" ? localStorage.getItem("token") : null
      };

      const newMsg = await sendMessageWithFallback({
        socket: socketRef.current,
        activeId,
        payload: sendPayload
      });

      setMessages((prev) => mergeMessageIntoList(prev, newMsg));
      setThreads((prev) => {
        const threadIndex = prev.findIndex((t) => String(t._id) === String(activeId));
        if (threadIndex === -1) return prev;
        const targetThread = prev[threadIndex];
        const updatedThread = {
          ...targetThread,
          last_message: newMsg.body || (attachmentsToSend.length ? "[Attachment]" : "New message"),
          last_message_at: newMsg.createdAt || optimisticMessage.createdAt
        };
        const nextThreads = [...prev];
        nextThreads.splice(threadIndex, 1);
        return [updatedThread, ...nextThreads];
      });

      if (overrideBody === null) setDraft("");
      setAttachmentUrl("");
      setShowAttachmentInput(false);
      
      socketRef.current?.emit("typing:stop", activeId);
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item.client_message_id !== clientMessageId && item._id !== clientMessageId));
      if (overrideBody === null) setDraft(textToSend);
      notify(err.response?.data?.message || "Could not send message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (!socketRef.current || !activeId) return;
    socketRef.current.emit("typing:start", activeId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", activeId);
    }, 1200);
  };

  const selectThread = (threadId) => {
    setActiveId(threadId);
    navigate(`${basePath}/${threadId}`);
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const badge = getCodeBadge(t);
      if (activeTab !== "all" && badge.type !== activeTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const customerName = (t.customer_id?.full_name || t.customer_id?.email || "").toLowerCase();
      const managerName = (t.event_manager_id?.full_name || "").toLowerCase();
      const title = getConversationTitle(t, user).toLowerCase();
      const code = badge.text.toLowerCase();

      return customerName.includes(q) || managerName.includes(q) || title.includes(q) || code.includes(q);
    });
  }, [threads, activeTab, searchQuery, user]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg) => {
      const dateHeader = formatDateHeader(msg.createdAt);
      if (!currentGroup || currentGroup.dateHeader !== dateHeader) {
        currentGroup = { dateHeader, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(msg);
    });

    return groups;
  }, [messages]);

  const activeCustomer = activeConversation?.customer_id;
  const activeBooking = activeConversation?.booking_id;
  const activeInquiry = activeConversation?.inquiry_id;

  const chatHeaderAvatarName = isCustomerRole
    ? (activeConversation?.event_manager_id?.full_name || "Caezelle Support")
    : (activeCustomer?.full_name || activeCustomer?.email || "Support");

  const chatHeaderSubtitle = isCustomerRole
    ? (activeConversation?.event_manager_id?.full_name ? `Event Manager: ${activeConversation.event_manager_id.full_name}` : "Caezelle's Support Team")
    : (activeCustomer?.full_name || activeCustomer?.email || "Customer");

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full bg-white flex flex-col md:flex-row font-sans antialiased overflow-hidden">
      {/* LEFT PANE: Thread List */}
      <div className={cn(
        "w-full md:w-80 lg:w-88 border-r border-slate-200 flex flex-col bg-white shrink-0 transition-all",
        activeId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3.5 px-4 border-b border-slate-200 space-y-2.5 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#2C4B8A]" />
              Inbox
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
              {threads.length} {threads.length === 1 ? "chat" : "chats"}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100/80 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200 outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-md border border-slate-200/60 text-xs font-medium overflow-x-auto [scrollbar-width:none]">
            {["all", "event", "inquiry", "support"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-1 px-2.5 rounded text-[11px] capitalize transition-colors whitespace-nowrap text-center cursor-pointer",
                  activeTab === tab 
                    ? "bg-white text-slate-900 font-bold shadow-2xs" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 divide-y divide-slate-100">
          {isLoadingThreads && (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading conversations...</div>
          )}

          {!isLoadingThreads && filteredThreads.length === 0 && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
              <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No conversations found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try resetting your search filter.</p>
            </div>
          )}

          {filteredThreads.map((thread) => {
            const isSelected = thread._id === activeId;
            const badge = getCodeBadge(thread);
            const title = getConversationTitle(thread, user);
            const avatarName = getThreadAvatarName(thread, user);
            const subtitle = getThreadSubtitle(thread, user);
            const isUnread = isCustomerRole ? thread.unread_customer_count > 0 : thread.unread_admin_count > 0;

            return (
              <div
                key={thread._id}
                onClick={() => selectThread(thread._id)}
                className={cn(
                  "p-3 px-4 flex items-start gap-3 cursor-pointer transition-colors border-b border-slate-100 relative group",
                  isSelected 
                    ? "bg-slate-100/90 border-l-2 border-[#2C4B8A] text-slate-900" 
                    : "hover:bg-slate-50 text-slate-700",
                  isUnread && "font-semibold"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] border border-[#2C4B8A]/20 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {getInitials(avatarName)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 truncate">{title}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatTime(thread.last_message_at || thread.updatedAt)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {subtitle}
                  </div>

                  <p className="text-xs text-slate-500 truncate mt-1">
                    {thread.last_message || "No messages yet"}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1">
                    <span className="text-[10px] py-0.5 px-1.5 font-mono rounded bg-slate-100 text-slate-600 border border-slate-200/80 font-semibold">
                      {badge.text}
                    </span>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#2C4B8A]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>

      {/* MIDDLE PANE: Active Chat feed */}
      {activeId ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header */}
          <div className="h-14 px-5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setActiveId(null); navigate(basePath); }}
                className="md:hidden text-slate-500 h-8 w-8 -ml-2"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Button>

              <div className="w-8 h-8 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] border border-[#2C4B8A]/20 font-bold flex items-center justify-center text-xs shrink-0">
                {getInitials(chatHeaderAvatarName)}
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 truncate leading-tight font-sans">
                  {getConversationTitle(activeConversation, user)}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="truncate">{chatHeaderSubtitle}</span>
                  {!isCustomerRole && activeCustomer?.phone && <span>· {activeCustomer.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailsPane(!showDetailsPane)}
                className="hidden lg:flex gap-1.5 text-xs h-8 rounded-md border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <Info className="w-3.5 h-3.5 text-slate-500" />
                {showDetailsPane ? "Hide Info" : "View Context"}
              </Button>
            </div>
          </div>

          {/* Customer Top Booking Banner Context */}
          {isCustomerRole && activeBooking && (
            <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs min-w-0">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-semibold text-slate-900 truncate">
                  {activeBooking.event_type} — {activeBooking.event_date ? new Date(activeBooking.event_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Upcoming Event"}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold shrink-0">
                  {activeBooking.status}
                </span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigate(`/customer/bookings/${activeBooking._id}`)}
                className="text-[#2C4B8A] text-xs font-semibold shrink-0 gap-1 hover:bg-slate-100 cursor-pointer"
              >
                Booking Details <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Messages Stream */}
          <ScrollArea className="flex-1 p-5 sm:p-6 bg-white">
            <div className="space-y-5 max-w-3xl mx-auto pb-4">
              {isLoadingMessages && (
                <div className="text-center text-xs text-slate-400 py-8 animate-pulse">
                  Loading chat history...
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="font-sans font-bold text-sm text-slate-900">Start the Conversation</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Type a message below to communicate directly with your team.
                  </p>
                </div>
              )}

              {groupedMessages.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  {/* Date Divider */}
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">
                      {group.dateHeader}
                    </span>
                  </div>

                  {group.items.map((msg) => {
                    const isMe = msg.sender_id?._id === user?._id;
                    const senderRole = msg.sender_id?.role || "user";
                    const senderName = msg.sender_id?.full_name || msg.sender_id?.email || "User";

                    return (
                      <div
                        key={msg._id}
                        className={cn("flex items-end gap-2.5 group", isMe ? "justify-end" : "justify-start")}
                      >
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200/60 mb-1">
                            {getInitials(senderName)}
                          </div>
                        )}

                        <div className={cn("flex flex-col max-w-[78%]", isMe ? "items-end" : "items-start")}>
                          {!isMe && (
                            <span className="text-[11px] font-semibold text-slate-500 mb-1 ml-0.5 capitalize">
                              {senderName} ({senderRole === "admin" ? "Support" : senderRole})
                            </span>
                          )}

                          <div
                            className={cn(
                              "px-4 py-2.5 rounded-md text-xs sm:text-sm whitespace-pre-wrap wrap-break-word leading-relaxed",
                              isMe
                                ? "bg-[#2C4B8A] text-white shadow-2xs font-normal"
                                : "bg-slate-100 border border-slate-200/60 text-slate-900 shadow-2xs font-normal"
                            )}
                          >
                            {msg.body}

                            {/* Attachments */}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="mt-2.5 space-y-1 border-t border-slate-200/40 pt-2">
                                {msg.attachments.map((att, aIdx) => (
                                  <a
                                    key={aIdx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 rounded bg-white/20 hover:bg-white/40 transition text-xs font-medium underline truncate"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{att.fileName || att.url}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-0.5">
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs italic text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md w-fit">
                  <span>{typingUsers.map((u) => u.name).join(", ")} is typing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#2C4B8A]/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#2C4B8A]/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#2C4B8A]/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Replies Bar for Admin / Manager */}
          {!isCustomerRole && (
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/60 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  if (!activeId || isAiDrafting) return;
                  setIsAiDrafting(true);
                  try {
                    const res = await getZelleResponseDraft({
                      conversation_id: activeId,
                      intent_notes: "Answer customer inquiry politely and provide helpful catering next steps",
                    });
                    if (res?.draft) {
                      setAiDraft(res.draft);
                    }
                  } catch (e) {
                    notify("Failed to generate AI response draft.", "error");
                  } finally {
                    setIsAiDrafting(false);
                  }
                }}
                disabled={isAiDrafting || !activeId}
                className="text-xs h-7 rounded-md bg-white border-amber-300 text-amber-800 hover:bg-amber-50 shrink-0 font-medium cursor-pointer"
              >
                <Sparkles className={cn("w-3.5 h-3.5 text-amber-500 mr-1", isAiDrafting && "animate-spin")} />
                {isAiDrafting ? "Drafting with Zelle..." : "Draft with Zelle"}
              </Button>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 ml-2">
                Quick Reply:
              </span>
              {QUICK_REPLIES.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(reply)}
                  disabled={isSending}
                  className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors border border-slate-200 cursor-pointer"
                >
                  {reply.length > 35 ? reply.slice(0, 35) + "..." : reply}
                </button>
              ))}
            </div>
          )}

          {/* AI Response Draft Banner */}
          {aiDraft && (
            <div className="px-4 py-3 bg-amber-50/80 border-t border-amber-200 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Zelle AI Suggested Response Draft:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    className="h-6 text-[11px] bg-amber-600 hover:bg-amber-700 text-white rounded-md cursor-pointer"
                    onClick={() => {
                      setDraft(aiDraft);
                      setAiDraft(null);
                    }}
                  >
                    Insert into Message Box
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                    onClick={() => setAiDraft(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-800 whitespace-pre-wrap bg-white p-2.5 rounded-md border border-amber-200/80 leading-relaxed font-sans">
                {aiDraft}
              </p>
            </div>
          )}

          {/* Attachment Input Overlay */}
          {showAttachmentInput && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <Input
                placeholder="Enter document / image URL..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="h-8 text-xs bg-white flex-1 rounded-md border-slate-200"
              />
              <Button size="xs" variant="ghost" onClick={() => setShowAttachmentInput(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Modern Bottom Composer */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="max-w-3xl mx-auto rounded-md border border-slate-200 bg-white p-3 shadow-2xs focus-within:border-slate-400 transition-all space-y-2"
            >
              <textarea
                className="w-full resize-none bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none min-h-12 max-h-32 leading-relaxed"
                placeholder="Type a message... (Press Enter to send, Shift+Enter for newline)"
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
              />

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Attach URL link"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-slate-400 hidden sm:inline ml-1">
                    💬 Catering Coordination
                  </span>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSending || (!draft.trim() && !attachmentUrl.trim())}
                  className={cn(
                    "h-7 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs",
                    draft.trim() || attachmentUrl.trim()
                      ? "bg-[#2C4B8A] hover:bg-[#1E3563] text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/30">
          <MessageSquare className="w-10 h-10 opacity-20 mb-3" />
          <h3 className="font-sans font-bold text-base text-slate-900">No Conversation Selected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Choose a conversation thread from the list on the left to start messaging.
          </p>
        </div>
      )}

      {/* RIGHT PANE: Linked Context Drawer (for Admin/Manager or when toggled) */}
      {activeId && showDetailsPane && (
        <div className="hidden lg:flex w-80 border-l border-slate-200 bg-slate-50/40 flex-col p-4 space-y-4 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#2C4B8A]" /> Context Details
            </h4>
          </div>

          {/* Customer Info Card */}
          {activeCustomer && (
            <div className="p-4 bg-white rounded-md border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] border border-[#2C4B8A]/20 font-bold flex items-center justify-center text-xs shrink-0">
                  {getInitials(activeCustomer.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 truncate">{activeCustomer.full_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{activeCustomer.email}</p>
                </div>
              </div>
              {activeCustomer.phone && (
                <p className="text-xs text-slate-600 pt-1.5 border-t border-slate-100">
                  📞 {activeCustomer.phone}
                </p>
              )}
            </div>
          )}

          {/* Linked Booking Card */}
          {activeBooking && (
            <div className="p-4 bg-white rounded-md border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                  EVT-{activeBooking.booking_number || activeBooking._id.slice(-6).toUpperCase()}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C4B8A]">
                  {activeBooking.status}
                </span>
              </div>

              <div>
                <p className="font-sans font-bold text-sm text-slate-900">{activeBooking.event_type}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {activeBooking.event_date ? new Date(activeBooking.event_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "N/A"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Guests</span>
                  <span className="font-semibold text-slate-900">{activeBooking.guests || 0} pax</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Venue</span>
                  <span className="font-semibold text-slate-900 truncate block">{activeBooking.venue || "N/A"}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(isCustomerRole ? `/customer/bookings/${activeBooking._id}` : `/admin/bookings/${activeBooking._id}/details`)}
                className="w-full text-xs h-8 gap-1.5 mt-1 rounded-md border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                View Booking <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Linked Inquiry Card */}
          {activeInquiry && !activeBooking && (
            <div className="p-4 bg-white rounded-md border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                  INQ-{activeInquiry.inquiry_number || activeInquiry._id.slice(-6).toUpperCase()}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {activeInquiry.status}
                </span>
              </div>

              <div>
                <p className="font-sans font-bold text-sm text-slate-900">{activeInquiry.event_type || "Event Inquiry"}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {activeInquiry.event_date ? new Date(activeInquiry.event_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "N/A"}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(isCustomerRole ? "/customer/inquiries" : "/admin/bookings/inquiries")}
                className="w-full text-xs h-8 gap-1.5 mt-1 rounded-md border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Manage Inquiries <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
