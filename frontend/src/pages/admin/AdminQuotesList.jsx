import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import ConvertBookingModal from "../../components/admin/quotation/ConvertBookingModal";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { 
  FileText, 
  Clock, 
  Send, 
  CheckCircle, 
  Check,
  Search, 
  Filter, 
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Utensils,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  History,
  X,
  MapPin,
  ExternalLink,
  MoreHorizontal,
  AlertTriangle,
  ArrowUpRight,
  Edit3,
  RotateCcw,
  Sparkles,
  Info,
  DollarSign,
  Package,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Tag,
  Sliders
} from "lucide-react";

/** Avatar Initials with deterministic background color */
const AvatarInitials = ({ name, className = "w-9 h-9 text-xs" }) => {
  const getInitials = (str) => {
    if (!str) return "QT";
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

/** Format currency helper */
const formatPeso = (val) => {
  if (val === null || val === undefined) return "—";
  return `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Format clean date */
const formatDateClean = (dateVal) => {
  if (!dateVal) return "TBA";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Format clean date & time */
const formatDateTimeClean = (dateVal) => {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
};

/** Relative time helper (e.g. "Updated 1h ago") */
const getRelativeTime = (dateStr) => {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  const now = new Date();
  if (isNaN(date.getTime())) return "Just now";
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
};

/** Calculate Expiry Status & Remaining Days */
const getExpiryInfo = (expDateVal) => {
  if (!expDateVal) return { label: "No expiry set", isExpired: false, daysLeft: null, tone: "text-slate-400" };
  const exp = new Date(expDateVal);
  if (isNaN(exp.getTime())) return { label: "No expiry set", isExpired: false, daysLeft: null, tone: "text-slate-400" };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDay = new Date(exp);
  expDay.setHours(0, 0, 0, 0);

  const diffTime = expDay - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "(expired)", isExpired: true, daysLeft: diffDays, tone: "text-rose-600 font-semibold" };
  } else if (diffDays === 0) {
    return { label: "(expires today)", isExpired: false, daysLeft: 0, tone: "text-amber-600 font-semibold" };
  } else {
    return { label: `(${diffDays} day${diffDays === 1 ? "" : "s"} left)`, isExpired: false, daysLeft: diffDays, tone: "text-blue-600 font-medium" };
  }
};

/** Operational Next Action / Needs Attention helper */
const getNextActionInfo = (q) => {
  if (q.status === "Draft") {
    return { label: "Draft (Send Quote)", tone: "bg-amber-50 text-amber-800 border-amber-200/80" };
  }
  if (q.status === "Revision Requested") {
    return { label: "Revision Required", tone: "bg-purple-50 text-purple-800 border-purple-200/80" };
  }
  if (q.status === "Accepted" || q.status === "Quote Accepted" || q.status === "Awaiting Final Confirmation") {
    return { label: "Ready to Convert", tone: "bg-emerald-50 text-emerald-800 border-emerald-200/80" };
  }
  if (q.status === "Converted to Booking" || Boolean(q.convertedBookingId)) {
    return { label: "Booking Confirmed", tone: "bg-teal-50 text-teal-800 border-teal-200/80" };
  }
  if (q.status === "Expired" || q.expInfo?.isExpired) {
    return { label: "Quote Expired", tone: "bg-rose-50 text-rose-700 border-rose-200/80" };
  }
  if (q.status === "Sent" || q.status === "Quotation Sent") {
    if (q.expInfo?.daysLeft !== null && q.expInfo?.daysLeft <= 3) {
      return { label: "Follow-up / Renew", tone: "bg-orange-50 text-orange-800 border-orange-200/80" };
    }
    return { label: "Awaiting Client", tone: "bg-blue-50 text-blue-800 border-blue-200/80" };
  }
  return { label: q.status, tone: "bg-slate-100 text-slate-700 border-slate-200" };
};

export default function AdminQuotesList() {
  const navigate = useNavigate();
  const { notify } = useToast();

  // State
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'recently_updated' | 'event_date' | 'total_amount'
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedRows, setExpandedRows] = useState({});

  // Selected item for right side panel
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [panelTab, setPanelTab] = useState("overview"); // 'overview' | 'event_details' | 'items' | 'timeline'

  // Modal target for Convert to Booking
  const [convertTarget, setConvertTarget] = useState(null);
  const [submittingConvert, setSubmittingConvert] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Booking payment status cache
  const [bookingPayments, setBookingPayments] = useState(() => new Map());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qtnRes, bookingRes] = await Promise.all([
        AdminAPI.getAllQuotations(),
        AdminAPI.getBookings().catch(() => ({ data: [] })),
      ]);
      setQuotations(qtnRes.data || []);
      setBookingPayments(
        new Map((bookingRes.data || []).map((b) => [String(b._id), b.payment_status || "pending"]))
      );
    } catch (err) {
      notify(err.response?.data?.message || "Could not load quotations list.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealTimeRefresh(loadData);

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /** Check if quote is awaiting deposit */
  const isAwaitingDeposit = useCallback((q) => {
    const isAccepted =
      q.status === "Accepted" ||
      q.status === "Quote Accepted" ||
      q.status === "Awaiting Final Confirmation" ||
      q.status === "Converted to Booking";
    if (!isAccepted) return false;

    if (q.payment_status === "deposit_paid" || q.payment_status === "fully_paid" || q.is_paid) {
      return false;
    }

    const bookingId = q.inquiry_id?.converted_booking_id;
    if (!bookingId) return true;
    const paymentStatus = bookingPayments.get(String(bookingId?._id || bookingId));
    return paymentStatus === undefined || paymentStatus === "pending";
  }, [bookingPayments]);

  // Group quotations by inquiry ID (showing latest version per thread)
  const groupedQuotations = useMemo(() => {
    const groups = {};
    quotations.forEach(q => {
      const inqId = (q.inquiry_id && q.inquiry_id._id) ? String(q.inquiry_id._id) : String(q.inquiry_id || q._id);
      if (!groups[inqId]) {
        groups[inqId] = [];
      }
      groups[inqId].push(q);
    });

    return Object.values(groups).map(versionList => {
      versionList.sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
      const issued = versionList.filter(q => q.status !== "Draft");
      const draft = versionList.find(q => q.status === "Draft") || null;
      const latest = issued[0] || draft;

      const inq = latest.inquiry_id || {};
      const expInfo = getExpiryInfo(latest.expiration_date);

      // Customer name & contacts with robust fallbacks
      const customerName = (inq.contact_first_name || inq.contact_last_name)
        ? `${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.trim()
        : [inq.customer_id?.first_name, inq.customer_id?.last_name].filter(Boolean).join(" ")
        || inq.customer_id?.full_name
        || inq.customer_name
        || latest.customer_name
        || "Customer";

      const customerPhone = 
        inq.contact_phone 
        || inq.contact_alt_phone
        || inq.customer_id?.phone 
        || inq.phone 
        || latest.customer_phone 
        || latest.contact_phone 
        || "—";

      const customerEmail = 
        inq.contact_email 
        || inq.customer_id?.email 
        || inq.email 
        || latest.customer_email 
        || latest.contact_email 
        || "—";

      // Venue full
      const venueFull = [inq.venue_type, inq.street, inq.barangay, inq.municipality, inq.province].filter(Boolean).join(", ") || inq.venue_type || "Venue TBA";

      const updatedTime = latest.updatedAt || latest.createdAt || inq.updatedAt || inq.createdAt;

      return {
        ...latest,
        type: "QUOTATION",
        id: latest._id,
        inquiryId: inq._id || latest.inquiry_id,
        quotationNumber: latest.quotation_number || `QTN-${latest._id.slice(-6).toUpperCase()}`,
        reference: inq.reference || `INQ-${(inq._id || "").slice(-6).toUpperCase()}`,
        eventType: inq.event_type || "Event",
        customerName,
        customerPhone,
        customerEmail,
        phone: customerPhone,
        email: customerEmail,
        eventDate: inq.event_date,
        eventTime: inq.start_time || "TBA",
        venue: inq.venue_type || inq.street || "TBA",
        venueFull,
        guestCount: latest.guest_count || inq.guest_count || 0,
        status: latest.status || "Draft",
        expirationDate: latest.expiration_date,
        expInfo,
        hasDraft: Boolean(draft),
        version: latest.version_number || 1,
        totalCost: latest.total_cost || 0,
        depositAmount: latest.deposit_amount || 0,
        packagePrice: latest.package_price || 0,
        packageName: latest.package_name || "Custom Package",
        menuItems: Array.isArray(latest.menu_items) ? latest.menu_items : [],
        addOns: Array.isArray(latest.add_ons) ? latest.add_ons : [],
        additionalFees: Array.isArray(latest.additional_fees) ? latest.additional_fees : [],
        history: versionList,
        rawInquiry: inq,
        isAwaitingDeposit: isAwaitingDeposit(latest),
        convertedBookingId: inq.converted_booking_id || null,
        createdAt: latest.createdAt || inq.createdAt,
        updatedAt: updatedTime,
        updatedRelative: getRelativeTime(updatedTime),
      };
    });
  }, [quotations, isAwaitingDeposit]);

  // Unique Event Types for Dropdown Filter
  const availableEventTypes = useMemo(() => {
    const types = new Set(groupedQuotations.map(q => q.eventType).filter(Boolean));
    return Array.from(types);
  }, [groupedQuotations]);

  // Metrics KPI calculations (STRICTLY 4 CARDS)
  const metrics = useMemo(() => {
    const totalQuotations = groupedQuotations.length;
    const sentCount = groupedQuotations.filter(q => q.status === "Sent" || q.status === "Quotation Sent").length;
    const revisionCount = groupedQuotations.filter(q => q.status === "Revision Requested").length;
    const acceptedCount = groupedQuotations.filter(q =>
      q.status === "Accepted" || q.status === "Quote Accepted" || q.status === "Converted to Booking" || Boolean(q.convertedBookingId)
    ).length;
    const draftCount = groupedQuotations.filter(q => q.status === "Draft").length;
    const expiredCount = groupedQuotations.filter(q => q.status === "Expired" || q.expInfo?.isExpired).length;

    const sentPct = totalQuotations > 0 ? Math.round((sentCount / totalQuotations) * 100) : 0;
    const revisionPct = totalQuotations > 0 ? Math.round((revisionCount / totalQuotations) * 100) : 0;
    const acceptedPct = totalQuotations > 0 ? Math.round((acceptedCount / totalQuotations) * 100) : 0;

    return {
      totalQuotations,
      sentCount,
      sentPct,
      revisionCount,
      revisionPct,
      acceptedCount,
      acceptedPct,
      draftCount,
      expiredCount,
    };
  }, [groupedQuotations]);

  // Filtered dataset
  const filteredQuotations = useMemo(() => {
    let items = groupedQuotations.filter(q => {
      // Status Tab filter
      if (activeTab === "draft" && q.status !== "Draft") return false;
      if (activeTab === "sent" && (q.status !== "Sent" && q.status !== "Quotation Sent")) return false;
      if (activeTab === "revision" && q.status !== "Revision Requested") return false;
      if (activeTab === "accepted" && (q.status !== "Accepted" && q.status !== "Quote Accepted" && q.status !== "Awaiting Final Confirmation")) return false;
      if (activeTab === "converted" && (q.status !== "Converted to Booking" && !q.convertedBookingId)) return false;
      if (activeTab === "expired" && (q.status !== "Expired" && !q.expInfo?.isExpired)) return false;

      // Event Type filter
      if (eventTypeFilter !== "all" && q.eventType !== eventTypeFilter) return false;

      // Date Range filter
      if (dateRangeFilter === "next_7" || dateRangeFilter === "next_30") {
        if (!q.eventDate) return false;
        const now = new Date();
        const evDate = new Date(q.eventDate);
        const limitDays = dateRangeFilter === "next_7" ? 7 : 30;
        const limitDate = new Date();
        limitDate.setDate(now.getDate() + limitDays);
        if (evDate < now || evDate > limitDate) return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchQtn = (q.quotationNumber || "").toLowerCase().includes(query);
        const matchRef = (q.reference || "").toLowerCase().includes(query);
        const matchName = (q.customerName || "").toLowerCase().includes(query);
        const matchEmail = (q.customerEmail || "").toLowerCase().includes(query);
        const matchEvent = (q.eventType || "").toLowerCase().includes(query);
        const matchVenue = (q.venue || "").toLowerCase().includes(query);
        if (!matchQtn && !matchRef && !matchName && !matchEmail && !matchEvent && !matchVenue) {
          return false;
        }
      }

      return true;
    });

    // Sorting logic
    items.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === "recently_updated") {
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      }
      if (sortBy === "event_date") {
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return new Date(a.eventDate) - new Date(b.eventDate);
      }
      if (sortBy === "total_amount") {
        return (b.totalCost || 0) - (a.totalCost || 0);
      }
      return 0;
    });

    return items;
  }, [groupedQuotations, activeTab, eventTypeFilter, dateRangeFilter, search, sortBy]);

  // Pagination calculation
  const totalItems = filteredQuotations.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotations.slice(start, start + pageSize);
  }, [filteredQuotations, currentPage, pageSize]);

  /** Status Badge renderer matching design system */
  const renderStatusBadge = (status, isExpired) => {
    if (isExpired && status !== "Converted to Booking") {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 inline-flex items-center gap-1 w-fit">
          <AlertTriangle size={11} className="text-rose-600" /> Expired
        </span>
      );
    }
    switch (status) {
      case "Draft":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 inline-flex items-center gap-1 w-fit">
            <Edit3 size={11} className="text-amber-600" /> Draft
          </span>
        );
      case "Revision Requested":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-purple-50 text-purple-800 border border-purple-200/80 inline-flex items-center gap-1 w-fit">
            <RotateCcw size={11} className="text-purple-600" /> Revision Requested
          </span>
        );
      case "Sent":
      case "Quotation Sent":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 inline-flex items-center gap-1 w-fit">
            <Send size={11} className="text-blue-600" /> Sent
          </span>
        );
      case "Accepted":
      case "Quote Accepted":
      case "Awaiting Final Confirmation":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 inline-flex items-center gap-1 w-fit">
            <CheckCircle size={11} className="text-emerald-600" /> Accepted
          </span>
        );
      case "Converted to Booking":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 inline-flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} className="text-teal-600" /> Converted
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 w-fit">
            {status}
          </span>
        );
    }
  };

  /** Reset all search & filter dropdowns */
  const clearFilters = () => {
    setSearch("");
    setSortBy("newest");
    setDateRangeFilter("all");
    setEventTypeFilter("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedQuotation) {
        setSelectedQuotation(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedQuotation]);

  return (
    <AdminLayout>
      <div className="space-y-3 bg-background min-h-screen">
        
        {/* Header Section (Refresh Button at top right, no Create Quotation) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Quotations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage and track all quotations. Follow up with customers and convert to bookings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
              title="Refresh quotations data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Main Content Area (Uncompressed 100% Full Width) */}
        <div className="space-y-3 w-full">
            
            {/* STRICTLY 4 KPI METRIC CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Card 1: Total Quotations */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    TOTAL QUOTATIONS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tracking-tight text-foreground">{metrics.totalQuotations}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                      <ArrowUpRight size={10} /> 12%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">vs. last 7 days</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50">
                  <FileText size={13} />
                </div>
              </div>

              {/* Card 2: Sent to Customer */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    SENT TO CUSTOMER
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{metrics.sentCount}</span>
                  <p className="text-[10px] text-muted-foreground">{metrics.sentPct}% of total</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50">
                  <Send size={13} />
                </div>
              </div>

              {/* Card 3: Revisions Requested */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    REVISIONS REQUESTED
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{metrics.revisionCount}</span>
                  <p className="text-[10px] text-muted-foreground">{metrics.revisionPct}% of total</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <RotateCcw size={13} />
                </div>
              </div>

              {/* Card 4: Accepted & Converted */}
              <div className="bg-card border border-border/70 rounded-xl p-3 flex items-start justify-between shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    ACCEPTED & BOOKED
                  </span>
                  <span className="text-xl font-bold tracking-tight text-foreground">{metrics.acceptedCount}</span>
                  <p className="text-[10px] text-muted-foreground">{metrics.acceptedPct}% of total</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/50">
                  <CheckCircle size={13} />
                </div>
              </div>

            </div>

            {/* Stacked Label Filter Controls Bar (With Sort By Control) */}
            <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 shadow-2xs">
              <div className="flex flex-wrap items-end gap-2.5 text-xs">
                
                {/* Search Input Field */}
                <div className="flex-1 min-w-[180px] flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Quotations</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={13} />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search quotation no., customer, event, venue..."
                      className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-8"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sort By Dropdown (Replaces Status Dropdown) */}
                <div className="flex flex-col gap-1 min-w-[130px] shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="recently_updated">Recently Updated</option>
                    <option value="event_date">Event Date</option>
                    <option value="total_amount">Total Amount</option>
                  </select>
                </div>

                {/* Event Type Dropdown */}
                <div className="flex flex-col gap-1 min-w-[120px] shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Event Type</label>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => {
                      setEventTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="all">All Event Types</option>
                    {availableEventTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range Dropdown */}
                <div className="flex flex-col gap-1 min-w-[110px] shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Range</label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => {
                      setDateRangeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-background border border-input rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer h-8"
                  >
                    <option value="all">All Dates</option>
                    <option value="next_7">Next 7 Days</option>
                    <option value="next_30">Next 30 Days</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(search || dateRangeFilter !== "all" || eventTypeFilter !== "all" || activeTab !== "all" || sortBy !== "newest") && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-primary hover:underline h-8 flex items-center cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Status Tabs Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/40">
              {[
                { id: "all", label: `All (${metrics.totalQuotations})` },
                { id: "draft", label: `Draft (${metrics.draftCount})` },
                { id: "sent", label: `Sent (${metrics.sentCount})` },
                { id: "revision", label: `Revision Requested (${metrics.revisionCount})` },
                { id: "accepted", label: `Accepted (${metrics.acceptedCount})` },
                { id: "converted", label: `Converted (${metrics.acceptedCount})` },
                { id: "expired", label: `Expired (${metrics.expiredCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Main Table Container */}
            <div className="bg-card rounded-xl border border-border/70 shadow-2xs overflow-hidden">
              {loading ? (
                <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Loading quotations...</p>
                </div>
              ) : paginatedItems.length === 0 ? (
                <div className="p-16 text-center text-muted-foreground space-y-3">
                  <FileText size={36} className="mx-auto text-muted/50" />
                  <h3 className="text-sm font-bold text-foreground">No Quotations Found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">There are no records matching your selected filters.</p>
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors shadow-2xs cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground text-[10.5px] font-bold uppercase tracking-wider border-b border-border/70">
                        <th className="py-2.5 px-3">Quotation / Inquiry</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Event Details</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status & Next Action</th>
                        <th className="py-2.5 px-3">Last Activity</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {paginatedItems.map((item) => {
                        const isSelected = selectedQuotation?.id === item.id;
                        const isExpanded = !!expandedRows[item.id];
                        const hasHistory = item.history && item.history.length > 1;
                        const nextAction = getNextActionInfo(item);

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              onClick={() => setSelectedQuotation(item)}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                              }`}
                            >
                              {/* 1. QTN / Inquiry Ref */}
                              <td className="py-3 px-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-primary font-mono text-xs">{item.quotationNumber}</span>
                                    {item.version && (
                                      <span className="px-1 py-0.2 text-[9px] font-bold font-mono bg-muted text-muted-foreground rounded border border-border/70">
                                        v{item.version}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10.5px] text-muted-foreground block font-mono">
                                    From {item.reference}
                                  </span>
                                  {hasHistory && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(item.id);
                                      }}
                                      className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                                    >
                                      <History size={10} />
                                      <span>{item.history.length} Revisions</span>
                                      {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* 2. Customer */}
                              <td className="py-3 px-3 min-w-[130px]">
                                <div className="min-w-0 space-y-0.5">
                                  <span className="font-bold text-foreground block truncate max-w-[140px]">{item.customerName}</span>
                                  <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">{item.customerPhone}</span>
                                </div>
                              </td>

                              {/* 3. Event Details */}
                              <td className="py-3 px-3">
                                <div className="space-y-0.5 min-w-[120px]">
                                  <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                                    <Calendar size={11} className="text-primary shrink-0" />
                                    <span className="truncate">{item.eventType}</span>
                                  </div>
                                  <span className="text-[10.5px] text-muted-foreground block">
                                    {formatDateClean(item.eventDate)} • {item.guestCount} guests
                                  </span>
                                </div>
                              </td>

                              {/* 4. Amount */}
                              <td className="py-3 px-3 font-bold font-mono text-foreground text-xs whitespace-nowrap">
                                {formatPeso(item.totalCost)}
                              </td>

                              {/* 5. Status & Data-Driven Next Action Indicator */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col items-start gap-1">
                                  {renderStatusBadge(item.status, item.expInfo?.isExpired)}
                                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border tracking-tight ${nextAction.tone}`}>
                                    {nextAction.label}
                                  </span>
                                </div>
                              </td>

                              {/* 6. Last Activity Indicator */}
                              <td className="py-3 px-3 text-muted-foreground text-[10.5px]">
                                <span className="font-semibold text-foreground block">
                                  {item.updatedRelative}
                                </span>
                                <span className="text-[9.5px] text-muted-foreground block">
                                  {formatDateClean(item.updatedAt)}
                                </span>
                              </td>

                              {/* 7. Actions (Standard View Button & Quick Convert) */}
                              <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {(item.status === "Accepted" || item.status === "Quote Accepted") && (
                                    <button
                                      onClick={() => setConvertTarget(item)}
                                      className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                      title="Convert to Booking"
                                    >
                                      <CheckCircle size={11} /> Convert
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedQuotation(item)}
                                    className="px-2.5 py-1 text-xs font-semibold text-foreground bg-card border border-border/80 hover:bg-muted hover:text-primary rounded-md transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                                    title="View Quotation Summary"
                                    aria-label="View Quotation Summary"
                                  >
                                    <Eye size={13} className="text-muted-foreground" />
                                    <span>View</span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Version History Sub-row */}
                            {isExpanded && hasHistory && (
                              <tr className="bg-amber-50/20 border-t border-b border-amber-200/50">
                                <td colSpan={7} className="p-2.5 pl-8">
                                  <div className="bg-card rounded-lg border border-border/70 p-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                                        <History size={12} className="text-primary" /> Revision History for {item.reference}
                                      </h4>
                                      <span className="text-[10px] text-muted-foreground font-medium">Versions: {item.history.length}</span>
                                    </div>
                                    <div className="divide-y divide-border/60 border border-border/60 rounded-md overflow-hidden text-xs">
                                      {item.history.map((ver, idx) => {
                                        const isDraft = ver.status === "Draft";
                                        const isLatestIssued = !isDraft && !item.history.slice(0, idx).some(v => v.status !== "Draft");
                                        return (
                                          <div key={ver._id} className="p-2 flex items-center justify-between hover:bg-muted/40 transition-colors">
                                            <div className="flex items-center gap-2">
                                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isDraft ? "bg-amber-100 text-amber-800" : isLatestIssued ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                                                v{ver.version_number || 1} {isDraft ? "(Draft)" : isLatestIssued ? "(Latest)" : ""}
                                              </span>
                                              <span className="font-mono font-semibold text-foreground text-[11px]">
                                                {ver.quotation_number || `QTN-${ver._id.slice(-6).toUpperCase()}`}
                                              </span>
                                              <span className="text-muted-foreground/60">•</span>
                                              <span className="text-muted-foreground text-[10px]">
                                                {isDraft ? "Not sent" : `Issued: ${formatDateClean(ver.createdAt)}`}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold font-mono text-foreground text-[11px]">
                                                {formatPeso(ver.total_cost)}
                                              </span>
                                              {renderStatusBadge(ver.status, false)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Pattern & Placement (Exact Match with Inquiries Page) */}
              <div className="px-3 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-6 h-6 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                        currentPage === p ? "bg-primary text-primary-foreground shadow-2xs" : "border border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-md border border-input bg-background disabled:opacity-40 hover:bg-accent transition-colors cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
                <div className="text-muted-foreground text-[10px]">
                  Showing {totalItems === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} quotations
                </div>
              </div>
            </div>
        </div>

        {/* Slide-Over Quotation Summary Drawer */}
        {selectedQuotation && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quotation-drawer-title"
          >
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in-0 duration-200"
              onClick={() => setSelectedQuotation(null)}
              aria-hidden="true"
            />

            {/* Slide-Over Panel */}
            <div className="relative w-full max-w-[460px] h-full bg-card border-l border-border/80 shadow-2xl flex flex-col z-10 text-xs animate-in slide-in-from-right duration-200">
              
              {/* Pinned Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 id="quotation-drawer-title" className="font-bold text-sm text-foreground truncate">
                    Quotation Summary
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    {selectedQuotation.quotationNumber}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedQuotation(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Close panel"
                  aria-label="Close details panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {/* Customer Info Card Header */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarInitials name={selectedQuotation.customerName} className="w-9 h-9 text-xs" />
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Customer</span>
                        <h4 className="font-bold text-foreground text-sm truncate">{selectedQuotation.customerName}</h4>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {renderStatusBadge(selectedQuotation.status, selectedQuotation.expInfo?.isExpired)}
                      <span className="text-[10px] font-mono text-muted-foreground">v{selectedQuotation.version}</span>
                    </div>
                  </div>

                  {/* Quick Contact Line */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <Phone size={12} className="shrink-0 text-primary" />
                      <a href={`tel:${selectedQuotation.phone}`} className="truncate hover:text-foreground hover:underline">
                        {selectedQuotation.phone || "N/A"}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <Mail size={12} className="shrink-0 text-primary" />
                      <a href={`mailto:${selectedQuotation.email}`} className="truncate hover:text-foreground hover:underline">
                        {selectedQuotation.email || "N/A"}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid (Total, Deposit & Validity) */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-card border border-border/70 rounded-xl p-2.5 shadow-2xs">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground block">Total Quoted</span>
                    <span className="text-xs font-bold font-mono text-foreground block truncate">{formatPeso(selectedQuotation.totalCost)}</span>
                  </div>
                  <div className="bg-card border border-border/70 rounded-xl p-2.5 shadow-2xs">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground block">Deposit Due</span>
                    <span className="text-xs font-bold font-mono text-emerald-600 block truncate">{formatPeso(selectedQuotation.depositAmount)}</span>
                  </div>
                  <div className="bg-card border border-border/70 rounded-xl p-2.5 shadow-2xs">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground block flex items-center gap-1">
                      <Calendar size={10} className="text-primary" /> Valid Until
                    </span>
                    <span className="text-[11px] font-bold text-foreground block truncate">
                      {formatDateClean(selectedQuotation.expirationDate)}
                    </span>
                    <span className={`text-[9.5px] block truncate font-medium ${selectedQuotation.expInfo?.tone}`}>
                      {selectedQuotation.expInfo?.label}
                    </span>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-border text-xs font-semibold">
                  {[
                    { id: "overview", label: "Overview", icon: FileText },
                    { id: "event_details", label: "Venue & Setup", icon: MapPin },
                    { id: "items", label: "Financials", icon: CreditCard },
                    { id: "timeline", label: "Timeline", icon: History },
                  ].map((t) => {
                    const IconComp = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setPanelTab(t.id)}
                        className={`pb-2 px-2.5 border-b-2 transition-colors cursor-pointer text-center flex-1 flex items-center justify-center gap-1 text-xs ${
                          panelTab === t.id
                            ? "border-primary text-primary font-bold"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <IconComp size={12} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tabs Content */}
                <div className="space-y-3">
                  {/* Tab 1: Overview */}
                  {panelTab === "overview" && (
                    <div className="space-y-3">
                      {/* Event Information Card */}
                      <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary" /> Event & Venue
                        </h5>
                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium">Date & Time</span>
                            <span className="font-semibold text-foreground">{formatDateClean(selectedQuotation.eventDate)}</span>
                            <span className="text-[11px] text-muted-foreground block">{selectedQuotation.eventTime}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block font-medium">Event Type</span>
                            <span className="font-semibold text-foreground">{selectedQuotation.eventType}</span>
                            <span className="text-[11px] text-muted-foreground block">{selectedQuotation.guestCount} guests (pax)</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] text-muted-foreground block font-medium">Catering Package</span>
                            <span className="font-semibold text-foreground">{selectedQuotation.packageName}</span>
                          </div>
                          <div className="col-span-2 pt-1.5 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
                              <MapPin size={11} className="text-primary" /> Venue Address
                            </span>
                            <span className="font-medium text-foreground leading-snug block mt-0.5">{selectedQuotation.venueFull}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quotation Status Stepper */}
                      <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Progress</h5>
                        <div className="space-y-2 border-l-2 border-primary/40 pl-3">
                          <div>
                            <p className="font-bold text-foreground">Inquiry Received</p>
                            <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.createdAt)}</p>
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Quotation Created (v{selectedQuotation.version})</p>
                            <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.updatedAt)}</p>
                          </div>
                          {["Sent", "Quotation Sent", "Accepted", "Converted to Booking"].includes(selectedQuotation.status) && (
                            <div>
                              <p className="font-bold text-foreground">Sent to Customer</p>
                              <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.updatedAt)}</p>
                            </div>
                          )}
                          {selectedQuotation.status === "Revision Requested" && (
                            <div>
                              <p className="font-bold text-purple-800">Revision Requested</p>
                              <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.updatedAt)}</p>
                            </div>
                          )}
                          {(selectedQuotation.status === "Accepted" || selectedQuotation.status === "Converted to Booking") && (
                            <div>
                              <p className="font-bold text-emerald-800">Quote Accepted</p>
                              <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.updatedAt)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Related Inquiry Card */}
                      <div className="bg-card border border-border/70 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2">
                          <FileText size={15} className="text-primary" />
                          <div>
                            <span className="text-[9.5px] text-muted-foreground font-semibold uppercase block">Related Inquiry</span>
                            <span className="font-bold text-foreground font-mono">{selectedQuotation.reference}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/admin/inquiries?search=${selectedQuotation.reference}`)}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          View <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Event Details */}
                  {panelTab === "event_details" && (
                    <div className="space-y-3">
                      <div className="bg-card border border-border/70 rounded-xl p-3 space-y-1.5 shadow-2xs">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Venue Specs</h5>
                        <div className="space-y-1 text-xs">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Address</p>
                            <p className="font-semibold text-foreground">{selectedQuotation.venueFull}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Package Selected</p>
                            <p className="font-semibold text-foreground">{selectedQuotation.packageName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card border border-border/70 rounded-xl p-3 space-y-1.5 shadow-2xs">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Setup Notes</h5>
                        {selectedQuotation.rawInquiry?.special_requests ? (
                          <p className="text-foreground leading-relaxed whitespace-pre-line text-xs">
                            {selectedQuotation.rawInquiry.special_requests}
                          </p>
                        ) : (
                          <p className="text-muted-foreground italic text-xs">No special setup notes recorded.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Items Breakdown */}
                  {panelTab === "items" && (
                    <div className="space-y-3">
                      <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Financial Breakdown</h5>
                        <div className="space-y-1.5 text-xs divide-y divide-border/60">
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Package Base Price</span>
                            <span className="font-bold font-mono">{formatPeso(selectedQuotation.packagePrice)}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Menu Items ({selectedQuotation.menuItems.length})</span>
                            <span className="font-semibold font-mono">Included</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Add-ons ({selectedQuotation.addOns.length})</span>
                            <span className="font-semibold font-mono">Included</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Required Deposit</span>
                            <span className="font-bold font-mono text-emerald-600">{formatPeso(selectedQuotation.depositAmount)}</span>
                          </div>
                          <div className="flex justify-between pt-2 text-sm">
                            <span className="font-bold text-foreground">Quoted Total</span>
                            <span className="font-bold font-mono text-primary">{formatPeso(selectedQuotation.totalCost)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Timeline Lifecycle */}
                  {panelTab === "timeline" && (
                    <div className="bg-card border border-border/70 rounded-xl p-3 space-y-2 shadow-2xs">
                      <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Lifecycle Log</h5>
                      <div className="space-y-2 border-l-2 border-primary/40 pl-3 text-xs">
                        <div>
                          <p className="font-bold text-foreground">Inquiry Created</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.createdAt)}</p>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Latest Version Issued (v{selectedQuotation.version})</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTimeClean(selectedQuotation.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Action Footer */}
              <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-xs flex flex-col gap-2 shrink-0">
                {/* Primary Contextual Action */}
                {selectedQuotation.status === "Accepted" ? (
                  <button
                    onClick={() => setConvertTarget(selectedQuotation)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <CheckCircle size={14} /> Convert to Booking
                  </button>
                ) : selectedQuotation.status === "Draft" ? (
                  <button
                    onClick={() => navigate(`/admin/quotes/${selectedQuotation.inquiryId}/details`)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Edit3 size={14} /> Edit Quotation Draft
                  </button>
                ) : selectedQuotation.status === "Revision Requested" ? (
                  <button
                    onClick={() => navigate(`/admin/quotes/${selectedQuotation.inquiryId}/details`)}
                    className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <RotateCcw size={14} /> Revise Quotation
                  </button>
                ) : selectedQuotation.status === "Converted to Booking" || Boolean(selectedQuotation.convertedBookingId) ? (
                  <button
                    onClick={() => navigate('/admin/bookings/reservations')}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> View Confirmed Booking
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/admin/quotes/${selectedQuotation.inquiryId}/details`)}
                    className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <FileText size={14} /> View Quotation Details
                  </button>
                )}

                {/* Secondary Actions Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/quotes/${selectedQuotation.inquiryId}/details`)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                    title="Open full quotation details"
                  >
                    <ExternalLink size={12} className="text-muted-foreground" />
                    <span>Open Full Details</span>
                  </button>
                  <button
                    onClick={() => navigate(`/admin/inquiries?search=${selectedQuotation.reference}`)}
                    className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0 shadow-2xs"
                    title="View related customer inquiry"
                  >
                    <ArrowUpRight size={13} />
                    <span>Inquiry</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal: Convert Quotation to Booking */}
        {convertTarget && (
          <ConvertBookingModal
            quote={convertTarget}
            isDepositPaidProp={!convertTarget.isAwaitingDeposit}
            submitting={submittingConvert}
            onClose={() => setConvertTarget(null)}
            onConfirm={(managerId, bypassDeposit = false) => {
              setSubmittingConvert(true);
              AdminAPI.createBookingFromInquiry(convertTarget.inquiryId, {
                event_manager_id: managerId,
                bypass_deposit: bypassDeposit,
              })
                .then(() => {
                  notify("Quotation successfully converted to booking!", "success");
                  setConvertTarget(null);
                  loadData();
                })
                .catch((err) => {
                  notify(err.response?.data?.message || "Failed to convert quotation to booking.", "error");
                })
                .finally(() => setSubmittingConvert(false));
            }}
          />
        )}

      </div>
    </AdminLayout>
  );
}
