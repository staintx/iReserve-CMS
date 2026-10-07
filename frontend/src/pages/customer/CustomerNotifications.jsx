import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Bell, Loader2 } from "lucide-react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { Button } from "../../components/ui/button";
import { NotificationAPI } from "../../api/notifications";
import { getSocket } from "../../api/socket";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import useMediaQuery from "../../hooks/useMediaQuery";
import { formatCustomerNotification, groupNotificationsByDay } from "../../components/common/notificationMeta";

const PAGE_SIZE = 20;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

export default function CustomerNotifications() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const prevIsMobileRef = useRef(isMobile);
  const sentinelRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [mobilePage, setMobilePage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");

  const hasMoreMobile = isMobile && items.length < total && mobilePage < pages;

  const load = useCallback(async (targetPage, targetFilter) => {
    const fetchPage = typeof targetPage === "number" ? targetPage : page;
    const fetchFilter = typeof targetFilter === "string" ? targetFilter : filter;

    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const params = { page: fetchPage, limit: PAGE_SIZE };
      if (fetchFilter === "unread") params.unread = "true";
      const { data } = await NotificationAPI.getMine(params);
      setItems(data?.items || []);
      setTotal(data?.total || 0);
      setPages(data?.pages || 1);
      setUnreadCount(data?.unreadCount || 0);
      setMobilePage(1);
    } catch {
      setError("Failed to load notifications.");
      setItems([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  // Initial load or when page/filter changes
  useEffect(() => {
    load();
  }, [load]);

  // Sync state when viewport crosses between desktop and mobile
  useEffect(() => {
    if (prevIsMobileRef.current !== isMobile) {
      prevIsMobileRef.current = isMobile;
      setPage(1);
      setMobilePage(1);
      load(1, filter);
    }
  }, [isMobile, filter, load]);

  // Load more notifications for mobile (appends rather than replaces)
  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    if (items.length >= total) return;
    const nextPage = mobilePage + 1;
    if (nextPage > pages) return;

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const params = { page: nextPage, limit: PAGE_SIZE };
      if (filter === "unread") params.unread = "true";
      const { data } = await NotificationAPI.getMine(params);
      const incoming = data?.items || [];
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => String(i._id)));
        const unique = incoming.filter((i) => !existingIds.has(String(i._id)));
        return [...prev, ...unique];
      });
      setMobilePage(nextPage);
      if (typeof data?.total === "number") setTotal(data.total);
      if (typeof data?.pages === "number") setPages(data.pages);
      if (typeof data?.unreadCount === "number") setUnreadCount(data.unreadCount);
    } catch {
      setLoadMoreError("Failed to load more notifications. Tap to retry.");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, items.length, total, mobilePage, pages, filter]);

  // IntersectionObserver for mobile infinite scroll
  useEffect(() => {
    if (!isMobile) return;
    if (loading || loadingMore) return;
    if (!hasMoreMobile) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile, loading, loadingMore, hasMoreMobile, loadMore]);

  // Real-time socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleNew = async () => {
      if (isMobile) {
        try {
          const params = { page: 1, limit: PAGE_SIZE };
          if (filter === "unread") params.unread = "true";
          const { data } = await NotificationAPI.getMine(params);
          const incoming = data?.items || [];
          setItems((prev) => {
            const incomingIds = new Set(incoming.map((i) => String(i._id)));
            const keptPrev = prev.filter((i) => !incomingIds.has(String(i._id)));
            return [...incoming, ...keptPrev];
          });
          if (typeof data?.total === "number") setTotal(data.total);
          if (typeof data?.pages === "number") setPages(data.pages);
          if (typeof data?.unreadCount === "number") setUnreadCount(data.unreadCount);
        } catch {
          // silent fallback
        }
      } else {
        load();
      }
    };

    const handleRead = (payload) => {
      const readId = payload?.id || payload?._id;
      if (readId) {
        setItems((prev) =>
          prev.map((i) => (i._id === readId ? { ...i, is_read: true } : i))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        if (isMobile) {
          NotificationAPI.getMine({ page: 1, limit: 1 }).then(({ data }) => {
            if (typeof data?.unreadCount === "number") setUnreadCount(data.unreadCount);
          }).catch(() => {});
        } else {
          load();
        }
      }
    };

    const handleReadAll = () => {
      setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
      setUnreadCount(0);
    };

    socket.on("notification:new", handleNew);
    socket.on("notification:read", handleRead);
    socket.on("notification:read_all", handleReadAll);
    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:read", handleRead);
      socket.off("notification:read_all", handleReadAll);
    };
  }, [isMobile, filter, load]);

  const changeFilter = (key) => {
    if (key === filter) return;
    setFilter(key);
    setPage(1);
    setMobilePage(1);
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await NotificationAPI.markRead(item._id);
        setItems((prev) =>
          prev.map((i) => (i._id === item._id ? { ...i, is_read: true } : i))
        );
        setUnreadCount((c) => Math.max(c - 1, 0));
      } catch {
        // silent
      }
    }
    if (item.link) {
      let targetLink = item.link;
      const state = { ...item.meta };
      if (state.inquiry_id) state.openQuoteId = state.inquiry_id;
      if (state.booking_id) state.openBookingId = state.booking_id;

      const rawText = `${item.title || ""} ${item.body || ""} ${item.link || ""}`.toLowerCase();
      if (rawText.includes("revision") || rawText.includes("proposal") || rawText.includes("revis")) {
        state.openRevisionModal = true;
        if (!targetLink.includes("view=revision")) {
          targetLink += (targetLink.includes("?") ? "&" : "?") + "view=revision";
        }
      }

      navigate(targetLink, { state });
    }
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
    <CustomerDashboardLayout
      title="Notifications"
      subtitle="Stay updated on your quotes, bookings, and messages."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <Check className="h-4 w-4 mr-1.5" /> Mark all read
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={cn(
                "px-3.5 py-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer",
                filter === f.key
                  ? "border-[#4C81E0] text-[#4C81E0]"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#4C81E0] text-white text-[10px] font-bold align-middle">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications Card Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#4C81E0]" />
              <span>Loading notifications...</span>
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4 text-center">
              <Bell className="w-9 h-9 mb-3 opacity-20 text-rose-500" />
              <p className="text-sm font-medium text-slate-800">{error}</p>
              <p className="text-xs mt-1 text-muted-foreground/70 mb-4">
                An error occurred while fetching your notifications.
              </p>
              <Button variant="outline" size="sm" onClick={() => load()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-9 h-9 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                {filter === "unread"
                  ? "No unread notifications."
                  : "No notifications yet."}
              </p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                You'll see updates here as they happen.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groups.map(([label, groupItems]) => (
                <div key={label}>
                  <div className="px-4 py-2 sm:px-5 sm:pt-3 sm:pb-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {label}
                  </div>
                  {groupItems.map((item) => {
                    const formatted = formatCustomerNotification(item);
                    const Icon = formatted.icon;
                    return (
                      <button
                        key={item._id}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "w-full text-left px-4 py-3.5 sm:px-5 sm:py-4 flex gap-3 hover:bg-muted/70 active:bg-muted transition-colors border-b border-border last:border-b-0 cursor-pointer",
                          !item.is_read && "bg-powder/40"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full",
                            formatted.chipClass
                          )}
                        >
                          <Icon className={cn("w-4 h-4", formatted.iconClass)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2">
                            <p
                              className={cn(
                                "text-sm break-words",
                                !item.is_read
                                  ? "font-bold text-foreground"
                                  : "font-semibold text-foreground/80"
                              )}
                            >
                              {formatted.formattedTitle}
                            </p>
                            <span className="text-[11px] sm:text-xs text-muted-foreground shrink-0">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 break-words">
                            {formatted.formattedBody}
                          </p>
                          {formatted.cta && (
                            <div className="mt-2 text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] inline-block transition-colors">
                              {formatted.cta}
                            </div>
                          )}
                        </div>
                        {!item.is_read && (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Desktop/Tablet Pagination Controls */}
          {!loading && total > 0 && (
            <div className="hidden sm:flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing {startEntry}–{endEntry} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-semibold text-foreground">
                  {page} / {pages}
                </span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Mobile Infinite Scroll Sentinel & Load More Controls */}
          {!loading && items.length > 0 && (
            <div className="sm:hidden">
              {/* Sentinel for IntersectionObserver to trigger infinite scroll */}
              {hasMoreMobile && (
                <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
              )}

              {loadingMore && (
                <div className="px-4 py-3.5 flex items-center justify-center gap-2 border-t border-slate-100 text-xs font-medium text-slate-500 bg-slate-50/50">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4C81E0]" />
                  <span>Loading older notifications...</span>
                </div>
              )}

              {!loadingMore && loadMoreError && (
                <div className="px-4 py-3 flex flex-col items-center justify-center gap-1.5 border-t border-slate-100 bg-rose-50/30">
                  <span className="text-xs text-rose-600 font-medium">{loadMoreError}</span>
                  <button
                    onClick={loadMore}
                    className="px-3 py-1 text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] rounded-md transition-colors cursor-pointer"
                  >
                    Tap to retry
                  </button>
                </div>
              )}

              {!loadingMore && !loadMoreError && hasMoreMobile && (
                <div className="p-3 border-t border-slate-100">
                  <button
                    onClick={loadMore}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] bg-[#4C81E0]/8 active:bg-[#4C81E0]/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>Load more notifications</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({items.length} of {total})
                    </span>
                  </button>
                </div>
              )}

              {!hasMoreMobile && items.length > PAGE_SIZE && (
                <div className="px-4 py-3 text-center text-xs text-slate-400 border-t border-slate-100 bg-slate-50/30">
                  All {total} notifications loaded
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
