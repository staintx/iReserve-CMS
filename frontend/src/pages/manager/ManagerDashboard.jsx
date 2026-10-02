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
  UserPlus,
  Eye,
  MapPin,
} from "lucide-react";

const isPastDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

const getDateBadgeParts = (dateVal) => {
  if (!dateVal) return { month: "TBD", day: "—" };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { month: "TBD", day: "—" };
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate(),
  };
};

const formatShortDate = (dateVal) => {
  if (!dateVal) return "Date TBD";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/**
 * ActionRow: A clear, scannable event item for operational queues.
 * Distinguishes urgent pending staffing items from secondary ready items.
 */
function ActionRow({ booking, tone, primaryLabel, primaryIcon: PrimaryIcon, onOpen, onPrimary, secondary }) {
  const isPast = isPastDate(booking.event_date);
  const isUrgent = tone === "alert";
  const dateParts = getDateBadgeParts(booking.event_date);
  const venue = booking.venue_type || booking.venue || "Venue not set";

  return (
    <li
      className={`rounded-xl border transition-all ${
        isUrgent
          ? isPast
            ? "border-rose-200/90 bg-rose-50/40 hover:bg-rose-50/70"
            : "border-amber-200/90 bg-amber-50/30 hover:bg-amber-50/60 shadow-2xs"
          : "border-slate-200/80 bg-white hover:bg-slate-50/70 shadow-2xs"
      }`}
    >
      <div className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {/* Clickable Event Summary Block */}
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {/* Scannable Date Badge */}
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center shrink-0 shadow-2xs ${
              isUrgent
                ? isPast
                  ? "bg-rose-100/80 border-rose-200 text-rose-800"
                  : "bg-amber-100/70 border-amber-200 text-amber-900"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <span className="text-[10px] font-bold tracking-tight uppercase leading-none">{dateParts.month}</span>
            <span className="text-sm sm:text-base font-bold tabular-nums leading-none mt-0.5">{dateParts.day}</span>
          </div>

          {/* Event Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-[13.5px] font-bold text-slate-900 truncate">
                {booking.customer_id?.full_name || "Client"}
              </span>
              <span className="text-xs text-slate-500 font-medium">· {booking.event_type || "Event"}</span>
              {isPast && (
                <span
                  title="Event date has passed"
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0"
                >
                  <Clock size={10} className="text-rose-600" />
                  <span>Event Passed</span>
                </span>
              )}
              {!isUrgent && !isPast && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                  ✓ Team Ready
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Clock size={11} className="shrink-0 text-slate-400" />
                {secondary || booking.start_time || "Time TBA"}
              </span>
              <span aria-hidden="true" className="text-slate-300">•</span>
              <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-[240px]">
                <MapPin size={11} className="shrink-0 text-slate-400" />
                <span className="truncate">{venue}</span>
              </span>
            </div>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0 border-t border-slate-200/60 sm:border-t-0">
          <button
            type="button"
            onClick={onOpen}
            title="View event details"
            aria-label="View event details"
            className="h-9 w-9 shrink-0 grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <Eye size={14} />
          </button>

          {isUrgent ? (
            /* Primary Urgent Action (Royal Blue #4C81E0 for high prominence) */
            <button
              type="button"
              onClick={onPrimary}
              className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer portal-press sm:min-h-9 sm:flex-initial ${
                isPast
                  ? "bg-slate-700 hover:bg-slate-800"
                  : "bg-[#4C81E0] hover:bg-[#3b6bc4]"
              }`}
            >
              {PrimaryIcon ? <PrimaryIcon size={14} /> : <UserPlus size={14} />}
              <span>{isPast ? "Log Past Staff" : primaryLabel || "Assign Team"}</span>
              <ArrowRight size={13} className="opacity-80" />
            </button>
          ) : (
            /* Secondary Action for already staffed items */
            <button
              type="button"
              onClick={onPrimary}
              className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer sm:min-h-9 sm:flex-initial"
            >
              {PrimaryIcon ? <PrimaryIcon size={14} className="text-emerald-600" /> : <UserCheck size={14} className="text-emerald-600" />}
              <span>{primaryLabel || "Edit Staff"}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * QueueCard: Container for action queues with distinct visual weight.
 */
function QueueCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  count,
  countLabel,
  countClass,
  emptyCopy,
  isUrgent = false,
  children,
}) {
  return (
    <AdminCard
      className={`space-y-3 !p-3.5 sm:!p-4.5 rounded-2xl border transition-all ${
        isUrgent
          ? "border-amber-300/80 bg-white ring-1 ring-amber-400/20 shadow-xs"
          : "border-border/80 bg-white shadow-2xs"
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isUrgent ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-[#4C81E0]"
              }`}
            >
              <Icon size={15} className={iconClass} />
            </span>
            <span>{title}</span>
          </h2>
          {subtitle && <p className="text-[11.5px] text-slate-500 mt-0.5 ml-9">{subtitle}</p>}
        </div>
        <span className={`shrink-0 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${countClass}`}>
          {count} {countLabel}
        </span>
      </div>

      {count === 0 ? (
        <div className="py-6 text-center space-y-1">
          <p className="text-xs font-medium text-slate-600">{emptyCopy}</p>
        </div>
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
        {/* Page Header */}
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

        {/* Top KPI Cards (Top section) */}
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 sm:gap-3">
          <KPICard
            label="Assigned Events"
            value={loading ? "—" : summary.counts.assigned}
            sub="Under your management"
            icon={CalendarIcon}
            tone="neutral"
            onClick={() => navigate("/manager/bookings")}
          />
          <KPICard
            label="Needs Staffing"
            value={loading ? "—" : summary.counts.unassigned}
            sub="Action required"
            icon={Users}
            tone={summary.counts.unassigned > 0 ? "warning" : "success"}
            onClick={() => navigate("/manager/bookings?staffing=unassigned")}
          />
          <KPICard
            label="Today's Events"
            value={loading ? "—" : summary.counts.today}
            sub="Scheduled today"
            icon={Clock}
            tone="info"
            onClick={() => navigate("/manager/bookings?date=today")}
          />
          <KPICard
            label="Completed Events"
            value={loading ? "—" : summary.counts.completed}
            sub="This month"
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate("/manager/bookings?status=completed")}
          />
        </div>

        {/* Main Section Directly Below KPIs: Event Staffing & Logistics Schedule / Calendar */}
        <section aria-label="Event Staffing and Logistics Schedule">
          <ManagerEventCalendar
            onSelectBooking={(b) => openEvent(b.id || b._id)}
          />
        </section>

        {/* Action Queues Directly Below the Calendar */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Pending Staff Assignment (Visually More Prominent - Urgent Actions) */}
          <QueueCard
            icon={AlertCircle}
            iconClass="text-amber-600"
            title="Pending Staff Assignment"
            subtitle="Events needing crew dispatched before event date"
            count={pending.length}
            countLabel={pending.length === 1 ? "needs crew" : "need crew"}
            countClass="border-amber-300 bg-amber-100 text-amber-800"
            emptyCopy="All assigned events currently have teams dispatched."
            isUrgent={true}
          >
            {pending.map((booking) => (
              <ActionRow
                key={booking._id}
                booking={booking}
                tone="alert"
                primaryLabel="Assign Team"
                primaryIcon={UserPlus}
                secondary={booking.start_time || "Time TBA"}
                onOpen={() => openEvent(booking._id)}
                onPrimary={() => openAssign(booking._id)}
              />
            ))}
          </QueueCard>

          {/* Upcoming Scheduled Events (Visually Secondary - Already Staffed) */}
          <QueueCard
            icon={CalendarIcon}
            iconClass="text-[#4C81E0]"
            title="Upcoming Scheduled Events"
            subtitle="Confirmed bookings with crew already assigned"
            count={upcoming.length}
            countLabel="ready"
            countClass="border-slate-200 bg-slate-100 text-slate-700"
            emptyCopy="No upcoming events ready yet."
            isUrgent={false}
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
    </ManagerLayout>
  );
}
