import React, { useState, useEffect, useMemo } from "react";
import { 
  Download, 
  Plus, 
  Eye, 
  Check, 
  Edit3, 
  XCircle, 
  Calendar, 
  Clock, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  UserCheck,
  FileText
} from "lucide-react";
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

export default function AdminReservations() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [showConflict, setShowConflict] = useState(false);
  const [approvedId, setApprovedId] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [bulkCancelConfirm, setBulkCancelConfirm] = useState(false);

  const [drawerRow, setDrawerRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  const statuses = ["all", "confirmed", "pending deposit", "change requests", "completed", "cancelled"];

  const loadData = () => {
    setLoading(true);
    AdminAPI.getBookings()
      .then((res) => {
        setBookings(res.data || []);
      })
      .catch(() => {
        notify("Failed to load bookings", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Map API fields to table columns
  const formattedBookings = useMemo(() => {
    return bookings
      .filter((b) => !["inquiry", "quote_sent", "customer_accepted"].includes(b.status))
      .map((b) => {
        // Fix: Only treat as active change request if status is pending AND message is non-empty!
        const hasChangeRequest = b.change_request?.status === "pending" && Boolean(b.change_request?.message?.trim());
        const mappedStatus = hasChangeRequest ? "change requests" : b.status;

        return {
          _id: b._id,
          id: b.reference || `BK-${b._id.substring(b._id.length - 6).toUpperCase()}`,
          customer: b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || "Unknown Customer",
          email: b.customer_id?.email || b.contact_email || "N/A",
          phone: b.contact_phone || b.customer_id?.phone || "N/A",
          eventType: b.event_type || "Catering Event",
          pkg: b.package_id?.name || "Custom Catering",
          guests: b.guest_count || 0,
          date: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
          startTime: b.start_time || "",
          rawDate: b.event_date ? new Date(b.event_date) : null,
          venue: b.venue_type || b.municipality || "TBA",
          depositStatus: b.payment_status === "deposit_paid" || b.payment_status === "fully_paid" ? "Paid" : "Pending",
          finalPayment: b.payment_status === "fully_paid" ? "Paid" : "Pending",
          status: mappedStatus,
          rawStatus: b.status,
          hasChangeRequest,
          changeNote: b.change_request?.message || "",
          coordinator: b.event_manager_id?.full_name || "Unassigned",
          total: b.total_price || 0,
          rawBooking: b
        };
      });
  }, [bookings]);

  // Compute Top KPI Metrics
  const kpiStats = useMemo(() => {
    const total = formattedBookings.length;
    const confirmed = formattedBookings.filter((r) => ["confirmed", "Confirmed", "Converted to Booking"].includes(r.rawStatus)).length;
    const depositPending = formattedBookings.filter((r) => ["pending deposit", "Deposit Pending"].includes(r.rawStatus)).length;
    const changeRequests = formattedBookings.filter((r) => r.hasChangeRequest).length;

    return { total, confirmed, depositPending, changeRequests };
  }, [formattedBookings]);

  const filtered = useMemo(() => {
    return formattedBookings.filter((r) => {
      const matchStatus = filter === "all" || r.status.toLowerCase() === filter.toLowerCase() || (filter === "confirmed" && ["confirmed", "converted to booking"].includes(r.rawStatus.toLowerCase()));
      const matchSearch = !search || 
        r.customer.toLowerCase().includes(search.toLowerCase()) || 
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.eventType.toLowerCase().includes(search.toLowerCase());

      const matchDateFrom = !dateRange.from || (r.rawDate && r.rawDate >= new Date(dateRange.from));
      const matchDateTo = !dateRange.to || (r.rawDate && r.rawDate <= new Date(`${dateRange.to}T23:59:59`));

      return matchStatus && matchSearch && matchDateFrom && matchDateTo;
    });
  }, [formattedBookings, filter, search, dateRange]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const handleApprove = (id) => {
    AdminAPI.updateBooking(id, { status: "confirmed" })
      .then(() => {
        setApprovedId(id);
        notify("Booking approved and confirmed successfully.", "success");
        setTimeout(() => setApprovedId(null), 2000);
        loadData();
      })
      .catch((err) => {
        if (err.response?.status === 409) {
          setShowConflict(true);
        } else {
          notify(err.response?.data?.message || "Failed to approve booking.", "error");
        }
      });
  };

  const handleCancel = (id) => {
    AdminAPI.updateBooking(id, { status: "cancelled" })
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
    const results = await Promise.allSettled(ids.map((id) => AdminAPI.updateBooking(id, { status: "cancelled" })));
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

  const buildRowActions = (r) => [
    { key: "view", label: "Quick Details", icon: Eye, onSelect: () => setDrawerRow(r) },
    ...(r.rawStatus === "pending deposit" || r.hasChangeRequest
      ? [{ key: "approve", label: "Approve / Confirm", icon: Check, onSelect: () => handleApprove(r._id) }]
      : []),
    { key: "edit", label: "Open Full Booking Page", icon: Edit3, onSelect: () => navigate(`/admin/bookings/${r._id}/details`) },
    ...(r.rawStatus !== "cancelled" && r.rawStatus !== "completed"
      ? [{ key: "cancel", label: "Cancel Booking", icon: XCircle, destructive: true, onSelect: () => setCancelTarget(r) }]
      : []),
  ];

  const columns = [
    {
      key: "id",
      header: "Booking ID",
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
    {
      key: "eventInfo",
      header: "Event & Package",
      render: (r) => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{r.eventType}</p>
          <p className="text-xs text-slate-500">{r.pkg}</p>
        </div>
      ),
    },
    { 
      key: "date", 
      header: "Event Date", 
      render: (r) => (
        <div>
          <span className="text-xs font-semibold text-slate-700 block">{r.date}</span>
          {r.startTime && <span className="text-[11px] text-slate-400">{r.startTime}</span>}
        </div>
      )
    },
    { 
      key: "guests", 
      header: "Guests", 
      render: (r) => <span className="text-xs font-semibold text-slate-700">{r.guests} pax</span> 
    },
    { 
      key: "total", 
      header: "Total Cost", 
      render: (r) => <span className="text-xs font-bold text-slate-900">{fmt(r.total)}</span> 
    },
    { 
      key: "status", 
      header: "Status", 
      render: (r) => <Badge status={r.status} /> 
    },
    { 
      key: "depositStatus", 
      header: "Deposit", 
      render: (r) => <Badge status={r.depositStatus} /> 
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
      <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen">
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
            title="Cancel Booking"
            message={`Are you sure you want to cancel booking ${cancelTarget.id}? This cannot be undone.`}
            confirmText="Yes, cancel booking"
            confirmVariant="danger"
            onConfirm={() => handleCancel(cancelTarget._id)}
            onCancel={() => setCancelTarget(null)}
          />
        )}

        {bulkCancelConfirm && (
          <ConfirmDialog
            title="Cancel Bookings"
            message={`Cancel ${cancellableSelected.length} selected booking${cancellableSelected.length === 1 ? "" : "s"}? This cannot be undone.`}
            confirmText="Yes, cancel"
            confirmVariant="danger"
            onConfirm={handleBulkCancel}
            onCancel={() => setBulkCancelConfirm(false)}
          />
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">
              Reservations Management
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Track customer bookings, process event confirmations, and manage scheduled catering reservations.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export</Btn>
            <Btn variant="gold" size="sm" onClick={() => navigate("/admin/bookings/new")}><Plus size={13} /> New Booking</Btn>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{kpiStats.total}</h3>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmed</span>
              <h3 className="text-2xl font-bold text-emerald-700 mt-0.5">{kpiStats.confirmed}</h3>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deposit Pending</span>
              <h3 className="text-2xl font-bold text-amber-800 mt-0.5">{kpiStats.depositPending}</h3>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Change Requests</span>
              <h3 className="text-2xl font-bold text-indigo-900 mt-0.5">{kpiStats.changeRequests}</h3>
            </div>
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
                searchPlaceholder="Search by Booking ID, customer name, event type..."
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
                        <label className="text-xs font-semibold text-[#374151] block mb-1">From Date</label>
                        <input
                          type="date"
                          value={draftDateRange.from}
                          onChange={(e) => setDraftDateRange((d) => ({ ...d, from: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#374151] block mb-1">To Date</label>
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

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(r) => r._id}
            loading={loading}
            emptyTitle="No reservation records found."
            emptyHint={search || filter !== "all" || dateRange.from || dateRange.to ? "Try adjusting your search or filter keywords." : undefined}
            onRowClick={(r) => setDrawerRow(r)}
            rowHighlight={(r) => approvedId === r._id}
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            minWidth="980px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Quick Drawer Panel */}
        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.customer}
          description={drawerRow ? `Booking Reference: ${drawerRow.id}` : ""}
          footer={
            drawerRow && (
              <>
                {(drawerRow.rawStatus === "pending deposit" || drawerRow.hasChangeRequest) && (
                  <Btn variant="secondary" size="sm" onClick={() => handleApprove(drawerRow._id)}>
                    <Check size={13} /> Approve / Confirm
                  </Btn>
                )}
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
                    <XCircle size={13} /> Cancel Booking
                  </Btn>
                )}
                <Btn variant="gold" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                  Open Full Page
                </Btn>
              </>
            )
          }
        >
          {drawerRow && (
            <div className="space-y-6">
              {drawerRow.hasChangeRequest && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1">
                  <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-indigo-600" /> Pending Customer Change Request:
                  </strong>
                  <p className="text-indigo-800 leading-relaxed pl-5">{drawerRow.changeNote}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Event Type" value={drawerRow.eventType} />
                <DrawerField label="Package" value={drawerRow.pkg} />
                <DrawerField label="Guest Count" value={`${drawerRow.guests} pax`} />
                <DrawerField label="Event Date" value={drawerRow.date} />
                <DrawerField label="Start Time" value={drawerRow.startTime || "TBD"} />
                <DrawerField label="Venue Location" value={drawerRow.venue} />
                <DrawerField label="Deposit Status" value={<Badge status={drawerRow.depositStatus} />} />
                <DrawerField label="Final Payment" value={<Badge status={drawerRow.finalPayment} />} />
                <DrawerField label="Current Status" value={<Badge status={drawerRow.status} />} />
                <DrawerField label="Coordinator" value={drawerRow.coordinator} />
                <DrawerField label="Total Price" value={fmt(drawerRow.total)} full />
                <DrawerField label="Contact Email" value={drawerRow.email || "—"} full />
                <DrawerField label="Contact Phone" value={drawerRow.phone || "—"} full />
              </div>
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}
