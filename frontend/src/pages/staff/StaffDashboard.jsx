import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import PageHeader from "../../components/admin/ui/PageHeader";
import KPICard from "../../components/admin/ui/KPICard";
import Badge from "../../components/admin/ui/Badge";
import AvailabilityModal from "../../components/common/AvailabilityModal";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { getSocket } from "../../api/socket";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock,
  CheckCircle2, 
  CalendarDays, 
  ArrowRight,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sparkles,
  Eye,
  Info
} from "lucide-react";
import { 
  getEventTimingStatus, 
  getBookingVenueLocation, 
  formatEventStartTime 
} from "../../utils/format";

const toDateKey = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [activeBookings, setActiveBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar & Availability states
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [availabilityData, setAvailabilityData] = useState({ month: "", unavailable: [], assignments: [] });
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const monthKey = useMemo(() => {
    return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    return calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });
  }, [calendarMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, completedRes, availRes] = await Promise.all([
        StaffAPI.getBookings("active").catch(() => ({ data: [] })),
        StaffAPI.getBookings("completed").catch(() => ({ data: [] })),
        StaffAPI.getAvailability(monthKey).catch(() => ({ data: { month: monthKey, unavailable: [], assignments: [] } }))
      ]);

      setActiveBookings(Array.isArray(activeRes.data) ? activeRes.data : []);
      setCompletedBookings(Array.isArray(completedRes.data) ? completedRes.data : []);
      setAvailabilityData(availRes.data || { month: monthKey, unavailable: [], assignments: [] });
    } catch {
      notify("Failed to load staff events data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleRefresh = (data) => {
      if (!data || data.type === "booking" || data.type === "staff") {
        loadData();
      }
    };

    socket.on("system:refresh", handleRefresh);
    socket.on("notification:new", handleRefresh);
    return () => {
      socket.off("system:refresh", handleRefresh);
      socket.off("notification:new", handleRefresh);
    };
  }, []);

  const handleSaveAvailability = async (payload, dates) => {
    try {
      if (payload?.refreshOnly) {
        const availRes = await StaffAPI.getAvailability(monthKey);
        setAvailabilityData(availRes.data || { month: monthKey, unavailable: [], assignments: [] });
        return;
      }
      if (typeof payload === "string" && Array.isArray(dates)) {
        await StaffAPI.setAvailability(payload, dates);
      } else {
        await StaffAPI.setAvailability(payload);
      }
      notify("Your availability schedule has been updated.", "success");
      // Refresh availability
      const availRes = await StaffAPI.getAvailability(monthKey);
      setAvailabilityData(availRes.data || { month: monthKey, unavailable: [], assignments: [] });
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update availability.", "error");
      throw err;
    }
  };

  const getMyAssignedRole = (booking) => {
    const assignments = booking?.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id?._id || item.user_id) === String(user?._id));
    return match?.role || user?.position || "Staff Crew";
  };

  // Map active assignments by date
  const eventsByDate = useMemo(() => {
    const map = new Map();
    activeBookings.forEach((b) => {
      if (b.event_date) {
        const key = toDateKey(b.event_date);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(b);
      }
    });
    return map;
  }, [activeBookings]);

  // Calendar month grid
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [calendarMonth]);

  const stepMonth = (delta) => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1));
  };

  const selectedDateKey = toDateKey(selectedDate);
  const selectedDateEvents = eventsByDate.get(selectedDateKey) || [];
  const isSelectedDateUnavailable = (availabilityData.unavailable || []).includes(selectedDateKey);
  const isSelectedDatePending = (availabilityData.pending || []).includes(selectedDateKey);

  return (
    <StaffLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <PageHeader
          title="Staff Operations"
          description="View your assigned catering events, monitor shift schedules, and manage your availability"
        />

        {/* SECTION A: Summary Cards (Top) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <KPICard
            label="Assigned Events"
            value={loading ? "—" : activeBookings.length}
            sub="Active and upcoming shifts"
            icon={CalendarIcon}
            tone="info"
            onClick={() => navigate("/staff/bookings")}
          />
          <KPICard
            label="Completed Events"
            value={loading ? "—" : completedBookings.length}
            sub="Successfully handled events"
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate("/staff/bookings?tab=completed")}
          />
        </div>

        {/* SECTION B & C: Calendar View & Set My Availability */}
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden" aria-label="Staff Schedule Calendar">
          {/* Calendar Header with Set My Availability Button */}
          <div className="p-3.5 sm:p-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                  <CalendarDays size={15} />
                </span>
                <span>My Event Schedule</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 ml-9">
                Dates of events assigned to you and your scheduled availability
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Set My Availability Button */}
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-all cursor-pointer shadow-2xs"
              >
                <CalendarDays size={14} />
                <span>Set My Availability</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 space-y-4">
            {/* Month Navigation Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border rounded-xl p-2 sm:p-2.5 bg-slate-50/60 border-slate-200">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{monthLabel}</h3>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">({monthKey})</span>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2.5 text-xs flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4C81E0]" />
                  <span className="text-slate-600 text-[10.5px]">Assigned</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600 text-[10.5px]">Off-Duty</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-600 text-[10.5px]">Pending</span>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Previous Month"
                  aria-label="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCalendarMonth(today);
                    setSelectedDate(today);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Next Month"
                  aria-label="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 text-center text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 py-1">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarDays.map((dateObj, idx) => {
                  if (!dateObj) {
                    return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/40" />;
                  }

                  const dateKey = toDateKey(dateObj);
                  const isSelected = selectedDateKey === dateKey;
                  const isToday = toDateKey(new Date()) === dateKey;
                  const hasAssigned = eventsByDate.has(dateKey);
                  const isUnavailable = (availabilityData.unavailable || []).includes(dateKey);
                  const isPending = (availabilityData.pending || []).includes(dateKey);
                  const dayEvents = eventsByDate.get(dateKey) || [];

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(dateObj)}
                      className={`h-14 sm:h-16 rounded-xl border p-1 sm:p-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none relative ${
                        isSelected
                          ? "border-[#4C81E0] ring-2 ring-[#4C81E0]/30 bg-blue-50/40 shadow-xs"
                          : hasAssigned
                          ? "border-blue-200 bg-blue-50/30 hover:bg-blue-50/60"
                          : isUnavailable
                          ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50/80"
                          : isPending
                          ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70"
                          : "border-slate-200/80 bg-white hover:bg-slate-50"
                      } ${isToday && !isSelected ? "ring-1 ring-slate-400" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold tabular-nums ${isSelected ? "text-[#4C81E0]" : "text-slate-800"}`}>
                          {dateObj.getDate()}
                        </span>

                        {hasAssigned && (
                          <span className="w-2 h-2 rounded-full bg-[#4C81E0] shrink-0" title="Assigned Event" />
                        )}
                        {!hasAssigned && isUnavailable && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Off-Duty" />
                        )}
                        {!hasAssigned && !isUnavailable && isPending && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Pending Off-Duty Request" />
                        )}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        {hasAssigned ? (
                          <span className="block truncate text-[9px] sm:text-[10px] font-bold text-blue-800 bg-blue-100/90 px-1 py-0.2 rounded leading-tight">
                            {dayEvents[0]?.event_type || "Event"}
                          </span>
                        ) : isUnavailable ? (
                          <span className="block truncate text-[9px] sm:text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1 py-0.2 rounded leading-tight">
                            Off-duty
                          </span>
                        ) : isPending ? (
                          <span className="block truncate text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded leading-tight">
                            Pending
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Information Panel */}
            <div className="pt-2 border-t border-slate-100">
              <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="font-bold text-slate-900">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelectedDateUnavailable && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                        Marked Off-Duty (Approved)
                      </span>
                    )}
                    {isSelectedDatePending && !isSelectedDateUnavailable && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                        Pending Availability Request
                      </span>
                    )}
                    {selectedDateEvents.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-semibold">
                        {selectedDateEvents.length} Assigned Event{selectedDateEvents.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                {selectedDateEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No assigned events on this date.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {selectedDateEvents.map((booking) => (
                      <div
                        key={booking._id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {booking.event_type || "Catering Event"}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              · Client: <strong>{booking.customer_id?.full_name || "Client"}</strong>
                            </span>
                          </div>
                          <div className="text-[11.5px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock size={11} className="text-slate-400" />
                              {formatEventStartTime(booking.start_time)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate max-w-[260px]" title={getBookingVenueLocation(booking)}>
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{getBookingVenueLocation(booking)}</span>
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              Role: {getMyAssignedRole(booking)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/staff/events/${booking._id}`)}
                          className="inline-flex min-h-[36px] items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-colors cursor-pointer shrink-0"
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION D: Upcoming Scheduled Events */}
        <section className="space-y-3" aria-label="Upcoming Scheduled Events">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Upcoming Scheduled Events
            </h2>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {activeBookings.length} event{activeBookings.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl">
              Loading your upcoming assignments...
            </div>
          ) : activeBookings.length === 0 ? (
            <div className="p-8 sm:p-10 text-center space-y-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
              <CalendarIcon size={32} className="mx-auto text-slate-400" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  No upcoming scheduled events
                </h3>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">
                  You do not have any active catering assignments right now. When the Administrator assigns you to an event, it will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {activeBookings.map((booking) => {
                const role = getMyAssignedRole(booking);
                const timing = getEventTimingStatus(booking);
                const venue = getBookingVenueLocation(booking);

                return (
                  <div
                    key={booking._id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:border-[#4C81E0]/50 transition-all space-y-4 h-full"
                  >
                    {/* Top Row: Type, Title, Client, Ref (No 'Ready for Event' badge on upcoming cards) */}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                            Assigned Shift
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                            {booking.event_type || "Catering Event"}
                          </h3>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 break-words">
                        Client: <strong className="text-slate-800">{booking.customer_id?.full_name || "Valued Client"}</strong> · Ref <span className="font-mono text-slate-700 font-semibold">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                      {/* Left: Prominent Event Date & Start Time */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={16} className="text-[#4C81E0] shrink-0" />
                          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                            {booking.event_date
                              ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Date TBA"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-6 pt-0.5 font-medium">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>{formatEventStartTime(booking.start_time)}</span>
                        </div>
                      </div>

                      {/* Right: Actual Venue Location & Staff Role */}
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-[#4C81E0] shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2" title={venue}>
                            {venue}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-6 pt-0.5">
                          <UserCheck size={13} className="text-[#4C81E0] shrink-0" />
                          <span>Role: <strong className="text-slate-900">{role}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action (No redundant 'Upcoming' badge) */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center gap-1.5 min-h-[22px]">
                        {timing.isStarted && !timing.isFinished ? (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                            <Sparkles size={10} className="text-emerald-600" /> In Progress
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/staff/events/${booking._id}`)}
                        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-colors cursor-pointer shadow-2xs shrink-0"
                      >
                        <Eye size={13} />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Set My Availability Modal */}
        {showAvailabilityModal && (
          <AvailabilityModal
            open={showAvailabilityModal}
            onClose={() => setShowAvailabilityModal(false)}
            initialMonth={calendarMonth}
            initialUnavailable={availabilityData.unavailable || []}
            assignments={availabilityData.assignments || []}
            onSave={handleSaveAvailability}
            userRole="staff"
          />
        )}
      </div>
    </StaffLayout>
  );
}
