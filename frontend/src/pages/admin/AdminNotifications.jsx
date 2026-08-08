import React, { useCallback, useEffect, useState } from "react";
import { Check, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { NotificationAPI } from "../../api/notifications";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await NotificationAPI.getMine({ page, limit: PAGE_SIZE });
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
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

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

        <AdminCard className="!p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-5 py-4 flex gap-3 hover:bg-muted transition-colors ${!item.is_read ? "bg-powder/40" : ""}`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {!item.is_read ? (
                      <Circle size={8} className="fill-primary text-primary" />
                    ) : (
                      <div className="w-2 h-2 rounded-full border border-border" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!item.is_read ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>{item.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                  </div>
                </button>
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
