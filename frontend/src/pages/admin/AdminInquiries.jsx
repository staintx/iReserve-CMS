import React, { useState, useEffect } from "react";
import { Download, Plus, Eye, Check, Edit3, XCircle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ConflictModal from "../../components/admin/ui/ConflictModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import BulkActionBar from "../../components/admin/table/BulkActionBar";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminInquiries() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [showConflict, setShowConflict] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [bulkCancelConfirm, setBulkCancelConfirm] = useState(false);

  const [drawerRow, setDrawerRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  const statuses = ["all", "Recent", "Pending Review", "Quotation Sent", "Revision Requested", "Quote Accepted", "Awaiting Final Confirmation"];

  const loadData = () => {
    setLoading(true);
    AdminAPI.getInquiries()
      .then((res) => {
        setBookings(res.data);
      })
      .catch(() => {
        notify("Failed to load bookings", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  // Map API fields to table columns
  const formattedBookings = bookings
    .filter((b) => b.status !== "Converted to Booking" && b.status !== "Cancelled")
    .map((b) => {
      const mappedStatus = b.status;

    return {
      _id: b._id,
      id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
      createdAt: b.createdAt,
      customer: b.customer_id?.full_name || `${b.contact_first_name} ${b.contact_last_name}`.trim() || "Unknown",
      email: b.customer_id?.email || b.contact_email || "",
      eventType: b.event_type || "Event",
      pkg: b.package_id?.name || "Custom",
      guests: b.guest_count || 0,
      date: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
      rawDate: b.event_date ? new Date(b.event_date) : null,
      venue: b.venue_type || "TBA",
      depositStatus: b.payment_status === "deposit_paid" || b.payment_status === "fully_paid" ? "Paid" : "Pending",
      finalPayment: b.payment_status === "fully_paid" ? "Paid" : "Pending",
      status: mappedStatus,
      rawStatus: b.status,
      coordinator: b.event_manager_id?.full_name || "—",
      total: b.total_price || 0,
    };
  });

  const filtered = formattedBookings.filter((r) => {
    let matchStatus = false;
    if (filter === "all") {
      matchStatus = true;
    } else if (filter === "Recent") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchStatus = r.createdAt && new Date(r.createdAt) >= sevenDaysAgo;
    } else {
      matchStatus = r.status === filter;
    }
    const matchSearch = !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchDateFrom = !dateRange.from || (r.rawDate && r.rawDate >= new Date(dateRange.from));
    const matchDateTo = !dateRange.to || (r.rawDate && r.rawDate <= new Date(`${dateRange.to}T23:59:59`));
    return matchStatus && matchSearch && matchDateFrom && matchDateTo;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);



  const handleCancel = (id) => {
    AdminAPI.updateInquiry(id, { status: "Cancelled" })
      .then(() => {
        notify("Booking cancelled successfully.", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to cancel booking", "error"));
  };

  const cancellableSelected = selectedIds.filter((id) => {
    const r = filtered.find((x) => x._id === id);
    return r && r.rawStatus !== "cancelled" && r.rawStatus !== "completed";
  });

  const handleBulkCancel = async () => {
    const ids = cancellableSelected;
    const results = await Promise.allSettled(ids.map((id) => AdminAPI.updateInquiry(id, { status: "Cancelled" })));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed === 0) {
      notify(`${ids.length} booking${ids.length === 1 ? "" : "s"} cancelled.`, "success");
    } else {
      notify(`${ids.length - failed} cancelled, ${failed} failed.`, failed === ids.length ? "error" : "warning");
    }
    setBulkCancelConfirm(false);
    setSelectedIds([]);
    loadData();
  };

  // Actions are rendered inline

  // Reservations is the busiest workflow in the portal, so its table is cut
  // to the 6 columns that support a quick approve/cancel decision; everything
  // else (event type, package, guests, venue, deposit) lives in the drawer.
  const columns = [
    {
      key: "id",
      header: "Inquiry ID",
      render: (r) => <span className="text-xs font-mono font-bold text-[#D4AF37]">{r.id}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div>
          <p className="text-sm font-semibold text-[#111]">{r.customer}</p>
          <p className="text-xs text-[#9CA3AF]">{r.email}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", className: "text-xs text-[#374151] whitespace-nowrap" },
    { key: "status", header: "Status", render: (r) => <Badge status={r.status} /> },
    { key: "eventType", header: "Event Type", className: "text-xs text-[#374151]" },
    { key: "guests", header: "Guests", render: (r) => <span className="text-xs text-[#374151]">{r.guests} pax</span> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (r) => {
        return (
          <div className="flex items-center gap-2">
            {r.rawStatus === "Pending Review" && (
              <>
                <button onClick={() => navigate(`/admin/quotes/${r._id}/details`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                  <Plus size={13} /> Create Quote
                </button>
                <button onClick={() => setCancelTarget(r)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
                  <XCircle size={13} /> Reject
                </button>
              </>
            )}
            
            {(r.rawStatus === "Quotation Sent" || r.rawStatus === "Revision Requested") && (
              <>
                <button onClick={() => navigate(`/admin/quotes/${r._id}/details`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                  <Edit3 size={13} /> Edit Quote
                </button>
                <button onClick={() => setCancelTarget(r)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
                  <XCircle size={13} /> Reject
                </button>
              </>
            )}



            <button onClick={() => setDrawerRow(r)} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors ml-auto">
              <Eye size={13} /> View
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        {showConflict && (
          <ConflictModal
            onClose={() => setShowConflict(false)}
            onApprove={() => {
              setShowConflict(false);
              notify("Please resolve the conflict in the booking details.", "warning");
            }}
          />
        )}

        {cancelTarget && (
          <ConfirmDialog
            title="Cancel Inquiry"
            message={`Are you sure you want to cancel inquiry ${cancelTarget.id}? This cannot be undone.`}
            confirmText="Yes, cancel inquiry"
            confirmVariant="danger"
            onConfirm={() => handleCancel(cancelTarget._id)}
            onCancel={() => setCancelTarget(null)}
          />
        )}

        {bulkCancelConfirm && (
          <ConfirmDialog
            title="Cancel Inquiries"
            message={`Cancel ${cancellableSelected.length} selected booking${cancellableSelected.length === 1 ? "" : "s"}? This cannot be undone.`}
            confirmText="Yes, cancel"
            confirmVariant="danger"
            onConfirm={handleBulkCancel}
            onCancel={() => setBulkCancelConfirm(false)}
          />
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Inquiries</h2>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export</Btn>
          </div>
        </div>

        {/* Toolbar / bulk action bar */}
        <AdminCard className="!p-4">
          {selectedIds.length > 0 ? (
            <BulkActionBar
              count={selectedIds.length}
              onClear={() => setSelectedIds([])}
              actions={[
                {
                  key: "cancel",
                  label: `Cancel${cancellableSelected.length ? ` (${cancellableSelected.length})` : ""}`,
                  destructive: true,
                  disabled: cancellableSelected.length === 0,
                  onSelect: () => setBulkCancelConfirm(true),
                },
              ]}
            />
          ) : (
            <>
              <TableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by ID or customer..."
                quickFilters={statuses.map((s) => ({ value: s, label: s }))}
                activeQuickFilter={filter}
                onQuickFilterChange={setFilter}
                right={
                  <FilterPopover
                    label="Date Range"
                    activeCount={dateRange.from || dateRange.to ? 1 : 0}
                    onApply={() => setDateRange(draftDateRange)}
                    onClear={() => {
                      setDraftDateRange({ from: "", to: "" });
                      setDateRange({ from: "", to: "" });
                    }}
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
                  <FilterChip
                    label={`Date: ${dateRange.from || "…"} – ${dateRange.to || "…"}`}
                    onRemove={() => {
                      setDateRange({ from: "", to: "" });
                      setDraftDateRange({ from: "", to: "" });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </AdminCard>

        {/* Table */}
        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => r._id}
            loading={loading}
            emptyTitle="No bookings found."
            emptyHint={search || filter !== "all" || dateRange.from || dateRange.to ? "Try adjusting your search or filters." : undefined}
            onRowClick={(r) => setDrawerRow(r)}
            rowHighlight={() => false}
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            minWidth="880px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.customer}
          description={drawerRow ? `Inquiry ${drawerRow.id}` : ""}
          footer={
            drawerRow && (
              <>
                {drawerRow.rawStatus !== "cancelled" && drawerRow.rawStatus !== "completed" && (
                  <Btn
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const row = drawerRow;
                      setDrawerRow(null);
                      setCancelTarget(row);
                    }}
                  >
                    <XCircle size={13} /> Cancel inquiry
                  </Btn>
                )}
                <Btn variant="gold" size="sm" onClick={() => navigate(`/admin/quotes/${drawerRow._id}/details`)}>
                  Open full details
                </Btn>
              </>
            )
          }
        >
          {drawerRow && (
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Event Type" value={drawerRow.eventType} />
              <DrawerField label="Package" value={drawerRow.pkg} />
              <DrawerField label="Guests" value={drawerRow.guests} />
              <DrawerField label="Venue" value={drawerRow.venue} />
              <DrawerField label="Deposit" value={<Badge status={drawerRow.depositStatus} />} />
              <DrawerField label="Final Payment" value={<Badge status={drawerRow.finalPayment} />} />
              <DrawerField label="Status" value={<Badge status={drawerRow.status} />} />
              <DrawerField label="Coordinator" value={drawerRow.coordinator} />
              <DrawerField label="Total" value={fmt(drawerRow.total)} full />
              <DrawerField label="Email" value={drawerRow.email || "—"} full />
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}
