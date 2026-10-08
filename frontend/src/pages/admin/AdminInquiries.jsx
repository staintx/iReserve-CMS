import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Calendar, MapPin, Users, Mail, Phone, Clock, Eye,
  ChevronRight, Plus, X, MoreHorizontal, LayoutList, LayoutGrid,
  FileText, Send, Archive, ArchiveRestore, AlertCircle,
  Palette, Sparkles, Utensils, RefreshCw, ArrowUpRight, ChevronLeft, Check, Info,
  AlertTriangle, Tag, Package, Sliders, CheckCircle2, ExternalLink,
  User, History, Ruler, Image as ImageIcon, Store, Globe
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import FilterPill from "../../components/admin/table/FilterPill";
import KPICard from "../../components/admin/ui/KPICard";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Badge from "../../components/admin/ui/Badge";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { bookingIdentity } from "../../lib/specialOffers";
import { resolveServiceType } from "../../components/customer/portal/statusMeta";
import { eventSpaceLabel, isWalkInRecord } from "../../lib/packageDisplay";
import WalkInBookingModal from "../../components/admin/booking/WalkInBookingModal";

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
  if (isNaN(diffSec) || diffSec < 60) return "Just now";
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
  if (!row.venue || row.venue === "TBA" || row.venue === "Venue TBA" || row.venueFull === "Venue TBA") {
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

/**
 * Operational Next Action determination
 */
const getNextStepInfo = (row) => {
  if (!row) return { badge: "Review", actionLabel: "View", actionType: "view", tone: "bg-slate-100 text-slate-700 border-slate-200" };
  if (row.status === "Converted to Booking" || Boolean(row.convertedBookingId)) {
    return {
      badge: "Booking Confirmed",
      actionLabel: "View Booking",
      actionType: "view_booking",
      tone: "bg-teal-50 text-teal-800 border-teal-300 font-semibold",
      icon: CheckCircle2,
      isConverted: true,
    };
  }
  if (row.status === "Cancelled") {
    return {
      badge: "Inquiry Cancelled",
      actionLabel: "Inspect",
      actionType: "inspect",
      tone: "bg-rose-50 text-rose-800 border-rose-200",
      icon: X,
      isCancelled: true,
    };
  }
  if (row.latestQuote || row.status === "Quotation Sent") {
    return {
      badge: "Quotation Sent",
      actionLabel: "View Quote",
      actionType: "view_quote",
      tone: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
      icon: FileText,
      isSent: true,
    };
  }
  if (row.rawDate) {
    const diffDays = Math.ceil((row.rawDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (diffDays >= 0 && diffDays <= 7) {
      return {
        badge: `Urgent: Event in ${diffDays}d`,
        actionLabel: "+ Create Quote",
        actionType: "create_quote",
        tone: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
        icon: AlertTriangle,
        isUrgent: true,
      };
    }
  }
  if (["Pending Review", "Under Review"].includes(row.status) && row.hoursSinceCreated >= 48) {
    return {
      badge: "Follow-up Overdue",
      actionLabel: "+ Create Quote",
      actionType: "create_quote",
      tone: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
      icon: Clock,
      isOverdue: true,
    };
  }
  return {
    badge: "Quotation Needed",
    actionLabel: "+ Create Quote",
    actionType: "create_quote",
    tone: "bg-amber-50 text-amber-900 border-amber-300/80 font-semibold",
    icon: Sparkles,
    isNeedsQuote: true,
  };
};

/**
 * Checks if an inquiry has an existing quotation created or sent
 */
export const checkHasQuotation = (r) => {
  if (!r) return false;
  return Boolean(
    r.latestQuote ||
    r.raw?.latestQuote ||
    r.raw?.quotation_status ||
    r.raw?.quotation_expiration_date ||
    r.status === "Quotation Sent" ||
    r.status === "Quote Accepted" ||
    r.status === "Awaiting Final Confirmation" ||
    r.status === "Revision Requested" ||
    r.status === "Quote Rejected"
  );
};

/**
 * Checks if an inquiry needs a quotation:
 * Active, non-archived, non-cancelled, non-converted, non-rejected, and has NO quotation created or sent
 */
export const checkNeedsQuotation = (r) => {
  if (!r) return false;
  if (
    r.archived ||
    r.status === "Converted to Booking" ||
    r.convertedBookingId ||
    r.status === "Cancelled" ||
    r.status?.toLowerCase().includes("cancel") ||
    r.status?.toLowerCase().includes("reject")
  ) {
    return false;
  }
  return !checkHasQuotation(r);
};

export default function AdminInquiries() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  // State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewInquiryModal, setShowNewInquiryModal] = useState(
    searchParams.get("new") === "true" || searchParams.get("new") === "1"
  );

  // Filters & Search
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "all");
  const [sourceFilter, setSourceFilter] = useState(() => searchParams.get("source") || "all"); // 'all' | 'walk_in' | 'online'
  const [archetypeFilter, setArchetypeFilter] = useState("all"); // 'all' | 'package' | 'bespoke' | 'food_only'
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [showDatePopover, setShowDatePopover] = useState(false);

  // View mode & Sort
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'event_date' | 'guests'

  // Side-by-Side Panel
  const [selectedInquiry, setSelectedInquiry] = useState(null); // Row opened in right detail panel

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

  useRealTimeRefresh(loadData, ["inquiry"]);

  // Close details drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedInquiry) {
        setSelectedInquiry(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInquiry]);

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
        service: resolveServiceType(b),
        bookingType: identity.type, // 'special' | 'regular' | 'custom'
        bookingTypeLabel: identity.label, // 'Special Offer' | 'Regular Package' | 'Custom Request'
        eventType: b.event_type === "Other" && b.event_type_other ? b.event_type_other : (b.event_type || "Event"),
        guests: b.guest_count || 0,
        eventDateFormatted: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
        eventTimeFormatted: b.start_time || "TBA",
        rawDate: b.event_date ? new Date(b.event_date) : null,
        venue: [b.street, b.barangay, b.municipality].filter(Boolean).join(", ")
          || [b.barangay, b.municipality].filter(Boolean).join(", ")
          || b.municipality
          || b.street
          || b.venue_address
          || "Venue TBA",
        venueFull: [b.street, b.barangay, b.municipality, b.province].filter(Boolean).join(", ")
          ? [b.street, b.barangay, b.municipality, b.province].filter(Boolean).join(", ") + (b.zip_code ? ` (${b.zip_code})` : "")
          : b.venue_address || "Venue TBA",
        venueType: b.venue_type || "",
        landmark: b.landmark || "",
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
        budgetRange: b.budget_range || "",
        estimatedTotal: b.estimated_total || b.offer_base_price || b.total_price || 0,
        latestQuote: b.latestQuote || null,
        convertedBookingId: b.converted_booking_id || null,
        paymentStatus: b.payment_status || "unpaid",
        paymentMethod: b.payment_method || "cash",
        celebrantName: b.celebrant_name || "",
        eventTheme: b.event_theme || "",
        eventPalette: b.event_palette || [],
        isFoodOnly: resolveServiceType(b) === "Food Only" || b.service_type === "Food Only",
        isCustomSetup: Boolean(b.is_custom_setup || (!b.package_id && (b.custom_setup_scope?.length || b.inspiration_images?.length || b.custom_setup_notes))),
        inspirationImages: Array.isArray(b.inspiration_images) ? b.inspiration_images : [],
        customSetupScope: Array.isArray(b.custom_setup_scope) ? b.custom_setup_scope : [],
        customSetupNotes: b.custom_setup_notes || "",
        eventSpaceSize: eventSpaceLabel(b, b.package_id) || (b.scaffold_width && b.scaffold_length ? `${b.scaffold_width}×${b.scaffold_length}` : ""),
        isWalkIn: isWalkInRecord(b),
      };
    });
  }, [bookings]);

  // Unique event types for filter dropdown
  const availableEventTypes = useMemo(() => {
    const types = new Set(formattedBookings.map((b) => b.eventType).filter(Boolean));
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [formattedBookings]);

  // Source counts for filter pill
  const walkInInquiriesCount = useMemo(() => formattedBookings.filter((b) => b.isWalkIn).length, [formattedBookings]);
  const onlineInquiriesCount = useMemo(() => formattedBookings.filter((b) => !b.isWalkIn).length, [formattedBookings]);

  // Active filter tracking & global reset
  const hasActiveFilters = Boolean(
    search.trim() ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    archetypeFilter !== "all" ||
    eventTypeFilter !== "all" ||
    dateRangeFilter !== "all" ||
    customDateRange.from ||
    customDateRange.to ||
    sortBy !== "newest"
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setArchetypeFilter("all");
    setEventTypeFilter("all");
    setDateRangeFilter("all");
    setCustomDateRange({ from: "", to: "" });
    setShowDatePopover(false);
    setSortBy("newest");
    setPage(1);
  };

  // Filter & Search Logic
  const filteredBookings = useMemo(() => {
    return formattedBookings.filter((r) => {
      // Status filter
      if (statusFilter === "Archived") {
        if (!r.archived) return false;
      } else if (statusFilter === "active") {
        if (r.archived || r.status === "Converted to Booking" || r.status === "Cancelled") return false;
      } else if (statusFilter === "Needs Quotations" || statusFilter === "needs_quotation") {
        if (!checkNeedsQuotation(r)) return false;
      } else if (statusFilter === "Quotation Sent") {
        if (r.archived || (!r.latestQuote && r.status !== "Quotation Sent") || r.status === "Converted to Booking") return false;
      } else if (statusFilter === "Converted to Booking") {
        if (r.archived || (r.status !== "Converted to Booking" && !r.convertedBookingId)) return false;
      } else if (statusFilter === "Cancelled") {
        if (r.archived || (r.status !== "Cancelled" && !r.status?.toLowerCase().includes("cancel"))) return false;
      } else if (statusFilter === "Rejected") {
        if (r.archived || r.status === "Cancelled" || r.status?.toLowerCase().includes("cancel") || (!r.status?.toLowerCase().includes("reject") && r.latestQuote?.status?.toLowerCase() !== "rejected")) return false;
      } else {
        // 'all' shows all unarchived inquiries
        if (r.archived) return false;
      }

      // Service Archetype filter
      if (archetypeFilter === "package" && (r.isCustomSetup || r.isFoodOnly)) return false;
      if (archetypeFilter === "bespoke" && !r.isCustomSetup) return false;
      if (archetypeFilter === "food_only" && !r.isFoodOnly) return false;

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

      // Booking Source filter (Walk-in vs Online)
      if (sourceFilter === "walk_in" && !r.isWalkIn) return false;
      if (sourceFilter === "online" && r.isWalkIn) return false;

      return true;
    });
  }, [formattedBookings, statusFilter, sourceFilter, archetypeFilter, eventTypeFilter, dateRangeFilter, customDateRange, search]);

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
  }, [search, statusFilter, archetypeFilter, eventTypeFilter, dateRangeFilter, customDateRange, sortBy]);

  // KPI Calculations
  const totalInquiriesCount = formattedBookings.filter((r) => !r.archived).length;
  const activeCount = formattedBookings.filter((r) => !r.archived && r.status !== "Converted to Booking" && r.status !== "Cancelled").length;
  const quotesNeededCount = formattedBookings.filter(checkNeedsQuotation).length;
  const quotationSentCount = formattedBookings.filter((r) => !r.archived && (r.status === "Quotation Sent" || r.latestQuote) && r.status !== "Converted to Booking").length;
  const convertedCount = formattedBookings.filter((r) => !r.archived && (r.status === "Converted to Booking" || Boolean(r.convertedBookingId))).length;
  const archivedCount = formattedBookings.filter((r) => r.archived).length;
  const conversionPct = totalInquiriesCount > 0 ? Math.round((convertedCount / totalInquiriesCount) * 100) : 0;

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

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedInquiry) {
        setSelectedInquiry(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInquiry]);

  const buildInquiryActions = (r) => {
    const isConverted = r.status === "Converted to Booking" || Boolean(r.convertedBookingId);
    const canReject = !isConverted && r.status !== "Cancelled";

    return [
      {
        key: "details",
        label: "View Full Details",
        icon: ExternalLink,
        onSelect: () => navigate(`/admin/bookings/inquiries/${r._id}`),
      },
      isConverted
        ? {
          key: "reservation",
          label: "View Reservation",
          icon: CheckCircle2,
          onSelect: () => navigate("/admin/bookings/reservations"),
        }
        : {
          key: "quote",
          label: r.latestQuote ? "Edit Quotation" : "Create Quotation",
          icon: FileText,
          onSelect: () => navigate(`/admin/quotes/${r._id}/details`),
        },
      {
        key: "archive",
        label: r.archived ? "Restore Inquiry" : "Archive Inquiry",
        icon: r.archived ? ArchiveRestore : Archive,
        onSelect: () => setArchiveTarget(r),
      },
      ...(canReject
        ? [
          { divider: true },
          {
            key: "reject",
            label: "Reject Inquiry",
            icon: X,
            destructive: true,
            onSelect: () => setCancelTarget(r),
          },
        ]
        : []),
    ];
  };

  return (
    <AdminLayout>
      <div className="space-y-3 bg-background min-h-[calc(100vh-4rem)] p-1.5 sm:p-2.5">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Inquiries
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage and respond to customer inquiries. Track progress from initial request to booking.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
              title="Refresh inquiries data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} /> Refresh
            </button>
            <button
              onClick={() => setShowNewInquiryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Inquiry
            </button>
          </div>
        </div>

        {/* Main Content Area (Uncompressed 100% Full Width) */}
        <div className="space-y-3.5 w-full">
          {/* Operational KPI Summary Cards Row (3 evenly-spaced cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KPICard
              title="Active Inquiries"
              value={activeCount}
              sub="Open leads in pipeline"
              icon={Mail}
            />
            <KPICard
              title="Quotation Sent"
              value={quotationSentCount}
              sub="Awaiting client decision"
              icon={FileText}
            />
            <KPICard
              title="Converted Bookings"
              value={convertedCount}
              sub={`${conversionPct}% conversion rate`}
              icon={CheckCircle2}
            />
          </div>

          {/* Single-Line Interactive Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-2.5 shadow-2xs flex flex-wrap items-center gap-2 font-sans">
            {/* Search Input Field */}
            <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, event, phone, venue..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-8 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Status Filter Pill with Live Pipeline Counts */}
            <FilterPill
              label="Status"
              icon={Sliders}
              value={statusFilter}
              defaultValue="all"
              onSelect={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Inquiries", count: totalInquiriesCount },
                { value: "active", label: "Active Pipeline", count: activeCount, icon: Mail },
                { value: "Needs Quotations", label: "Needs Quotation", count: quotesNeededCount, icon: Sparkles },
                { value: "Quotation Sent", label: "Quotation Sent", count: quotationSentCount, icon: FileText },
                { value: "Converted to Booking", label: "Converted", count: convertedCount, icon: CheckCircle2 },
                { value: "Cancelled", label: "Cancelled", icon: AlertTriangle },
                { value: "Archived", label: "Archived", count: archivedCount, icon: Archive },
              ]}
            />

            {/* Source / Channel Filter Pill */}
            <FilterPill
              label="Source"
              icon={Store}
              value={sourceFilter}
              defaultValue="all"
              onSelect={(val) => {
                setSourceFilter(val);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Sources", count: formattedBookings.length },
                { value: "walk_in", label: "Walk-in", count: walkInInquiriesCount, icon: Store },
                { value: "online", label: "Online", count: onlineInquiriesCount, icon: Globe },
              ]}
            />

            {/* Format / Archetype Filter Pill */}
            <FilterPill
              label="Format"
              icon={Palette}
              value={archetypeFilter}
              defaultValue="all"
              onSelect={(val) => {
                setArchetypeFilter(val);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Formats" },
                { value: "package", label: "Standard Packages", icon: Package },
                { value: "bespoke", label: "Custom Styling", icon: Palette },
                { value: "food_only", label: "Food Only", icon: Utensils },
              ]}
            />

            {/* Event Type Filter Pill */}
            {availableEventTypes.length > 0 && (
              <FilterPill
                label="Event Type"
                icon={Tag}
                value={eventTypeFilter}
                defaultValue="all"
                onSelect={(val) => {
                  setEventTypeFilter(val);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Event Types" },
                  ...availableEventTypes.map((type) => ({ value: type, label: type })),
                ]}
              />
            )}

            {/* Date Range Filter Pill */}
            <FilterPill
              label="Date Range"
              icon={Calendar}
              value={dateRangeFilter}
              defaultValue="all"
              customActive={dateRangeFilter !== "all"}
              customLabel={
                dateRangeFilter === "next_7"
                  ? "Next 7 Days"
                  : dateRangeFilter === "next_30"
                    ? "Next 30 Days"
                    : dateRangeFilter === "custom" && customDateRange.from && customDateRange.to
                      ? `${customDateRange.from} to ${customDateRange.to}`
                      : "Custom Range"
              }
              onClear={() => {
                setDateRangeFilter("all");
                setCustomDateRange({ from: "", to: "" });
                setPage(1);
              }}
              renderCustomContent={(close) => (
                <div className="p-2 space-y-2 text-xs font-sans">
                  <div className="space-y-1">
                    {[
                      { id: "all", label: "All Dates" },
                      { id: "next_7", label: "Next 7 Days" },
                      { id: "next_30", label: "Next 30 Days" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDateRangeFilter(opt.id);
                          setPage(1);
                          close();
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between ${dateRangeFilter === opt.id ? "bg-blue-50/90 text-blue-700 font-semibold" : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                          }`}
                      >
                        <span>{opt.label}</span>
                        {dateRangeFilter === opt.id && <Check size={11} strokeWidth={2.5} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom Date Range</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9.5px] text-slate-500 block mb-0.5 font-medium">From</label>
                        <input
                          type="date"
                          value={customDateRange.from}
                          onChange={(e) => {
                            setCustomDateRange((prev) => ({ ...prev, from: e.target.value }));
                            setDateRangeFilter("custom");
                            setPage(1);
                          }}
                          className="w-full text-[11px] bg-white border border-slate-200 text-slate-800 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] text-slate-500 block mb-0.5 font-medium">To</label>
                        <input
                          type="date"
                          value={customDateRange.to}
                          onChange={(e) => {
                            setCustomDateRange((prev) => ({ ...prev, to: e.target.value }));
                            setDateRangeFilter("custom");
                            setPage(1);
                          }}
                          className="w-full text-[11px] bg-white border border-slate-200 text-slate-800 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            />

            {/* Sort By Filter Pill */}
            <FilterPill
              label="Sort"
              icon={ArrowUpRight}
              value={sortBy}
              defaultValue="newest"
              align="end"
              className="sm:ml-auto"
              onSelect={(val) => setSortBy(val)}
              options={[
                { value: "newest", label: "Date Received (Newest)" },
                { value: "oldest", label: "Date Received (Oldest)" },
                { value: "event_date", label: "Event Date (Soonest)" },
                { value: "guests", label: "Guest Count (High-Low)" },
              ]}
            />

            {/* Global Clear Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* List Toolbar Header */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div className="text-xs font-bold text-foreground">
              {totalItems} {totalItems === 1 ? "inquiry" : "inquiries"}
            </div>

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1 rounded-md transition-colors ${viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                title="Table view"
              >
                <LayoutList size={13} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded-md transition-colors ${viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                title="Grid view"
              >
                <LayoutGrid size={13} />
              </button>
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
                    <tr className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 pl-4 pr-3 font-semibold">Customer</th>
                      <th className="py-2.5 px-3 font-semibold">Event Details</th>
                      <th className="py-2.5 px-3 font-semibold">Status & Next Action</th>
                      <th className="py-2.5 px-3 font-semibold">Package Type</th>
                      <th className="py-2.5 px-3 font-semibold">Received</th>
                      <th className="py-2.5 pr-4 pl-1 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {paginatedRows.map((r) => {
                      const isSelected = selectedInquiry?._id === r._id;
                      const nextStep = getNextStepInfo(r);
                      return (
                        <tr
                          key={r._id}
                          onClick={() => setSelectedInquiry(r)}
                          className={`group cursor-pointer transition-colors ${isSelected
                              ? "bg-primary/5 border-l-2 border-l-primary"
                              : "hover:bg-muted/40"
                            }`}
                        >
                          {/* Customer & Reference */}
                          <td className="py-2.5 pl-4 pr-3 min-w-[140px]">
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/bookings/inquiries/${r._id}`);
                                  }}
                                  className="font-mono text-[10.5px] font-bold text-primary hover:text-primary-hover hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                  title="View full details of inquiry"
                                >
                                  <span>#{r.id}</span>
                                  <ExternalLink size={10} className="opacity-70" />
                                </button>
                                {r.isWalkIn && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs" title="Walk-in Client">
                                    <Store size={9} />
                                    <span>Walk-in</span>
                                  </span>
                                )}
                                {r.isNew && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Recent activity" />
                                )}
                              </div>
                              <p className="font-semibold text-foreground text-xs truncate max-w-[150px]">{r.customer}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{r.email || "—"}</p>
                              {r.phone && r.phone !== "—" && (
                                <p className="text-[11px] text-muted-foreground font-mono truncate">{r.phone}</p>
                              )}
                            </div>
                          </td>

                          {/* Event Details */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-foreground text-xs truncate">
                                {r.eventType}
                              </div>
                              <div className="text-xs text-muted-foreground tabular-nums truncate">
                                {r.eventDateFormatted} · {r.guests} pax{r.eventSpaceSize ? ` · ${r.eventSpaceSize}` : ""}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[140px] flex items-center gap-1" title={r.venueFull !== "Venue TBA" ? r.venueFull : undefined}>
                                <MapPin size={11} className="shrink-0 text-muted-foreground" />
                                <span className="truncate">{r.venue}</span>
                              </div>
                            </div>
                          </td>

                          {/* Status & Next Action (High Priority Column) */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div>
                                <Badge status={r.status} />
                              </div>
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] border shadow-2xs ${nextStep.tone}`}>
                                  {nextStep.icon && <nextStep.icon size={11} className="shrink-0" />}
                                  <span>{nextStep.badge}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Package Type & Intended Payment */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <PackageTypeTag type={r.bookingType} label={r.bookingTypeLabel} />
                            <div className="mt-1">
                              {r.paymentMethod === "cash" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                                  Cash Intended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded">
                                  Online Intended
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Received / Updated (Clean Formatted Strings) */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground text-xs tabular-nums">
                                {r.createdDateStr}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                                <span>{r.createdTimeStr}</span>
                                <span>·</span>
                                <span className={r.isNew ? "text-primary font-semibold" : ""}>{r.updatedRelative}</span>
                              </div>
                            </div>
                          </td>

                          {/* Actions (Direct 1-Click Action Button + Drawer View + More Options) */}
                          <td className="py-2.5 pr-3 pl-1 text-right whitespace-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Contextual Next Step Action Button */}
                              {nextStep.actionType === "create_quote" ? (
                                <button
                                  onClick={() => navigate(`/admin/quotes/${r._id}/details`)}
                                  title="Create quotation for customer"
                                  className="px-2.5 py-1 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                                >
                                  <Plus size={12} />
                                  <span>Create Quote</span>
                                </button>
                              ) : nextStep.actionType === "view_booking" ? (
                                <button
                                  onClick={() => navigate('/admin/bookings/reservations')}
                                  title="View confirmed reservation"
                                  className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                                >
                                  <CheckCircle2 size={12} />
                                  <span>View Booking</span>
                                </button>
                              ) : nextStep.actionType === "view_quote" ? (
                                <button
                                  onClick={() => navigate(`/admin/quotes/${r._id}/details`)}
                                  title="View issued quotation"
                                  className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                                >
                                  <FileText size={12} />
                                  <span>View Quote</span>
                                </button>
                              ) : null}

                              <button
                                onClick={() => setSelectedInquiry(r)}
                                title="Quick View Inquiry Summary"
                                aria-label="Quick View Inquiry Summary"
                                className="px-2 py-1 text-xs font-semibold text-foreground bg-card border border-border/80 hover:bg-blue-50/80 hover:text-[#4C81E0] hover:border-blue-200/80 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                              >
                                <Eye size={12} className="text-muted-foreground" />
                                <span>Summary</span>
                              </button>

                              <RowActionsMenu actions={buildInquiryActions(r)} />
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
                      className={`w-6 h-6 rounded-md font-semibold text-[11px] transition-colors ${page === p ? "bg-primary text-primary-foreground shadow-2xs" : "border border-input bg-background hover:bg-accent"
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
                    className={`bg-card border rounded-xl p-3 space-y-2.5 transition-all cursor-pointer shadow-2xs ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/70 hover:border-primary/50"
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
                        <span className="text-[10px] text-muted-foreground">{r.guests} guests{r.eventSpaceSize ? ` · ${r.eventSpaceSize}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Calendar size={11} className="shrink-0 text-muted-foreground/70" />
                        <span>{r.eventDateFormatted} · {r.eventTimeFormatted}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]" title={r.venueFull !== "Venue TBA" ? r.venueFull : undefined}>
                        <MapPin size={11} className="shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{r.venue}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                      <span className="text-[9.5px] text-muted-foreground">
                        Received {r.createdDateStr}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/bookings/inquiries/${r._id}`);
                          }}
                          title="View Full Details"
                          aria-label="View Full Details"
                          className="px-2 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <ExternalLink size={11} />
                          <span>Full Details</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInquiry(r);
                          }}
                          title="View Inquiry Summary"
                          aria-label="View Inquiry Summary"
                          className="px-2 py-1 text-xs font-semibold text-foreground bg-card border border-border/80 hover:bg-muted hover:text-primary rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={12} className="text-muted-foreground" />
                          <span>Summary</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Slide-Over Inquiry Summary Drawer */}
        {selectedInquiry && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-drawer-title"
          >
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in-0 duration-200"
              onClick={() => setSelectedInquiry(null)}
              aria-hidden="true"
            />

            {/* Slide-Over Panel */}
            <div className="relative w-full max-w-[460px] h-full bg-card border-l border-border/80 shadow-2xl flex flex-col z-10 text-xs animate-in slide-in-from-right duration-200">

              {/* Pinned Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 id="inquiry-drawer-title" className="font-bold text-sm text-foreground truncate">
                    Inquiry Summary
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    #{selectedInquiry.id}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigate(`/admin/bookings/inquiries/${selectedInquiry._id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    title="Open Full Inquiry Details"
                  >
                    <ExternalLink size={12} />
                    <span>Full Details</span>
                  </button>
                  <button
                    onClick={() => setSelectedInquiry(null)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Close panel"
                    aria-label="Close panel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body (Single, unified, high-hierarchy view) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {/* Customer Section (Compact & Scannable) */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarInitials name={selectedInquiry.customer} className="w-9 h-9 text-xs" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground text-sm truncate">{selectedInquiry.customer}</h4>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          Received {selectedInquiry.createdDateStr}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge status={selectedInquiry.status} />
                      <div className="flex items-center gap-1">
                        {selectedInquiry.isWalkIn && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Store size={9} /> Walk-in
                          </span>
                        )}
                        <PackageTypeTag type={selectedInquiry.bookingType} label={selectedInquiry.bookingTypeLabel} />
                      </div>
                    </div>
                  </div>

                  {/* Quick Contact Links */}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/40 text-xs">
                    <a
                      href={`tel:${selectedInquiry.phone}`}
                      className="flex items-center gap-1.5 min-w-0 text-muted-foreground hover:text-foreground group transition-colors"
                      title="Call customer"
                    >
                      <Phone size={12} className="shrink-0 text-primary group-hover:scale-110 transition-transform" />
                      <span className="truncate">{selectedInquiry.phone || "—"}</span>
                    </a>
                    <a
                      href={`mailto:${selectedInquiry.email}`}
                      className="flex items-center gap-1.5 min-w-0 text-muted-foreground hover:text-foreground group transition-colors"
                      title="Email customer"
                    >
                      <Mail size={12} className="shrink-0 text-primary group-hover:scale-110 transition-transform" />
                      <span className="truncate">{selectedInquiry.email || "—"}</span>
                    </a>
                  </div>
                </div>

                {/* Decision-Support Attention Alerts (Prominent when triggered) */}
                {selectedAlerts.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2">
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

                {/* Event & Venue Specifications */}
                <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar size={12} className="text-primary" /> Event Specifications
                  </h5>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Date & Schedule</span>
                      <span className="font-semibold text-foreground">{selectedInquiry.eventDateFormatted}</span>
                      <span className="text-[11px] text-muted-foreground block">{selectedInquiry.eventTimeFormatted}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Event Type</span>
                      <span className="font-semibold text-foreground">{selectedInquiry.eventType}</span>
                      <span className="text-[11px] text-muted-foreground block">{selectedInquiry.guests} guests (pax)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Service</span>
                      <span className="font-semibold text-foreground">{selectedInquiry.service || selectedInquiry.booking}</span>
                    </div>
                    {selectedInquiry.venueType && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Venue Type</span>
                        <span className="font-semibold text-foreground">{selectedInquiry.venueType}</span>
                      </div>
                    )}
                    {selectedInquiry.eventSpaceSize && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Event Space Size</span>
                        <span className="font-semibold font-mono text-foreground">{selectedInquiry.eventSpaceSize}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Budget / Est. Total</span>
                      <span className="font-semibold font-mono text-foreground">
                        {selectedInquiry.budgetRange && selectedInquiry.budgetRange !== "N/A"
                          ? selectedInquiry.budgetRange
                          : selectedInquiry.estimatedTotal
                            ? `₱${Number(selectedInquiry.estimatedTotal).toLocaleString("en-PH")}`
                            : "Custom / TBD"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Intended Payment</span>
                      <span className="font-semibold text-foreground capitalize">
                        {selectedInquiry.paymentMethod === "cash" ? "Cash" : "Online Payment"}
                      </span>
                    </div>
                    {/* Event Theme & Palette for standard inquiries */}
                    {(selectedInquiry.eventTheme || (Array.isArray(selectedInquiry.eventPalette) && selectedInquiry.eventPalette.length > 0)) && (
                      <div className="col-span-2 pt-1 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground block font-medium">Styling Theme &amp; Palette</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {selectedInquiry.eventTheme && (
                            <span className="font-semibold text-foreground text-xs">{selectedInquiry.eventTheme}</span>
                          )}
                          {Array.isArray(selectedInquiry.eventPalette) && selectedInquiry.eventPalette.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {selectedInquiry.eventPalette.map((col, idx) => (
                                <span key={idx} className="px-1.5 py-0.2 rounded bg-muted/60 text-foreground text-[10px] font-medium border border-border/50">
                                  {col}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 pt-1.5 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
                        <MapPin size={11} className="text-primary" /> Venue Address
                      </span>
                      <span className="font-medium text-foreground leading-snug block mt-0.5">{selectedInquiry.venueFull}</span>
                      {selectedInquiry.landmark && (
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          <span className="font-medium">Landmark:</span> {selectedInquiry.landmark}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Setup Brief & Inspiration Photos (When Applicable) */}
                {(selectedInquiry.isCustomSetup ||
                  selectedInquiry.inspirationImages?.length > 0 ||
                  selectedInquiry.customSetupScope?.length > 0 ||
                  selectedInquiry.customSetupNotes) && (
                    <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                          <Palette size={12} className="text-blue-600" /> Custom Setup &amp; Moodboard Brief
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-bold">
                          Design from Scratch
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedInquiry.eventTheme && (
                          <div>
                            <span className="text-[10px] text-blue-700/80 font-medium block">Theme &amp; Motif</span>
                            <span className="font-semibold text-slate-900">{selectedInquiry.eventTheme}</span>
                          </div>
                        )}
                        {Array.isArray(selectedInquiry.eventPalette) && selectedInquiry.eventPalette.length > 0 && (
                          <div>
                            <span className="text-[10px] text-blue-700/80 font-medium block">Color Palette</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {selectedInquiry.eventPalette.map((col, idx) => (
                                <span key={idx} className="px-1.5 py-0.2 rounded bg-white text-slate-800 text-[10px] font-medium border border-blue-200/60 shadow-2xs">
                                  {col}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedInquiry.budgetRange && selectedInquiry.budgetRange !== "N/A" && (
                          <div className="col-span-2">
                            <span className="text-[10px] text-blue-700/80 font-medium block">Target Budget</span>
                            <span className="font-bold text-blue-950 font-mono text-xs">{selectedInquiry.budgetRange}</span>
                          </div>
                        )}
                      </div>

                      {/* Setup Scope Elements */}
                      {Array.isArray(selectedInquiry.customSetupScope) && selectedInquiry.customSetupScope.length > 0 && (
                        <div className="pt-1.5 border-t border-blue-200/50 space-y-1">
                          <span className="text-[10px] text-blue-700/80 font-bold uppercase tracking-wider block">
                            Scope Elements ({selectedInquiry.customSetupScope.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedInquiry.customSetupScope.map((scope, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-white text-blue-900 border border-blue-200 text-[11px] font-medium shadow-2xs">
                                ✓ {scope}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stylist Notes */}
                      {selectedInquiry.customSetupNotes && (
                        <div className="pt-1.5 border-t border-blue-200/50 space-y-1">
                          <span className="text-[10px] text-blue-700/80 font-bold uppercase tracking-wider block">
                            Stylist Vision Notes
                          </span>
                          <p className="text-xs text-slate-800 bg-white/90 p-2.5 rounded-lg border border-blue-200/70 whitespace-pre-wrap leading-relaxed">
                            {selectedInquiry.customSetupNotes}
                          </p>
                        </div>
                      )}

                      {/* Inspiration Moodboard Photos */}
                      {Array.isArray(selectedInquiry.inspirationImages) && selectedInquiry.inspirationImages.length > 0 && (
                        <div className="pt-2 border-t border-blue-200/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-blue-900 font-bold uppercase tracking-wider flex items-center gap-1">
                              <ImageIcon size={11} /> Inspiration Pegs ({selectedInquiry.inspirationImages.length})
                            </span>
                            <span className="text-[9.5px] text-blue-600">Click to open</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {selectedInquiry.inspirationImages.map((imgUrl, idx) => (
                              <a
                                key={idx}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square rounded-md overflow-hidden border border-blue-200/80 bg-white block shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                                title="Open full resolution image"
                              >
                                <img src={imgUrl} alt={`Peg ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] px-1 rounded font-bold">
                                  #{idx + 1}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Special Preferences & Requirements */}
                {(selectedInquiry.celebrantName || selectedInquiry.dietaryRestrictions || selectedInquiry.allergies || selectedInquiry.specialRequests) && (
                  <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Info size={12} className="text-primary" /> Customer Preferences & Notes
                    </h5>
                    <div className="space-y-2 text-xs">
                      {selectedInquiry.celebrantName && (
                        <div>
                          <span className="text-[10px] text-muted-foreground font-medium block">Celebrant / Honoree</span>
                          <span className="font-semibold text-foreground">{selectedInquiry.celebrantName}</span>
                        </div>
                      )}
                      {(selectedInquiry.dietaryRestrictions || selectedInquiry.allergies) && (
                        <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
                          {selectedInquiry.dietaryRestrictions && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-800">Dietary Restrictions</span>
                              <p className="text-[11px] leading-snug">{selectedInquiry.dietaryRestrictions}</p>
                            </div>
                          )}
                          {selectedInquiry.allergies && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-800">Allergies</span>
                              <p className="text-[11px] leading-snug">{selectedInquiry.allergies}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {selectedInquiry.specialRequests && (
                        <div>
                          <span className="text-[10px] text-muted-foreground font-medium block">Special Setup Notes</span>
                          <p className="text-foreground leading-relaxed whitespace-pre-line text-xs mt-0.5">
                            {selectedInquiry.specialRequests}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inquiry Progress Stepper */}
                <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History size={12} className="text-primary" /> Progress Lifecycle
                  </h5>
                  <div className="flex items-center justify-between relative text-[10px] text-center pt-1">
                    <div className="flex-1 flex flex-col items-center relative z-10">
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px]">
                        <Check size={11} />
                      </div>
                      <span className="font-bold mt-1">Inquiry</span>
                      <span className="text-[9px] text-muted-foreground">
                        {selectedInquiry.createdDateStr}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center relative z-10">
                      <div
                        className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${selectedInquiry.latestQuote || selectedInquiry.status === "Quotation Sent"
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
                        className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${selectedInquiry.convertedBookingId
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
                        className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${["deposit_paid", "fully_paid"].includes(selectedInquiry.paymentStatus)
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

              {/* Pinned Action Footer (Strictly Non-Duplicate Actions) */}
              <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-xs flex flex-col gap-2 shrink-0">
                {/* Primary Contextual Action */}
                {selectedInquiry.status === "Converted to Booking" || Boolean(selectedInquiry.convertedBookingId) ? (
                  <button
                    onClick={() => {
                      const bId = selectedInquiry.convertedBookingId?._id || selectedInquiry.convertedBookingId || selectedInquiry.converted_booking_id;
                      if (bId) {
                        navigate(`/admin/bookings/reservations?bookingId=${bId}&search=${encodeURIComponent(selectedInquiry.reference || bId)}`);
                      } else {
                        navigate(`/admin/bookings/reservations?search=${encodeURIComponent(selectedInquiry.reference || '')}`);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> View Confirmed Booking
                  </button>
                ) : selectedInquiry.latestQuote || selectedInquiry.status === "Quotation Sent" ? (
                  <button
                    onClick={() => navigate(`/admin/quotes/${selectedInquiry._id}/details`)}
                    className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <FileText size={14} /> View Issued Quotation
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/admin/quotes/${selectedInquiry._id}/details`)}
                    className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Plus size={14} /> Create Quotation
                  </button>
                )}

                {/* View Full Inquiry Details Button */}
                <button
                  onClick={() => navigate(`/admin/bookings/inquiries/${selectedInquiry._id}`)}
                  className="w-full py-2 px-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <ExternalLink size={13} /> View Full Inquiry Details
                </button>

                {/* Secondary Triage Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setArchiveTarget(selectedInquiry)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                    title={selectedInquiry.archived ? "Restore inquiry" : "Archive inquiry"}
                  >
                    {selectedInquiry.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                    <span>{selectedInquiry.archived ? "Restore Inquiry" : "Archive Inquiry"}</span>
                  </button>
                  {selectedInquiry.status !== "Cancelled" && (
                    <button
                      onClick={() => setCancelTarget(selectedInquiry)}
                      className="py-1.5 px-3 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0 shadow-2xs"
                      title="Reject inquiry"
                    >
                      <X size={13} />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

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

        {/* Modal: New Inquiry (Walk-In / Manual Creation) */}
        {showNewInquiryModal && (
          <WalkInBookingModal
            open={showNewInquiryModal}
            onClose={() => setShowNewInquiryModal(false)}
            onCreated={loadData}
          />
        )}
      </div>
    </AdminLayout>
  );
}
