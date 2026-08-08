import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationAPI } from "../../api/notifications";
import { getSocket } from "../../api/socket";
import { Bell, Check, Circle } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

export default function NotificationBell({ isSidebarItem, isCollapsed, onCloseSidebar }) {
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {isSidebarItem ? (
          /* Mirrors AdminSidebar's NAV_ROW so this row matches every other
             sidebar item in height, radius, gap, type scale and states. */
          <button className={cn(
            "group relative flex items-center gap-3 rounded-md text-[13.5px] whitespace-nowrap",
            "transition-colors duration-150 cursor-pointer outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            isCollapsed ? "h-10 w-10 mx-auto justify-center" : "h-10 w-full px-3",
            open
              ? "bg-muted text-foreground font-semibold"
              : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
          )}>
            <div className="relative flex items-center justify-center">
              <Bell className={cn("w-[18px] h-[18px] shrink-0", (open || unreadCount > 0) && "text-primary")} />
              {unreadCount > 0 && isCollapsed && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-destructive" />
              )}
            </div>
            {!isCollapsed && <span className="flex-1 text-left">Notifications</span>}
            {!isCollapsed && unreadCount > 0 && (
              <span className="ml-auto shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:bg-powder hover:text-primary">
            <Bell className={cn("w-5 h-5", unreadCount > 0 && "text-primary")} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent side={isSidebarItem ? "right" : "bottom"} align={isSidebarItem ? "start" : "end"} sideOffset={isSidebarItem ? 16 : 4} className="w-80 sm:w-96 p-0 border-border shadow-lg z-[100]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-powder text-primary text-xs font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllRead} 
            disabled={unreadCount === 0}
            className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Mark all read
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {empty ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Bell className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {items.map((item) => (
                <div key={item._id} className="relative group">
                  <DropdownMenuItem
                    className={cn(
                      "flex flex-col items-start px-4 py-3.5 cursor-pointer relative transition-colors duration-150 focus:bg-muted/50 focus:text-foreground hover:bg-muted/50",
                      item.is_read ? "opacity-75" : "bg-powder/40 border-l-2 border-primary pl-[14px]"
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex w-full gap-3 pr-16">
                      <div className="mt-1 flex-shrink-0">
                        {!item.is_read ? (
                          <Circle className="w-2 h-2 fill-primary text-primary animate-pulse" />
                        ) : (
                          <div className="w-2 h-2 rounded-full border border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={cn("text-sm font-semibold leading-snug", item.is_read ? "text-foreground/80" : "text-foreground")}>
                          {item.title}
                        </p>
                        <p className={cn("text-xs leading-relaxed line-clamp-2", item.is_read ? "text-muted-foreground/80" : "text-muted-foreground")}>
                          {item.body}
                        </p>
                      </div>
                    </div>
                    <span className="absolute top-3.5 right-4 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="m-0" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t border-border bg-muted/50">
          <Button 
            variant="ghost" 
            className="w-full text-sm font-medium text-primary hover:text-primary-hover hover:bg-powder"
            onClick={() => { 
              setOpen(false); 
              if (onCloseSidebar) onCloseSidebar();
              navigate("/admin/notifications"); 
            }}
          >
            View All
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
