import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  CalendarDays,
  AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const dateStr = String(value).split("T")[0];
  const parts = dateStr.split("-").map(Number);
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const getDateKey = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : parseLocalDate(date);
  if (!d || isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function OcularDatePickerModal({
  open,
  isOpen,
  onClose,
  onSubmit,
  initialDate = "",
  initialTime = "10:00 AM",
  submitting = false,
  isSubmitting = false,
  eventDate,
  eventTitle = "Event Venue Inspection"
}) {
  const isOpenModal = Boolean(open || isOpen);
  const isSubmittingForm = Boolean(submitting || isSubmitting);

  // TODAY normalized to start of day
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const todayKey = useMemo(() => getDateKey(today), [today]);

  // EVENT DATE normalized to start of day
  const parsedEventDate = useMemo(() => {
    return parseLocalDate(eventDate);
  }, [eventDate]);

  const eventDateKey = useMemo(() => {
    return parsedEventDate ? getDateKey(parsedEventDate) : "";
  }, [parsedEventDate]);

  // minimumAllowedDate = TODAY + 1 day
  const minAllowedDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const minAllowedDateKey = useMemo(() => getDateKey(minAllowedDate), [minAllowedDate]);

  // maximumAllowedDate = EVENT_DATE - 1 day
  const maxAllowedDate = useMemo(() => {
    if (!parsedEventDate) return null;
    const d = new Date(parsedEventDate);
    d.setDate(d.getDate() - 1);
    return d;
  }, [parsedEventDate]);

  const maxAllowedDateKey = useMemo(() => {
    return maxAllowedDate ? getDateKey(maxAllowedDate) : "";
  }, [maxAllowedDate]);

  // Check if there are ANY valid dates between TODAY and EVENT_DATE
  // Selectable dates must satisfy: TODAY < selectedDate < EVENT_DATE
  const hasAvailableDates = useMemo(() => {
    if (!maxAllowedDateKey) return true;
    return minAllowedDateKey <= maxAllowedDateKey;
  }, [minAllowedDateKey, maxAllowedDateKey]);

  // Function to validate if a date can be selected
  const isDateValid = useMemo(() => {
    return (dateObj) => {
      if (!dateObj) return false;
      const key = getDateKey(dateObj);
      if (!key) return false;
      if (key < minAllowedDateKey) return false; // TODAY or earlier
      if (maxAllowedDateKey && key > maxAllowedDateKey) return false; // EVENT_DATE or later
      return true;
    };
  }, [minAllowedDateKey, maxAllowedDateKey]);

  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) {
      const d = parseLocalDate(initialDate);
      if (d && isDateValid(d)) return getDateKey(d);
    }
    return hasAvailableDates ? minAllowedDateKey : "";
  });

  const [selectedTime, setSelectedTime] = useState(() => initialTime || "10:00 AM");

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDate) {
      const d = parseLocalDate(initialDate);
      if (d && isDateValid(d)) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    if (hasAvailableDates) {
      return new Date(minAllowedDate.getFullYear(), minAllowedDate.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const isPrevMonthDisabled = useMemo(() => {
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    const minYear = minAllowedDate.getFullYear();
    const minMonth = minAllowedDate.getMonth();
    return curYear < minYear || (curYear === minYear && curMonth <= minMonth);
  }, [currentMonth, minAllowedDate]);

  const isNextMonthDisabled = useMemo(() => {
    if (!maxAllowedDate) return false;
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    const maxYear = maxAllowedDate.getFullYear();
    const maxMonth = maxAllowedDate.getMonth();
    return curYear > maxYear || (curYear === maxYear && curMonth >= maxMonth);
  }, [currentMonth, maxAllowedDate]);

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
    if (isPrevMonthDisabled) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (dateObj) => {
    if (!dateObj || !isDateValid(dateObj)) return;
    setSelectedDate(getDateKey(dateObj));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!hasAvailableDates) return;
    if (!selectedDate || !selectedTime) return;
    const parsed = parseLocalDate(selectedDate);
    if (!isDateValid(parsed)) return;
    onSubmit(selectedDate, selectedTime);
  };

  // Safe selected date that is guaranteed to be valid
  const effectiveSelectedDate = isDateValid(parseLocalDate(selectedDate)) ? selectedDate : "";

  const formattedSelectedDate = effectiveSelectedDate ? new Date(parseLocalDate(effectiveSelectedDate)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : null;

  return (
    <Dialog open={isOpenModal} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] w-[92vw] max-h-[85vh] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl flex flex-col bg-white [&>button:last-child]:hidden">
        <form onSubmit={handleFormSubmit} className="flex flex-col h-full min-h-0">
          
          {/* Header matched with Caezelle Brand Navy (#2C4B8A) & Gold (#D2B67C) */}
          <div className="p-4 sm:p-5 bg-[#2C4B8A] text-white flex items-start justify-between shrink-0 relative">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D2B67C]/20 text-[#E8D4A8] text-[11px] font-semibold border border-[#D2B67C]/40">
                <CalendarDays size={13} className="text-[#D2B67C]" /> Site Visit Inspection
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight pt-0.5">
                Schedule Ocular Visit
              </h3>
              <p className="text-xs text-white/80 font-normal">
                Pick a date and time slot to inspect the venue layout for {eventTitle}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            
            {/* Edge Case Warning: No Available Dates */}
            {!hasAvailableDates && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-xs text-amber-950">No Available Dates</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    No available dates for an ocular visit before your event.
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Calendar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C402B] flex items-center gap-1.5">
                  <CalendarIcon size={13} className="text-[#2C4B8A]" /> 1. Select Inspection Date
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    disabled={isPrevMonthDisabled}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#F7F4EE] hover:text-[#2C4B8A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs font-bold text-[#5C402B] min-w-[100px] text-center">
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    disabled={isNextMonthDisabled}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#F7F4EE] hover:text-[#2C4B8A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 pb-0.5">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((d, idx) => {
                  if (!d) return <div key={`empty-${idx}`} className="h-8 sm:h-9" />;
                  
                  const dateKey = getDateKey(d);
                  const isValid = isDateValid(d);
                  const isSelected = isValid && effectiveSelectedDate === dateKey;
                  const isToday = dateKey === todayKey;
                  const isEventDay = dateKey === eventDateKey;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={!isValid}
                      onClick={() => handleSelectDay(d)}
                      aria-disabled={!isValid}
                      className={cn(
                        "h-8 sm:h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center relative select-none",
                        !isValid
                          ? "text-slate-300/80 bg-slate-100/50 border border-slate-100/70 cursor-not-allowed text-[11px] opacity-40 pointer-events-none"
                          : isSelected
                            ? "bg-[#2C4B8A] text-white font-bold shadow-md shadow-[#2C4B8A]/25 scale-[1.03] border border-[#2C4B8A] cursor-pointer"
                            : "text-[#5C402B] bg-[#F7F4EE]/70 border border-slate-200/60 hover:bg-[#F7F4EE] hover:border-[#D2B67C] hover:text-[#2C4B8A] cursor-pointer"
                      )}
                    >
                      <span>{d.getDate()}</span>
                      {isToday && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-slate-400/80" title="Today" />
                      )}
                      {isEventDay && (
                        <span
                          className="absolute -top-1 -right-0.5 text-[8px] bg-amber-100 text-amber-900 font-bold px-1 rounded-xs border border-amber-300/80 leading-none py-0.5 pointer-events-none uppercase tracking-tighter"
                          title="Event Date"
                        >
                          Event
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Selector */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C402B] flex items-center gap-1.5">
                <Clock size={13} className="text-[#2C4B8A]" /> 2. Select Preferred Time Slot
              </span>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!hasAvailableDates}
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "py-2 px-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5",
                        !hasAvailableDates
                          ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200"
                          : isSelected
                            ? "bg-[#2C4B8A] text-white border-[#2C4B8A] shadow-xs font-bold cursor-pointer"
                            : "bg-[#F7F4EE]/60 text-[#5C402B] border-slate-200 hover:bg-[#F7F4EE] hover:border-[#D2B67C] hover:text-[#2C4B8A] cursor-pointer"
                      )}
                    >
                      {isSelected && <CheckCircle2 size={13} className="text-[#D2B67C] shrink-0" />}
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection Summary Pill */}
            <div className="p-3 bg-[#F7F4EE] rounded-xl border border-[#D2B67C]/50 flex items-center justify-between text-xs text-[#5C402B] shadow-xs">
              <div className="flex items-center gap-2">
                <CalendarIcon size={15} className="text-[#2C4B8A] shrink-0" />
                <span>
                  {!hasAvailableDates ? (
                    <span className="text-amber-900 font-semibold">
                      No available dates for an ocular visit before your event.
                    </span>
                  ) : effectiveSelectedDate && selectedTime ? (
                    <>
                      <strong className="text-[#2C4B8A]">Selected Visit:</strong> {formattedSelectedDate} at <strong className="text-[#2C4B8A]">{selectedTime}</strong>
                    </>
                  ) : (
                    <span className="text-[#7B583C] font-medium">Please select an inspection date and time slot.</span>
                  )}
                </span>
              </div>
            </div>

          </div>

          {/* Fixed Footer Actions */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmittingForm}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#7B583C] hover:bg-[#F7F4EE] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmittingForm ||
                !hasAvailableDates ||
                !effectiveSelectedDate ||
                !selectedTime ||
                !isDateValid(parseLocalDate(effectiveSelectedDate))
              }
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2C4B8A] hover:bg-[#20396c] shadow-md shadow-[#2C4B8A]/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              {isSubmittingForm ? (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={14} className="text-[#D2B67C]" />
              )}
              {isSubmittingForm ? "Submitting..." : "Confirm Schedule"}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
