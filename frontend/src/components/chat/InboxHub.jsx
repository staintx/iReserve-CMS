import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import useToast from "../../hooks/useToast";
import { listConversations, getConversation, getMessages, sendMessage, markConversationAsRead, uploadMessageAttachment } from "../../api/messages";
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
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  MapPin,
  Users,
  Check,
  Image as ImageIcon,
  Link2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import StatusBadge from "../admin/ui/Badge";
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

const formatDateFull = (dateString) => {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const getInitials = (nameStr) => {
  const parts = String(nameStr || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDisplayUrl = (rawUrl) => {
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname !== "/" ? parsed.pathname : "";
    const full = `${host}${path}`;
    return full.length > 42 ? `${full.slice(0, 42)}…` : full;
  } catch {
    return rawUrl.length > 42 ? `${rawUrl.slice(0, 42)}…` : rawUrl;
  }
};

const isImageUrl = (url, fileType) => {
  if (fileType === "image") return true;
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("blob:") || url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url) || (url.includes("cloudinary.com") && !url.endsWith(".pdf"));
};

function MessageImageAttachment({ attachment, isMe = false }) {
  const [status, setStatus] = useState("loading"); // "loading" | "loaded" | "error"
  const imgRef = useRef(null);

  useEffect(() => {
    if (attachment.uploadFailed) {
      setStatus("error");
      return;
    }

    if (!attachment?.url) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    // Check if image is already cached/completed in browser
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    }
  }, [attachment.url, attachment.uploadFailed]);

  const handleRetry = (e) => {
    e.stopPropagation();
    setStatus("loading");
    if (imgRef.current) {
      const currentSrc = imgRef.current.src;
      imgRef.current.src = "";
      imgRef.current.src = currentSrc;
    }
  };

  const handleOpen = () => {
    if (attachment.url && !attachment.isUploading && !attachment.uploadFailed) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    }
  };

  if (status === "error" || attachment.uploadFailed) {
    return (
      <div
        className={cn(
          "p-3 rounded-xl border flex flex-col gap-2 max-w-[280px] sm:max-w-sm text-xs leading-normal",
          isMe
            ? "bg-white/10 border-white/20 text-white"
            : "bg-rose-50/80 border-rose-200/90 text-rose-900"
        )}
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className={cn("w-4 h-4 shrink-0", isMe ? "text-rose-200" : "text-rose-600")} />
          <span className="truncate">
            {attachment.uploadFailed ? "Image upload failed" : "Image failed to load"}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center justify-between text-[11px] pt-1.5 border-t",
            isMe ? "border-white/15" : "border-rose-200/60"
          )}
        >
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              "font-medium cursor-pointer underline hover:opacity-85 transition-opacity",
              isMe ? "text-white" : "text-[#4C81E0]"
            )}
          >
            Retry
          </button>
          {attachment.url && !attachment.uploadFailed && (
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 hover:underline text-[11px] transition-opacity",
                isMe ? "text-white/90 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Open Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleOpen}
      className={cn(
        "relative rounded-xl overflow-hidden max-w-[280px] sm:max-w-sm select-none transition-shadow",
        isMe ? "border border-white/20 bg-black/10" : "border border-slate-200/80 bg-slate-100",
        status === "loaded" && !attachment.isUploading ? "cursor-pointer hover:shadow-md group" : ""
      )}
      title={attachment.fileName || "Image attachment"}
    >
      {/* Loading Skeleton / Placeholder: shown while loading, but NEVER hides img with display:none */}
      {status === "loading" && !attachment.isUploading && (
        <div className="w-56 h-40 sm:w-64 sm:h-44 flex flex-col items-center justify-center bg-slate-100/90 text-slate-400 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-[#4C81E0] mb-2" />
          <span className="text-[11px] font-mono text-slate-500">Loading image...</span>
        </div>
      )}

      {/* Image element: ALWAYS in the DOM layout so the browser engine downloads it immediately */}
      <img
        ref={imgRef}
        src={attachment.url}
        alt={attachment.fileName || "Message attachment"}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={cn(
          "w-auto max-h-72 object-contain rounded-xl transition-all duration-200",
          status === "loaded" ? "opacity-100 block" : "opacity-0 absolute inset-0 w-full h-full pointer-events-none"
        )}
      />

      {/* Hover overlay hint on loaded image */}
      {status === "loaded" && !attachment.isUploading && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[11px] font-medium px-2 py-1 rounded-md backdrop-blur-xs flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>View full image</span>
          </span>
        </div>
      )}

      {/* Uploading State Overlay: keeps local preview visible while showing upload indicator */}
      {attachment.isUploading && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white p-3">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold tracking-wide text-white drop-shadow-xs">Uploading image...</span>
            {attachment.fileName && (
              <span className="text-[10px] text-white/80 truncate max-w-[180px] drop-shadow-xs">
                {attachment.fileName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function renderMessageBody(text, isMe) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline font-medium break-all hover:opacity-90 inline-flex items-center gap-0.5",
            isMe ? "text-blue-100 hover:text-white" : "text-[#4C81E0] hover:text-[#3b6ec9]"
          )}
          title={part}
        >
          <span>{formatDisplayUrl(part)}</span>
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>
      );
    }
    return part;
  });
}


const getRecordInfo = (conv) => {
  if (!conv) {
    return {
      type: "support",
      label: "SUPPORT",
      id: "Direct",
      formatted: "SUPPORT · Direct",
      status: "Active"
    };
  }
  if (conv.booking_id) {
    const b = conv.booking_id;
    const ref = b.reference || b.booking_number;
    const rawId = ref || (b._id ? String(b._id).slice(-6).toUpperCase() : "");
    const idStr = rawId.startsWith("BK-") || rawId.startsWith("CAZ-") || rawId.startsWith("EVT-") ? rawId : `CAZ-${rawId}`;
    return {
      type: "event",
      label: "EVENT",
      id: idStr,
      formatted: `EVENT · ${idStr}`,
      status: b.status || "Ready for Event"
    };
  }
  if (conv.inquiry_id) {
    const inq = conv.inquiry_id;
    const ref = inq.reference || inq.inquiry_number;
    const rawId = ref || (inq._id ? String(inq._id).slice(-6).toUpperCase() : "");
    const idStr = rawId.startsWith("INQ-") ? rawId : `INQ-${rawId}`;
    return {
      type: "inquiry",
      label: "INQUIRY",
      id: idStr,
      formatted: `INQUIRY · ${idStr}`,
      status: inq.status || "Under Review"
    };
  }
  return {
    type: "support",
    label: "SUPPORT",
    id: "Direct",
    formatted: "SUPPORT · Direct",
    status: "Active"
  };
};

const getConversationTitle = (conv, currentUser) => {
  if (!conv) return "Conversation";
  if (conv.booking_id?.event_type) {
    return conv.booking_id.event_type;
  }
  if (conv.inquiry_id?.event_type) {
    return `${conv.inquiry_id.event_type} Inquiry`;
  }
  if (currentUser?.role === "customer") {
    return conv.event_manager_id?.full_name || "Caezelle Event Support";
  }
  return conv.customer_id?.full_name || conv.customer_id?.email || "Support Chat";
};

const getCustomerName = (conv, currentUser) => {
  if (!conv) {
    return currentUser?.role === "customer" ? "Caezelle Support Team" : "Guest Customer";
  }
  if (currentUser?.role === "customer") {
    return conv.event_manager_id?.full_name ? `Event Manager: ${conv.event_manager_id.full_name}` : "Caezelle Support Team";
  }
  return conv.customer_id?.full_name || conv.customer_id?.email || "Guest Customer";
};

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "event", label: "Events" },
  { id: "inquiry", label: "Inquiries" },
  { id: "support", label: "Support" },
];

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
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validMimes.includes(file.type)) {
      notify("Please select a valid image file (JPG, PNG, GIF, WEBP).", "error");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      notify("Image size must be less than 15MB.", "error");
      return;
    }

    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({
      file,
      previewUrl,
      fileName: file.name,
      fileSize: file.size
    });
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          if (file.size > 15 * 1024 * 1024) {
            notify("Pasted image exceeds 15MB limit.", "error");
            return;
          }
          if (pendingImage?.previewUrl) {
            URL.revokeObjectURL(pendingImage.previewUrl);
          }
          const previewUrl = URL.createObjectURL(file);
          setPendingImage({
            file,
            previewUrl,
            fileName: file.name || "pasted-image.png",
            fileSize: file.size
          });
          break;
        }
      }
    }
  };

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
  const scrollContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const activeIdRef = useRef(activeId);
  const pendingThreadFetchRef = useRef(new Set());

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    isAtBottomRef.current = true;
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    isAtBottomRef.current = atBottom;
    if (atBottom && showScrollBottomBtn) {
      setShowScrollBottomBtn(false);
    }
  };

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
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
    setAttachmentUrl("");
    setShowLinkInput(false);

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
        isAtBottomRef.current = true;
        setShowScrollBottomBtn(false);

        // Initial conversation load -> scroll to latest
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom("auto");
          }, 30);
        });

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
          setMessages((prev) => {
            if (
              prev.length === fetchedMsgs.length &&
              prev[prev.length - 1]?._id === fetchedMsgs[fetchedMsgs.length - 1]?._id
            ) {
              return prev;
            }
            return mergeMessageLists(prev, fetchedMsgs, activeId);
          });
        }
        if (fetchedThreads && Array.isArray(fetchedThreads)) {
          setThreads(fetchedThreads);
        }
      } catch {
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

        if (isAtBottomRef.current) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              scrollToBottom("smooth");
            }, 30);
          });
        } else {
          setShowScrollBottomBtn(true);
        }
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
    const hasImage = Boolean(pendingImage?.file && pendingImage?.previewUrl);
    const hasLink = Boolean(attachmentUrl.trim());

    if ((!textToSend && !hasImage && !hasLink) || isSending || !activeId) return;

    // 1. Prepare link attachment if present
    const linkAttachments = [];
    if (hasLink) {
      const raw = attachmentUrl.trim();
      const validUrl = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
      linkAttachments.push({
        url: validUrl,
        fileName: formatDisplayUrl(validUrl),
        fileType: "link"
      });
    }

    // 2. Prepare initial optimistic attachments: local image preview with isUploading: true
    const imageToUpload = pendingImage;
    const initialAttachments = [...linkAttachments];
    if (hasImage) {
      initialAttachments.push({
        url: imageToUpload.previewUrl,
        fileName: imageToUpload.fileName,
        fileType: "image",
        size: imageToUpload.fileSize,
        isUploading: true
      });
    }

    const clientMessageId = window.crypto?.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticMessage = createOptimisticMessage({
      clientMessageId,
      conversationId: activeId,
      user,
      body: textToSend,
      attachments: initialAttachments
    });

    // 3. Immediately display message in conversation — perceived performance is instant!
    setMessages((prev) => [...prev, optimisticMessage]);

    // Reset composer state immediately so conversation feels fast and responsive
    if (overrideBody === null) setDraft("");
    setAttachmentUrl("");
    setShowLinkInput(false);
    // Clear pending image from composer bar, but DO NOT revoke previewUrl yet!
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 30);
    });

    const threadSnippet = textToSend || (hasImage ? "[Image]" : (hasLink ? "[Link]" : "New message"));
    setThreads((prev) => {
      const threadIndex = prev.findIndex((t) => String(t._id) === String(activeId));
      if (threadIndex === -1) return prev;
      const targetThread = prev[threadIndex];
      const updatedThread = {
        ...targetThread,
        last_message: threadSnippet,
        last_message_at: optimisticMessage.createdAt
      };
      const nextThreads = [...prev];
      nextThreads.splice(threadIndex, 1);
      return [updatedThread, ...nextThreads];
    });

    setIsSending(true);

    try {
      let finalAttachments = [...linkAttachments];

      // 4. Upload image if present
      if (hasImage) {
        setIsUploadingAttachment(true);
        try {
          const uploaded = await uploadMessageAttachment(activeId, imageToUpload.file);
          if (!uploaded?.url) {
            throw new Error("Invalid attachment upload response");
          }
          finalAttachments.push({
            url: uploaded.url,
            fileName: uploaded.fileName || imageToUpload.fileName,
            fileType: "image",
            size: uploaded.size || imageToUpload.fileSize,
            isUploading: false
          });
        } catch (uploadErr) {
          // Mark optimistic image attachment as uploadFailed: true
          setMessages((prev) =>
            prev.map((msg) =>
              msg.client_message_id === clientMessageId
                ? {
                    ...msg,
                    attachments: (msg.attachments || []).map((att) =>
                      att.fileType === "image" ? { ...att, isUploading: false, uploadFailed: true } : att
                    )
                  }
                : msg
            )
          );
          notify(uploadErr.response?.data?.message || "Failed to upload image. Please try again.", "error");
          setIsUploadingAttachment(false);
          setIsSending(false);
          return;
        } finally {
          setIsUploadingAttachment(false);
        }
      }

      // 5. Send message payload with confirmed permanent attachment URL
      const sendPayload = {
        conversationId: activeId,
        body: textToSend,
        attachments: finalAttachments,
        client_message_id: clientMessageId,
        token: typeof window !== "undefined" ? localStorage.getItem("token") : null
      };

      const newMsg = await sendMessageWithFallback({
        socket: socketRef.current,
        activeId,
        payload: sendPayload
      });

      // 6. Merge server-confirmed message
      setMessages((prev) => mergeMessageIntoList(prev, newMsg));
      setThreads((prev) => {
        const threadIndex = prev.findIndex((t) => String(t._id) === String(activeId));
        if (threadIndex === -1) return prev;
        const targetThread = prev[threadIndex];
        const updatedThread = {
          ...targetThread,
          last_message: newMsg.body || (finalAttachments.length ? (finalAttachments[0].fileType === "image" ? "[Image]" : "[Link]") : "New message"),
          last_message_at: newMsg.createdAt || optimisticMessage.createdAt
        };
        const nextThreads = [...prev];
        nextThreads.splice(threadIndex, 1);
        return [updatedThread, ...nextThreads];
      });

      // Safely revoke preview URL after brief delay to avoid any rendering race
      if (imageToUpload?.previewUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(imageToUpload.previewUrl);
          } catch {}
        }, 3000);
      }

      socketRef.current?.emit("typing:stop", activeId);
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item.client_message_id !== clientMessageId && item._id !== clientMessageId));
      if (overrideBody === null) setDraft(textToSend);
      notify(err.response?.data?.message || "Could not send message.", "error");
    } finally {
      setIsSending(false);
      setIsUploadingAttachment(false);
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

  const selectedThread = useMemo(() => {
    if (!activeId || !Array.isArray(threads)) return null;
    return threads.find((t) => t && String(t._id) === String(activeId)) || null;
  }, [threads, activeId]);

  const totalUnreadCount = useMemo(() => {
    if (!Array.isArray(threads)) return 0;
    return threads.reduce((acc, t) => {
      if (!t) return acc;
      const count = isCustomerRole ? (t.unread_customer_count || 0) : (t.unread_admin_count || 0);
      return acc + (count > 0 ? 1 : 0);
    }, 0);
  }, [threads, isCustomerRole]);

  const filteredThreads = useMemo(() => {
    if (!Array.isArray(threads)) return [];
    return threads.filter((t) => {
      if (!t) return false;
      const record = getRecordInfo(t);
      const isUnread = isCustomerRole ? (t.unread_customer_count > 0) : (t.unread_admin_count > 0);

      if (activeTab === "unread") {
        if (!isUnread) return false;
      } else if (activeTab === "event") {
        if (record.type !== "event" && t.type !== "event" && !t.booking_id) return false;
      } else if (activeTab === "inquiry") {
        if (record.type !== "inquiry" && t.type !== "inquiry" && !t.inquiry_id) return false;
      } else if (activeTab === "support") {
        if (record.type !== "support" && t.type !== "support" && (t.booking_id || t.inquiry_id)) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const customerName = (t.customer_id?.full_name || t.customer_id?.email || "").toLowerCase();
      const managerName = (t.event_manager_id?.full_name || "").toLowerCase();
      const title = getConversationTitle(t, user).toLowerCase();
      const recordText = record.formatted.toLowerCase();
      const lastMsg = (t.last_message || "").toLowerCase();

      return customerName.includes(q) || managerName.includes(q) || title.includes(q) || recordText.includes(q) || lastMsg.includes(q);
    });
  }, [threads, activeTab, searchQuery, user, isCustomerRole]);

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

  const currentConversation = activeConversation || selectedThread;
  const activeCustomer = currentConversation?.customer_id;
  const activeBooking = currentConversation?.booking_id;
  const activeInquiry = currentConversation?.inquiry_id;
  const activeRecord = getRecordInfo(currentConversation);

  const headerEventTitle = currentConversation ? getConversationTitle(currentConversation, user) : (isLoadingMessages ? "Loading..." : "Conversation");
  const headerCustomerName = currentConversation ? getCustomerName(currentConversation, user) : (isLoadingMessages ? "Loading customer..." : (isCustomerRole ? "Caezelle Support Team" : "Guest Customer"));
  const headerCustomerContact = !isCustomerRole ? (activeCustomer?.phone || activeCustomer?.email || null) : null;

  const handleZelleDraft = async () => {
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
    } catch {
      notify("Failed to generate AI response draft.", "error");
    } finally {
      setIsAiDrafting(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex-1 w-full bg-white flex flex-col md:flex-row font-sans antialiased overflow-hidden">
      {/* LEFT PANE: Thread List */}
      <div className={cn(
        "w-full border-r border-slate-200 flex flex-col min-h-0 bg-white shrink-0 transition-all duration-200",
        showDetailsPane ? "md:w-72 lg:w-80 xl:w-84" : "md:w-80 lg:w-88 xl:w-96",
        activeId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 px-3.5 border-b border-slate-200 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-[#4C81E0]" />
              Inbox
            </h2>
            <span className="text-[11px] text-slate-400 font-mono font-medium">
              {threads.length} {threads.length === 1 ? "chat" : "chats"}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200/90 outline-none transition-all focus:border-[#4C81E0]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-md border border-slate-200/70 text-xs font-medium overflow-x-auto [scrollbar-width:none]">
            {FILTER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap text-center cursor-pointer flex items-center justify-center gap-1",
                    isActive 
                      ? "bg-white text-slate-900 font-semibold shadow-2xs" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.id === "unread" && totalUnreadCount > 0 && (
                    <span className={cn(
                      "text-[9px] font-mono px-1 rounded-full leading-tight font-bold",
                      isActive ? "bg-[#4C81E0] text-white" : "bg-blue-100 text-[#4C81E0]"
                    )}>
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 divide-y divide-slate-100">
          {isLoadingThreads && (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse font-mono">
              Loading conversations...
            </div>
          )}

          {!isLoadingThreads && filteredThreads.length === 0 && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
              <MessageSquare className="w-7 h-7 opacity-30 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No conversations found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try resetting your search or filter tab.</p>
            </div>
          )}

          {filteredThreads.map((thread) => {
            if (!thread) return null;
            const isSelected = thread._id === activeId;
            const record = getRecordInfo(thread);
            const title = getConversationTitle(thread, user);
            const customerName = getCustomerName(thread, user);
            const isUnread = isCustomerRole ? (thread.unread_customer_count > 0) : (thread.unread_admin_count > 0);
            const unreadCount = isCustomerRole ? (thread.unread_customer_count || 0) : (thread.unread_admin_count || 0);

            return (
              <div
                key={thread._id}
                onClick={() => selectThread(thread._id)}
                className={cn(
                  "p-3 px-3.5 flex items-start gap-2.5 cursor-pointer transition-all border-b border-slate-100 relative group",
                  isSelected 
                    ? "bg-blue-50/50 border-l-[3px] border-[#4C81E0] text-slate-900" 
                    : "hover:bg-slate-50/80 text-slate-700 border-l-[3px] border-transparent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs border transition-colors",
                  isSelected 
                    ? "bg-[#4C81E0] text-white border-[#4C81E0]" 
                    : "bg-slate-100 text-slate-600 border-slate-200/80"
                )}>
                  {getInitials(customerName)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 1. Title / Subject + 4. Time */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={cn(
                      "text-xs truncate font-medium",
                      isUnread ? "font-bold text-slate-900" : isSelected ? "font-semibold text-slate-900" : "text-slate-800"
                    )}>
                      {title}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono shrink-0">
                      {formatTime(thread.last_message_at || thread.updatedAt)}
                    </span>
                  </div>

                  {/* 2. Customer Name */}
                  <div className={cn(
                    "text-[11px] truncate mt-0.5",
                    isUnread ? "font-semibold text-slate-700" : "text-slate-500"
                  )}>
                    {customerName}
                  </div>

                  {/* 3. Message preview (intentional truncation) */}
                  <p className={cn(
                    "text-xs truncate mt-0.5 max-w-[210px]",
                    isUnread ? "font-medium text-slate-900" : "text-slate-500"
                  )}>
                    {thread.last_message || "No messages yet"}
                  </p>

                  {/* 5. Related Record + Unread indicator */}
                  <div className="flex items-center justify-between mt-1 pt-0.5">
                    <span className="text-[10px] font-mono tracking-tight text-slate-400">
                      {record.formatted}
                    </span>
                    {isUnread && (
                      <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#4C81E0] text-white text-[9px] font-mono font-bold leading-none">
                        {unreadCount > 1 ? unreadCount : ""}
                      </span>
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
          {/* Active Conversation Header */}
          <div className="h-16 px-4 sm:px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setActiveId(null); navigate(basePath); }}
                className="md:hidden text-slate-500 h-8 w-8 -ml-1 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="w-9 h-9 rounded-full bg-[#4C81E0]/10 text-[#4C81E0] border border-[#4C81E0]/20 font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {getInitials(headerCustomerName)}
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                {/* 1. Strongest text: active conversation title + small colored status badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate leading-tight font-sans">
                    {headerEventTitle}
                  </h3>
                  {activeRecord?.status && (
                    <StatusBadge
                      status={activeRecord.status}
                      dot
                      className="text-[10px] py-0.5 px-2 leading-none shrink-0"
                    />
                  )}
                </div>

                {/* 2. Customer name = secondary, plus essential record identifier */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate leading-tight mt-0.5">
                  <span className="font-medium text-slate-700">{headerCustomerName}</span>
                  {activeRecord?.id && activeRecord.id !== "Direct" && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-[11px] text-slate-400">{activeRecord.id}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions: Primary action (View Booking/Inquiry) + Secondary control (Hide/Show Info) */}
            <div className="flex items-center gap-2 shrink-0">
              {activeBooking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(isCustomerRole ? `/customer/bookings/${activeBooking._id}` : `/admin/bookings/${activeBooking._id}/details`)}
                  className="text-xs h-8 px-3 rounded-md border-slate-200 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>View Booking</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Button>
              )}
              {!activeBooking && activeInquiry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(isCustomerRole ? "/customer/inquiries" : "/admin/bookings/inquiries")}
                  className="text-xs h-8 px-3 rounded-md border-slate-200 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>View Inquiry</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Button>
              )}

              {!showDetailsPane && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsPane(true)}
                  className="hidden lg:flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-md border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  title="Open Customer & Record Info panel"
                >
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer Info</span>
                </Button>
              )}
            </div>
          </div>

          {/* Messages Stream */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8 bg-white [scrollbar-width:thin] relative"
          >
            <div className="space-y-4 w-full pb-2">
              {isLoadingMessages && (
                <div className="text-center text-xs text-slate-400 py-8 animate-pulse font-mono">
                  Loading chat history...
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-[#4C81E0] flex items-center justify-center mb-2.5">
                    <MessageSquare className="w-5 h-5 text-[#4C81E0]" />
                  </div>
                  <p className="font-semibold text-sm text-slate-900">Start the Conversation</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Type a message below to communicate directly with the customer.
                  </p>
                </div>
              )}

              {groupedMessages.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3.5">
                  {/* Date Divider */}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200/80" />
                    </div>
                    <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400 font-mono tracking-wider uppercase">
                      {group.dateHeader}
                    </span>
                  </div>

                  {group.items.map((msg) => {
                    const isMe = msg.sender_id?._id === user?._id;
                    const isSenderAdmin = msg.sender_id?.role === "admin";
                    const senderName = msg.sender_id?.full_name || msg.sender_id?.email || (isSenderAdmin ? "Admin" : (activeCustomer?.full_name || "Customer"));

                    return (
                      <div
                        key={msg._id}
                        className={cn("flex items-end gap-2.5 group w-full", isMe ? "justify-end" : "justify-start")}
                      >
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-xs shrink-0 border border-slate-200/80 mb-1 shadow-2xs">
                            {getInitials(senderName)}
                          </div>
                        )}

                        <div className={cn("flex flex-col max-w-[85%] sm:max-w-[78%] lg:max-w-[72%]", isMe ? "items-end" : "items-start")}>
                          {!isMe && (
                            <div className="flex items-center gap-1.5 text-[11px] mb-1 ml-0.5">
                              <span className="font-semibold text-slate-800">{senderName}</span>
                              <span className={cn(
                                "text-[10px] px-1 rounded font-medium",
                                isSenderAdmin ? "bg-blue-50 text-[#4C81E0]" : "text-slate-400"
                              )}>
                                {isSenderAdmin ? "Admin" : "Customer"}
                              </span>
                            </div>
                          )}

                          <div
                            className={cn(
                              "rounded-2xl text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed shadow-2xs",
                              msg.body ? "px-4 py-2.5" : "p-2",
                              isMe
                                ? "rounded-br-xs bg-[#4C81E0] text-white font-normal"
                                : "rounded-tl-xs bg-slate-100/90 text-slate-900 border border-slate-200/60 font-normal"
                            )}
                          >
                            {renderMessageBody(msg.body, isMe)}

                            {/* Attachments */}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className={cn("space-y-1.5", msg.body ? (isMe ? "border-t border-white/20 pt-2 mt-2" : "border-t border-slate-200/80 pt-2 mt-2") : "")}>
                                {msg.attachments.map((att, aIdx) => {
                                  const isImg = isImageUrl(att.url, att.fileType);
                                  if (isImg) {
                                    return <MessageImageAttachment key={att._id || att.url || `att-${aIdx}`} attachment={att} isMe={isMe} />;
                                  }
                                  return (
                                    <a
                                      key={att._id || att.url || `att-${aIdx}`}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg transition text-xs font-medium max-w-sm truncate",
                                        isMe
                                          ? "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                                          : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs"
                                      )}
                                      title={att.url}
                                    >
                                      <Link2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                      <span className="truncate flex-1">{att.fileName || formatDisplayUrl(att.url)}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60 ml-auto" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1 font-mono">
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              <CheckCheck className="w-3 h-3 text-[#4C81E0]" />
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
                <div className="flex items-center gap-2 text-xs italic text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-md w-fit font-mono">
                  <span>{typingUsers.map((u) => u.name).join(", ")} is typing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#4C81E0]/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#4C81E0]/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#4C81E0]/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Floating Latest messages jump button when backreading */}
            {showScrollBottomBtn && (
              <button
                type="button"
                onClick={() => {
                  scrollToBottom("smooth");
                  setShowScrollBottomBtn(false);
                }}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 mx-auto z-10 px-3 py-1.5 bg-[#4C81E0] hover:bg-[#3b6ec9] text-white text-xs font-semibold rounded-full shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                <span>Latest messages</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sticky Bottom Composer */}
          <div className="border-t border-slate-200 bg-white shrink-0">
            {/* Suggestions bar (Zelle AI trigger + quick reply chips) */}
            {!isCustomerRole && (
              <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={handleZelleDraft}
                  disabled={isAiDrafting || !activeId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                  title="Generate a context-aware response draft using Zelle AI"
                >
                  <Sparkles className={cn("w-3.5 h-3.5 text-amber-600", isAiDrafting && "animate-spin")} />
                  <span>{isAiDrafting ? "Drafting with Zelle..." : "✦ Draft with Zelle"}</span>
                </button>

                <div className="h-3.5 w-px bg-slate-200 shrink-0 mx-1" />

                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 font-mono">
                  Quick:
                </span>

                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(reply)}
                    disabled={isSending}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-2xs font-normal"
                  >
                    {reply.length > 36 ? reply.slice(0, 36) + "…" : reply}
                  </button>
                ))}
              </div>
            )}

            {/* AI Response Draft Banner */}
            {aiDraft && (
              <div className="px-4 py-3 bg-amber-50/70 border-b border-amber-200/90 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Zelle AI Suggested Draft</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      className="h-6 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md cursor-pointer font-medium shadow-2xs"
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
                      className="h-6 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      onClick={() => setAiDraft(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-800 whitespace-pre-wrap bg-white p-2.5 rounded-md border border-amber-200/80 leading-relaxed font-sans shadow-2xs">
                  {aiDraft}
                </p>
              </div>
            )}

            {/* Attached Image Preview */}
            {pendingImage && (
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 shadow-2xs">
                    <img
                      src={pendingImage.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                      {pendingImage.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {(pendingImage.fileSize / 1024).toFixed(0)} KB · Ready to send
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isUploadingAttachment}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    title="Remove attached image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Attached Link Input Overlay */}
            {showLinkInput && (
              <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center gap-2 animate-fade-in">
                <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <Input
                  placeholder="Paste link URL (e.g. https://example.com/proposal)..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setShowLinkInput(false);
                    }
                  }}
                  className="h-7.5 text-xs bg-white flex-1 rounded-md border-slate-200 focus-visible:ring-[#4C81E0]"
                  autoFocus
                />
                {attachmentUrl && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setAttachmentUrl("")}
                    className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowLinkInput(false)}
                  className="h-7 w-7 p-0 cursor-pointer text-slate-400 hover:text-slate-700"
                  title="Close link input"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Link Attached Chip (when link input closed but link is set) */}
            {!showLinkInput && attachmentUrl.trim() && (
              <div className="px-4 py-1.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs animate-fade-in">
                <div className="flex items-center gap-1.5 min-w-0 text-[#4C81E0]">
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium truncate max-w-sm">{formatDisplayUrl(attachmentUrl)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLinkInput(true)}
                    className="text-[11px] text-[#4C81E0] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentUrl("")}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove link"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Composer Input Area */}
            <div className="p-3 sm:px-4 sm:py-3.5 bg-white">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white focus-within:bg-white focus-within:border-[#4C81E0] focus-within:ring-2 focus-within:ring-[#4C81E0]/15 transition-all p-3 shadow-2xs"
              >
                <textarea
                  className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none min-h-[58px] max-h-36 leading-relaxed px-1 font-sans"
                  placeholder="Type a message to customer... (Press Enter to send, Shift+Enter for newline)"
                  value={draft}
                  onChange={handleDraftChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                />

                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                        pendingImage
                          ? "bg-blue-50 text-[#4C81E0] border border-blue-200"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                      title="Attach an image (JPG, PNG, GIF, WEBP up to 15MB)"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                        showLinkInput || attachmentUrl.trim()
                          ? "bg-blue-50 text-[#4C81E0] border border-blue-200"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                      title="Attach a web link"
                    >
                      <Link2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Link</span>
                    </button>

                    <span className="text-[11px] text-slate-400 hidden lg:inline font-mono ml-2">
                      ↵ Enter to send · Shift+Enter for newline
                    </span>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSending || isUploadingAttachment || (!draft.trim() && !pendingImage && !attachmentUrl.trim())}
                    className={cn(
                      "h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs",
                      draft.trim() || pendingImage || attachmentUrl.trim()
                        ? "bg-[#4C81E0] hover:bg-[#3b6ec9] text-white"
                        : "bg-[#4C81E0]/40 text-white cursor-not-allowed hover:bg-[#4C81E0]/40 shadow-none"
                    )}
                  >
                    <span>{isUploadingAttachment ? "Uploading..." : isSending ? "Sending..." : "Send"}</span>
                    {isUploadingAttachment || isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/40">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 text-slate-500 shadow-2xs">
            <MessageSquare className="w-6 h-6 text-[#4C81E0]" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900">Select a Conversation</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Choose a customer chat or event inquiry from the inbox to reply.
          </p>
        </div>
      )}

      {/* RIGHT PANE: Customer Context */}
      {activeId && showDetailsPane && (
        <div className="hidden lg:flex w-72 xl:w-80 border-l border-slate-200 bg-white flex-col shrink-0 min-h-0 overflow-y-auto">
          {/* Panel Header */}
          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-600 font-mono flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#4C81E0]" />
              Customer &amp; Record Info
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetailsPane(false)}
              className="h-7 w-7 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Hide panel"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="p-4 space-y-4 text-xs divide-y divide-slate-100">
            {/* 1. CUSTOMER Section */}
            <div className="space-y-2 pt-1 first:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Customer
              </span>
              <div className="space-y-2 text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Email</span>
                  <p className="font-medium text-slate-800 break-all">{activeCustomer?.email || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Phone</span>
                  <p className="font-mono text-slate-800">{activeCustomer?.phone || "Not provided"}</p>
                </div>
                {!isCustomerRole && activeCustomer?._id && (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/customers?search=${encodeURIComponent(activeCustomer.email || activeCustomer.full_name || "")}`)}
                      className="w-full justify-between text-xs h-7.5 rounded-md border-slate-200 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      <span>View Customer Record</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. EVENT / RELATED RECORD Section */}
            {(activeBooking || activeInquiry || activeRecord?.id) && (
              <div className="space-y-2 pt-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Event / Related Record
                </span>
                <div className="space-y-2 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Event Date</span>
                    <p className="font-medium text-slate-800">
                      {activeBooking?.event_date
                        ? formatDateFull(activeBooking.event_date)
                        : activeInquiry?.event_date
                        ? formatDateFull(activeInquiry.event_date)
                        : "Not scheduled"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Record ID</span>
                    <p className="font-mono font-medium text-slate-800">{activeRecord.id}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Status</span>
                    <StatusBadge status={activeRecord.status} dot />
                  </div>
                  {activeBooking?.guests && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">Estimated Headcount</span>
                      <p className="font-mono font-medium text-slate-800">{activeBooking.guests} pax</p>
                    </div>
                  )}
                  {activeBooking?.venue && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">Venue / Location</span>
                      <p className="font-medium text-slate-800">{activeBooking.venue}</p>
                    </div>
                  )}
                  {activeBooking && (activeBooking.total_amount || activeBooking.total_price) && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">Total Amount</span>
                      <p className="font-mono font-bold text-slate-900 text-sm">
                        ₱{Number(activeBooking.total_amount || activeBooking.total_price).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
