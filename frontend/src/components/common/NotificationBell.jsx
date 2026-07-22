import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationAPI } from "../../api/notifications";
import { getSocket } from "../../api/socket";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await NotificationAPI.getMine({ limit: 10 });
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleNew = (notification) => {
      setItems((prev) => [notification, ...prev].slice(0, 10));
      setUnreadCount((count) => count + 1);
    };

    socket.on("notification:new", handleNew);
    return () => socket.off("notification:new", handleNew);
  }, []);

  const markRead = useCallback(async (notificationId) => {
    try {
      await NotificationAPI.markRead(notificationId);
      setItems((prev) => prev.map((item) => (
        item._id === notificationId ? { ...item, is_read: true } : item
      )));
      setUnreadCount((count) => Math.max(count - 1, 0));
    } catch {
      // silent
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await NotificationAPI.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const handleOpen = () => setOpen((current) => !current);

  const handleItemClick = async (notification) => {
    if (!notification.is_read) {
      await markRead(notification._id);
    }
    if (notification.link) {
      const state = { ...notification.meta };
      if (state.inquiry_id) state.openQuoteId = state.inquiry_id;
      if (state.booking_id) state.openBookingId = state.booking_id;
      
      navigate(notification.link, { state });
      setOpen(false);
    }
  };

  const empty = useMemo(() => items.length === 0, [items]);

  return (
    <div className="notification-shell">
      <button className="topbar-icon" type="button" aria-label="Notifications" onClick={handleOpen}>
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-header">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </div>
            <button type="button" className="notification-clear" onClick={markAllRead}>Mark all read</button>
          </div>
          <div className="notification-list">
            {empty && <div className="notification-empty">No notifications yet.</div>}
            {!empty && items.map((item) => (
              <button
                key={item._id}
                type="button"
                className={`notification-item ${item.is_read ? "" : "unread"}`}
                onClick={() => handleItemClick(item)}
              >
                <div>
                  <div className="notification-title">{item.title}</div>
                  <div className="notification-body">{item.body}</div>
                </div>
                <span className="notification-date">{formatDate(item.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
