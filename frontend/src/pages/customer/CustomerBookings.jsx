import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import BookingCard from "../../components/booking/BookingCard";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { CalendarClock, PlusCircle, AlertCircle } from "lucide-react";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return `₱${Number(value).toLocaleString()}`;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function CustomerBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [requestingBooking, setRequestingBooking] = useState(null);
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [addingGuestsBooking, setAddingGuestsBooking] = useState(null);
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [isSubmittingGuests, setIsSubmittingGuests] = useState(false);
  
  const [upgradingBooking, setUpgradingBooking] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const { notify } = useToast();

  useEffect(() => {
    CustomerAPI.getBookings().then((res) => setBookings(res.data)).catch(() => setBookings([]));
    CustomerAPI.getPayments().then((res) => setPayments(res.data)).catch(() => setPayments([]));
    CustomerAPI.getPackages().then((res) => setPackages(res.data)).catch(() => setPackages([]));
  }, []);

  const upcoming = useMemo(
    () => bookings.filter((b) => ["pending deposit", "confirmed", "preparing", "ongoing"].includes(b.status)),
    [bookings]
  );
  const completed = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings]
  );

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

    setPayingBookingId(booking._id);
    navigate("/customer/checkout", {
      state: {
        bookingId: booking._id,
        amount,
        paymentType: isBalance ? "balance" : "deposit"
      }
    });
  };

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
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        setAddingGuestsBooking(null);
        setAdditionalGuests(0);
        const bRes = await CustomerAPI.getBookings();
        setBookings(bRes.data);
      }
    } catch (error) {
      notify(error.response?.data?.message || "We could not add guests. Please try again.", "error");
    } finally {
      setIsSubmittingGuests(false);
    }
  };

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
    if (!requestingBooking) return;

    const nextMessage = requestNote.trim();
    if (!nextMessage) {
      notify("Please describe the changes you want to request.", "error");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const response = await CustomerAPI.requestBookingChange(requestingBooking._id, { message: nextMessage });
      setBookings((prev) => prev.map((booking) => (booking._id === response.data._id ? response.data : booking)));
      notify("Your change request was sent to the admin.", "success");
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
      subtitle="Manage your confirmed events"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-serif text-foreground">
          {upcoming.length} Active Booking{upcoming.length !== 1 ? 's' : ''}
        </h2>
        <Button onClick={() => navigate("/packages")} className="rounded-full">
          <PlusCircle className="w-4 h-4 mr-2" /> New Booking
        </Button>
      </div>

      <div className="space-y-4">
        {upcoming.length === 0 ? (
          <Card className="border-dashed border-border bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarClock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">No active bookings yet.</p>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Ready to plan your next event?</p>
              <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>Book Now</Button>
            </CardContent>
          </Card>
        ) : (
          upcoming.map(booking => {
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
              />
            );
          })
        )}
      </div>

      <Card className="mt-12 border-border">
        <CardHeader>
          <CardTitle className="text-xl font-serif">Past Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completed.map((item) => (
              <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors">
                <div>
                  <strong className="text-foreground">{item.event_type}</strong>
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.event_date ? new Date(item.event_date).toLocaleDateString() : ""}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm font-medium">{formatCurrency(item.total_price)}</div>
                  <Button variant="outline" size="sm">Write review</Button>
                </div>
              </div>
            ))}
            {completed.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No past events yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Guests Dialog */}
      <Dialog open={!!addingGuestsBooking} onOpenChange={(open) => !open && setAddingGuestsBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitAddGuests}>
            <DialogHeader>
              <DialogTitle>Add Guests</DialogTitle>
              <DialogDescription className="pt-2">
                You currently have <strong className="text-foreground">{addingGuestsBooking?.guest_count}</strong> guests.
                Adding more guests costs <strong className="text-foreground">₱500 per head</strong>. This will generate a payment link for the difference.
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
              <DialogTitle>Request booking change</DialogTitle>
              <DialogDescription className="pt-2">
                Describe the booking details you want changed. 
                <strong className="text-foreground block mt-1">Note: Sensitive actions such as Date Change, Venue Change, Downgrades, or Full Cancellations require Admin approval.</strong>
                The admin will review your request and process custom refunds or new quotes if applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="booking-change-request">
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
