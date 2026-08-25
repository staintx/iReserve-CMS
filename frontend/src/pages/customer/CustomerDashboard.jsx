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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Action Required & Next Event */}
          <div className="space-y-6 lg:col-span-2">
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
                className="p-5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs cursor-pointer transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">Custom Event Quote</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Customize catering menu, guest count, and event setup details.</p>
              </div>

              <div 
                onClick={() => navigate("/packages")}
                className="p-5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs cursor-pointer transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">Browse Menu Packages</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Explore curated all-inclusive packages and dishes.</p>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Quick Navigation & Support */}
          <div className="space-y-5">
            <PortalSection title="Quick Actions" bodyClassName="space-y-2">
              <button
                type="button"
                onClick={() => navigate("/customer/agent")}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-[#2C4B8A]/20 bg-blue-50/40 p-3.5 text-left transition-all hover:bg-blue-50/80 hover:border-[#2C4B8A]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2C4B8A] text-white shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">Zelle AI Agent</span>
                    <span className="block truncate text-[11px] text-slate-500">Ask menus, pricing & dates</span>
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#2C4B8A] transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/packages")}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Utensils className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900">Browse packages & menu</span>
                    <span className="block truncate text-[11px] text-slate-500">Curated catering tiers</span>
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/customer/inquiries")}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900">My inquiries</span>
                    <span className="block truncate text-[11px] text-slate-500">Quote status & proposals</span>
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/customer/bookings")}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900">My bookings</span>
                    <span className="block truncate text-[11px] text-slate-500">Reserved events & payments</span>
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/customer/messages")}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-white p-3.5 text-left transition-all hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900">Messages</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {unreadCount > 0 ? `${unreadCount} unread` : "Chat with coordination team"}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            </PortalSection>

            {/* Direct Support Card */}
            <div className="p-5 rounded-md border border-slate-200 bg-slate-50/70 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-sans">Direct Event Support</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200/60">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Have questions or need assistance with your booking details?
              </p>
              <button
                onClick={() => navigate("/customer/messages")}
                className="text-xs font-bold text-[#2C4B8A] hover:underline inline-flex items-center gap-1 pt-0.5 cursor-pointer"
              >
                Open Message Thread <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}

