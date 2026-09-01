import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import CustomerQuotationModal from "../../components/customer/CustomerQuotationModal";
import CustomerInquiryEditModal from "../../components/customer/CustomerInquiryEditModal";
import CustomerInquiryDetailModal from "../../components/customer/CustomerInquiryDetailModal";
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
  inquiryStatusGroup,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
  serviceIcon,
} from "../../components/customer/portal/statusMeta";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEventDateTime, formatShortDate } from "../../utils/format";
import {
  FileText,
  MessageSquare,
  ArrowRight,
  Plus,
  Eye,
  CreditCard,
  FileCheck2,
  XCircle,
  Pencil,
  Clock,
  CheckCircle2,
  MapPin,
  Users,
  Calendar,
  Sparkles,
  Search,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  // Modal State for viewing Quotation
  const [selectedInquiryForModal, setSelectedInquiryForModal] = useState(null);
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [quotationVersions, setQuotationVersions] = useState([]);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Cancel Dialog State
  const [cancellingInquiry, setCancellingInquiry] = useState(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Edit Details Modal State
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [loadingEditInquiryId, setLoadingEditInquiryId] = useState(null);

  // Full Details Modal State
  const [viewingFullInquiry, setViewingFullInquiry] = useState(null);

  // Track selected inquiry for desktop right detail pane
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);

  const openEditModal = async (inq) => {
    try {
      setLoadingEditInquiryId(inq._id);
      const res = await CustomerAPI.getInquiryById(inq._id);
      setEditingInquiry(res.data);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load your request details.", "error");
    } finally {
      setLoadingEditInquiryId(null);
    }
  };

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const res = await CustomerAPI.getInquiries();
      setInquiries(res.data || []);
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

  const verifyingPaymentRef = useRef(new Set());

  // Automatic real-time confirmation on return from PayMongo checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const paymentId = params.get("payment_id");

    if (paymentStatus === "success" && paymentId) {
      if (verifyingPaymentRef.current.has(paymentId)) return;
      verifyingPaymentRef.current.add(paymentId);

      const toastId = `payment-verify-${paymentId}`;
      const verify = async () => {
        try {
          notify("Confirming your payment with the payment gateway...", "info", { id: toastId });
          await CustomerAPI.verifyPayment(paymentId);
          notify("Deposit payment confirmed in real time! Your booking is locked.", "success", { id: toastId });
          fetchInquiries();
        } catch (err) {
          console.error("Payment auto-verification error:", err);
          notify(err.response?.data?.message || "Failed to confirm payment with gateway.", "error", { id: toastId });
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

  const isRecentInquiry = (inq) => {
    if (!inq.createdAt && !inq.updatedAt) return false;
    const t = new Date(inq.createdAt || inq.updatedAt).getTime();
    return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
  };

  const counts = useMemo(
    () => ({
      all: inquiries.length,
      recent: inquiries.filter(isRecentInquiry).length,
      quote_ready: inquiries.filter((i) => inquiryStatusGroup(i) === "quote_ready").length,
      under_review: inquiries.filter((i) => inquiryStatusGroup(i) === "under_review").length,
      accepted: inquiries.filter((i) => inquiryStatusGroup(i) === "accepted").length,
      closed: inquiries.filter((i) => inquiryStatusGroup(i) === "closed").length,
    }),
    [inquiries]
  );

  // Filtered list
  const filteredInquiries = useMemo(() => {
    const list = inquiries.filter((inq) => {
      // 1. Status Filter
      if (statusTab === "recent") {
        if (!isRecentInquiry(inq)) return false;
      } else if (statusTab !== "all" && inquiryStatusGroup(inq) !== statusTab) {
        return false;
      }

      // 2. Service Type Filter
      if (serviceTypeFilter !== "all" && resolveServiceType(inq) !== serviceTypeFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (inq.reference || "").toLowerCase();
        const type = (inq.event_type || "").toLowerCase();
        const name = `${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.toLowerCase();
        const city = (inq.municipality || inq.province || "").toLowerCase();

        return ref.includes(q) || type.includes(q) || name.includes(q) || city.includes(q);
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [inquiries, statusTab, serviceTypeFilter, searchQuery]);

  const isFiltered = Boolean(searchQuery.trim()) || statusTab !== "all" || serviceTypeFilter !== "all";

  // Synchronize selection for desktop detail pane
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

  // Open Quotation Modal
  const openQuotationView = async (inquiry) => {
    try {
      setIsLoadingQuotation(true);
      setSelectedInquiryForModal(inquiry);
      const res = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]);
        setQuotationVersions(quotes);
        setIsQuotationModalOpen(true);
      } else {
        notify("No quotation details found for this inquiry.", "error");
      }
    } catch (err) {
      notify("Failed to retrieve quotation details.", "error");
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  // Open Chat
  const handleOpenChat = async (inquiryId) => {
    try {
      const conversation = await createConversation({ inquiry_id: inquiryId });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (err) {
      notify("Could not initiate chat at this moment.", "error");
    }
  };

  // Start Inquiry Deposit Checkout
  const startInquiryCheckout = async (inq) => {
    try {
      const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
      const isDepositPaid =
        inq.payment_status === "deposit_paid" ||
        inq.payment_status === "fully_paid" ||
        inq.is_deposit_paid === true ||
        ["confirmed", "deposit_paid"].includes((inq.status || "").toLowerCase());

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
        notify("Redirecting to PayMongo payment checkout...", "success");
        window.location.assign(checkoutRes.data.checkout_url);
      } else {
        notify("Could not generate payment checkout URL.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start deposit payment checkout.", "error");
    }
  };

  // Handle Cancel Inquiry
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

  // Helper to compute milestone steps
  const getMilestoneSteps = (inq) => {
    const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
    const isDepositPaid =
      inq.payment_status === "deposit_paid" ||
      inq.payment_status === "fully_paid" ||
      inq.is_deposit_paid === true;
    const isQuotationSent =
      ["Quotation Sent", "Quote Accepted", "Awaiting Final Confirmation"].includes(inq.status) ||
      isConverted ||
      isDepositPaid;
    const isUnderReview =
      ["Under Review", "Pending Review"].includes(inq.status) || isQuotationSent;
    const isCancelled = ["Cancelled", "Quote Rejected", "Expired"].includes(inq.status);

    let activeStepNum = 1;
    let activeStepLabel = "Request Submitted";

    if (isConverted || isDepositPaid) {
      activeStepNum = 4;
      activeStepLabel = "Booking Confirmed";
    } else if (isQuotationSent) {
      activeStepNum = 3;
      activeStepLabel = "Quotation Ready";
    } else if (inq.status === "Under Review") {
      activeStepNum = 2;
      activeStepLabel = "Review & Pricing";
    } else if (inq.status === "Pending Review") {
      activeStepNum = 1;
      activeStepLabel = "Request Submitted";
    }

    const steps = [
      { id: 1, label: "Request Submitted", done: true, current: activeStepNum === 1 },
      {
        id: 2,
        label: "Review & Pricing",
        done: isUnderReview && inq.status !== "Pending Review",
        current: activeStepNum === 2,
      },
      {
        id: 3,
        label: "Quotation Ready",
        done: isQuotationSent && !["Pending Review", "Under Review"].includes(inq.status),
        current: activeStepNum === 3,
      },
      {
        id: 4,
        label: "Booking Confirmed",
        done: isConverted || isDepositPaid,
        current: activeStepNum === 4,
      },
    ];

    return { steps, isCancelled, activeStepNum, activeStepLabel };
  };

  // Milestone Stepper for Desktop
  const renderDesktopMilestone = (inq) => {
    const { steps, isCancelled } = getMilestoneSteps(inq);

    if (isCancelled) {
      return (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2.5 shadow-2xs">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            This inquiry has been <strong>cancelled</strong>. You can submit a new quote request anytime.
          </span>
        </div>
      );
    }

    return (
      <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs">
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-slate-200 -z-0" />
          {steps.map((step) => {
            const isCompleted = step.done && !step.current;
            const isActive = step.current;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                    isCompleted
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                      : isActive
                      ? "bg-[#2C4B8A] border-[#2C4B8A] text-white ring-4 ring-[#2C4B8A]/15 shadow-2xs"
                      : "bg-white border-slate-300 text-slate-400"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "text-[11px] mt-1.5 font-medium whitespace-nowrap",
                    isActive
                      ? "text-slate-900 font-bold"
                      : isCompleted
                      ? "text-slate-700 font-semibold"
                      : "text-slate-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Milestone Progress Bar for Mobile Cards
  const renderMobileMilestone = (inq) => {
    const { isCancelled, activeStepNum, activeStepLabel } = getMilestoneSteps(inq);

    if (isCancelled) {
      return (
        <div className="py-1 px-2.5 bg-rose-50 border border-rose-200/80 rounded-md text-[11px] text-rose-800 flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Request Cancelled</span>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">Stage {activeStepNum} of 4</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2C4B8A]" />
            {activeStepLabel}
          </span>
        </div>
        {/* 4 Segment Progress Track */}
        <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
          {[1, 2, 3, 4].map((step) => {
            const isFilled = step <= activeStepNum;
            const isCompleted = step < activeStepNum;
            return (
              <div
                key={step}
                className={cn(
                  "h-full rounded-xs transition-all",
                  isCompleted
                    ? "bg-emerald-600"
                    : isFilled
                    ? "bg-[#2C4B8A]"
                    : "bg-slate-200"
                )}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-slate-50 flex flex-col font-sans antialiased overflow-hidden">
        {/* TOP APP BAR / TOOLBAR */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="font-sans font-bold text-base sm:text-lg text-slate-900 leading-tight truncate">
                My Inquiries
              </h1>
              {counts.all > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 font-mono border border-slate-200">
                  {counts.all}
                </span>
              )}
              {counts.quote_ready > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  {counts.quote_ready} quote ready
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-xs rounded-md font-semibold text-xs h-8 sm:h-9 px-3 sm:px-4 shrink-0 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>New Request</span>
              </Button>
            </div>
          </div>

          {/* Search & Service Filter Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by event, reference, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200 focus:border-[#2C4B8A]/40 focus:ring-2 focus:ring-[#2C4B8A]/10 outline-none transition-all"
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

            {/* Service filter selector */}
            <div className="shrink-0">
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="bg-slate-100/90 focus:bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-none cursor-pointer"
              >
                <option value="all">All Services</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* STATUS FILTER SEGMENTS BAR */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {[
            { id: "all", label: "All", count: counts.all },
            { id: "quote_ready", label: "Quote Ready", count: counts.quote_ready, badgeTone: "emerald" },
            { id: "under_review", label: "Under Review", count: counts.under_review },
            { id: "accepted", label: "Accepted", count: counts.accepted },
            { id: "closed", label: "Closed", count: counts.closed },
          ].map((tab) => {
            const isActive = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={cn(
                  "py-1 px-2.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap text-center cursor-pointer flex items-center gap-1.5 shrink-0",
                  isActive
                    ? "bg-[#2C4B8A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1 py-0.2 rounded",
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.badgeTone === "emerald" && tab.count > 0
                      ? "bg-emerald-100 text-emerald-800 font-bold"
                      : "bg-white text-slate-600 border border-slate-200/60"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* WORKSPACE AREA: DUAL ADAPTIVE (Mobile Card Feed vs Desktop Master-Detail) */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
          {/* ============================================================ */}
          {/* MOBILE VIEW (< md): Mobile Cards List */}
          {/* ============================================================ */}
          <div className="md:hidden flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 [scrollbar-width:thin]">
            {/* Quote Alert Banner on Mobile */}
            {counts.quote_ready > 0 && statusTab !== "quote_ready" && (
              <div
                onClick={() => setStatusTab("quote_ready")}
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-xs text-emerald-900 cursor-pointer shadow-2xs active:bg-emerald-100/80 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    <strong>{counts.quote_ready} quote{counts.quote_ready > 1 ? "s" : ""}</strong> ready for your review!
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 flex items-center shrink-0">
                  View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading your inquiries...
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-md border border-slate-200 flex flex-col items-center justify-center my-4 shadow-2xs">
                <FileText className="w-10 h-10 text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No quote requests found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
                  {isFiltered
                    ? "Try clearing filters or search term to see other inquiries."
                    : "Ready to celebrate? Submit a new event inquiry to get started."}
                </p>
                {isFiltered ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusTab("all");
                      setServiceTypeFilter("all");
                    }}
                    className="mt-4 text-xs font-semibold rounded-md"
                  >
                    Clear all filters
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                    className="mt-4 bg-[#2C4B8A] hover:bg-[#1E3563] text-white text-xs font-semibold rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Submit Quote Request
                  </Button>
                )}
              </div>
            ) : (
              filteredInquiries.map((inq) => {
                const status = inquiryStatusMeta(inq);
                const refCode = inq.reference || `INQ-${inq._id.substring(0, 6).toUpperCase()}`;
                const locationStr =
                  inq.municipality || inq.province || inq.venue_type || "Location TBD";
                const isQuotationReady = inq.status === "Quotation Sent";
                const isConverted =
                  inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
                const ServiceIcon = serviceIcon(resolveServiceType(inq));

                return (
                  <article
                    key={inq._id}
                    className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs space-y-3 transition-all hover:border-slate-300"
                  >
                    {/* Top Row: Ref, Date, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {refCode}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatShortDate(inq.createdAt || inq.event_date)}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-bold font-mono tracking-wide border flex items-center gap-1",
                          status.tone === "info" && "bg-blue-50 text-blue-700 border-blue-200",
                          status.tone === "warning" &&
                            "bg-amber-50 text-amber-800 border-amber-200",
                          status.tone === "success" &&
                            "bg-emerald-50 text-emerald-800 border-emerald-200",
                          status.tone === "neutral" &&
                            "bg-slate-100 text-slate-600 border-slate-200",
                          status.tone === "danger" && "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            status.tone === "info" && "bg-blue-600",
                            status.tone === "warning" && "bg-amber-600",
                            status.tone === "success" && "bg-emerald-600",
                            status.tone === "neutral" && "bg-slate-400",
                            status.tone === "danger" && "bg-rose-600"
                          )}
                        />
                        {status.label}
                      </span>
                    </div>

                    {/* Event Title & Service */}
                    <div>
                      <h2 className="font-sans font-bold text-base text-slate-900 leading-snug">
                        {recordTitle(inq)}
                      </h2>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <ServiceIcon className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0" />
                        <span>{resolveServiceType(inq)}</span>
                      </div>
                    </div>

                    {/* Key Specifications Chips */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-md border border-slate-200/80 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                          Event Date
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block mt-0.5">
                          {formatShortDate(inq.event_date)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                          Guests
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block mt-0.5">
                          {inq.guest_count ? `${inq.guest_count} pax` : "TBD"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
                          Location
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block mt-0.5">
                          {locationStr}
                        </span>
                      </div>
                    </div>

                    {/* Pricing / Stage Callout Box */}
                    {isQuotationReady ? (
                      <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-emerald-800">
                            Quotation Prepared
                          </span>
                          <span className="font-mono text-sm font-bold text-emerald-900">
                            {formatCurrency(inq.total_price)}
                          </span>
                        </div>
                        <Button
                          onClick={() => openQuotationView(inq)}
                          disabled={isLoadingQuotation}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs h-9 cursor-pointer shadow-xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review &amp; Accept Quote
                        </Button>
                      </div>
                    ) : isConverted ? (
                      <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-md flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-blue-900 block">
                            Event Reserved &amp; Confirmed
                          </span>
                          <span className="text-[11px] text-blue-700">Track under My Bookings</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/customer/bookings/${inq.converted_booking_id}`)}
                          className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white rounded-md text-xs font-semibold h-8 shrink-0"
                        >
                          View Booking <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ) : inq.total_price > 0 && !["Cancelled", "Quote Rejected"].includes(inq.status) ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Total Quoted
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {formatCurrency(inq.total_price)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => startInquiryCheckout(inq)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold h-8"
                        >
                          <CreditCard className="w-3 h-3 mr-1" /> Pay Deposit
                        </Button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Estimated Budget</span>
                        <span className="font-mono font-bold text-slate-800">
                          {inq.budget_range ? inq.budget_range : "Awaiting Quote"}
                        </span>
                      </div>
                    )}

                    {/* Milestone Progress Stepper */}
                    {renderMobileMilestone(inq)}

                    {/* Card Actions Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingFullInquiry(inq)}
                          className="rounded-md border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-8 px-2.5 shadow-2xs gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#2C4B8A]" />
                          <span>Full Details</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenChat(inq._id)}
                          className="rounded-md border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-8 px-2.5 shadow-2xs gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chat</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        {["Pending Review", "Under Review"].includes(inq.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(inq)}
                            disabled={loadingEditInquiryId === inq._id}
                            className="rounded-md text-slate-600 hover:text-slate-900 text-xs font-semibold h-8 px-2 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            {loadingEditInquiryId === inq._id ? "..." : "Edit"}
                          </Button>
                        )}
                        {["Pending Review", "Under Review"].includes(inq.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancellingInquiry(inq)}
                            className="rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold h-8 px-2 cursor-pointer"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* ============================================================ */}
          {/* DESKTOP VIEW (>= md): Master-Detail 2-Column Split */}
          {/* ============================================================ */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
            {/* LEFT COLUMN: Master Inquiry List */}
            <div className="w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-0 overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin]">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading inquiries...
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <FileText className="w-8 h-8 opacity-25 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No quote requests found</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try selecting a different filter.</p>
                </div>
              ) : (
                filteredInquiries.map((inq) => {
                  const isSelected = inq._id === selectedInquiryId;
                  const status = inquiryStatusMeta(inq);
                  const refCode = inq.reference || `INQ-${inq._id.substring(0, 6).toUpperCase()}`;
                  const locationStr =
                    inq.municipality || inq.province || inq.venue_type || "Location TBD";
                  const isQuotationReady = inq.status === "Quotation Sent";
                  const isConverted =
                    inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);

                  return (
                    <div
                      key={inq._id}
                      onClick={() => setSelectedInquiryId(inq._id)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors text-left relative",
                        isSelected
                          ? "bg-slate-100/90 border-l-3 border-[#2C4B8A] text-slate-900"
                          : "hover:bg-slate-50/80 text-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-semibold font-mono tracking-wide border",
                            status.tone === "info" && "bg-blue-50 text-blue-700 border-blue-200",
                            status.tone === "warning" &&
                              "bg-amber-50 text-amber-800 border-amber-200",
                            status.tone === "success" &&
                              "bg-emerald-50 text-emerald-800 border-emerald-200",
                            status.tone === "neutral" &&
                              "bg-slate-100 text-slate-600 border-slate-200",
                            status.tone === "danger" && "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {status.label}
                        </span>

                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {inq.total_price > 0
                            ? formatCurrency(inq.total_price)
                            : inq.budget_range
                            ? inq.budget_range
                            : isQuotationReady
                            ? "Quote Ready"
                            : "Pending Quote"}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 truncate mt-2 font-sans">
                        {recordTitle(inq)}
                      </h3>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span>{formatShortDate(inq.event_date)}</span>
                        <span>·</span>
                        <span>{inq.guest_count ? `${inq.guest_count} guests` : "Headcount TBD"}</span>
                        <span>·</span>
                        <span className="truncate">{locationStr}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-100/80 text-[11px] text-slate-400">
                        <span className="font-mono">{refCode}</span>
                        {isQuotationReady && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <FileCheck2 className="w-3 h-3" /> Quote Ready
                          </span>
                        )}
                        {isConverted && (
                          <span className="text-[#2C4B8A] font-semibold flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" /> Booked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT COLUMN: Active Inquiry Canvas */}
            <div className="flex-1 bg-slate-50/50 min-h-0 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin]">
              {selectedInquiry ? (
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Header Card */}
                  <div className="p-5 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                          {selectedInquiry.reference ||
                            `INQ-${selectedInquiry._id.substring(0, 6).toUpperCase()}`}
                        </span>
                        <span className="text-xs text-slate-400">
                          Submitted {formatShortDate(selectedInquiry.createdAt)}
                        </span>
                      </div>
                      <h2 className="font-bold text-xl text-slate-900 leading-tight font-sans">
                        {recordTitle(selectedInquiry)}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {resolveServiceType(selectedInquiry)} · {selectedInquiry.guest_count || 0} guests
                      </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="shrink-0 flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setViewingFullInquiry(selectedInquiry)}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md font-semibold text-xs h-9 px-3 cursor-pointer shadow-2xs gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#2C4B8A]" />
                        <span>Full Details</span>
                      </Button>

                      {selectedInquiry.status === "Converted to Booking" ||
                      Boolean(selectedInquiry.converted_booking_id) ? (
                        <Button
                          onClick={() =>
                            navigate(`/customer/bookings/${selectedInquiry.converted_booking_id}`)
                          }
                          className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs rounded-md font-semibold text-xs h-9 px-4"
                        >
                          <ArrowRight className="h-4 w-4 mr-1.5" /> Go to booking
                        </Button>
                      ) : selectedInquiry.status === "Quotation Sent" ? (
                        <Button
                          onClick={() => openQuotationView(selectedInquiry)}
                          disabled={isLoadingQuotation}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs rounded-md font-semibold text-xs h-9 px-4 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-1.5" /> Review &amp; accept quote
                        </Button>
                      ) : selectedInquiry.total_price > 0 &&
                        !["Cancelled", "Quote Rejected"].includes(selectedInquiry.status) ? (
                        <Button
                          onClick={() => startInquiryCheckout(selectedInquiry)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs rounded-md font-semibold text-xs h-9 px-4 cursor-pointer"
                        >
                          <CreditCard className="h-4 w-4 mr-1.5" /> Pay deposit
                        </Button>
                      ) : ["Pending Review", "Under Review"].includes(selectedInquiry.status) ? (
                        <Button
                          variant="outline"
                          onClick={() => openEditModal(selectedInquiry)}
                          disabled={loadingEditInquiryId === selectedInquiry._id}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md font-semibold text-xs h-9 px-4 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                          {loadingEditInquiryId === selectedInquiry._id
                            ? "Loading..."
                            : "Edit request"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Milestone Stepper */}
                  {renderDesktopMilestone(selectedInquiry)}

                  {/* Status Alert Prompt */}
                  {selectedInquiry.status === "Quotation Sent" && (
                    <div className="p-3.5 sm:p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-emerald-600 text-white rounded-md shrink-0">
                          <FileCheck2 size={15} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-emerald-950 text-xs sm:text-sm leading-tight">
                            {selectedInquiry.total_price > 0
                              ? `Your quotation is ready for ${formatCurrency(selectedInquiry.total_price)}`
                              : "Your quotation is ready for review"}
                          </h4>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Review pricing, dishes, and inclusions to lock in your date.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openQuotationView(selectedInquiry)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-semibold text-xs h-8 px-3.5 rounded-md cursor-pointer shadow-xs"
                      >
                        Review Quote
                      </Button>
                    </div>
                  )}

                  {/* Event Specifications Card */}
                  <div className="p-5 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#2C4B8A]" /> Event Specifications
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      {selectedInquiry.celebrant_name && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Celebrant / Honoree</span>
                          <span className="font-semibold text-slate-900 block mt-0.5">
                            {selectedInquiry.celebrant_name}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Date &amp; Time</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {formatEventDateTime(
                            selectedInquiry.event_date,
                            selectedInquiry.start_time
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Duration</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {selectedInquiry.duration_hours
                            ? `${selectedInquiry.duration_hours} hours`
                            : "Standard"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Guest Count</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {selectedInquiry.guest_count || 0} pax
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Service Type</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {resolveServiceType(selectedInquiry)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Theme</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {selectedInquiry.event_theme || "Standard Event"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Package</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {selectedInquiry.package_id?.name || "Customized Quote"}
                        </span>
                      </div>
                    </div>

                    {selectedInquiry.event_palette && selectedInquiry.event_palette.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                          Color Palette
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {selectedInquiry.event_palette.filter(Boolean).map((color, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium"
                            >
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Venue & Logistics Card */}
                  <div className="p-5 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#2C4B8A]" /> Venue &amp; Special Requests
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Venue Address</span>
                        <span className="font-semibold text-slate-900 leading-relaxed block mt-0.5">
                          {[
                            selectedInquiry.street,
                            selectedInquiry.barangay,
                            selectedInquiry.municipality,
                            selectedInquiry.province,
                            selectedInquiry.zip_code,
                          ]
                            .filter(Boolean)
                            .join(", ") ||
                            selectedInquiry.venue_type ||
                            "Location to be confirmed"}
                        </span>
                      </div>

                      {selectedInquiry.landmark && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Landmark</span>
                          <span className="text-slate-700 block mt-0.5">{selectedInquiry.landmark}</span>
                        </div>
                      )}

                      {selectedInquiry.special_requests && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Special Requests
                          </span>
                          <span className="text-slate-700 block mt-0.5">
                            {selectedInquiry.special_requests}
                          </span>
                        </div>
                      )}

                      {(selectedInquiry.allergies ||
                        selectedInquiry.dietary_restrictions ||
                        selectedInquiry.dietary_requirements) && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Dietary &amp; Allergies
                          </span>
                          <span className="text-slate-700 block mt-0.5">
                            {[
                              selectedInquiry.allergies,
                              selectedInquiry.dietary_restrictions,
                              selectedInquiry.dietary_requirements,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Secondary Action Toolbar */}
                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingFullInquiry(selectedInquiry)}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md text-xs font-semibold h-8 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#2C4B8A]" /> View Full Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChat(selectedInquiry._id)}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md text-xs font-semibold h-8 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#2C4B8A]" /> Message Coordinator
                      </Button>

                      {["Pending Review", "Under Review"].includes(selectedInquiry.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(selectedInquiry)}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md text-xs font-semibold h-8 gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit Details
                        </Button>
                      )}
                    </div>

                    {["Pending Review", "Under Review"].includes(selectedInquiry.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingInquiry(selectedInquiry)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md text-xs font-semibold h-8 gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel Request
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-80 bg-white border border-slate-200 rounded-md text-center text-slate-400 p-12">
                  <FileText className="w-10 h-10 opacity-20 mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No Inquiry Selected</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a request from the list on the left to view its full details.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Inquiry Details Comprehensive Modal */}
      {viewingFullInquiry && (
        <CustomerInquiryDetailModal
          open={!!viewingFullInquiry}
          onClose={() => setViewingFullInquiry(null)}
          inquiryId={viewingFullInquiry._id}
          initialInquiry={viewingFullInquiry}
          onOpenEdit={openEditModal}
          onOpenQuote={openQuotationView}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* Quotation Viewer Modal */}
      {isQuotationModalOpen && activeQuotation && (
        <CustomerQuotationModal
          open={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          quotation={activeQuotation}
          versions={quotationVersions}
          inquiry={selectedInquiryForModal}
          onUpdated={fetchInquiries}
        />
      )}

      {/* Edit Inquiry Details Modal */}
      <CustomerInquiryEditModal
        open={!!editingInquiry}
        inquiry={editingInquiry}
        onClose={() => setEditingInquiry(null)}
        onSaved={fetchInquiries}
      />

      {/* Cancel Inquiry Confirmation Dialog */}
      <Dialog
        open={!!cancellingInquiry}
        onOpenChange={(open) => !open && setCancellingInquiry(null)}
      >
        <DialogContent className="sm:max-w-[440px] rounded-md">
          <DialogHeader>
            <DialogTitle className="font-sans font-bold text-slate-900">
              Cancel this request?
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-slate-600">
              We'll stop working on{" "}
              <strong className="text-slate-900">
                {cancellingInquiry ? recordTitle(cancellingInquiry) : "this request"}
              </strong>
              {cancellingInquiry?.reference ? ` (${cancellingInquiry.reference})` : ""}. This
              cannot be undone, but you can always submit a new quote request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancellingInquiry(null)}
              disabled={isSubmittingCancel}
              className="rounded-md border-slate-200 text-xs"
            >
              Keep request
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelInquiry}
              disabled={isSubmittingCancel}
              className="rounded-md text-xs"
            >
              {isSubmittingCancel ? "Cancelling…" : "Yes, cancel it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
