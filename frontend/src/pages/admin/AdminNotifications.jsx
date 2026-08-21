import React, { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { NotificationAPI } from "../../api/notifications";
import { getSocket } from "../../api/socket";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getNotificationMeta, groupNotificationsByDay } from "../../components/common/notificationMeta";

const PAGE_SIZE = 20;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (filter === "unread") params.unread = "true";
      const { data } = await NotificationAPI.getMine(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setItems([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: refresh the list as soon as the server pushes a new
  // notification, so the admin never has to reload the page.
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleNew = () => load();

    socket.on("notification:new", handleNew);
    return () => socket.off("notification:new", handleNew);
  }, [load]);

  const changeFilter = (key) => {
    if (key === filter) return;
    setFilter(key);
    setPage(1);
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await NotificationAPI.markRead(item._id);
        setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, is_read: true } : i)));
        setUnreadCount((c) => Math.max(c - 1, 0));
      } catch {
        // silent
      }
    }
    if (item.link) navigate(item.link, { state: item.meta });
  };

  const markAllRead = async () => {
    try {
      await NotificationAPI.markAllRead();
      setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const startEntry = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(page * PAGE_SIZE, total);
  const groups = groupNotificationsByDay(items);

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-background min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground mt-1">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <Check size={13} /> Mark all read
          </Btn>
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={cn(
                "px-3.5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
                filter === f.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold align-middle">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <AdminCard className="!p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-9 h-9 mb-3 opacity-20" />
              <p className="text-sm font-medium">{filter === "unread" ? "No unread notifications." : "No notifications yet."}</p>
              <p className="text-xs mt-1 text-muted-foreground/70">You'll see updates here as they happen.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groups.map(([label, groupItems]) => (
                <div key={label}>
                  <div className="px-5 pt-3 pb-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {label}
                  </div>
                  {groupItems.map((item) => {
                    const meta = getNotificationMeta(item.type);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={item._id}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "w-full text-left px-5 py-4 flex gap-3 hover:bg-muted transition-colors border-b border-border last:border-b-0",
                          !item.is_read && "bg-powder/40"
                        )}
                      >
                        <div className={cn("mt-0.5 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full", meta.chipClass)}>
                          <Icon className={cn("w-4 h-4", meta.iconClass)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-sm", !item.is_read ? "font-bold text-foreground" : "font-semibold text-foreground/80")}>
                              {item.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(item.createdAt)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                        </div>
                        {!item.is_read && (
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
              <span>Showing {startEntry}–{endEntry} of {total}</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-semibold text-foreground">{page} / {pages}</span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
