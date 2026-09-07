import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLocalDate, formatEventDate } from "@/utils/format";

const PRESET_TIME_SLOTS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDateKey = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Converts 12h string ("09:00 AM") or 24h ("09:00") to total minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match12 = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  return null;
};

// Formats 24h time ("14:30") into 12h string ("02:30 PM")
const format24hTo12h = (time24) => {
  const mins = parseTimeToMinutes(time24);
  if (mins === null) return time24;
  let hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

export default function AdminOcularDateTimePicker({
  selectedBooking = null,
  dateValue = "",
  timeValue = "",
  onDateChange,
  onTimeChange,
  dateLabel = "1. Ocular Visit Date",
  timeLabel = "2. Ocular Visit Time",
  hideContextPill = false,
  hideSummaryBanner = false,
  disableEventDateLimit = false
}) {
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const eventDateObj = useMemo(() => {
    if (!selectedBooking || !selectedBooking.event_date) return null;
    const d = parseLocalDate(selectedBooking.event_date);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedBooking]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (dateValue) {
      const parsed = parseLocalDate(dateValue);
      if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  });

  const [isCustomTimeMode, setIsCustomTimeMode] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const isCurrentMonthOrPast = useMemo(() => {
    const thisMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    return currentMonth <= thisMonth;
  }, [currentMonth, startOfToday]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    if (isCurrentMonthOrPast) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isDateDisabled = (dateObj) => {
    if (!dateObj) return true;
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);

    // 1. Never allow dates before today
    if (d < startOfToday) return true;

    // 2. Never allow dates after event date (unless disabled for event date selection)
    if (!disableEventDateLimit && eventDateObj && d > eventDateObj) return true;

    return false;
  };

  const isTodayDate = (dateObj) => {
    if (!dateObj) return false;
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === startOfToday.getTime();
  };

  const isEventDate = (dateObj) => {
    if (!dateObj || !eventDateObj) return false;
    const d = new Date(dateObj);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === eventDateObj.getTime();
  };

  const isTimeSlotDisabled = (slotStr) => {
    if (!dateValue) return false;
    const slotMins = parseTimeToMinutes(slotStr);
    if (slotMins === null) return false;

    const selectedDateObj = parseLocalDate(dateValue);
    if (!selectedDateObj) return false;
    selectedDateObj.setHours(0, 0, 0, 0);

    // 1. If selected date is TODAY, disable past time slots
    if (selectedDateObj.getTime() === startOfToday.getTime()) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      if (slotMins <= currentMins) return true;
    }

    // 2. If selected date IS the event date, ocular time must be EARLIER than event start_time
    if (eventDateObj && selectedDateObj.getTime() === eventDateObj.getTime() && selectedBooking?.start_time) {
      const eventStartMins = parseTimeToMinutes(selectedBooking.start_time);
      if (eventStartMins !== null && slotMins >= eventStartMins) {
        return true;
      }
    }

    return false;
  };

  const handleSelectDay = (dateObj) => {
    if (isDateDisabled(dateObj)) return;
    const dateKey = getDateKey(dateObj);
    onDateChange(dateKey);
  };

  const handlePresetTimeSelect = (slot) => {
    if (isTimeSlotDisabled(slot)) return;
    setIsCustomTimeMode(false);
    onTimeChange(slot);
  };

  const handleCustomTimeInput = (val) => {
    setCustomTime(val);
    if (val) {
      const formatted = format24hTo12h(val);
      onTimeChange(formatted);
    }
  };

  const sameDayEventTimeConflict = useMemo(() => {
    if (!dateValue || !timeValue || !eventDateObj || !selectedBooking?.start_time) return false;
    const selectedDateObj = parseLocalDate(dateValue);
    if (!selectedDateObj) return false;
    selectedDateObj.setHours(0, 0, 0, 0);

    if (selectedDateObj.getTime() === eventDateObj.getTime()) {
      const ocularMins = parseTimeToMinutes(timeValue);
      const eventStartMins = parseTimeToMinutes(selectedBooking.start_time);
      if (ocularMins !== null && eventStartMins !== null && ocularMins >= eventStartMins) {
        return true;
      }
    }
    return false;
  }, [dateValue, timeValue, eventDateObj, selectedBooking]);

  const formattedSelectedDate = useMemo(() => {
    if (!dateValue) return null;
    const parsed = parseLocalDate(dateValue);
    return parsed ? parsed.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }) : null;
  }, [dateValue]);

  const formattedEventDate = useMemo(() => {
    if (!selectedBooking?.event_date) return null;
    return formatEventDate(selectedBooking.event_date, { fallback: "TBA" });
  }, [selectedBooking]);

  return (
    <div className="space-y-3 font-sans">
      
      {/* Compact Event Context Pill */}
      {!hideContextPill && selectedBooking && (
        <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-lg text-xs space-y-1 text-slate-800 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-blue-950">
            <span className="truncate">
              {selectedBooking.reference || `BK-${selectedBooking._id.substring(selectedBooking._id.length - 6).toUpperCase()}`} — {selectedBooking.contact_first_name || ""} {selectedBooking.contact_last_name || ""}
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded shrink-0">
              {selectedBooking.event_type || "Event"}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] text-blue-900 gap-x-3 gap-y-0.5">
            <span>Target Event Date: <strong>{formattedEventDate || "N/A"}</strong> ({selectedBooking.start_time || "TBA"})</span>
            {selectedBooking.venue_type && (
              <span className="truncate flex items-center gap-1">
                <MapPin size={11} className="text-blue-600 shrink-0" /> {selectedBooking.venue_type}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Calendar Grid */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <CalendarIcon size={13} className="text-blue-600" /> {dateLabel}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              disabled={isCurrentMonthOrPast}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-slate-800 min-w-[95px] text-center">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
          <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, idx) => {
            if (!d) return <div key={`empty-${idx}`} className="h-7 sm:h-8" />;

            const dateKey = getDateKey(d);
            const isSelected = dateValue === dateKey;
            const disabled = isDateDisabled(d);
            const todayFlag = isTodayDate(d);
            const eventFlag = isEventDate(d);

            return (
              <button
                key={dateKey}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectDay(d)}
                title={eventFlag ? "Target Event Date" : undefined}
                className={cn(
                  "h-7 sm:h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center relative",
                  disabled
                    ? "text-slate-300 bg-slate-50/50 cursor-not-allowed text-[11px]"
                    : isSelected
                      ? "bg-blue-600 text-white font-bold shadow-xs scale-[1.02]"
                      : "text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/60",
                  todayFlag && !isSelected && "ring-2 ring-blue-500/50 font-bold text-blue-600",
                  eventFlag && !isSelected && !disabled && "border-amber-400 bg-amber-50/40 text-amber-900"
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Picker */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Clock size={13} className="text-blue-600" /> {timeLabel}
          </span>
          <button
            type="button"
            onClick={() => setIsCustomTimeMode(!isCustomTimeMode)}
            className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
          >
            {isCustomTimeMode ? "Use Preset Slots" : "Custom Time"}
          </button>
        </div>

        {!isCustomTimeMode ? (
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_TIME_SLOTS.map((slot) => {
              const isSelected = timeValue === slot;
              const disabled = isTimeSlotDisabled(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePresetTimeSelect(slot)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all flex items-center justify-center gap-1",
                    disabled
                      ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                      : isSelected
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                  )}
                >
                  {isSelected && <CheckCircle2 size={12} className="text-white shrink-0" />}
                  <span>{slot}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <input
              type="time"
              value={customTime}
              onChange={(e) => handleCustomTimeInput(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {timeValue && <span className="text-[11px] text-blue-700 font-medium block">Selected: {timeValue}</span>}
          </div>
        )}
      </div>

      {/* Same-Day Time Conflict Alert */}
      {!disableEventDateLimit && sameDayEventTimeConflict && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
          <span>
            <strong>Invalid Schedule Time:</strong> On the event date, ocular inspection must occur <em>earlier</em> than event start time ({selectedBooking?.start_time}).
          </span>
        </div>
      )}

      {/* Selection Summary Banner */}
      {!hideSummaryBanner && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-blue-600 shrink-0" />
            <span>
              {dateValue && timeValue ? (
                <>
                  <strong className="text-slate-900">Scheduled:</strong> {formattedSelectedDate} @ <strong className="text-blue-700">{timeValue}</strong>
                </>
              ) : (
                <span className="text-slate-400 italic">Select an inspection date and time slot above.</span>
              )}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
