import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  Unlock,
  Info,
  X,
  MapPin,
  User,
  Tag
} from "lucide-react";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { useNavigate } from "react-router-dom";

// Helper to format date keys in YYYY-MM-DD
const formatDateKey = (dateObj) => {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

// Helper to format display date (e.g. "Aug 22" or "Thursday, Aug 22")
const formatDisplayDate = (dateObj, includeWeekday = false) => {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  if (includeWeekday) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Map event type/category to restrained semantic styles
const getCategoryStyle = (type, status) => {
  const lowerType = String(type || "").toLowerCase();
  const lowerStatus = String(status || "").toLowerCase();

  if (lowerStatus === "blocked" || lowerType.includes("blocked") || lowerType.includes("holiday")) {
    return {
      dotBg: "bg-slate-500",
      pillBg: "bg-slate-100 text-slate-700 border border-slate-200",
      cardBg: "bg-slate-50 border-slate-200 text-slate-800",
      label: "Blocked / Holiday"
    };
  }
  if (lowerType.includes("ocular") || lowerStatus.includes("scheduled")) {
    return {
      dotBg: "bg-blue-500",
      pillBg: "bg-blue-50 text-blue-700 border border-blue-200",
      cardBg: "bg-blue-50/60 border-blue-200/70 text-blue-900",
      label: "Ocular / Scheduled"
    };
  }
  if (lowerStatus === "pending deposit" || lowerStatus === "pending" || lowerStatus.includes("review")) {
    return {
      dotBg: "bg-amber-500",
      pillBg: "bg-amber-50 text-amber-800 border border-amber-200",
      cardBg: "bg-amber-50/60 border-amber-200/70 text-amber-900",
      label: "Pending Deposit / Review"
    };
  }
  // Confirmed & regular bookings
  return {
    dotBg: "bg-emerald-500",
    pillBg: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    cardBg: "bg-emerald-50/60 border-emerald-200/70 text-emerald-900",
    label: "Confirmed Event"
  };
};


export default function AdminEventCalendar({ bookingsProp = null }) {
  const toast = useToast();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month' | 'week' | 'agenda'

  // Data states
  const [bookings, setBookings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    isRange: false,
    startDate: formatDateKey(new Date()),
    endDate: formatDateKey(new Date()),
    reason: ""
  });
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Detail Modal
  const [activeItem, setActiveItem] = useState(null);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [bookRes, inqRes, blockRes] = await Promise.all([
        AdminAPI.getBookings().catch(() => ({ data: [] })),
        AdminAPI.getInquiries().catch(() => ({ data: [] })),
        AdminAPI.getBlockedDates().catch(() => ({ data: [] }))
      ]);

      setBookings(Array.isArray(bookRes.data) ? bookRes.data : []);
      setInquiries(Array.isArray(inqRes.data) ? inqRes.data : []);
      setBlockedDates(Array.isArray(blockRes.data) ? blockRes.data : []);
    } catch (err) {
      console.error("Failed to load calendar data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  useRealTimeRefresh(fetchCalendarData);

  // Map items by date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map();

    const addEventToMap = (dateStr, item) => {
      if (!dateStr) return;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push(item);
    };

    // 1. Blocked Dates
    blockedDates.forEach((b) => {
      const dateKey = formatDateKey(b.date);
      if (dateKey) {
        addEventToMap(dateKey, {
          id: `blocked-${b._id}`,
          rawId: b._id,
          type: "blocked",
          title: b.reason || "Blocked / Holiday",
          time: "All Day",
          status: "blocked",
          categoryLabel: "Blocked / Holiday",
          rawItem: b
        });
      }
    });

    // 2. Bookings
    bookings.forEach((b) => {
      if (b.event_date) {
        const dateKey = formatDateKey(b.event_date);
        addEventToMap(dateKey, {
          id: `booking-${b._id}`,
          rawId: b._id,
          type: "booking",
          title: b.event_type || b.package_id?.name || "Event Booking",
          clientName: b.customer_id?.full_name || b.customer_name || "Customer",
          time: b.start_time || "TBD",
          venue: b.venue || b.street || "Venue not set",
          status: b.status || "confirmed",
          categoryLabel: b.event_type || "Booking",
          rawItem: b
        });
      }

      // Check if booking has scheduled ocular visit
      if (b.ocular_visit && b.ocular_visit.status === "scheduled") {
        const ocularDate = b.ocular_visit.scheduled_date || b.ocular_visit.date;
        if (ocularDate) {
          const dateKey = formatDateKey(ocularDate);
          addEventToMap(dateKey, {
            id: `ocular-${b._id}`,
            rawId: b._id,
            type: "ocular",
            title: "Ocular Visit",
            clientName: b.customer_id?.full_name || b.customer_name || "Client",
            time: b.ocular_visit.time || b.start_time || "2:00 PM",
            venue: b.venue || "Site Location",
            status: "scheduled",
            categoryLabel: "Ocular Visit",
            rawItem: b
          });
        }
      }
    });

    // 3. Inquiries / Quotes
    inquiries.forEach((inq) => {
      if (inq.event_date && ["Pending Review", "Quote Sent", "Quote Accepted"].includes(inq.status)) {
        const dateKey = formatDateKey(inq.event_date);
        addEventToMap(dateKey, {
          id: `inquiry-${inq._id}`,
          rawId: inq._id,
          type: "inquiry",
          title: inq.event_type ? `Quote: ${inq.event_type}` : "Inquiry",
          clientName: `${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.trim() || "Inquirer",
          time: inq.start_time || "TBD",
          status: inq.status,
          categoryLabel: "Inquiry / Quote",
          rawItem: inq
        });
      }
    });

    return map;
  }, [bookings, inquiries, blockedDates]);

  // Calendar navigation helpers
  const prevPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

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

    // Days for next month to complete grid (up to 35 or 42)
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

  // Handlers for Block Date
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    if (!blockForm.startDate) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmittingBlock(true);
    try {
      const payload = blockForm.isRange
        ? { startDate: blockForm.startDate, endDate: blockForm.endDate, reason: blockForm.reason }
        : { date: blockForm.startDate, reason: blockForm.reason };

      await AdminAPI.blockDate(payload);
      toast.success("Date(s) blocked successfully");
      setShowBlockModal(false);
      setBlockForm({
        isRange: false,
        startDate: formatDateKey(new Date()),
        endDate: formatDateKey(new Date()),
        reason: ""
      });
      fetchCalendarData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block date");
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleUnblock = async (blockedId) => {
    try {
      await AdminAPI.unblockDate(blockedId);
      toast.success("Date unblocked successfully");
      if (activeItem?.rawId === blockedId) setActiveItem(null);
      fetchCalendarData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unblock date");
    }
  };

  const openBlockModalForDate = (dateObj) => {
    const formatted = formatDateKey(dateObj);
    setBlockForm({
      isRange: false,
      startDate: formatted,
      endDate: formatted,
      reason: ""
    });
    setShowBlockModal(true);
  };

  return (
    <div className="space-y-3.5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card rounded-lg border border-border/80 p-3 sm:p-3.5 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Availability Calendar
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage scheduled events, ocular visits, and blocked dates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* View Switcher Pills */}
          <div className="bg-muted p-0.5 rounded-md flex items-center gap-0.5 border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-0.5 rounded font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-0.5 rounded font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-2.5 py-0.5 rounded font-semibold transition-all ${
                viewMode === "agenda"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Primary Blue Block Date Button */}
          <button
            type="button"
            onClick={() => openBlockModalForDate(selectedDate)}
            className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-md shadow-2xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Lock size={12} />
            <span>Block Date</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Schedule Feed on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-3.5 items-start">
        {/* Calendar View Card */}
        <div className="bg-card rounded-lg border border-border/80 p-3 sm:p-3.5 shadow-2xs space-y-2.5">

          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevPeriod}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                title="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-sm sm:text-base font-bold text-foreground min-w-[130px] text-center">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </h3>
              <button
                type="button"
                onClick={nextPeriod}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                title="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-semibold text-foreground border border-border/80 px-2.5 py-1 rounded-md hover:bg-muted transition-colors"
            >
              Today
            </button>
          </div>

          {/* MONTH VIEW */}
          {viewMode === "month" && (
            <div className="space-y-1.5">
              {/* Days of Week Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} className="gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1 text-[10px] sm:text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
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
                      className={`min-h-[50px] sm:min-h-[56px] lg:min-h-[60px] rounded-lg p-1 border transition-all flex flex-col justify-between cursor-pointer overflow-hidden ${
                        isSelected
                          ? "border-primary ring-1.5 ring-primary/40 bg-primary/5 shadow-2xs"
                          : isToday
                          ? "border-blue-400/80 bg-blue-50/20"
                          : isCurrentMonth
                          ? "border-border/70 bg-card hover:border-slate-300 hover:shadow-2xs"
                          : "border-border/30 bg-muted/30 opacity-40"
                      }`}
                    >
                      {/* Top Row: Date Badge */}
                      <div className="flex items-center justify-between shrink-0">
                        <span
                          className={`text-[10px] sm:text-[11px] font-semibold rounded-full w-4.5 h-4.5 flex items-center justify-center ${
                            isToday
                              ? "bg-primary text-white font-bold shadow-2xs"
                              : isSelected
                              ? "bg-powder text-primary font-bold"
                              : "text-foreground"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary sm:hidden shrink-0" />
                        )}
                      </div>

                      {/* Bottom Event Pills */}
                      <div className="space-y-0.5 overflow-hidden flex-1 flex flex-col justify-end">
                        {/* Event Pill 1 */}
                        {dayEvents.slice(0, 1).map((ev) => {
                          const catStyle = getCategoryStyle(ev.categoryLabel || ev.title, ev.status);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItem(ev);
                              }}
                              className={`text-[9.5px] leading-tight font-medium px-1.5 py-[1.5px] rounded border truncate flex items-center gap-1 ${catStyle.pillBg} transition-transform hover:scale-[1.01]`}
                              title={`${ev.title} (${ev.clientName || ev.time})`}
                            >
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {/* Event Pill 2 (Desktop only) */}
                        {dayEvents.length > 1 && (
                          <div className="hidden sm:block">
                            {dayEvents.slice(1, 2).map((ev) => {
                              const catStyle = getCategoryStyle(ev.categoryLabel || ev.title, ev.status);
                              return (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveItem(ev);
                                  }}
                                  className={`text-[9.5px] leading-tight font-medium px-1.5 py-[1.5px] rounded border truncate flex items-center gap-1 ${catStyle.pillBg} transition-transform hover:scale-[1.01]`}
                                  title={`${ev.title} (${ev.clientName || ev.time})`}
                                >
                                  <span className="truncate">{ev.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Overflow Counter */}
                        {dayEvents.length > 2 && (
                          <div className="hidden sm:block text-[9px] font-semibold text-muted-foreground pl-0.5 leading-none">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                        {dayEvents.length > 1 && (
                          <div className="sm:hidden text-[9px] font-semibold text-muted-foreground pl-0.5 leading-none">
                            +{dayEvents.length - 1} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Restrained Inline Legend Footer */}
              <div className="pt-2.5 mt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Confirmed Event</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Pending Deposit / Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span>Ocular / Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                  <span>Blocked / Holiday</span>
                </div>
              </div>
            </div>
          )}


          {/* WEEK VIEW */}
          {viewMode === "week" && (
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
                          const catStyle = getCategoryStyle(ev.categoryLabel || ev.title, ev.status);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItem(ev);
                              }}
                              className={`p-1.5 rounded-lg text-[10px] font-medium ${catStyle.cardBg} border shadow-2xs cursor-pointer hover:opacity-90 leading-tight`}
                            >
                              <p className="font-bold truncate">{ev.title}</p>
                              {ev.clientName && <p className="text-[9px] opacity-80 truncate mt-0.5">{ev.clientName}</p>}
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
          {viewMode === "agenda" && (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {Array.from(eventsByDate.entries()).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No scheduled events or blocked dates found.</p>
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
                          const catStyle = getCategoryStyle(ev.categoryLabel || ev.title, ev.status);
                          return (
                            <div
                              key={ev.id}
                              onClick={() => setActiveItem(ev)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${catStyle.cardBg} cursor-pointer hover:shadow-2xs`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${catStyle.dotBg}`} />
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

        {/* Right Sidebar: Selected Date Card */}
        <div className="bg-card rounded-lg border border-border/80 p-3 sm:p-3.5 shadow-2xs space-y-2.5">

          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Selected Date
            </p>
            <h3 className="text-sm font-bold text-foreground mt-0.5 flex items-center justify-between">
              <span>{formatDisplayDate(selectedDate)}</span>
              {selectedDateKey === formatDateKey(new Date()) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-powder text-primary">
                  Today
                </span>
              )}
            </h3>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg p-3 bg-muted/20 space-y-2">
              <CalendarIcon size={18} className="mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">No events or blocks for this date.</p>
              <button
                type="button"
                onClick={() => openBlockModalForDate(selectedDate)}
                className="inline-block text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                + Block this date
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
              {selectedDayEvents.map((ev) => {
                const catStyle = getCategoryStyle(ev.categoryLabel || ev.title, ev.status);
                return (
                  <div
                    key={ev.id}
                    className={`p-2.5 rounded-lg border ${catStyle.cardBg} space-y-1.5 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-foreground leading-snug">{ev.title}</p>
                        {ev.clientName && (
                          <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                            {ev.clientName}
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${catStyle.pillBg}`}>
                        {ev.time}
                      </span>
                    </div>

                    {ev.venue && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin size={11} className="shrink-0" /> <span className="truncate">{ev.venue}</span>
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
                      {ev.type === "blocked" ? (
                        <button
                          type="button"
                          onClick={() => handleUnblock(ev.rawId)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock size={12} /> Unblock
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (ev.type === "booking") navigate(`/admin/bookings/${ev.rawId}/details`);
                            else if (ev.type === "inquiry") navigate(`/admin/quotes/${ev.rawId}/details`);
                          }}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Info size={12} /> View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Block Date Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border max-w-md w-full p-4 sm:p-4.5 shadow-xl space-y-3.5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2.5">

              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock size={16} className="text-primary" /> Block Calendar Date(s)
              </h3>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="space-y-3.5">
              {/* Range Toggle */}
              <div className="flex items-center justify-between bg-muted p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBlockForm({ ...blockForm, isRange: false })}
                  className={`flex-1 py-1 rounded-md text-center transition-all ${
                    !blockForm.isRange ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setBlockForm({ ...blockForm, isRange: true })}
                  className={`flex-1 py-1 rounded-md text-center transition-all ${
                    blockForm.isRange ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                  }`}
                >
                  Date Range
                </button>
              </div>

              {/* Date Inputs */}
              {!blockForm.isRange ? (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={blockForm.startDate}
                    onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={blockForm.endDate}
                      onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
              )}


              {/* Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maintenance, Public Holiday, Staff Retreat"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Quick Reason Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Maintenance", "Holiday", "Private Event", "Inventory Audit", "Staff Training"].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBlockForm({ ...blockForm, reason: preset })}
                        className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2 py-0.5 rounded-md border border-border/60 transition-colors"
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingBlock ? "Blocking..." : "Confirm Block"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Details Popup Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border max-w-md w-full p-4 sm:p-4.5 shadow-xl space-y-3 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2.5">

              <h3 className="text-base font-bold text-foreground">{activeItem.title}</h3>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-muted-foreground">
              {activeItem.clientName && (
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="font-semibold text-foreground">Client</span>
                  <span>{activeItem.clientName}</span>
                </div>
              )}
              {activeItem.time && (
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="font-semibold text-foreground">Time</span>
                  <span>{activeItem.time}</span>
                </div>
              )}
              {activeItem.venue && (
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="font-semibold text-foreground">Venue</span>
                  <span>{activeItem.venue}</span>
                </div>
              )}
              {activeItem.categoryLabel && (
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="font-semibold text-foreground">Category</span>
                  <span className="font-medium text-foreground">{activeItem.categoryLabel}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Close
              </button>
              {activeItem.rawId && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeItem.type === "booking") navigate(`/admin/bookings/${activeItem.rawId}/details`);
                    else if (activeItem.type === "inquiry") navigate(`/admin/quotes/${activeItem.rawId}/details`);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Open Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
