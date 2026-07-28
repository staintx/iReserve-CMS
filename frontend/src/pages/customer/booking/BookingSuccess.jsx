import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CheckCircle2, Calendar as CalendarIcon, MapPin, Receipt, ChevronRight } from "lucide-react";
import { CustomerAPI } from "../../../api/customer";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { cn } from "@/lib/utils";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [showOcular, setShowOcular] = useState(false);
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [isLoading, setIsLoading] = useState(!!searchParams.get('booking_id') && !location.state?.booking);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      // Need a new date object at noon to avoid timezone shift on toISOString()
      days.push(new Date(year, month, i, 12, 0, 0));
    }
    return days;
  };

  // If redirected from PayMongo without state, we might need to fetch the latest booking if possible, 
  // but usually we can just show a generic success if we don't have the booking object.
  useEffect(() => {
    if (!booking) {
      const bookingId = searchParams.get('booking_id');
      if (bookingId) {
        CustomerAPI.getBookings()
          .then((res) => {
            const found = res.data.find(b => b._id === bookingId);
            if (found) {
              setBooking(found);
            }
          })
          .catch((err) => console.error("Failed to fetch booking details:", err))
          .finally(() => setIsLoading(false));
      }
    }
  }, [booking, searchParams]);

  const handleScheduleOcular = async () => {
    if (!ocularDate || !ocularTime || !booking) return;
    setScheduling(true);
    try {
      await CustomerAPI.scheduleOcularVisit(booking._id, {
        date: ocularDate,
        time: ocularTime
      });
      navigate(`/customer/bookings/${booking._id}`, { state: { ocularSuccess: true } });
    } catch (err) {
      console.error(err);
      alert("Failed to schedule. Please try again.");
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

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {!showOcular ? (
          <Card className="overflow-hidden border-border">
            <div className="p-8 text-center border-b border-border">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Payment Complete!</h1>
              <p className="text-muted-foreground text-lg">Your deposit has been successfully processed.</p>
            </div>

            <div className="p-8 bg-muted/30">
              <div className="max-w-md mx-auto">
                <Card className="p-6 mb-8 relative border-border">
                  {/* Ticket cutouts */}
                  <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-muted/30 rounded-full border-r border-border"></div>
                  <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-muted/30 rounded-full border-l border-border"></div>
                  
                  <div className="text-center pb-6 border-b border-dashed border-border">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Amount Paid</p>
                    <p className="text-4xl font-bold text-accent">
                      ₱{booking ? depositPaid.toLocaleString() : "..."}
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

                <div className="space-y-3">
                  {booking?.service_type !== "food" && (
                    <Button 
                      size="lg"
                      className="w-full text-base font-medium rounded-xl h-14 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setShowOcular(true)}
                    >
                      <MapPin className="w-5 h-5 mr-2" />
                      Schedule an Ocular Visit
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    size="lg"
                    className="w-full text-base font-medium rounded-xl h-14"
                    onClick={() => navigate("/customer/bookings")}
                  >
                    Go to Event Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div>
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <h2 className="font-serif font-bold text-3xl text-foreground mb-3">Schedule Ocular Visit</h2>
              <p className="text-muted-foreground">Choose a preferred date and time for your venue walkthrough. Admin will confirm within 24 hours.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Calendar Column */}
              <Card className="p-8 flex flex-col items-center border-border">
                <div className="flex justify-between items-center w-full mb-8">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth)}
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-muted-foreground"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </Button>
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="rounded-full text-muted-foreground"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-x-2 gap-y-4 w-full">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  {getDaysInMonth(currentMonth).map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const dateString = date.toISOString().split('T')[0];
                    const isSelected = ocularDate === dateString;
                    const isPast = date < new Date(new Date().setHours(0,0,0,0));
                    
                    return (
                      <button
                        key={dateString}
                        disabled={isPast}
                        onClick={() => setOcularDate(dateString)}
                        className={cn(
                          "w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm transition-all",
                          isSelected 
                            ? "bg-accent text-accent-foreground font-bold" 
                            : isPast 
                              ? "text-muted-foreground opacity-50 cursor-not-allowed" 
                              : "text-foreground hover:bg-accent/20 hover:text-accent-foreground"
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Time Slots & Info Column */}
              <div className="flex flex-col gap-6">
                <Card className="p-8 border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">
                    Preferred Time
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"].map(time => (
                      <button
                        key={time}
                        onClick={() => setOcularTime(time)}
                        className={cn(
                          "py-3.5 px-4 rounded-xl border text-sm font-medium transition-all text-center",
                          ocularTime === time
                            ? "border-accent ring-1 ring-accent bg-accent/10 text-accent-foreground"
                            : "border-border text-foreground hover:border-accent/50 hover:bg-accent/5"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </Card>

                <div className="bg-accent/10 rounded-2xl p-6 text-sm text-foreground">
                  <p className="font-semibold mb-2">What to expect:</p>
                  <ul className="space-y-1.5 opacity-80">
                    <li>• 45-60 minute venue walkthrough</li>
                    <li>• Meet your assigned event coordinator</li>
                    <li>• Finalize table layout and décor</li>
                    <li>• Admin will confirm via email/SMS</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <Button 
                    size="lg"
                    className="w-full h-14 rounded-2xl text-base font-medium bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleScheduleOcular}
                    disabled={!ocularDate || !ocularTime || scheduling}
                  >
                    {scheduling ? "Confirming..." : "Confirm Ocular Visit >"}
                  </Button>
                  
                  <Button
                    variant="ghost" 
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/customer/bookings")}
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}