import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CheckCircle2, Calendar as CalendarIcon, MapPin, Receipt, ChevronRight } from "lucide-react";
import { CustomerAPI } from "../../../api/customer";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { cn } from "@/lib/utils";
import InlineMessage from "../../../components/feedback/InlineMessage";
import OcularDatePickerModal from "../../../components/customer/OcularDatePickerModal";
import { requiresPhysicalSiteInspection } from "../../../utils/ocularEligibility";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [showOcular, setShowOcular] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [schedulingError, setSchedulingError] = useState("");
  const [isLoading, setIsLoading] = useState((!!searchParams.get('booking_id') || !!searchParams.get('session_id')) && !location.state?.booking);

  // If redirected from PayMongo without state, we might need to fetch the latest booking if possible, 
  // but usually we can just show a generic success if we don't have the booking object.
  useEffect(() => {
    const loadBooking = async () => {
      if (booking) return;

      const bookingId = searchParams.get('booking_id');
      const sessionId = searchParams.get('session_id');
      const paymentId = searchParams.get('payment_id');
      if (!(bookingId || sessionId || paymentId)) return;

      if (paymentId) {
        try {
          await CustomerAPI.verifyPayment(paymentId);
        } catch (paymentErr) {
          console.error("Failed to verify payment:", paymentErr);
        }
      }

      try {
        const res = await CustomerAPI.getBookings();
        let found = bookingId ? res.data.find((item) => item._id === bookingId) : null;

        if (!found && sessionId) {
          try {
            const payRes = await CustomerAPI.getPayments();
            const payment = payRes.data.find(
              (item) => item.gateway_checkout_id === sessionId,
            );
            if (payment?.booking_id) {
              const bookingIdFromPayment =
                typeof payment.booking_id === "object"
                  ? payment.booking_id._id
                  : payment.booking_id;
              found = res.data.find((item) => item._id === bookingIdFromPayment);
            }
          } catch (payErr) {
            console.error("Failed to fetch payments:", payErr);
          }
        }

        if (found) setBooking(found);
      } catch (err) {
        console.error("Failed to fetch booking details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBooking();
  }, [booking, searchParams]);

  const handleScheduleOcular = async (selectedDate, selectedTime) => {
    if (!selectedDate || !selectedTime || !booking) return;
    setScheduling(true);
    setSchedulingError("");
    try {
      await CustomerAPI.requestOcular(booking._id, {
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
      });
      setShowOcular(false);
      navigate(`/customer/bookings/${booking._id}`, { state: { ocularSuccess: true } });
    } catch (err) {
      console.error(err);
      setSchedulingError(
        err.response?.data?.message ||
          "We could not schedule that visit. Please try again.",
      );
      setScheduling(false);
    }
  };

  const depositPaid = booking ? (booking.total_price * 0.2) : 0; // Assuming 20% for display if not provided

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-12 h-12 border-4 border-muted border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading booking details...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!booking && !searchParams.get('session_id') && !searchParams.get('booking_id')) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="text-center p-8 border-border">
            <h2 className="text-2xl font-serif text-foreground mb-4">No booking details found.</h2>
            <Button onClick={() => navigate("/customer/home")}>
              Go to Dashboard
            </Button>
          </Card>
        </div>
      </CustomerLayout>
    );
  }

  const canScheduleOcular = booking && requiresPhysicalSiteInspection(booking);

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="overflow-hidden border-border">
          <div className="p-8 text-center border-b border-border">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-3">
              {booking?.payment_method === "cod" ? "Order Placed Successfully!" : "Payment Complete!"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {booking?.payment_method === "cod" 
                ? "Your order has been placed. Please prepare cash for delivery." 
                : "Your deposit has been successfully processed."}
            </p>
          </div>

          <div className="p-8 bg-muted/30">
            <div className="max-w-md mx-auto">
              <Card className="p-6 mb-8 relative border-border">
                {/* Ticket cutouts */}
                <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-muted/30 rounded-full border-r border-border"></div>
                <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-muted/30 rounded-full border-l border-border"></div>
                
                <div className="text-center pb-6 border-b border-dashed border-border">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {booking?.payment_method === "cod" ? "Total to Pay (COD)" : "Amount Paid"}
                  </p>
                  <p className="text-4xl font-bold text-accent">
                    ₱{booking ? (booking.payment_method === "cod" ? booking.total_price.toLocaleString() : depositPaid.toLocaleString()) : "..."}
                  </p>
                </div>
                
                <div className="pt-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference No.</span>
                    <span className="font-medium text-foreground">{booking?.reference || "CAZ-000000"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event Date</span>
                    <span className="font-medium text-foreground">
                      {booking?.event_date ? new Date(booking.event_date).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue</span>
                    <span className="font-medium text-foreground">{booking?.venue_type || "-"}</span>
                  </div>
                </div>
              </Card>

              {schedulingError && (
                <div className="mb-4">
                  <InlineMessage tone="error" assertive onDismiss={() => setSchedulingError("")}>
                    {schedulingError}
                  </InlineMessage>
                </div>
              )}

              <div className="space-y-3">
                {canScheduleOcular && (
                  <Button 
                    size="lg"
                    className="w-full text-sm font-semibold rounded-lg h-11 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-2"
                    onClick={() => setShowOcular(true)}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Schedule an Ocular Visit</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full text-sm font-semibold rounded-lg h-11 cursor-pointer"
                  onClick={() => navigate("/customer/bookings")}
                >
                  Go to Event Dashboard
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {showOcular && (
          <OcularDatePickerModal
            isOpen={showOcular}
            onClose={() => setShowOcular(false)}
            onSubmit={handleScheduleOcular}
            isSubmitting={scheduling}
            eventDate={booking?.event_date}
            eventTitle={booking?.event_type || "Event Venue Inspection"}
          />
        )}
      </div>
    </CustomerLayout>
  );
}
