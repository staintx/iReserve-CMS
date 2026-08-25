import { useEffect, useMemo, useState } from "react";
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
import RecordCard from "../../components/customer/portal/RecordCard";
import DetailGrid from "../../components/customer/portal/DetailGrid";
import PortalToolbar from "../../components/customer/portal/PortalToolbar";
import EmptyState from "../../components/customer/portal/EmptyState";
import LoadingState from "../../components/customer/portal/LoadingState";
import StateNotice from "../../components/customer/portal/StateNotice";
import {
  inquiryStatusGroup,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
  serviceIcon,
} from "../../components/customer/portal/statusMeta";
import {
  ACTION_PAY_SECONDARY,
  ACTION_MESSAGE,
  ACTION_DANGER,
} from "../../components/customer/portal/actionStyles";
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
  // Used by the "View paid quote" action below. Its absence here blanked the
  // whole page for any customer holding a deposit-paid inquiry: that branch is
  // the only one that renders it, so the ReferenceError stayed invisible until
  // an account actually had one.
  CheckCircle2,
} from "lucide-react";

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const location = useLocation();
  // Set by the booking wizard on a successful submit. The flow used to end on
  // a bare list with only a toast, so a customer who missed it had no
  // confirmation that anything had been received.
  const submittedReference = location.state?.submittedReference;
  const { notify } = useToast();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

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

  // The list only carries a summary (package name/type, no menu items, no
  // add-ons) — the edit modal needs the full document, populated the same way
  // the admin's own detail view is, so the customer sees everything they
  // originally submitted rather than a partial reflection of it.
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

  // Automatic real-time confirmation on return from PayMongo checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const paymentId = params.get("payment_id");

    if (paymentStatus === "success" && paymentId) {
      const verify = async () => {
        try {
          notify("Confirming your payment with the payment gateway...", "info");
          await CustomerAPI.verifyPayment(paymentId);
          notify("Deposit payment confirmed in real time! Your booking is locked.", "success");
          fetchInquiries();
        } catch (err) {
          console.error("Payment auto-verification error:", err);
          fetchInquiries();
        }
      };
      verify();
      navigate(location.pathname, { replace: true });
    } else if (paymentStatus === "cancelled") {
      notify("Payment checkout was cancelled.", "warning");
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  useRealTimeRefresh(fetchInquiries);

  const isRecentInquiry = (inq) => {
    if (!inq.createdAt && !inq.updatedAt) return false;
    const t = new Date(inq.createdAt || inq.updatedAt).getTime();
    return (Date.now() - t) <= (7 * 24 * 60 * 60 * 1000); // Created or updated within 7 days
  };

  const isNewlySubmitted = (inq) => {
    if (!inq.createdAt) return false;
    const t = new Date(inq.createdAt).getTime();
    return (Date.now() - t) <= (48 * 60 * 60 * 1000); // Submitted within last 48 hours
  };

  const counts = useMemo(() => ({
    all: inquiries.length,
    recent: inquiries.filter(isRecentInquiry).length,
    quote_ready: inquiries.filter((i) => inquiryStatusGroup(i) === "quote_ready").length,
    under_review: inquiries.filter((i) => inquiryStatusGroup(i) === "under_review").length,
    accepted: inquiries.filter((i) => inquiryStatusGroup(i) === "accepted").length,
    closed: inquiries.filter((i) => inquiryStatusGroup(i) === "closed").length,
  }), [inquiries]);

  // Filtered list
  const filteredInquiries = useMemo(() => {
    const list = inquiries.filter((inq) => {
      // 1. Status / Recent Filter
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

    // Always sort newest inquiries first by database creation/update date
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [inquiries, statusTab, serviceTypeFilter, searchQuery]);

  const isFiltered = Boolean(searchQuery.trim()) || statusTab !== "all" || serviceTypeFilter !== "all";

  // Open Quotation Modal
  const openQuotationView = async (inquiry) => {
    try {
      setIsLoadingQuotation(true);
      setSelectedInquiryForModal(inquiry);
      const res = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]); // highest/latest version
        setQuotationVersions(quotes); // every saved version, for the change comparison
        setIsQuotationModalOpen(true);
      } else {
        notify("No formal quotation details found for this inquiry.", "error");
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
      const isDepositPaid = inq.payment_status === "deposit_paid" || inq.payment_status === "fully_paid" || inq.is_deposit_paid === true || ["confirmed", "deposit_paid"].includes((inq.status || "").toLowerCase());

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
      const depositVal = Number(latestQuote?.deposit_amount) > 0 ? Number(latestQuote.deposit_amount) : Number(inq.total_price || 0);

      if (depositVal <= 0) {
        notify("Deposit amount has not been set yet.", "error");
        return;
      }

      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        inquiry_id: inq._id,
        amount: depositVal,
        payment_type: "deposit"
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

  // Track selected inquiry for the right detail pane
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);

  // Synchronize selection when filtered list changes
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

  const renderMilestoneProgress = (inq) => {
    const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
    const isDepositPaid = inq.payment_status === "deposit_paid" || inq.payment_status === "fully_paid" || inq.is_deposit_paid === true;
    const isQuotationSent = ["Quotation Sent", "Quote Accepted", "Awaiting Final Confirmation"].includes(inq.status) || isConverted || isDepositPaid;
    const isUnderReview = ["Under Review", "Pending Review"].includes(inq.status) || isQuotationSent;
    const isCancelled = ["Cancelled", "Quote Rejected", "Expired"].includes(inq.status);

    const steps = [
      { id: 1, label: "Request Submitted", done: true, current: inq.status === "Pending Review" },
      { id: 2, label: "Review & Pricing", done: isUnderReview && inq.status !== "Pending Review", current: inq.status === "Under Review" },
      { id: 3, label: "Quotation Ready", done: isQuotationSent && !["Pending Review", "Under Review"].includes(inq.status), current: inq.status === "Quotation Sent" },
      { id: 4, label: "Booking Confirmed", done: isConverted || isDepositPaid, current: isConverted || isDepositPaid },
    ];

    if (isCancelled) {
      return (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>This inquiry has been <strong>cancelled</strong>. You can submit a new quote request anytime.</span>
        </div>
      );
    }

    return (
      <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-md shadow-2xs">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-4 right-4 top-3.5 h-0.5 bg-slate-200 -z-0" />
          {steps.map((step) => {
            const isCompleted = step.done && !step.current;
            const isActive = step.current;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                    isCompleted
                      ? "bg-emerald-600 border-emerald-600 text-white"
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
                    isActive ? "text-slate-900 font-bold" : isCompleted ? "text-slate-700 font-semibold" : "text-slate-400"
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

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-white flex flex-col font-sans antialiased overflow-hidden">
        {/* TOP TOOLBAR */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="font-sans font-bold text-base text-slate-900 leading-tight">
                My Inquiries
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Track your quote requests and event bookings
              </p>
            </div>
            {counts.quote_ready > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                <FileCheck2 className="w-3 h-3 text-emerald-600" />
                {counts.quote_ready} quote ready
              </span>
            )}
          </div>

          {/* Search & Service Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-xs hidden sm:block">
              <input
                placeholder="Search inquiries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-100/80 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200 outline-none transition-all"
              />
              <FileText className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
              className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs rounded-md font-semibold text-xs h-8 px-3 shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>New request</span>
            </Button>
          </div>
        </div>

        {/* STATUS FILTER SEGMENTS BAR */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between gap-3 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center gap-1 text-xs font-medium">
            {[
              { id: "all", label: "All", count: counts.all },
              { id: "quote_ready", label: "Quote ready", count: counts.quote_ready },
              { id: "under_review", label: "Under review", count: counts.under_review },
              { id: "accepted", label: "Accepted", count: counts.accepted },
              { id: "closed", label: "Closed", count: counts.closed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={cn(
                  "py-1 px-2.5 rounded text-[11px] capitalize transition-colors whitespace-nowrap text-center cursor-pointer flex items-center gap-1.5",
                  statusTab === tab.id
                    ? "bg-white text-slate-900 font-bold shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-70 bg-slate-100 px-1 py-0.2 rounded">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Service filter dropdown */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <span>Service:</span>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">All Services</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* WORKSPACE: MASTER-DETAIL SPLIT */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* LEFT COLUMN: Inquiry Feed */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-0 overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin]">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading inquiries...</div>
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
                const locationStr = inq.municipality || inq.province || inq.venue_type || "Location TBD";
                const isQuotationReady = inq.status === "Quotation Sent";
                const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);

                return (
                  <div
                    key={inq._id}
                    onClick={() => setSelectedInquiryId(inq._id)}
                    className={cn(
                      "p-3.5 px-4 cursor-pointer transition-colors text-left relative",
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
                          status.tone === "warning" && "bg-amber-50 text-amber-800 border-amber-200",
                          status.tone === "success" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                          status.tone === "neutral" && "bg-slate-100 text-slate-600 border-slate-200",
                          status.tone === "danger" && "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {status.label}
                      </span>

                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {inq.total_price ? formatCurrency(inq.total_price) : inq.budget_range ? inq.budget_range : "Pending Quote"}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate mt-1.5 font-sans">
                      {recordTitle(inq)}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                      <span>{formatShortDate(inq.event_date)}</span>
                      <span>·</span>
                      <span>{inq.guest_count ? `${inq.guest_count} guests` : "Headcount TBD"}</span>
                      <span>·</span>
                      <span className="truncate">{locationStr}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 text-[10px] text-slate-400">
                      <span className="font-mono">{refCode}</span>
                      {isQuotationReady && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Quote Ready
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

          {/* RIGHT COLUMN: Active Inquiry Workspace Canvas */}
          <div className="flex-1 bg-slate-50/50 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 [scrollbar-width:thin]">
            {selectedInquiry ? (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Header Card */}
                <div className="p-5 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                        {selectedInquiry.reference || `INQ-${selectedInquiry._id.substring(0, 6).toUpperCase()}`}
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

                  {/* Header Actions */}
                  <div className="shrink-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                      variant="outline"
                      onClick={() => setViewingFullInquiry(selectedInquiry)}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md font-semibold text-xs h-9 px-3 cursor-pointer shadow-2xs gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#2C4B8A]" />
                      <span>Full details</span>
                    </Button>

                    {selectedInquiry.status === "Converted to Booking" || Boolean(selectedInquiry.converted_booking_id) ? (
                      <Button
                        onClick={() => navigate(`/customer/bookings/${selectedInquiry.converted_booking_id}`)}
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
                    ) : selectedInquiry.total_price > 0 && !["Cancelled", "Quote Rejected"].includes(selectedInquiry.status) ? (
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
                        {loadingEditInquiryId === selectedInquiry._id ? "Loading..." : "Edit request"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Milestone Stepper */}
                {renderMilestoneProgress(selectedInquiry)}

                {/* Status Alert Prompt */}
                {selectedInquiry.status === "Quotation Sent" && (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-md flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Your quotation is ready for <strong>{formatCurrency(selectedInquiry.total_price)}</strong>. Review and accept to lock in your date.</span>
                    </div>
                    <Button
                      size="xs"
                      onClick={() => openQuotationView(selectedInquiry)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-semibold rounded cursor-pointer"
                    >
                      Review Quote
                    </Button>
                  </div>
                )}

                {/* Event Specifications Card */}
                <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#2C4B8A]" /> Event Specifications
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Date &amp; Time</span>
                      <span className="font-semibold text-slate-900">{formatEventDateTime(selectedInquiry.event_date, selectedInquiry.start_time)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Duration</span>
                      <span className="font-semibold text-slate-900">{selectedInquiry.duration_hours ? `${selectedInquiry.duration_hours} hours` : "Standard"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Guest Count</span>
                      <span className="font-semibold text-slate-900">{selectedInquiry.guest_count || 0} pax</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Service Type</span>
                      <span className="font-semibold text-slate-900">{resolveServiceType(selectedInquiry)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Theme</span>
                      <span className="font-semibold text-slate-900">{selectedInquiry.event_theme || "Standard Event"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Package</span>
                      <span className="font-semibold text-slate-900">{selectedInquiry.package_id?.name || "Customized Quote"}</span>
                    </div>
                  </div>

                  {selectedInquiry.event_palette && selectedInquiry.event_palette.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400 block mb-1">Color Palette</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedInquiry.event_palette.filter(Boolean).map((color, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium">
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Venue & Logistics Card */}
                <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2C4B8A]" /> Venue &amp; Special Requests
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Venue Address</span>
                      <span className="font-semibold text-slate-900 leading-relaxed">
                        {[selectedInquiry.street, selectedInquiry.barangay, selectedInquiry.municipality, selectedInquiry.province, selectedInquiry.zip_code]
                          .filter(Boolean)
                          .join(", ") || selectedInquiry.venue_type || "Location to be confirmed"}
                      </span>
                    </div>

                    {selectedInquiry.landmark && (
                      <div>
                        <span className="text-[11px] text-slate-400 block">Landmark</span>
                        <span className="text-slate-700">{selectedInquiry.landmark}</span>
                      </div>
                    )}

                    {selectedInquiry.special_requests && (
                      <div>
                        <span className="text-[11px] text-slate-400 block">Special Requests</span>
                        <span className="text-slate-700">{selectedInquiry.special_requests}</span>
                      </div>
                    )}

                    {(selectedInquiry.allergies || selectedInquiry.dietary_restrictions || selectedInquiry.dietary_requirements) && (
                      <div>
                        <span className="text-[11px] text-slate-400 block">Dietary &amp; Allergies</span>
                        <span className="text-slate-700">
                          {[selectedInquiry.allergies, selectedInquiry.dietary_restrictions, selectedInquiry.dietary_requirements].filter(Boolean).join(" · ")}
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
                <p className="text-xs text-slate-400 mt-0.5">Select a request from the list on the left to view its full details.</p>
              </div>
            )}
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
      <Dialog open={!!cancellingInquiry} onOpenChange={(open) => !open && setCancellingInquiry(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-md">
          <DialogHeader>
            <DialogTitle className="font-sans font-bold text-slate-900">Cancel this request?</DialogTitle>
            <DialogDescription className="pt-2 text-xs text-slate-600">
              We'll stop working on{" "}
              <strong className="text-slate-900">
                {cancellingInquiry ? recordTitle(cancellingInquiry) : "this request"}
              </strong>
              {cancellingInquiry?.reference ? ` (${cancellingInquiry.reference})` : ""}. This cannot be undone, but you can always submit a new quote request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancellingInquiry(null)} disabled={isSubmittingCancel} className="rounded-md border-slate-200 text-xs">
              Keep request
            </Button>
            <Button variant="destructive" onClick={handleCancelInquiry} disabled={isSubmittingCancel} className="rounded-md text-xs">
              {isSubmittingCancel ? "Cancelling…" : "Yes, cancel it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
