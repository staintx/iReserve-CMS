import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { formatCurrency, formatEventDateTime, formatShortDate, formatDateToYYYYMMDD } from "../../utils/format";
import CustomerCalendarCard from "../../components/customer/portal/CustomerCalendarCard";
import CustomerDateEventsModal from "../../components/customer/portal/CustomerDateEventsModal";
import {
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  PlusCircle,
  ArrowRight,
  FileText,
  Calendar,
  CalendarCheck,
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
import { getBookingOcularActionMeta } from "../../utils/ocularStatusHelper";
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

  // Calendar State
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);

  const isFetchingRef = useRef(false);

  const loadData = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isBackground) setLoading(true);

    try {
      const [inqRes, bookRes, payRes, convoRes] = await Promise.all([
        CustomerAPI.getInquiries().catch(() => ({ data: [] })),
        CustomerAPI.getBookings().catch(() => ({ data: [] })),
        CustomerAPI.getPayments().catch(() => ({ data: [] })),
        CustomerAPI.getConversations().catch(() => ({ data: [] }))
      ]);

      setInquiries(inqRes.data || []);
      setBookings(bookRes.data || []);
      setPayments(payRes.data || []);

      const convos = convoRes.data || [];
      const unread = convos.reduce((acc, c) => acc + (Number(c.unread_customer_count) || 0), 0);
      setUnreadCount(unread);
    } catch {
      // silent fallback
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, user]);

  useRealTimeRefresh(() => loadData(true));

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
        onAction: () => navigate(`/customer/inquiries/${i._id}`)
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

    const ocularNeededBookings = bookings
      .filter((b) => {
        if (["cancelled", "completed", "refunded"].includes((b.status || "").toLowerCase())) return false;
        const oMeta = getBookingOcularActionMeta(b);
        return oMeta?.state === "action_required";
      })
      .map((b) => {
        return {
          type: "ocular",
          id: `ocular-${b._id}`,
          title: recordTitle(b),
          date: b.event_date,
          startTime: b.start_time,
          status: { tone: "warning", label: "Ocular Required", icon: CalendarClock },
          description: "Schedule venue inspection with our team",
          actionText: "Schedule ocular",
          isOcular: true,
          onAction: () => navigate(`/customer/bookings/${b._id}`),
        };
      });

    return [...quoteSentInquiries, ...depositNeededBookings, ...ocularNeededBookings];
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

  // Aggregate events for interactive calendar
  const calendarEventsMap = useMemo(() => {
    const map = {};
    const addToMap = (dateKey, eventObj) => {
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(eventObj);
    };

    const todayKey = formatDateToYYYYMMDD(now);

    // 1. Inquiries (ORANGE = Inquiry / Quote Request)
    inquiries.forEach((inq) => {
      if (["Converted to Booking", "Cancelled", "Quote Rejected"].includes(inq.status)) return;
      const dateKey = formatDateToYYYYMMDD(inq.event_date);
      if (!dateKey) return;

      const statusMeta = inquiryStatusMeta(inq);
      addToMap(dateKey, {
        id: `inq-${inq._id}`,
        type: "inquiry",
        categoryLabel: "Inquiry / Quote Request",
        title: recordTitle(inq) || inq.event_type || "Catering Inquiry",
        subtitle: resolveServiceType(inq),
        time: inq.start_time,
        location: inq.municipality || inq.venue_type || "To be confirmed",
        guests: inq.guest_count,
        reference: inq.reference,
        statusPill: statusMeta ? { tone: statusMeta.tone, label: statusMeta.label, icon: statusMeta.icon } : null,
        actionText: "View Inquiry",
        onAction: () => navigate(`/customer/inquiries/${inq._id}`),
      });
    });

    // 2. Bookings (GREEN = Confirmed Booking, GRAY = Completed / Past Event)
    bookings.forEach((b) => {
      if (["cancelled", "refunded"].includes(b.status.toLowerCase())) return;
      const dateKey = formatDateToYYYYMMDD(b.event_date);
      if (!dateKey) return;

      const isCompleted = b.status.toLowerCase() === "completed" || (dateKey < todayKey && b.status.toLowerCase() !== "cancelled");
      const statusMeta = bookingStatusMeta(b);
      const ocularMeta = getBookingOcularActionMeta(b);

      if (isCompleted) {
        addToMap(dateKey, {
          id: `book-completed-${b._id}`,
          type: "completed",
          categoryLabel: "Completed / Past Event",
          title: recordTitle(b) || "Catering Event",
          subtitle: resolveServiceType(b),
          time: b.start_time,
          location: b.municipality || b.venue_type || "Venue confirmed",
          guests: b.guest_count,
          reference: b.reference,
          statusPill: { tone: "neutral", label: "Completed" },
          actionText: "View Booking",
          onAction: () => navigate(`/customer/bookings/${b._id}`),
        });
      } else {
        addToMap(dateKey, {
          id: `book-confirmed-${b._id}`,
          type: "confirmed",
          categoryLabel: "Confirmed Booking",
          title: recordTitle(b) || "Catering Event",
          subtitle: resolveServiceType(b),
          time: b.start_time,
          location: b.municipality || b.venue_type || "Venue confirmed",
          guests: b.guest_count,
          reference: b.reference,
          statusPill: statusMeta ? { tone: statusMeta.tone, label: statusMeta.label, icon: statusMeta.icon } : null,
          ocularReminder: ocularMeta?.state === "action_required" ? "Action Required: Ocular visit needs to be scheduled" : null,
          actionText: "View Booking",
          onAction: () => navigate(`/customer/bookings/${b._id}`),
        });
      }
    });

    // 2b. Ocular Visits (PURPLE = Ocular Visit)
    bookings.forEach((b) => {
      if (["cancelled", "refunded"].includes(b.status.toLowerCase())) return;
      const ocularMeta = getBookingOcularActionMeta(b);
      if (!ocularMeta || !ocularMeta.scheduledDate) return;

      const dateKeyOcular = formatDateToYYYYMMDD(ocularMeta.scheduledDate);
      if (!dateKeyOcular) return;

      addToMap(dateKeyOcular, {
        id: `ocular-${b._id}`,
        type: "ocular",
        categoryLabel: "Ocular Visit",
        title: `Ocular Visit — ${recordTitle(b)}`,
        subtitle: ocularMeta.scheduledTime ? `Site Inspection at ${ocularMeta.scheduledTime}` : "Venue Inspection",
        time: ocularMeta.scheduledTime || "To be confirmed",
        location: [b.municipality, b.province].filter(Boolean).join(", ") || b.venue_address || "Venue confirmed",
        reference: b.reference,
        statusPill: {
          tone: ocularMeta.state === "completed" ? "success" : "info",
          label: ocularMeta.state === "completed" ? "Ocular Completed" : "Ocular Scheduled",
          icon: ocularMeta.state === "completed" ? CheckCircle2 : CalendarCheck
        },
        actionText: "View Booking Details",
        onAction: () => navigate(`/customer/bookings/${b._id}`),
      });
    });

    // 3. Payment Due & Overdue Payment (BLUE = Payment Due, RED = Overdue Payment)
    bookings.forEach((b) => {
      if (["cancelled", "refunded"].includes(b.status.toLowerCase())) return;
      const total = Number(b.total_price || 0);
      const paid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && p.status === "approved")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const balance = Math.max(0, total - paid);

      if (balance > 0) {
        const dueDateKey = formatDateToYYYYMMDD(b.event_date);
        if (!dueDateKey) return;

        const isOverdue = dueDateKey < todayKey;
        addToMap(dueDateKey, {
          id: `pay-${b._id}`,
          type: isOverdue ? "overdue_payment" : "payment_due",
          categoryLabel: isOverdue ? "Overdue Payment" : "Payment Due",
          title: `${recordTitle(b)}`,
          subtitle: `Booking Reference: ${b.reference || ""}`,
          balance: balance,
          dueDate: formatShortDate(b.event_date),
          reference: b.reference,
          statusPill: isOverdue
            ? { tone: "danger", label: "Overdue" }
            : { tone: "warning", label: "Payment Due" },
          actionText: "View Payment",
          onAction: () => navigate(`/customer/bookings/${b._id}?tab=financials`),
        });
      }
    });

    return map;
  }, [inquiries, bookings, payments, now, navigate]);

  return (
    <CustomerDashboardLayout>
      <div className="space-y-5">
        {/* ── High-Density Header ───────────────────────────────────────── */}
        <div className="pb-1 border-b border-slate-200/60">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of your catering bookings, quote requests, and event schedule.
          </p>
        </div>

        {/* ── High-Density Telemetry Metrics Grid (Exact Screenshot Card Style) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
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

        {/* ── Attention Queue (Only if action required, compact high-density) ── */}
        {!loading && actionRequiredItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Action Required ({actionRequiredItems.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionRequiredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.title}</h3>
                      <StatusPill tone={item.status.tone} label={item.status.label} icon={item.status.icon} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{formatEventDateTime(item.date, item.startTime)}</p>
                  </div>
                  <Button
                    onClick={item.onAction}
                    size="sm"
                    className={cn(
                      "shrink-0 font-semibold text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs",
                      item.isPayment
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : item.isOcular
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : "bg-[#2C4B8A] hover:bg-[#1E3563] text-white"
                    )}
                  >
                    {item.actionText}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Operational 2-Column Grid (High Density) ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7 cols): Next Event Card + Quick Service Shortcuts */}
          <div className="lg:col-span-7 space-y-4">
            {/* Your Next Event Card - Matching the exact StatTile style */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                  <span className="text-sm sm:text-base font-bold text-slate-800 font-sans">Your Next Event</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/customer/bookings")}
                  className="text-xs font-semibold text-[#2C4B8A] hover:bg-slate-50 cursor-pointer h-7 px-2 rounded-lg"
                >
                  All bookings <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              {loading ? (
                <LoadingState rows={1} label="Loading event details..." />
              ) : nextEvent ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-sans">{recordTitle(nextEvent)}</h3>
                    {nextEventStatus && (
                      <StatusPill tone={nextEventStatus.tone} label={nextEventStatus.label} icon={nextEventStatus.icon} />
                    )}
                  </div>

                  <DetailGrid
                    items={[
                      { label: "Date & Time", value: formatEventDateTime(nextEvent.event_date, nextEvent.start_time) },
                      { label: "Location", value: nextEvent.municipality || nextEvent.venue_type || "To be confirmed" },
                      { label: "Service", value: resolveServiceType(nextEvent) },
                      { label: "Guests", value: nextEvent.guest_count ? `${nextEvent.guest_count} guests` : "—" },
                      { label: "Reference", value: nextEvent.reference || "—", mono: true },
                      { label: "Total Cost", value: formatCurrency(nextEvent.total_price) },
                    ]}
                  />

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs rounded-full px-4 py-1.5 shadow-2xs cursor-pointer gap-1"
                      onClick={() => navigate(`/customer/bookings/${nextEvent._id}`)}
                    >
                      <span>View event workspace</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  className="border-0 py-4"
                  icon={CalendarClock}
                  title="No upcoming events scheduled"
                  description="Your confirmed event preparations and details will appear here."
                  action={
                    <Button
                      size="sm"
                      className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs rounded-full px-4 py-1.5 shadow-2xs cursor-pointer gap-1"
                      onClick={() => navigate("/packages")}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" /> Inquire now
                    </Button>
                  }
                />
              )}
            </div>

            {/* Quick Action Cards - Transformed into the EXACT StatTile Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card 1: Custom Quote */}
              <div
                onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-bold text-slate-800 font-sans">
                      Custom Event Quote
                    </span>
                    <Sparkles className="h-4 w-4 text-amber-500 stroke-[1.75]" />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    Customize your catering menu, guest count, and setup details.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#2C4B8A] group-hover:underline">
                  <span>Build quotation</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              {/* Card 2: Browse Packages */}
              <div
                onClick={() => navigate("/packages")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-bold text-slate-800 font-sans">
                      Browse Packages
                    </span>
                    <Utensils className="h-4 w-4 text-[#2C4B8A] stroke-[1.75]" />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    Explore curated all-inclusive packages, menus, and inclusions.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#2C4B8A] group-hover:underline">
                  <span>Explore packages</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Compact Interactive Calendar */}
          <div className="lg:col-span-5 flex flex-col">
            <CustomerCalendarCard
              eventsMap={calendarEventsMap}
              selectedDate={selectedCalendarDate}
              onSelectDate={(date, events) => {
                setSelectedCalendarDate(date);
                setSelectedDateEvents(events);
                setIsEventsModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* Date Events Dialog Modal */}
        <CustomerDateEventsModal
          isOpen={isEventsModalOpen}
          onClose={() => setIsEventsModalOpen(false)}
          selectedDate={selectedCalendarDate}
          events={selectedDateEvents}
        />
      </div>
    </CustomerDashboardLayout>
  );
}

