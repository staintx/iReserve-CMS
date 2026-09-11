import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import CustomerQuotationModal from "../../components/customer/CustomerQuotationModal";
import CustomerInquiryEditModal from "../../components/customer/CustomerInquiryEditModal";
import { getEventThumbnail } from "../../utils/eventThumbnails";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";
import {
  inquiryStatusGroup,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { cn } from "@/lib/utils";
import { formatEventDateWithDay, formatShortDate } from "../../utils/format";
import {
  FileText,
  Plus,
  CreditCard,
  FileCheck2,
  XCircle,
  Clock,
  MapPin,
  Users,
  Calendar,
  Search,
  ChevronRight,
  Utensils,
  ArrowLeft,
  ChevronDown,
  ArrowRight,
  Package,
  Check,
  SlidersHorizontal,
} from "lucide-react";

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { notify } = useToast();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Mobile View Toggle: 'list' | 'detail'
  const [mobileView, setMobileView] = useState("list");

  // Modal State for viewing Quotation
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [activeQuotationInquiry, setActiveQuotationInquiry] = useState(null);
  const [quotationVersions, setQuotationVersions] = useState([]);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Cancel Dialog State
  const [cancellingInquiry, setCancellingInquiry] = useState(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Edit Details Modal State
  const [editingInquiry, setEditingInquiry] = useState(null);

  // Selected inquiry ID for overview panel
  const [selectedInquiryId, setSelectedInquiryId] = useState(params.id || null);

  const openEditModal = async (inq) => {
    if (!inq?._id) return;
    try {
      const res = await CustomerAPI.getInquiryById(inq._id);
      setEditingInquiry(res.data);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load your request details.", "error");
    }
  };

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const inqRes = await CustomerAPI.getInquiries();
      setInquiries(inqRes.data || []);
    } catch (err) {
      notify("Failed to load inquiries.", "error");
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // Handle URL parameters for deep-linking
  useEffect(() => {
    if (params.id) {
      setSelectedInquiryId(params.id);
      setMobileView("detail");
    }
    const isEditRoute = location.pathname.includes("/edit");
    if (isEditRoute && params.id) {
      const match = inquiries.find((i) => i._id === params.id);
      if (match) {
        openEditModal(match);
      }
    }
  }, [params.id, location.pathname, inquiries]);

  const verifyingPaymentRef = useRef(new Set());

  // Automatic real-time confirmation on return from PayMongo checkout
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentStatus = searchParams.get("payment");
    const paymentId = searchParams.get("payment_id");

    if (paymentStatus === "success" && paymentId) {
      if (verifyingPaymentRef.current.has(paymentId)) return;
      verifyingPaymentRef.current.add(paymentId);

      const toastId = `payment-verify-${paymentId}`;
      const verify = async () => {
        try {
          notify("Confirming your payment with gateway...", "info", { id: toastId });
          await CustomerAPI.verifyPayment(paymentId);
          notify("Deposit payment confirmed! Your booking is locked.", "success", { id: toastId });
          fetchInquiries();
        } catch (err) {
          notify(err.response?.data?.message || "Failed to confirm payment.", "error", { id: toastId });
          fetchInquiries();
        }
      };
      verify();
      navigate(location.pathname, { replace: true });
    } else if (paymentStatus === "cancelled") {
      const cancelKey = `cancelled_${location.search}`;
      if (!verifyingPaymentRef.current.has(cancelKey)) {
        verifyingPaymentRef.current.add(cancelKey);
        notify("Payment checkout was cancelled.", "warning", { id: "payment-cancelled" });
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search]);

  useRealTimeRefresh(fetchInquiries);

  // Filtered & Sorted Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries
      .filter((inq) => {
        if (statusFilter !== "all" && inquiryStatusGroup(inq) !== statusFilter) {
          return false;
        }
        if (serviceTypeFilter !== "all" && resolveServiceType(inq) !== serviceTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const ref = (inq.reference || "").toLowerCase();
          const type = (inq.event_type || "").toLowerCase();
          const name = `${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.toLowerCase();
          const city = (inq.municipality || inq.province || "").toLowerCase();

          return ref.includes(q) || type.includes(q) || name.includes(q) || city.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeA - timeB;
        }
        if (sortBy === "date") {
          const timeA = new Date(a.event_date || 0).getTime();
          const timeB = new Date(b.event_date || 0).getTime();
          return timeA - timeB;
        }
        // Default: newest
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
  }, [inquiries, statusFilter, serviceTypeFilter, searchQuery, sortBy]);

  const isFiltered = Boolean(searchQuery.trim()) || statusFilter !== "all" || serviceTypeFilter !== "all";

  // Auto-select first inquiry for desktop detail pane
  useEffect(() => {
    if (filteredInquiries.length > 0) {
      if (!selectedInquiryId || !filteredInquiries.some((i) => i._id === selectedInquiryId)) {
        setSelectedInquiryId(filteredInquiries[0]._id);
      }
    } else {
      setSelectedInquiryId(null);
    }
  }, [filteredInquiries, selectedInquiryId]);

  const selectedInquiry = useMemo(() => {
    return inquiries.find((i) => i._id === selectedInquiryId) || filteredInquiries[0] || null;
  }, [inquiries, filteredInquiries, selectedInquiryId]);

  const handleSelectInquiry = (id) => {
    setSelectedInquiryId(id);
    setMobileView("detail");
  };

  const handleViewInquiry = (inq) => {
    setSelectedInquiryId(inq._id);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      navigate(`/customer/inquiries/${inq._id}`);
    } else {
      setMobileView("detail");
    }
  };

  // Open Quotation Modal
  const openQuotationView = async (inq) => {
    if (!inq?._id) {
      notify("Inquiry details are not available.", "error");
      return;
    }
    try {
      setIsLoadingQuotation(true);
      const res = await CustomerAPI.getQuotationsForInquiry(inq._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]);
        setQuotationVersions(quotes);
        setActiveQuotationInquiry(inq);
        setIsQuotationModalOpen(true);
      } else {
        notify("No quotation has been issued for this inquiry yet.", "info");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load quotation.", "error");
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  // Start Deposit Checkout
  const startInquiryCheckout = async (inq) => {
    try {
      const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
      const isDepositPaid =
        inq.payment_status === "deposit_paid" ||
        inq.payment_status === "fully_paid" ||
        inq.is_deposit_paid === true;

      if (isConverted || isDepositPaid) {
        notify("The deposit payment for this inquiry has already been completed.", "info");
        if (inq.converted_booking_id) {
          navigate(`/customer/bookings/${inq.converted_booking_id}`);
        }
        return;
      }

      notify("Generating checkout session for deposit payment...", "info");
      const qRes = await CustomerAPI.getQuotationsForInquiry(inq._id);
      const quotes = qRes.data || [];
      const latestQuote = quotes[0];
      const depositVal =
        Number(latestQuote?.deposit_amount) > 0
          ? Number(latestQuote.deposit_amount)
          : Number(inq.total_price || 0);

      if (depositVal <= 0) {
        notify("Deposit amount has not been set yet.", "error");
        return;
      }

      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        inquiry_id: inq._id,
        amount: depositVal,
        payment_type: "deposit",
      });

      if (checkoutRes.data?.checkout_url) {
        notify("Redirecting to PayMongo checkout...", "success");
        window.location.assign(checkoutRes.data.checkout_url);
      } else {
        notify("Could not generate payment checkout URL.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start deposit payment checkout.", "error");
    }
  };

  // Cancel Inquiry Handler
  const handleCancelInquiry = async () => {
    if (!cancellingInquiry) return;
    try {
      setIsSubmittingCancel(true);
      await CustomerAPI.cancelInquiry(cancellingInquiry._id);
      notify("Inquiry has been cancelled.", "info");
      setCancellingInquiry(null);
      fetchInquiries();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to cancel inquiry.", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Modern Compact Dotless Status Badge - Distinct from Buttons
  const renderStatusBadge = (inq) => {
    const meta = inquiryStatusMeta(inq);
    let badgeClass = "bg-blue-50 text-blue-700 border-blue-200/80";

    if (meta.tone === "warning") {
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    } else if (meta.tone === "success") {
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    } else if (meta.tone === "danger" || meta.tone === "neutral") {
      badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    }

    return (
      <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 shrink-0 select-none", badgeClass)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{meta.label}</span>
      </span>
    );
  };

  // Audited Dynamic Action Button Renderer - Error prevention: only render valid customer actions
  const renderCardActionButton = (inq) => {
    const isQuotationSent = inq.status === "Quotation Sent";
    const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
    const isDepositPaid =
      inq.payment_status === "deposit_paid" ||
      inq.payment_status === "fully_paid" ||
      inq.is_deposit_paid === true;

    // Review Quotation appears strictly when quotation is published & available to review
    if (isQuotationSent) {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openQuotationView(inq);
            }}
            disabled={isLoadingQuotation}
            className="bg-[#1E3563] hover:bg-[#152547] text-white font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer shadow-2xs gap-1.5 active:scale-[0.98]"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Review quotation</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-all hidden md:block" />
        </div>
      );
    }

    if (inq.total_price > 0 && !isConverted && !isDepositPaid && !["Cancelled", "Quote Rejected"].includes(inq.status)) {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              startInquiryCheckout(inq);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer shadow-2xs gap-1.5 active:scale-[0.98]"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay Deposit</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-all hidden md:block" />
        </div>
      );
    }

    // Explicit View Button when no secondary action is required
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          handleViewInquiry(inq);
        }}
        className="border-slate-200 text-[#2C4B8A] group-hover:border-[#2C4B8A] group-hover:bg-[#2C4B8A] group-hover:text-white font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer shadow-2xs gap-1 transition-all"
      >
        <span>View</span>
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </Button>
    );
  };

  const selectedMeta = useMemo(() => inquiryStatusMeta(selectedInquiry), [selectedInquiry]);

  // Determine active step index (0-3) for 4-Step Catering Journey Timeline
  const activeInquiryStep = useMemo(() => {
    if (!selectedInquiry) return 0;
    const status = selectedInquiry.status;
    if (status === "Converted to Booking" || selectedInquiry.converted_booking_id) return 3;
    if (status === "Quote Accepted" || status === "Awaiting Final Confirmation" || selectedInquiry.is_deposit_paid) return 2;
    if (status === "Quotation Sent" || status === "Revision Requested") return 1;
    return 0; // Pending Review, Under Review, etc.
  }, [selectedInquiry]);

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-[#F8FAFC] flex flex-col font-sans antialiased overflow-hidden">
        {/* CLEAN TOP PAGE HEADER */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              My Inquiries
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              View and manage your event inquiries, track request status, and review official quotations.
            </p>
          </div>

          <Button
            onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
            className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-xs rounded-md font-semibold text-xs h-9 px-4 shrink-0 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>New Request</span>
          </Button>
        </div>

        {/* WORKSPACE AREA: FULL CONTENT WIDTH */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row p-6 gap-6 w-full">
          {/* LEFT MAIN SECTION: UNBOXED LIST AREA WITH SEARCH & FILTERS ABOVE */}
          <div
            className={cn(
              "flex-1 min-w-0 flex flex-col space-y-4 overflow-hidden",
              mobileView === "detail" ? "hidden md:flex" : "flex"
            )}
          >
            {/* SEARCH & FILTERS MOVED ABOVE THE LIST */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by event name or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200/90 focus:border-[#2C4B8A] focus:ring-2 focus:ring-[#2C4B8A]/10 outline-none transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                {/* Status Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-md shadow-2xs gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>
                        {statusFilter === "all"
                          ? "All inquiries"
                          : statusFilter === "under_review"
                          ? "Under Review"
                          : statusFilter === "quote_ready"
                          ? "Quotation Ready"
                          : statusFilter === "accepted"
                          ? "Accepted"
                          : "Closed"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Filter Status
                    </DropdownMenuLabel>
                    {[
                      { id: "all", label: "All inquiries" },
                      { id: "under_review", label: "Under Review" },
                      { id: "quote_ready", label: "Quotation Ready" },
                      { id: "accepted", label: "Accepted" },
                      { id: "closed", label: "Closed" },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setStatusFilter(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          statusFilter === item.id ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {statusFilter === item.id && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Service Type Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-md shadow-2xs gap-1.5 cursor-pointer shrink-0",
                        serviceTypeFilter !== "all" && "bg-blue-50 text-[#2C4B8A] border-blue-200"
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#2C4B8A]" />
                      <span>{serviceTypeFilter === "all" ? "All Services" : serviceTypeFilter}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Filter Service Type
                    </DropdownMenuLabel>
                    {[
                      { id: "all", label: "All Services" },
                      ...SERVICE_TYPES.map((t) => ({ id: t, label: t })),
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setServiceTypeFilter(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === item.id ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {serviceTypeFilter === item.id && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Order */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-md shadow-2xs gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>
                        {sortBy === "newest"
                          ? "Newest first"
                          : sortBy === "oldest"
                          ? "Oldest first"
                          : "Event date"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Sort Order
                    </DropdownMenuLabel>
                    {[
                      { id: "newest", label: "Newest first" },
                      { id: "oldest", label: "Oldest first" },
                      { id: "date", label: "Event date" },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setSortBy(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          sortBy === item.id ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {sortBy === item.id && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* UNBOXED INQUIRIES CARDS LIST */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 [scrollbar-width:thin]">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading inquiries...
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center my-4 shadow-2xs">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <h3 className="text-sm font-bold text-slate-800 font-sans">No inquiries found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
                    {isFiltered
                      ? "Try clearing active search or filters to see other inquiry requests."
                      : "No active quote requests yet. Create a new request to get started."}
                  </p>
                  {isFiltered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setServiceTypeFilter("all");
                      }}
                      className="mt-4 text-xs font-semibold rounded-md border-slate-200"
                    >
                      Clear all filters
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                      className="mt-4 bg-[#2C4B8A] hover:bg-[#1E3563] text-white text-xs font-semibold rounded-md"
                    >
                      Create Quote Request
                    </Button>
                  )}
                </div>
              ) : (
                filteredInquiries.map((inq) => {
                  const isSelected = inq._id === selectedInquiryId;
                  const refCode = inq.reference || `INQ-${inq._id.substring(0, 6).toUpperCase()}`;
                  const thumbnail = getEventThumbnail(inq);
                  const titleStr = recordTitle(inq);
                  const meta = inquiryStatusMeta(inq);
                  const locationStr = [inq.municipality, inq.province].filter(Boolean).join(", ") || inq.venue_address || "Location TBD";

                  return (
                    <div
                      key={inq._id}
                      onClick={() => handleSelectInquiry(inq._id)}
                      className={cn(
                        "group p-4 rounded-xl border transition-all cursor-pointer relative shadow-2xs",
                        isSelected
                          ? "bg-blue-50/40 border-l-4 border-l-blue-600 border-y border-r border-blue-200/90 shadow-sm"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                      )}
                    >
                      {/* STRICT 12-COLUMN GRID ROW ALIGNMENT */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 md:gap-4 items-center">
                        {/* Cols 1-5: Thumbnail Image & Core Event Specs */}
                        <div className="md:col-span-5 flex items-start gap-3.5 min-w-0">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={titleStr}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover border border-slate-200/80 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#2C4B8A]/10 to-blue-100/60 border border-[#2C4B8A]/20 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                              <Utensils className="w-6 h-6 sm:w-7 sm:h-7 opacity-80" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate font-sans group-hover:text-[#2C4B8A] transition-colors">
                              {titleStr}
                            </h3>

                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {resolveServiceType(inq)}
                              </span>
                              <span>•</span>
                              <span>{formatShortDate(inq.event_date)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                {inq.guest_count ? `${inq.guest_count} guests` : "Guests TBD"}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{locationStr}</span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                              Ref: {refCode}
                            </div>
                          </div>
                        </div>

                        {/* Cols 6-9: Modern Status Badge & Notice Sentence */}
                        <div className="md:col-span-4 space-y-1.5 min-w-0">
                          {renderStatusBadge(inq)}
                          <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                            {meta.notice?.text || "Our team is reviewing your event request details."}
                          </p>
                        </div>

                        {/* Cols 10-12: Action Area (Right-Aligned, Valid CTAs Only) */}
                        <div className="md:col-span-3 flex items-center justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                          <span className="text-xs text-slate-400 font-medium md:hidden flex items-center gap-1">
                            <span>Tap to view summary</span>
                          </span>
                          {renderCardActionButton(inq)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT ACTION & GUIDANCE CENTER SIDE PANEL WITH ABOVE-THE-FOLD VIEWPORT LAYOUT */}
          <div
            className={cn(
              "w-full md:w-[340px] lg:w-[360px] xl:w-[380px] shrink-0 bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between h-fit max-h-none md:max-h-[calc(100vh-6.5rem)] overflow-hidden",
              mobileView === "list" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden pb-2 border-b border-slate-100 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("list")}
                className="text-xs font-semibold text-[#2C4B8A] gap-1 p-0 hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Inquiries List
              </Button>
            </div>

            {selectedInquiry ? (
              <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 [scrollbar-width:thin]">
                  {/* Header Card */}
                  <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 pb-2.5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Request</span>
                      <h3 className="font-bold text-base text-slate-900 font-sans leading-snug truncate">
                        {recordTitle(selectedInquiry)}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Ref: {selectedInquiry.reference || `INQ-${selectedInquiry._id.substring(0, 6).toUpperCase()}`}
                      </div>
                    </div>
                    {renderStatusBadge(selectedInquiry)}
                  </div>

                  {/* 4-STEP CATERING JOURNEY PROGRESSION TRACKER - COMPACT */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Catering Journey Progress
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold relative pt-0.5 pb-0.5">
                      {/* Connecting Background Line */}
                      <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-slate-200 -z-0" />
                      {/* Active Filled Progress Line */}
                      <div
                        className="absolute top-3.5 left-3 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
                        style={{ width: `${(activeInquiryStep / 3) * 100}%` }}
                      />

                      {[
                        { label: "Inquiry", step: 0 },
                        { label: "Quotation", step: 1 },
                        { label: "Booking", step: 2 },
                        { label: "Event", step: 3 },
                      ].map((s) => {
                        const isDone = activeInquiryStep > s.step;
                        const isCurrent = activeInquiryStep === s.step;

                        return (
                          <div key={s.label} className="flex flex-col items-center gap-0.5 z-10">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shadow-2xs",
                                isDone
                                  ? "bg-emerald-600 text-white"
                                  : isCurrent
                                  ? "bg-blue-600 text-white ring-3 ring-blue-600/15 scale-105"
                                  : "bg-white text-slate-400 border border-slate-300"
                              )}
                            >
                              {isDone ? <Check className="w-3 h-3" /> : s.step + 1}
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-medium leading-tight",
                                isCurrent ? "font-bold text-blue-900" : isDone ? "text-slate-700" : "text-slate-400"
                              )}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ACTION REQUIRED & NEXT STEP FOCUS CARD - COMPACT */}
                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      <h4 className="font-bold text-[#1E3563] text-[11px] uppercase tracking-wider font-sans">
                        {selectedInquiry.status === "Quotation Sent" ? "Action Required" : "Current Status Guidance"}
                      </h4>
                    </div>

                    <p className="text-slate-700 text-xs leading-snug font-medium">
                      {selectedMeta.notice?.text || "We're reviewing your request specifications and preparing your quote."}
                    </p>

                    {/* Direct Action Button in Guidance Box */}
                    {selectedInquiry.status === "Quotation Sent" && (
                      <Button
                        onClick={() => openQuotationView(selectedInquiry)}
                        disabled={isLoadingQuotation}
                        className="w-full bg-[#1E3563] hover:bg-[#152547] text-white font-semibold text-xs h-7.5 rounded-md cursor-pointer shadow-xs gap-1.5 mt-0.5 active:scale-[0.98]"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Review Official Quotation</span>
                      </Button>
                    )}
                  </div>

                  {/* COMPACT KEY EVENT SPECS */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-2.5 space-y-1 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Event Overview
                    </div>
                    <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60 text-xs">
                      <span className="text-slate-500 font-medium">Event Date</span>
                      <span className="font-semibold text-slate-900">{formatEventDateWithDay(selectedInquiry.event_date)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60 text-xs">
                      <span className="text-slate-500 font-medium">Guest Count</span>
                      <span className="font-semibold text-slate-900">{selectedInquiry.guest_count ? `${selectedInquiry.guest_count} guests` : "TBD"}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60 text-xs">
                      <span className="text-slate-500 font-medium">Service Type</span>
                      <span className="font-semibold text-slate-900">{resolveServiceType(selectedInquiry)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 py-0.5 text-xs">
                      <span className="text-slate-500 font-medium">Package</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[160px]">
                        {selectedInquiry.package_name || selectedInquiry.package_id?.name || "Custom Event Package"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs my-auto">
                Select an inquiry to view summary.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REUSED MODALS */}
      {isQuotationModalOpen && activeQuotation && (
        <CustomerQuotationModal
          open={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setActiveQuotation(null);
            setActiveQuotationInquiry(null);
          }}
          quotation={activeQuotation}
          versions={quotationVersions}
          inquiry={activeQuotationInquiry || selectedInquiry}
          onUpdated={fetchInquiries}
        />
      )}

      {editingInquiry && (
        <CustomerInquiryEditModal
          isOpen={Boolean(editingInquiry)}
          onClose={() => setEditingInquiry(null)}
          inquiry={editingInquiry}
          onSaved={fetchInquiries}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={Boolean(cancellingInquiry)} onOpenChange={() => setCancellingInquiry(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Cancel Inquiry Request?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to cancel this event inquiry? You can submit a new request anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancellingInquiry(null)}
              className="text-xs font-semibold rounded-lg"
            >
              Keep Inquiry
            </Button>
            <Button
              size="sm"
              onClick={handleCancelInquiry}
              disabled={isSubmittingCancel}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
            >
              {isSubmittingCancel ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
