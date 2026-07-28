import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { ChevronLeft, Check, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export default function CustomerEventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CustomerAPI.getBookings()
      .then((res) => {
        const found = res.data.find(b => b._id === id);
        setBooking(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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

  const steps = [
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

  return (
    <CustomerDashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button 
          variant="ghost"
          onClick={() => navigate("/customer/bookings")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 font-medium transition-colors -ml-4"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Events
        </Button>

        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl text-foreground mb-2">Event Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Reference No: <span className="font-mono font-medium text-foreground bg-muted px-2 py-0.5 rounded">{booking.reference || booking._id.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Reservation Summary */}
            <Card className="border-border">
              <CardHeader className="border-b border-border pb-4 mb-4">
                <CardTitle className="text-xl font-serif">Reservation Summary</CardTitle>
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
              <Card className="bg-accent/10 border-accent/30">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-accent mb-0 text-sm uppercase tracking-wider">Ocular Visit Scheduled</h3>
                </CardHeader>
                <CardContent>
                  <div className="bg-card p-4 rounded-xl border border-accent/20">
                    <p className="font-medium text-foreground mb-1">{new Date(booking.ocular_visit.date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">{booking.ocular_visit.time}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
