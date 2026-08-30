import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import PageHeader from "../../components/admin/ui/PageHeader";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { getSocket } from "../../api/socket";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  PackageCheck, 
  CalendarDays, 
  ArrowRight,
  UserCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Phone,
  Lock,
  Sparkles
} from "lucide-react";
import { getEventTimingStatus } from "../../utils/format";


const buildCalendar = (year, monthIndex) => {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = firstDay.getDay();
  const days = [];

  for (let i = 0; i < startOffset; i += 1) {
    days.push({ label: "", date: null });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({ label: String(day), date: new Date(year, monthIndex, day) });
  }

  return days;
};

const toDateKey = (date) => date.toLocaleDateString("en-CA");

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Availability schedule
  const [calendar, setCalendar] = useState({ month: "", unavailable: [], assignments: [] });
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  /* The availability sheet is addressable. It is the crew's second recurring
     job after reading their shifts, so the mobile tab bar links straight to
     it — which only works if the open state lives in the URL rather than in
     a local boolean the tab bar cannot reach. The desktop button opens the
     same query, so both entrances are one code path. */
  const [searchParams, setSearchParams] = useSearchParams();
  const showCalendar = searchParams.get("availability") === "1";
  const setShowCalendar = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("availability", "1");
    else params.delete("availability");
    setSearchParams(params, { replace: true });
  };
  const [savingAvailability, setSavingAvailability] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    StaffAPI.getBookings("active")
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load assigned events.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleRefresh = (data) => {
      if (!data || data.type === "booking" || data.type === "staff") {
        loadBookings();
      }
    };

    socket.on("system:refresh", handleRefresh);
    socket.on("notification:new", handleRefresh);
    return () => {
      socket.off("system:refresh", handleRefresh);
      socket.off("notification:new", handleRefresh);
    };
  }, []);

  const monthKey = useMemo(() => {
    return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarMonth]);

  useEffect(() => {
    StaffAPI.getAvailability(monthKey)
      .then((res) => {
        setCalendar(res.data);
        setSelectedDates(new Set(res.data.unavailable || []));
      })
      .catch(() => {
        setCalendar({ month: monthKey, unavailable: [], assignments: [] });
        setSelectedDates(new Set());
      });
  }, [monthKey, showCalendar]);

  const calendarDays = useMemo(() => buildCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const assignmentsByDate = useMemo(() => {
    const map = {};
    (calendar.assignments || []).forEach((item) => {
      const dateKey = toDateKey(new Date(item.date));
      map[dateKey] = item;
    });
    return map;
  }, [calendar.assignments]);

  const toggleDate = (date) => {
    if (!date) return;
    const dateKey = toDateKey(date);
    if (assignmentsByDate[dateKey]) return; // Cannot mark unavailable on assigned day

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const saveAvailability = () => {
    setSavingAvailability(true);
    StaffAPI.setAvailability(monthKey, Array.from(selectedDates))
      .then(() => {
        notify("Your monthly availability has been updated.", "success");
        setShowCalendar(false);
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not save availability.", "error");
      })
      .finally(() => setSavingAvailability(false));
  };

  const getMyAssignedRole = (booking) => {
    const assignments = booking.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id?._id || item.user_id) === String(user?._id));
    return match?.role || user?.position || "Crew";
  };

  const nextUpcomingBooking = useMemo(() => {
    if (bookings.length === 0) return null;
    const now = new Date();
    const sorted = [...bookings].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    return sorted[0];
  }, [bookings]);

  // Shown in the availability sheet footer: on a phone the marked days
  // scroll out of view above the pinned Save, so the count is the receipt.
  const offDayCount = useMemo(
    () => Array.from(selectedDates).filter((key) => !assignmentsByDate[key]).length,
    [selectedDates, assignmentsByDate]
  );

  const verifiableEventsCount = useMemo(() => {
    return bookings.filter((b) => getEventTimingStatus(b).isStarted).length;
  }, [bookings]);

  return (
    <StaffLayout>
      <div className="space-y-4">


        <PageHeader
          title="My Shifts"
          description="Your assigned event schedules, briefings, and catering equipment checks"
          actions={
            <Btn variant="secondary" size="sm" onClick={() => setShowCalendar(true)}>
              <CalendarDays size={14} className="text-primary" />
              My Availability Calendar
            </Btn>
          }
        />

        {/* Top KPI Cards (2x2 on mobile, 4-col on desktop) */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
          <KPICard
            label="Active Shifts"
            value={loading ? "..." : bookings.length || 0}
            sub="Assigned to you"
            icon={ClipboardList}
            tone="info"
          />
          <KPICard
            label="Next Shift"
            value={nextUpcomingBooking?.event_date ? new Date(nextUpcomingBooking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "None"}
            sub={nextUpcomingBooking?.start_time || "No immediate shifts"}
            icon={CalendarIcon}
            tone={nextUpcomingBooking ? "warning" : "neutral"}
          />
          <KPICard
            label="My Position"
            value={user?.position || "Staff Crew"}
            sub="Active Roster"
            icon={UserCheck}
            tone="neutral"
          />
          <KPICard
            label="Gear Check"
            value={verifiableEventsCount > 0 ? `${verifiableEventsCount} Active` : "Locked"}
            sub={verifiableEventsCount > 0 ? "Ready for return" : "Opens at start"}
            icon={PackageCheck}
            tone={verifiableEventsCount > 0 ? "success" : "neutral"}
          />
        </div>

        {/* Assigned shifts. Each shift is one card whose body opens the
            briefing; the gear check stays a separate control because it is a
            different job with a different precondition — it is genuinely
            locked until the event starts, and a lock has to be visible to
            explain itself. Phase, venue and lead are ordered the way a crew
            member reads them on the way to a job: when, where, who to call. */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ClipboardList className="text-primary" size={16} />
              Assigned Event List
            </h2>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {bookings.length} shift{bookings.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <AdminCard className="!p-10 text-center text-xs text-muted-foreground">
              Loading your assigned shifts…
            </AdminCard>
          ) : bookings.length === 0 ? (
            <AdminCard className="!p-8 sm:!p-10 text-center space-y-2.5">
              <CalendarIcon size={28} className="mx-auto text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">No active event assignments</h3>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
                Your Event Manager has not assigned you to a catering event yet. Once you are added
                to a booking team it will appear here.
              </p>
              <div className="pt-1">
                <Btn variant="secondary" size="sm" onClick={() => setShowCalendar(true)}>
                  <CalendarDays size={14} className="text-primary" />
                  Set my availability
                </Btn>
              </div>
            </AdminCard>
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
              {bookings.map((booking) => {
                const role = getMyAssignedRole(booking);
                const equipmentCount = (booking.equipment_returns || booking.inventory_items || []).length;
                const managerName = booking.event_manager_id?.full_name || "Assigned Manager";
                const managerPhone = booking.event_manager_id?.phone;
                const timing = getEventTimingStatus(booking);
                const locationAddress =
                  [booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") ||
                  "Location TBA";

                return (
                  <li key={booking._id}>
                    <AdminCard className="!p-0 overflow-hidden transition-all hover:border-primary/50">
                      <button
                        type="button"
                        onClick={() => navigate(`/staff/events/${booking._id}`)}
                        className="w-full space-y-2.5 p-3 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:p-4"
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                              <UserCheck size={12} className="text-amber-700" />
                              {role}
                            </span>

                            {timing.isUpcoming && (
                              <span className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <Lock size={11} className="text-slate-500" />
                                Upcoming
                              </span>
                            )}
                            {timing.isStarted && !timing.isFinished && (
                              <span className="flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                                <Sparkles size={11} className="text-emerald-600" />
                                In progress
                              </span>
                            )}
                            {timing.isFinished && (
                              <span className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-100 px-2 py-0.5 text-[10.5px] font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-200">
                                <CheckCircle2 size={11} className="text-blue-600" />
                                Ready for return check
                              </span>
                            )}
                          </span>
                          <Badge status={booking.status || "confirmed"} />
                        </span>

                        <span className="block">
                          <span className="block text-[15px] font-bold leading-tight text-foreground sm:text-sm">
                            {booking.event_type || "Catering Event"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {booking.customer_id?.full_name || "Valued Client"} · REF{" "}
                            <span className="font-mono">
                              {booking.reference || booking._id?.slice(-6).toUpperCase()}
                            </span>
                          </span>
                        </span>

                        <span className="grid grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs shadow-2xs">
                          <span className="block space-y-0.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                              <CalendarIcon size={11} /> Date &amp; time
                            </span>
                            <span className="block font-bold text-foreground">
                              {booking.event_date
                                ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "TBA"}
                            </span>
                            <span className="block text-[11.5px] text-muted-foreground">
                              {booking.start_time || "Time TBA"}
                            </span>
                          </span>

                          <span className="block min-w-0 space-y-0.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                              <MapPin size={11} /> Venue
                            </span>
                            <span className="block truncate font-bold text-foreground">
                              {booking.venue_type || "Venue TBA"}
                            </span>
                            <span className="block truncate text-[11.5px] text-muted-foreground">
                              {locationAddress}
                            </span>
                          </span>
                        </span>

                        <span className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                            <ShieldCheck size={13} className="shrink-0 text-amber-600" />
                            <span className="truncate">
                              Lead: <strong className="text-foreground">{managerName}</strong>
                            </span>
                          </span>
                          <span
                            className={`flex shrink-0 items-center gap-1 text-[11.5px] font-semibold ${
                              timing.isStarted ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            <PackageCheck size={13} />
                            {equipmentCount} items
                          </span>
                        </span>
                      </button>

                      {/* Actions live outside the card button: a link inside a
                          button is invalid, and `tel:` has to stay a link so
                          the phone offers it to the dialler. */}
                      <div className="flex items-stretch gap-px border-t border-border/60 bg-border/40">
                        {managerPhone && (
                          <a
                            href={`tel:${managerPhone}`}
                            className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 bg-card text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary"
                          >
                            <Phone size={14} />
                            Call lead
                          </a>
                        )}
                        {timing.isStarted ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/staff/events/${booking._id}?tab=equipment`)}
                            className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 bg-[#4C81E0] text-[13px] font-bold text-white transition-colors hover:bg-[#3b6bc4] cursor-pointer portal-press"
                          >
                            <PackageCheck size={14} />
                            Count gear
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/staff/events/${booking._id}?tab=equipment`)}
                            title="Return counts open once the event starts"
                            className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 bg-card text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                          >
                            <Lock size={14} />
                            Gear manifest
                          </button>
                        )}
                      </div>
                    </AdminCard>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Availability sheet.
            Six rows of 44px day cells plus an explainer and a footer is
            taller than a phone, and the dialog it lived in had no scroll
            region — so on a 667px screen the Save button sat below the clip
            and the crew could toggle days they could never commit. The sheet
            scrolls now, and Save is pinned where it is visible from the
            first tap and reports how many days are marked off. */}
        {showCalendar && (
          <Modal
            title="My Availability"
            description="Tap a date to mark yourself off-duty. Dates you are already booked on cannot be changed here."
            onClose={() => setShowCalendar(false)}
            className="sm:max-w-xl"
            footer={
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11.5px] font-medium text-muted-foreground tabular-nums">
                  {offDayCount === 0
                    ? "No days marked off"
                    : `${offDayCount} day${offDayCount === 1 ? "" : "s"} off this month`}
                </span>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => setShowCalendar(false)} disabled={savingAvailability}>
                    Cancel
                  </Btn>
                  <Btn variant="primary" size="sm" onClick={saveAvailability} disabled={savingAvailability}>
                    {savingAvailability ? "Saving…" : "Save"}
                  </Btn>
                </div>
              </div>
            }
          >
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="grid h-10 w-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm font-bold text-foreground tabular-nums">{monthLabel}</div>
                <button
                  type="button"
                  aria-label="Next month"
                  className="grid h-10 w-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div>
                <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-[11px] font-bold text-muted-foreground">
                  {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                    <div key={label} aria-hidden="true">
                      <span className="sm:hidden">{label.slice(0, 1)}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dateKey = day.date ? toDateKey(day.date) : null;
                    const entry = day.date ? assignmentsByDate[dateKey] : null;
                    const isUnavailable = dateKey ? selectedDates.has(dateKey) : false;

                    let cellBg = "bg-card border-border/80 text-foreground hover:border-primary";
                    if (entry) {
                      cellBg = "bg-amber-100 border-amber-300 text-amber-950 font-bold cursor-not-allowed";
                    } else if (isUnavailable) {
                      cellBg = "bg-red-100 border-red-300 text-red-950 font-bold";
                    }

                    if (!day.date) {
                      return <div key={`pad-${index}`} className="min-h-[46px]" aria-hidden="true" />;
                    }

                    return (
                      <button
                        key={`${day.label}-${index}`}
                        type="button"
                        onClick={() => toggleDate(day.date)}
                        disabled={!!entry}
                        aria-pressed={isUnavailable}
                        aria-label={
                          day.date.toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
                          (entry ? " — assigned to an event" : isUnavailable ? " — marked off-duty" : " — available")
                        }
                        className={`flex min-h-[46px] flex-col items-center justify-center rounded-lg border p-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${cellBg}`}
                      >
                        <span className="text-[13px] font-semibold leading-none tabular-nums">{day.label}</span>
                        {entry && <span className="mt-0.5 text-[10px] leading-none text-amber-900">Booked</span>}
                        {!entry && isUnavailable && (
                          <span className="mt-0.5 text-[10px] leading-none text-red-700">Off</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded border border-border bg-card" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded border border-red-300 bg-red-100" /> Off-duty
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded border border-amber-300 bg-amber-100" /> Booked (locked)
                </span>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </StaffLayout>

  );
}
