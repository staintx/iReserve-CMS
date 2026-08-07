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
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
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
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
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
          } else if (positivePaid === 0) {
            status = "no_refund_needed";
          }

          // Reason
          const reason =
            b.cancellation_reason ||
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
      "Contract Total",
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
            className="text-xs font-mono font-bold text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1"
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
            <div className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-[#EADBAC] text-[#D4AF37] flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#111111] truncate">{r.customerName}</div>
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
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="View Refund Details"
          >
            <Eye size={15} />
          </button>

          {r.status === "approved" && (
            <button
              onClick={() => setVoucherModalRow(r)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-[#D4AF37] hover:bg-amber-50 transition-colors"
              title="Print Refund Voucher"
            >
              <Printer size={15} />
            </button>
          )}

          {r.status === "pending" && (
            <RowActionsMenu
              actions={[
                { key: "calc", label: "Calculate & Approve Refund", icon: Calculator, onSelect: () => handleOpenCalc(r) },
                { key: "deny", label: "Deny / Reject Refund (₱0)", icon: XCircle, onSelect: () => handleDenyRefund(r) },
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
      <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen">
        {/* Top Breadcrumb & Page Title */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
              <span className="cursor-pointer hover:text-gray-800" onClick={() => navigate("/admin/dashboard")}>
                Finance
              </span>
              <ChevronRight size={12} className="mx-1.5 text-gray-400" />
              <span className="text-[#111111] font-semibold">Refund Queue</span>
            </div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              Refund Requests & Cancellation Settlements
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Btn variant="secondary" size="sm" onClick={() => loadData(true)} className="gap-1.5">
              <RefreshCw size={13} className={refreshing ? "animate-spin text-[#D4AF37]" : ""} />
              Refresh
            </Btn>
            <Btn variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download size={13} />
              Export CSV
            </Btn>
          </div>
        </div>

        {/* Finance KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Refunded */}
          <AdminCard className="!p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Refunded</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <RotateCcw size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {fmt(stats.totalDisbursed)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {stats.approvedCount} approved refund disbursements
            </div>
          </AdminCard>

          {/* KPI 2: Pending Refund Queue */}
          <AdminCard className="!p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Action</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {fmt(stats.pendingAmount)}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <ShieldAlert size={12} />
              {stats.pendingCount} requests awaiting calculation
            </div>
          </AdminCard>

          {/* KPI 3: Cancelled Bookings */}
          <AdminCard className="!p-4 border-l-4 border-l-red-400">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cancelled Bookings</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <XCircle size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {stats.totalRequests}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Total cancellation requests recorded
            </div>
          </AdminCard>

          {/* KPI 4: Retained Fees / Settled */}
          <AdminCard className="!p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">No Refund Needed</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {stats.noRefundCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Cancellations without deposit payments
            </div>
          </AdminCard>
        </div>

        {/* Table & Toolbar Container */}
        <AdminCard className="!p-4">
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
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                    <input
                      type="date"
                      value={draftDateRange.to}
                      onChange={(e) => setDraftDateRange((d) => ({ ...d, to: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
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

        {/* Detail Drawer */}
        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow ? `Refund Case: ${drawerRow.bookingRef}` : ""}
          description={drawerRow ? drawerRow.customerName : ""}
          footer={
            drawerRow && (
              <div className="flex items-center justify-between w-full gap-2">
                <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                  <ExternalLink size={13} /> Open Booking
                </Btn>
                {drawerRow.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Btn variant="danger" size="sm" onClick={() => handleDenyRefund(drawerRow)} disabled={actionLoading}>
                      <XCircle size={13} /> Deny Refund (₱0)
                    </Btn>
                    <Btn variant="gold" size="sm" onClick={() => handleOpenCalc(drawerRow)}>
                      <Calculator size={13} /> Calculate & Approve
                    </Btn>
                  </div>
                )}
                {drawerRow.status === "approved" && (
                  <Btn variant="gold" size="sm" onClick={() => setVoucherModalRow(drawerRow)}>
                    <Printer size={13} /> Print Voucher
                  </Btn>
                )}
              </div>
            )
          }
        >
          {drawerRow && (
            <div className="space-y-6">
              {/* Financial Highlight Box */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADBAC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide">Deposit Received</span>
                  <Badge status={getStatusBadgeType(drawerRow.status)} />
                </div>
                <div style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-[#111111]">
                  {fmt(drawerRow.totalPaid)}
                </div>
                <div className="text-xs text-gray-600 flex items-center justify-between border-t border-[#EADBAC]/60 pt-2">
                  <span>Refund Disbursed:</span>
                  <span className="font-bold text-red-600">{fmt(drawerRow.totalRefunded)}</span>
                </div>
              </div>

              {/* Detail Fields */}
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Booking Ref" value={drawerRow.bookingRef} />
                <DrawerField label="Event Type" value={drawerRow.eventType} />
                <DrawerField label="Customer Name" value={drawerRow.customerName} />
                <DrawerField label="Customer Email" value={drawerRow.customerEmail} />
                <DrawerField label="Contract Price" value={fmt(drawerRow.totalPrice)} />
                <DrawerField label="Status" value={getStatusLabel(drawerRow.status)} />
                <DrawerField label="Cancellation Date" value={formatDate(drawerRow.updatedAt)} full />
                <DrawerField label="Reason" value={drawerRow.reason || "None specified"} full />
              </div>

              {/* Recorded Payment Transaction if approved */}
              {drawerRow.refundRecord && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Disbursement Transaction Log</label>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transaction ID:</span>
                      <span className="font-mono font-bold text-gray-800">PAY-{drawerRow.refundRecord._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount Paid:</span>
                      <span className="font-bold text-emerald-600">{fmt(Math.abs(drawerRow.refundRecord.amount))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Note:</span>
                      <span className="text-gray-700">{drawerRow.refundRecord.metadata?.reason || "Refund processed"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DetailDrawer>

        {/* Interactive Refund Calculator Modal */}
        {showCalcModal && activeRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden space-y-5 animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FAF7F2]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37]/15 rounded-xl flex items-center justify-center text-[#D4AF37]">
                    <Calculator size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "Playfair Display, serif" }} className="font-bold text-[#111111] text-lg">
                      Calculate & Approve Refund
                    </h3>
                    <p className="text-xs text-gray-500">Booking {activeRefund.bookingRef} • {activeRefund.customerName}</p>
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
                    <span className="text-gray-500">Contract Total Price</span>
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
                            ? "bg-[#D4AF37] text-white border-[#D4AF37] shadow-sm"
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
                      className="flex-1 accent-[#D4AF37] cursor-pointer"
                    />
                    <span className="font-bold text-[#111111] w-14 text-right text-sm bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      {calcPct}%
                    </span>
                  </div>
                </div>

                {/* Dynamic Calculation Outcome Box */}
                <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADBAC] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">Refund Disbursed to Customer</span>
                    <span className="text-2xl font-bold text-red-600">
                      {fmt((activeRefund.totalPaid * calcPct) / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600 pt-1 border-t border-[#EADBAC]/60">
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
                    className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
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
                  <Btn variant="gold" size="sm" onClick={handleApproveRefund} disabled={actionLoading}>
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
            <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150 my-8">
              {/* Receipt Action Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 print:hidden">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Refund Voucher Preview</span>
                <div className="flex items-center gap-2">
                  <Btn variant="gold" size="sm" onClick={() => window.print()}>
                    <Printer size={13} /> Print Voucher
                  </Btn>
                  <button onClick={() => setVoucherModalRow(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Canvas */}
              <div className="space-y-6 text-[#111111]">
                {/* Branding Header */}
                <div className="text-center border-b border-gray-200 pb-4">
                  <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#D4AF37]">
                    iReserve Events & Catering
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Cavite, Philippines • Official Refund Voucher</p>
                </div>

                {/* Voucher Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">VOUCHER REF</span>
                    <span className="font-mono font-bold text-sm text-[#111111]">
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
                  <div className="font-bold text-sm text-[#111111]">{voucherModalRow.customerName}</div>
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
                      <td className="py-2.5 font-semibold text-[#111111]">Net Refund Disbursed</td>
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
