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
  ChevronRight
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

  const [payments, setPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [searchParams] = useSearchParams();

  const [requestingChange, setRequestingChange] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [requestingOcular, setRequestingOcular] = useState(false);
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);

  useEffect(() => {
    fetchBooking();
    fetchPayments();
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

  const grandTotal = Number(booking?.total_price || 0);
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

  const submitChangeRequest = async (event) => {
    event.preventDefault();
    const nextMessage = requestNote.trim();
    if (!nextMessage) {
      notify("Please describe the changes you want to request.", "error");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      await CustomerAPI.requestBookingChange(booking._id, { message: nextMessage });
      notify("Your change request was sent to the admin.", "success");
      setRequestingChange(false);
      setRequestNote("");
      fetchBooking();
    } catch (error) {
      notify(error.response?.data?.message || "We could not send your change request.", "error");
    } finally {
      setIsSubmittingRequest(false);
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

          <Badge className={`px-3 py-1 text-xs rounded-full shadow-xs ${statusBadge.variant}`}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Hero Banner Card */}
        <div className="rounded-3xl border border-border bg-card shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif font-bold text-2xl sm:text-3xl text-foreground">
                  {booking.event_type || "Catering Event"}
                </h1>
                
                <div 
                  onClick={copyReferenceCode}
                  className="inline-flex items-center gap-1.5 bg-muted/80 hover:bg-muted text-foreground px-3 py-1 rounded-full text-xs font-mono cursor-pointer transition-colors border border-border"
                  title="Click to copy reference code"
                >
                  <span>{refCode}</span>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">
                    {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date TBD"}
                  </span>
                  {booking.start_time && (
                    <span className="text-muted-foreground">@ {booking.start_time}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{booking.guest_count || 0} Guests</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{booking.service_type || "Food & Setup"}</span>
                </div>
              </div>
            </div>

            {/* Hero Quick Financial Summary Pill & Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
              <div className="text-left lg:text-right">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Grand Total</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">{formatCurrency(grandTotal)}</p>
                <p className="text-xs font-medium mt-0.5">
                  {isFullyPaid ? (
                    <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Balance Due: {formatCurrency(outstandingAmount)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={handleOpenChat}
                disabled={isOpeningChat}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {isOpeningChat ? "Opening Chat..." : "Chat with Caterer"}
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

        {/* Change Request Alert Notification Banner */}
        {booking.change_request && booking.change_request.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">Change Request Under Admin Review</h4>
              <p className="text-amber-800 text-xs mt-0.5">"{booking.change_request.message}"</p>
              <p className="text-amber-700 text-[11px] mt-1 font-mono">
                Submitted on {booking.change_request.requested_at ? new Date(booking.change_request.requested_at).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>
        )}

        {/* Main Tabbed Interface */}
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <TabsList className="bg-card border border-border p-1 rounded-2xl w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-auto gap-1">
            <TabsTrigger value="overview" className="rounded-xl px-5 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Utensils className="w-4 h-4 mr-2 hidden sm:inline" />
              Reservation Overview
            </TabsTrigger>
            <TabsTrigger value="financials" className="rounded-xl px-5 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <CreditCard className="w-4 h-4 mr-2 hidden sm:inline" />
              Payments & Billing
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-xl px-5 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              <Clock className="w-4 h-4 mr-2 hidden sm:inline" />
              Status & Timeline
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
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">Package Name</p>
                        <p className="font-semibold text-foreground">{booking.package_id?.name || "Custom Catering Build"}</p>
                        {booking.package_id?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{booking.package_id.description}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">Event Type / Theme</p>
                        <p className="font-semibold text-foreground">
                          {booking.event_type} {booking.event_theme ? `(${booking.event_theme})` : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">Date & Time</p>
                        <p className="font-semibold text-foreground">
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : "TBD"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Start Time: {booking.start_time || "Not specified"}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">Expected Guests</p>
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
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">Venue / Setup Type</p>
                        <p className="font-semibold text-foreground">{booking.venue_type || "Standard Venue"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">Service: {booking.service_type || "Food & Setup"}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">Location Address</p>
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
                        <h4 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-3">Selected Dishes</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {booking.menu_items.map((item, idx) => (
                            <div key={idx} className="bg-muted/40 p-3.5 rounded-xl border border-border flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground text-sm">{item.name}</p>
                                {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                                {item.price > 0 && <p className="text-xs font-semibold text-primary mt-0.5">+{formatCurrency(item.price)}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
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
                        <h4 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-3">Add-on Services & Rental Items</h4>
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
                        <h4 className="font-semibold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
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
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Contact Name</p>
                      <p className="font-medium text-foreground">{booking.contact_first_name} {booking.contact_last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Email Address</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {booking.contact_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Mobile Phone</p>
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
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Preferred Contact Method</p>
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
                              <Badge variant="outline" className="text-[10px] uppercase bg-primary/10 text-primary border-primary/20">Event Manager</Badge>
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
                              <p className="text-[10px] text-muted-foreground uppercase font-mono">{staff.role || "Staff Member"}</p>
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
            
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border shadow-xs bg-card">
                <CardContent className="p-5">
                  <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Grand Total Price</p>
                  <p className="text-2xl font-bold font-serif text-foreground mt-1">{formatCurrency(grandTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Package & add-on total</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50 shadow-xs">
                <CardContent className="p-5">
                  <p className="text-xs uppercase font-semibold tracking-wider text-emerald-800">Total Approved Paid</p>
                  <p className="text-2xl font-bold font-serif text-emerald-900 mt-1">{formatCurrency(displayPaid)}</p>
                  <p className="text-xs text-emerald-700 mt-1">{bookingPayments.filter(p => p.status === 'approved').length} payment transactions cleared</p>
                </CardContent>
              </Card>

              <Card className={`shadow-xs ${outstandingAmount > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                <CardContent className="p-5">
                  <p className={`text-xs uppercase font-semibold tracking-wider ${outstandingAmount > 0 ? 'text-amber-800' : 'text-slate-700'}`}>Outstanding Balance</p>
                  <p className={`text-2xl font-bold font-serif mt-1 ${outstandingAmount > 0 ? 'text-amber-900' : 'text-slate-800'}`}>{formatCurrency(outstandingAmount)}</p>
                  <p className={`text-xs mt-1 ${outstandingAmount > 0 ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                    {outstandingAmount > 0 ? "Pending payment due" : "No balance due"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Payments Action Card */}
            {pendingPayments.length > 0 && (
              <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-amber-900 text-base flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                        Outstanding Payment Due
                      </h4>
                      <p className="text-xs text-amber-800">
                        You have pending payment request(s) ready to be paid via PayMongo online checkout.
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      {pendingPayments.map((payment) => (
                        <Button 
                          key={payment._id}
                          onClick={() => startPayment(payment)}
                          disabled={payingPaymentId === payment._id}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-xs gap-2 shrink-0"
                        >
                          <CreditCard className="w-4 h-4" />
                          {payingPaymentId === payment._id ? "Opening Checkout..." : `Pay ${formatCurrency(payment.amount)}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Base Package Price</span>
                    <span className="font-medium text-foreground">{formatCurrency(booking.package_id?.price || booking.total_price)}</span>
                  </div>

                  {booking.guest_count > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Guests ({booking.guest_count} pax)</span>
                      <span className="font-medium text-foreground">Included</span>
                    </div>
                  )}

                  {booking.service_items && booking.service_items.length > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Add-on Services ({booking.service_items.length})</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(booking.service_items.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0))}
                      </span>
                    </div>
                  )}

                  {booking.additional_charges && booking.additional_charges.length > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Additional Fees</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(booking.additional_charges.reduce((s, c) => s + (Number(c.amount) || 0), 0))}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex items-center justify-between font-bold text-foreground">
                    <span>Grand Total</span>
                    <span className="text-primary font-serif text-lg">{formatCurrency(grandTotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                    <span>Total Payments Approved</span>
                    <span>- {formatCurrency(displayPaid)}</span>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between font-bold text-sm">
                    <span className={outstandingAmount > 0 ? "text-amber-800" : "text-emerald-700"}>Remaining Balance</span>
                    <span className={outstandingAmount > 0 ? "text-amber-900" : "text-emerald-700"}>{formatCurrency(outstandingAmount)}</span>
                  </div>
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

          {/* TAB 3: STATUS & TIMELINE */}
          <TabsContent value="timeline" className="space-y-6">
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
                          <span className="font-semibold text-emerald-900 text-xs uppercase tracking-wider">Scheduled Visit</span>
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
                          <span className="font-semibold text-blue-900 text-xs uppercase tracking-wider">Request Sent</span>
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
                          <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Inspection Done</span>
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

        </Tabs>
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

      {/* Request Change Dialog */}
      <Dialog open={requestingChange} onOpenChange={setRequestingChange}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={submitChangeRequest}>
            <DialogHeader>
              <DialogTitle>Request Booking Changes</DialogTitle>
              <DialogDescription className="pt-2">
                Describe the modifications you would like to make.
                <strong className="text-foreground block mt-1">
                  Note: Sensitive modifications (Date, Venue, Downgrades, Cancellations) require admin approval.
                </strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="booking-change-request">
                  Change Details
                </label>
                <textarea
                  id="booking-change-request"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={6}
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="Example: Please change guest count to 80 and update start time to 2:00 PM..."
                />
              </div>
              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Booking changes are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestingChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingRequest || !canModifyBooking}>
                {isSubmittingRequest ? "Sending..." : "Send Request"}
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
