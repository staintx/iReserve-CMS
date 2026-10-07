import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Download, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  FileText, 
  Calendar, 
  CreditCard,
  RefreshCw,
  Palette,
  Package,
  Phone,
  MapPin,
  User,
  Utensils,
  Sliders,
  X,
  Tag,
  FileSpreadsheet,
  Users
} from "lucide-react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import FilterPill from "../../components/admin/table/FilterPill";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import DataTable from "../../components/admin/table/DataTable";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";

/** Deterministic Avatar Initials */
const AvatarInitials = ({ name, className = "w-8 h-8 text-xs" }) => {
  const getInitials = (str) => {
    if (!str) return "EV";
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return str.substring(0, 2).toUpperCase();
  };

  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200/60",
    "bg-indigo-100 text-indigo-700 border-indigo-200/60",
    "bg-purple-100 text-purple-700 border-purple-200/60",
    "bg-emerald-100 text-emerald-700 border-emerald-200/60",
    "bg-amber-100 text-amber-700 border-amber-200/60",
    "bg-teal-100 text-teal-700 border-teal-200/60",
  ];

  const hash = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];

  return (
    <div className={`${className} rounded-full flex items-center justify-center font-bold shrink-0 border ${colorClass}`}>
      {getInitials(name)}
    </div>
  );
};

export default function AdminBookingsHistory() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [archetypeFilter, setArchetypeFilter] = useState("all"); // 'all' | 'package' | 'bespoke' | 'food_only'
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const [drawerRow, setDrawerRow] = useState(null);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, pRes] = await Promise.all([
        AdminAPI.getBookings(),
        AdminAPI.getPayments()
      ]);

      const historyBookings = (bRes.data || []).filter((b) => ["completed", "cancelled", "refunded"].includes((b.status || "").toLowerCase()));
      setBookings(historyBookings);
      setPayments(pRes.data || []);
    } catch (err) {
      notify("Failed to load event history records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData, ["booking"]);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Enriched History Bookings List
  const formattedHistory = useMemo(() => {
    return bookings.map((b) => {
      const rawPaid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && p.status === "approved")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const total = Number(b.total_price || 0);
      const displayPaid = total > 0 ? Math.min(rawPaid, total) : rawPaid;
      const balanceDue = Math.max(0, total - displayPaid);
      const rawStatus = (b.status || "").toLowerCase();

      const isFoodOnly = b.service_type === "Food Only" || b.service_type === "Food" || b.event_type?.toLowerCase().includes("food delivery");
      const isCustomSetup = Boolean(
        b.is_custom_setup ||
        (Array.isArray(b.custom_setup_scope) && b.custom_setup_scope.length > 0) ||
        (Array.isArray(b.inspiration_images) && b.inspiration_images.length > 0) ||
        b.custom_setup_notes
      );

      const customerName = b.customer_id?.full_name 
        || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() 
        || "Customer";

      const customerPhone = b.contact_phone || b.customer_id?.phone || b.contact_alt_phone || "—";
      const customerEmail = b.customer_id?.email || b.contact_email || "—";

      const addressParts = [b.street, b.barangay, b.municipality, b.province].filter(Boolean);
      const venueFull = addressParts.join(", ")
        ? addressParts.join(", ") + (b.zip_code ? ` (${b.zip_code})` : "")
        : b.venue_address || "Venue TBA";

      return {
        _id: b._id,
        id: b.reference || `EVT-${b._id.substring(b._id.length - 6).toUpperCase()}`,
        customer: customerName,
        email: customerEmail,
        phone: customerPhone,
        eventType: b.event_type === "Other" && b.event_type_other ? b.event_type_other : (b.event_type || "Catering Event"),
        pkg: b.package_id?.name || (isCustomSetup ? "Bespoke Custom Setup" : "Custom Catering"),
        guests: b.guest_count || 0,
        date: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
        rawDate: b.event_date ? new Date(b.event_date) : null,
        venue: [b.street, b.barangay, b.municipality].filter(Boolean).join(", ")
          || [b.barangay, b.municipality].filter(Boolean).join(", ")
          || b.municipality
          || b.venue_address
          || "Venue TBA",
        venueFull,
        landmark: b.landmark || "",
        serviceType: isFoodOnly ? "Food Only" : "Food and Event Setup",
        isFoodOnly,
        isCustomSetup,
        eventTheme: b.event_theme || "",
        coordinator: b.event_manager_id?.full_name || "Unassigned",
        staffCount: Array.isArray(b.staff_assignments) ? b.staff_assignments.length : 0,
        total,
        displayPaid,
        balanceDue,
        status: rawStatus === "completed" ? "Completed" : rawStatus === "refunded" ? "Refunded" : "Cancelled",
        rawStatus,
        paymentStatus: b.payment_status || (balanceDue === 0 && total > 0 ? "fully_paid" : "deposit_paid"),
        rawBooking: b
      };
    });
  }, [bookings, payments]);

  // Unique Event Types
  const availableEventTypes = useMemo(() => {
    const types = new Set(formattedHistory.map((b) => b.eventType).filter(Boolean));
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [formattedHistory]);

  // KPI Metrics Calculation
  const kpiStats = useMemo(() => {
    const totalCount = formattedHistory.length;
    const completedCount = formattedHistory.filter((b) => b.rawStatus === "completed").length;
    const cancelledCount = formattedHistory.filter((b) => b.rawStatus === "cancelled" || b.rawStatus === "refunded").length;

    const totalRevenue = formattedHistory
      .filter((b) => b.rawStatus === "completed")
      .reduce((sum, b) => sum + b.total, 0);

    return { totalCount, completedCount, cancelledCount, totalRevenue };
  }, [formattedHistory]);

  // Active filter tracking & global reset
  const hasActiveFilters = Boolean(
    search.trim() ||
    statusTab !== "all" ||
    archetypeFilter !== "all" ||
    eventTypeFilter !== "all" ||
    dateRange.from ||
    dateRange.to
  );

  const clearFilters = () => {
    setSearch("");
    setStatusTab("all");
    setArchetypeFilter("all");
    setEventTypeFilter("all");
    setDateRange({ from: "", to: "" });
  };

  // Filtered Results
  const filtered = useMemo(() => {
    return formattedHistory.filter((r) => {
      // 1. Status Filter
      if (statusTab === "completed" && r.rawStatus !== "completed") return false;
      if (statusTab === "cancelled" && !["cancelled", "refunded"].includes(r.rawStatus)) return false;

      // 2. Archetype Filter
      if (archetypeFilter === "package" && (r.isCustomSetup || r.isFoodOnly)) return false;
      if (archetypeFilter === "bespoke" && !r.isCustomSetup) return false;
      if (archetypeFilter === "food_only" && !r.isFoodOnly) return false;

      // 3. Event Type Filter
      if (eventTypeFilter !== "all" && r.eventType !== eventTypeFilter) return false;

      // 4. Date Range Filter
      if (dateRange.from && r.rawDate && r.rawDate < new Date(dateRange.from)) return false;
      if (dateRange.to && r.rawDate && r.rawDate > new Date(`${dateRange.to}T23:59:59`)) return false;

      // 5. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.customer.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.eventType.toLowerCase().includes(q) ||
          r.venue.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [formattedHistory, statusTab, archetypeFilter, eventTypeFilter, dateRange, search]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // Client-side CSV Export
  const exportHistoryToCSV = () => {
    if (filtered.length === 0) {
      notify("No event history records to export.", "warning");
      return;
    }

    const headers = [
      "Event Ref",
      "Customer Name",
      "Email",
      "Phone",
      "Event Type",
      "Package",
      "Service Archetype",
      "Event Date",
      "Guests (Pax)",
      "Venue Address",
      "Total Cost (PHP)",
      "Amount Paid (PHP)",
      "Balance Due (PHP)",
      "Event Status"
    ];

    const rows = filtered.map((r) => [
      `"${r.id}"`,
      `"${r.customer.replace(/"/g, '""')}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      `"${r.eventType}"`,
      `"${r.pkg.replace(/"/g, '""')}"`,
      `"${r.isCustomSetup ? "Custom Styling" : r.isFoodOnly ? "Food Only" : "Standard Package"}"`,
      `"${r.date}"`,
      r.guests,
      `"${r.venueFull.replace(/"/g, '""')}"`,
      r.total,
      r.displayPaid,
      r.balanceDue,
      `"${r.status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `iReserve_Event_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Exported ${filtered.length} event records to CSV.`, "success");
  };

  const buildRowActions = (r) => [
    { key: "view", label: "Inspect Event Details", icon: Eye, onSelect: () => setDrawerRow(r) },
    { key: "full", label: "Open Full Page", icon: FileText, onSelect: () => navigate(`/admin/bookings/${r._id}/details`) },
    { key: "print", label: "Print Receipt / Summary", icon: Printer, onSelect: () => window.print() }
  ];

  const columns = [
    {
      key: "id",
      header: "Event Ref",
      render: (r) => (
        <button
          onClick={() => navigate(`/admin/bookings/${r._id}/details`)}
          className="text-xs font-mono font-bold text-primary hover:underline cursor-pointer"
          title="Open Booking Details"
        >
          {r.id}
        </button>
      ),
    },
    {
      key: "customer",
      header: "Customer & Contact",
      render: (r) => (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <AvatarInitials name={r.customer} />
          <div className="min-w-0 space-y-0.5">
            <span className="text-xs font-semibold text-foreground block truncate">{r.customer}</span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              {r.phone && r.phone !== "—" && <Phone size={10} className="text-muted-foreground/70 shrink-0" />}
              <span>{r.phone !== "—" ? r.phone : r.email}</span>
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "eventInfo",
      header: "Event & Package",
      render: (r) => (
        <div className="space-y-0.5 min-w-[130px]">
          <span className="text-xs font-semibold text-foreground block truncate">{r.eventType}</span>
          <div className="flex items-center gap-1">
            {r.isCustomSetup ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
                <Palette size={9} /> Custom Setup
              </span>
            ) : r.isFoodOnly ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                <Utensils size={9} /> Food Only
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground truncate block max-w-[130px]">{r.pkg}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Event Date",
      render: (r) => (
        <div className="space-y-0.5 tabular-nums">
          <span className="text-xs font-semibold text-foreground block whitespace-nowrap">{r.date}</span>
          <span className="text-[11px] text-muted-foreground block">{r.guests} guests</span>
        </div>
      )
    },
    {
      key: "venue",
      header: "Venue Location",
      render: (r) => (
        <div className="space-y-0.5 min-w-[120px]">
          <span className="text-xs text-foreground font-medium max-w-44 block truncate">{r.venue}</span>
          {r.landmark && (
            <span className="text-[10.5px] text-muted-foreground block truncate max-w-44">
              Near: {r.landmark}
            </span>
          )}
        </div>
      )
    },
    {
      key: "total",
      header: "Historic Revenue",
      render: (r) => <span className="text-xs font-mono font-bold text-foreground tabular-nums">{fmt(r.total)}</span>,
    },
    {
      key: "paymentLog",
      header: "Payment Ledger",
      render: (r) => (
        <div className="text-xs space-y-0.5 tabular-nums font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">Paid: {fmt(r.displayPaid)}</span>
          {r.balanceDue > 0 && <span className="text-amber-600 dark:text-amber-400 font-bold block">Bal: {fmt(r.balanceDue)}</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Event Status",
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (r) => <RowActionsMenu actions={buildRowActions(r)} />,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Event History Archive
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical record of concluded, completed, and archived catering events and past financial ledgers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={exportHistoryToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
              title="Export filtered records to CSV"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" /> Export CSV
            </button>

            <button
              onClick={() => setShowPrintReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
              title="Open Printable Summary Report"
            >
              <Printer size={13} className="text-primary" /> Summary Report
            </button>

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
              title="Refresh dataset"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} />
            </button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard title="Total History" value={kpiStats.totalCount} sub="All archived records" icon={History} />
          <KPICard title="Completed Events" value={kpiStats.completedCount} sub="Concluded events" icon={CheckCircle2} />
          <KPICard title="Cancelled Events" value={kpiStats.cancelledCount} sub="Past cancellations" icon={XCircle} />
          <KPICard title="Historic Revenue" value={fmt(kpiStats.totalRevenue)} sub="Realized revenue" icon={DollarSign} />
        </div>

        {/* Single-Line Interactive Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-2.5 shadow-2xs flex flex-wrap items-center gap-2 font-sans">
          {/* Search Input Field */}
          <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            <input
              type="text"
              placeholder="Search event, customer, ref, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-8 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Status Filter Pill with Counts */}
          <FilterPill
            label="Status"
            icon={Sliders}
            value={statusTab}
            defaultValue="all"
            onSelect={(val) => setStatusTab(val)}
            options={[
              { value: "all", label: "All Archived", count: kpiStats.totalCount },
              { value: "completed", label: "Completed", count: kpiStats.completedCount, icon: CheckCircle2 },
              { value: "cancelled", label: "Cancelled / Refunded", count: kpiStats.cancelledCount, icon: XCircle },
            ]}
          />

          {/* Format / Archetype Filter Pill */}
          <FilterPill
            label="Format"
            icon={Palette}
            value={archetypeFilter}
            defaultValue="all"
            onSelect={(val) => setArchetypeFilter(val)}
            options={[
              { value: "all", label: "All Formats" },
              { value: "package", label: "Standard Packages", icon: Package },
              { value: "bespoke", label: "Custom Styling", icon: Palette },
              { value: "food_only", label: "Food Only", icon: Utensils },
            ]}
          />

          {/* Event Type Filter Pill */}
          {availableEventTypes.length > 0 && (
            <FilterPill
              label="Event Type"
              icon={Tag}
              value={eventTypeFilter}
              defaultValue="all"
              onSelect={(val) => setEventTypeFilter(val)}
              options={[
                { value: "all", label: "All Event Types" },
                ...availableEventTypes.map((type) => ({ value: type, label: type })),
              ]}
            />
          )}

          {/* Date Range Filter Pill */}
          <FilterPill
            label="Date Range"
            icon={Calendar}
            value={dateRange.from || dateRange.to ? "custom" : "all"}
            defaultValue="all"
            customActive={Boolean(dateRange.from || dateRange.to)}
            customLabel={
              dateRange.from && dateRange.to
                ? `${dateRange.from} to ${dateRange.to}`
                : dateRange.from
                ? `From ${dateRange.from}`
                : dateRange.to
                ? `Until ${dateRange.to}`
                : "All Dates"
            }
            onClear={() => setDateRange({ from: "", to: "" })}
            renderCustomContent={(close) => (
              <div className="p-2 space-y-2 text-xs font-sans">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Event Date Range</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9.5px] text-slate-500 block mb-0.5 font-medium">From</label>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                      className="w-full text-[11px] bg-white border border-slate-200 text-slate-800 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] text-slate-500 block mb-0.5 font-medium">To</label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                      className="w-full text-[11px] bg-white border border-slate-200 text-slate-800 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {(dateRange.from || dateRange.to) && (
                  <div className="pt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDateRange({ from: "", to: "" });
                        close();
                      }}
                      className="text-[10.5px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Clear Dates
                    </button>
                  </div>
                )}
              </div>
            )}
          />

          {/* Global Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 sm:ml-auto"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden shadow-xs border border-border/80">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => r._id}
            loading={loading}
            emptyTitle="No event history records found."
            emptyHint={search || statusTab !== "all" || archetypeFilter !== "all" ? "Try adjusting your search or filters." : "Archived events will appear here once marked as completed or cancelled."}
            onRowClick={(r) => setDrawerRow(r)}
            minWidth="920px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Quick Details Drawer */}
        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.customer}
          description={drawerRow ? `Historical Event Ref: ${drawerRow.id}` : ""}
          footer={
            drawerRow && (
              <>
                <Btn variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer size={13} /> Print Summary
                </Btn>
                <Btn variant="primary" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                  Open Full Page
                </Btn>
              </>
            )
          }
        >
          {drawerRow && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <DrawerField
                  label="Event Reference"
                  value={
                    <span className="text-primary font-mono font-bold cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                      {drawerRow.id}
                    </span>
                  }
                />
                <DrawerField label="Event Type" value={drawerRow.eventType} />
                <DrawerField label="Package Name" value={drawerRow.pkg} />
                <DrawerField label="Guest Count" value={`${drawerRow.guests} pax`} />
                <DrawerField label="Event Date" value={drawerRow.date} />
                <DrawerField label="Venue Location" value={drawerRow.venue} />
                <DrawerField label="Service Type" value={drawerRow.serviceType} />
                <DrawerField label="Assigned Coordinator" value={drawerRow.coordinator} />
                <DrawerField label="Total Revenue" value={fmt(drawerRow.total)} />
                <DrawerField label="Total Paid" value={fmt(drawerRow.displayPaid)} />
                {drawerRow.balanceDue > 0 && <DrawerField label="Remaining Balance" value={fmt(drawerRow.balanceDue)} />}
                <DrawerField label="Event Status" value={<Badge status={drawerRow.status} />} full />
                <DrawerField label="Customer Contact" value={`${drawerRow.customer} · ${drawerRow.phone} · ${drawerRow.email}`} full />
                {drawerRow.venueFull && <DrawerField label="Full Venue Address" value={drawerRow.venueFull} full />}
                {drawerRow.landmark && <DrawerField label="Landmark" value={drawerRow.landmark} full />}
              </div>
            </div>
          )}
        </DetailDrawer>

        {/* Printable History Summary Report Dialog */}
        <Dialog open={showPrintReportModal} onOpenChange={setShowPrintReportModal}>
          <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:p-0 print:border-none print:shadow-none">
            <div className="space-y-4 py-2 print:py-0 text-slate-800">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 uppercase">
                    iReserve Event Services
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Executive Event History &amp; Financial Ledger Summary
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-slate-900 block">
                    Generated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    Dataset: {filtered.length} Archived Events
                  </span>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Records</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{filtered.length}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Completed</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    {filtered.filter((r) => r.rawStatus === "completed").length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Cancelled</span>
                  <span className="font-mono font-bold text-sm text-rose-600">
                    {filtered.filter((r) => r.rawStatus === "cancelled" || r.rawStatus === "refunded").length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Realized Revenue</span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {fmt(filtered.filter((r) => r.rawStatus === "completed").reduce((sum, r) => sum + r.total, 0))}
                  </span>
                </div>
              </div>

              {/* Condensed Table for Print */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[10.5px] uppercase">
                    <tr>
                      <th className="p-2">Event Ref</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Event Type</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 text-right">Revenue</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.slice(0, 30).map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-slate-900">{r.id}</td>
                        <td className="p-2 font-medium text-slate-800">{r.customer}</td>
                        <td className="p-2 text-slate-700">{r.eventType}</td>
                        <td className="p-2 text-slate-700 tabular-nums">{r.date}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">{fmt(r.total)}</td>
                        <td className="p-2 text-right font-mono text-emerald-700">{fmt(r.displayPaid)}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            r.rawStatus === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 30 && (
                <p className="text-[11px] text-slate-500 italic text-center">
                  Showing top 30 records of {filtered.length} total. Export full CSV for complete ledger data.
                </p>
              )}

              {/* Actions (Hidden in Print) */}
              <DialogFooter className="print:hidden pt-3 border-t border-slate-200 gap-2 sm:gap-0">
                <Btn type="button" variant="secondary" onClick={() => setShowPrintReportModal(false)}>
                  Close
                </Btn>
                <Btn
                  type="button"
                  variant="primary"
                  className="gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer size={13} /> Print Summary Document
                </Btn>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}