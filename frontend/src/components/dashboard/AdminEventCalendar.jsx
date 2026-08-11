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

// Map event type/category to color pill styles
const getCategoryStyle = (type, status) => {
  const lowerType = String(type || "").toLowerCase();
  const lowerStatus = String(status || "").toLowerCase();

  if (lowerStatus === "blocked" || lowerType.includes("blocked") || lowerType.includes("holiday")) {
    return {
      dotBg: "bg-slate-400",
      pillBg: "bg-slate-600 text-white",
      cardBg: "bg-slate-50 border-slate-200 text-slate-800",
      label: "Blocked / Holiday"
    };
  }
  if (lowerType.includes("ocular")) {
    return {
      dotBg: "bg-cyan-400",
      pillBg: "bg-cyan-600 text-white",
      cardBg: "bg-cyan-50 border-cyan-200 text-cyan-900",
      label: "Ocular Visit"
    };
  }
  if (lowerType.includes("corporate")) {
    return {
      dotBg: "bg-blue-500",
      pillBg: "bg-blue-600 text-white",
      cardBg: "bg-blue-50 border-blue-200 text-blue-900",
      label: "Corporate"
    };
  }
  if (lowerType.includes("birthday") || lowerType.includes("debut") || lowerType.includes("party")) {
    return {
      dotBg: "bg-purple-500",
      pillBg: "bg-purple-600 text-white",
      cardBg: "bg-purple-50 border-purple-200 text-purple-900",
      label: "Birthday/Debut"
    };
  }
  if (lowerType.includes("launch") || lowerType.includes("other") || lowerType.includes("anniversary")) {
    return {
      dotBg: "bg-rose-500",
      pillBg: "bg-rose-600 text-white",
      cardBg: "bg-rose-50 border-rose-200 text-rose-900",
      label: "Launch/Other"
    };
  }
  if (lowerStatus === "pending deposit" || lowerStatus === "pending") {
    return {
      dotBg: "bg-amber-400",
      pillBg: "bg-amber-500 text-white",
      cardBg: "bg-amber-50 border-amber-200 text-amber-900",
      label: "Pending Deposit"
    };
  }
  // Default confirmed events
  return {
    dotBg: "bg-emerald-500",
    pillBg: "bg-emerald-600 text-white",
    cardBg: "bg-emerald-50 border-emerald-200 text-emerald-900",
    label: "Confirmed Events"
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
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div>
          <h1
            style={{ fontFamily: "Playfair Display, serif" }}
            className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
          >
            Availability Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage scheduled events, ocular visits, and blocked dates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* View Switcher Pills */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "agenda"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Primary Blue Block Date Button */}
          <button
            type="button"
            onClick={() => openBlockModalForDate(selectedDate)}
            className="flex items-center gap-1.5 bg-[#4C81E0] hover:bg-[#3b6bc4] text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Block Date</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Area + Selected Date Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-4 items-start">
        {/* Calendar View Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevPeriod}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 min-w-[140px] text-center">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>
              <button
                type="button"
                onClick={nextPeriod}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200/90 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
          </div>

          {/* MONTH VIEW */}
          {viewMode === "month" && (
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
                      className={`h-[56px] sm:h-[62px] lg:h-[68px] rounded-xl p-1 sm:p-1.5 border transition-all flex flex-col justify-between cursor-pointer overflow-hidden ${
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
                              className={`text-[9px] sm:text-[10px] leading-tight font-medium px-1.5 py-[2px] rounded-md truncate flex items-center gap-1 ${catStyle.pillBg} transition-transform hover:scale-[1.01]`}
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
                                  className={`text-[9px] sm:text-[10px] leading-tight font-medium px-1.5 py-[2px] rounded-md truncate flex items-center gap-1 ${catStyle.pillBg} transition-transform hover:scale-[1.01]`}
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
                          <div className="hidden sm:block text-[9px] font-bold text-slate-500 pl-1 leading-none">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                        {dayEvents.length > 1 && (
                          <div className="sm:hidden text-[9px] font-bold text-slate-500 pl-1 leading-none">
                            +{dayEvents.length - 1} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inline Legend Footer */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Pending Deposit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Corporate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span>Birthday/Debut</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Ocular Visit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Launch/Other</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Date
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center justify-between">
              <span>{formatDisplayDate(selectedDate)}</span>
              {selectedDateKey === formatDateKey(new Date()) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Today
                </span>
              )}
            </h3>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
              <CalendarIcon size={20} className="mx-auto text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">No events or blocks for this date.</p>
              <button
                type="button"
                onClick={() => openBlockModalForDate(selectedDate)}
                className="inline-block text-xs font-semibold text-[#4C81E0] hover:text-[#3b6bc4] underline"
              >
                + Block this date
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
              {selectedDayEvents.map((ev) => {
                const catStyle = getCategoryStyle(ev.categoryLabel || ev.title, ev.status);
                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border ${catStyle.cardBg} space-y-2 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-slate-900 leading-snug">{ev.title}</p>
                        {ev.clientName && (
                          <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                            {ev.clientName}
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${catStyle.pillBg}`}>
                        {ev.time}
                      </span>
                    </div>

                    {ev.venue && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                        <MapPin size={11} className="shrink-0" /> <span className="truncate">{ev.venue}</span>
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                      {ev.type === "blocked" ? (
                        <button
                          type="button"
                          onClick={() => handleUnblock(ev.rawId)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
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
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-[#4C81E0]" /> Block Calendar Date(s)
              </h3>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="space-y-4">
              {/* Range Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBlockForm({ ...blockForm, isRange: false })}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    !blockForm.isRange ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setBlockForm({ ...blockForm, isRange: true })}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    blockForm.isRange ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Date Range
                </button>
              </div>

              {/* Date Inputs */}
              {!blockForm.isRange ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={blockForm.startDate}
                    onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={blockForm.endDate}
                      onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maintenance, Public Holiday, Staff Retreat"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quick Reason Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Maintenance", "Holiday", "Private Event", "Inventory Audit", "Staff Training"].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBlockForm({ ...blockForm, reason: preset })}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors"
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#4C81E0] hover:bg-[#3b6bc4] text-white transition-all shadow-xs disabled:opacity-50"
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
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{activeItem.title}</h3>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              {activeItem.clientName && (
                <p className="flex items-center gap-2">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <span>Customer: <strong>{activeItem.clientName}</strong></span>
                </p>
              )}
              <p className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400 shrink-0" />
                <span>Time: <strong>{activeItem.time}</strong></span>
              </p>
              {activeItem.venue && (
                <p className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span>Location: {activeItem.venue}</span>
                </p>
              )}
              <p className="flex items-center gap-2">
                <Tag size={14} className="text-slate-400 shrink-0" />
                <span>Category: {activeItem.categoryLabel || activeItem.type}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {activeItem.type === "blocked" ? (
                <button
                  type="button"
                  onClick={() => handleUnblock(activeItem.rawId)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5"
                >
                  <Unlock size={13} /> Unblock Date
                </button>
              ) : (
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
