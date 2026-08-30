import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { NotificationAPI } from "../../api/notifications";
import { getSocket } from "../../api/socket";
import { Bell, Check } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { getNotificationMeta, groupNotificationsByDay } from "./notificationMeta";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default function NotificationBell({ isSidebarItem, isCollapsed, onCloseSidebar, placement }) {
  // A sidebar row opens its panel to the right; the same row inside the
  // mobile menu sheet has no room to the right, so it opens upward.
  const menuSide = placement || (isSidebarItem ? "right" : "bottom");
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleItemClick = async (notification) => {
    if (!notification.is_read) {
      await markRead(notification._id);
    }
    let targetLink = notification.link;
    const state = { ...notification.meta };
    if (state.inquiry_id) state.openQuoteId = state.inquiry_id;
    if (state.booking_id) state.openBookingId = state.booking_id;

    if (user?.role === "manager") {
      const bId = state.booking_id || (targetLink && targetLink.match(/\/bookings\/([a-f0-9]+)/i)?.[1]);
      if (bId) {
        targetLink = `/manager/bookings?booking_id=${bId}&action=assign`;
        state.booking_id = bId;
        state.action = "assign";
      }
    }

    if (targetLink) {
      navigate(targetLink, { state });
      setOpen(false);
      if (onCloseSidebar) onCloseSidebar();
    }
  };

  const groups = useMemo(() => groupNotificationsByDay(items), [items]);
  const empty = items.length === 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {isSidebarItem ? (
          /* Sits above the "Menu" section as its own global row — see AdminSidebar,
             which renders this before any nav-category label, not nested inside one. */
          <button className={cn(
            "group relative flex items-center gap-2.5 rounded-lg text-[13px] whitespace-nowrap",
            "transition-colors duration-150 cursor-pointer outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            isCollapsed ? "h-8.5 w-8.5 mx-auto justify-center" : "h-8.5 w-full px-2.5",
            open
              ? "bg-muted text-foreground font-semibold"
              : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
          )}>
            <div className="relative flex items-center justify-center">
              <Bell className={cn("w-4 h-4 shrink-0", (open || unreadCount > 0) && "text-primary")} />
              {unreadCount > 0 && isCollapsed && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-rose-600 ring-2 ring-card" />
              )}
            </div>
            {!isCollapsed && <span className="flex-1 text-left">Notifications</span>}
            {!isCollapsed && unreadCount > 0 && (
              <span className="ml-auto shrink-0 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

        ) : (
          <button
            type="button"
            className="relative flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]"
            title="Notifications"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          >
            <Bell className={cn("w-4 h-4", unreadCount > 0 && "text-[#2C4B8A]")} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#2C4B8A] text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        side={menuSide}
        align={menuSide === "right" ? "start" : "end"} 
        sideOffset={menuSide === "right" ? 16 : 8}
        collisionPadding={8}
        /* 320px wide inside a 320px viewport left no room for the collision
           padding, so the panel hung off the edge on the smallest phones. */
        className="w-[calc(100vw-1rem)] max-w-[22rem] sm:w-96 sm:max-w-none p-0 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 font-sans">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2C4B8A] text-[11px] font-bold border border-blue-200/60">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>

        <ScrollArea className="max-h-[380px]">
          {empty ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Bell className="w-7 h-7 mb-2 opacity-30" />
              <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">You'll see activity updates here as they happen.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map(([label, groupItems]) => (
                <div key={label}>
                  <div className="px-4 py-1.5 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    {label}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groupItems.map((item) => {
                      const meta = getNotificationMeta(item.type);
                      const Icon = meta.icon;
                      return (
                        <DropdownMenuItem asChild key={item._id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 text-left outline-none",
                              !item.is_read ? "bg-blue-50/30" : "bg-white"
                            )}
                            onClick={() => handleItemClick(item)}
                          >
                            <div className={cn("mt-0.5 flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md", meta.chipClass)}>
                              <Icon className={cn("w-3.5 h-3.5", meta.iconClass)} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn("text-xs leading-snug", !item.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                                  {item.title}
                                </p>
                                {!item.is_read && (
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#2C4B8A] shrink-0" aria-hidden="true" />
                                )}
                              </div>
                              <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
                                {item.body}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                                {formatTime(item.createdAt)}
                              </p>
                            </div>
                          </button>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t border-slate-100 bg-slate-50/70">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold text-[#2C4B8A] hover:bg-slate-100 h-8 rounded-md transition-colors"
            onClick={() => {
              setOpen(false);
              if (onCloseSidebar) onCloseSidebar();
              if (user?.role === "admin" || user?.role === "manager") {
                navigate("/admin/notifications");
              } else {
                navigate("/customer/notifications");
              }
            }}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
