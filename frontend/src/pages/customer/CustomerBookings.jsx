import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import BookingCard from "../../components/booking/BookingCard";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  CalendarClock, 
  Plus, 
  AlertCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Sparkles,
  RefreshCw,
  Clock,
  History
} from "lucide-react";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function CustomerBookings() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  // Dialog States
  const [requestingBooking, setRequestingBooking] = useState(null);
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [addingGuestsBooking, setAddingGuestsBooking] = useState(null);
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [isSubmittingGuests, setIsSubmittingGuests] = useState(false);

  const [upgradingBooking, setUpgradingBooking] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, pRes, pkgRes] = await Promise.all([
        CustomerAPI.getBookings(),
        CustomerAPI.getPayments(),
        CustomerAPI.getPackages()
      ]);
      setBookings(bRes.data || []);
      setPayments(pRes.data || []);
      setPackages(pkgRes.data || []);
    } catch (err) {
      notify("Failed to load booking details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute KPI counts
  const kpiStats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => ["Confirmed", "confirmed", "Converted to Booking"].includes(b.status)).length;
    const depositNeeded = bookings.filter((b) => ["Deposit Pending", "pending deposit"].includes(b.status)).length;
    const completed = bookings.filter((b) => ["Completed", "completed"].includes(b.status)).length;

    return { total, confirmed, depositNeeded, completed };
  }, [bookings]);

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const rawStatus = (b.status || "").toLowerCase();

      // 1. Status Filter
      if (statusTab === "confirmed" && !["confirmed", "converted to booking"].includes(rawStatus)) return false;
      if (statusTab === "deposit_needed" && !["deposit pending", "pending deposit"].includes(rawStatus)) return false;
      if (statusTab === "completed" && !["completed"].includes(rawStatus)) return false;
      if (statusTab === "cancelled" && !["cancelled"].includes(rawStatus)) return false;

      // 2. Service Type Filter
      if (serviceTypeFilter !== "all") {
        const st = b.service_type || (
          b.event_type?.toLowerCase().includes("food delivery") || b.delivery_method !== "setup" ? "Food Only" :
          !b.include_food ? "Event Setup Only" : "Food and Event Setup"
        );
        if (st !== serviceTypeFilter) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (b.reference || b._id || "").toLowerCase();
        const type = (b.event_type || "").toLowerCase();
        const name = `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.toLowerCase();

        return ref.includes(q) || type.includes(q) || name.includes(q);
      }

      return true;
    });
  }, [bookings, statusTab, serviceTypeFilter, searchQuery]);

  // Payment Checkout Action
  const startPayment = async (booking, isBalance = false) => {
    if (!booking?._id) return;

    let amount = Number(booking.total_price || 0);
    if (isBalance) {
      const rawPaid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && p.status === "approved")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const total = Number(booking.total_price || 0);
      const paid = total > 0 ? Math.min(rawPaid, total) : rawPaid;
      amount = Math.max(0, total - paid);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      notify("This booking does not have a valid payable amount yet.", "error");
      return;
    }

    try {
      notify("Generating checkout session for payment...", "info");
      const res = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount,
        payment_type: isBalance ? "balance" : "deposit"
      });

      if (res.data?.checkout_url) {
        window.location.assign(res.data.checkout_url);
      } else {
        notify("Could not generate checkout session.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start payment checkout.", "error");
    }
  };

  // Add Guests Handler
  const submitAddGuests = async (event, directBooking = null, directGuests = 0) => {
    if (event) event.preventDefault();
    
    const targetBooking = directBooking || addingGuestsBooking;
    const targetGuests = directGuests > 0 ? directGuests : additionalGuests;
    
    if (!targetBooking) return;
    if (targetGuests <= 0) {
      notify("Please enter a valid number of guests to add.", "error");
      return;
    }

    try {
      setIsSubmittingGuests(true);
      const response = await CustomerAPI.addGuests(targetBooking._id, { additional_guests: targetGuests });
      
      notify("Guests added successfully. Redirecting to payment...", "success");
      
      if (response.data?.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        setAddingGuestsBooking(null);
        setAdditionalGuests(0);
        loadData();
      }
    } catch (error) {
      notify(error.response?.data?.message || "We could not add guests. Please try again.", "error");
    } finally {
      setIsSubmittingGuests(false);
    }
  };

  // Upgrade Package Handler
  const submitUpgrade = async (event) => {
    event.preventDefault();
    if (!upgradingBooking) return;
    if (!selectedPackageId) {
      notify("Please select a package to upgrade to.", "error");
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      const response = await CustomerAPI.upgradeBooking(upgradingBooking._id, { new_package_id: selectedPackageId });
      
      notify("Package upgraded! Redirecting to payment...", "success");
      
      if (response.data?.checkout_url) {
        window.location.assign(response.data.checkout_url);
      }
    } catch (error) {
      notify(error.response?.data?.message || "Could not upgrade package.", "error");
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  // Submit Change Request Handler
  const submitChangeRequest = async (event) => {
    event.preventDefault();
    if (!requestingBooking) return;

    const nextMessage = requestNote.trim();
    if (!nextMessage) {
      notify("Please describe the changes you want to request.", "error");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const response = await CustomerAPI.requestBookingChange(requestingBooking._id, { message: nextMessage });
      setBookings((prev) => prev.map((b) => (b._id === response.data._id ? response.data : b)));
      notify("Your change request was sent to the admin team.", "success");
      setRequestingBooking(null);
      setRequestNote("");
    } catch (error) {
      notify(error.response?.data?.message || "We could not send your change request.", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <CustomerDashboardLayout
      title="My Bookings"
      subtitle="Manage your event reservations, track payment balances, and coordinate event arrangements"
    >
      {/* Top Banner & KPI Stat Cards */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight mb-1 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-400" /> Event Reservations
            </h2>
            <p className="text-xs text-slate-300">
              View your confirmed catering reservations, track remaining balances, and manage your event details.
            </p>
          </div>
          
          <Button 
            onClick={() => navigate("/customer/book", { state: { resetWizard: true } })} 
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Book an Event
          </Button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Total Bookings</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpiStats.total}</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Confirmed & Reserved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{kpiStats.confirmed}</div>
          </div>

          <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-colors ${
            kpiStats.depositNeeded > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-2 text-amber-800">
              <span>Deposit Needed</span>
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900">{kpiStats.depositNeeded}</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span>Completed Events</span>
              <History className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpiStats.completed}</div>
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
              All Bookings ({kpiStats.total})
            </button>
            <button
              onClick={() => setStatusTab("confirmed")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "confirmed" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Confirmed ({kpiStats.confirmed})
            </button>
            <button
              onClick={() => setStatusTab("deposit_needed")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "deposit_needed" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Deposit Needed ({kpiStats.depositNeeded})
            </button>
            <button
              onClick={() => setStatusTab("completed")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusTab === "completed" ? "bg-slate-200 text-slate-800 shadow-sm" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Completed ({kpiStats.completed})
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

      {/* Bookings List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-sm font-medium">Loading your event reservations...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarClock className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No bookings found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery || statusTab !== "all" || serviceTypeFilter !== "all"
                  ? "Try clearing or adjusting your search filters above."
                  : "You don't have any confirmed bookings yet. Submit a quote request or start a new booking!"}
              </p>
              <Button 
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                className="mt-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 text-xs shadow-sm"
              >
                + Book an Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => {
            const canRequestChangeLocal = booking.event_date 
              ? new Date(booking.event_date).getTime() - Date.now() > THREE_DAYS_MS 
              : false;

            return (
              <BookingCard
                key={booking._id}
                booking={booking}
                payments={payments}
                canRequestChange={canRequestChangeLocal}
                startPayment={startPayment}
                setUpgradingBooking={setUpgradingBooking}
                openChangeRequest={() => {
                  setRequestingBooking(booking);
                  setRequestNote(booking.change_request?.message || "");
                }}
                setAddingGuestsBooking={setAddingGuestsBooking}
                openCatererChat={async () => {
                  try {
                    const conversation = await createConversation({ booking_id: booking._id });
                    navigate(`/customer/messages/${conversation._id}`);
                  } catch (error) {
                    if (error.response?.status === 400 || error.response?.status === 404) {
                      notify(error.response?.data?.message || "This booking is not ready for chat yet.", "error");
                      return;
                    }
                    notify(error.response?.data?.message || "We could not open the conversation.", "error");
                  }
                }}
                submitAddGuests={submitAddGuests}
                isSubmittingGuests={isSubmittingGuests}
                setAdditionalGuestsGlobal={setAdditionalGuests}
                onBookingUpdate={loadData}
              />
            );
          })
        )}
      </div>

      {/* Add Guests Dialog */}
      <Dialog open={!!addingGuestsBooking} onOpenChange={(open) => !open && setAddingGuestsBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitAddGuests}>
            <DialogHeader>
              <DialogTitle>Add Additional Guests</DialogTitle>
              <DialogDescription className="pt-2">
                You currently have <strong className="text-foreground">{addingGuestsBooking?.guest_count}</strong> guests booked.
                Adding more guests costs <strong className="text-foreground">₱500 per head</strong>. This will generate a payment checkout link for the difference.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="additional-guests">
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

              {addingGuestsBooking && addingGuestsBooking.event_date && (new Date(addingGuestsBooking.event_date).getTime() - Date.now() <= THREE_DAYS_MS) && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  Guest additions are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddingGuestsBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingGuests || additionalGuests <= 0 || (addingGuestsBooking?.event_date && (new Date(addingGuestsBooking.event_date).getTime() - Date.now() <= THREE_DAYS_MS))}>
                {isSubmittingGuests ? "Processing..." : "Pay Difference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Package Dialog */}
      <Dialog open={!!upgradingBooking} onOpenChange={(open) => !open && setUpgradingBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitUpgrade}>
            <DialogHeader>
              <DialogTitle>Upgrade Package</DialogTitle>
              <DialogDescription className="pt-2">
                Current Package: <strong className="text-foreground">{upgradingBooking?.package_id?.name || "Custom"}</strong>. 
                Select a new package to upgrade to. You will be redirected to pay the price difference.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
              
              {upgradingBooking && upgradingBooking.event_date && (new Date(upgradingBooking.event_date).getTime() - Date.now() <= THREE_DAYS_MS) && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  Upgrades are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpgradingBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingUpgrade || !selectedPackageId || (upgradingBooking?.event_date && (new Date(upgradingBooking.event_date).getTime() - Date.now() <= THREE_DAYS_MS))}>
                {isSubmittingUpgrade ? "Processing..." : "Pay Difference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Change Dialog */}
      <Dialog open={!!requestingBooking} onOpenChange={(open) => !open && setRequestingBooking(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={submitChangeRequest}>
            <DialogHeader>
              <DialogTitle>Request Booking Details Change</DialogTitle>
              <DialogDescription className="pt-2">
                Describe the details you want changed for this reservation. 
                <strong className="text-foreground block mt-1">Note: Sensitive actions such as Date Change, Venue Change, Downgrades, or Full Cancellations require Admin approval.</strong>
                Our team will review your request and process custom refunds or invoices if applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="booking-change-request">
                  Change Request Details
                </label>
                <textarea
                  id="booking-change-request"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={6}
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="Example: Please update our start time to 1:00 PM and change venue to..."
                />
              </div>
              {requestingBooking && requestingBooking.event_date && (new Date(requestingBooking.event_date).getTime() - Date.now() <= THREE_DAYS_MS) && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Booking information changes are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestingBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingRequest || (requestingBooking?.event_date && (new Date(requestingBooking.event_date).getTime() - Date.now() <= THREE_DAYS_MS))}>
                {isSubmittingRequest ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
