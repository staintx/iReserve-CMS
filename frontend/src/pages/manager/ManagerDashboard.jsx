import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import PageHeader from "../../components/admin/ui/PageHeader";
import Btn from "../../components/admin/ui/Btn";
import ManagerEventCalendar from "../../components/dashboard/ManagerEventCalendar";
import useToast from "../../hooks/useToast";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  AlertTriangle,
  Users,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  Eye,
} from "lucide-react";

const isPastDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

/**
 * One row of the two action queues.
 *
 * On a phone it is a single tappable row: the whole card opens the event,
 * and only the queue's own verb ("Assign Team", "Edit Staff") stays as a
 * separate button. The previous layout put a "View" and an action button
 * side by side at 38px tall, which spent a third of the row on a duplicate
 * of the tap the row itself should already have performed.
 */
function ActionRow({ booking, tone, primaryLabel, primaryIcon: PrimaryIcon, onOpen, onPrimary, secondary }) {
  const isPast = isPastDate(booking.event_date);

  return (
    <li
      className={`rounded-lg border shadow-2xs ${
        tone === "alert"
          ? isPast
            ? "border-rose-200/80 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20"
            : "border-amber-200/80 bg-amber-50/40"
          : "border-border/80 bg-card"
      }`}
    >
      <div className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-[13px] sm:text-xs font-bold text-foreground">
              {booking.customer_id?.full_name || "Customer"}
            </span>
            <span className="text-xs text-muted-foreground">· {booking.event_type || "Event"}</span>
            {isPast && (
              <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertTriangle size={9} /> Event Passed
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted-foreground">
            <span className="font-medium text-foreground/80">{shortDate(booking.event_date)}</span>
            <span aria-hidden="true">•</span>
            <span className="truncate">{secondary}</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            aria-label="View event details"
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground cursor-pointer sm:grid"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className={`flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold shadow-2xs transition-colors cursor-pointer portal-press sm:min-h-9 sm:flex-initial ${
              tone === "alert"
                ? isPast
                  ? "bg-slate-700 text-white hover:bg-slate-800"
                  : "bg-amber-600 text-white hover:bg-amber-700"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {PrimaryIcon && <PrimaryIcon size={14} />}
            <span>{isPast && tone === "alert" ? "Log Staff" : primaryLabel}</span>
            {tone === "alert" && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </li>
  );
}

function QueueCard({ icon, iconClass, title, count, countLabel, countClass, emptyCopy, children }) {
  const Icon = icon;
  return (
    <AdminCard className="space-y-3 !p-3 sm:!p-4.5">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-foreground">
          <Icon className={iconClass} size={15} />
          <span className="truncate">{title}</span>
        </h2>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-[10.5px] font-bold tabular-nums ${countClass}`}>
          {count} {countLabel}
        </span>
      </div>
      {count === 0 ? (
        <p className="py-4 text-center text-xs italic text-muted-foreground">{emptyCopy}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </AdminCard>
  );
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0, assigned: 0, unassigned: 0, today: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ManagerAPI.getSummary()
      .then((res) => {
        setSummary({
          counts: res.data?.counts || { pending: 0, upcoming: 0, completed: 0, assigned: 0, unassigned: 0, today: 0 },
          quickActions: res.data?.quickActions || { pending: [], upcoming: [] },
          calendarEvents: res.data?.calendarEvents || [],
        });
      })
      .catch(() => notify("Failed to load manager operations summary.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const pending = summary.quickActions.pending || [];
  const upcoming = summary.quickActions.upcoming || [];

  const openEvent = (id) => navigate(`/manager/bookings?booking_id=${id}&action=view`);
  const openAssign = (id) => navigate(`/manager/bookings?booking_id=${id}&action=assign`);

  return (
    <ManagerLayout>
      <div className="space-y-4">
        <PageHeader
          title="Manager Operations"
          description="Coordinate catering logistics, dispatch staff teams, and monitor event readiness"
          actions={
            <>
              <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/staff")}>
                <Users className="h-4 w-4" /> View Staff Roster
              </Btn>
              <Btn variant="primary" size="sm" onClick={() => navigate("/manager/bookings")}>
                <CalendarIcon className="h-4 w-4" /> All Assigned Events
              </Btn>
            </>
          }
        />

        {/* Each tile is the entrance to the list it counts. They were already
            written as if they were — the dashboard passed an onClick that the
            card silently dropped — so this makes the affordance real. */}
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 sm:gap-3">
          <KPICard
            label="Total Assigned"
            value={loading ? "—" : summary.counts.assigned}
            sub="Active operations"
            icon={CalendarIcon}
            tone="neutral"
            onClick={() => navigate("/manager/bookings")}
          />
          <KPICard
            label="Needs Staffing"
            value={loading ? "—" : summary.counts.unassigned}
            sub="Action required"
            icon={Users}
            tone={summary.counts.unassigned > 0 ? "danger" : "success"}
            onClick={() => navigate("/manager/bookings?staffing=unassigned")}
          />
          <KPICard
            label="Today's Shifts"
            value={loading ? "—" : summary.counts.today}
            sub="Events today"
            icon={Clock}
            tone="info"
            onClick={() => navigate("/manager/bookings?date=today")}
          />
          <KPICard
            label="Events Completed"
            value={loading ? "—" : summary.counts.completed}
            sub="This month"
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate("/manager/bookings?status=completed")}
          />
        </div>

        {/* The two queues come before the calendar on a phone and after it on
            a wide screen. A manager opening this on the way to a venue wants
            the list of events still missing a crew, not a month grid; at desk
            width both fit above the fold and the calendar reads as the frame
            the queues sit inside. */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="order-2 lg:order-1">
            <ManagerEventCalendar
              onSelectBooking={(b) => openEvent(b.id || b._id)}
            />
          </div>

          <div className="order-1 grid grid-cols-1 gap-3 lg:order-2 lg:grid-cols-2 lg:gap-4">
            <QueueCard
              icon={AlertCircle}
              iconClass="text-amber-600"
              title="Pending Staff Assignment"
              count={pending.length}
              countLabel="to staff"
              countClass="border-amber-200 bg-amber-50 text-amber-700"
              emptyCopy="All assigned events currently have teams dispatched."
            >
              {pending.map((booking) => (
                <ActionRow
                  key={booking._id}
                  booking={booking}
                  tone="alert"
                  primaryLabel="Assign Team"
                  secondary={booking.venue_type || "Venue"}
                  onOpen={() => openEvent(booking._id)}
                  onPrimary={() => openAssign(booking._id)}
                />
              ))}
            </QueueCard>

            <QueueCard
              icon={CalendarIcon}
              iconClass="text-blue-600"
              title="Upcoming Scheduled Events"
              count={upcoming.length}
              countLabel="ready"
              countClass="border-blue-200 bg-blue-50 text-blue-700"
              emptyCopy="No upcoming events ready yet."
            >
              {upcoming.map((booking) => (
                <ActionRow
                  key={booking._id}
                  booking={booking}
                  tone="calm"
                  primaryLabel="Edit Staff"
                  primaryIcon={UserCheck}
                  secondary={booking.start_time || "Time TBA"}
                  onOpen={() => openEvent(booking._id)}
                  onPrimary={() => openAssign(booking._id)}
                />
              ))}
            </QueueCard>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
