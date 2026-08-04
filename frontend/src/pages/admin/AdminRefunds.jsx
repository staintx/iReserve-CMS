import React, { useState, useEffect } from "react";
import { Eye, Calculator, AlertTriangle, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [activeRefund, setActiveRefund] = useState(null);
  const [calcPct, setCalcPct] = useState(50);
  const [refundReason, setRefundReason] = useState("");
  const [drawerRow, setDrawerRow] = useState(null);

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  const loadData = () => {
    setLoading(true);
    Promise.all([AdminAPI.getBookings(), AdminAPI.getPayments()])
      .then(([bRes, pRes]) => {
        const allPayments = pRes.data;

        const cancelled = bRes.data.filter((b) => b.status === "cancelled" || b.status === "refunded");

        const refundsData = cancelled.map((b) => {
          const bPayments = allPayments.filter((p) => p.booking_id?._id === b._id || p.booking_id === b._id);
          const totalPaid = bPayments.filter((p) => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          return {
            _id: b._id,
            id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
            customer: b.customer_id?.full_name || `${b.contact_first_name} ${b.contact_last_name}`.trim(),
            booking: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
            reason: b.cancellation_reason || (b.ocular_visit?.outcome === "cancel" ? "Ocular cancelled" : "Cancelled by admin/customer"),
            deposit: totalPaid,
            pct: b.status === "refunded" ? "100%" : "—",
            amount: b.status === "refunded" ? totalPaid : 0,
            status: b.status === "refunded" ? "approved" : totalPaid > 0 ? "pending" : "no_refund_needed",
            updatedAt: b.updatedAt,
          };
        });

        setRefunds(refundsData.filter((r) => r.deposit > 0 || r.status === "approved"));
      })
      .catch(() => notify("Failed to load refunds", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = refunds.filter((r) => {
    const matchSearch = !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.booking.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchFrom = !dateRange.from || (r.updatedAt && new Date(r.updatedAt) >= new Date(dateRange.from));
    const matchTo = !dateRange.to || (r.updatedAt && new Date(r.updatedAt) <= new Date(`${dateRange.to}T23:59:59`));
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });
  const formatDate = (v) => (v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
  const statusLabel = (s) => (s === "no_refund_needed" ? "No Refund Needed" : s);

  const handleOpenCalc = (refund) => {
    setActiveRefund(refund);
    const pct = parseInt(refund.pct.replace("%", "")) || 50;
    setCalcPct(pct);
    setRefundReason(refund.reason);
    setShowCalcModal(true);
  };

  const handleApprove = () => {
    const refundAmount = (activeRefund.deposit * calcPct) / 100;
    AdminAPI.processRefund(activeRefund._id, { amount: refundAmount, reason: refundReason })
      .then(() => AdminAPI.updateBooking(activeRefund._id, { status: "refunded" }))
      .then(() => {
        notify(`Refund of ${fmt(refundAmount)} processed successfully.`, "success");
        setShowCalcModal(false);
        setActiveRefund(null);
        setDrawerRow(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to process refund", "error"));
  };

  // Refunds keeps 4 columns — deposit %, and reason move to the drawer.
  // Booking.status now includes "refunded" (backend/src/models/Booking.js),
  // so the Approve flow this table depends on actually persists correctly.
  const columns = [
    { key: "customer", header: "Customer", render: (r) => <span className="text-sm font-bold text-[#111]">{r.customer}</span> },
    { key: "booking", header: "Booking", className: "text-xs font-mono text-[#6B7280]" },
    { key: "amount", header: "Refund Amount", render: (r) => <span className="text-sm font-bold text-[#EF4444]">{r.amount === 0 ? "₱0" : fmt(r.amount)}</span> },
    { key: "status", header: "Status", render: (r) => <Badge status={statusLabel(r.status)} /> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (r) => (
        <RowActionsMenu
          actions={[
            { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(r) },
            { key: "approve", label: "Approve refund", icon: Calculator, show: r.status === "pending", onSelect: () => handleOpenCalc(r) },
            { key: "doc", label: "Open booking", icon: FileText, onSelect: () => navigate(`/admin/bookings/${r._id}/details`) },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex flex-col gap-4">
          <div className="flex items-center text-sm font-medium text-[#6B7280]">
            <ChevronLeft size={16} className="mr-1" />
            <span className="cursor-pointer hover:text-[#111]">Finance</span>
            <ChevronRight size={14} className="mx-2 text-gray-300" />
            <span className="text-[#111] font-bold">Refund Queue</span>
          </div>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by customer or booking..."
            quickFilters={["all", "pending", "approved", "no_refund_needed"].map((s) => ({ value: s, label: s === "all" ? "All" : statusLabel(s) }))}
            activeQuickFilter={statusFilter}
            onQuickFilterChange={setStatusFilter}
            right={
              <FilterPopover
                label="Date Range"
                activeCount={dateRange.from || dateRange.to ? 1 : 0}
                onApply={() => setDateRange(draftDateRange)}
                onClear={() => { setDraftDateRange({ from: "", to: "" }); setDateRange({ from: "", to: "" }); }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#374151] block mb-1">From</label>
                    <input
                      type="date"
                      value={draftDateRange.from}
                      onChange={(e) => setDraftDateRange((d) => ({ ...d, from: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#374151] block mb-1">To</label>
                    <input
                      type="date"
                      value={draftDateRange.to}
                      onChange={(e) => setDraftDateRange((d) => ({ ...d, to: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>
              </FilterPopover>
            }
          />
          {(dateRange.from || dateRange.to) && (
            <div className="flex items-center gap-2 mt-3">
              <FilterChip label={`Updated: ${dateRange.from || "…"} – ${dateRange.to || "…"}`} onRemove={() => { setDateRange({ from: "", to: "" }); setDraftDateRange({ from: "", to: "" }); }} />
            </div>
          )}
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#111] text-lg">Refund Requests</h3>
          </div>
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => r._id}
            loading={loading}
            emptyTitle="No refunds found."
            emptyHint={search || statusFilter !== "all" || dateRange.from || dateRange.to ? "Try adjusting your search or filters." : undefined}
            onRowClick={(r) => setDrawerRow(r)}
            minWidth="700px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.customer}
          description={drawerRow ? `Booking ${drawerRow.booking}` : ""}
          footer={
            drawerRow &&
            drawerRow.status === "pending" && (
              <Btn variant="gold" size="sm" onClick={() => handleOpenCalc(drawerRow)}>
                <Calculator size={13} /> Approve refund
              </Btn>
            )
          }
        >
          {drawerRow && (
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Deposit Paid" value={fmt(drawerRow.deposit)} />
              <DrawerField label="Refund %" value={drawerRow.pct} />
              <DrawerField label="Refund Amount" value={drawerRow.amount === 0 ? "₱0" : fmt(drawerRow.amount)} />
              <DrawerField label="Status" value={<Badge status={statusLabel(drawerRow.status)} />} />
              <DrawerField label="Last Updated" value={formatDate(drawerRow.updatedAt)} full />
              <DrawerField label="Reason" value={drawerRow.reason} full />
            </div>
          )}
        </DetailDrawer>
      </div>

      {showCalcModal && activeRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center"><Calculator size={20} className="text-[#D4AF37]" /></div>
              <div>
                <p className="font-bold text-[#111]">Calculate Refund</p>
                <p className="text-xs text-[#6B7280]">Booking {activeRefund.booking}</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Deposit Paid</span>
                  <span className="font-semibold text-[#111]">{fmt(activeRefund.deposit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Reason</span>
                  <span className="font-semibold text-[#111] text-right max-w-[200px]">{activeRefund.reason}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Refund Percentage</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={calcPct}
                    onChange={(e) => setCalcPct(parseInt(e.target.value))}
                    className="flex-1 accent-[#D4AF37]"
                  />
                  <span className="font-bold text-[#111] w-12 text-right">{calcPct}%</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#111]">Amount to Refund</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">{fmt((activeRefund.deposit * calcPct) / 100)}</span>
                </div>
                {calcPct < 100 && (
                  <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> {100 - calcPct}% cancellation fee applied</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <Btn variant="secondary" size="sm" onClick={() => setShowCalcModal(false)}>Cancel</Btn>
              <Btn variant="gold" size="sm" onClick={handleApprove}>Approve Refund</Btn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
