import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  MapPin, 
  CalendarDays 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(() => initialDate || getDateKey(today));
  const [selectedTime, setSelectedTime] = useState(() => initialTime || "10:00 AM");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = initialDate ? parseLocalDate(initialDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

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

  const handleSelectDay = (dateObj) => {
    if (!dateObj || isPastDate(dateObj)) return;
    setSelectedDate(getDateKey(dateObj));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate) return;
    onSubmit(selectedDate, selectedTime);
  };

  const formattedSelectedDate = selectedDate ? new Date(parseLocalDate(selectedDate)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : "None selected";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <form onSubmit={handleFormSubmit} className="bg-white">
          
          {/* Header */}
          <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between relative">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                <CalendarDays size={14} /> Site Visit Inspection
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight pt-1">
                Schedule Ocular Visit
              </h3>
              <p className="text-xs text-slate-300">
                Pick a date and time slot to physically inspect the venue layout with our team.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            
            {/* Interactive Calendar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-amber-500" /> 1. Select Inspection Date
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 min-w-[110px] text-center">
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 pb-1">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((d, idx) => {
                  if (!d) return <div key={`empty-${idx}`} className="h-9" />;
                  
                  const dateKey = getDateKey(d);
                  const isSelected = selectedDate === dateKey;
                  const past = isPastDate(d);

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={past}
                      onClick={() => handleSelectDay(d)}
                      className={cn(
                        "h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center relative",
                        past
                          ? "text-slate-300 cursor-not-allowed bg-slate-50"
                          : isSelected
                            ? "bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30 scale-105"
                            : "text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-semibold"
                      )}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Time Slots */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" /> 2. Select Preferred Time Slot
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
                        "py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5",
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-md"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900"
                      )}
                    >
                      {isSelected && <CheckCircle2 size={13} className="text-amber-400 shrink-0" />}
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection Summary Pill */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <CalendarIcon size={15} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Selected Visit:</strong> {formattedSelectedDate} at <strong>{selectedTime}</strong>
                </span>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedDate}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={15} />
              )}
              {submitting ? "Submitting..." : "Submit Ocular Request"}
            </button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
