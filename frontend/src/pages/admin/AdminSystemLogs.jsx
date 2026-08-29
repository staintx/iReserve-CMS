import { useEffect, useState, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminSystemLogsTable from "../../components/tables/AdminSystemLogsTable";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";

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

  useRealTimeRefresh(loadLogs);

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
      <div className="space-y-4 bg-background min-h-screen">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              System Audit Logs
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive audit trail for catalog updates, inquiries, bookings, and system configurations.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors w-fit cursor-pointer self-start sm:self-auto"
            onClick={loadLogs}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Toolbar & Filter Options */}
        <AdminCard className="!p-3.5 sm:!p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                placeholder="Search logs by details, user name..."
                value={search}
                onChange={(e) => updateFilter(setSearch)(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Action Filter */}
            <select
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="date"
                className="border border-border rounded-lg px-2 py-1 text-xs bg-card text-foreground focus:outline-none cursor-pointer"
                value={dateFrom}
                onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
                title="From date"
              />
              <span>to</span>
              <input
                type="date"
                className="border border-border rounded-lg px-2 py-1 text-xs bg-card text-foreground focus:outline-none cursor-pointer"
                value={dateTo}
                onChange={(e) => updateFilter(setDateTo)(e.target.value)}
                title="To date"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </AdminCard>

        {/* Audit Log Table Container */}
        <AdminCard className="!p-0 overflow-hidden">
          {loading && <p className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading audit logs...</p>}
          {!loading && logs.length === 0 && (
            <p className="p-8 text-center text-xs text-muted-foreground">No audit logs matching current filter.</p>
          )}
          {!loading && logs.length > 0 && <AdminSystemLogsTable logs={logs} />}

          {!loading && total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground">
              <span>
                Showing {startEntry}–{endEntry} of {total} logs
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-border disabled:opacity-40 hover:bg-muted cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer ${
                      n === page ? "bg-primary text-white" : "border border-border hover:bg-muted text-foreground"
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
                  className="p-1 rounded border border-border disabled:opacity-40 hover:bg-muted cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}