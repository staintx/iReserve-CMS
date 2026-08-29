import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";
import { Button } from "../../components/ui/button";
import PortalSection from "../../components/customer/portal/PortalSection";
import StatTile from "../../components/customer/portal/StatTile";
import StatusPill from "../../components/customer/portal/StatusPill";
import StateNotice from "../../components/customer/portal/StateNotice";
import EmptyState from "../../components/customer/portal/EmptyState";
import LoadingState from "../../components/customer/portal/LoadingState";
import DetailGrid from "../../components/customer/portal/DetailGrid";
import {
  bookingStatusMeta,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { TONE_ACCENT } from "../../components/customer/portal/tones";
import { ACTION_PAY } from "../../components/customer/portal/actionStyles";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEventDateTime, formatShortDate } from "../../utils/format";
import {
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  PlusCircle,
  ArrowRight,
  FileText,
  Calendar,
  ChevronRight,
  Sparkles,
  X,
  CreditCard,
  Utensils,
  Layers,
  Phone,
  ShieldCheck,
  Check,
  ChevronDown
} from "lucide-react";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGetStarted, setShowGetStarted] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      CustomerAPI.getInquiries().catch(() => ({ data: [] })),
      CustomerAPI.getBookings().catch(() => ({ data: [] })),
      CustomerAPI.getPayments().catch(() => ({ data: [] })),
      CustomerAPI.getConversations().catch(() => ({ data: [] }))
    ]).then(([inqRes, bookRes, payRes, convoRes]) => {
      setInquiries(inqRes.data || []);
      setBookings(bookRes.data || []);
      setPayments(payRes.data || []);

      const convos = convoRes.data || [];
      const unread = convos.filter(c => {
        const p = c.participants?.find(part => String(part.user._id || part.user) === String(user?._id));
        return p && p.unread_count > 0;
      }).length;
      setUnreadCount(unread);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useRealTimeRefresh(loadData);

  const now = useMemo(() => new Date(), []);

  // Filter Active Inquiries
  const activeInquiries = useMemo(() => {
    return inquiries.filter(i => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status));
  }, [inquiries]);

  // Action required items: Quotations sent or bookings pending deposit
  const actionRequiredItems = useMemo(() => {
    const quoteSentInquiries = inquiries.filter(i => i.status === "Quotation Sent").map((i) => {
      const status = inquiryStatusMeta(i);
      return {
        type: "inquiry",
        id: i._id,
        title: recordTitle(i),
        date: i.event_date,
        startTime: i.start_time,
        status,
        description: status.notice?.text,
        actionText: "Review quote",
        onAction: () => navigate("/customer/inquiries")
      };
    });

    const depositNeededBookings = bookings.filter(b => b.status === "pending deposit" || b.status === "customer_accepted").map((b) => {
      const status = bookingStatusMeta(b);
      return {
        type: "booking",
        id: b._id,
        title: recordTitle(b),
        date: b.event_date,
        startTime: b.start_time,
        status,
        description: status.notice?.text,
        actionText: "Pay deposit",
        isPayment: true,
        onAction: () => navigate(`/customer/bookings/${b._id}`)
      };
    });

    return [...quoteSentInquiries, ...depositNeededBookings];
  }, [inquiries, bookings, navigate]);

  // Confirmed / Upcoming Events
  const upcomingEvents = useMemo(() => {
    return bookings.filter(b => ["confirmed", "preparing", "ongoing"].includes(b.status) && new Date(b.event_date) >= now);
  }, [bookings, now]);

  const completedEvents = useMemo(() => {
    return bookings.filter(b => b.status === "completed");
  }, [bookings]);

  // Total balance calculation
  const totalBalanceDue = useMemo(() => {
    return bookings.reduce((sum, b) => {
      if (["cancelled"].includes(b.status)) return sum;
      const total = Number(b.total_price || 0);
      const paid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && p.status === "approved")
        .reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      return sum + Math.max(0, total - paid);
    }, 0);
  }, [bookings, payments]);

  // Total estimated volume
  const totalEstimatedVolume = useMemo(() => {
    return bookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
  }, [bookings]);

  const nextEvent = upcomingEvents[0] || bookings.find(b => b.status === "confirmed");
  const nextEventStatus = nextEvent ? bookingStatusMeta(nextEvent) : null;
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "Customer";

  return (
    <CustomerDashboardLayout>
      <div className="space-y-6">
        {/* ── Operational Greeting Header ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
              Welcome back, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Overview of your catering bookings, quote requests, and payments.
            </p>
          </div>
        </div>

        {/* ── High-Density Telemetry Metrics Grid ────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatTile
            icon={Calendar}
            label="Active Bookings"
            value={bookings.filter(b => !["cancelled", "completed"].includes(b.status)).length}
            hint={upcomingEvents.length > 0 ? `${upcomingEvents.length} upcoming` : "No upcoming events"}
            onClick={() => navigate("/customer/bookings")}
          />
          <StatTile
            icon={FileText}
            label="Open Inquiries"
            value={activeInquiries.length}
            hint={activeInquiries.length > 0 ? "Pending quote review" : "All converted"}
            onClick={() => navigate("/customer/inquiries")}
          />
          <StatTile
            icon={CreditCard}
            label="Balance Due"
            value={formatCurrency(totalBalanceDue)}
            hint={totalBalanceDue > 0 ? "Pending payment" : "All settled"}
            onClick={() => navigate("/customer/bookings")}
          />
          <StatTile
            icon={MessageSquare}
            label="Messages"
            value={unreadCount}
            hint={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            onClick={() => navigate("/customer/messages")}
          />
        </div>

        {/* ── Main Operational Grid ─────────────────────────────────── */}
        <div className="max-w-5xl mx-auto">
          <div className="space-y-6">
            {/* Needs Attention items */}
            {!loading && actionRequiredItems.length > 0 && (
              <PortalSection
                title={`Needs your attention (${actionRequiredItems.length})`}
                description="Action required to advance your reservation."
                bodyClassName="space-y-3"
              >
                {actionRequiredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3.5 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 hover:border-slate-300 shadow-2xs transition-all"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h3>
                        <StatusPill tone={item.status.tone} label={item.status.label} icon={item.status.icon} />
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{formatEventDateTime(item.date, item.startTime)}</p>
                      {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                    </div>

                    <Button 
                      onClick={item.onAction} 
                      size="sm"
                      className={cn(
                        "shrink-0 font-semibold text-xs px-3.5 py-1.5 rounded-md transition-colors cursor-pointer shadow-2xs",
                        item.isPayment 
                          ? "bg-amber-600 hover:bg-amber-700 text-white" 
                          : "bg-[#2C4B8A] hover:bg-[#1E3563] text-white"
                      )}
                    >
                      {item.actionText}
                    </Button>
                  </div>
                ))}
              </PortalSection>
            )}

            {/* Next Event Spotlight */}
            <PortalSection
              title="Your Next Event"
              className="bg-slate-50 border-0 shadow-sm ring-1 ring-slate-900/5"
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate("/customer/bookings")} className="text-xs font-bold text-[#2C4B8A] hover:bg-slate-100 cursor-pointer">
                  All bookings <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              }
            >
              {loading ? (
                <LoadingState rows={1} label="Loading event details..." />
              ) : nextEvent ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">{recordTitle(nextEvent)}</h3>
                    {nextEventStatus && (
                      <StatusPill tone={nextEventStatus.tone} label={nextEventStatus.label} icon={nextEventStatus.icon} />
                    )}
                  </div>

                  <DetailGrid
                    items={[
                      { label: "Date & Time", value: formatEventDateTime(nextEvent.event_date, nextEvent.start_time) },
                      { label: "Location", value: nextEvent.municipality || nextEvent.venue_type || "To be confirmed" },
                      { label: "Service", value: nextEvent.package_name || resolveServiceType(nextEvent) },
                      { label: "Guests", value: nextEvent.guest_count ? `${nextEvent.guest_count} guests` : "—" },
                      { label: "Reference", value: nextEvent.reference || "—", mono: true },
                      { label: "Total Cost", value: formatCurrency(nextEvent.total_price) },
                    ]}
                  />

                  <div className="flex justify-end border-t border-slate-100 pt-3">
                    <Button 
                      size="sm"
                      className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs rounded-md shadow-2xs cursor-pointer"
                      onClick={() => navigate(`/customer/bookings/${nextEvent._id}`)}
                    >
                      View event workspace <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  className="border-0 py-6"
                  icon={CalendarClock}
                  title="No upcoming events scheduled"
                  description="Your confirmed event preparations and details will appear here."
                  action={
                    <Button 
                      size="sm"
                      className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs rounded-md shadow-2xs cursor-pointer"
                      onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Request a quote
                    </Button>
                  }
                />
              )}
            </PortalSection>

            {/* Quick Action Discovery Cards (Compact 2-card row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                className="p-5 rounded-md bg-white hover:bg-slate-50 ring-1 ring-slate-900/5 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">Custom Event Quote</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Customize catering menu, guest count, and event setup details.</p>
              </div>

              <div 
                onClick={() => navigate("/packages")}
                className="p-5 rounded-md bg-white hover:bg-slate-50 ring-1 ring-slate-900/5 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">Browse Menu Packages</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Explore curated all-inclusive packages and dishes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}

