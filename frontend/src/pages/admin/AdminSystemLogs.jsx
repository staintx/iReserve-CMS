import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Bot,
  RotateCcw,
  Clock,
  AlertCircle,
} from "lucide-react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminSystemLogsTable from "../../components/tables/AdminSystemLogsTable";
import {
  ACTION_LABELS,
  ACTION_BADGE_STYLES,
  ENTITY_META,
  ROLE_STYLES,
  timeAgo,
  formatDateTimeFull,
} from "../../components/tables/systemLogsConfig";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { Badge } from "../../components/ui/badge";

const ACTION_OPTIONS = [
  { value: "business_info_updated", label: "Business Info Updated" },
  { value: "package_created", label: "Package Created" },
  { value: "package_updated", label: "Package Updated" },
  { value: "package_deleted", label: "Package Deleted" },
  { value: "menu_item_created", label: "Menu Item Created" },
  { value: "menu_item_updated", label: "Menu Item Updated" },
  { value: "menu_item_deleted", label: "Menu Item Deleted" },
  { value: "menu_bulk_created", label: "Menu Bulk Created" },
  { value: "addon_created", label: "Addon Created" },
  { value: "addon_updated", label: "Addon Updated" },
  { value: "addon_deleted", label: "Addon Deleted" },
  { value: "addons_bulk_created", label: "Addons Bulk Created" },
  { value: "inquiry_reviewed", label: "Inquiry Reviewed" },
  { value: "inquiry_updated", label: "Inquiry Updated" },
  { value: "inquiry_customer_status_update", label: "Inquiry Customer Update" },
  { value: "booking_created", label: "Booking Created" },
  { value: "booking_created_from_inquiry", label: "Booking from Inquiry" },
  { value: "booking_updated", label: "Booking Updated" },
  { value: "booking_deleted", label: "Booking Deleted" },
  { value: "booking_guests_added", label: "Booking Guests Added" },
  { value: "booking_upgraded", label: "Booking Upgraded" },
  { value: "booking_change_requested", label: "Booking Change Requested" },
  { value: "booking_refunded", label: "Booking Refunded" },
  { value: "booking_returns_verified", label: "Equipment Returns Verified" },
  { value: "booking_inventory_assigned", label: "Inventory Assigned" },
  { value: "ocular_scheduled", label: "Ocular Scheduled" },
  { value: "ocular_completed", label: "Ocular Completed" },
  { value: "ocular_requested", label: "Ocular Requested" },
  { value: "booking_cancellation_requested", label: "Cancellation Requested" },
  { value: "booking_cancellation_approved", label: "Cancellation Approved" },
  { value: "booking_cancellation_rejected", label: "Cancellation Rejected" },
  { value: "change_request_submitted", label: "Change Request Submitted" },
  { value: "change_request_resolved", label: "Change Request Resolved" },
  { value: "booking_revision_proposed", label: "Revision Proposed" },
  { value: "booking_revision_accepted", label: "Revision Accepted" },
  { value: "booking_revision_rejected", label: "Revision Rejected" },
  { value: "quote_accepted", label: "Quote Accepted" },
];

const ENTITY_OPTIONS = [
  { value: "business_info", label: "Business Info" },
  { value: "package", label: "Package" },
  { value: "menu", label: "Menu" },
  { value: "addon", label: "Addon" },
  { value: "inquiry", label: "Inquiry" },
  { value: "booking", label: "Booking" },
];

const PAGE_SIZE = 20;

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Drawer state for selected log
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (actionFilter !== "all") params.action = actionFilter;
      if (entityFilter !== "all") params.entity_type = entityFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const res = await AdminAPI.getLogs(params);
      const data = res.data;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setLogs([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useRealTimeRefresh(loadLogs, ["systemLog"]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedLog) {
        setSelectedLog(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLog]);

  // Reset page to 1 when filters change
  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const hasActiveFilters =
    search !== "" ||
    actionFilter !== "all" ||
    entityFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const resetFilters = () => {
    setSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Pagination helpers
  const getPageNumbers = () => {
    const maxVisible = 5;
    const result = [];
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(pages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  };

  const startEntry = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(page * PAGE_SIZE, total);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* ── 1. Page Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              System Audit Logs
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive audit trail for catalog updates, inquiries, bookings, and system configurations.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {total > 0 && (
              <span className="text-xs text-muted-foreground font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-border/60 hidden sm:inline-block">
                {total.toLocaleString()} total logs
              </span>
            )}
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-md hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              onClick={loadLogs}
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-[#4C81E0]" : "text-muted-foreground"} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── 2. Search & Filter Toolbar ────────────────────────── */}
        <div className="bg-card border border-border/80 rounded-xl shadow-2xs p-3 sm:p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                placeholder="Search logs by details, user name..."
                value={search}
                onChange={(e) => updateFilter(setSearch)(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 border border-border/80 rounded-md text-xs bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#4C81E0] focus:border-[#4C81E0] transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => updateFilter(setSearch)("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Action Filter */}
            <select
              className="border border-border/80 rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-[#4C81E0] focus:border-[#4C81E0] cursor-pointer shadow-2xs"
              value={actionFilter}
              onChange={(e) => updateFilter(setActionFilter)(e.target.value)}
            >
              <option value="all">All Actions</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Entity Filter */}
            <select
              className="border border-border/80 rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-[#4C81E0] focus:border-[#4C81E0] cursor-pointer shadow-2xs"
              value={entityFilter}
              onChange={(e) => updateFilter(setEntityFilter)(e.target.value)}
            >
              <option value="all">All Entities</option>
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Date Range Group */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-50/80 px-2 py-1 rounded-md border border-border/70">
              <CalendarIcon size={12} className="text-muted-foreground shrink-0" />
              <input
                type="date"
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-mono"
                value={dateFrom}
                onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
                title="From date"
              />
              <span className="text-muted-foreground/80">to</span>
              <input
                type="date"
                className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-mono"
                value={dateTo}
                onChange={(e) => updateFilter(setDateTo)(e.target.value)}
                title="To date"
              />
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200/80 text-foreground transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw size={11} className="text-muted-foreground" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Audit Log Table Container ──────────────────────── */}
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xs">
          {loading && (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#4C81E0]" />
              <p className="font-medium">Loading system audit logs...</p>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-sm">No audit logs found</p>
              <p className="text-[11px] max-w-sm mx-auto">
                No system activity records match your current search query or active filter settings.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer pt-1 inline-block"
                >
                  Clear all active filters
                </button>
              )}
            </div>
          )}

          {!loading && logs.length > 0 && (
            <AdminSystemLogsTable
              logs={logs}
              selectedLog={selectedLog}
              onSelectLog={(log) => setSelectedLog(log)}
            />
          )}

          {/* ── 4. Pagination / Footer ──────────────────────────── */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-border/80 bg-slate-50/50 text-xs text-muted-foreground">
              <span className="font-medium">
                Showing <span className="font-semibold text-foreground">{startEntry}–{endEntry}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> logs
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-border/80 bg-card disabled:opacity-30 hover:bg-slate-100 text-foreground transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      n === page
                        ? "bg-[#4C81E0] text-white shadow-2xs"
                        : "border border-border/80 bg-card hover:bg-slate-100 text-foreground"
                    }`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="p-1.5 rounded-md border border-border/80 bg-card disabled:opacity-30 hover:bg-slate-100 text-foreground transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Detail Drawer (Slide-Over Panel) ────────────────── */}
        {selectedLog && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-drawer-title"
          >
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in-0 duration-200"
              onClick={() => setSelectedLog(null)}
              aria-hidden="true"
            />

            {/* Slide-Over Panel */}
            <div className="relative w-full max-w-[460px] h-full bg-card border-l border-border/80 shadow-2xl flex flex-col z-10 text-xs animate-in slide-in-from-right duration-200">
              {/* Pinned Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card/95 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 id="audit-drawer-title" className="font-bold text-sm text-foreground truncate">
                    Audit Log Details
                  </h3>
                  {selectedLog._id && (
                    <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                      #{selectedLog._id.slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Close details panel"
                  aria-label="Close details panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {/* 1. Action & Timestamp Header Card */}
                <div className="p-3.5 bg-slate-50/70 rounded-xl border border-border/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold py-0.5 px-2.5 rounded-md ${
                        ACTION_BADGE_STYLES[selectedLog.action] || "bg-blue-50 text-[#2C5EB5] border-blue-200/80"
                      }`}
                    >
                      {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">
                      {timeAgo(selectedLog.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono pt-1 border-t border-border/40">
                    <Clock size={12} className="text-muted-foreground shrink-0" />
                    <span>{formatDateTimeFull(selectedLog.createdAt)}</span>
                  </div>
                </div>

                {/* 2. User / Actor Section */}
                <div className="p-3 bg-card rounded-xl border border-border/70 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Actor / Responsible User
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center shrink-0">
                      {!selectedLog.user_id || (!selectedLog.user_id.full_name && !selectedLog.user_id.email) ? (
                        <Bot size={16} className="text-slate-500" />
                      ) : (
                        (selectedLog.user_id.full_name || selectedLog.user_id.email || "U").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm truncate">
                          {selectedLog.user_id?.full_name || selectedLog.user_id?.email || "System"}
                        </span>
                        {selectedLog.user_id?.role && (
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border capitalize ${
                              ROLE_STYLES[selectedLog.user_id.role] || "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {selectedLog.user_id.role}
                          </span>
                        )}
                      </div>
                      {selectedLog.user_id?.email && selectedLog.user_id?.full_name && (
                        <span className="text-xs text-muted-foreground block truncate">
                          {selectedLog.user_id.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Target Entity Section */}
                <div className="p-3 bg-card rounded-xl border border-border/70 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Entity
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Entity Type:</span>
                      <span className="font-semibold text-foreground capitalize">
                        {ENTITY_META[selectedLog.entity_type]?.label || selectedLog.entity_type || "System"}
                      </span>
                    </div>
                    {selectedLog.entity_id && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Ref ID:</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                          {selectedLog.entity_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Details / Description */}
                <div className="p-3 bg-card rounded-xl border border-border/70 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Event Details
                  </span>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedLog.details || "No textual details provided for this event."}
                  </p>
                </div>

                {/* 5. Detailed Field Changes (Before vs After) */}
                <div className="p-3 bg-card rounded-xl border border-border/70 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Field-Level Changes
                  </span>
                  {selectedLog.changes &&
                  typeof selectedLog.changes === "object" &&
                  Object.keys(selectedLog.changes).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedLog.changes).map(([field, val]) => (
                        <div
                          key={field}
                          className="p-2.5 rounded-lg border border-border/60 bg-slate-50/60 space-y-1.5"
                        >
                          <div className="font-semibold text-foreground text-xs uppercase tracking-wide">
                            {field}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-1.5 rounded bg-rose-50/60 border border-rose-200/60 min-w-0">
                              <span className="text-[10px] uppercase font-bold text-rose-600 block">
                                Previous
                              </span>
                              <span className="font-mono text-[11px] text-slate-600 line-through block truncate" title={String(val?.from ?? "—")}>
                                {String(val?.from ?? "—")}
                              </span>
                            </div>
                            <div className="p-1.5 rounded bg-emerald-50/80 border border-emerald-200/80 min-w-0">
                              <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                                New Value
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-emerald-800 block truncate" title={String(val?.to ?? "—")}>
                                {String(val?.to ?? "—")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No field-level diff was recorded for this transaction.
                    </p>
                  )}
                </div>

                {/* 6. Technical Log Metadata */}
                <div className="p-3 rounded-xl border border-border/50 bg-slate-50/40 space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Audit Record ID:</span>
                    <span className="font-mono text-[10px] text-slate-700">{selectedLog._id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ISO Timestamp:</span>
                    <span className="font-mono text-[10px] text-slate-700">{selectedLog.createdAt}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}