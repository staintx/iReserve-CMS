import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { formatDateToYYYYMMDD } from "../../../utils/format";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CustomerCalendarCard({
  eventsMap = {},
  onSelectDate,
  selectedDate = null,
}) {
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => {
    // If selectedDate is given, initialize to it; else today
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    if (onSelectDate) {
      const todayKey = formatDateToYYYYMMDD(now);
      onSelectDate(now, eventsMap[todayKey] || []);
    }
  };

  const isCurrentViewingMonthToday =
    currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
      days.push({
        date: d,
        dayNum: prevMonthDays - i,
        isCurrentMonth: false,
        dateKey: formatDateToYYYYMMDD(d),
      });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        dateKey: formatDateToYYYYMMDD(d),
      });
    }

    // Days for next month to complete 5 or 6 rows (35 or 42 cells)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        dateKey: formatDateToYYYYMMDD(d),
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const todayKey = formatDateToYYYYMMDD(today);
  const selectedKey = selectedDate ? formatDateToYYYYMMDD(selectedDate) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between h-full min-h-[440px]">
      {/* ── Header: Month & Year + Controls ─────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#2C4B8A] flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Event & Payment Schedule</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isCurrentViewingMonthToday && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleGoToToday}
              className="text-[11px] h-7 px-2.5 font-semibold text-slate-600 hover:text-slate-900 border-slate-200 cursor-pointer"
            >
              Today
            </Button>
          )}

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/70 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Days of Week Row ────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1 pt-2.5 pb-1 text-center">
        {DAY_LABELS.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider py-1",
              idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Calendar Dates Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1">
        {calendarDays.map(({ date, dayNum, isCurrentMonth, dateKey }) => {
          const events = eventsMap[dateKey] || [];
          const hasEvents = events.length > 0;
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate && onSelectDate(date, events)}
              className={cn(
                "relative min-h-[46px] sm:min-h-[50px] p-1 rounded-lg flex flex-col items-center justify-between transition-all border text-center cursor-pointer select-none group",
                isCurrentMonth
                  ? "text-slate-800 hover:bg-slate-50 hover:border-slate-300"
                  : "text-slate-300 bg-slate-50/30 border-transparent hover:bg-slate-50 hover:text-slate-500",
                isToday && !isSelected && "ring-1.5 ring-[#2C4B8A] bg-blue-50/40 text-[#2C4B8A] font-bold",
                isSelected && "bg-[#2C4B8A]/10 border-[#2C4B8A] ring-1 ring-[#2C4B8A] font-bold text-[#2C4B8A]",
                hasEvents && !isSelected && "border-slate-200/90 shadow-2xs font-semibold"
              )}
            >
              {/* Day Number */}
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium leading-none mt-1",
                  isToday && "font-bold text-[#2C4B8A]",
                  isSelected && "text-[#2C4B8A] font-bold"
                )}
              >
                {dayNum}
              </span>

              {/* Event Indicator Dots */}
              <div className="flex items-center justify-center gap-1 min-h-[8px] mb-1 w-full px-0.5">
                {hasEvents ? (
                  events.slice(0, 3).map((ev, i) => (
                    <span
                      key={ev.id || i}
                      title={ev.title}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125",
                        ev.type === "confirmed" && "bg-emerald-500",
                        ev.type === "inquiry" && "bg-orange-500",
                        ev.type === "ocular" && "bg-purple-600",
                        ev.type === "payment_due" && "bg-blue-600",
                        ev.type === "overdue_payment" && "bg-rose-600",
                        ev.type === "completed" && "bg-slate-400"
                      )}
                    />
                  ))
                ) : (
                  <span className="w-1.5 h-1.5 invisible" />
                )}
                {events.length > 3 && (
                  <span className="text-[9px] font-bold text-slate-500 leading-none">
                    +{events.length - 2}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Calendar Legend ─────────────────────────────────────── */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-center sm:justify-start gap-x-3.5 gap-y-1.5 text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
          <span>Inquiry / Quote</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
          <span>Ocular Visit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span>Payment Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          <span>Overdue Payment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}
