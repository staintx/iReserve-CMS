import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { ChevronLeft, Check, Clock, AlertCircle, Settings, CalendarRange, Users, ArrowUpCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import useToast from "../../hooks/useToast";
import { Badge } from "../../components/ui/badge";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

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
  const [searchParams] = useSearchParams();

  const [requestingChange, setRequestingChange] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [requestingOcular, setRequestingOcular] = useState(false);
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

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
    return payments.filter((p) => p.booking_id?._id === booking._id || p.booking_id === booking._id);
  }, [booking, payments]);

  const paymentStatus = searchParams.get("status");

  const totalPaid = useMemo(
    () => bookingPayments.filter((p) => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [bookingPayments]
  );

  const pendingPayments = useMemo(
    () => bookingPayments.filter((p) => p.status === "pending"),
    [bookingPayments]
  );

  const outstandingAmount = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [pendingPayments]
  );

  const fetchPayments = async () => {
    setPaymentLoading(true);
    try {
      const pRes = await CustomerAPI.getPayments();
      const filtered = pRes.data.filter((p) => p.booking_id?._id === id || p.booking_id === id);
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

  useEffect(() => {
    fetchBooking();
    fetchPayments();
    CustomerAPI.getPackages().then((res) => setPackages(res.data)).catch(() => setPackages([]));
  }, [id]);

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

  if (loading) {
    return (
      <CustomerDashboardLayout title="Event Dashboard">
        <div className="p-8 text-center text-muted-foreground animate-pulse">Loading event details...</div>
      </CustomerDashboardLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerDashboardLayout title="Event Dashboard">
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Booking not found.</p>
          <Button variant="link" onClick={() => navigate("/customer/bookings")} className="text-primary hover:underline">
            Return to Bookings
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const steps = booking.payment_method === "cod" ? [
    { 
      label: "Order Placed", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString()
    },
    {
      label: "Preparing Order",
      completed: ["preparing", "ongoing", "completed"].includes(booking.status),
      date: ["preparing", "ongoing", "completed"].includes(booking.status) ? "In Progress" : "Pending"
    },
    { 
      label: "Out for Delivery & COD", 
      completed: booking.status === "completed",
      date: booking.status === "completed" ? "Completed" : "Upon Delivery"
    },
  ] : [
    { 
      label: "Reservation Submitted", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString()
    },
    { 
      label: "Deposit Paid", 
      completed: !["pending deposit", "cancelled"].includes(booking.status) && booking.payment_status !== "pending", 
      date: booking.payment_status === "paid" || booking.payment_status === "partially paid" ? "Completed" : "Pending"
    },
    { 
      label: "Final Payment", 
      completed: booking.payment_status === "paid",
      date: booking.payment_status === "paid" ? "Completed" : "Due before event"
    },
    { 
      label: "Event Completed", 
      completed: booking.status === "completed",
      date: booking.status === "completed" ? "Completed" : "Upcoming"
    },
  ];

  const assignedStaff = booking.staff_ids || [];
  const eventManager = booking.event_manager_id;
  const isCustomOrSetup = booking.service_type !== "Food Only" && booking.service_type !== "food";
  const needsOcular = isCustomOrSetup && (!booking.ocular_visit || !booking.ocular_visit.status);
  const pendingOcular = booking.ocular_visit && booking.ocular_visit.status === "requested";

  return (
    <CustomerDashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost"
            onClick={() => navigate("/customer/bookings")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors -ml-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Events
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl text-foreground mb-2">Event Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Reference No: <span className="font-mono font-medium text-foreground bg-muted px-2 py-0.5 rounded">{booking.reference || booking._id.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="border-border">
            <CardHeader className="border-b border-border pb-4 mb-4">
              <CardTitle className="text-xl font-serif">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border p-4 bg-card">
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-foreground">₱{totalPaid.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-border p-4 bg-card">
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-foreground">₱{outstandingAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-border p-4 bg-card">
                  <p className="text-sm font-medium text-muted-foreground">Payments Recorded</p>
                  <p className="text-2xl font-bold text-foreground">{bookingPayments.length}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {paymentLoading ? (
                  <div className="text-muted-foreground">Loading payment details...</div>
                ) : pendingPayments.length > 0 ? (
                  pendingPayments.map((payment) => (
                    <div key={payment._id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{payment.payment_type || "Pending Payment"}</p>
                        <p className="text-sm text-muted-foreground">Amount due: ₱{Number(payment.amount || 0).toLocaleString()}</p>
                      </div>
                      <Button onClick={() => startPayment(payment)} disabled={payingPaymentId === payment._id}>
                        {payingPaymentId === payment._id ? "Opening..." : "Pay Now"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-muted/50 bg-muted/10 p-4 text-sm text-muted-foreground">
                    No outstanding payments are currently due for this booking.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="border-b border-border pb-4 mb-4">
              <CardTitle className="text-xl font-serif">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentLoading ? (
                <div className="text-muted-foreground">Loading transaction history...</div>
              ) : (
                <CustomerPaymentsTable payments={bookingPayments} formatCurrency={(value) => `₱${Number(value || 0).toLocaleString()}`} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Action Buttons Panel */}
            {!['completed', 'cancelled', 'refunded'].includes(booking.status) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" onClick={() => setAddingGuests(true)}>
                  <Users className="w-5 h-5 text-blue-500" />
                  <div className="text-center">
                    <div className="font-medium">Add Guests</div>
                    <div className="text-xs text-muted-foreground">₱500 per head</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" onClick={() => setUpgrading(true)}>
                  <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
                  <div className="text-center">
                    <div className="font-medium">Upgrade Package</div>
                    <div className="text-xs text-muted-foreground">Select a new tier</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" onClick={() => setRequestingChange(true)}>
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  <div className="text-center">
                    <div className="font-medium">Request Change</div>
                    <div className="text-xs text-muted-foreground">Modifications & Requests</div>
                  </div>
                </Button>
              </div>
            )}

            {/* Reservation Summary */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4 mb-4">
                <CardTitle className="text-xl font-serif">
                  {isCustomOrSetup ? "Reservation Summary" : "Order Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Package</p>
                    <p className="font-medium text-foreground">{booking.package_id?.name || "Custom Build"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Event Type</p>
                    <p className="font-medium text-foreground">{booking.event_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Date</p>
                    <p className="font-medium text-foreground">{booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Time</p>
                    <p className="font-medium text-foreground">{booking.start_time || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Venue</p>
                    <p className="font-medium text-foreground">{booking.venue_type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Location</p>
                    <p className="font-medium text-foreground">{booking.barangay}, {booking.municipality}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-xs">Expected Guests</p>
                    <p className="font-medium text-foreground">{booking.guest_count} pax</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Staff */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4 mb-4">
                <CardTitle className="text-xl font-serif">Assigned Staff</CardTitle>
              </CardHeader>
              <CardContent>
                {eventManager || assignedStaff.length > 0 ? (
                  <div className="space-y-4">
                    {eventManager && (
                      <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border">
                        <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-lg">
                          {eventManager.full_name?.charAt(0) || "M"}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{eventManager.full_name || "Event Manager"}</p>
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Event Manager</p>
                        </div>
                      </div>
                    )}
                    {assignedStaff.map((staff, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
                        <div className="w-10 h-10 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-bold">
                          {staff.full_name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{staff.full_name || "Staff Member"}</p>
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Staff</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">Staff will be assigned closer to your event date.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar / Tracker */}
          <div className="lg:col-span-1 space-y-8">
            {/* Status Tracker */}
            <Card className="bg-primary text-primary-foreground border-none">
              <CardHeader className="border-b border-primary-foreground/20 pb-4 mb-6">
                <CardTitle className="text-xl font-serif">Event Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary-foreground/30 before:to-transparent">
                  {steps.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-4 border-primary ${step.completed ? 'bg-accent text-accent-foreground' : 'bg-primary-foreground/20 text-primary-foreground/50'}`}>
                        {step.completed ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className={`font-medium ${step.completed ? 'text-primary-foreground' : 'text-primary-foreground/50'}`}>{step.label}</h4>
                        <p className="text-xs text-primary-foreground/70 mt-0.5">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Ocular Visit Widget */}
            {booking.ocular_visit && booking.ocular_visit.status === "scheduled" && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <h3 className="font-semibold text-emerald-800 mb-0 text-sm uppercase tracking-wider">Ocular Visit</h3>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Scheduled</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/60 p-4 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3 mb-1">
                      <CalendarRange className="w-4 h-4 text-emerald-600" />
                      <p className="font-semibold text-emerald-900">{new Date(booking.ocular_visit.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-700">{booking.ocular_visit.time || "Any time"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {pendingOcular && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <h3 className="font-semibold text-blue-800 mb-0 text-sm uppercase tracking-wider">Ocular Visit</h3>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Pending</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-800 mb-3">Your request is being reviewed by the admin.</p>
                  <div className="bg-white/60 p-3 rounded-lg border border-blue-100 text-sm">
                    <strong>Requested:</strong> {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            )}

            {needsOcular && (
              <Card className="border-border shadow-sm border-dashed">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-foreground mb-0 text-sm uppercase tracking-wider">Ocular Visit</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your booking includes a physical ocular visit to inspect the venue before the event. Please schedule this at your earliest convenience.
                  </p>
                  <Button variant="default" className="w-full" onClick={() => setRequestingOcular(true)}>
                    Schedule Ocular Visit
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add Guests Dialog */}
      <Dialog open={addingGuests} onOpenChange={setAddingGuests}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitAddGuests}>
            <DialogHeader>
              <DialogTitle>Add Guests</DialogTitle>
              <DialogDescription className="pt-2">
                You currently have <strong className="text-foreground">{booking?.guest_count}</strong> guests.
                Adding more guests costs <strong className="text-foreground">₱500 per head</strong>. This will generate a payment link for the difference.
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
                <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg border border-accent/20">
                  <strong className="font-semibold">Amount Due: </strong> ₱{(additionalGuests * 500).toLocaleString()}
                </div>
              )}

              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
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
                Select a new package to upgrade to. You will be redirected to pay the price difference.
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
                        {pkg.name} (₱{Number(pkg.price).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
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
              <DialogTitle>Request booking change</DialogTitle>
              <DialogDescription className="pt-2">
                Describe the booking details you want changed. 
                <strong className="text-foreground block mt-1">Note: Sensitive actions such as Date Change, Venue Change, Downgrades, or Full Cancellations require Admin approval.</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="booking-change-request">
                  Change request
                </label>
                <textarea
                  id="booking-change-request"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={6}
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="Example: Please update the guest count to 80 and move the venue to..."
                />
              </div>
              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Booking information changes are locked within 3 days of the event.
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
                Pick a date and time to physically inspect the venue with our team.
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
