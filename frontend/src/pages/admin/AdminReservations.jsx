import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Calendar, 
  Clock, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  Plus, 
  Eye, 
  Check, 
  Edit3, 
  XCircle, 
  X,
  Search,
  RefreshCw,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  MapPin,
  Sparkles,
  Info,
  DollarSign,
  Package,
  Sliders,
  Tag,
  AlertTriangle,
  History,
  MoreHorizontal,
  Archive,
  Download
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Badge from "../../components/admin/ui/Badge";
import ConflictModal from "../../components/admin/ui/ConflictModal";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import BookingRevisionHistory from "../../components/booking/BookingRevisionHistory";
import { menuLineTotal } from "../../utils/quotationPricing";

/**
 * Format currency to PHP string (e.g. ₱12,500.00)
 */
const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format date cleanly into readable strings (e.g. "Sep 8, 2026")
 */
const formatDateClean = (dateVal) => {
  if (!dateVal) return "TBA";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/**
 * Relative time helper (e.g. "2h ago")
 */
const getRelativeTime = (dateStr) => {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
};

export default function AdminReservations() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  // State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quotationBackedIds, setQuotationBackedIds] = useState(() => new Set());

  // Filter & Search
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [filter, setFilter] = useState("all"); // 'all' | 'upcoming' | 'this_week' | 'completed' | 'cancelled'
  const [sortBy, setSortBy] = useState("event_date"); // 'event_date' | 'newest' | 'total_amount' | 'guests'

  // Selection & Right-Side Panel
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview"); // 'overview' | 'payments' | 'changes' | 'timeline'
  const [selectedIds, setSelectedIds] = useState([]);
  const hasInitializedRef = useRef(false);

  // Dialog targets
  const [cancelTarget, setCancelTarget] = useState(null);
  const [bulkCancelConfirm, setBulkCancelConfirm] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [approvedId, setApprovedId] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 7;

  // Load Data
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

  // Map API fields to structured table & detail models
  const formattedBookings = useMemo(() => {
    return bookings
      .filter((b) => !["inquiry", "quote_sent", "customer_accepted"].includes(b.status))
      .map((b) => {
        const hasChangeRequest = b.change_request?.status === "pending" && Boolean(b.change_request?.message?.trim());
        const mappedStatus = hasChangeRequest ? "change requests" : b.status;

        // Independent Add-ons Price Calculation
        const serviceItemsTotal = (b.service_items || []).reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
        const additionalChargesTotal = (b.additional_charges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const menuItemsAddonTotal = (b.menu_items || []).reduce((sum, i) => sum + menuLineTotal(i, b.guest_count), 0);
        const addOnsPrice = serviceItemsTotal + additionalChargesTotal + menuItemsAddonTotal;

        // Base Package Calculation
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

        const total = Number(b.total_price || 0);
        const depositPaidBool = ["deposit_paid", "fully_paid"].includes(b.payment_status);
        const isFullyPaid = b.payment_status === "fully_paid";

        // Payment Details Calculation
        const depositAmount = Number(b.deposit_amount || (total * 0.5));
        const paidAmount = isFullyPaid ? total : depositPaidBool ? depositAmount : 0;
        const remainingBalance = Math.max(0, total - paidAmount);

        const venueFull = [b.venue_type, b.street, b.barangay, b.municipality, b.province].filter(Boolean).join(", ") || "Venue TBA";

        return {
          _id: b._id,
          id: b.reference || `BK-${b._id.substring(b._id.length - 6).toUpperCase()}`,
          customer: b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || "Customer",
          email: b.customer_id?.email || b.contact_email || "N/A",
          phone: b.contact_phone || b.customer_id?.phone || "N/A",
          eventType: b.event_type || "Catering Event",
          pkg: b.package_id?.name || "Custom Catering",
          guests: b.guest_count || 0,
          dateFormatted: b.event_date ? formatDateClean(b.event_date) : "TBA",
          startTime: b.start_time || "TBA",
          rawDate: b.event_date ? new Date(b.event_date) : null,
          venue: b.venue_type || b.municipality || "TBA",
          venueFull,
          status: mappedStatus,
          rawStatus: b.status,
          paymentStatus: b.payment_status || "unpaid",
          depositStatus: depositPaidBool ? "Paid" : "Pending",
          finalPaymentStatus: isFullyPaid ? "Paid" : "Pending",
          hasChangeRequest,
          changeNote: b.change_request?.message || "",
          isRevised: Boolean(b.is_revised),
          revisionCount: b.revision_count || 0,
          coordinator: b.event_manager_id?.full_name || "Unassigned",
          depositPaid: depositPaidBool,
          isFullyPaid,
          quotationBacked: quotationBackedIds.has(String(b._id)),
          basePackagePrice,
          addOnsPrice,
          discountAmount: Number(b.discount_amount || 0),
          total,
          depositAmount,
          paidAmount,
          remainingBalance,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt || b.createdAt,
          updatedRelative: getRelativeTime(b.updatedAt || b.createdAt),
          rawBooking: b
        };
      });
  }, [bookings, quotationBackedIds]);

  // In-scope active reservations
  const inScope = useMemo(() => {
    return formattedBookings.filter((r) => {
      const historic = ["completed", "cancelled"].includes(r.rawStatus.toLowerCase());
      return r.depositPaid || historic || !r.quotationBacked;
    });
  }, [formattedBookings]);

  // 4 Key Operational Metric KPI Cards
  const kpiStats = useMemo(() => {
    const total = inScope.length;
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    const upcomingThisWeek = inScope.filter((r) => {
      if (!r.rawDate) return false;
      const notDone = !["completed", "cancelled"].includes(r.rawStatus.toLowerCase());
      return notDone && r.rawDate >= now && r.rawDate <= next7Days;
    }).length;

    const confirmedPaid = inScope.filter((r) => r.depositPaid && !["completed", "cancelled"].includes(r.rawStatus.toLowerCase())).length;
    const changeRequests = inScope.filter((r) => r.hasChangeRequest).length;

    return { total, upcomingThisWeek, confirmedPaid, changeRequests };
  }, [inScope]);

  // Reservation Filter Tabs & Search
  const filteredBookings = useMemo(() => {
    const now = new Date();
    const next7 = new Date();
    next7.setDate(now.getDate() + 7);

    return inScope.filter((r) => {
      const statusNorm = r.rawStatus.toLowerCase();

      // Filter Tabs Logic
      if (filter === "upcoming") {
        if (statusNorm === "completed" || statusNorm === "cancelled") return false;
        if (r.rawDate && r.rawDate < now) return false;
      } else if (filter === "this_week") {
        if (statusNorm === "completed" || statusNorm === "cancelled") return false;
        if (!r.rawDate || r.rawDate < now || r.rawDate > next7) return false;
      } else if (filter === "completed") {
        if (statusNorm !== "completed") return false;
      } else if (filter === "cancelled") {
        if (statusNorm !== "cancelled") return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCustomer = r.customer.toLowerCase().includes(q);
        const matchEmail = r.email.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        const matchEvent = r.eventType.toLowerCase().includes(q);
        const matchVenue = r.venue.toLowerCase().includes(q);
        const matchPkg = r.pkg.toLowerCase().includes(q);
        if (!matchCustomer && !matchEmail && !matchId && !matchEvent && !matchVenue && !matchPkg) {
          return false;
        }
      }

      return true;
    });
  }, [inScope, filter, search]);

  // Sort Logic
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      if (sortBy === "event_date") {
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return a.rawDate - b.rawDate;
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "total_amount") {
        return b.total - a.total;
      }
      if (sortBy === "guests") {
        return b.guests - a.guests;
      }
      return 0;
    });
  }, [filteredBookings, sortBy]);

  // Auto-select initial booking ONCE on initial load
  useEffect(() => {
    if (!hasInitializedRef.current && sortedBookings.length > 0) {
      setSelectedBooking(sortedBookings[0]);
      hasInitializedRef.current = true;
    }
  }, [sortedBookings]);

  // Pagination calculation
  const totalItems = sortedBookings.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBookings.slice(start, start + pageSize);
  }, [sortedBookings, page, pageSize]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filter, sortBy]);

  // Handlers
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
        if (selectedBooking && selectedBooking._id === id) {
          setSelectedBooking(null);
        }
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to cancel booking", "error"));
  };

  const cancellableSelected = selectedIds.filter((id) => {
    const r = sortedBookings.find((x) => x._id === id);
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

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRows.map((r) => r._id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-3 bg-background min-h-[calc(100vh-4rem)] p-1.5 sm:p-2.5">
        
        {/* Modals */}
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
            title="Cancel Reservation"
            message={`Are you sure you want to cancel booking ${cancelTarget.id}? This will update the reservation status.`}
            confirmText="Yes, Cancel Booking"
            confirmVariant="danger"
            onConfirm={() => handleCancel(cancelTarget._id)}
            onCancel={() => setCancelTarget(null)}
          />
        )}

        {bulkCancelConfirm && (
          <ConfirmDialog
            title="Cancel Selected Bookings"
            message={`Are you sure you want to cancel ${cancellableSelected.length} selected reservation${cancellableSelected.length === 1 ? "" : "s"}?`}
            confirmText="Yes, Cancel Selected"
            confirmVariant="danger"
            onConfirm={handleBulkCancel}
            onCancel={() => setBulkCancelConfirm(false)}
          />
        )}

        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Reservations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage confirmed bookings, process event updates, and track payment balances for scheduled catering reservations.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
              title="Refresh reservations data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} /> Refresh
            </button>
            <button
              onClick={() => navigate("/admin/bookings/new")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Booking
            </button>
          </div>
        </div>

        {/* Top-Level Outer Layout: Left Table Column + Right Summary Panel (Starts Level with KPI Section) */}
        <div className="flex flex-col xl:flex-row gap-3.5 items-start relative">
          
          {/* Main Left Column (Expands to 100% width when panel is closed) */}
          <div className="flex-1 min-w-0 space-y-3.5 w-full">
            
            {/* 4 OPERATIONAL KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Total Active Bookings */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    TOTAL RESERVATIONS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tracking-tight text-foreground">{kpiStats.total}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                      <ArrowUpRight size={10} /> Active
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">In-scope confirmed records</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50">
                  <Calendar size={13} />
                </div>
              </div>

              {/* Card 2: Upcoming This Week */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    UPCOMING THIS WEEK
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{kpiStats.upcomingThisWeek}</span>
                  <p className="text-[10px] text-muted-foreground">Scheduled in next 7 days</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50">
                  <Clock size={13} />
                </div>
              </div>

              {/* Card 3: Deposit Paid / Confirmed */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    DEPOSIT PAID
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{kpiStats.confirmedPaid}</span>
                  <p className="text-[10px] text-muted-foreground">Confirmed & ready for event</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/50">
                  <CheckCircle2 size={13} />
                </div>
              </div>

              {/* Card 4: Change Requests */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    CHANGE REQUESTS
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{kpiStats.changeRequests}</span>
                  <p className="text-[10px] text-muted-foreground">Pending customer updates</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <Send size={13} />
                </div>
              </div>
            </div>

            {/* Reservation Search & Filter Controls Bar */}
            <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 shadow-2xs">
              <div className="flex flex-wrap items-end gap-2.5 text-xs">
                {/* Search Input Field */}
                <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Reservations</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={13} />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search booking ref, customer, event, venue..."
                      className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-8"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Reservation Status Filter Dropdown */}
                <div className="flex flex-col gap-1 min-w-[150px] shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reservation Scope</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="all">All Bookings</option>
                    <option value="upcoming">Upcoming Events</option>
                    <option value="this_week">Scheduled This Week</option>
                    <option value="completed">Completed Events</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Clear Filter Button */}
                {(search || filter !== "all") && (
                  <div className="flex flex-col gap-1 shrink-0 justify-end">
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                      }}
                      className="h-8 px-3 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X size={13} /> Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Status Tabs Bar & Sort By Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: "all", label: "All Bookings" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "this_week", label: "This Week" },
                  { id: "completed", label: "Completed" },
                  { id: "cancelled", label: "Cancelled" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      filter === tab.id
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <span className="text-muted-foreground">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-background border border-input rounded-lg px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-7"
                >
                  <option value="event_date">Event Date (Soonest)</option>
                  <option value="newest">Created Date (Newest)</option>
                  <option value="total_amount">Total Amount (High-Low)</option>
                  <option value="guests">Guest Count (High-Low)</option>
                </select>
              </div>
            </div>

            {/* Reservations Table */}
            {loading ? (
              <div className="bg-card border border-border/70 rounded-xl p-10 text-center text-xs text-muted-foreground">
                <RefreshCw className="animate-spin mx-auto mb-2 text-primary" size={18} />
                Loading reservations data...
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="bg-card border border-border/70 rounded-xl p-10 text-center text-xs text-muted-foreground space-y-2">
                <AlertCircle className="mx-auto text-muted-foreground/60" size={22} />
                <p className="font-semibold text-foreground">No reservation records found</p>
                <p>Try adjusting your search query or filter options.</p>
                {(search || filter !== "all") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                    className="text-primary hover:underline font-medium text-xs cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-2xs">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 pl-2.5 pr-1 w-7">
                          <input
                            type="checkbox"
                            checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length}
                            onChange={toggleSelectAll}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[110px]">BOOKING ID</th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[130px]">CUSTOMER</th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[130px]">EVENT & PACKAGE</th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[120px]">EVENT DATE</th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[100px]">TOTAL COST</th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[100px]">STATUS</th>
                        <th className="py-2.5 px-2.5 font-semibold min-w-[100px]">DEPOSIT</th>
                        <th className="py-2.5 pr-3 pl-1 text-right font-semibold shrink-0 whitespace-nowrap min-w-[130px]">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {paginatedRows.map((r) => {
                        const isSelected = selectedBooking?._id === r._id;
                        return (
                          <tr
                            key={r._id}
                            onClick={() => setSelectedBooking(r)}
                            className={`group cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary/10 border-l-2 border-l-primary"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-2.5 pl-2.5 pr-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(r._id)}
                                onChange={() => toggleSelectRow(r._id)}
                                className="rounded border-input text-primary focus:ring-primary"
                              />
                            </td>

                            {/* Booking ID */}
                            <td className="py-2.5 px-2.5 font-mono font-bold text-primary whitespace-nowrap">
                              {r.id}
                            </td>

                            {/* Customer (Clean text without avatar circle) */}
                            <td className="py-2.5 px-2.5 min-w-[130px]">
                              <div className="min-w-0 space-y-0.5">
                                <p className="font-bold text-foreground text-xs truncate max-w-[140px]">{r.customer}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{r.email || r.phone}</p>
                              </div>
                            </td>

                            {/* Event & Package */}
                            <td className="py-2.5 px-2.5">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground text-xs truncate max-w-[140px]">{r.eventType}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{r.pkg}</p>
                              </div>
                            </td>

                            {/* Event Date */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <div>
                                <p className="font-semibold text-foreground text-xs">{r.dateFormatted}</p>
                                <p className="text-[10px] text-muted-foreground">{r.startTime || "TBA"} · {r.guests} pax</p>
                              </div>
                            </td>

                            {/* Total Cost */}
                            <td className="py-2.5 px-2.5 font-bold font-mono text-foreground text-xs whitespace-nowrap">
                              {fmt(r.total)}
                            </td>

                            {/* Status Badge */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <Badge status={r.status} />
                            </td>

                            {/* Deposit Status Badge */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-0.5">
                                <Badge status={r.depositStatus} />
                                {!r.depositPaid && !r.quotationBacked && (
                                  <span className="text-[9.5px] font-medium text-muted-foreground">Admin created</span>
                                )}
                              </div>
                            </td>

                            {/* Protected Actions Column */}
                            <td className="py-2.5 pr-3 pl-1 text-right whitespace-nowrap shrink-0 min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => navigate(`/admin/bookings/${r._id}/details`)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                                  title="Open Full Booking Page"
                                >
                                  <Edit3 size={11} /> Open Details
                                </button>
                                <button
                                  onClick={() => setSelectedBooking(r)}
                                  title="View Reservation Summary"
                                  aria-label="View Reservation Summary"
                                  className="p-1.5 rounded-lg border border-input bg-background hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Pagination */}
                <div className="px-3 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-6 h-6 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                          page === p ? "bg-primary text-primary-foreground shadow-2xs" : "border border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)} of {totalItems} reservations
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right-Side Reservation Summary Card (Level with KPI section) */}
          {selectedBooking && (
            <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-card border border-border/70 rounded-xl p-3.5 space-y-3.5 shadow-sm text-xs sticky top-3 max-h-[calc(100vh-2rem)] overflow-y-auto">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Reservation Details</h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {selectedBooking.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Close details panel"
                  aria-label="Close details panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Customer Info Card Header */}
              <div className="flex items-start justify-between gap-2.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-bold text-foreground text-xs truncate">{selectedBooking.customer}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{selectedBooking.phone}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{selectedBooking.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge status={selectedBooking.status} />
                  <Badge status={selectedBooking.depositStatus} />
                </div>
              </div>

              {/* UPPER SECTION: Quick Action Controls */}
              <div className="bg-card border border-border/70 rounded-xl p-2.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admin Actions</span>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => navigate(`/admin/bookings/${selectedBooking._id}/details`)}
                  className="w-full py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <Edit3 size={13} /> Open Full Booking Page
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {(selectedBooking.rawStatus === "pending deposit" || selectedBooking.hasChangeRequest) && (
                    <button
                      onClick={() => handleApprove(selectedBooking._id)}
                      className="py-1 px-2 rounded-md border border-emerald-300 bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      title="Approve / Confirm Reservation"
                    >
                      <Check size={12} /> Confirm
                    </button>
                  )}
                  {selectedBooking.rawStatus !== "cancelled" && selectedBooking.rawStatus !== "completed" && (
                    <button
                      onClick={() => {
                        const row = selectedBooking;
                        setSelectedBooking(null);
                        setCancelTarget(row);
                      }}
                      className="py-1 px-2 rounded-md border border-input bg-background font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      title="Cancel Booking"
                    >
                      <XCircle size={12} /> Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* DEDICATED PAYMENT SUMMARY BOX */}
              <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <CreditCard size={11} className="text-primary" /> Payment Summary
                  </h5>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-tight ${
                    selectedBooking.isFullyPaid
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : selectedBooking.depositPaid
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {selectedBooking.isFullyPaid ? "Fully Paid" : selectedBooking.depositPaid ? "Deposit Paid" : "Unpaid"}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold font-mono text-foreground">{fmt(selectedBooking.total)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Deposit Paid</span>
                    <span className="font-semibold font-mono text-emerald-600">
                      {selectedBooking.depositPaid ? fmt(selectedBooking.paidAmount) : "₱0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/50 text-xs font-bold">
                    <span className="text-foreground">Remaining Balance</span>
                    <span className={`font-mono ${selectedBooking.remainingBalance > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {fmt(selectedBooking.remainingBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs (Overview | Financials | Change Requests | Timeline) */}
              <div className="flex border-b border-border text-[11px] font-semibold">
                <button
                  onClick={() => setDrawerTab("overview")}
                  className={`pb-1.5 px-2 border-b-2 transition-colors ${
                    drawerTab === "overview" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDrawerTab("payments")}
                  className={`pb-1.5 px-2 border-b-2 transition-colors ${
                    drawerTab === "payments" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  Financials
                </button>
                <button
                  onClick={() => setDrawerTab("timeline")}
                  className={`pb-1.5 px-2 border-b-2 transition-colors ${
                    drawerTab === "timeline" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  History
                </button>
              </div>

              {/* Tab 1: Overview */}
              {drawerTab === "overview" && (
                <div className="space-y-3 text-xs">
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Event Specifications</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <Sparkles size={13} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Event Type</p>
                          <p className="font-semibold text-foreground">{selectedBooking.eventType}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar size={13} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Date & Time</p>
                          <p className="font-semibold text-foreground">{selectedBooking.dateFormatted} · {selectedBooking.startTime}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Venue</p>
                          <p className="font-semibold text-foreground">{selectedBooking.venueFull}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users size={13} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Guest Count</p>
                          <p className="font-semibold text-foreground">{selectedBooking.guests} guests</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Package size={13} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Selected Package</p>
                          <p className="font-semibold text-foreground">{selectedBooking.pkg}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.hasChangeRequest && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-amber-900 flex items-center gap-1">
                        <AlertTriangle size={13} /> Pending Customer Change Request
                      </p>
                      <p className="text-amber-800 text-[11px] pl-4">{selectedBooking.changeNote}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Financials */}
              {drawerTab === "payments" && (
                <div className="space-y-3 text-xs">
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Price Breakdown</h5>
                    <div className="space-y-1.5 divide-y divide-border/60">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Base Package</span>
                        <span className="font-mono font-semibold">{fmt(selectedBooking.basePackagePrice)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Add-ons Subtotal</span>
                        <span className="font-mono font-semibold">{fmt(selectedBooking.addOnsPrice)}</span>
                      </div>
                      {selectedBooking.discountAmount > 0 && (
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Discount Applied</span>
                          <span className="font-mono text-emerald-600 font-semibold">-{fmt(selectedBooking.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 font-bold text-sm">
                        <span>Grand Total</span>
                        <span className="font-mono text-primary">{fmt(selectedBooking.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Timeline */}
              {drawerTab === "timeline" && (
                <div className="bg-card border border-border/70 rounded-xl p-3 space-y-3 shadow-2xs text-xs">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Booking Lifecycle</h5>
                  <BookingRevisionHistory booking={selectedBooking.rawBooking} />
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}
