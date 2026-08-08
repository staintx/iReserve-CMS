import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import BookingCard from "../../components/booking/BookingCard";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import PortalToolbar from "../../components/customer/portal/PortalToolbar";
import EmptyState from "../../components/customer/portal/EmptyState";
import LoadingState from "../../components/customer/portal/LoadingState";
import StateNotice from "../../components/customer/portal/StateNotice";
import { bookingStatusGroup, resolveServiceType } from "../../components/customer/portal/statusMeta";
import { formatCurrency } from "../../utils/format";
import { CalendarClock, Plus, AlertCircle, CreditCard } from "lucide-react";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

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

  // Outstanding balance per booking — drives both the "needs payment" view
  // and the summary notice at the top of the list.
  const balanceOf = useMemo(() => {
    return (booking) => {
      const total = Number(booking.total_price || 0);
      const rawPaid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && p.status === "approved")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const paid = total > 0 ? Math.min(rawPaid, total) : rawPaid;
      return Math.max(0, total - paid);
    };
  }, [payments]);

  const needsPayment = useMemo(
    () => bookings.filter((b) => !["cancelled", "completed"].includes(bookingStatusGroup(b)) && balanceOf(b) > 0),
    [bookings, balanceOf]
  );

  const counts = useMemo(() => ({
    all: bookings.length,
    needs_payment: needsPayment.length,
    confirmed: bookings.filter((b) => bookingStatusGroup(b) === "confirmed").length,
    completed: bookings.filter((b) => bookingStatusGroup(b) === "completed").length,
    cancelled: bookings.filter((b) => bookingStatusGroup(b) === "cancelled").length,
  }), [bookings, needsPayment]);

  const amountDue = useMemo(
    () => needsPayment.reduce((sum, b) => sum + balanceOf(b), 0),
    [needsPayment, balanceOf]
  );

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Status Filter
      if (statusTab === "needs_payment") {
        if (["cancelled", "completed"].includes(bookingStatusGroup(b)) || balanceOf(b) <= 0) return false;
      } else if (statusTab !== "all" && bookingStatusGroup(b) !== statusTab) {
        return false;
      }

      // 2. Service Type Filter
      if (serviceTypeFilter !== "all" && resolveServiceType(b) !== serviceTypeFilter) return false;

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
  }, [bookings, statusTab, serviceTypeFilter, searchQuery, balanceOf]);

  const isFiltered = Boolean(searchQuery.trim()) || statusTab !== "all" || serviceTypeFilter !== "all";

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
      subtitle="Track your reserved events, payments, and what to do next."
      actions={
        <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>
          <Plus className="h-4 w-4" /> Book an event
        </Button>
      }
    >
      {/* What needs your attention, in one sentence */}
      {!loading && needsPayment.length > 0 && (
        <StateNotice tone="warning" icon={CreditCard} title="Payment needed." className="mb-6">
          {needsPayment.length === 1
            ? `One booking has ${formatCurrency(amountDue)} still to pay.`
            : `${needsPayment.length} bookings have ${formatCurrency(amountDue)} still to pay in total.`}{" "}
          {statusTab !== "needs_payment" && (
            <button
              type="button"
              onClick={() => setStatusTab("needs_payment")}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Show them
            </button>
          )}
        </StateNotice>
      )}

      <PortalToolbar
        className="mb-6"
        activeSegment={statusTab}
        onSegmentChange={setStatusTab}
        segments={[
          { id: "all", label: "All", count: counts.all },
          { id: "needs_payment", label: "Needs payment", count: counts.needs_payment, tone: "warning" },
          { id: "confirmed", label: "Confirmed", count: counts.confirmed, tone: "success" },
          { id: "completed", label: "Completed", count: counts.completed, tone: "neutral" },
          { id: "cancelled", label: "Cancelled", count: counts.cancelled, tone: "danger" },
        ]}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search by event or reference",
          label: "Search bookings",
        }}
        filter={{
          label: "Service:",
          value: serviceTypeFilter,
          onChange: setServiceTypeFilter,
          options: [
            { id: "all", label: "All services" },
            ...SERVICE_TYPES.map((type) => ({ id: type, label: type })),
          ],
        }}
      />

      {/* Bookings List Cards */}
      <div className="space-y-4">
        {loading ? (
          <LoadingState label="Loading your bookings" />
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={isFiltered ? "No bookings match your filters" : "No bookings yet"}
            description={
              isFiltered
                ? "Try a different filter or clear your search to see all your bookings."
                : "Once a quote is accepted and confirmed, your event will appear here."
            }
            action={
              isFiltered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusTab("all");
                    setServiceTypeFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>
                  <Plus className="h-4 w-4" /> Book an event
                </Button>
              )
            }
          />
        ) : (
          filteredBookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              payments={payments}
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
              onBookingUpdate={loadData}
            />
          ))
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
