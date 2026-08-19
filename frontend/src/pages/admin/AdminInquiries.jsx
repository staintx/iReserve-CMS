import React, { useState, useEffect } from "react";
import { Download, Plus, Eye, XCircle, Archive, ArchiveRestore, Inbox, Clock } from "lucide-react";
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
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { BOOKING_TYPES, bookingIdentity } from "../../lib/specialOffers";

/**
 * How the Booking column reads for each kind of request. The type comes from
 * the stored booking_type / package relation — never from the package name, so
 * an offer called "Full Package" is never filed as a regular package.
 */
const BOOKING_TYPE_STYLES = {
  [BOOKING_TYPES.SPECIAL]: "bg-amber-100 text-amber-800 border-amber-200",
  [BOOKING_TYPES.REGULAR]: "bg-blue-50 text-blue-700 border-blue-200",
  [BOOKING_TYPES.CUSTOM]: "bg-slate-100 text-slate-600 border-slate-200",
};

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
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [bulkCancelConfirm, setBulkCancelConfirm] = useState(false);

  const [drawerRow, setDrawerRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  /**
   * Inquiries holds requests that are still pre-quotation.
   *
   * Once a quotation exists the record's home is the Quotations section, and
   * once the deposit lands it is a Reservation. Keeping "Quotation Sent",
   * "Awaiting Final Confirmation" and "Converted to Booking" here was showing
   * the same live record in two or three places at once, which is exactly
   * what this pass removes — the statuses are dropped from the data scope,
   * not just hidden from the filter bar.
   */
  const ACTIVE_STATUSES = ["Pending Review", "Under Review", "Waiting for Customer"];

  /**
   * Archive is either an explicit admin filing decision (`archived`) or an
   * end-of-life status the customer/admin already reached. Rejected and
   * cancelled inquiries land here automatically rather than sitting in the
   * active queue.
   */
  const CONCLUDED_STATUSES = ["Cancelled", "Quote Rejected", "Expired"];
  const isArchived = (r) => r.archived || CONCLUDED_STATUSES.includes(r.status);

  // "Active Leads" was a synonym for "all" once the non-active statuses left
  // the page, so it is gone rather than duplicated.
  const statuses = ["all", "Pending Review", "Under Review", "Waiting for Customer", "Archive"];

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

  useRealTimeRefresh(loadData);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  // Map API fields to table columns (includes all active & archived inquiries)
  const formattedBookings = bookings.map((b) => {
    const mappedStatus = b.status;
    // What the customer actually submitted: the package or offer by name, and
    // which of the three kinds of request it is.
    const identity = bookingIdentity(b);

    return {
      booking: identity.name,
      bookingType: identity.type,
      bookingTypeLabel: identity.label,
      _id: b._id,
      id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
      createdAt: b.createdAt,
      customer: b.customer_id?.full_name || `${b.contact_first_name || ''} ${b.contact_last_name || ''}`.trim() || "Unknown",
      email: b.customer_id?.email || b.contact_email || "",
      eventType: b.event_type || "Event",
      guests: b.guest_count || 0,
      date: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
      rawDate: b.event_date ? new Date(b.event_date) : null,
      venue: b.venue_type || "TBA",
      depositStatus: b.payment_status === "deposit_paid" || b.payment_status === "fully_paid" ? "Paid" : "Pending",
      finalPayment: b.payment_status === "fully_paid" ? "Paid" : "Pending",
      status: mappedStatus,
      rawStatus: b.status,
      archived: Boolean(b.archived),
      archivedAt: b.archived_at || null,
      coordinator: b.event_manager_id?.full_name || "—",
      total: b.total_price || 0,
    };
  });

  // Everything this page is allowed to show: pre-quotation work, plus the
  // archive. Records that have moved on to Quotations or Reservations are not
  // in scope at all, so no filter can surface them here.
  const inScope = formattedBookings.filter(
    (r) => ACTIVE_STATUSES.includes(r.status) || isArchived(r),
  );

  const filtered = inScope.filter((r) => {
    const archived = isArchived(r);
    let matchStatus;
    if (filter === "Archive") {
      matchStatus = archived;
    } else if (filter === "all") {
      matchStatus = !archived;
    } else {
      matchStatus = !archived && r.status === filter;
    }
    const matchSearch =
      !search ||
      r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      // Searching by the package or offer name is how an admin finds every
      // request for one of them at once.
      r.booking.toLowerCase().includes(search.toLowerCase());
    const matchDateFrom = !dateRange.from || (r.rawDate && r.rawDate >= new Date(dateRange.from));
    const matchDateTo = !dateRange.to || (r.rawDate && r.rawDate <= new Date(`${dateRange.to}T23:59:59`));
    return matchStatus && matchSearch && matchDateFrom && matchDateTo;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);



  // Counts come from `inScope`, not the filtered rows, so the cards keep
  // reporting the section's real workload while a filter is applied.
  const kpiStats = {
    active: inScope.filter((r) => !isArchived(r)).length,
    pending: inScope.filter((r) => !isArchived(r) && r.status === "Pending Review").length,
    underReview: inScope.filter((r) => !isArchived(r) && r.status === "Under Review").length,
    archived: inScope.filter((r) => isArchived(r)).length,
  };

  // Both handlers are awaited by the dialog, so the confirm button carries
  // the in-flight state and blocks a second submit. Neither clears the
  // dialog's own target: ConfirmDialog does that on every close path,
  // success or failure, so the overlay can no longer outlive the toast.
  const handleCancel = async (id) => {
    // Rejecting sets the lifecycle status; the Archive tab picks "Cancelled"
    // up on its own, so there is no second write to keep in sync.
    try {
      await AdminAPI.updateInquiry(id, { status: "Cancelled" });
      notify("Inquiry rejected", "success", { description: "You'll find it under Archive." });
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reject inquiry", "error");
    }
  };

  const handleArchive = async (row, archived = true) => {
    try {
      await AdminAPI.setInquiryArchived(row._id, archived);
      notify(archived ? "Inquiry archived" : "Inquiry restored", "success", {
        description: archived
          ? `${row.id} moved out of the active queue.`
          : `${row.id} is back in the active queue.`,
      });
      setDrawerRow(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Could not update the archive state.", "error");
    }
  };

  const cancellableSelected = selectedIds.filter((id) => {
    const r = filtered.find((x) => x._id === id);
    return r && !isArchived(r);
  });

  // Selected rows that are already in the archive — the bulk action flips to
  // "Restore" for those rather than offering to archive them again.
  const restorableSelected = selectedIds.filter((id) => {
    const r = filtered.find((x) => x._id === id);
    return r && r.archived;
  });

  const handleBulkArchive = async (archived = true) => {
    const ids = archived ? cancellableSelected : restorableSelected;
    const results = await Promise.allSettled(
      ids.map((id) => AdminAPI.setInquiryArchived(id, archived)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const verb = archived ? "archived" : "restored";
    if (failed === 0) {
      notify(`${ids.length} inquir${ids.length === 1 ? "y" : "ies"} ${verb}`, "success");
    } else {
      notify(
        `${ids.length - failed} ${verb}, ${failed} failed`,
        failed === ids.length ? "error" : "warning",
      );
    }
    setBulkCancelConfirm(false);
    setSelectedIds([]);
    loadData();
  };

  /**
   * Six columns, and the last one is pinned.
   *
   * The table was eight columns wide with four buttons in the final cell,
   * so the actions — the whole reason a row gets read — were the first
   * thing to disappear off the right edge. Event type and guest count now
   * ride along under the request they describe rather than each claiming
   * a column of their own, and only the one action that moves the inquiry
   * forward stays as a button. Reject, Archive and the full record live
   * in the row menu next to it; nothing was dropped, and the whole row
   * still opens the drawer on click.
   */
  const columns = [
    {
      key: "id",
      header: "Inquiry",
      width: "132px",
      render: (r) => (
        <div className="min-w-0">
          <span className="block font-mono text-xs font-bold text-primary">{r.id}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
            {r.createdAt
              ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground" title={r.customer}>
            {r.customer}
          </p>
          <p className="truncate text-xs text-muted-foreground/70" title={r.email}>
            {r.email || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "booking",
      header: "Request",
      render: (r) => (
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground" title={r.booking}>
              {r.booking}
            </span>
            <span
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                BOOKING_TYPE_STYLES[r.bookingType] ||
                BOOKING_TYPE_STYLES[BOOKING_TYPES.CUSTOM]
              }`}
            >
              {r.bookingTypeLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
            {r.eventType} · {r.guests} pax
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Event date",
      width: "126px",
      className: "text-xs text-foreground whitespace-nowrap",
    },
    { key: "status", header: "Status", width: "148px", render: (r) => <Badge status={r.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "168px",
      stopRowClick: true,
      render: (r) => {
        // Archived rows offer restore only. "Edit Quote" is gone because a
        // quotation-stage record is no longer on this page at all.
        if (isArchived(r)) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              {r.archived && (
                <Btn variant="secondary" size="sm" onClick={() => handleArchive(r, false)}>
                  <ArchiveRestore size={13} /> Restore
                </Btn>
              )}
              <RowActionsMenu
                actions={[
                  { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(r) },
                ]}
              />
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Brand blue, because creating the quote is the one thing this
                queue exists to get done. Everything else on the row is a
                way of clearing it, not advancing it. */}
            <Btn
              variant="primary"
              size="sm"
              onClick={() => navigate(`/admin/quotes/${r._id}/details`)}
            >
              <Plus size={13} /> Create Quote
            </Btn>
            <RowActionsMenu
              actions={[
                { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(r) },
                { key: "archive", label: "Archive inquiry", icon: Archive, onSelect: () => setArchiveTarget(r) },
                { key: "div", divider: true },
                {
                  key: "reject",
                  label: "Reject inquiry",
                  icon: XCircle,
                  destructive: true,
                  onSelect: () => setCancelTarget(r),
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-background min-h-screen">
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

        {archiveTarget && (
          <ConfirmDialog
            title={`Archive inquiry ${archiveTarget.id}?`}
            message="It leaves the active queue and moves to Archive. Nothing is deleted, and you can restore it from there at any time."
            confirmText="Archive inquiry"
            cancelText="Keep active"
            onConfirm={() => handleArchive(archiveTarget)}
            onCancel={() => setArchiveTarget(null)}
          />
        )}

        {bulkCancelConfirm && (
          <ConfirmDialog
            title={`Archive ${cancellableSelected.length} inquir${cancellableSelected.length === 1 ? "y" : "ies"}?`}
            message="They leave the active queue and move to Archive. Nothing is deleted, and you can restore them from there."
            confirmText="Archive"
            cancelText="Keep active"
            onConfirm={() => handleBulkArchive(true)}
            onCancel={() => setBulkCancelConfirm(false)}
          />
        )}

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">
              Inquiries
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Review incoming customer requests and prepare their quotation. Records move to Quotations once a quote is issued.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export</Btn>
          </div>
        </div>

        {/* Top KPI Metric Cards — the same card pattern as Reservations and
            Ocular Visits, so the section reads as part of the set. Four
            counts that map to a decision, not metrics for their own sake. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Active Inquiries</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.active}</h3>
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pending Review</span>
              <h3 className="text-xl font-bold text-amber-900 mt-0.5">{kpiStats.pending}</h3>
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Under Review</span>
              <h3 className="text-xl font-bold text-indigo-900 mt-0.5">{kpiStats.underReview}</h3>
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Archived</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.archived}</h3>
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
                  key: "archive",
                  label: `Archive${cancellableSelected.length ? ` (${cancellableSelected.length})` : ""}`,
                  disabled: cancellableSelected.length === 0,
                  onSelect: () => setBulkCancelConfirm(true),
                },
                {
                  key: "restore",
                  label: `Restore${restorableSelected.length ? ` (${restorableSelected.length})` : ""}`,
                  disabled: restorableSelected.length === 0,
                  onSelect: () => handleBulkArchive(false),
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
                        <label className="text-xs font-semibold text-foreground block mb-1">From</label>
                        <input
                          type="date"
                          value={draftDateRange.from}
                          onChange={(e) => setDraftDateRange((d) => ({ ...d, from: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">To</label>
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
            minWidth="860px"
            pinLastColumn
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
                {isArchived(drawerRow) ? (
                  drawerRow.archived && (
                    <Btn variant="secondary" size="sm" onClick={() => handleArchive(drawerRow, false)}>
                      <ArchiveRestore size={13} /> Restore
                    </Btn>
                  )
                ) : (
                  <>
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const row = drawerRow;
                        setDrawerRow(null);
                        setCancelTarget(row);
                      }}
                    >
                      <XCircle size={13} /> Reject
                    </Btn>
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const row = drawerRow;
                        setDrawerRow(null);
                        setArchiveTarget(row);
                      }}
                    >
                      <Archive size={13} /> Archive
                    </Btn>
                  </>
                )}
                <Btn variant="primary" size="sm" onClick={() => navigate(`/admin/quotes/${drawerRow._id}/details`)}>
                  Open full details
                </Btn>
              </>
            )
          }
        >
          {drawerRow && (
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Event Date" value={drawerRow.date} />
              <DrawerField label="Event Type" value={drawerRow.eventType} />
              <DrawerField label="Booking" value={drawerRow.booking} />
              <DrawerField label="Booking type" value={drawerRow.bookingTypeLabel} />
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
