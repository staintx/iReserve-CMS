import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import Btn from "../../components/admin/ui/Btn";
import PageHeader from "../../components/admin/ui/PageHeader";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { getSocket } from "../../api/socket";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  CheckCircle2, 
  PackageCheck, 
  CalendarDays, 
  ArrowRight,
  UserCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
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

  const offDayCount = useMemo(
    () => Array.from(selectedDates).filter((key) => !assignmentsByDate[key]).length,
    [selectedDates, assignmentsByDate]
  );

  return (
    <StaffLayout>
      <div className="space-y-5">
        <PageHeader
          title="My Events"
          description="Your assigned catering events and shift schedules"
          actions={
            <Btn variant="secondary" size="sm" onClick={() => setShowCalendar(true)}>
              <CalendarDays size={14} className="text-[#4C81E0]" />
              My Availability
            </Btn>
          }
        />

        {/* Assigned Events Section */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Assigned Shifts
            </h2>
            <span className="text-xs font-medium text-slate-500 tabular-nums">
              {bookings.length} assigned event{bookings.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-lg">
              Loading your assigned events...
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 sm:p-10 text-center space-y-3 bg-white border border-slate-200/80 rounded-lg">
              <CalendarIcon size={32} className="mx-auto text-slate-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  No assigned events right now
                </h3>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">
                  Your Event Manager has not assigned you to an upcoming catering event. Once assigned, your schedule, venue details, and briefing will appear here.
                </p>
              </div>
              <div className="pt-1">
                <Btn variant="secondary" size="sm" onClick={() => setShowCalendar(true)}>
                  <CalendarDays size={14} className="text-[#4C81E0]" />
                  Set my availability
                </Btn>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {bookings.map((booking) => {
                const role = getMyAssignedRole(booking);
                const managerName = booking.event_manager_id?.full_name || "Assigned Manager";
                const managerPhone = booking.event_manager_id?.phone;
                const timing = getEventTimingStatus(booking);
                const locationAddress =
                  [booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") ||
                  "Location TBA";

                return (
                  <li key={booking._id} className="flex">
                    <div className="w-full flex flex-col justify-between rounded-lg border border-slate-200/80 bg-white transition-all hover:border-[#4C81E0]/50 shadow-2xs overflow-hidden">
                      {/* Top clickable area for event details */}
                      <button
                        type="button"
                        onClick={() => navigate(`/staff/events/${booking._id}`)}
                        className="w-full p-4 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4C81E0]/40 space-y-3"
                      >
                        {/* Status & Role row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              <UserCheck size={12} className="text-[#4C81E0]" />
                              {role}
                            </span>

                            {timing.isUpcoming && (
                              <span className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <Lock size={11} className="text-slate-500" />
                                Upcoming
                              </span>
                            )}
                            {timing.isStarted && !timing.isFinished && (
                              <span className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Sparkles size={11} className="text-emerald-600" />
                                In Progress
                              </span>
                            )}
                            {timing.isFinished && (
                              <span className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                <CheckCircle2 size={11} className="text-blue-600" />
                                Return Check
                              </span>
                            )}
                          </div>
                          <Badge status={booking.status || "confirmed"} />
                        </div>

                        {/* Event Title & Reference */}
                        <div>
                          <span className="block text-base font-bold leading-tight text-slate-900">
                            {booking.event_type || "Catering Event"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            Client: {booking.customer_id?.full_name || "Valued Client"} · Ref{" "}
                            <span className="font-mono text-slate-700">
                              {booking.reference || booking._id?.slice(-6).toUpperCase()}
                            </span>
                          </span>
                        </div>

                        {/* Key Operational Info: When, Where, Lead */}
                        <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex items-start gap-2 text-slate-700">
                            <CalendarIcon size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-900">
                                {booking.event_date
                                  ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                                  : "Date TBA"}
                              </span>
                              <span className="text-slate-500 ml-1.5">
                                at {booking.start_time || "Time TBA"} ({booking.duration_hours || 4} hrs)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 text-slate-700">
                            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 truncate block">
                                {booking.venue_type || "Venue TBA"}
                              </span>
                              <span className="text-slate-500 truncate block text-[11.5px]">
                                {locationAddress}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 text-xs text-slate-600">
                            <ShieldCheck size={14} className="text-[#4C81E0] shrink-0" />
                            <span className="truncate">
                              Lead Manager: <strong className="text-slate-900">{managerName}</strong>
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Card Action Footer */}
                      <div className="flex items-stretch border-t border-slate-200/80 bg-slate-50/60 divide-x divide-slate-200/80">
                        {managerPhone && (
                          <a
                            href={`tel:${managerPhone}`}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-[#4C81E0] hover:bg-slate-100"
                          >
                            <Phone size={13} />
                            Call Lead
                          </a>
                        )}
                        {timing.isFinished || (timing.isStarted && !timing.isFinished) ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/staff/events/${booking._id}#equipment-check`)}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 bg-[#4C81E0] text-xs font-semibold text-white transition-colors hover:bg-[#3b6bc4] cursor-pointer"
                          >
                            <PackageCheck size={14} />
                            Equipment Check
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/staff/events/${booking._id}`)}
                            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                          >
                            <span>View Event Details</span>
                            <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Availability Modal */}
        {showCalendar && (
          <Modal
            title="My Availability"
            description="Tap a date to mark yourself off-duty. Dates with booked events are locked and cannot be changed."
            onClose={() => setShowCalendar(false)}
            className="sm:max-w-xl"
            footer={
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {offDayCount === 0
                    ? "No days marked off-duty"
                    : `${offDayCount} day${offDayCount === 1 ? "" : "s"} off-duty this month`}
                </span>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => setShowCalendar(false)} disabled={savingAvailability}>
                    Cancel
                  </Btn>
                  <Btn variant="primary" size="sm" onClick={saveAvailability} disabled={savingAvailability}>
                    {savingAvailability ? "Saving..." : "Save Availability"}
                  </Btn>
                </div>
              </div>
            }
          >
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm font-bold text-slate-900 tabular-nums">{monthLabel}</div>
                <button
                  type="button"
                  aria-label="Next month"
                  className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div>
                <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-xs font-semibold text-slate-500">
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

                    let cellBg = "bg-white border-slate-200 text-slate-800 hover:border-[#4C81E0]";
                    if (entry) {
                      cellBg = "bg-amber-50 border-amber-200 text-amber-900 font-bold cursor-not-allowed";
                    } else if (isUnavailable) {
                      cellBg = "bg-rose-50 border-rose-200 text-rose-950 font-bold";
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
                          (entry ? " - assigned to an event" : isUnavailable ? " - marked off-duty" : " - available")
                        }
                        className={`flex min-h-[46px] flex-col items-center justify-center rounded-md border p-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#4C81E0]/40 ${cellBg}`}
                      >
                        <span className="text-xs font-semibold leading-none tabular-nums">{day.label}</span>
                        {entry && <span className="mt-1 text-[10px] font-semibold leading-none text-amber-800">Booked</span>}
                        {!entry && isUnavailable && (
                          <span className="mt-1 text-[10px] font-semibold leading-none text-rose-700">Off</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend with plain, clear indicators */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-slate-300 bg-white" />
                  <span>Available</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-rose-300 bg-rose-50" />
                  <span>Off-duty</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-amber-300 bg-amber-50" />
                  <span>Booked / locked</span>
                </span>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </StaffLayout>
  );
}
