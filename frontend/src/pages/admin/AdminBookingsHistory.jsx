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
  RefreshCw
} from "lucide-react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";

import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminBookingsHistory() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  const [drawerRow, setDrawerRow] = useState(null);

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
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

      const serviceType = b.service_type || (
        b.event_type?.toLowerCase().includes("food delivery") || b.delivery_method !== "setup" ? "Food Only" : "Food and Event Setup"
      );

      return {
        _id: b._id,
        id: b.reference || `EVT-${b._id.substring(b._id.length - 6).toUpperCase()}`,
        customer: b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || "Customer",
        email: b.customer_id?.email || b.contact_email || "N/A",
        eventType: b.event_type || "Catering Event",
        pkg: b.package_id?.name || "Custom Catering",
        guests: b.guest_count || 0,
        date: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
        rawDate: b.event_date ? new Date(b.event_date) : null,
        venue: b.venue_type || b.municipality || "N/A",
        serviceType,
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

  // Filtered Results
  const filtered = useMemo(() => {
    return formattedHistory.filter((r) => {
      // 1. Status Filter
      if (statusTab === "completed" && r.rawStatus !== "completed") return false;
      if (statusTab === "cancelled" && !["cancelled", "refunded"].includes(r.rawStatus)) return false;

      // 2. Service Type Filter
      if (serviceTypeFilter !== "all" && r.serviceType !== serviceTypeFilter) return false;

      // 3. Date Range Filter
      if (dateRange.from && r.rawDate && r.rawDate < new Date(dateRange.from)) return false;
      if (dateRange.to && r.rawDate && r.rawDate > new Date(`${dateRange.to}T23:59:59`)) return false;

      // 4. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return r.customer.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.eventType.toLowerCase().includes(q);
      }

      return true;
    });
  }, [formattedHistory, statusTab, serviceTypeFilter, dateRange, search]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const buildRowActions = (r) => [
    { key: "view", label: "Inspect Event Details", icon: Eye, onSelect: () => setDrawerRow(r) },
    { key: "full", label: "Open Full Page", icon: FileText, onSelect: () => navigate(`/admin/bookings/${r._id}/details`) },
    { key: "print", label: "Print Receipt / Summary", icon: Printer, onSelect: () => window.print() }
  ];

  const columns = [
    {
      key: "id",
      header: "Event Ref",
      render: (r) => <span className="text-xs font-mono font-bold text-primary">{r.id}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div>
          <span className="text-sm font-bold text-slate-900 block">{r.customer}</span>
          <span className="text-xs text-slate-500">{r.email}</span>
        </div>
      ),
    },
    {
      key: "eventInfo",
      header: "Event & Package",
      render: (r) => (
        <div>
          <span className="text-sm font-semibold text-slate-800 block">{r.eventType}</span>
          <span className="text-xs text-slate-500">{r.pkg}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Event Date",
      className: "text-xs text-slate-700 font-semibold whitespace-nowrap",
    },
    {
      key: "guests",
      header: "Guests",
      render: (r) => <span className="text-xs font-semibold text-slate-700">{r.guests} pax</span>,
    },
    {
      key: "total",
      header: "Historic Revenue",
      render: (r) => <span className="text-xs font-bold text-slate-900">{fmt(r.total)}</span>,
    },
    {
      key: "paymentLog",
      header: "Payment Ledger",
      render: (r) => (
        <div className="text-xs space-y-0.5">
          <span className="text-emerald-700 font-semibold block">Paid: {fmt(r.displayPaid)}</span>
          {r.balanceDue > 0 && <span className="text-amber-600 font-bold block">Bal Due: {fmt(r.balanceDue)}</span>}
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
              Historical record of concluded, completed, and archived catering events and past transactions.
            </p>
          </div>

          <Btn variant="secondary" size="sm" onClick={() => window.print()} className="self-start sm:self-auto">
            <Download size={13} /> Export History
          </Btn>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard title="Total History" value={kpiStats.totalCount} sub="All archived records" icon={History} />
          <KPICard title="Completed Events" value={kpiStats.completedCount} sub="Successfully concluded" icon={CheckCircle2} />
          <KPICard title="Cancelled Events" value={kpiStats.cancelledCount} sub="Past cancellations" icon={XCircle} />
          <KPICard title="Historic Revenue" value={fmt(kpiStats.totalRevenue)} sub="Total revenue realized" icon={DollarSign} />
        </div>

        {/* Toolbar & Filter Options */}
        <AdminCard className="!p-3.5 sm:!p-4 space-y-3.5">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setStatusTab("all")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusTab === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Archived ({kpiStats.totalCount})
              </button>
              <button
                onClick={() => setStatusTab("completed")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusTab === "completed" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Completed ({kpiStats.completedCount})
              </button>
              <button
                onClick={() => setStatusTab("cancelled")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusTab === "cancelled" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cancelled ({kpiStats.cancelledCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search event, customer, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </AdminCard>

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => r._id}
            loading={loading}
            emptyTitle="No event history records found."
            emptyHint={search || statusTab !== "all" ? "Try adjusting your search or filters." : undefined}
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
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Event Type" value={drawerRow.eventType} />
                <DrawerField label="Package Name" value={drawerRow.pkg} />
                <DrawerField label="Guest Count" value={`${drawerRow.guests} pax`} />
                <DrawerField label="Event Date" value={drawerRow.date} />
                <DrawerField label="Venue Location" value={drawerRow.venue} />
                <DrawerField label="Service Type" value={drawerRow.serviceType} />
                <DrawerField label="Total Revenue" value={fmt(drawerRow.total)} />
                <DrawerField label="Total Paid" value={fmt(drawerRow.displayPaid)} />
                <DrawerField label="Event Status" value={<Badge status={drawerRow.status} />} full />
                <DrawerField label="Customer Email" value={drawerRow.email} full />
              </div>
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}