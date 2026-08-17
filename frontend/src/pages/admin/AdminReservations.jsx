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
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import BookingRevisionHistory from "../../components/booking/BookingRevisionHistory";

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

  // Independent Price Filters (Package vs Add-ons)
  const [priceFilter, setPriceFilter] = useState({ pkgMin: "", pkgMax: "", addonMin: "", addonMax: "" });
  const [draftPriceFilter, setDraftPriceFilter] = useState({ pkgMin: "", pkgMax: "", addonMin: "", addonMax: "" });

  // "pending deposit" is no longer a tab: a quotation-backed booking waiting on
  // its deposit belongs to Quotations, and the only unpaid bookings that reach
  // this page are admin-created ones, which are called out on the row instead.
  const statuses = ["all", "confirmed", "revised", "change requests", "completed", "cancelled"];

  // Bookings the admin created directly have no quotation behind them, so they
  // have nowhere to wait in Quotations. Inquiries are the only place that
  // records the link (Inquiry.converted_booking_id), so they are loaded here
  // purely to tell the two origins apart.
  const [quotationBackedIds, setQuotationBackedIds] = useState(() => new Set());

  const loadData = () => {
    setLoading(true);
    Promise.all([
      AdminAPI.getBookings(),
      AdminAPI.getInquiries().catch(() => ({ data: [] })),
    ])
      .then(([bookingRes, inquiryRes]) => {
        setBookings(bookingRes.data || []);
        setQuotationBackedIds(
          new Set(
            (inquiryRes.data || [])
              .filter((i) => i.converted_booking_id)
              .map((i) => String(i.converted_booking_id?._id || i.converted_booking_id)),
          ),
        );
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

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Map API fields to table columns with independent Package & Add-ons price calculations
  const formattedBookings = useMemo(() => {
    return bookings
      .filter((b) => !["inquiry", "quote_sent", "customer_accepted"].includes(b.status))
      .map((b) => {
        const hasChangeRequest = b.change_request?.status === "pending" && Boolean(b.change_request?.message?.trim());
        const mappedStatus = hasChangeRequest ? "change requests" : b.status;

        // Independent Add-ons Price Calculation
        const serviceItemsTotal = (b.service_items || []).reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
        const additionalChargesTotal = (b.additional_charges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const menuItemsAddonTotal = (b.menu_items || []).reduce((sum, i) => sum + (Number(i.price) || 0), 0);
        const addOnsPrice = serviceItemsTotal + additionalChargesTotal + menuItemsAddonTotal;

        // Independent Base Package Price Calculation
        let basePackagePrice = 0;
        if (b.package_id) {
          if (b.package_id.package_type === "Event Setup Only") {
            basePackagePrice = Number(b.package_id.setup_price || 0);
          } else {
            basePackagePrice = Number(b.package_id.price_per_guest || 0) * Number(b.guest_count || 0);
          }
        }
        if (basePackagePrice === 0 && (b.total_price || 0) > 0) {
          basePackagePrice = Math.max(0, Number(b.total_price || 0) + Number(b.discount_amount || 0) - addOnsPrice);
        }

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
          isRevised: Boolean(b.is_revised),
          revisionCount: b.revision_count || 0,
          coordinator: b.event_manager_id?.full_name || "Unassigned",
          depositPaid: ["deposit_paid", "fully_paid"].includes(b.payment_status),
          quotationBacked: quotationBackedIds.has(String(b._id)),
          basePackagePrice,
          addOnsPrice,
          discountAmount: Number(b.discount_amount || 0),
          total: Number(b.total_price || 0),
          rawBooking: b
        };
      });
  }, [bookings, quotationBackedIds]);

  /**
   * Reservations is confirmed bookings only.
   *
   * A booking earns its place here once the deposit is in (payment_status
   * leaves "pending"), or once it is historic (completed/cancelled), which is
   * what the Completed and Cancelled tabs are for. A quotation-backed booking
   * still waiting on its deposit is deliberately absent — it is showing in
   * Quotations, and having it in both was the duplication this pass removes.
   *
   * The one exception is a booking the admin created directly. It has no
   * quotation to wait behind, so it stays visible here and is flagged on the
   * row rather than disappearing from the panel entirely.
   */
  const inScope = useMemo(() => {
    return formattedBookings.filter((r) => {
      const historic = ["completed", "cancelled"].includes(r.rawStatus.toLowerCase());
      return r.depositPaid || historic || !r.quotationBacked;
    });
  }, [formattedBookings]);

  // Compute Top KPI Metrics
  const kpiStats = useMemo(() => {
    const total = inScope.length;
    const confirmed = inScope.filter((r) => ["confirmed", "Confirmed", "Converted to Booking"].includes(r.rawStatus)).length;
    // Now means "admin-created and not yet paid" — the only unpaid bookings
    // this section still holds.
    const depositPending = inScope.filter((r) => !r.depositPaid && !r.quotationBacked).length;
    const changeRequests = inScope.filter((r) => r.hasChangeRequest).length;

    return { total, confirmed, depositPending, changeRequests };
  }, [inScope]);

  const filtered = useMemo(() => {
    return inScope.filter((r) => {
      const matchStatus = filter === "all" || 
        (filter === "revised" && r.isRevised) ||
        r.status.toLowerCase() === filter.toLowerCase() || 
        (filter === "confirmed" && ["confirmed", "converted to booking"].includes(r.rawStatus.toLowerCase()));
      const matchSearch = !search || 
        r.customer.toLowerCase().includes(search.toLowerCase()) || 
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.eventType.toLowerCase().includes(search.toLowerCase());

      const matchDateFrom = !dateRange.from || (r.rawDate && r.rawDate >= new Date(dateRange.from));
      const matchDateTo = !dateRange.to || (r.rawDate && r.rawDate <= new Date(`${dateRange.to}T23:59:59`));

      // Independent Price Filters (Base Package vs Add-ons)
      const matchPkgMin = !priceFilter.pkgMin || r.basePackagePrice >= Number(priceFilter.pkgMin);
      const matchPkgMax = !priceFilter.pkgMax || r.basePackagePrice <= Number(priceFilter.pkgMax);

      const matchAddonMin = !priceFilter.addonMin || r.addOnsPrice >= Number(priceFilter.addonMin);
      const matchAddonMax = !priceFilter.addonMax || r.addOnsPrice <= Number(priceFilter.addonMax);

      return matchStatus && matchSearch && matchDateFrom && matchDateTo && matchPkgMin && matchPkgMax && matchAddonMin && matchAddonMax;
    });
  }, [inScope, filter, search, dateRange, priceFilter]);

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
      render: (r) => <span className="text-xs font-mono font-bold text-primary">{r.id}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div>
          <p className="text-sm font-semibold text-foreground">{r.customer}</p>
          <p className="text-xs text-muted-foreground/70">{r.email}</p>
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
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Badge status={r.depositStatus} />
          {/* Only reachable for admin-created bookings now — everything else
              on this page has already paid. Says why it is here unpaid. */}
          {!r.depositPaid && !r.quotationBacked && (
            <span className="text-[10px] font-medium text-slate-500">Created by admin</span>
          )}
        </div>
      ) 
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
      <div className="p-6 space-y-6 bg-background min-h-screen">
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
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">
              Reservations Management
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Track customer bookings, process event confirmations, and manage scheduled catering reservations.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export</Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("/admin/bookings/new")}><Plus size={13} /> New Booking</Btn>
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
                    label="Filters"
                    activeCount={
                      (dateRange.from || dateRange.to ? 1 : 0) +
                      (priceFilter.pkgMin || priceFilter.pkgMax ? 1 : 0) +
                      (priceFilter.addonMin || priceFilter.addonMax ? 1 : 0)
                    }
                    onApply={() => {
                      setDateRange(draftDateRange);
                      setPriceFilter(draftPriceFilter);
                    }}
                    onClear={() => {
                      setDraftDateRange({ from: "", to: "" });
                      setDateRange({ from: "", to: "" });
                      setDraftPriceFilter({ pkgMin: "", pkgMax: "", addonMin: "", addonMax: "" });
                      setPriceFilter({ pkgMin: "", pkgMax: "", addonMin: "", addonMax: "" });
                    }}
                  >
                    <div className="space-y-4 w-64 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1.5 text-[10px]">Date Filter</span>
                        <div className="space-y-2">
                          <div>
                            <label className="text-slate-500 block mb-0.5">From Date</label>
                            <input
                              type="date"
                              value={draftDateRange.from}
                              onChange={(e) => setDraftDateRange((d) => ({ ...d, from: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block mb-0.5">To Date</label>
                            <input
                              type="date"
                              value={draftDateRange.to}
                              onChange={(e) => setDraftDateRange((d) => ({ ...d, to: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="font-bold text-amber-900 uppercase tracking-wider block mb-1.5 text-[10px]">Base Package Price Filter</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-slate-500 block mb-0.5">Min Pkg ₱</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={draftPriceFilter.pkgMin}
                              onChange={(e) => setDraftPriceFilter((d) => ({ ...d, pkgMin: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block mb-0.5">Max Pkg ₱</label>
                            <input
                              type="number"
                              placeholder="50000"
                              value={draftPriceFilter.pkgMax}
                              onChange={(e) => setDraftPriceFilter((d) => ({ ...d, pkgMax: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="font-bold text-indigo-900 uppercase tracking-wider block mb-1.5 text-[10px]">Add-ons Price Filter</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-slate-500 block mb-0.5">Min Addon ₱</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={draftPriceFilter.addonMin}
                              onChange={(e) => setDraftPriceFilter((d) => ({ ...d, addonMin: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block mb-0.5">Max Addon ₱</label>
                            <input
                              type="number"
                              placeholder="20000"
                              value={draftPriceFilter.addonMax}
                              onChange={(e) => setDraftPriceFilter((d) => ({ ...d, addonMax: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </FilterPopover>
                }
              />
              {(dateRange.from || dateRange.to || priceFilter.pkgMin || priceFilter.pkgMax || priceFilter.addonMin || priceFilter.addonMax) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {(dateRange.from || dateRange.to) && (
                    <FilterChip
                      label={`Date: ${dateRange.from || "…"} – ${dateRange.to || "…"}`}
                      onRemove={() => {
                        setDateRange({ from: "", to: "" });
                        setDraftDateRange({ from: "", to: "" });
                      }}
                    />
                  )}
                  {(priceFilter.pkgMin || priceFilter.pkgMax) && (
                    <FilterChip
                      label={`Pkg Price: ₱${priceFilter.pkgMin || "0"} – ₱${priceFilter.pkgMax || "∞"}`}
                      onRemove={() => {
                        setPriceFilter((p) => ({ ...p, pkgMin: "", pkgMax: "" }));
                        setDraftPriceFilter((p) => ({ ...p, pkgMin: "", pkgMax: "" }));
                      }}
                    />
                  )}
                  {(priceFilter.addonMin || priceFilter.addonMax) && (
                    <FilterChip
                      label={`Add-ons: ₱${priceFilter.addonMin || "0"} – ₱${priceFilter.addonMax || "∞"}`}
                      onRemove={() => {
                        setPriceFilter((p) => ({ ...p, addonMin: "", addonMax: "" }));
                        setDraftPriceFilter((p) => ({ ...p, addonMin: "", addonMax: "" }));
                      }}
                    />
                  )}
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
                <Btn variant="primary" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
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
                <DrawerField label="Base Package Subtotal" value={fmt(drawerRow.basePackagePrice)} />
                <DrawerField label="Add-ons Subtotal" value={fmt(drawerRow.addOnsPrice)} />
                <DrawerField label="Grand Total Price" value={fmt(drawerRow.total)} full />
                <DrawerField label="Contact Email" value={drawerRow.email || "—"} full />
                <DrawerField label="Contact Phone" value={drawerRow.phone || "—"} full />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <BookingRevisionHistory booking={drawerRow.rawBooking} />
              </div>
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}
