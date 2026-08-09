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
import { formatEventDateTime, formatShortDate } from "../../utils/format";
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
} from "lucide-react";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
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
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useRealTimeRefresh(loadData);

  const now = useMemo(() => new Date(), []);

  // Filter Active Inquiries (not converted/cancelled)
  const activeInquiries = useMemo(() => {
    return inquiries.filter(i => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status));
  }, [inquiries]);

  // Action required items: Quotations sent to customer OR bookings pending deposit.
  // Status wording and icons come from the shared vocabulary so a record looks
  // identical here and on its own list page.
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

  const nextEvent = upcomingEvents[0] || bookings.find(b => b.status === "confirmed");
  const nextEventStatus = nextEvent ? bookingStatusMeta(nextEvent) : null;
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";

  // Tones match the destination, so the same colour means the same thing here
  // as it does on the stat tiles and the cards themselves.
  const quickActions = [
    {
      label: "Request a quote",
      description: "Tell us about your event",
      icon: PlusCircle,
      tone: "info",
      onClick: () => navigate("/customer/book", { state: { resetWizard: true } })
    },
    {
      label: "My inquiries",
      description: "Quote requests and their status",
      icon: FileText,
      tone: "warning",
      onClick: () => navigate("/customer/inquiries")
    },
    {
      label: "My bookings",
      description: "Reserved events and payments",
      icon: Calendar,
      tone: "success",
      onClick: () => navigate("/customer/bookings")
    },
    {
      label: "Messages",
      description: unreadCount > 0 ? `${unreadCount} unread` : "Chat with our team",
      icon: MessageSquare,
      tone: "comms",
      badge: unreadCount > 0,
      onClick: () => navigate("/customer/messages")
    }
  ];

  return (
    <CustomerDashboardLayout
      title={`Welcome back${firstName ? ", " + firstName : ""}`}
      subtitle="Here's where your events and quote requests stand today."
      actions={
        <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>
          <PlusCircle className="h-4 w-4" /> Request a quote
        </Button>
      }
    >
      {/* Overview numbers — each one is a shortcut into the matching list */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={FileText}
          tone="warning"
          label="Quote requests"
          value={activeInquiries.length}
          hint="Still open"
          onClick={() => navigate("/customer/inquiries")}
        />
        <StatTile
          icon={Calendar}
          tone="success"
          label="Upcoming events"
          value={upcomingEvents.length}
          hint="Confirmed and reserved"
          onClick={() => navigate("/customer/bookings")}
        />
        <StatTile
          icon={MessageSquare}
          tone="comms"
          label="Unread messages"
          value={unreadCount}
          hint="From our team"
          onClick={() => navigate("/customer/messages")}
        />
        <StatTile
          icon={CheckCircle2}
          tone="neutral"
          label="Completed events"
          value={completedEvents.length}
          hint="Past celebrations"
          onClick={() => navigate("/customer/bookings")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Only shown when there is genuinely something to do */}
          {!loading && actionRequiredItems.length > 0 && (
            <PortalSection
              title={`Needs your attention (${actionRequiredItems.length})`}
              description="A short list of the things waiting on you."
              bodyClassName="space-y-3"
            >
              {actionRequiredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-sans text-sm font-semibold text-foreground">{item.title}</h3>
                      <StatusPill tone={item.status.tone} label={item.status.label} icon={item.status.icon} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{formatEventDateTime(item.date, item.startTime)}</p>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  </div>

                  {/* Paying is the money action, so it carries the amber; the
                      rest are ordinary next steps and stay primary blue. */}
                  <Button onClick={item.onAction} className={cn("shrink-0", item.isPayment && ACTION_PAY)}>
                    {item.actionText}
                  </Button>
                </div>
              ))}
            </PortalSection>
          )}

          {/* Next event */}
          <PortalSection
            title="Your next event"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/customer/bookings")} className="text-primary">
                All bookings <ArrowRight className="h-4 w-4" />
              </Button>
            }
          >
            {loading ? (
              <LoadingState rows={1} label="Loading your next event" />
            ) : nextEvent ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="font-serif text-xl font-bold text-foreground">{recordTitle(nextEvent)}</h3>
                  {nextEventStatus && (
                    <StatusPill tone={nextEventStatus.tone} label={nextEventStatus.label} icon={nextEventStatus.icon} />
                  )}
                </div>

                <DetailGrid
                  items={[
                    { label: "Date and time", value: formatEventDateTime(nextEvent.event_date, nextEvent.start_time) },
                    { label: "Location", value: nextEvent.municipality || nextEvent.venue_type || "To be confirmed" },
                    { label: "Service", value: nextEvent.package_name || resolveServiceType(nextEvent) },
                    { label: "Guests", value: nextEvent.guest_count ? `${nextEvent.guest_count} guests` : "—" },
                    { label: "Reference", value: nextEvent.reference || "—", mono: true },
                    { label: "Booked on", value: formatShortDate(nextEvent.createdAt) },
                  ]}
                />

                <div className="flex justify-end border-t border-border pt-4">
                  <Button onClick={() => navigate(`/customer/bookings/${nextEvent._id}`)}>
                    View event details <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                className="border-0 py-8"
                icon={CalendarClock}
                title="No upcoming events yet"
                description="Once a quote is accepted and confirmed, your next event will show up here."
                action={
                  <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>
                    <PlusCircle className="h-4 w-4" /> Request a quote
                  </Button>
                }
              />
            )}
          </PortalSection>

          {/* Reassurance when nothing needs doing */}
          {!loading && actionRequiredItems.length === 0 && (activeInquiries.length > 0 || upcomingEvents.length > 0) && (
            <StateNotice tone="success" icon={Sparkles} title="You're all set.">
              Nothing needs your attention right now — we'll let you know as soon as something does.
            </StateNotice>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <PortalSection title="Quick actions" bodyClassName="space-y-2.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      TONE_ACCENT[action.tone] || TONE_ACCENT.neutral
                    )}
                  >
                    <action.icon className="h-[18px] w-[18px]" />
                    {action.badge && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-destructive" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            ))}
          </PortalSection>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
