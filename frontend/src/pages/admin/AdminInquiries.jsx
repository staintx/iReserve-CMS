import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Calendar, MapPin, Users, Mail, Phone, Clock, Eye, 
  ChevronRight, Plus, X, MoreHorizontal, LayoutList, LayoutGrid,
  FileText, Send, Archive, ArchiveRestore, AlertCircle,
  Sparkles, RefreshCw, ArrowUpRight, ChevronLeft, Check, Info,
  AlertTriangle, Tag, Package, Sliders
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Badge from "../../components/admin/ui/Badge";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { bookingIdentity } from "../../lib/specialOffers";

/**
 * Avatar Initials component with deterministic background color
 */
const AvatarInitials = ({ name, className = "w-8 h-8 text-[11px]" }) => {
  const getInitials = (str) => {
    if (!str) return "IN";
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return str.substring(0, 2).toUpperCase();
  };

  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200/60",
    "bg-indigo-100 text-indigo-700 border-indigo-200/60",
    "bg-purple-100 text-purple-700 border-purple-200/60",
    "bg-emerald-100 text-emerald-700 border-emerald-200/60",
    "bg-amber-100 text-amber-700 border-amber-200/60",
    "bg-teal-100 text-teal-700 border-teal-200/60",
  ];

  const hash = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];

  return (
    <div className={`${className} rounded-full flex items-center justify-center font-bold shrink-0 border ${colorClass}`}>
      {getInitials(name)}
    </div>
  );
};

/**
 * Package Type Tag Component
 * Distinct rectangular tag UI with subtle icon indicator to visually differentiate package types from status pills.
 */
const PackageTypeTag = ({ type, label, className = "" }) => {
  const norm = String(type || "").toLowerCase().trim();

  if (norm === "special") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-tight bg-amber-50/80 text-amber-900 border border-amber-300/70 shadow-2xs ${className} whitespace-nowrap`}>
        <Tag size={10} className="shrink-0 text-amber-600" />
        <span>{label || "Special Offer"}</span>
      </span>
    );
  }

  if (norm === "regular") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-tight bg-blue-50/80 text-blue-900 border border-blue-300/70 shadow-2xs ${className} whitespace-nowrap`}>
        <Package size={10} className="shrink-0 text-blue-600" />
        <span>{label || "Regular Package"}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-tight bg-slate-100/80 text-slate-800 border border-slate-200/90 shadow-2xs ${className} whitespace-nowrap`}>
      <Sliders size={10} className="shrink-0 text-slate-500" />
      <span>{label || "Custom Request"}</span>
    </span>
  );
};

/**
 * Format date & time cleanly into readable strings (e.g. "Sep 8, 2026" / "3:15 PM")
 */
const formatDateTimeClean = (dateVal) => {
  if (!dateVal) return { dateStr: "—", timeStr: "" };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { dateStr: "—", timeStr: "" };
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { dateStr, timeStr };
};

/**
 * Check if inquiry was received/updated recently (within 24h)
 */
const isRecentlyUpdated = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const diffHours = (new Date() - d) / (1000 * 3600);
  return diffHours >= 0 && diffHours <= 24;
};

/**
 * Relative time helper (e.g. "Updated 1h ago")
 */
const getRelativeTime = (dateStr) => {
  if (!dateStr) return "Just now";
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

/**
 * Calculate dynamic operational decision-support alerts for the inquiry
 */
const getOperationalAlerts = (row) => {
  if (!row) return [];
  const alerts = [];
  const now = new Date();

  // 1. Quotation needed
  if (!row.latestQuote && row.status !== "Cancelled" && row.status !== "Converted to Booking") {
    alerts.push({
      key: "quote_needed",
      label: "Quotation still needed",
      sub: "No quote generated yet for this request",
      icon: FileText,
      tone: "bg-blue-50 text-blue-800 border-blue-200/80",
    });
  }

  // 2. Newly received
  if (row.isNew) {
    alerts.push({
      key: "new_inquiry",
      label: "Newly received inquiry",
      sub: `Received ${row.updatedRelative}`,
      icon: Sparkles,
      tone: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    });
  }

  // 3. Event date approaching (within 14 days)
  if (row.rawDate) {
    const diffDays = Math.ceil((row.rawDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays >= 0 && diffDays <= 14) {
      alerts.push({
        key: "date_approaching",
        label: "Event date approaching",
        sub: `Event is in ${diffDays} day${diffDays === 1 ? "" : "s"} (${row.eventDateFormatted})`,
        icon: Calendar,
        tone: "bg-rose-50 text-rose-800 border-rose-200/80",
      });
    }
  }

  // 4. Follow-up needed (Pending / Under Review for > 48 hours)
  if (["Pending Review", "Under Review"].includes(row.status) && row.hoursSinceCreated >= 48) {
    alerts.push({
      key: "follow_up",
      label: "Follow-up recommended",
      sub: `Awaiting admin response for over ${Math.floor(row.hoursSinceCreated / 24)}d`,
      icon: Clock,
      tone: "bg-amber-50 text-amber-800 border-amber-200/80",
    });
  }

  // 5. Incomplete venue information
  if (!row.venue || row.venue === "TBA" || row.venueFull === "Venue TBA") {
    alerts.push({
      key: "missing_venue",
      label: "Incomplete venue details",
      sub: "Customer has not specified complete venue address",
      icon: MapPin,
      tone: "bg-slate-100 text-slate-700 border-slate-200/80",
    });
  }

  // 6. Special Dietary / Allergy note
  if (row.allergies || row.dietaryRestrictions) {
    alerts.push({
      key: "dietary_alert",
      label: "Dietary / Allergy notes present",
      sub: [row.dietaryRestrictions, row.allergies].filter(Boolean).join(" · "),
      icon: Info,
      tone: "bg-purple-50 text-purple-800 border-purple-200/80",
    });
  }

  return alerts;
};

export default function AdminInquiries() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  // State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [showDatePopover, setShowDatePopover] = useState(false);

  // View mode & Sort
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'event_date' | 'guests'

  // Selection & Side-by-Side Panel
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null); // Row opened in right detail panel
  const [drawerTab, setDrawerTab] = useState("overview"); // 'overview' | 'notes' | 'timeline'

  // Dialog targets
  const [cancelTarget, setCancelTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 7;

  // Load Data
  const loadData = () => {
    setLoading(true);
    AdminAPI.getInquiries()
      .then((res) => {
        setBookings(res.data || []);
      })
      .catch(() => {
        notify("Failed to load inquiries", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  // Format data for table & filtering
  const formattedBookings = useMemo(() => {
    return bookings.map((b) => {
      const identity = bookingIdentity(b);
      const createdFormatted = formatDateTimeClean(b.createdAt);
      const updatedFormatted = formatDateTimeClean(b.updatedAt || b.createdAt);
      const isNew = isRecentlyUpdated(b.createdAt);
      const createdAtDate = b.createdAt ? new Date(b.createdAt) : new Date();
      const hoursSinceCreated = Math.max(0, (new Date() - createdAtDate) / (1000 * 3600));

      return {
        _id: b._id,
        id: b.reference || (b._id ? b._id.substring(b._id.length - 8).toUpperCase() : "INQ-000"),
        raw: b,
        customer: b.customer_id?.full_name || `${b.contact_first_name || ''} ${b.contact_last_name || ''}`.trim() || "Customer",
        email: b.customer_id?.email || b.contact_email || "",
        phone: b.customer_id?.phone || b.contact_phone || "—",
        booking: identity.name,
        bookingType: identity.type, // 'special' | 'regular' | 'custom'
        bookingTypeLabel: identity.label, // 'Special Offer' | 'Regular Package' | 'Custom Request'
        eventType: b.event_type || "Event",
        guests: b.guest_count || 0,
        eventDateFormatted: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
        eventTimeFormatted: b.start_time || "TBA",
        rawDate: b.event_date ? new Date(b.event_date) : null,
        venue: b.venue_type || b.street || "TBA",
        venueFull: [b.venue_type, b.street, b.barangay, b.municipality, b.province].filter(Boolean).join(", ") || "Venue TBA",
        status: b.status || "Pending Review",
        rawStatus: b.status || "Pending Review",
        archived: Boolean(b.archived),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt || b.createdAt,
        hoursSinceCreated,
        createdDateStr: createdFormatted.dateStr,
        createdTimeStr: createdFormatted.timeStr,
        updatedRelative: getRelativeTime(b.updatedAt || b.createdAt),
        isNew,
        specialRequests: b.special_requests || b.custom_setup_notes || "",
        allergies: b.allergies || "",
        dietaryRestrictions: b.dietary_restrictions || b.dietary_requirements || "",
        budgetRange: b.budget_range || "N/A",
        estimatedTotal: b.estimated_total || b.offer_base_price || b.total_price || 0,
        latestQuote: b.latestQuote || null,
        convertedBookingId: b.converted_booking_id || null,
        paymentStatus: b.payment_status || "unpaid",
        celebrantName: b.celebrant_name || "",
        eventPalette: b.event_palette || [],
      };
    });
  }, [bookings]);

  // Unique event types for filter dropdown
  const availableEventTypes = useMemo(() => {
    const types = new Set(formattedBookings.map((b) => b.eventType).filter(Boolean));
    return Array.from(types);
  }, [formattedBookings]);

  // Filter & Search Logic
  const filteredBookings = useMemo(() => {
    return formattedBookings.filter((r) => {
      // Status filter
      if (statusFilter === "Archived") {
        if (!r.archived) return false;
      } else if (statusFilter !== "all") {
        if (r.archived || r.status !== statusFilter) return false;
      } else {
        // 'all' tab shows active unarchived inquiries
        if (r.archived) return false;
      }

      // Event Type filter
      if (eventTypeFilter !== "all" && r.eventType !== eventTypeFilter) {
        return false;
      }

      // Date Range filter
      if (dateRangeFilter === "next_7") {
        const now = new Date();
        const next7 = new Date();
        next7.setDate(now.getDate() + 7);
        if (!r.rawDate || r.rawDate < now || r.rawDate > next7) return false;
      } else if (dateRangeFilter === "next_30") {
        const now = new Date();
        const next30 = new Date();
        next30.setDate(now.getDate() + 30);
        if (!r.rawDate || r.rawDate < now || r.rawDate > next30) return false;
      } else if (dateRangeFilter === "custom") {
        if (customDateRange.from && r.rawDate && r.rawDate < new Date(customDateRange.from)) return false;
        if (customDateRange.to && r.rawDate && r.rawDate > new Date(`${customDateRange.to}T23:59:59`)) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCustomer = r.customer.toLowerCase().includes(q);
        const matchEmail = r.email.toLowerCase().includes(q);
        const matchPhone = r.phone.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        const matchBooking = r.booking.toLowerCase().includes(q);
        const matchEvent = r.eventType.toLowerCase().includes(q);
        const matchVenue = r.venue.toLowerCase().includes(q);
        if (!matchCustomer && !matchEmail && !matchPhone && !matchId && !matchBooking && !matchEvent && !matchVenue) {
          return false;
        }
      }

      return true;
    });
  }, [formattedBookings, statusFilter, eventTypeFilter, dateRangeFilter, customDateRange, search]);

  // Sort logic
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === "event_date") {
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return a.rawDate - b.rawDate;
      }
      if (sortBy === "guests") {
        return b.guests - a.guests;
      }
      return 0;
    });
  }, [filteredBookings, sortBy]);

  // Automatically select the most recently received inquiry on initial load
  useEffect(() => {
    if (sortedBookings.length > 0 && !selectedInquiry) {
      setSelectedInquiry(sortedBookings[0]);
    }
  }, [sortedBookings]);

  // Pagination calculation
  const totalItems = sortedBookings.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBookings.slice(start, start + pageSize);
  }, [sortedBookings, page, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, eventTypeFilter, dateRangeFilter, sortBy]);

  // KPI Calculations
  const totalInquiriesCount = formattedBookings.length;
  const pendingCount = formattedBookings.filter((r) => !r.archived && r.status === "Pending Review").length;
  const underReviewCount = formattedBookings.filter((r) => !r.archived && r.status === "Under Review").length;
  const quotationSentCount = formattedBookings.filter((r) => !r.archived && (r.status === "Quotation Sent" || r.latestQuote)).length;

  const pendingPct = totalInquiriesCount ? Math.round((pendingCount / totalInquiriesCount) * 100) : 0;
  const underReviewPct = totalInquiriesCount ? Math.round((underReviewCount / totalInquiriesCount) * 100) : 0;
  const quotationSentPct = totalInquiriesCount ? Math.round((quotationSentCount / totalInquiriesCount) * 100) : 0;

  // Derive decision support operational alerts for the currently selected inquiry
  const selectedAlerts = useMemo(() => {
    return getOperationalAlerts(selectedInquiry);
  }, [selectedInquiry]);

  // Actions & Handlers
  const handleArchiveToggle = async (row, archived = true) => {
    try {
      await AdminAPI.setInquiryArchived(row._id, archived);
      notify(archived ? "Inquiry archived" : "Inquiry restored", "success");
      if (selectedInquiry && selectedInquiry._id === row._id) {
        setSelectedInquiry((prev) => prev ? { ...prev, archived } : null);
      }
      setArchiveTarget(null);
      loadData();
    } catch (err) {
      notify("Failed to update archive status", "error");
    }
  };

  const handleRejectInquiry = async (row) => {
    try {
      await AdminAPI.updateInquiry(row._id, { status: "Cancelled" });
      notify("Inquiry rejected", "success", { description: "Moved to cancelled status." });
      if (selectedInquiry && selectedInquiry._id === row._id) {
        setSelectedInquiry((prev) => prev ? { ...prev, status: "Cancelled" } : null);
      }
      setCancelTarget(null);
      loadData();
    } catch (err) {
      notify("Failed to reject inquiry", "error");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setEventTypeFilter("all");
    setDateRangeFilter("all");
    setCustomDateRange({ from: "", to: "" });
    setShowDatePopover(false);
  };

  // Toggle selection
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
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Inquiries
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage and respond to customer inquiries. Track progress from initial request to booking.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => navigate("/admin/bookings/new")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> New Inquiry
            </button>
          </div>
        </div>

        {/* Level Split Layout: Main Content on Left, Inquiry Overview Panel on Right (STARTS LEVEL WITH KPI CARDS) */}
        <div className="flex flex-col lg:flex-row gap-3.5 items-start">
          {/* Main Left Content Column: Expands to full width when panel is closed */}
          <div className="flex-1 min-w-0 space-y-3.5 w-full">
            {/* KPI Summary Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Total Inquiries */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    TOTAL INQUIRIES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tracking-tight text-foreground">{totalInquiriesCount}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                      <ArrowUpRight size={10} /> 12%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">vs. last 7 days</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50">
                  <Mail size={13} />
                </div>
              </div>

              {/* Card 2: Pending Review */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    PENDING REVIEW
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{pendingCount}</span>
                  <p className="text-[10px] text-muted-foreground">{pendingPct}% of total</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <Clock size={13} />
                </div>
              </div>

              {/* Card 3: Under Review */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    UNDER REVIEW
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{underReviewCount}</span>
                  <p className="text-[10px] text-muted-foreground">{underReviewPct}% of total</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50">
                  <Eye size={13} />
                </div>
              </div>

              {/* Card 4: Quotation Sent */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    QUOTATION SENT
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{quotationSentCount}</span>
                  <p className="text-[10px] text-muted-foreground">{quotationSentPct}% of total</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/50">
                  <FileText size={13} />
                </div>
              </div>
            </div>

            {/* Stacked Label Filter Controls Bar (Labels Above Controls, Perfect Alignment) */}
            <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 shadow-2xs">
              <div className="flex flex-wrap items-end gap-2.5 text-xs">
                {/* Search Input Field */}
                <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Inquiries</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={13} />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search customer, email, phone, event..."
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

                {/* Status Filter */}
                <div className="flex flex-col gap-1 min-w-[130px] shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Converted to Booking">Booking</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                {/* Event Type Filter */}
                <div className="flex flex-col gap-1 min-w-[130px] shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Event Type</label>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="all">All Event Types</option>
                    {availableEventTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="flex flex-col gap-1 min-w-[130px] shrink-0 relative">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Range</label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => {
                      setDateRangeFilter(e.target.value);
                      if (e.target.value === "custom") setShowDatePopover(true);
                      else setShowDatePopover(false);
                    }}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="all">All Dates</option>
                    <option value="next_7">Next 7 Days</option>
                    <option value="next_30">Next 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {showDatePopover && (
                    <div className="absolute right-0 top-full mt-1.5 z-30 w-56 p-2.5 bg-popover border border-border rounded-xl shadow-lg space-y-2">
                      <div className="flex justify-between items-center pb-1 border-b border-border">
                        <span className="text-xs font-semibold">Custom Date Range</span>
                        <button onClick={() => setShowDatePopover(false)} className="text-muted-foreground hover:text-foreground">
                          <X size={12} />
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">From</label>
                        <input
                          type="date"
                          value={customDateRange.from}
                          onChange={(e) => setCustomDateRange((prev) => ({ ...prev, from: e.target.value }))}
                          className="w-full text-xs bg-background border border-input rounded-md px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">To</label>
                        <input
                          type="date"
                          value={customDateRange.to}
                          onChange={(e) => setCustomDateRange((prev) => ({ ...prev, to: e.target.value }))}
                          className="w-full text-xs bg-background border border-input rounded-md px-2 py-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Filters Action Button */}
                {(search || statusFilter !== "all" || eventTypeFilter !== "all" || dateRangeFilter !== "all") && (
                  <div className="flex flex-col gap-1 shrink-0 justify-end">
                    <button
                      onClick={clearFilters}
                      className="h-8 px-3 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                    >
                      <X size={13} /> Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* List Toolbar Header */}
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="text-xs font-bold text-foreground">
                {totalItems} {totalItems === 1 ? "inquiry" : "inquiries"}
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-background border border-input rounded-lg px-2 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-7"
                  >
                    <option value="newest">Date Received (Newest)</option>
                    <option value="oldest">Date Received (Oldest)</option>
                    <option value="event_date">Event Date (Soonest)</option>
                    <option value="guests">Guest Count (High-Low)</option>
                  </select>
                </div>

                {/* View Switcher Toggle */}
                <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1 rounded-md transition-colors ${
                      viewMode === "table"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Table view"
                  >
                    <LayoutList size={13} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Table / Grid Content */}
            {loading ? (
              <div className="bg-card border border-border/70 rounded-xl p-10 text-center text-xs text-muted-foreground">
                <RefreshCw className="animate-spin mx-auto mb-2 text-primary" size={18} />
                Loading inquiries data...
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="bg-card border border-border/70 rounded-xl p-10 text-center text-xs text-muted-foreground space-y-2">
                <AlertCircle className="mx-auto text-muted-foreground/60" size={22} />
                <p className="font-semibold text-foreground">No inquiries found</p>
                <p>Try adjusting your search query or filter options.</p>
                {(search || statusFilter !== "all" || eventTypeFilter !== "all" || dateRangeFilter !== "all") && (
                  <button onClick={clearFilters} className="text-primary hover:underline font-medium text-xs">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : viewMode === "table" ? (
              /* COMPACT TABLE VIEW */
              <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-2xs">
                <div className="w-full">
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
                        <th className="py-2.5 px-2.5 font-semibold">CUSTOMER</th>
                        <th className="py-2.5 px-2.5 font-semibold">EVENT DETAILS</th>
                        <th className="py-2.5 px-2.5 font-semibold">STATUS</th>
                        <th className="py-2.5 px-2.5 font-semibold">PACKAGE TYPE</th>
                        <th className="py-2.5 px-2.5 font-semibold">RECEIVED / UPDATED</th>
                        <th className="py-2.5 pr-2.5 pl-1 text-right font-semibold">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {paginatedRows.map((r) => {
                        const isSelected = selectedInquiry?._id === r._id;
                        return (
                          <tr
                            key={r._id}
                            onClick={() => setSelectedInquiry(r)}
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

                            {/* Customer */}
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2">
                                <AvatarInitials name={r.customer} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    {r.isNew && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Recent activity" />
                                    )}
                                    <p className="font-bold text-foreground text-xs truncate max-w-[120px]">{r.customer}</p>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{r.email || "—"}</p>
                                </div>
                              </div>
                            </td>

                            {/* Event Details */}
                            <td className="py-2.5 px-2.5">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-foreground text-xs truncate">
                                  {r.eventType}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {r.eventDateFormatted} · {r.guests} pax
                                </div>
                                <div className="text-[10px] text-muted-foreground/80 truncate max-w-[130px] flex items-center gap-1">
                                  <MapPin size={10} className="shrink-0 text-muted-foreground/70" />
                                  <span className="truncate">{r.venue}</span>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <Badge status={r.status} />
                            </td>

                            {/* Package Type */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <PackageTypeTag type={r.bookingType} label={r.bookingTypeLabel} />
                            </td>

                            {/* Received / Updated (Clean Formatted Strings) */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <div>
                                <p className="font-medium text-foreground text-xs">
                                  {r.createdDateStr}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <span>{r.createdTimeStr}</span>
                                  <span>·</span>
                                  <span className={r.isNew ? "text-primary font-semibold" : ""}>{r.updatedRelative}</span>
                                </div>
                              </div>
                            </td>

                            {/* Actions (Icon-Only View Details Button with Tooltip) */}
                            <td className="py-2.5 pr-2.5 pl-1 text-right whitespace-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setSelectedInquiry(r)}
                                  title="View inquiry details"
                                  aria-label="View inquiry details"
                                  className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-2xs shrink-0"
                                >
                                  <Eye size={14} />
                                </button>
                                
                                <div className="relative group/menu shrink-0">
                                  <button
                                    title="More options"
                                    aria-label="More options"
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                  <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block z-30 w-40 p-1 bg-popover border border-border rounded-lg shadow-md text-left space-y-0.5 text-xs">
                                    <button
                                      onClick={() => setSelectedInquiry(r)}
                                      className="w-full px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary text-left flex items-center gap-1.5 transition-colors"
                                    >
                                      <Eye size={12} /> View Details
                                    </button>
                                    <button
                                      onClick={() => navigate(`/admin/quotes/${r._id}/details`)}
                                      className="w-full px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary text-left flex items-center gap-1.5 transition-colors"
                                    >
                                      <FileText size={12} /> Send Quotation
                                    </button>
                                    <button
                                      onClick={() => setArchiveTarget(r)}
                                      className="w-full px-2 py-1 rounded-md hover:bg-primary/10 hover:text-primary text-left flex items-center gap-1.5 transition-colors"
                                    >
                                      {r.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                                      {r.archived ? "Restore Inquiry" : "Archive Inquiry"}
                                    </button>
                                    <div className="border-t border-border/60 my-0.5" />
                                    <button
                                      onClick={() => setCancelTarget(r)}
                                      className="w-full px-2 py-1 rounded-md hover:bg-rose-50 text-rose-600 text-left flex items-center gap-1.5 font-medium transition-colors"
                                    >
                                      <X size={12} /> Reject Inquiry
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-3 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent transition-colors"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-6 h-6 rounded-md font-semibold text-[11px] transition-colors ${
                          page === p ? "bg-primary text-primary-foreground shadow-2xs" : "border border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent transition-colors"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)} of {totalItems} inquiries
                  </div>
                </div>
              </div>
            ) : (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {paginatedRows.map((r) => {
                  const isSelected = selectedInquiry?._id === r._id;
                  return (
                    <div
                      key={r._id}
                      onClick={() => setSelectedInquiry(r)}
                      className={`bg-card border rounded-xl p-3 space-y-2.5 transition-all cursor-pointer shadow-2xs ${
                        isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/70 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <AvatarInitials name={r.customer} />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-xs truncate">{r.customer}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                          </div>
                        </div>
                        <Badge status={r.status} />
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>{r.eventType}</span>
                          <span className="text-[10px] text-muted-foreground">{r.guests} guests</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <Calendar size={11} className="shrink-0 text-muted-foreground/70" />
                          <span>{r.eventDateFormatted} · {r.eventTimeFormatted}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <MapPin size={11} className="shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{r.venue}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                        <span className="text-[9.5px] text-muted-foreground">
                          Received {r.createdDateStr}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInquiry(r);
                          }}
                          title="View inquiry details"
                          aria-label="View inquiry details"
                          className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Side Inquiry Summary / Decision-Support Panel (Matches Reference Screenshot Layout) */}
          {selectedInquiry && (
            <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-card border border-border/70 rounded-xl p-3.5 space-y-3.5 shadow-sm text-xs sticky top-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Inquiry Details</h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    #{selectedInquiry.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Close panel"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Customer Info Card Header */}
              <div className="flex items-start justify-between gap-2.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AvatarInitials name={selectedInquiry.customer} className="w-9 h-9 text-xs" />
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-bold text-foreground text-xs truncate">{selectedInquiry.customer}</h4>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                      <Phone size={10} className="shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{selectedInquiry.phone}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                      <Mail size={10} className="shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{selectedInquiry.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge status={selectedInquiry.status} />
                  <PackageTypeTag type={selectedInquiry.bookingType} label={selectedInquiry.bookingTypeLabel} />
                </div>
              </div>

              {/* Tabs Bar (Overview | Customer Notes | Timeline) */}
              <div className="flex border-b border-border text-[11px] font-semibold">
                <button
                  onClick={() => setDrawerTab("overview")}
                  className={`pb-1.5 px-2.5 border-b-2 transition-colors ${
                    drawerTab === "overview" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDrawerTab("notes")}
                  className={`pb-1.5 px-2.5 border-b-2 transition-colors ${
                    drawerTab === "notes" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  Customer Notes
                </button>
                <button
                  onClick={() => setDrawerTab("timeline")}
                  className={`pb-1.5 px-2.5 border-b-2 transition-colors ${
                    drawerTab === "timeline" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  Timeline
                </button>
              </div>

              {/* Tab 1: Overview */}
              {drawerTab === "overview" && (
                <div className="space-y-3 text-xs">
                  {/* Event Overview Box */}
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2.5 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      Event Overview
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5">
                        <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Event Type</p>
                          <p className="font-semibold text-foreground">{selectedInquiry.eventType}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Calendar size={14} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Event Date</p>
                          <p className="font-semibold text-foreground">
                            {selectedInquiry.eventDateFormatted} · {selectedInquiry.eventTimeFormatted}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Venue</p>
                          <p className="font-semibold text-foreground">{selectedInquiry.venueFull}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Users size={14} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Guest Count</p>
                          <p className="font-semibold text-foreground">{selectedInquiry.guests} guests</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decision-Support Panel: Needs Attention / Next Action Alerts */}
                  {selectedAlerts.length > 0 && (
                    <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                      <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber-600" /> Needs Attention
                      </h5>
                      <div className="space-y-1.5">
                        {selectedAlerts.map((alert) => {
                          const IconComp = alert.icon;
                          return (
                            <div
                              key={alert.key}
                              className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${alert.tone}`}
                            >
                              <IconComp size={13} className="shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="font-bold text-[11px] leading-snug">{alert.label}</p>
                                <p className="text-[10px] opacity-90 leading-tight mt-0.5">{alert.sub}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Special Requests (ONLY shown when customer submitted them) */}
                  {selectedInquiry.specialRequests && (
                    <div className="bg-card border border-border/70 rounded-xl p-3 space-y-1.5 shadow-2xs">
                      <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Info size={12} className="text-primary" /> Special Requests
                      </h5>
                      <div className="text-muted-foreground leading-relaxed text-[11px] pl-1">
                        <p className="whitespace-pre-line">{selectedInquiry.specialRequests}</p>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions (Matching Reference Buttons) */}
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Quick Actions</h5>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => navigate(`/admin/quotes/${selectedInquiry._id}/details`)}
                        className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-center hover:bg-primary/90 transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Eye size={14} /> View Full Details
                      </button>
                      <button
                        onClick={() => navigate(`/admin/quotes/${selectedInquiry._id}/details`)}
                        className="w-full py-2 px-3 rounded-lg border border-input bg-background font-semibold text-foreground text-center hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Send size={14} /> Send Quotation
                      </button>
                      <button
                        onClick={() => setArchiveTarget(selectedInquiry)}
                        className="w-full py-2 px-3 rounded-lg border border-input bg-background font-semibold text-muted-foreground text-center hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Archive size={14} /> {selectedInquiry.archived ? "Restore Inquiry" : "Archive Inquiry"}
                      </button>
                    </div>
                  </div>

                  {/* Progress Stepper Timeline */}
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Progress</h5>
                    <div className="flex items-center justify-between relative text-[10px] text-center pt-1.5">
                      <div className="flex-1 flex flex-col items-center relative z-10">
                        <div className="w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[9px]">
                          <Check size={11} />
                        </div>
                        <span className="font-bold mt-1">Inquiry</span>
                        <span className="text-[8.5px] text-muted-foreground">
                          {selectedInquiry.createdDateStr}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex flex-col items-center relative z-10">
                        <div
                          className={`w-4.5 h-4.5 rounded-full font-bold flex items-center justify-center text-[9px] ${
                            selectedInquiry.latestQuote || selectedInquiry.status === "Quotation Sent"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground border border-input"
                          }`}
                        >
                          {selectedInquiry.latestQuote ? <Check size={11} /> : "2"}
                        </div>
                        <span className="font-semibold mt-1">Quotation</span>
                      </div>

                      <div className="flex-1 flex flex-col items-center relative z-10">
                        <div
                          className={`w-4.5 h-4.5 rounded-full font-bold flex items-center justify-center text-[9px] ${
                            selectedInquiry.convertedBookingId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground border border-input"
                          }`}
                        >
                          3
                        </div>
                        <span className="font-semibold mt-1">Booking</span>
                      </div>

                      <div className="flex-1 flex flex-col items-center relative z-10">
                        <div
                          className={`w-4.5 h-4.5 rounded-full font-bold flex items-center justify-center text-[9px] ${
                            ["deposit_paid", "fully_paid"].includes(selectedInquiry.paymentStatus)
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground border border-input"
                          }`}
                        >
                          4
                        </div>
                        <span className="font-semibold mt-1">Reservation</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Customer Notes */}
              {drawerTab === "notes" && (
                <div className="space-y-3 text-xs">
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Request Details</h5>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Package Name</p>
                        <p className="font-bold text-foreground">{selectedInquiry.booking}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Classification</p>
                        <span className="inline-block font-mono text-[9.5px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          {selectedInquiry.bookingTypeLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Estimated Total</p>
                          <p className="font-bold text-foreground">₱{Number(selectedInquiry.estimatedTotal || 0).toLocaleString("en-PH")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Budget Range</p>
                          <p className="font-semibold text-foreground">{selectedInquiry.budgetRange}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Customer Preferences</h5>
                    {selectedInquiry.celebrantName && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Celebrant / Honoree</p>
                        <p className="font-semibold text-foreground">{selectedInquiry.celebrantName}</p>
                      </div>
                    )}
                    {selectedInquiry.dietaryRestrictions && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Dietary Restrictions</p>
                        <p className="text-foreground">{selectedInquiry.dietaryRestrictions}</p>
                      </div>
                    )}
                    {selectedInquiry.allergies && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Allergies</p>
                        <p className="text-foreground">{selectedInquiry.allergies}</p>
                      </div>
                    )}
                    {!selectedInquiry.celebrantName && !selectedInquiry.dietaryRestrictions && !selectedInquiry.allergies && (
                      <p className="text-muted-foreground italic text-xs">No additional customer notes recorded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Timeline */}
              {drawerTab === "timeline" && (
                <div className="bg-card border border-border/70 rounded-xl p-3 space-y-3 shadow-2xs text-xs">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Inquiry Lifecycle</h5>
                  <div className="space-y-2 border-l-2 border-primary pl-3">
                    <div>
                      <p className="font-bold text-foreground">Inquiry Submitted</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedInquiry.createdDateStr} · {selectedInquiry.createdTimeStr}
                      </p>
                    </div>
                    {selectedInquiry.updatedAt && (
                      <div>
                        <p className="font-bold text-foreground">Last Updated</p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedInquiry.updatedRelative}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Confirm Reject */}
        {cancelTarget && (
          <ConfirmDialog
            title="Reject Inquiry"
            message={`Are you sure you want to reject inquiry ${cancelTarget.id}? This will move it to Cancelled status.`}
            confirmText="Yes, Reject Inquiry"
            confirmVariant="danger"
            onConfirm={() => handleRejectInquiry(cancelTarget)}
            onCancel={() => setCancelTarget(null)}
          />
        )}

        {/* Modal: Confirm Archive */}
        {archiveTarget && (
          <ConfirmDialog
            title={archiveTarget.archived ? `Restore Inquiry #${archiveTarget.id}?` : `Archive Inquiry #${archiveTarget.id}?`}
            message={
              archiveTarget.archived
                ? "Are you sure you want to restore this inquiry back to the active queue?"
                : "Are you sure you want to archive this inquiry? It will leave the active queue and move to Archive."
            }
            confirmText={archiveTarget.archived ? "Restore Inquiry" : "Archive Inquiry"}
            onConfirm={() => handleArchiveToggle(archiveTarget, !archiveTarget.archived)}
            onCancel={() => setArchiveTarget(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
