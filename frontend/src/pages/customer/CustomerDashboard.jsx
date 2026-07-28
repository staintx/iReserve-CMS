import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CalendarClock, CheckCircle, Mail, PlusCircle, ArrowRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    CustomerAPI.getBookings().then((res) => setBookings(res.data)).catch(() => setBookings([]));
    CustomerAPI.getConversations().then((res) => {
      const convos = res.data || [];
      const unread = convos.filter(c => {
        const p = c.participants.find(p => String(p.user._id || p.user) === String(user?._id));
        return p && p.unread_count > 0;
      }).length;
      setUnreadCount(unread);
    }).catch(() => setUnreadCount(0));
  }, [user]);

  const now = useMemo(() => new Date(), []);
  const pendingBookings = bookings.filter((b) => ["pending deposit", "pending"].includes(b.status) && new Date(b.event_date) >= now);
  const upcomingBookings = bookings.filter((b) => ["confirmed", "preparing", "ongoing"].includes(b.status) && new Date(b.event_date) >= now);
  const completedBookings = bookings.filter((b) => b.status === "completed");

  const nextEvent = upcomingBookings[0] || pendingBookings[0];
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";

  return (
    <CustomerDashboardLayout
      title={`Welcome back${firstName ? ", " + firstName : ""}!`}
      subtitle="Here's an overview of your events and bookings"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Bookings</p>
              <h3 className="text-2xl font-bold text-foreground">{pendingBookings.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming Events</p>
              <h3 className="text-2xl font-bold text-foreground">{upcomingBookings.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unread Messages</p>
              <h3 className="text-2xl font-bold text-foreground">{unreadCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed Events</p>
              <h3 className="text-2xl font-bold text-foreground">{completedBookings.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Event */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-serif">Next Upcoming Event</CardTitle>
              <Button variant="ghost" size="sm" className="text-accent hover:text-accent hover:bg-accent/10" onClick={() => navigate("/customer/bookings")}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {nextEvent ? (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 mt-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-2xl font-bold text-foreground">{nextEvent.event_type || "Event"}</h4>
                      <p className="text-muted-foreground text-sm font-mono mt-1">{nextEvent.reference || nextEvent._id}</p>
                    </div>
                    <span className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-semibold tracking-wide uppercase">
                      {nextEvent.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Date & Time</p>
                      <p className="font-medium text-foreground">
                        {nextEvent.event_date ? new Date(nextEvent.event_date).toLocaleDateString() : "TBD"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Venue</p>
                      <p className="font-medium text-foreground">{nextEvent.venue_type || "TBD"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Package</p>
                      <p className="font-medium text-foreground line-clamp-1">{nextEvent.package_name || nextEvent.service_type || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/30 mt-4">
                  <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium text-foreground">No upcoming events</p>
                  <p className="text-sm text-muted-foreground mt-1">Ready to plan your next big celebration?</p>
                  <Button className="mt-4" onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>Book an Event</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Bookings */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-serif">Action Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {pendingBookings.slice(0, 3).map((booking) => (
                  <div key={booking._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-foreground">{booking.event_type || "Event Booking"}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Date: {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                        {booking.status}
                      </span>
                      {booking.status === "pending deposit" && (
                        <Button size="sm" onClick={() => navigate("/customer/payments")}>
                          Pay Deposit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {pendingBookings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>All caught up! No pending actions.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-8">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Book an Event</div>
                    <div className="text-xs text-muted-foreground">Start a new booking</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
              </button>

              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left group"
                onClick={() => navigate("/customer/messages")}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5" />
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Messages</div>
                    <div className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} unread` : "Chat with us"}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </button>

              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left group"
                onClick={() => navigate("/customer/bookings")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Event History</div>
                    <div className="text-xs text-muted-foreground">View past events</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
