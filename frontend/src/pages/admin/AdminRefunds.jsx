import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Calculator,
  AlertTriangle,
  FileText,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Printer,
  DollarSign,
  Clock,
  RotateCcw,
  ShieldAlert,
  Search,
  ExternalLink,
  User,
  Calendar,
  X,
  Sparkles,
  Percent,
  Phone,
  Mail,
  History,
  CreditCard,
  Building2,
  Wallet,
  Banknote,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";

import { AdminAPI } from "../../api/admin";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminRefunds() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Modals
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  const [showCalcModal, setShowCalcModal] = useState(false);
  const [activeRefund, setActiveRefund] = useState(null);
  const [calcPct, setCalcPct] = useState(50);
  const [refundReason, setRefundReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [drawerRow, setDrawerRow] = useState(null);
  const [voucherModalRow, setVoucherModalRow] = useState(null);

  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const [bRes, pRes] = await Promise.all([
        AdminAPI.getBookings(),
        AdminAPI.getPayments().catch(() => ({ data: [] })),
      ]);

      const allBookings = bRes.data || [];
      const allPayments = pRes.data || [];

      // Map bookings into refund queue records
      const refundsList = allBookings
        .filter((b) => {
          const isCancelledOrRefunded =
            b.status === "cancelled" ||
            b.status === "refunded" ||
            b.payment_status === "refund_requested" ||
            b.payment_status === "refunded" ||
            b.cancellation_request?.status === "pending" ||
            (b.change_request?.status === "pending" &&
              b.change_request?.message?.toLowerCase().includes("cancel")) ||
            b.ocular_visit?.outcome === "cancel";
          return isCancelledOrRefunded;
        })
        .map((b) => {
          // Get all payments linked to this booking
          const bPayments = allPayments.filter(
            (p) => String(p.booking_id?._id || p.booking_id) === String(b._id)
          );

          // Payments made by customer (positive approved payments)
          const positivePaid = bPayments
            .filter((p) => (p.status === "approved" || p.status === "paid") && Number(p.amount) > 0)
            .reduce((sum, p) => sum + Number(p.amount), 0);

          // Refund payments already recorded (negative amounts)
          const refundRecords = bPayments.filter(
            (p) => p.payment_type === "refund" || Number(p.amount) < 0
          );
          const totalRefunded = refundRecords.reduce(
            (sum, p) => sum + Math.abs(Number(p.amount)),
            0
          );

          // Determine status
          let status = "pending";
          if (totalRefunded > 0 || b.payment_status === "refunded" || b.status === "refunded") {
            status = "approved";
          } else if (positivePaid === 0 && b.status === "cancelled") {
            status = "no_refund_needed";
          }

          // Reason
          const reason =
            b.cancellation_request?.reason ||
            b.cancellation_reason ||
            b.change_request?.message ||
            (b.ocular_visit?.outcome === "cancel" ? "Cancelled after ocular visit" : "Customer / Admin Cancellation");

          return {
            _id: b._id,
            bookingRef: b.reference || `CAZ-${b._id.slice(-6).toUpperCase()}`,
            customerName:
              b.customer_id?.full_name ||
              `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() ||
              "Guest Customer",
            customerEmail: b.contact_email || b.customer_id?.email || "N/A",
            customerPhone: b.contact_phone || b.customer_id?.phone || "N/A",
            eventType: b.event_type || "Event",
            eventDate: b.event_date,
            totalPrice: Number(b.total_price || 0),
            totalPaid: positivePaid,
            totalRefunded: totalRefunded > 0 ? totalRefunded : status === "approved" ? positivePaid : 0,
            status,
            reason,
            updatedAt: b.updatedAt || b.createdAt,
            refundRecord: refundRecords[0] || null,
            payments: bPayments,
            bookingObj: b,
          };
        });

      setRefunds(refundsList);
      if (showToast) notify("Refund queue refreshed successfully.", "success");
    } catch (err) {
      notify("Failed to load refund queue data.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper formatters
  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
  const formatDateTime = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—");

  const getStatusLabel = (s) => {
    if (s === "approved" || s === "refunded") return "Approved & Refunded";
    if (s === "pending") return "Pending Approval";
    if (s === "no_refund_needed") return "No Refund Needed";
    return s;
  };

  const getStatusBadgeType = (s) => {
    if (s === "approved" || s === "refunded") return "Paid";
    if (s === "pending") return "Pending";
    return "off";
  };

  const getMethodBadge = (method) => {
    const m = String(method || "").toLowerCase();
    if (m === "paymongo" || m === "online") {
      return { label: "Online", icon: CreditCard, cls: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (m === "bank" || m === "bank_transfer") {
      return { label: "Bank Transfer", icon: Building2, cls: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (m === "gcash" || m === "e-wallet") {
      return { label: "GCash", icon: Wallet, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    }
    if (m === "cash") {
      return { label: "Cash Onsite", icon: Banknote, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    return { label: method || "Payment", icon: DollarSign, cls: "bg-gray-50 text-gray-700 border-gray-200" };
  };

  const getMilestoneLabel = (type) => {
    const t = String(type || "").toLowerCase();
    if (t === "deposit") return "Deposit";
    if (t === "balance") return "Final Balance";
    if (t === "full") return "Full Payment";
    if (t === "refund") return "Refund Disbursed";
    if (t === "additional") return "Additional Charge";
    return type || "Payment";
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalDisbursed = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedCount = 0;
    let noRefundCount = 0;

    refunds.forEach((r) => {
      if (r.status === "approved") {
        totalDisbursed += r.totalRefunded;
        approvedCount++;
      } else if (r.status === "pending") {
        pendingCount++;
        pendingAmount += r.totalPaid;
      } else if (r.status === "no_refund_needed") {
        noRefundCount++;
      }
    });

    return {
      totalDisbursed,
      pendingCount,
      pendingAmount,
      approvedCount,
      noRefundCount,
      totalRequests: refunds.length,
    };
  }, [refunds]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return refunds.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        r.customerName.toLowerCase().includes(q) ||
        r.bookingRef.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchFrom = !dateRange.from || (r.updatedAt && new Date(r.updatedAt) >= new Date(dateRange.from));
      const matchTo = !dateRange.to || (r.updatedAt && new Date(r.updatedAt) <= new Date(`${dateRange.to}T23:59:59`));

      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [refunds, search, statusFilter, dateRange]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // Open refund calculator
  const handleOpenCalc = (r) => {
    setActiveRefund(r);
    setCalcPct(50); // Default 50% refund
    setRefundReason(r.reason || "Cancellation refund agreement");
    setShowCalcModal(true);
  };

  // Process refund submission
  const handleApproveRefund = async () => {
    if (!activeRefund) return;
    const refundAmount = (activeRefund.totalPaid * calcPct) / 100;

    setActionLoading(true);
    try {
      await AdminAPI.processRefund(activeRefund._id, {
        amount: refundAmount,
        reason: refundReason,
      });

      notify(`Refund of ${fmt(refundAmount)} processed successfully!`, "success");
      setShowCalcModal(false);
      setActiveRefund(null);
      if (drawerRow?._id === activeRefund._id) setDrawerRow(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to process refund.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDenyRefund = async (targetRefund = activeRefund) => {
    if (!targetRefund) return;
    setActionLoading(true);
    try {
      await AdminAPI.processRefund(targetRefund._id, {
        amount: 0,
        reason: refundReason || "Refund request denied per cancellation policy terms.",
      });

      notify("Refund request denied (₱0 refund processed).", "info");
      setShowCalcModal(false);
      setActiveRefund(null);
      if (drawerRow?._id === targetRefund._id) setDrawerRow(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to deny refund.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      notify("No refund records to export.", "warning");
      return;
    }

    const headers = [
      "Booking Ref",
      "Customer Name",
      "Customer Email",
      "Event Type",
      "Total Amount",
      "Deposit Paid",
      "Refund Disbursed",
      "Status",
      "Cancellation Reason",
      "Updated Date",
    ];

    const rows = filtered.map((r) => [
      r.bookingRef,
      `"${r.customerName}"`,
      `"${r.customerEmail}"`,
      `"${r.eventType}"`,
      r.totalPrice,
      r.totalPaid,
      r.totalRefunded,
      getStatusLabel(r.status),
      `"${r.reason}"`,
      formatDate(r.updatedAt),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `iReserve_Refunds_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Exported refund report to CSV.", "success");
  };

  // Columns definition for DataTable
  const columns = [
    {
      key: "booking",
      header: "Booking / Event",
      render: (r) => (
        <div>
          <span
            className="text-xs font-mono font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/bookings/${r._id}/details`);
            }}
          >
            {r.bookingRef}
            <ExternalLink size={10} />
          </span>
          <div className="text-[11px] text-gray-500 font-medium">{r.eventType}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => {
        const initials = r.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/30 text-accent-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{r.customerName}</div>
              <div className="text-[11px] text-gray-400 truncate">{r.customerEmail}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "paid",
      header: "Deposit / Paid",
      render: (r) => <span className="text-sm font-bold text-gray-800">{fmt(r.totalPaid)}</span>,
    },
    {
      key: "amount",
      header: "Refund Disbursed",
      render: (r) => (
        <span className={`text-sm font-bold ${r.status === "approved" ? "text-emerald-600" : r.status === "pending" ? "text-red-500" : "text-gray-400"}`}>
          {r.status === "approved" ? fmt(r.totalRefunded) : r.status === "pending" ? `Est. ${fmt(r.totalPaid)}` : "₱0"}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Cancellation Reason",
      render: (r) => (
        <span className="text-xs text-gray-600 truncate max-w-[180px] block" title={r.reason}>
          {r.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge status={getStatusBadgeType(r.status)} />,
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDrawerRow(r)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 transition-colors"
            title="View Refund Details"
          >
            <Eye size={15} />
          </button>

          {r.status === "approved" && (
            <button
              onClick={() => setVoucherModalRow(r)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 transition-colors"
              title="Print Refund Voucher"
            >
              <Printer size={15} />
            </button>
          )}

          {r.status === "pending" && (
            <RowActionsMenu
              actions={[
                { key: "calc", label: "Calculate & Approve Refund", icon: Calculator, onSelect: () => handleOpenCalc(r) },
                { key: "deny", label: "Deny / Reject Refund (₱0)", icon: XCircle, destructive: true, onSelect: () => handleDenyRefund(r) },
                { key: "view", label: "View Full Details", icon: Eye, onSelect: () => setDrawerRow(r) },
                { key: "booking", label: "Open Booking Details", icon: FileText, onSelect: () => navigate(`/admin/bookings/${r._id}/details`) },
              ]}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        {/* Top Breadcrumb & Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Refunds &amp; Cancellations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review cancellation requests, calculate settlement disbursements, and process refunds.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Btn variant="secondary" size="sm" onClick={() => loadData(true)} className="gap-1.5">
              <RefreshCw size={13} className={refreshing ? "animate-spin text-primary" : ""} />
              Refresh
            </Btn>
            <Btn variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download size={13} />
              Export CSV
            </Btn>
          </div>
        </div>

        {/* Finance KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="Total Refunded"
            value={fmt(stats.totalDisbursed)}
            sub={`${stats.approvedCount} approved disbursements`}
            icon={RotateCcw}
          />
          <KPICard
            title="Pending Action"
            value={fmt(stats.pendingAmount)}
            sub={`${stats.pendingCount} awaiting calculation`}
            badge={stats.pendingCount > 0 ? "Action Req" : null}
            icon={Clock}
          />
          <KPICard
            title="Cancelled Bookings"
            value={stats.totalRequests}
            sub="Total cancellation requests"
            icon={XCircle}
          />
          <KPICard
            title="No Refund Needed"
            value={stats.noRefundCount}
            sub="Zero deposit settlements"
            icon={CheckCircle2}
          />
        </div>

        {/* Table & Toolbar Container */}
        <AdminCard className="!p-3.5 sm:!p-4">

          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by Customer Name, Booking Ref (CAZ-...), or Reason..."
            quickFilters={[
              { value: "all", label: `All Queue (${stats.totalRequests})` },
              { value: "pending", label: `Pending Approval (${stats.pendingCount})` },
              { value: "approved", label: `Refunded (${stats.approvedCount})` },
              { value: "no_refund_needed", label: `No Refund Needed (${stats.noRefundCount})` },
            ]}
            activeQuickFilter={statusFilter}
            onQuickFilterChange={setStatusFilter}
            right={
              <FilterPopover
                label="Date Filter"
                activeCount={dateRange.from || dateRange.to ? 1 : 0}
                onApply={() => setDateRange(draftDateRange)}
                onClear={() => {
                  setDraftDateRange({ from: "", to: "" });
                  setDateRange({ from: "", to: "" });
                }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">From Date</label>
                    <input
                      type="date"
                      value={draftDateRange.from}
                      onChange={(e) => setDraftDateRange((d) => ({ ...d, from: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                    <input
                      type="date"
                      value={draftDateRange.to}
                      onChange={(e) => setDraftDateRange((d) => ({ ...d, to: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </FilterPopover>
            }
          />

          {(dateRange.from || dateRange.to) && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
              <FilterChip
                label={`Updated: ${dateRange.from || "Start"} to ${dateRange.to || "End"}`}
                onRemove={() => {
                  setDateRange({ from: "", to: "" });
                  setDraftDateRange({ from: "", to: "" });
                }}
              />
            </div>
          )}
        </AdminCard>

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => r._id}
            loading={loading}
            emptyTitle="No refund requests found"
            emptyHint={
              search || statusFilter !== "all" || dateRange.from || dateRange.to
                ? "Try adjusting your search or filters."
                : "Cancelled bookings requiring refunds will appear in this queue."
            }
            onRowClick={(r) => setDrawerRow(r)}
            minWidth="850px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Slide-Over Refund Details Drawer */}
        {drawerRow && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-drawer-title"
          >
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in-0 duration-200"
              onClick={() => setDrawerRow(null)}
              aria-hidden="true"
            />

            {/* Slide-Over Panel */}
            <div className="relative w-full max-w-[460px] h-full bg-card border-l border-border/80 shadow-2xl flex flex-col z-10 text-xs animate-in slide-in-from-right duration-200">
              
              {/* Pinned Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 id="refund-drawer-title" className="font-bold text-sm text-foreground truncate">
                    Refund Details
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    {drawerRow.bookingRef}
                  </span>
                </div>
                <button
                  onClick={() => setDrawerRow(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Close refund details"
                  aria-label="Close refund details"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                
                {/* 1. Financial Settlement Hero Card */}
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        {drawerRow.status === "approved"
                          ? "Refund Amount Processed"
                          : drawerRow.status === "pending"
                          ? "Pending Refund Amount"
                          : "Refund Amount"}
                      </span>
                      <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                        drawerRow.status === "approved"
                          ? "text-emerald-600"
                          : drawerRow.status === "pending"
                          ? "text-rose-600"
                          : "text-muted-foreground"
                      }`}>
                        {drawerRow.status === "approved"
                          ? fmt(drawerRow.totalRefunded)
                          : drawerRow.status === "pending"
                          ? fmt(drawerRow.totalPaid)
                          : "₱0"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge status={getStatusBadgeType(drawerRow.status)}>
                        {getStatusLabel(drawerRow.status)}
                      </Badge>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border bg-card text-foreground border-border/80">
                        {drawerRow.status === "approved"
                          ? drawerRow.totalPaid > 0
                            ? `${Math.round((drawerRow.totalRefunded / drawerRow.totalPaid) * 100)}% Refunded`
                            : "Refund Disbursed"
                          : drawerRow.status === "pending"
                          ? "Awaiting Action"
                          : "No Deposit Paid"}
                      </span>
                    </div>
                  </div>

                  {/* Financial Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Customer Deposit Paid</span>
                      <span className="font-mono font-bold text-foreground">{fmt(drawerRow.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Total Amount</span>
                      <span className="font-semibold text-foreground">{fmt(drawerRow.totalPrice)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Cancellation Fee</span>
                      <span className="font-semibold text-foreground">
                        {drawerRow.status === "approved"
                          ? fmt(Math.max(0, drawerRow.totalPaid - drawerRow.totalRefunded))
                          : drawerRow.status === "pending"
                          ? "To be determined"
                          : "₱0"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Cancellation Date</span>
                      <span className="font-semibold text-foreground">{formatDate(drawerRow.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Contextual Action / Status Banner */}
                {drawerRow.status === "pending" && (
                  <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Clock size={14} className="text-amber-600 shrink-0" />
                      <span>Action Required: Review Refund</span>
                    </div>
                    <p className="text-amber-800 text-[11px] pl-5 leading-relaxed">
                      Customer has paid {fmt(drawerRow.totalPaid)} in deposits. Review the cancellation reason, calculate deduction fees, and approve or deny the refund.
                    </p>
                  </div>
                )}
                {drawerRow.status === "approved" && (
                  <div className="p-3 bg-emerald-50/90 border border-emerald-300/80 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span>Refund Approved &amp; Settled</span>
                    </div>
                    <p className="text-emerald-800 text-[11px] pl-5 leading-relaxed">
                      A disbursement of {fmt(drawerRow.totalRefunded)} has been processed for this cancellation. The official voucher is ready for printing.
                    </p>
                  </div>
                )}
                {drawerRow.status === "no_refund_needed" && (
                  <div className="p-3 bg-muted/40 border border-border/60 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <AlertTriangle size={14} className="text-muted-foreground shrink-0" />
                      <span>No Refund Required</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] pl-5 leading-relaxed">
                      This cancelled booking has no customer payments recorded. No disbursement is required.
                    </p>
                  </div>
                )}

                {/* 3. Cancellation Reason Card */}
                <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText size={12} className="text-primary" /> Cancellation Reason
                  </h5>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                    <p className="text-foreground leading-relaxed font-medium">
                      {drawerRow.reason || "No specific cancellation reason provided."}
                    </p>
                    {drawerRow.bookingObj?.ocular_visit?.notes && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                        <span className="font-semibold">Ocular Visit Notes:</span> {drawerRow.bookingObj.ocular_visit.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Customer & Booking Context Card */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {drawerRow.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "CU"}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Customer Details</span>
                        <h4 className="font-bold text-foreground text-sm truncate">{drawerRow.customerName}</h4>
                      </div>
                    </div>
                    {drawerRow.eventType && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                        {drawerRow.eventType}
                      </span>
                    )}
                  </div>

                  {/* Contact Info Line */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <Phone size={12} className="shrink-0 text-primary" />
                      {drawerRow.customerPhone && drawerRow.customerPhone !== "N/A" ? (
                        <a href={`tel:${drawerRow.customerPhone}`} className="truncate hover:text-foreground hover:underline">
                          {drawerRow.customerPhone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">No phone</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <Mail size={12} className="shrink-0 text-primary" />
                      {drawerRow.customerEmail && drawerRow.customerEmail !== "N/A" ? (
                        <a href={`mailto:${drawerRow.customerEmail}`} className="truncate hover:text-foreground hover:underline">
                          {drawerRow.customerEmail}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">No email</span>
                      )}
                    </div>
                  </div>

                  {/* Event Specifics Line */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Scheduled Event Date</span>
                      <span className="font-semibold text-foreground">{formatDate(drawerRow.eventDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Guest Count</span>
                      <span className="font-semibold text-foreground">
                        {drawerRow.bookingObj?.guest_count ? `${drawerRow.bookingObj.guest_count} guests` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Payment & Refund History */}
                <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <History size={12} className="text-primary" /> Payment &amp; Refund History
                    </h5>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {(drawerRow.payments || []).length} {(drawerRow.payments || []).length === 1 ? "record" : "records"}
                    </span>
                  </div>

                  {(drawerRow.payments || []).length > 0 ? (
                    <div className="space-y-2">
                      {drawerRow.payments.map((p) => {
                        const isRefund = p.payment_type === "refund" || Number(p.amount) < 0;
                        const amt = Math.abs(Number(p.amount));
                        const method = getMethodBadge(p.method);
                        const MethodIcon = method.icon;
                        const isPaidOrApproved = p.status === "approved" || p.status === "paid";

                        return (
                          <div
                            key={p._id}
                            className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  PAY-{p._id.slice(-6).toUpperCase()}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${method.cls}`}>
                                  <MethodIcon size={9} />
                                  {method.label}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                                <span>{getMilestoneLabel(p.payment_type)}</span>
                                <span>•</span>
                                <span>{formatDate(p.paid_at || p.createdAt)}</span>
                              </div>
                              {p.metadata?.reason && (
                                <div className="text-[10px] text-muted-foreground italic truncate max-w-[220px]">
                                  Note: {p.metadata.reason}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              <div className={`font-mono font-bold text-xs ${
                                isRefund
                                  ? "text-rose-600"
                                  : isPaidOrApproved
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                              }`}>
                                {isRefund ? `-${fmt(amt)}` : fmt(amt)}
                              </div>
                              <Badge status={p.status === "approved" || p.status === "paid" ? "Paid" : p.status} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center text-muted-foreground italic text-xs">
                      No payment records logged for this booking.
                    </div>
                  )}
                </div>

              </div>

              {/* Pinned Drawer Footer */}
              <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-xs space-y-2 shrink-0">
                {drawerRow.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDenyRefund(drawerRow)}
                      disabled={actionLoading}
                      className="flex-1 py-2 px-3 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Deny refund (₱0)"
                    >
                      <XCircle size={14} />
                      <span>Deny Refund (₱0)</span>
                    </button>
                    <button
                      onClick={() => handleOpenCalc(drawerRow)}
                      disabled={actionLoading}
                      className="flex-1 py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Calculate deduction & approve refund"
                    >
                      <Calculator size={14} />
                      <span>Calculate &amp; Approve</span>
                    </button>
                  </div>
                )}

                {drawerRow.status === "approved" && (
                  <button
                    onClick={() => setVoucherModalRow(drawerRow)}
                    className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                    title="Print official refund voucher"
                  >
                    <Printer size={14} />
                    <span>Print Refund Voucher</span>
                  </button>
                )}

                {/* Secondary Actions Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                    title="Open full booking details"
                  >
                    <ExternalLink size={13} />
                    <span>Open Booking Details</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Interactive Refund Calculator Modal */}
        {showCalcModal && activeRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden space-y-4 animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-accent/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 bg-accent/15 rounded-lg flex items-center justify-center text-accent-foreground">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">
                      Calculate &amp; Approve Refund
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Booking {activeRefund.bookingRef} • {activeRefund.customerName}</p>
                  </div>
                </div>

                <button onClick={() => setShowCalcModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>

              {/* Body Content */}
              <div className="px-6 space-y-4">
                {/* Contract Summary Card */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="font-semibold text-gray-800">{fmt(activeRefund.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Customer Deposit Paid</span>
                    <span className="font-bold text-emerald-600 text-sm">{fmt(activeRefund.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                    <span className="text-gray-500">Cancellation Reason</span>
                    <span className="font-semibold text-gray-800 text-right max-w-[200px] truncate">{activeRefund.reason}</span>
                  </div>
                </div>

                {/* Percentage Preset Buttons */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Select Refund Percentage
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: "100% Full", pct: 100 },
                      { label: "80%", pct: 80 },
                      { label: "50% Std", pct: 50 },
                      { label: "0% Fee", pct: 0 },
                    ].map((preset) => (
                      <button
                        key={preset.pct}
                        type="button"
                        onClick={() => setCalcPct(preset.pct)}
                        className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                          calcPct === preset.pct
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Range Slider */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={calcPct}
                      onChange={(e) => setCalcPct(parseInt(e.target.value))}
                      className="flex-1 accent-primary cursor-pointer"
                    />
                    <span className="font-bold text-foreground w-14 text-right text-sm bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      {calcPct}%
                    </span>
                  </div>
                </div>

                {/* Dynamic Calculation Outcome Box */}
                <div className="bg-accent/10 p-4 rounded-xl border border-accent/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">Refund Disbursed to Customer</span>
                    <span className="text-2xl font-bold text-red-600">
                      {fmt((activeRefund.totalPaid * calcPct) / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600 pt-1 border-t border-accent/30">
                    <span>Retained Cancellation Fee:</span>
                    <span className="font-semibold text-gray-800">
                      {fmt((activeRefund.totalPaid * (100 - calcPct)) / 100)}
                    </span>
                  </div>

                  {calcPct < 100 && (
                    <p className="text-[11px] text-amber-800 flex items-center gap-1 pt-1 font-medium">
                      <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                      {100 - calcPct}% retained as non-refundable administrative & prep fee.
                    </p>
                  )}
                </div>

                {/* Notes / Reason text input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Deduction / Settlement Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Enter reason for deduction or refund note..."
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <Btn variant="danger" size="sm" onClick={() => handleDenyRefund()} disabled={actionLoading}>
                  <XCircle size={13} /> Deny Refund (₱0)
                </Btn>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => setShowCalcModal(false)}>
                    Cancel
                  </Btn>
                  <Btn variant="primary" size="sm" onClick={handleApproveRefund} disabled={actionLoading}>
                    {actionLoading ? "Processing..." : "Approve Refund"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Refund Voucher Modal */}
        {voucherModalRow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 my-6">
              {/* Receipt Action Header */}

              <div className="flex items-center justify-between border-b border-gray-200 pb-4 print:hidden">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Refund Voucher Preview</span>
                <div className="flex items-center gap-2">
                  <Btn variant="primary" size="sm" onClick={() => window.print()}>
                    <Printer size={13} /> Print Voucher
                  </Btn>
                  <button onClick={() => setVoucherModalRow(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Canvas */}
              <div className="space-y-6 text-foreground">
                {/* Branding Header */}
                <div className="text-center border-b border-gray-200 pb-4">
                  <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-accent">
                    iReserve Events & Catering
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Cavite, Philippines • Official Refund Voucher</p>
                </div>

                {/* Voucher Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">VOUCHER REF</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      RFD-{voucherModalRow._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block">DATE</span>
                    <span className="font-semibold">{formatDate(voucherModalRow.updatedAt)}</span>
                  </div>
                </div>

                {/* Payee Details */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-1 text-xs border border-gray-100">
                  <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Recipient (Customer)</div>
                  <div className="font-bold text-sm text-foreground">{voucherModalRow.customerName}</div>
                  <div className="text-gray-500">{voucherModalRow.customerEmail} • {voucherModalRow.customerPhone}</div>
                  <div className="text-gray-500 font-mono">Booking Ref: {voucherModalRow.bookingRef}</div>
                </div>

                {/* Financial Table */}
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2.5 text-gray-700">Total Customer Deposit Paid</td>
                      <td className="py-2.5 text-right font-semibold text-gray-800">{fmt(voucherModalRow.totalPaid)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-foreground">Net Refund Disbursed</td>
                      <td className="py-2.5 text-right font-bold text-red-600 text-sm">{fmt(voucherModalRow.totalRefunded)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Remarks & Signatures */}
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="text-xs">
                    <span className="text-gray-400 block text-[10px]">REMARKS</span>
                    <span className="text-gray-700 italic">{voucherModalRow.reason}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">STATUS</span>
                      <span className="font-bold text-emerald-600 uppercase tracking-wider">Approved & Settled</span>
                    </div>
                    <div className="text-right">
                      <div className="border-b border-gray-400 w-32 ml-auto mb-1"></div>
                      <span className="text-[10px] text-gray-400 block uppercase">Authorized Signature</span>
                    </div>
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
