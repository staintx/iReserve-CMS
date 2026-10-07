import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";
import { Button } from "../../components/ui/button";
import StatTile from "../../components/customer/portal/StatTile";
import StatusPill from "../../components/customer/portal/StatusPill";
import LoadingState from "../../components/customer/portal/LoadingState";
import DetailGrid from "../../components/customer/portal/DetailGrid";
import {
  bookingStatusMeta,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEventDateTime, formatShortDate, formatDateToYYYYMMDD } from "../../utils/format";
import CustomerCalendarCard from "../../components/customer/portal/CustomerCalendarCard";
import CustomerDateEventsModal from "../../components/customer/portal/CustomerDateEventsModal";
import {
  CalendarClock,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  FileText,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Sparkles,
  CreditCard,
  Utensils,
  ChevronDown,
  ChevronUp,
  AlertCircle
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
  const [showAllActions, setShowAllActions] = useState(false);

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

  useRealTimeRefresh((, ["booking","inquiry","quotation","payment","conversation","systemLog","businessInfo"]) => loadData(true));

  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateToYYYYMMDD(now), [now]);

  // Filter Active Inquiries
  const activeInquiries = useMemo(() => {
    return inquiries.filter(i => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status));
  }, [inquiries]);

  // Confirmed / Upcoming Events
  const upcomingEvents = useMemo(() => {
    return bookings.filter(b => ["confirmed", "preparing", "ongoing"].includes(b.status) && new Date(b.event_date) >= now);
  }, [bookings, now]);

  // Total balance calculation
  const totalBalanceDue = useMemo(() => {
    return bookings.reduce((sum, b) => {
      if (["cancelled", "refunded"].includes(b.status)) return sum;
      const total = Number(b.total_price || 0);
      const paid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && p.status === "approved")
        .reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      return sum + Math.max(0, total - paid);
    }, 0);
  }, [bookings, payments]);

  // Action required items: Prioritized customer actions
  const actionRequiredItems = useMemo(() => {
    const items = [];

    // 1. Overdue & Balance Due Payments for Bookings
    bookings.forEach((b) => {
      if (["cancelled", "refunded"].includes((b.status || "").toLowerCase())) return;
      const total = Number(b.total_price || 0);
      const paid = payments
        .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && p.status === "approved")
        .reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      const balance = Math.max(0, total - paid);

      if (balance > 0) {
        const dueDateKey = formatDateToYYYYMMDD(b.event_date);
        const isOverdue = dueDateKey && dueDateKey < todayKey;
        const isDepositStage = (b.status || "").toLowerCase().includes("deposit") || paid === 0;

        items.push({
          type: "payment",
          id: `pay-${b._id}`,
          priority: isOverdue ? 100 : 80,
          title: recordTitle(b),
          date: b.event_date,
          startTime: b.start_time,
          status: isOverdue
            ? { tone: "danger", label: "Overdue Payment" }
            : { tone: "warning", label: isDepositStage ? "Deposit Due" : "Balance Due" },
          description: isOverdue
            ? `Past due balance of ${formatCurrency(balance)}`
            : `${formatCurrency(balance)} remaining balance`,
          actionText: isDepositStage ? "Pay deposit" : "Pay balance",
          isPayment: true,
          isOverdue,
          onAction: () => navigate(`/customer/payments`)
        });
      }
    });

    // 2. Inquiries: Quotation Ready to review
    inquiries.forEach((i) => {
      if (i.status === "Quotation Sent") {
        const status = inquiryStatusMeta(i);
        items.push({
          type: "inquiry",
          id: `inq-${i._id}`,
          priority: 60,
          title: recordTitle(i),
          date: i.event_date,
          startTime: i.start_time,
          status: { tone: "info", label: "Quotation Ready" },
          description: "Review and approve your custom quote",
          actionText: "Review quote",
          isQuote: true,
          onAction: () => navigate(`/customer/inquiries/${i._id}`)
        });
      } else if (i.status === "Revision Requested") {
        items.push({
          type: "inquiry_revision",
          id: `inq-rev-${i._id}`,
          priority: 50,
          title: recordTitle(i),
          date: i.event_date,
          startTime: i.start_time,
          status: { tone: "info", label: "Revision in Progress" },
          description: "Our catering team is updating your quote",
          actionText: "View request",
          isQuote: true,
          onAction: () => navigate(`/customer/inquiries/${i._id}`)
        });
      }
    });

    // 3. Ocular Needed Bookings
    bookings.forEach((b) => {
      if (["cancelled", "completed", "refunded"].includes((b.status || "").toLowerCase())) return;
      const oMeta = getBookingOcularActionMeta(b);
      if (oMeta?.state === "action_required") {
        items.push({
          type: "ocular",
          id: `ocular-${b._id}`,
          priority: 40,
          title: recordTitle(b),
          date: b.event_date,
          startTime: b.start_time,
          status: { tone: "warning", label: "Venue Inspection" },
          description: "Select a date for site visit",
          actionText: "Schedule ocular",
          isOcular: true,
          onAction: () => navigate(`/customer/bookings/${b._id}`)
        });
      }
    });

    // Sort by priority descending, then date
    return items.sort((a, b) => b.priority - a.priority);
  }, [inquiries, bookings, payments, todayKey, navigate]);

  // Display top 4 actionable items unless expanded
  const displayedActionItems = useMemo(() => {
    if (showAllActions) return actionRequiredItems;
    return actionRequiredItems.slice(0, 4);
  }, [actionRequiredItems, showAllActions]);

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

    // 1. Inquiries
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
        location: inq.municipality || [inq.barangay, inq.municipality].filter(Boolean).join(", ") || inq.venue_address || "To be confirmed",
        guests: inq.guest_count,
        reference: inq.reference,
        statusPill: statusMeta ? { tone: statusMeta.tone, label: statusMeta.label, icon: statusMeta.icon } : null,
        actionText: "View Inquiry",
        onAction: () => navigate(`/customer/inquiries/${inq._id}`),
      });
    });

    // 2. Bookings
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
          location: b.municipality || [b.barangay, b.municipality].filter(Boolean).join(", ") || b.venue_address || "Venue confirmed",
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
          location: b.municipality || [b.barangay, b.municipality].filter(Boolean).join(", ") || b.venue_address || "Venue confirmed",
          guests: b.guest_count,
          reference: b.reference,
          statusPill: statusMeta ? { tone: statusMeta.tone, label: statusMeta.label, icon: statusMeta.icon } : null,
          ocularReminder: ocularMeta?.state === "action_required" ? "Action Required: Ocular visit needs to be scheduled" : null,
          actionText: "View Booking",
          onAction: () => navigate(`/customer/bookings/${b._id}`),
        });
      }
    });

    // 2b. Ocular Visits
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

    // 3. Payment Due & Overdue Payment
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
          onAction: () => navigate(`/customer/payments`),
        });
      }
    });

    return map;
  }, [inquiries, bookings, payments, todayKey, navigate]);

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-[#F8FAFC] flex flex-col font-sans antialiased overflow-hidden">
        {/* ── Contained Top Page Header (Matches Inquiries / Bookings Style) ── */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Welcome back, {firstName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Overview of your catering bookings, quote requests, and event schedule.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/packages")}
              className="bg-[#4C81E0] hover:bg-[#3B6EC6] text-white shadow-xs rounded-xl font-bold text-xs h-9 px-4 shrink-0 cursor-pointer transition-all active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              <span>New Request</span>
            </Button>
          </div>
        </div>

        {/* ── Main Scrollable Content Workspace ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-[1400px] mx-auto">
          {/* ── Summary Metrics Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
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
              onClick={() => navigate("/customer/payments")}
              className={totalBalanceDue > 0 ? "border-amber-200/90" : undefined}
            />
          </div>

          {/* ── Attention Queue (Prioritized, max 3-5 items with View All) ── */}
          {!loading && actionRequiredItems.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">
                    Action Required
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {actionRequiredItems.length}
                  </span>
                </div>

                {actionRequiredItems.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllActions(prev => !prev)}
                    className="text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{showAllActions ? "Show less" : `View all (${actionRequiredItems.length})`}</span>
                    {showAllActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedActionItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all",
                      item.isOverdue
                        ? "border-rose-200 bg-rose-50/30 hover:border-rose-300"
                        : item.isPayment
                        ? "border-amber-200/80 bg-amber-50/20 hover:border-amber-300"
                        : "border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-white"
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-sans">
                          {item.title}
                        </h4>
                        <StatusPill tone={item.status.tone} label={item.status.label} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.description}
                      </p>
                      {item.date && (
                        <p className="text-[11px] text-slate-400 font-medium">
                          {formatEventDateTime(item.date, item.startTime)}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={item.onAction}
                      size="sm"
                      className={cn(
                        "shrink-0 font-semibold text-xs px-3.5 h-8 rounded-lg transition-all cursor-pointer shadow-2xs",
                        item.isOverdue
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : item.isPayment
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : item.isOcular
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : "bg-[#4C81E0] hover:bg-[#3B6EC6] text-white"
                      )}
                    >
                      {item.actionText}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Main Operational 2-Column Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (7 cols): Next Event Card + Quick Actions */}
            <div className="lg:col-span-7 space-y-4">
              {/* Your Next Event Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-slate-400 stroke-[1.75]" />
                    <span className="text-sm sm:text-base font-bold text-slate-900 font-sans">Your Next Event</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/customer/bookings")}
                    className="text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] hover:bg-blue-50 cursor-pointer h-7 px-2 rounded-lg"
                  >
                    <span>All bookings</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
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
                        { label: "Location", value: nextEvent.municipality || nextEvent.venue_address || "To be confirmed" },
                        ...(nextEvent.venue_type ? [{ label: "Venue Type", value: nextEvent.venue_type }] : []),
                        { label: "Service", value: resolveServiceType(nextEvent) },
                        { label: "Guests", value: nextEvent.guest_count ? `${nextEvent.guest_count} guests` : "—" },
                        { label: "Reference", value: nextEvent.reference || "—", mono: true },
                        { label: "Total Cost", value: formatCurrency(nextEvent.total_price) },
                      ]}
                    />

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        className="bg-[#4C81E0] hover:bg-[#3B6EC6] text-white font-semibold text-xs rounded-xl px-4 h-8 shadow-2xs cursor-pointer gap-1"
                        onClick={() => navigate(`/customer/bookings/${nextEvent._id}`)}
                      >
                        <span>View event workspace</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Tightened Empty State (Minimal vertical space) */
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#4C81E0] flex items-center justify-center shrink-0 border border-blue-100">
                        <CalendarClock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">No upcoming events scheduled</h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">Confirmed event reservations and preparations will appear here.</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate("/packages")}
                      className="bg-[#4C81E0] hover:bg-[#3B6EC6] text-white text-xs font-semibold rounded-lg px-3.5 h-8 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      <span>Inquire now</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Actions (Positioned below Next Event) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Card 1: Custom Quote */}
                <div
                  onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm sm:text-base font-bold text-slate-900 font-sans">
                        Custom Event Quote
                      </span>
                      <Sparkles className="h-4 w-4 text-amber-500 stroke-[1.75]" />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      Customize your catering menu, guest count, and setup details.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#4C81E0] group-hover:text-[#3B6EC6]">
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
                      <span className="text-sm sm:text-base font-bold text-slate-900 font-sans">
                        Browse Packages
                      </span>
                      <Utensils className="h-4 w-4 text-[#4C81E0] stroke-[1.75]" />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      Explore curated all-inclusive packages, menus, and inclusions.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#4C81E0] group-hover:text-[#3B6EC6]">
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


