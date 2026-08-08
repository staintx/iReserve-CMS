import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
  CalendarClock, 
  CheckCircle2, 
  MessageSquare, 
  PlusCircle, 
  ArrowRight, 
  History, 
  Sparkles, 
  Clock, 
  CreditCard, 
  FileText, 
  Calendar, 
  MapPin, 
  Utensils, 
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      CustomerAPI.getInquiries().catch(() => ({ data: [] })),
      CustomerAPI.getBookings().catch(() => ({ data: [] })),
      CustomerAPI.getConversations().catch(() => ({ data: [] }))
    ]).then(([inqRes, bookRes, convoRes]) => {
      setInquiries(inqRes.data || []);
      setBookings(bookRes.data || []);
      
      const convos = convoRes.data || [];
      const unread = convos.filter(c => {
        const p = c.participants?.find(part => String(part.user._id || part.user) === String(user?._id));
        return p && p.unread_count > 0;
      }).length;
      setUnreadCount(unread);
    }).finally(() => setLoading(false));
  }, [user]);

  const now = useMemo(() => new Date(), []);

  // Filter Active Inquiries (not converted/cancelled)
  const activeInquiries = useMemo(() => {
    return inquiries.filter(i => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status));
  }, [inquiries]);

  // Action required items: Quotations sent to customer OR bookings pending deposit
  const actionRequiredItems = useMemo(() => {
    const quoteSentInquiries = inquiries.filter(i => i.status === "Quotation Sent").map(i => ({
      type: "inquiry",
      id: i._id,
      title: `${i.contact_first_name ? i.contact_first_name + "'s " : ""}${i.event_type}`,
      reference: i.reference || `INQ-${i._id.substring(0, 6).toUpperCase()}`,
      date: i.event_date,
      statusLabel: "Quote Ready for Review",
      statusVariant: "bg-primary text-primary-foreground font-bold",
      actionText: "Review & Accept Quote",
      onAction: () => navigate("/customer/inquiries")
    }));

    const depositNeededBookings = bookings.filter(b => b.status === "pending deposit" || b.status === "customer_accepted").map(b => ({
      type: "booking",
      id: b._id,
      title: `${b.contact_first_name ? b.contact_first_name + "'s " : ""}${b.event_type}`,
      reference: b.reference || `BK-${b._id.substring(0, 6).toUpperCase()}`,
      date: b.event_date,
      statusLabel: "Deposit Payment Needed",
      statusVariant: "bg-amber-500 text-slate-950 font-bold",
      actionText: "Pay Deposit Now",
      onAction: () => navigate(`/customer/bookings/${b._id}`)
    }));

    return [...quoteSentInquiries, ...depositNeededBookings];
  }, [inquiries, bookings, navigate]);

  // Confirmed / Upcoming Events
  const upcomingEvents = useMemo(() => {
    return bookings.filter(b => ["confirmed", "preparing", "ongoing"].includes(b.status) && new Date(b.event_date) >= now);
  }, [bookings, now]);

  const completedEvents = useMemo(() => {
    return bookings.filter(b => b.status === "completed");
  }, [bookings]);

  const nextEvent = upcomingEvents[0] || bookings.find(b => b.status === "confirmed");
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";

  return (
    <CustomerDashboardLayout
      title={`Welcome back${firstName ? ", " + firstName : ""}!`}
      subtitle="Overview of your event bookings, quote requests, and communications"
    >
      {/* Hero Welcome Banner */}
      <div className="mb-8 p-6 sm:p-8 bg-gradient-to-r from-[#1E293B] via-[#1E293B] to-[#2C4470] rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 text-accent font-semibold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" /> Caezelle's Catering Customer Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight mb-2">
            Plan Your Next Event Effortlessly
          </h2>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Track your quote requests, review official catering quotations, and manage your upcoming event reservations all in one place.
          </p>
        </div>

        <Button
          onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
          className="rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-6 py-3 shadow-lg flex items-center gap-2 shrink-0 transition-transform active:scale-95 text-sm"
        >
          <PlusCircle className="w-5 h-5 stroke-[2.5]" /> Request a Quote
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active Quote Requests */}
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-powder text-primary flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quote Requests</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{activeInquiries.length}</h3>
              <p className="text-[11px] text-muted-foreground/70">Active inquiries</p>
            </div>
          </CardContent>
        </Card>

        {/* Confirmed Upcoming Events */}
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent border border-accent/25 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmed Events</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{upcomingEvents.length}</h3>
              <p className="text-[11px] text-muted-foreground/70">Upcoming celebrations</p>
            </div>
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unread Messages</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{unreadCount}</h3>
              <p className="text-[11px] text-muted-foreground/70">Caterer communications</p>
            </div>
          </CardContent>
        </Card>

        {/* Completed Events */}
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed Events</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{completedEvents.length}</h3>
              <p className="text-[11px] text-muted-foreground/70">Past celebrations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Action Required Banner Section if any */}
          {actionRequiredItems.length > 0 && (
            <Card className="border-2 border-primary/20 bg-powder/30 shadow-sm">
              <CardHeader className="pb-3 border-b border-primary/10">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" /> Action Required ({actionRequiredItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {actionRequiredItems.map((item) => (
                  <div key={item.id} className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{item.reference}</span>
                        <span className={`px-2.5 py-0.5 text-[11px] rounded-full ${item.statusVariant}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Target Date: {item.date ? new Date(item.date).toLocaleDateString() : "TBA"}
                      </p>
                    </div>

                    <Button
                      onClick={item.onAction}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm"
                    >
                      {item.actionText}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Next Upcoming Event Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <CardTitle className="text-lg font-serif font-bold text-foreground">Next Upcoming Event</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-hover hover:bg-powder text-xs font-semibold"
                onClick={() => navigate("/customer/bookings")}
              >
                View All Bookings <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              {nextEvent ? (
                <div className="bg-gradient-to-br from-[#1E293B] to-[#0f1729] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 w-40 h-40 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-700/80">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-accent font-semibold block mb-1">
                        Ref: {nextEvent.reference || nextEvent._id}
                      </span>
                      <h4 className="text-2xl font-serif font-bold text-white">
                        {nextEvent.contact_first_name ? `${nextEvent.contact_first_name}'s ` : ""}{nextEvent.event_type}
                      </h4>
                    </div>

                    <span className="px-3.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                      {nextEvent.status === "confirmed" ? "Confirmed & Reserved" : nextEvent.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Date & Time</span>
                      <strong className="text-white text-sm block">
                        {nextEvent.event_date ? new Date(nextEvent.event_date).toLocaleDateString() : "TBD"}
                      </strong>
                      <span className="text-slate-400">{nextEvent.start_time || "TBD"}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Venue / Location</span>
                      <strong className="text-white text-sm block truncate">
                        {nextEvent.venue_type || nextEvent.municipality || "TBD"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Package & Service</span>
                      <strong className="text-white text-sm block truncate">
                        {nextEvent.package_name || nextEvent.service_type || "Custom Catering"}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/80 flex justify-end">
                    <Button
                      onClick={() => navigate(`/customer/bookings/${nextEvent._id}`)}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl px-5 py-2"
                    >
                      View Event Details & Payments <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-border bg-muted/40">
                  <CalendarClock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-foreground">No upcoming confirmed events</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Submit a quote request or check your active inquiries to book your next catering service.
                  </p>
                  <Button
                    className="mt-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-5 text-xs shadow-sm"
                    onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                  >
                    + Request a Quote
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Quick Actions */}
        <div className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg font-serif font-bold text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">

              {/* 1. Request a Quote */}
              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-powder/40 transition-all text-left group"
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-powder text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">Request a Quote</div>
                    <div className="text-xs text-muted-foreground">Get a custom catering estimate</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              {/* 2. My Inquiries */}
              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-powder/40 transition-all text-left group"
                onClick={() => navigate("/customer/inquiries")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-powder text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">My Inquiries</div>
                    <div className="text-xs text-muted-foreground">Review quotes & status</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              {/* 3. My Bookings */}
              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-powder/40 transition-all text-left group"
                onClick={() => navigate("/customer/bookings")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-powder text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">My Bookings</div>
                    <div className="text-xs text-muted-foreground">Track confirmed reservations</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              {/* 4. Messages */}
              <button
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-powder/40 transition-all text-left group"
                onClick={() => navigate("/customer/messages")}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-powder text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">Messages</div>
                    <div className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} unread message(s)` : "Chat with our team"}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
