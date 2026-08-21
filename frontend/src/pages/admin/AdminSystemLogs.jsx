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
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>System Logs</h1>
          <p>Audit trail for business settings, catalog, inquiries, and bookings</p>
        </div>
        <button
          type="button"
          className="admin-filter"
          onClick={loadLogs}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="admin-actions" style={{ marginBottom: "12px", flexWrap: "wrap" }}>
        <div className="admin-search">
          <Search className="search-icon" size={16} />
          <input
            placeholder="Search logs by details, user name..."
            value={search}
            onChange={(e) => updateFilter(setSearch)(e.target.value)}
          />
        </div>

        <select
          className="admin-filter"
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

        <select
          className="admin-filter"
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

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="date"
            className="admin-filter"
            value={dateFrom}
            onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
            title="From date"
          />
          <span style={{ color: "#6b7280", fontSize: "12px" }}>to</span>
          <input
            type="date"
            className="admin-filter"
            value={dateTo}
            onChange={(e) => updateFilter(setDateTo)(e.target.value)}
            title="To date"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="admin-filter"
            onClick={resetFilters}
            style={{
              backgroundColor: "#1e3a8a",
              color: "#ffffff",
              border: "1px solid #1e3a8a",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#172554";
              e.currentTarget.style.borderColor = "#172554";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1e3a8a";
              e.currentTarget.style.borderColor = "#1e3a8a";
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="admin-table-wrap">
        {loading && <p style={{ padding: "20px", color: "#6b7280" }}>Loading logs...</p>}
        {!loading && logs.length === 0 && (
          <p style={{ padding: "20px", color: "#6b7280" }}>No logs found.</p>
        )}
        {!loading && logs.length > 0 && <AdminSystemLogsTable logs={logs} />}

        {!loading && total > 0 && (
          <div className="table-footer">
            <span>
              Showing {startEntry}–{endEntry} of {total} logs
            </span>
            <div className="pager">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers().map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === page ? "active" : ""}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}