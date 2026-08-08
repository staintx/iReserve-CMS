import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import { 
  ChevronLeft, 
  Check, 
  Clock, 
  AlertCircle, 
  CalendarRange, 
  Users, 
  ArrowUpCircle, 
  MessageSquare,
  Copy,
  Utensils,
  CreditCard,
  MapPin,
  UserCheck,
  Sparkles,
  Phone,
  Mail,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Info,
  ExternalLink,
  ChevronRight,
  History,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import useToast from "../../hooks/useToast";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";
import RevisionProposalModal from "../../components/booking/RevisionProposalModal";
import BookingRevisionHistory from "../../components/booking/BookingRevisionHistory";
import BookingHistoryTimeline from "../../components/booking/BookingHistoryTimeline";
import BookingVersionHistory from "../../components/booking/BookingVersionHistory";
import AmountSummary from "../../components/customer/portal/AmountSummary";
import { ACTION_PAY, ACTION_MESSAGE } from "../../components/customer/portal/actionStyles";
import { cn } from "@/lib/utils";
import { selectSourceQuotation } from "../../utils/quotationDiff";
import { formatShortDate } from "../../utils/format";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const formatCurrency = (val) => {
  return `₱${Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CustomerEventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Management State
  const [packages, setPackages] = useState([]);
  
  const [addingGuests, setAddingGuests] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [isSubmittingGuests, setIsSubmittingGuests] = useState(false);
  
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const [sourceQuotation, setSourceQuotation] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [searchParams] = useSearchParams();

  const [requestingChange, setRequestingChange] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [changeFields, setChangeFields] = useState({ event_date: "", start_time: "", guest_count: "", venue_type: "" });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const submitChangeRequest = async (event) => {
    event.preventDefault();
    const nextMessage = requestNote.trim();
    if (!nextMessage && !changeFields.event_date && !changeFields.guest_count && !changeFields.start_time) {
      notify("Please describe or select the changes you want to propose.", "error");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      
      const payload = {
        message: nextMessage || "Customer proposed booking revisions",
      };
      if (changeFields.event_date) payload.event_date = changeFields.event_date;
      if (changeFields.start_time) payload.start_time = changeFields.start_time;
      if (changeFields.guest_count) payload.guest_count = Number(changeFields.guest_count);
      if (changeFields.venue_type) payload.venue_type = changeFields.venue_type;

      await CustomerAPI.proposeRevision(booking._id, payload);
      await CustomerAPI.requestBookingChange(booking._id, { message: nextMessage || "Proposed booking revision" });

      notify("Your revision proposal was submitted to the admin for review!", "success");
      setRequestingChange(false);
      setRequestNote("");
      setChangeFields({ event_date: "", start_time: "", guest_count: "", venue_type: "" });
      fetchBooking();
    } catch (error) {
      notify(error.response?.data?.message || "We could not send your revision proposal.", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const [requestingOcular, setRequestingOcular] = useState(false);
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);

  const handleAcceptRevision = async () => {
    try {
      await CustomerAPI.acceptRevision(booking._id);
      notify("Revised booking deal confirmed successfully! Your booking terms have been updated.", "success");
      fetchBooking();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to confirm revision proposal", "error");
    }
  };

  const handleRejectRevision = async (reason) => {
    try {
      await CustomerAPI.rejectRevision(booking._id, { reason });
      notify("Revision proposal declined.", "info");
      fetchBooking();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to decline revision proposal", "error");
    }
  };

  useEffect(() => {
    fetchBooking();
    fetchPayments();
    fetchSourceQuotation();
    CustomerAPI.getPackages().then((res) => setPackages(res.data)).catch(() => setPackages([]));
  }, [id]);

  const canModifyBooking = useMemo(() => {
    if (!booking || !booking.event_date) return false;
    return new Date(booking.event_date).getTime() - Date.now() > THREE_DAYS_MS;
  }, [booking]);

  const bookingPayments = useMemo(() => {
    if (!booking) return [];
    return payments.filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id));
  }, [booking, payments]);

  const totalPaid = useMemo(
    () => bookingPayments.filter((p) => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [bookingPayments]
  );

  const pendingPayments = useMemo(
    () => bookingPayments.filter((p) => p.status === "pending"),
    [bookingPayments]
  );

  // Independent Price Breakdown Calculations for Customer View
  const serviceItemsSubtotal = (booking?.service_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const additionalChargesSubtotal = (booking?.additional_charges || []).reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const menuItemsAddonSubtotal = (booking?.menu_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );
  const addOnsSubtotal = serviceItemsSubtotal + additionalChargesSubtotal + menuItemsAddonSubtotal;

  const pkg = booking?.package_id;
  const guestCount = Number(booking?.guest_count) || 0;
  
  let basePackageSubtotal = 0;
  let pkgLabelText = "Base Package Subtotal";
  if (pkg) {
    if (pkg.package_type === "Event Setup Only") {
      basePackageSubtotal = Number(pkg.setup_price || 0);
      pkgLabelText = `${pkg.name || "Event Setup"} (Setup Fee)`;
    } else {
      const perHead = Number(pkg.price_per_guest || 0);
      basePackageSubtotal = perHead * guestCount;
      pkgLabelText = `${pkg.name || "Base Package"} (${formatCurrency(perHead)}/head × ${guestCount} guests)`;
    }
  }

  const grandTotal = Number(booking?.total_price || 0);
  const discountAmount = Number(booking?.discount_amount || 0);

  if (basePackageSubtotal === 0 && grandTotal > 0) {
    basePackageSubtotal = Math.max(0, grandTotal + discountAmount - addOnsSubtotal);
    pkgLabelText = `Base Package Subtotal (${guestCount} guests)`;
  }

  const displayPaid = grandTotal > 0 ? Math.min(totalPaid, grandTotal) : totalPaid;
  const outstandingAmount = Math.max(0, grandTotal - displayPaid);
  const isFullyPaid = outstandingAmount <= 0 && grandTotal > 0;

  const fetchPayments = async () => {
    setPaymentLoading(true);
    try {
      const pRes = await CustomerAPI.getPayments();
      const filtered = pRes.data.filter((p) => String(p.booking_id?._id || p.booking_id) === String(id));
      setPayments(filtered);
    } catch {
      setPayments([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  const startPayment = async (payment) => {
    if (!payment?._id) return;
    setPayingPaymentId(payment._id);

    const amount = Number(payment.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("This payment does not have a valid amount.", "error");
      setPayingPaymentId(null);
      return;
    }

    navigate("/customer/checkout", {
      state: {
        bookingId: booking._id,
        amount,
        paymentType: payment.payment_type || "deposit"
      }
    });
  };

  const fetchBooking = () => {
    CustomerAPI.getBookings()
      .then((res) => {
        const found = res.data.find(b => b._id === id);
        setBooking(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  /**
   * Which quotation this booking came from.
   *
   * Booking has no quotation_id — the only stored link runs the other way
   * (Inquiry.converted_booking_id, set during conversion), so it is resolved
   * by reverse lookup through existing customer endpoints. Read-only, and it
   * mirrors the backend's own "prefer Accepted, else latest version" rule so
   * the reference can't disagree with the version the booking was built from.
   */
  const fetchSourceQuotation = async () => {
    try {
      const inqRes = await CustomerAPI.getInquiries();
      const sourceInquiry = (inqRes.data || []).find(
        (i) => String(i.converted_booking_id || "") === String(id)
      );
      if (!sourceInquiry) return;

      const qRes = await CustomerAPI.getQuotationsForInquiry(sourceInquiry._id);
      const picked = selectSourceQuotation(qRes.data || []);
      if (picked) setSourceQuotation({ quotation: picked, inquiry: sourceInquiry });
    } catch {
      // A missing link is normal for bookings made outside the quote flow.
    }
  };

  const copyReferenceCode = () => {
    const ref = booking?.reference || booking?._id?.substring(0, 8).toUpperCase();
    if (ref) {
      navigator.clipboard.writeText(ref);
      notify("Reference code copied to clipboard!", "success");
    }
  };

  const handleOpenChat = async () => {
    if (!booking?._id) return;
    try {
      setIsOpeningChat(true);
      const conversation = await createConversation({ booking_id: booking._id });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        notify(error.response?.data?.message || "This booking is not ready for chat yet.", "error");
        return;
      }
      notify(error.response?.data?.message || "Could not open conversation.", "error");
    } finally {
      setIsOpeningChat(false);
    }
  };

  const submitAddGuests = async (event) => {
    event.preventDefault();
    if (additionalGuests <= 0) {
      notify("Please enter a valid number of guests to add.", "error");
      return;
    }

    try {
      setIsSubmittingGuests(true);
      const response = await CustomerAPI.addGuests(booking._id, { additional_guests: additionalGuests });
      notify("Guests added successfully. Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        setAddingGuests(false);
        setAdditionalGuests(0);
        fetchBooking();
      }
    } catch (error) {
      notify(error.response?.data?.message || "We could not add guests. Please try again.", "error");
    } finally {
      setIsSubmittingGuests(false);
    }
  };

  const submitUpgrade = async (event) => {
    event.preventDefault();
    if (!selectedPackageId) {
      notify("Please select a package to upgrade to.", "error");
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      const response = await CustomerAPI.upgradeBooking(booking._id, { new_package_id: selectedPackageId });
      notify("Package upgraded! Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      }
    } catch (error) {
      notify(error.response?.data?.message || "Could not upgrade package.", "error");
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };


  const submitOcularRequest = async (event) => {
    event.preventDefault();
    if (!ocularDate) {
      notify("Please select a date for the ocular visit.", "error");
      return;
    }
    
    try {
      setIsSubmittingOcular(true);
      await CustomerAPI.requestOcular(booking._id, {
        scheduled_date: ocularDate,
        scheduled_time: ocularTime
      });
      notify("Ocular visit requested successfully.", "success");
      setRequestingOcular(false);
      fetchBooking();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to request ocular visit.", "error");
    } finally {
      setIsSubmittingOcular(false);
    }
  };

  const acceptQuote = async () => {
    try {
      setIsAcceptingQuote(true);
      const response = await CustomerAPI.acceptQuote(booking._id, { payment_method: booking.payment_method || "gcash" });
      notify("Quote accepted successfully! Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        fetchBooking();
      }
    } catch (error) {
      notify(error.response?.data?.message || "Failed to accept quote.", "error");
    } finally {
      setIsAcceptingQuote(false);
    }
  };

  if (loading) {
    return (
      <CustomerDashboardLayout title="Reservation Details">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse gap-3">
          <Utensils className="w-10 h-10 text-primary/40 animate-bounce" />
          <p className="font-medium text-lg">Loading full reservation details...</p>
        </div>
      </CustomerDashboardLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerDashboardLayout title="Reservation Details">
        <div className="p-12 text-center max-w-md mx-auto bg-card rounded-2xl border border-border shadow-xs">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-serif font-bold text-xl mb-2 text-foreground">Booking Not Found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn't locate the reservation details. It may have been deleted or moved.
          </p>
          <Button variant="default" onClick={() => navigate("/customer/bookings")} className="w-full">
            Return to My Bookings
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const steps = booking.payment_method === "cod" ? [
    { 
      label: "Order Placed", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      desc: "Order has been registered in system"
    },
    {
      label: "Preparing Order",
      completed: ["preparing", "ongoing", "completed"].includes(booking.status),
      date: ["preparing", "ongoing", "completed"].includes(booking.status) ? "In Progress" : "Pending",
      desc: "Kitchen staff preparing your menu"
    },
    { 
      label: "Out for Delivery & COD", 
      completed: booking.status === "completed",
      date: booking.status === "completed" ? "Completed" : "Upon Delivery",
      desc: "Delivered to venue with Cash on Delivery"
    },
  ] : [
    { 
      label: "Reservation Submitted", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      desc: "Initial inquiry and booking received"
    },
    { 
      label: "Deposit Paid", 
      completed: !["pending deposit", "cancelled"].includes(booking.status) && booking.payment_status !== "pending", 
      date: booking.payment_status === "paid" || booking.payment_status === "partially paid" || booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid" ? "Completed" : "Pending",
      desc: "Initial deposit to secure your event date"
    },
    {
      label: "Venue Ocular Visit",
      completed: booking.ocular_visit?.status === "completed",
      date: booking.ocular_visit?.scheduled_date ? new Date(booking.ocular_visit.scheduled_date).toLocaleDateString() : "Optional / Pending",
      desc: "Inspection of venue layout & logistics"
    },
    { 
      label: "Final Payment", 
      completed: booking.payment_status === "fully_paid" || isFullyPaid,
      date: isFullyPaid ? "Completed" : "Due before event date",
      desc: "Full balance payment cleared"
    },
    { 
      label: "Event Completed", 
      completed: ["completed", "Completed"].includes(booking.status),
      date: ["completed", "Completed"].includes(booking.status) ? "Completed" : "Upcoming",
      desc: "Event successfully served"
    },
  ];

  const assignedStaff = booking.staff_assignments || [];
  const eventManager = booking.event_manager_id;
  const isCustomOrSetup = booking.service_type !== "Food Only" && booking.service_type !== "food";
  const needsOcular = isCustomOrSetup && (!booking.ocular_visit || !booking.ocular_visit.status || booking.ocular_visit.status === "pending");
  const pendingOcular = booking.ocular_visit && booking.ocular_visit.status === "requested";

  // Status badge config
  const rawStatus = (booking.status || "").toLowerCase();
  let statusBadge = {
    label: booking.status,
    variant: "secondary"
  };
  if (["confirmed", "converted to booking"].includes(rawStatus)) {
    statusBadge = { label: "Confirmed & Reserved", variant: "bg-emerald-600 text-white font-bold" };
  } else if (["deposit pending", "pending deposit"].includes(rawStatus)) {
    statusBadge = { label: "Deposit Needed", variant: "bg-amber-500 text-slate-950 font-bold" };
  } else if (rawStatus === "ocular scheduled") {
    statusBadge = { label: "Ocular Scheduled", variant: "bg-blue-600 text-white font-bold" };
  } else if (["completed", "event completed"].includes(rawStatus)) {
    statusBadge = { label: "Event Completed", variant: "bg-slate-800 text-white font-semibold" };
  } else if (rawStatus === "cancelled") {
    statusBadge = { label: "Cancelled", variant: "bg-rose-600 text-white font-bold" };
  }

  const refCode = booking.reference || booking._id.substring(0, 8).toUpperCase();

  return (
    <CustomerDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/customer/bookings")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors -ml-3"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to My Bookings
          </Button>
        </div>

        {/* Header — what this booking is, when, and what it costs */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
                  {booking.event_type || "Catering Event"}
                </h1>
                <Badge className={`rounded-full px-3 py-1 text-xs ${statusBadge.variant}`}>
                  {statusBadge.label}
                </Badge>
                {booking.is_revised && (
                  <Badge className="border-amber-300 bg-amber-100 text-xs font-semibold text-amber-900">
                    Revised · v{booking.revision_count || 1}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium text-foreground">
                    {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date to be confirmed"}
                  </span>
                  {booking.start_time && (
                    <span className="text-muted-foreground">· {booking.start_time}</span>
                  )}
                </span>

                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium text-foreground">{booking.guest_count || 0} guests</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium text-foreground">{booking.service_type || "Food & Setup"}</span>
                </span>

                <button
                  type="button"
                  onClick={copyReferenceCode}
                  title="Copy reference code"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-mono">{refCode}</span>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* The whole money story — total, paid, remaining — so the
                customer never has to open Payments & Billing to find it. */}
            <div className="w-full shrink-0 rounded-xl border border-border bg-muted/30 p-4 lg:w-[23rem]">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted-foreground">Total cost</span>
                <span className="font-sans text-sm font-semibold tabular-nums text-foreground">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted-foreground">Amount paid</span>
                <span className="font-sans text-sm font-medium tabular-nums text-emerald-700">
                  {displayPaid > 0 ? `− ${formatCurrency(displayPaid)}` : formatCurrency(0)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-2.5">
                <span className="text-sm font-semibold text-foreground">
                  {isFullyPaid ? "Paid in full" : "Remaining balance"}
                </span>
                <span className={`font-sans text-2xl font-bold tabular-nums ${isFullyPaid ? "text-emerald-700" : "text-amber-700"}`}>
                  {formatCurrency(isFullyPaid ? grandTotal : outstandingAmount)}
                </span>
              </div>

              {outstandingAmount > 0 && (
                <Button
                  onClick={() => {
                    const activePayment = pendingPayments[0] || { amount: outstandingAmount, payment_type: "balance" };
                    startPayment({ ...activePayment, amount: Math.min(activePayment.amount || outstandingAmount, outstandingAmount) });
                  }}
                  disabled={payingPaymentId !== null}
                  className={cn("mt-3 w-full", ACTION_PAY)}
                >
                  <CreditCard className="h-4 w-4" />
                  {payingPaymentId ? "Opening checkout…" : "Pay remaining balance"}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                disabled={isOpeningChat}
                className={cn("gap-1.5 rounded-xl text-xs font-medium", ACTION_MESSAGE)}
              >
                <MessageSquare className="w-4 h-4" />
                {isOpeningChat ? "Opening chat…" : "Message us"}
              </Button>

              {!['inquiry', 'quote_sent', 'customer_accepted', 'completed', 'cancelled', 'refunded'].includes(booking.status) && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setAddingGuests(true)}
                    className="text-xs rounded-xl border-border hover:bg-muted font-medium gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Add Guests
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUpgrading(true)}
                    className="text-xs rounded-xl border-border hover:bg-muted font-medium gap-1.5"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Upgrade Package
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setRequestingChange(true)}
                    disabled={booking.change_request?.status === 'pending'}
                    className="text-xs rounded-xl border-border hover:bg-muted font-medium gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    {booking.change_request?.status === 'pending' ? "Change Pending" : "Request Changes"}
                  </Button>

                  {needsOcular && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setRequestingOcular(true)}
                      className="text-xs rounded-xl border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium gap-1.5"
                    >
                      <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
                      Schedule Ocular
                    </Button>
                  )}
                </>
              )}
            </div>

            {booking.status === "quote_sent" && (
              <Button 
                onClick={acceptQuote} 
                disabled={isAcceptingQuote}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isAcceptingQuote ? "Processing..." : "Accept Quote & Pay Deposit"}
              </Button>
            )}
          </div>
        </div>

        {/* Pending Revision Proposal Banner */}
        {booking.pending_revision && ["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status) && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-950 text-base">
                  {booking.pending_revision.status === "pending_customer_approval" ? "Revised Booking Proposal Awaiting Your Confirmation!" : "Your Proposed Revision is Pending Admin Review"}
                </h4>
                <p className="text-amber-800 text-xs mt-1 leading-relaxed font-medium">
                  {booking.pending_revision.message || "Please review the updated booking terms and pricing adjustment."}
                </p>
              </div>
            </div>
            {booking.pending_revision.status === "pending_customer_approval" && (
              <Button 
                onClick={() => setShowProposalModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shrink-0 shadow-xs"
              >
                Review & Confirm Deal
              </Button>
            )}
          </div>
        )}

        {/* Change Request Alert Notification Banner */}
        {booking.change_request && booking.change_request.status === 'pending' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-indigo-950 text-sm">Change Request Under Admin Review</h4>
              <p className="text-indigo-800 text-xs mt-0.5">"{booking.change_request.message}"</p>
              <p className="text-indigo-700 text-[11px] mt-1 font-mono">
                Submitted on {booking.change_request.requested_at ? new Date(booking.change_request.requested_at).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>
        )}

        {/* Main Tabbed Interface */}
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <TabsList className="bg-card border border-border p-1 rounded-2xl w-full sm:w-auto flex sm:inline-flex h-auto gap-1 overflow-x-auto justify-start">
            <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Utensils className="w-4 h-4 mr-2 hidden sm:inline" />
              Reservation Overview
            </TabsTrigger>
            <TabsTrigger value="financials" className="shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <CreditCard className="w-4 h-4 mr-2 hidden sm:inline" />
              Payments & Billing
            </TabsTrigger>
            <TabsTrigger value="timeline" className="shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Clock className="w-4 h-4 mr-2 hidden sm:inline" />
              Status & Timeline
            </TabsTrigger>
            <TabsTrigger value="revisions" className="shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Layers className="w-4 h-4 mr-2 hidden sm:inline" />
              Revisions & History
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Event & Venue Details Card (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-lg font-serif flex items-center gap-2">
                      <CalendarRange className="w-5 h-5 text-primary" />
                      Event & Location Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Package Name</p>
                        <p className="font-semibold text-foreground">{booking.package_id?.name || "Custom Catering Build"}</p>
                        {booking.package_id?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{booking.package_id.description}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Event Type / Theme</p>
                        <p className="font-semibold text-foreground">
                          {booking.event_type} {booking.event_theme ? `(${booking.event_theme})` : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Date & Time</p>
                        <p className="font-semibold text-foreground">
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : "TBD"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Start Time: {booking.start_time || "Not specified"}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Expected Guests</p>
                        <p className="font-semibold text-foreground">{booking.guest_count || 0} pax</p>
                        {canModifyBooking && (
                          <button 
                            onClick={() => setAddingGuests(true)}
                            className="text-xs text-primary hover:underline font-medium inline-block mt-0.5"
                          >
                            + Add more guests
                          </button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Venue / Setup Type</p>
                        <p className="font-semibold text-foreground">{booking.venue_type || "Standard Venue"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">Service: {booking.service_type || "Food & Setup"}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Location Address</p>
                        {booking.delivery_method === "pickup" ? (
                          <p className="font-semibold text-foreground">Customer Pickup: {booking.pickup_location || "Store Premises"}</p>
                        ) : (
                          <div>
                            <p className="font-semibold text-foreground">{booking.barangay}, {booking.municipality}</p>
                            <p className="text-xs text-muted-foreground">{booking.street ? `${booking.street}, ` : ""}{booking.province} {booking.zip_code ? `(ZIP: ${booking.zip_code})` : ""}</p>
                            {booking.landmark && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">Landmark: {booking.landmark}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Menu Items & Inclusions */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-lg font-serif flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-primary" />
                      Menu & Selected Inclusions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Selected Dishes */}
                    {booking.menu_items && booking.menu_items.length > 0 ? (
                      <div>
                        <h4 className="font-sans text-sm font-semibold text-foreground mb-3">Selected Dishes</h4>
                        {/* A plain list reads faster than numbered tiles, and
                            the number carried no meaning. What matters is which
                            dishes cost extra, so that stays called out. */}
                        <ul className="divide-y divide-border rounded-xl border border-border">
                          {booking.menu_items.map((item, idx) => (
                            <li key={idx} className="flex items-baseline justify-between gap-4 px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                              </div>
                              <span className="shrink-0 font-sans text-sm tabular-nums text-muted-foreground">
                                {item.price > 0 ? (
                                  <span className="font-medium text-foreground">+{formatCurrency(item.price)}</span>
                                ) : (
                                  "Included"
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-muted/30 p-4 rounded-xl text-sm text-muted-foreground flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>Package includes standard buffet menu set based on selected tier.</span>
                      </div>
                    )}

                    {/* Additional Service Items */}
                    {booking.service_items && booking.service_items.length > 0 && (
                      <div>
                        <h4 className="font-sans text-sm font-semibold text-foreground mb-3">Add-on Services & Rental Items</h4>
                        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                          {booking.service_items.map((item, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium text-foreground">{item.name}</span>
                                {item.quantity > 1 && <span className="text-xs text-muted-foreground ml-2">x{item.quantity}</span>}
                              </div>
                              <span className="font-semibold text-foreground">{formatCurrency(item.price * (item.quantity || 1))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Requests / Dietary Restrictions */}
                    {(booking.special_requests || booking.dietary_restrictions || booking.allergies) && (
                      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
                        <h4 className="font-sans font-semibold text-amber-900 text-sm flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Special Instructions & Dietary Notes
                        </h4>
                        {booking.dietary_restrictions && (
                          <p className="text-xs text-amber-900"><strong>Dietary Restrictions:</strong> {booking.dietary_restrictions}</p>
                        )}
                        {booking.allergies && (
                          <p className="text-xs text-amber-900"><strong>Allergies:</strong> {booking.allergies}</p>
                        )}
                        {booking.special_requests && (
                          <p className="text-xs text-amber-900"><strong>Requests:</strong> {booking.special_requests}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info (1 col) */}
              <div className="space-y-6">
                
                {/* Contact Person Card */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-3">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Contact Name</p>
                      <p className="font-medium text-foreground">{booking.contact_first_name} {booking.contact_last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Email Address</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {booking.contact_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Mobile Phone</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {booking.contact_phone}
                      </p>
                      {booking.contact_alt_phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">Alt: {booking.contact_alt_phone}</p>
                      )}
                    </div>
                    {booking.contact_method && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Preferred Contact Method</p>
                        <p className="font-medium text-foreground capitalize mt-0.5">{booking.contact_method}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Catering Staff Card */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-3">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Assigned Catering Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {eventManager || assignedStaff.length > 0 ? (
                      <div className="space-y-3">
                        {eventManager && (
                          <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl border border-border">
                            <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                              {eventManager.full_name?.charAt(0) || "M"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm truncate">{eventManager.full_name || "Event Manager"}</p>
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Event Manager</Badge>
                              {eventManager.phone && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {eventManager.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {assignedStaff.map((staff, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
                            <div className="w-9 h-9 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                              {staff.name?.charAt(0) || staff.full_name?.charAt(0) || "S"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm truncate">{staff.name || staff.full_name || "Catering Staff"}</p>
                              <p className="text-xs text-muted-foreground">{staff.role || "Staff Member"}</p>
                              {staff.phone && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {staff.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 px-3 bg-muted/20 rounded-xl border border-dashed border-border">
                        <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Staff and Event Manager will be assigned and displayed closer to your event date.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </TabsContent>

          {/* TAB 2: FINANCIALS & PAYMENTS */}
          <TabsContent value="financials" className="space-y-6">
            
            {/* Where the money stands, and what to do about it */}
            <AmountSummary
              rows={[
                { label: "Total cost", value: formatCurrency(grandTotal), strong: true },
                {
                  label: "Amount paid",
                  value: formatCurrency(displayPaid),
                  tone: displayPaid > 0 ? "success" : undefined,
                  negative: displayPaid > 0,
                  hint: `${bookingPayments.filter((p) => p.status === "approved").length} payment(s) received`,
                },
              ]}
              headline={{
                label: isFullyPaid ? "Paid in full" : "Remaining balance",
                value: formatCurrency(outstandingAmount),
                hint: isFullyPaid
                  ? "Nothing else is due for this booking."
                  : "Due before your event setup.",
                tone: isFullyPaid ? "success" : "warning",
              }}
              action={
                outstandingAmount > 0 ? (
                  <Button
                    onClick={() => {
                      const activePayment = pendingPayments[0] || { amount: outstandingAmount, payment_type: "balance" };
                      startPayment({ ...activePayment, amount: Math.min(activePayment.amount || outstandingAmount, outstandingAmount) });
                    }}
                    disabled={payingPaymentId !== null}
                    className={cn("w-full sm:w-auto", ACTION_PAY)}
                  >
                    <CreditCard className="h-4 w-4" />
                    {payingPaymentId ? "Opening checkout…" : "Pay now"}
                  </Button>
                ) : null
              }
            />

            {/* Price Breakdown Card & Transaction Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Itemized Price Breakdown (1 col) */}
              <Card className="border-border shadow-xs lg:col-span-1">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-base font-serif flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Itemized Billing Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  {/* pkgLabelText spells out the per-head maths so the base
                      figure never looks like it came from nowhere. */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-muted-foreground">{pkgLabelText}</span>
                    <span className="shrink-0 font-sans font-medium tabular-nums text-foreground">{formatCurrency(basePackageSubtotal)}</span>
                  </div>

                  {booking.service_items && booking.service_items.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Add-on services ({booking.service_items.length})</span>
                      <span className="shrink-0 font-sans font-medium tabular-nums text-foreground">
                        {formatCurrency(serviceItemsSubtotal)}
                      </span>
                    </div>
                  )}

                  {booking.additional_charges && booking.additional_charges.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Additional fees</span>
                      <span className="shrink-0 font-sans font-medium tabular-nums text-foreground">
                        {formatCurrency(additionalChargesSubtotal)}
                      </span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="shrink-0 font-sans font-medium tabular-nums text-emerald-700">− {formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">Total cost</span>
                    <span className="shrink-0 font-sans text-lg font-bold tabular-nums text-foreground">{formatCurrency(grandTotal)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Amount paid</span>
                    <span className="shrink-0 font-sans font-medium tabular-nums text-emerald-700">− {formatCurrency(displayPaid)}</span>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">
                      {outstandingAmount > 0 ? "Remaining balance" : "Paid in full"}
                    </span>
                    <span className={`shrink-0 font-sans font-bold tabular-nums ${outstandingAmount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {formatCurrency(outstandingAmount)}
                    </span>
                  </div>

                  {/* The stored total is authoritative and may already include
                      adjustments (added guests, upgrades, admin edits) that
                      aren't itemised above. Say so instead of leaving the
                      customer to wonder why the lines don't sum. */}
                  <p className="pt-3 border-t border-border text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">About the final total:</span>{" "}
                    The final total may include pricing adjustments, discounts, service fees, or
                    other applicable charges that are not shown as separate line items.
                  </p>
                </CardContent>
              </Card>

              {/* Transactions Table (2 cols) */}
              <Card className="border-border shadow-xs lg:col-span-2">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="text-base font-serif flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Payment Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {paymentLoading ? (
                    <div className="py-8 text-center text-muted-foreground animate-pulse text-sm">Loading payments...</div>
                  ) : (
                    <CustomerPaymentsTable payments={bookingPayments} formatCurrency={formatCurrency} />
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TAB 3: STATUS & TIMELINE — booking & payment lifecycle */}
          <TabsContent value="timeline" className="space-y-6">
            {/* Everything that has happened to the booking itself. Version
                changes live in Revisions & History, not here. */}
            <Card className="border-border shadow-xs">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Activity
                </CardTitle>
                <CardDescription>
                  Booking and payment events, newest first.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <BookingHistoryTimeline booking={booking} payments={bookingPayments} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Event Progress Step Tracker (2 cols) */}
              <Card className="border-border shadow-xs lg:col-span-2">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Event Execution Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {steps.map((step, idx) => (
                      <div key={idx} className="relative flex items-start gap-4 group">
                        <div 
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 absolute -left-6 sm:-left-8 top-0 z-10 transition-colors ${
                            step.completed 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {step.completed ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className={`font-semibold text-sm ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </h4>
                            <Badge variant="outline" className={`text-[10px] font-normal ${step.completed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                              {step.date}
                            </Badge>
                          </div>
                          {step.desc && (
                            <p className="text-xs text-muted-foreground">{step.desc}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ocular Inspection Widget (1 col) */}
              <div className="space-y-6">
                <Card className="border-border shadow-xs">
                  <CardHeader className="border-b border-border pb-3">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <CalendarRange className="w-4 h-4 text-primary" />
                      Venue Ocular Inspection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {booking.ocular_visit && booking.ocular_visit.status === "scheduled" && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-900 text-sm">Scheduled Visit</span>
                          <Badge className="bg-emerald-600 text-white text-[10px]">Scheduled</Badge>
                        </div>
                        <p className="text-sm font-semibold text-emerald-950 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-700" />
                          {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()}
                        </p>
                        {booking.ocular_visit.scheduled_time && (
                          <p className="text-xs text-emerald-800 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-emerald-700" />
                            {booking.ocular_visit.scheduled_time}
                          </p>
                        )}
                      </div>
                    )}

                    {pendingOcular && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-900 text-sm">Request Sent</span>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">Awaiting Confirmation</Badge>
                        </div>
                        <p className="text-xs text-blue-800">Your requested ocular visit date is under review by admin.</p>
                        <p className="text-xs font-semibold text-blue-900">
                          Date: {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {booking.ocular_visit && booking.ocular_visit.status === "completed" && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-sm">Inspection Done</span>
                          <Badge className="bg-slate-800 text-white text-[10px]">Completed</Badge>
                        </div>
                        <p className="text-xs text-slate-700">The venue layout and logistics have been verified.</p>
                      </div>
                    )}

                    {needsOcular && (
                      <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-3">
                        <CalendarRange className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-xs">Schedule Venue Ocular Visit</p>
                          <p className="text-[11px] text-muted-foreground">
                            Inspect venue layout & setup requirements with our team before your event.
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setRequestingOcular(true)}
                          className="w-full text-xs font-medium border-primary/30 text-primary hover:bg-primary/5"
                        >
                          Request Ocular Visit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* TAB 4: REVISIONS & HISTORY — what changed between versions */}
          <TabsContent value="revisions" className="space-y-6">
            <Card className="border-border shadow-xs">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base font-serif flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Revisions & History
                </CardTitle>
                <CardDescription>
                  What changed between versions of this booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <BookingVersionHistory booking={booking} />
              </CardContent>
            </Card>

            {/* Full audit view of every confirmed revision */}
            <Card className="border-border shadow-xs p-6">
              <BookingRevisionHistory booking={booking} />
            </Card>

            {/* §6 — a pointer to the quotation this booking came from, not a
                copy of its history. The quotation keeps its own versions. */}
            {sourceQuotation && (
              <Card className="border-border shadow-xs">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-semibold text-foreground">Source quotation</p>
                    <p className="mt-0.5 font-sans text-sm text-muted-foreground">
                      <span className="tabular-nums">
                        {sourceQuotation.quotation.quotation_number || "Quotation"} · Version{" "}
                        {Number(sourceQuotation.quotation.version_number) || 1}.0
                      </span>
                      {sourceQuotation.quotation.status === "Accepted" &&
                        sourceQuotation.quotation.updatedAt && (
                          <> · Accepted {formatShortDate(sourceQuotation.quotation.updatedAt)}</>
                        )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => navigate("/customer/inquiries")}
                  >
                    <FileText className="h-4 w-4" /> View quotation
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>

        {/* Modal: Revision Proposal Review */}
        <RevisionProposalModal
          open={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          booking={booking}
          onAccept={handleAcceptRevision}
          onReject={handleRejectRevision}
          isCustomer={true}
        />
      </div>

      {/* Add Guests Dialog */}
      <Dialog open={addingGuests} onOpenChange={setAddingGuests}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitAddGuests}>
            <DialogHeader>
              <DialogTitle>Add Guests</DialogTitle>
              <DialogDescription className="pt-2">
                You currently have <strong className="text-foreground">{booking?.guest_count}</strong> guests.
                Adding more guests costs <strong className="text-foreground">₱500 per head</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="additional-guests">
                  Additional Guests to Add
                </label>
                <Input
                  id="additional-guests"
                  type="number"
                  min="1"
                  value={additionalGuests}
                  onChange={(e) => setAdditionalGuests(Number(e.target.value))}
                />
              </div>
              
              {additionalGuests > 0 && (
                <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg border border-accent/20 text-sm">
                  <strong className="font-semibold">Amount Due: </strong> {formatCurrency(additionalGuests * 500)}
                </div>
              )}

              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Guest additions are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddingGuests(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingGuests || additionalGuests <= 0 || !canModifyBooking}>
                {isSubmittingGuests ? "Processing..." : "Pay Difference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Package Dialog */}
      <Dialog open={upgrading} onOpenChange={setUpgrading}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitUpgrade}>
            <DialogHeader>
              <DialogTitle>Upgrade Package</DialogTitle>
              <DialogDescription className="pt-2">
                Current Package: <strong className="text-foreground">{booking?.package_id?.name || "Custom"}</strong>. 
                Select a new package to upgrade to.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Select New Package
                </label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Choose a Package --" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.name} ({formatCurrency(pkg.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Upgrades are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpgrading(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingUpgrade || !selectedPackageId || !canModifyBooking}>
                {isSubmittingUpgrade ? "Processing..." : "Pay Difference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request / Propose Booking Changes Dialog */}
      <Dialog open={requestingChange} onOpenChange={setRequestingChange}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={submitChangeRequest}>
            <DialogHeader>
              <DialogTitle>Propose Booking Changes</DialogTitle>
              <DialogDescription className="pt-1 text-xs">
                Select your desired changes or describe modifications for admin review.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Event Date (Optional)</label>
                  <Input 
                    type="date" 
                    value={changeFields.event_date} 
                    onChange={(e) => setChangeFields({ ...changeFields, event_date: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Start Time (Optional)</label>
                  <Input 
                    type="time" 
                    value={changeFields.start_time} 
                    onChange={(e) => setChangeFields({ ...changeFields, start_time: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Guest Count (Optional)</label>
                  <Input 
                    type="number" 
                    placeholder={`Current: ${booking?.guest_count || 0}`}
                    value={changeFields.guest_count} 
                    onChange={(e) => setChangeFields({ ...changeFields, guest_count: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Venue Location (Optional)</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Garden Hall"
                    value={changeFields.venue_type} 
                    onChange={(e) => setChangeFields({ ...changeFields, venue_type: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block" htmlFor="booking-change-request">
                  Change Note / Reason
                </label>
                <textarea
                  id="booking-change-request"
                  className="flex min-h-[90px] w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={4}
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="Describe your change request (e.g. Adding 20 guests and changing start time to 3 PM)..."
                />
              </div>

              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Booking changes are locked within 3 days of the event.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestingChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingRequest || !canModifyBooking} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                {isSubmittingRequest ? "Sending Proposal..." : "Submit Revision Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Ocular Dialog */}
      <Dialog open={requestingOcular} onOpenChange={setRequestingOcular}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitOcularRequest}>
            <DialogHeader>
              <DialogTitle>Schedule Ocular Visit</DialogTitle>
              <DialogDescription className="pt-2">
                Pick a date and time to physically inspect the venue layout with our team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Date</label>
                <Input 
                  type="date" 
                  value={ocularDate} 
                  onChange={(e) => setOcularDate(e.target.value)} 
                  required 
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Time (Optional)</label>
                <Input 
                  type="time" 
                  value={ocularTime} 
                  onChange={(e) => setOcularTime(e.target.value)} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestingOcular(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingOcular}>
                {isSubmittingOcular ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </CustomerDashboardLayout>
  );
}
