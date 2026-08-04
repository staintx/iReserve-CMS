import React, { useState, useEffect, useMemo } from "react";
import { Eye, Download, Check } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
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

export default function AdminPayments() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerRow, setDrawerRow] = useState(null);

  const [methodFilter, setMethodFilter] = useState("all");
  const [draftMethodFilter, setDraftMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  const loadData = () => {
    setLoading(true);
    AdminAPI.getPayments()
      .then((res) => setPayments(res.data))
      .catch(() => notify("Failed to load payments", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCustomerName = (p) => {
    if (p.customer_id?.full_name) return p.customer_id.full_name;
    if (p.booking_id?.contact_first_name) return `${p.booking_id.contact_first_name} ${p.booking_id.contact_last_name || ""}`.trim();
    return "Unknown";
  };

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });
  const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === "approved" || s === "paid" || s === "succeeded") return "Paid";
    if (s === "pending") return "Pending";
    if (s === "rejected" || s === "failed") return "Failed";
    return "Pending";
  };

  const methods = useMemo(() => {
    const distinct = Array.from(new Set(payments.map((p) => p.method).filter(Boolean)));
    return ["all", ...distinct];
  }, [payments]);

  const filtered = payments.filter((p) => {
    const custName = getCustomerName(p).toLowerCase();
    const ref = (p.booking_id?.reference || "").toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !search || custName.includes(q) || ref.includes(q);
    const matchStatus = statusFilter === "all" || getStatusBadge(p.status) === statusFilter;
    const matchMethod = methodFilter === "all" || p.method === methodFilter;
    const paidOn = p.paid_at || p.createdAt;
    const matchFrom = !dateRange.from || (paidOn && new Date(paidOn) >= new Date(dateRange.from));
    const matchTo = !dateRange.to || (paidOn && new Date(paidOn) <= new Date(`${dateRange.to}T23:59:59`));
    return matchSearch && matchStatus && matchMethod && matchFrom && matchTo;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const handleVerify = (p) => {
    AdminAPI.verifyPayment(p._id)
      .then(() => {
        notify("Payment re-checked with the gateway.", "success");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to verify payment.", "error"));
  };

  const advancedActiveCount = (methodFilter !== "all" ? 1 : 0) + (dateRange.from || dateRange.to ? 1 : 0);

  // Payments keeps 5 columns — booking/customer/amount/method/status is
  // what supports a quick reconciliation glance; gateway metadata and the
  // (still unbuilt) invoice download move to the drawer.
  const columns = [
    {
      key: "booking",
      header: "Booking",
      render: (p) => (
        <span
          className="text-xs font-mono font-bold text-[#D4AF37] cursor-pointer hover:underline"
          onClick={() => p.booking_id?.reference && navigate(`/admin/bookings/${p.booking_id.reference}/details`)}
        >
          {p.booking_id?.reference || "—"}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (p) => (
        <span className="text-sm font-semibold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => navigate("/admin/customers")}>
          {getCustomerName(p)}
        </span>
      ),
    },
    { key: "amount", header: "Amount", render: (p) => <span className="text-sm font-bold text-emerald-600">{fmt(p.amount)}</span> },
    { key: "method", header: "Method", className: "text-xs text-[#374151] capitalize", render: (p) => (p.method === "paymongo" ? "Online" : p.method || "—") },
    { key: "status", header: "Status", render: (p) => <Badge status={getStatusBadge(p.status)} /> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (p) => (
        <RowActionsMenu
          actions={[
            { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(p) },
            { key: "verify", label: "Verify payment", icon: Check, show: getStatusBadge(p.status) === "Pending", onSelect: () => handleVerify(p) },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Payments</h2>
          <Btn variant="secondary" size="sm"><Download size={13} /> Export Report</Btn>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search payments..."
            quickFilters={["all", "Paid", "Pending", "Failed"].map((s) => ({ value: s, label: s }))}
            activeQuickFilter={statusFilter}
            onQuickFilterChange={setStatusFilter}
            right={
              <FilterPopover
                label="Filters"
                activeCount={advancedActiveCount}
                onApply={() => {
                  setMethodFilter(draftMethodFilter);
                  setDateRange(draftDateRange);
                }}
                onClear={() => {
                  setDraftMethodFilter("all");
                  setMethodFilter("all");
                  setDraftDateRange({ from: "", to: "" });
                  setDateRange({ from: "", to: "" });
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#374151] block mb-1">Method</label>
                    <select
                      value={draftMethodFilter}
                      onChange={(e) => setDraftMethodFilter(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400 capitalize"
                    >
                      {methods.map((m) => (
                        <option key={m} value={m}>{m === "all" ? "All methods" : m === "paymongo" ? "Online" : m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                </div>
              </FilterPopover>
            }
          />
          {advancedActiveCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {methodFilter !== "all" && (
                <FilterChip label={`Method: ${methodFilter === "paymongo" ? "Online" : methodFilter}`} onRemove={() => { setMethodFilter("all"); setDraftMethodFilter("all"); }} />
              )}
              {(dateRange.from || dateRange.to) && (
                <FilterChip
                  label={`Date: ${dateRange.from || "…"} – ${dateRange.to || "…"}`}
                  onRemove={() => { setDateRange({ from: "", to: "" }); setDraftDateRange({ from: "", to: "" }); }}
                />
              )}
            </div>
          )}
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(p) => p._id}
            loading={loading}
            emptyTitle="No payments found."
            emptyHint={search || statusFilter !== "all" || advancedActiveCount > 0 ? "Try adjusting your search or filters." : undefined}
            onRowClick={(p) => setDrawerRow(p)}
            minWidth="760px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow ? `PAY-${drawerRow._id.slice(-6).toUpperCase()}` : ""}
          description={drawerRow ? getCustomerName(drawerRow) : ""}
          footer={
            drawerRow &&
            getStatusBadge(drawerRow.status) === "Pending" && (
              <Btn variant="secondary" size="sm" onClick={() => handleVerify(drawerRow)}>
                <Check size={13} /> Verify payment
              </Btn>
            )
          }
        >
          {drawerRow && (
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Booking" value={drawerRow.booking_id?.reference || "—"} />
              <DrawerField label="Customer" value={getCustomerName(drawerRow)} />
              <DrawerField label="Amount" value={fmt(drawerRow.amount)} />
              <DrawerField label="Method" value={drawerRow.method === "paymongo" ? "Online" : drawerRow.method || "—"} />
              <DrawerField label="Status" value={<Badge status={getStatusBadge(drawerRow.status)} />} />
              <DrawerField label="Date" value={formatDate(drawerRow.paid_at || drawerRow.createdAt)} />
              <DrawerField label="Gateway" value={drawerRow.gateway || "—"} />
              <DrawerField label="Payment Type" value={drawerRow.payment_type || "—"} />
              <DrawerField
                label="Proof of Payment"
                value={drawerRow.proof_url ? <a href={drawerRow.proof_url} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">View proof</a> : "—"}
                full
              />
              <DrawerField label="Invoice" value={<span className="text-[#9CA3AF]">Not yet available</span>} full />
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}
