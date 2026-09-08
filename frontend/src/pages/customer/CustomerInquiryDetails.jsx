import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
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
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEventDate, formatEventDateWithDay, formatTime } from "../../utils/format";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  FileCheck2,
  CreditCard,
  XCircle,
  Pencil,
  Clock,
  CheckCircle2,
  MapPin,
  Users,
  Calendar,
  Utensils,
  ChevronRight,
  Package,
  Layers,
  Phone,
  Mail,
  User,
  Info,
  AlertCircle,
} from "lucide-react";

export default function CustomerInquiryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [inquiry, setInquiry] = useState(null);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quotation Modal State
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [quotationVersions, setQuotationVersions] = useState([]);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Cancel Dialog State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchInquiryDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [inqRes, menuRes, pkgRes] = await Promise.all([
        CustomerAPI.getInquiryById(id),
        CustomerAPI.getMenu().catch(() => ({ data: [] })),
        CustomerAPI.getPackages().catch(() => ({ data: [] })),
      ]);
      setInquiry(inqRes.data || null);
      setMenuCatalog(menuRes.data || []);
      setPackages(pkgRes.data || []);
    } catch (err) {
      notify("Failed to load inquiry details.", "error");
      navigate("/customer/inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiryDetails();
  }, [id]);

  useRealTimeRefresh(fetchInquiryDetails);

  const meta = useMemo(() => inquiryStatusMeta(inquiry), [inquiry]);

  const openQuotationView = async () => {
    if (!inquiry?._id) {
      notify("Inquiry details are not available.", "error");
      return;
    }
    try {
      setIsLoadingQuotation(true);
      const res = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]);
        setQuotationVersions(quotes);
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

  const handleOpenChat = async () => {
    if (!inquiry?._id) return;
    try {
      const conversation = await createConversation({ inquiry_id: inquiry._id });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (err) {
      notify("Could not initiate chat at this moment.", "error");
    }
  };

  const startInquiryCheckout = async () => {
    if (!inquiry) return;
    try {
      const isConverted = inquiry.status === "Converted to Booking" || Boolean(inquiry.converted_booking_id);
      const isDepositPaid =
        inquiry.payment_status === "deposit_paid" ||
        inquiry.payment_status === "fully_paid" ||
        inquiry.is_deposit_paid === true;

      if (isConverted || isDepositPaid) {
        notify("The deposit payment for this inquiry has already been completed.", "info");
        if (inquiry.converted_booking_id) {
          navigate(`/customer/bookings/${inquiry.converted_booking_id}`);
        }
        return;
      }

      notify("Generating checkout session for deposit payment...", "info");
      const qRes = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = qRes.data || [];
      const latestQuote = quotes[0];
      const depositVal =
        Number(latestQuote?.deposit_amount) > 0
          ? Number(latestQuote.deposit_amount)
          : Number(inquiry.total_price || 0);

      if (depositVal <= 0) {
        notify("Deposit amount has not been set yet.", "error");
        return;
      }

      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        inquiry_id: inquiry._id,
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

  const handleCancelInquiry = async () => {
    if (!inquiry) return;
    try {
      setIsSubmittingCancel(true);
      await CustomerAPI.cancelInquiry(inquiry._id);
      notify("Inquiry has been cancelled.", "info");
      setIsCancelDialogOpen(false);
      fetchInquiryDetails();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to cancel inquiry.", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (loading) {
    return (
      <CustomerDashboardLayout>
        <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
          Loading full inquiry specifications...
        </div>
      </CustomerDashboardLayout>
    );
  }

  if (!inquiry) {
    return (
      <CustomerDashboardLayout>
        <div className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-900">Inquiry Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">The request you are trying to view does not exist or was removed.</p>
          <Button onClick={() => navigate("/customer/inquiries")} className="mt-4 bg-[#2C4B8A] text-white">
            Return to My Inquiries
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const titleStr = recordTitle(inquiry);
  const thumbnail = getEventThumbnail(inquiry);
  const refCode = inquiry.reference || `INQ-${inquiry._id.substring(0, 6).toUpperCase()}`;
  const isQuotationSent = inquiry.status === "Quotation Sent";
  const isConverted = inquiry.status === "Converted to Booking" || Boolean(inquiry.converted_booking_id);
  const isDepositPaid =
    inquiry.payment_status === "deposit_paid" ||
    inquiry.payment_status === "fully_paid" ||
    inquiry.is_deposit_paid === true;

  // Timeline Stepper Definition
  const steps = [
    {
      id: "submitted",
      title: "Request Submitted",
      desc: "Event inquiry received",
      status: "completed",
      date: inquiry.createdAt ? formatEventDate(inquiry.createdAt) : null,
    },
    {
      id: "review",
      title: "Under Review",
      desc: "Preparing pricing & venue check",
      status: ["Pending Review", "Under Review", "Revision Requested", "Quotation Sent", "Quote Accepted", "Converted to Booking"].includes(inquiry.status)
        ? inquiry.status === "Pending Review" || inquiry.status === "Under Review" || inquiry.status === "Revision Requested"
          ? "active"
          : "completed"
        : "pending",
    },
    {
      id: "quote",
      title: "Quotation Ready",
      desc: "Proposal ready for review",
      status: isQuotationSent
        ? "active"
        : ["Quote Accepted", "Awaiting Final Confirmation", "Converted to Booking"].includes(inquiry.status) || isDepositPaid
        ? "completed"
        : "pending",
    },
    {
      id: "confirmed",
      title: "Deposit & Reservation",
      desc: "Event date locked",
      status: isConverted || isDepositPaid
        ? "completed"
        : inquiry.status === "Quote Accepted"
        ? "active"
        : "pending",
    },
  ];

  return (
    <CustomerDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/customer/inquiries")}
            className="text-xs font-semibold text-[#2C4B8A] gap-1.5 p-0 hover:bg-transparent cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Inquiries
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenChat}
              className="text-xs font-semibold border-slate-200 text-slate-700 gap-1.5 h-8 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#2C4B8A]" /> Chat Staff
            </Button>

            {inquiry.status !== "Converted to Booking" && inquiry.status !== "Cancelled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-semibold border-slate-200 text-slate-700 gap-1.5 h-8 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" /> Edit Request
              </Button>
            )}
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={titleStr}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#2C4B8A]/10 to-blue-100/60 border border-[#2C4B8A]/20 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                  <Utensils className="w-8 h-8 opacity-80" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">{titleStr}</h1>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-xs font-bold border tracking-tight inline-flex items-center gap-1",
                      meta.tone === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : meta.tone === "warning"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : meta.tone === "info"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {meta.label}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1 flex items-center gap-2 flex-wrap">
                  <span>{formatEventDateWithDay(inquiry.event_date)}</span>
                  {inquiry.start_time && <span>• {formatTime(inquiry.start_time)}</span>}
                  <span>•</span>
                  <span>{inquiry.guest_count ? `${inquiry.guest_count} guests` : "Guests TBD"}</span>
                </div>

                <div className="text-xs font-mono text-slate-400 mt-1">Ref. #{refCode}</div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              {isQuotationSent && (
                <Button
                  onClick={openQuotationView}
                  disabled={isLoadingQuotation}
                  className="bg-[#1E3563] hover:bg-[#152547] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer gap-1.5 shadow-2xs"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Review Quote</span>
                </Button>
              )}

              {inquiry.total_price > 0 && !isConverted && !isDepositPaid && inquiry.status !== "Cancelled" && (
                <Button
                  onClick={startInquiryCheckout}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" /> Pay Deposit
                </Button>
              )}

              {isConverted && inquiry.converted_booking_id && (
                <Button
                  onClick={() => navigate(`/customer/bookings/${inquiry.converted_booking_id}`)}
                  className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer"
                >
                  Go to Booking <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Action Required Callout Banner */}
          {meta.notice && (
            <div
              className={cn(
                "p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed",
                meta.notice.tone === "info"
                  ? "bg-blue-50/80 border-blue-200 text-blue-900"
                  : meta.notice.tone === "warning"
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : meta.notice.tone === "success"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              )}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-80" />
              <div>
                <div className="font-bold">{meta.notice.title}</div>
                <div className="mt-0.5 text-[11px] opacity-90">{meta.notice.text}</div>
              </div>
            </div>
          )}
        </div>

        {/* DEDICATED LIFECYCLE TIMELINE DIAGRAM */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2C4B8A]" /> Inquiry Progress Timeline
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  "p-3.5 rounded-xl border text-xs relative flex flex-col justify-between space-y-2",
                  step.status === "completed"
                    ? "bg-emerald-50/50 border-emerald-200/80 text-emerald-900"
                    : step.status === "active"
                    ? "bg-blue-50/70 border-blue-300 text-blue-950 ring-2 ring-[#2C4B8A]/20"
                    : "bg-slate-50/60 border-slate-200 text-slate-400"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Step {idx + 1}</span>
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : step.status === "active" ? (
                    <Clock className="w-4 h-4 text-[#2C4B8A] animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-xs text-slate-900">{step.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                </div>

                {step.date && (
                  <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200/60 pt-1.5">
                    {step.date}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FULL SPECIFICATION & DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Event & Venue Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2C4B8A]" /> Event &amp; Venue Specifications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px]">Service Type</span>
                  <span className="font-bold text-slate-800">{resolveServiceType(inquiry)}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px]">Event Date</span>
                  <span className="font-bold text-slate-800">{formatEventDateWithDay(inquiry.event_date)}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px]">Start Time</span>
                  <span className="font-bold text-slate-800">{inquiry.start_time ? formatTime(inquiry.start_time) : "Time TBD"}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px]">Guest Count</span>
                  <span className="font-bold text-slate-800">{inquiry.guest_count ? `${inquiry.guest_count} guests` : "TBD"}</span>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-slate-400 font-semibold block text-[11px]">Venue &amp; Address</span>
                  <span className="font-bold text-slate-800">
                    {inquiry.venue_type || inquiry.municipality
                      ? `${inquiry.venue_type || "Venue"} - ${[inquiry.venue_address, inquiry.municipality, inquiry.province].filter(Boolean).join(", ")}`
                      : "Location TBD"}
                  </span>
                </div>

                {inquiry.notes && (
                  <div className="space-y-1 sm:col-span-2 border-t border-slate-100 pt-3">
                    <span className="text-slate-400 font-semibold block text-[11px]">Special Notes &amp; Requests</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      {inquiry.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Package & Pricing Specifications */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#2C4B8A]" /> Selected Package &amp; Inclusions
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {inquiry.package_name || inquiry.package_id?.name || "Custom Event Package"}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {inquiry.package_id?.description || "Tailored setup and food selection"}
                    </div>
                  </div>

                  {inquiry.total_price > 0 && (
                    <div className="font-bold text-[#2C4B8A] text-sm">
                      {formatCurrency(inquiry.total_price)}
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                {Array.isArray(inquiry.selected_menu) && inquiry.selected_menu.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-slate-400 font-semibold block text-[11px]">Menu Selection</span>
                    <div className="flex flex-wrap gap-1.5">
                      {inquiry.selected_menu.map((item, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs">
                          {typeof item === "object" ? item.name : item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Contact Details & Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-[#2C4B8A]" /> Contact Information
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800">
                    {inquiry.contact_first_name} {inquiry.contact_last_name}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{inquiry.contact_email || "No email"}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{inquiry.contact_phone || "No phone"}</span>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            {inquiry.status !== "Converted to Booking" && inquiry.status !== "Cancelled" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <Button
                  variant="outline"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold h-9 rounded-xl cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Inquiry Request
                </Button>
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
          }}
          quotation={activeQuotation}
          versions={quotationVersions}
          inquiry={inquiry}
          onUpdated={fetchInquiryDetails}
        />
      )}

      {isEditModalOpen && (
        <CustomerInquiryEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          inquiry={inquiry}
          onSaved={fetchInquiryDetails}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
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
              onClick={() => setIsCancelDialogOpen(false)}
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
