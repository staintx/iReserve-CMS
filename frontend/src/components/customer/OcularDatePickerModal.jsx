import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  CalendarDays 
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
  if (!value) return new Date();
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function OcularDatePickerModal({
  open,
  onClose,
  onSubmit,
  initialDate = "",
  initialTime = "10:00 AM",
  submitting = false,
  eventTitle = "Event Venue Inspection"
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => initialDate || getDateKey(today));
  const [selectedTime, setSelectedTime] = useState(() => initialTime || "10:00 AM");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = initialDate ? parseLocalDate(initialDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const isCurrentMonthOrPast = useMemo(() => {
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return currentMonth <= thisMonth;
  }, [currentMonth, today]);

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

  const isPastDate = (date) => {
    if (!date) return true;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isTodayDate = (date) => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const handleSelectDay = (dateObj) => {
    if (!dateObj || isPastDate(dateObj)) return;
    setSelectedDate(getDateKey(dateObj));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;
    onSubmit(selectedDate, selectedTime);
  };

  const formattedSelectedDate = selectedDate ? new Date(parseLocalDate(selectedDate)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] w-[92vw] max-h-[85vh] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl flex flex-col bg-white [&>button:last-child]:hidden">
        <form onSubmit={handleFormSubmit} className="flex flex-col h-full min-h-0">
          
          {/* Header matched with Caezelle Inquiry Form Brand Navy (#2C4B8A) & Gold (#D2B67C) */}
          <div className="p-4 sm:p-5 bg-[#2C4B8A] text-white flex items-start justify-between shrink-0 relative">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D2B67C]/20 text-[#E8D4A8] text-[11px] font-semibold border border-[#D2B67C]/40">
                <CalendarDays size={13} className="text-[#D2B67C]" /> Site Visit Inspection
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight pt-0.5">
                Schedule Ocular Visit
              </h3>
              <p className="text-xs text-white/80 font-normal">
                Pick a date and time slot to physically inspect the venue layout with our team.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
            
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
                    disabled={isCurrentMonthOrPast}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#F7F4EE] hover:text-[#2C4B8A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs font-bold text-[#5C402B] min-w-[100px] text-center">
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#F7F4EE] hover:text-[#2C4B8A] transition-colors"
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
                  const isSelected = selectedDate === dateKey;
                  const past = isPastDate(d);
                  const todayFlag = isTodayDate(d);

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={past}
                      onClick={() => handleSelectDay(d)}
                      className={cn(
                        "h-8 sm:h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center relative",
                        past
                          ? "text-slate-300 bg-slate-50/50 border border-slate-100/50 cursor-not-allowed text-[11px]"
                          : isSelected
                            ? "bg-[#2C4B8A] text-white font-bold shadow-md shadow-[#2C4B8A]/25 scale-[1.03] border border-[#2C4B8A]"
                            : "text-[#5C402B] bg-[#F7F4EE]/60 border border-transparent hover:bg-[#F7F4EE] hover:border-[#D2B67C] hover:text-[#2C4B8A]",
                        todayFlag && !isSelected && "ring-2 ring-[#2C4B8A]/70 font-bold text-[#2C4B8A]"
                      )}
                    >
                      {d.getDate()}
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
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "py-2 px-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5",
                        isSelected
                          ? "bg-[#2C4B8A] text-white border-[#2C4B8A] shadow-xs font-bold"
                          : "bg-[#F7F4EE]/60 text-[#5C402B] border-slate-200 hover:bg-[#F7F4EE] hover:border-[#D2B67C] hover:text-[#2C4B8A]"
                      )}
                    >
                      {isSelected && <CheckCircle2 size={13} className="text-[#D2B67C] shrink-0" />}
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection Summary Pill matched with Cream/Gold Design System */}
            <div className="p-3 bg-[#F7F4EE] rounded-xl border border-[#D2B67C]/50 flex items-center justify-between text-xs text-[#5C402B] shadow-xs">
              <div className="flex items-center gap-2">
                <CalendarIcon size={15} className="text-[#2C4B8A] shrink-0" />
                <span>
                  {selectedDate && selectedTime ? (
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
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#7B583C] hover:bg-[#F7F4EE] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedDate || !selectedTime}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2C4B8A] hover:bg-[#20396c] shadow-md shadow-[#2C4B8A]/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={14} className="text-[#D2B67C]" />
              )}
              {submitting ? "Submitting..." : "Confirm Schedule"}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
