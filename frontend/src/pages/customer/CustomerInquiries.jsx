import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import CustomerQuotationModal from "../../components/customer/CustomerQuotationModal";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { 
  FileText, 
  Search, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Plus,
  Utensils,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Eye,
  CreditCard
} from "lucide-react";

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === "" || val === 0) return "Pending Quote";
  return `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CustomerInquiries() {
  const navigate = useNavigate();
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
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Cancel Dialog State
  const [cancellingInquiry, setCancellingInquiry] = useState(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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

  // Compute KPI Counts
  const kpiStats = useMemo(() => {
    const total = inquiries.length;
    const actionRequired = inquiries.filter((i) => i.status === "Quotation Sent").length;
    const underReview = inquiries.filter((i) => 
      ["Pending Review", "Under Review", "Waiting for Customer", "Revision Requested"].includes(i.status)
    ).length;
    const accepted = inquiries.filter((i) => 
      ["Quote Accepted", "Converted to Booking"].includes(i.status)
    ).length;

    return { total, actionRequired, underReview, accepted };
  }, [inquiries]);

  // Filtered list
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // 1. Status Filter
      if (statusTab === "action_needed" && inq.status !== "Quotation Sent") return false;
      if (statusTab === "under_review" && !["Pending Review", "Under Review", "Waiting for Customer", "Revision Requested"].includes(inq.status)) return false;
      if (statusTab === "accepted" && !["Quote Accepted", "Converted to Booking"].includes(inq.status)) return false;
      if (statusTab === "cancelled" && !["Cancelled", "Quote Rejected", "Expired"].includes(inq.status)) return false;

      // 2. Service Type Filter
      if (serviceTypeFilter !== "all") {
        const st = inq.service_type || (
          inq.event_type?.toLowerCase().includes("food delivery") || inq.delivery_method !== "setup" ? "Food Only" :
          !inq.include_food ? "Event Setup Only" : "Food and Event Setup"
        );
        if (st !== serviceTypeFilter) return false;
      }

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
  }, [inquiries, statusTab, serviceTypeFilter, searchQuery]);

  // Open Quotation Modal
  const openQuotationView = async (inquiry) => {
    try {
      setIsLoadingQuotation(true);
      setSelectedInquiryForModal(inquiry);
      const res = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]); // highest/latest version
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
      const conversation = await createConversation({ booking_id: inquiryId });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (err) {
      notify("Could not initiate chat at this moment.", "error");
    }
  };

  // Start Inquiry Deposit Checkout
  const startInquiryCheckout = async (inq) => {
    try {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "Quotation Sent":
        return (
          <span className="px-3 py-1 bg-indigo-600 text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Quote Ready
          </span>
        );
      case "Pending Review":
      case "Under Review":
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-semibold text-xs rounded-full border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
          </span>
        );
      case "Revision Requested":
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 font-semibold text-xs rounded-full border border-orange-200 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-orange-600" /> Revision Requested
          </span>
        );
      case "Quote Accepted":
      case "Converted to Booking":
        return (
          <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Quote Accepted
          </span>
        );
      case "Cancelled":
      case "Quote Rejected":
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 font-semibold text-xs rounded-full border border-slate-200 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-medium text-xs rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <CustomerDashboardLayout
      title="My Inquiries"
      subtitle="Track your quote requests, review issued quotations, and manage event inquiries"
    >
      {/* Top Banner & KPI Stat Cards */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight mb-1 flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-400" /> Quote Requests & Inquiries
            </h2>
            <p className="text-xs text-slate-300">
              Submit custom catering requests and receive tailored quotations from Caezelle's Catering team.
            </p>
          </div>
          
          <Button 
            onClick={() => navigate("/customer/book", { state: { resetWizard: true } })} 
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Request New Quote
          </Button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Total Inquiries</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpiStats.total}</div>
          </div>

          <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-colors ${
            kpiStats.actionRequired > 0 ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-2 text-indigo-700">
              <span>Quotes Ready</span>
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-indigo-900">{kpiStats.actionRequired}</span>
              {kpiStats.actionRequired > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                  Action Required
                </span>
              )}
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Under Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpiStats.underReview}</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Accepted / Booked</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpiStats.accepted}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusTab("all")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Inquiries ({kpiStats.total})
            </button>
            <button
              onClick={() => setStatusTab("action_needed")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusTab === "action_needed" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Quotes Received ({kpiStats.actionRequired})
            </button>
            <button
              onClick={() => setStatusTab("under_review")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "under_review" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Under Review ({kpiStats.underReview})
            </button>
            <button
              onClick={() => setStatusTab("accepted")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "accepted" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Accepted ({kpiStats.accepted})
            </button>
            <button
              onClick={() => setStatusTab("cancelled")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "cancelled" ? "bg-slate-200 text-slate-800 shadow-sm" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search reference, event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs rounded-xl border-slate-200 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Sub Filters: Service Type */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Service Type:
          </span>
          {["all", "Food Only", "Event Setup Only", "Food and Event Setup"].map((st) => (
            <button
              key={st}
              onClick={() => setServiceTypeFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                serviceTypeFilter === st
                  ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "all" ? "All Services" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-sm font-medium">Fetching your inquiries...</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No inquiries found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery || statusTab !== "all" || serviceTypeFilter !== "all" 
                  ? "Try clearing or adjusting your search filters above."
                  : "You haven't submitted any quote requests yet. Get started by requesting a custom catering quote!"}
              </p>
              <Button 
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                className="mt-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 text-xs shadow-sm"
              >
                + Request a Quote
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredInquiries.map((inq) => {
            const isExpanded = expandedId === inq._id;
            const refCode = inq.reference || `INQ-${inq._id.substring(0, 6).toUpperCase()}`;
            const serviceType = inq.service_type || (
              inq.event_type?.toLowerCase().includes("food delivery") || inq.delivery_method !== "setup" ? "Food Only" :
              !inq.include_food ? "Event Setup Only" : "Food and Event Setup"
            );
            const isQuotationReady = inq.status === "Quotation Sent";
            const isAccepted = inq.status === "Quote Accepted" || inq.status === "Converted to Booking";
            const isPending = ["Pending Review", "Under Review"].includes(inq.status);

            return (
              <div 
                key={inq._id} 
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                  isQuotationReady 
                    ? "border-indigo-300 ring-2 ring-indigo-500/20" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Strip */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    {/* Icon Avatar */}
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-sm">
                      {serviceType === "Food Only" ? (
                        <Utensils className="w-6 h-6" />
                      ) : serviceType === "Event Setup Only" ? (
                        <Layers className="w-6 h-6" />
                      ) : (
                        <Sparkles className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-base">
                          {inq.contact_first_name ? `${inq.contact_first_name}'s ` : ""}{inq.event_type}
                        </h3>

                        {getStatusBadge(inq.status)}

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {serviceType}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {inq.package_id?.name || "Custom Quote"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-slate-600">{refCode}</span>
                        <span>·</span>
                        <span>Submitted on {new Date(inq.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Primary Action Summary */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-400 font-medium">Estimated / Quoted Cost</div>
                      <div className="text-lg font-serif font-bold text-slate-900">
                        {inq.total_price ? formatCurrency(inq.total_price) : inq.budget_range ? `Budget: ${inq.budget_range}` : "Pending Admin Quote"}
                      </div>
                    </div>

                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : inq._id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title={isExpanded ? "Collapse Details" : "Expand Details"}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Key Details Bar */}
                <div className="px-5 py-3 bg-slate-50/70 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Date</span>
                      <strong className="text-slate-900">{inq.event_date ? new Date(inq.event_date).toLocaleDateString() : "TBA"}</strong> ({inq.start_time || "TBA"})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <Users className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Guests</span>
                      <strong className="text-slate-900">{inq.guest_count} pax</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                      <strong className="text-slate-900 truncate block">
                        {inq.municipality || inq.province || inq.venue_type || "Antipolo / Rizal"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Person</span>
                      <strong className="text-slate-900">{inq.contact_first_name} {inq.contact_last_name}</strong>
                    </div>
                  </div>
                </div>

                {/* Primary Action Banners */}
                <div className="p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Banner Message depending on state */}
                  {isQuotationReady && (
                    <div className="flex items-center gap-2.5 text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl flex-1 w-full">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-spin-slow" />
                      <div>
                        <strong className="font-semibold">Official Quotation Issued!</strong> Review pricing and accept to confirm your booking.
                      </div>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="flex items-center gap-2.5 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex-1 w-full">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="font-semibold">Quote Accepted!</strong> You can now track your booking or complete deposit payment.
                      </div>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2.5 text-xs text-amber-900 bg-amber-50/80 border border-amber-200 px-3.5 py-2 rounded-xl flex-1 w-full">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <strong className="font-semibold">Under Review:</strong> Our team is assessing availability and preparing your custom quote.
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 w-full sm:w-auto justify-end">
                    {isQuotationReady && (
                      <Button
                        onClick={() => openQuotationView(inq)}
                        disabled={isLoadingQuotation}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 w-full sm:w-auto justify-center"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review & Accept Quotation
                      </Button>
                    )}

                    {isAccepted && (
                      <>
                        <Button
                          onClick={() => startInquiryCheckout(inq)}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 w-full sm:w-auto justify-center"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay Deposit Now
                        </Button>
                        <Button
                          onClick={() => navigate(`/customer/bookings/${inq.converted_booking_id || inq._id}`)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 w-full sm:w-auto justify-center"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Proceed to Booking
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenChat(inq._id)}
                      className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> Chat with Caterer
                    </Button>

                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingInquiry(inq)}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                </div>

                {/* Collapsible Extended Details */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Venue & Contact Info */}
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Address & Location</h4>
                        <p className="text-slate-600">
                          {inq.street ? `${inq.street}, ` : ""}{inq.barangay ? `${inq.barangay}, ` : ""}{inq.municipality}, {inq.province} {inq.zip_code}
                        </p>
                        {inq.landmark && (
                          <p className="text-slate-500 italic">Landmark: {inq.landmark}</p>
                        )}
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="font-semibold text-slate-700">Contact: </span>
                          <span>{inq.contact_email} · {inq.contact_phone}</span>
                        </div>
                      </div>

                      {/* Right: Requests & Dietary */}
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Notes & Special Requests</h4>
                        <p className="text-slate-600">
                          {inq.special_requests || "No special requests specified."}
                        </p>
                        {inq.dietary_requirements && (
                          <div className="pt-2 border-t border-slate-100 mt-2">
                            <span className="font-semibold text-amber-800">Dietary Needs: </span>
                            <span className="text-slate-700">{inq.dietary_requirements}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quotation Viewer Modal */}
      {isQuotationModalOpen && activeQuotation && (
        <CustomerQuotationModal
          open={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          quotation={activeQuotation}
          inquiry={selectedInquiryForModal}
          onUpdated={fetchInquiries}
        />
      )}

      {/* Cancel Inquiry Confirmation Modal */}
      {cancellingInquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">Cancel Inquiry Request</h3>
            </div>
            
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel inquiry <strong className="text-slate-900">{cancellingInquiry.reference || "request"}</strong> for {cancellingInquiry.event_type}? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCancellingInquiry(null)}
                disabled={isSubmittingCancel}
              >
                Keep Inquiry
              </Button>

              <Button 
                size="sm" 
                onClick={handleCancelInquiry}
                disabled={isSubmittingCancel}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isSubmittingCancel ? "Cancelling..." : "Yes, Cancel Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CustomerDashboardLayout>
  );
}
