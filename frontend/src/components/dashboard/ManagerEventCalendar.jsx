import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  UserPlus,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Eye
} from "lucide-react";
import { ManagerAPI } from "../../api/manager";
import useToast from "../../hooks/useToast";
import Modal from "../common/Modal";
import { useNavigate } from "react-router-dom";
import useMediaQuery from "../../hooks/useMediaQuery";

// Helper to format date keys in YYYY-MM-DD
const formatDateKey = (dateObj) => {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

// Helper to format display date
const formatDisplayDate = (dateObj, includeWeekday = false) => {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  if (includeWeekday) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Map manager operational statuses to color pill styles
const getOperationalStyle = (status, isUnavailable = false) => {
  if (isUnavailable) {
    return {
      dotBg: "bg-red-400",
      pillBg: "bg-red-600 text-white",
      cardBg: "bg-red-50 border-red-200 text-red-900",
      badgeText: "Off Duty / Unavailable",
      label: "My Off-Duty Day"
    };
  }
  if (status === "pending_staffing" || status === "unassigned") {
    return {
      dotBg: "bg-amber-400",
      pillBg: "bg-amber-500 text-white",
      cardBg: "bg-amber-50 border-amber-200 text-amber-900",
      badgeText: "Needs Staffing",
      label: "Pending Staffing"
    };
  }
  if (status === "completed") {
    return {
      dotBg: "bg-slate-400",
      pillBg: "bg-slate-600 text-white",
      cardBg: "bg-slate-50 border-slate-200 text-slate-800",
      badgeText: "Completed",
      label: "Completed Event"
    };
  }
  // Confirmed with staff assigned
  return {
    dotBg: "bg-emerald-500",
    pillBg: "bg-emerald-600 text-white",
    cardBg: "bg-emerald-50 border-emerald-200 text-emerald-900",
    badgeText: "Team Dispatched",
    label: "Staff Assigned"
  };
};

export default function ManagerEventCalendar({ onSelectBooking = null }) {
  const toast = useToast();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month' | 'week' | 'agenda'

  /* The week view lays seven day columns of stacked event cards side by side.
     That is a desktop shape: at 320px each column is about 40px wide, which
     is narrower than the text inside it. Rather than ship a broken view or
     silently reset the manager's choice, a narrow screen falls back to the
     agenda — the same information as a readable vertical list — and the Week
     control is simply not offered there. */
  const isWideEnoughForWeek = useMediaQuery("(min-width: 640px)");
  const effectiveViewMode = viewMode === "week" && !isWideEnoughForWeek ? "agenda" : viewMode;
  const [staffingFilter, setStaffingFilter] = useState("all"); // 'all' | 'needs_staffing' | 'ready'

  // Data states
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState({ month: "", unavailable: [] });
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedUnavailableSet, setSelectedUnavailableSet] = useState(new Set());
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Detail Modal
  const [activeItem, setActiveItem] = useState(null);

  const availabilityMonthKey = useMemo(() => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  }, [currentDate]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [bookRes, availRes] = await Promise.all([
        ManagerAPI.getBookings("all").catch(() => ({ data: [] })),
        ManagerAPI.getAvailability(availabilityMonthKey).catch(() => ({ data: { month: availabilityMonthKey, unavailable: [] } }))
      ]);

      setBookings(Array.isArray(bookRes.data) ? bookRes.data : []);
      setAvailability(availRes.data || { month: availabilityMonthKey, unavailable: [] });
      setSelectedUnavailableSet(new Set(availRes.data?.unavailable || []));
    } catch (err) {
      console.error("Failed to load manager calendar data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [availabilityMonthKey]);

  // Map items by date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map();

    const addEventToMap = (dateStr, item) => {
      if (!dateStr) return;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push(item);
    };

    // 1. Manager's Off-Duty / Unavailable dates
    (availability.unavailable || []).forEach((dateStr) => {
      addEventToMap(dateStr, {
        id: `unavailable-${dateStr}`,
        type: "unavailable",
        title: "Off-Duty (Unavailable)",
        time: "All Day",
        operationalStatus: "unavailable",
        isUnavailable: true,
        categoryLabel: "My Off-Duty Day",
        rawItem: null
      });
    });

    // 2. Assigned Bookings for this manager
    bookings.forEach((b) => {
      if (b.event_date) {
        const dateKey = formatDateKey(b.event_date);
        const staffList = b.staff_assignments || [];
        const hasStaff = staffList.length > 0;
        const isCompleted = b.status === "completed" || b.status === "closed";
        const opStatus = isCompleted ? "completed" : hasStaff ? "ready" : "pending_staffing";

        // Check staffing filter
        if (staffingFilter === "needs_staffing" && opStatus !== "pending_staffing") return;
        if (staffingFilter === "ready" && opStatus !== "ready") return;

        const custName = b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || "Client";

        addEventToMap(dateKey, {
          id: `booking-${b._id}`,
          rawId: b._id,
          type: "booking",
          title: b.event_type || "Event Booking",
          clientName: custName,
          clientPhone: b.contact_phone || b.customer_id?.phone || "—",
          clientEmail: b.contact_email || b.customer_id?.email || "—",
          time: b.start_time || "TBD",
          venue: b.venue_type || b.venue || b.street || "Venue not set",
          operationalStatus: opStatus,
          isUnavailable: false,
          categoryLabel: opStatus === "pending_staffing" ? "Needs Staffing" : "Staff Assigned",
          staffAssignments: staffList,
          staffCount: staffList.length,
          guestCount: b.guest_count,
          rawItem: b
        });
      }
    });

    return map;
  }, [bookings, availability, staffingFilter]);

  // Calendar navigation helpers
  /* Steps by the unit the *rendered* view uses. Two things were wrong here:
     the week branch fired even when a narrow screen had fallen back to the
     agenda, and the agenda matched neither branch, so in agenda view the
     chevrons were live controls that did nothing. Agenda is built from the
     month the calendar has fetched, so it steps by month. */
  const stepPeriod = (direction) => {
    if (effectiveViewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7 * direction);
      setCurrentDate(d);
      return;
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const prevPeriod = () => stepPeriod(-1);
  const nextPeriod = () => stepPeriod(1);

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Month grid generator
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Days for next month to complete grid
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Selected Date events list
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayEvents = eventsByDate.get(selectedDateKey) || [];
  const isSelectedDateUnavailable = (availability.unavailable || []).includes(selectedDateKey);

  const toggleQuickDuty = async () => {
    const dateKey = selectedDateKey;
    const nextSet = new Set(availability.unavailable || []);
    if (nextSet.has(dateKey)) {
      nextSet.delete(dateKey);
    } else {
      nextSet.add(dateKey);
    }

    try {
      await ManagerAPI.setAvailability(availabilityMonthKey, Array.from(nextSet));
      toast.notify(`Updated schedule for ${formatDisplayDate(selectedDate)}`, "success");
      fetchCalendarData();
    } catch (err) {
      toast.notify("Failed to update availability.", "error");
    }
  };

  const toggleUnavailableDate = (dateObj) => {
    if (!dateObj) return;
    const dateKey = formatDateKey(dateObj);
    setSelectedUnavailableSet((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      await ManagerAPI.setAvailability(availabilityMonthKey, Array.from(selectedUnavailableSet));
      toast.notify("Personal availability schedule updated.", "success");
      setShowAvailabilityModal(false);
      fetchCalendarData();
    } catch (err) {
      toast.notify(err.response?.data?.message || "Failed to update availability.", "error");
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar toolbar.
          On a phone this block used to cost about 200px before a single date
          appeared: a 24px serif title (an <h1> nested inside the dashboard's
          own <h1>), a two-line description, three staffing filters, three
          view pills and a full-width button. The title and description are
          gone — the card is directly under "Manager Operations" and was
          re-announcing it — the filters became a scrollable chip rail, and
          the view switcher lost "Week", which cannot be drawn in seven 40px
          columns and is now offered only where it fits. */}
      <div className="rounded-2xl border border-border bg-card p-2.5 shadow-xs sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="hidden sm:block">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Event Staffing &amp; Logistics Schedule
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monitor crew dispatch readiness and set your availability
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Staffing filter */}
            <div className="-mx-2.5 flex gap-1.5 overflow-x-auto no-scrollbar px-2.5 sm:mx-0 sm:gap-1 sm:overflow-visible sm:rounded-xl sm:border sm:border-border sm:bg-muted sm:p-1 sm:px-1">
              {[
                { id: "all", label: "All events", icon: null },
                { id: "needs_staffing", label: "Needs staff", icon: AlertCircle, iconClass: "text-amber-600" },
                { id: "ready", label: "Team ready", icon: CheckCircle2, iconClass: "text-emerald-600" },
              ].map((option) => {
                const OptionIcon = option.icon;
                const active = staffingFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStaffingFilter(option.id)}
                    className={`flex min-h-[38px] shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer sm:min-h-0 sm:px-2.5 sm:py-1 ${
                      active
                        ? "bg-primary text-white shadow-2xs sm:bg-card sm:text-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground sm:border-0 sm:bg-transparent"
                    }`}
                  >
                    {OptionIcon && <OptionIcon size={13} className={active ? option.iconClass : "opacity-70"} />}
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* View switcher. Week is desktop-only by design, not by omission. */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1 text-xs">
              {[
                { id: "month", label: "Month", desktopOnly: false },
                { id: "week", label: "Week", desktopOnly: true },
                { id: "agenda", label: "Agenda", desktopOnly: false },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={effectiveViewMode === option.id}
                  onClick={() => setViewMode(option.id)}
                  className={`min-h-[38px] rounded-lg px-2.5 font-semibold transition-all cursor-pointer sm:min-h-0 sm:py-1 ${
                    option.desktopOnly ? "hidden sm:block" : ""
                  } ${
                    effectiveViewMode === option.id
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAvailabilityModal(true)}
              className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4C81E0] px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#3b6bc4] cursor-pointer portal-press sm:min-h-0 sm:flex-initial sm:py-2"
            >
              <CalendarDays size={14} />
              <span className="sm:hidden">My availability</span>
              <span className="hidden sm:inline">Set My Availability</span>
            </button>
          </div>
        </div>
      </div>
      {/* Main Grid: Calendar Area + Manager Day Operations Panel (1fr + 310px split) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_310px] gap-4 items-start">
        {/* Calendar View Card */}
        <div className="bg-card rounded-2xl border border-border p-2.5 sm:p-4 shadow-xs space-y-3">
          {/* Month navigation. The chevrons were 28px; on the control a
              manager taps most in this component that was the wrong size. */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={prevPeriod}
                className="grid h-10 w-10 sm:h-9 sm:w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Previous period"
              >
                <ChevronLeft size={17} />
              </button>
              <h3 className="text-[15px] sm:text-lg font-bold text-foreground min-w-[120px] sm:min-w-[140px] text-center tabular-nums">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </h3>
              <button
                type="button"
                onClick={nextPeriod}
                className="grid h-10 w-10 sm:h-9 sm:w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Next period"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={goToToday}
              className="min-h-[38px] sm:min-h-0 shrink-0 rounded-lg border border-border px-3 sm:py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* MONTH VIEW */}
          {effectiveViewMode === "month" && (
            <div className="space-y-2">
              {/* Days of Week Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="gap-1 sm:gap-1.5">
                {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                  const dateKey = formatDateKey(date);
                  const isSelected = dateKey === selectedDateKey;
                  const isToday = dateKey === formatDateKey(new Date());
                  const dayEvents = eventsByDate.get(dateKey) || [];

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`h-[58px] sm:h-[64px] lg:h-[70px] rounded-xl p-1 sm:p-1.5 border transition-all flex flex-col justify-between cursor-pointer overflow-hidden ${
                        isSelected
                          ? "border-amber-400 ring-2 ring-amber-400/40 bg-amber-50/20 shadow-2xs"
                          : isToday
                          ? "border-blue-400 bg-blue-50/30"
                          : isCurrentMonth
                          ? "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs"
                          : "border-slate-100 bg-slate-50/40 opacity-40"
                      }`}
                    >
                      {/* Top Row: Date Badge */}
                      <div className="flex items-center justify-between shrink-0">
                        <span
                          className={`text-[10px] sm:text-[11px] font-semibold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center ${
                            isToday
                              ? "bg-blue-600 text-white font-bold shadow-2xs"
                              : isSelected
                              ? "bg-amber-100 text-amber-900 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 sm:hidden shrink-0" />
                        )}
                      </div>

                      {/* Bottom Event Pills */}
                      <div className="space-y-0.5 overflow-hidden flex-1 flex flex-col justify-end">
                        {dayEvents.slice(0, 1).map((ev) => {
                          const opStyle = getOperationalStyle(ev.operationalStatus, ev.isUnavailable);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItem(ev);
                              }}
                              className={`text-[10px] sm:text-[10.5px] leading-tight font-medium px-1.5 py-[2px] rounded-md truncate flex items-center gap-1 ${opStyle.pillBg} transition-transform hover:scale-[1.01]`}
                              title={`${ev.title} (${ev.clientName || ev.time})`}
                            >
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {dayEvents.length > 1 && (
                          <div className="hidden sm:block">
                            {dayEvents.slice(1, 2).map((ev) => {
                              const opStyle = getOperationalStyle(ev.operationalStatus, ev.isUnavailable);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveItem(ev);
                                  }}
                                  className={`text-[10px] sm:text-[10.5px] leading-tight font-medium px-1.5 py-[2px] rounded-md truncate flex items-center gap-1 ${opStyle.pillBg} transition-transform hover:scale-[1.01]`}
                                  title={`${ev.title} (${ev.clientName || ev.time})`}
                                >
                                  <span className="truncate">{ev.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {dayEvents.length > 2 && (
                          <div className="hidden sm:block text-[10px] font-bold text-muted-foreground pl-1 leading-none">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                        {dayEvents.length > 1 && (
                          <div className="sm:hidden text-[10px] font-bold text-muted-foreground pl-1 leading-none">
                            +{dayEvents.length - 1} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Operational Legend for Manager */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Team Dispatched (Ready)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Needs Staffing (Action Needed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span>Completed Event</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                  <span>My Off-Duty Day (Unavailable)</span>
                </div>
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {effectiveViewMode === "week" && (
            <div className="space-y-4">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="gap-1.5 text-center">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - d.getDay() + i);
                  const dateKey = formatDateKey(d);
                  const isSelected = dateKey === selectedDateKey;
                  const dayEvs = eventsByDate.get(dateKey) || [];

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(d)}
                      className={`p-2 rounded-xl border text-left cursor-pointer min-h-[150px] flex flex-col ${
                        isSelected ? "border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/40" : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{d.getDate()}</div>

                      <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto max-h-[140px]">
                        {dayEvs.map((ev) => {
                          const opStyle = getOperationalStyle(ev.operationalStatus, ev.isUnavailable);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItem(ev);
                              }}
                              className={`p-1.5 rounded-lg text-[10px] font-medium ${opStyle.cardBg} border shadow-2xs cursor-pointer hover:opacity-90 leading-tight`}
                            >
                              <p className="font-bold truncate">{ev.title}</p>
                              {ev.clientName && <p className="text-[10px] opacity-80 truncate mt-0.5">{ev.clientName}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGENDA VIEW */}
          {effectiveViewMode === "agenda" && (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {Array.from(eventsByDate.entries()).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No assigned events or off-duty days found for this period.</p>
              ) : (
                Array.from(eventsByDate.entries())
                  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                  .map(([dateKey, evList]) => (
                    <div key={dateKey} className="border-b border-slate-100 pb-2.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {formatDisplayDate(dateKey, true)}
                      </div>
                      <div className="space-y-1.5">
                        {evList.map((ev) => {
                          const opStyle = getOperationalStyle(ev.operationalStatus, ev.isUnavailable);
                          return (
                            <div
                              key={ev.id}
                              onClick={() => setActiveItem(ev)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${opStyle.cardBg} cursor-pointer hover:shadow-2xs`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${opStyle.dotBg}`} />
                                <div>
                                  <p className="font-bold text-xs text-slate-900">{ev.title}</p>
                                  {ev.clientName && <p className="text-[11px] text-slate-600">{ev.clientName}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-white/80 rounded-md border border-slate-200">
                                  {ev.time}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Selected-date operations. On a wide screen it is the right rail;
            below xl it stacks under the grid, which is the right order —
            the manager picks a date above and reads its crew below. */}
        <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 shadow-xs space-y-3.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Day Operations
              </span>
              {selectedDateKey === formatDateKey(new Date()) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Today
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              {formatDisplayDate(selectedDate)}
            </h3>
          </div>

          {/* Quick Duty Status Toggle for this Date */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">My Availability:</span>
              <strong className={isSelectedDateUnavailable ? "text-red-700 font-bold" : "text-emerald-700 font-bold"}>
                {isSelectedDateUnavailable ? "Off-Duty (Unavailable)" : "On Duty (Available)"}
              </strong>
            </div>
            {/* Was an 11px text link 15px tall — the smallest target in the
                panel, on the one control the panel exists to offer. */}
            <button
              type="button"
              onClick={toggleQuickDuty}
              className="min-h-[40px] shrink-0 rounded-md border border-border bg-card px-3 text-[11.5px] font-bold text-primary transition-colors hover:bg-primary/5 cursor-pointer"
            >
              {isSelectedDateUnavailable ? "Set available" : "Mark off-duty"}
            </button>
          </div>

          {/* Events for Selected Day */}
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <CalendarIcon size={20} className="mx-auto text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">No assigned events on this date.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5">
              {selectedDayEvents.filter((ev) => ev.type === "booking").map((ev) => {
                const opStyle = getOperationalStyle(ev.operationalStatus, ev.isUnavailable);
                const hasStaff = ev.staffCount > 0;

                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border ${opStyle.cardBg} space-y-2.5 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mb-1 ${opStyle.pillBg}`}>
                          {opStyle.badgeText}
                        </span>
                        <p className="font-bold text-xs text-slate-900 leading-snug">{ev.title}</p>
                        {ev.clientName && (
                          <p className="text-[11px] font-medium text-slate-600">
                            Client: {ev.clientName}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-700 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                        {ev.time}
                      </span>
                    </div>

                    {ev.venue && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                        <MapPin size={11} className="shrink-0" /> <span className="truncate">{ev.venue}</span>
                      </p>
                    )}

                    {/* Staff Team Summary */}
                    <div className="p-2 bg-white/70 rounded-lg border border-slate-200/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Users size={12} className={hasStaff ? "text-emerald-600" : "text-amber-600"} />
                          <span>Staff Team ({ev.staffCount})</span>
                        </span>
                        <span className={hasStaff ? "text-emerald-700 text-[10px]" : "text-amber-700 text-[10px]"}>
                          {hasStaff ? "✓ Ready" : "⚠️ Needs Team"}
                        </span>
                      </div>

                      {hasStaff ? (
                        <div className="text-[10px] text-slate-600 truncate">
                          {ev.staffAssignments.map((a) => a.name || a.role).slice(0, 3).join(", ")}
                          {ev.staffAssignments.length > 3 && ` +${ev.staffAssignments.length - 3} more`}
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-800">
                          Click below to assign cooks, servers &amp; crew.
                        </div>
                      )}
                    </div>

                    {/* Manager Operations Action Buttons */}
                    <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectBooking && ev.rawItem) {
                            onSelectBooking(ev.rawItem);
                          } else {
                            navigate("/manager/bookings");
                          }
                        }}
                        className="flex-1 text-center py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs"
                      >
                        View Specs
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectBooking && ev.rawItem) {
                            onSelectBooking(ev.rawItem);
                          } else {
                            navigate("/manager/bookings");
                          }
                        }}
                        className="flex-1 text-center py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        Assign Team
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Both dialogs below were hand-rolled fixed overlays: no scroll region,
          no Escape, no focus handling, and a centred card that on a phone put
          its actions mid-screen. They now go through the app's Modal, which
          presents as a bottom sheet under `sm` and owns all of that. */}
      {activeItem && activeItem.type === "booking" && (
        <Modal
          title={activeItem.title}
          description={`${activeItem.categoryLabel} · ${activeItem.clientName}`}
          onClose={() => setActiveItem(null)}
          className="sm:max-w-lg"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="min-h-[42px] rounded-lg border border-border bg-card px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted cursor-pointer sm:min-h-9"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = activeItem;
                  setActiveItem(null);
                  if (onSelectBooking && item.rawItem) onSelectBooking(item.rawItem);
                  else navigate("/manager/bookings");
                }}
                className="min-h-[42px] rounded-lg bg-amber-600 px-4 text-xs font-bold text-white transition-colors hover:bg-amber-700 cursor-pointer portal-press sm:min-h-9"
              >
                {activeItem.staffCount > 0 ? "Edit team" : "Assign team"}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-muted/30 p-3">
              <div>
                <span className="block text-[11px] text-muted-foreground">Event schedule</span>
                <strong className="text-foreground">{activeItem.time}</strong>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Guest count</span>
                <strong className="text-foreground tabular-nums">{activeItem.guestCount || 0} guests</strong>
              </div>
              <div className="col-span-2">
                <span className="block text-[11px] text-muted-foreground">Venue location</span>
                <strong className="text-foreground">{activeItem.venue || "TBA"}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Assigned team ({activeItem.staffCount})</span>
                <span className={activeItem.staffCount > 0 ? "text-emerald-700" : "text-amber-700"}>
                  {activeItem.staffCount > 0 ? "Dispatched" : "No crew yet"}
                </span>
              </div>

              {activeItem.staffCount === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                  No staff members have been dispatched for this booking yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {activeItem.staffAssignments.map((a, idx) => (
                    <div key={idx} className="rounded-lg border border-border/80 bg-muted/30 p-2 text-[11.5px]">
                      <strong className="block truncate text-foreground">{a.name || "Staff"}</strong>
                      <span className="text-[10.5px] text-muted-foreground">{a.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showAvailabilityModal && (
        <Modal
          title="Set My Availability"
          description="Tap a date to mark yourself off-duty for new lead-coordinator assignments."
          onClose={() => setShowAvailabilityModal(false)}
          className="sm:max-w-lg"
          footer={
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11.5px] font-medium text-muted-foreground tabular-nums">
                {selectedUnavailableSet.size === 0
                  ? "No days marked off"
                  : `${selectedUnavailableSet.size} day${selectedUnavailableSet.size === 1 ? "" : "s"} off`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  disabled={savingAvailability}
                  className="min-h-[42px] rounded-lg border border-border bg-card px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60 cursor-pointer sm:min-h-9"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={savingAvailability}
                  className="min-h-[42px] rounded-lg bg-[#4C81E0] px-4 text-xs font-bold text-white transition-colors hover:bg-[#3b6bc4] disabled:opacity-60 cursor-pointer portal-press sm:min-h-9"
                >
                  {savingAvailability ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-1">
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
              className="gap-1 py-1 text-center"
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-[10px] font-bold uppercase text-muted-foreground" aria-hidden="true">
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </div>
              ))}
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
              className="gap-1"
            >
              {/* Leading blanks so the 1st lands on its real weekday. The old
                  grid dropped them, which slid every date one column left of
                  the header it was filed under. */}
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[46px]" aria-hidden="true" />
              ))}
              {calendarDays.filter((d) => d.isCurrentMonth).map(({ date }, idx) => {
                const dateKey = formatDateKey(date);
                const isUnavailable = selectedUnavailableSet.has(dateKey);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleUnavailableDate(date)}
                    aria-pressed={isUnavailable}
                    aria-label={
                      date.toLocaleDateString("en-US", { month: "long", day: "numeric" }) +
                      (isUnavailable ? " — marked off-duty" : " — available")
                    }
                    className={`flex min-h-[46px] flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isUnavailable
                        ? "border-red-600 bg-red-500 text-white shadow-2xs"
                        : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary/5"
                    }`}
                  >
                    <span className="text-[13px] tabular-nums">{date.getDate()}</span>
                    {isUnavailable && <span className="text-[10px] font-normal leading-none">Off</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
