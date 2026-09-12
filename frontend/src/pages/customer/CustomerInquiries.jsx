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
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  inquiryStatusGroup,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { isSpecialOffer } from "../../lib/specialOffers";
import { cn } from "@/lib/utils";
import { formatShortDate } from "../../utils/format";
import {
  FileText,
  Plus,
  CreditCard,
  FileCheck2,
  XCircle,
  MapPin,
  Users,
  Calendar,
  Search,
  ChevronRight,
  Utensils,
  ChevronDown,
  Check,
  SlidersHorizontal,
} from "lucide-react";

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { notify } = useToast();

  const [inquiries, setInquiries] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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
      const [inqRes, pkgRes] = await Promise.all([
        CustomerAPI.getInquiries(),
        CustomerAPI.getPackages().catch(() => ({ data: [] })),
      ]);
      setInquiries(inqRes.data || []);
      setPackages(pkgRes.data || []);
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

  // Handle URL parameters for edit route
  useEffect(() => {
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

  // Dynamically derive configured Combo Pack names from packages and existing inquiries
  const comboPackNames = useMemo(() => {
    const names = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type === "special" || isSpecialOffer(pkg)) {
        if (pkg.name) names.add(pkg.name);
      }
    });
    (inquiries || []).forEach((inq) => {
      const isSpecial =
        inq.booking_type === "special" ||
        inq.package_id?.offer_type === "special" ||
        inq.event_type === "Special Offer Catering" ||
        Boolean(inq.package_id?.is_special_offer) ||
        (Array.isArray(inq.offer_food_snapshot) && inq.offer_food_snapshot.length > 0);
      if (isSpecial) {
        const name = inq.package_name_snapshot || inq.package_id?.name;
        if (name) names.add(name);
      }
    });
    return Array.from(names);
  }, [packages, inquiries]);

  const handleViewInquiry = (inq) => {
    navigate(`/customer/inquiries/${inq._id}`);
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
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 w-full">
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
                  <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5 shadow-lg border-slate-200 max-h-96 overflow-y-auto [scrollbar-width:thin]">
                    <DropdownMenuItem
                      onClick={() => setServiceTypeFilter("all")}
                      className={cn(
                        "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                        serviceTypeFilter === "all" ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                      )}
                    >
                      <span>All Services</span>
                      {serviceTypeFilter === "all" && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 1: Regular Package */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Regular Package
                    </DropdownMenuLabel>
                    {["Regular Package", "Regular Package + Menu"].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setServiceTypeFilter(opt)}
                        className={cn(
                          "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === opt ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        {serviceTypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 2: Combo Packs */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Combo Packs
                    </DropdownMenuLabel>
                    {comboPackNames.length > 0 ? (
                      comboPackNames.map((name) => (
                        <DropdownMenuItem
                          key={name}
                          onClick={() => setServiceTypeFilter(name)}
                          className={cn(
                            "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                            serviceTypeFilter === name ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                          )}
                        >
                          <span className="truncate">{name}</span>
                          {serviceTypeFilter === name && <Check className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0" />}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-3 py-1 text-[11px] text-slate-400 italic">No combo packs configured</div>
                    )}

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 3: Request Custom */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Request Custom
                    </DropdownMenuLabel>
                    {["Food Only", "Event Setup Only", "Food and Event Setup"].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setServiceTypeFilter(opt)}
                        className={cn(
                          "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === opt ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        {serviceTypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
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
                  const refCode = inq.reference || `INQ-${inq._id.substring(0, 6).toUpperCase()}`;
                  const thumbnail = getEventThumbnail(inq);
                  const titleStr = recordTitle(inq);
                  const meta = inquiryStatusMeta(inq);
                  const locationStr = [inq.municipality, inq.province].filter(Boolean).join(", ") || inq.venue_address || "Location TBD";

                  return (
                    <div
                      key={inq._id}
                      onClick={() => handleViewInquiry(inq)}
                      className="group p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer relative shadow-2xs"
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
                        <div className="md:col-span-3 flex items-center justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                          {renderCardActionButton(inq)}
                        </div>
                      </div>
                    </div>
                  );
                })
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
          inquiry={activeQuotationInquiry}
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
