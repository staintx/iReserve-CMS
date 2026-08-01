import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { listConversations } from "../../api/messages";
import useToast from "../../hooks/useToast";
import { MessageSquare, Clock, ChevronRight } from "lucide-react";

const getShortCode = (conversation) => {
  const sourceId = conversation?.booking_id?._id || conversation?.inquiry_id?._id || conversation?._id;
  if (!sourceId) return "";
  return sourceId.slice(-6).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

const getTitle = (conversation) => {
  if (conversation?.booking_id?.event_type) {
    return `${conversation.booking_id.event_type} - ${formatDate(conversation.booking_id.event_date)}`;
  }
  if (conversation?.inquiry_id?.event_type) {
    return `${conversation.inquiry_id.event_type} - ${formatDate(conversation.inquiry_id.event_date)}`;
  }
  return "Support Chat";
};

const getCode = (conversation) => {
  const code = getShortCode(conversation);
  if (!code) return "";
  if (conversation?.booking_id) return `EVT-${code}`;
  if (conversation?.inquiry_id) return `INQ-${code}`;
  return `CHAT-${code}`;
};

const getInitials = (conversation) => {
  const name = conversation?.manager_id?.full_name || "Caezelle's Support";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function CustomerMessages() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await listConversations();
        if (isMounted) setThreads(data || []);
      } catch (err) {
        notify(err.response?.data?.message || "We could not load your messages.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [notify]);

  return (
    <CustomerDashboardLayout
      title="Messages"
      subtitle="Communicate with Caezelle's Catering team"
    >
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {loading && (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading conversations...</div>
          )}
          {!loading && threads.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground">No conversations yet.</p>
              <p className="text-sm text-muted-foreground mt-1">When you book an event or make an inquiry, your chats will appear here.</p>
            </div>
          )}
          {threads.map((thread) => (
            <div
              key={thread._id}
              className="flex items-center justify-between p-4 sm:p-6 hover:bg-muted/30 cursor-pointer transition-colors group"
              onClick={() => navigate(`/customer/messages/${thread._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate(`/customer/messages/${thread._id}`);
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
                  {getInitials(thread)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground truncate">{getTitle(thread)}</h4>
                  <div className="text-sm text-foreground truncate">{thread.manager_id?.full_name || "Caezelle's Support"}</div>
                  <div className="text-sm text-muted-foreground truncate max-w-md mt-0.5">{thread.last_message || "No messages yet."}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-1 rounded-md">
                  <Clock className="w-3 h-3" />
                  {formatDate(thread.last_message_at || thread.updatedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">{getCode(thread)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
