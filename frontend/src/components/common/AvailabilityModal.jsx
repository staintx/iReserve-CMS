import React, { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  AlertTriangle, 
  CalendarRange, 
  Clock, 
  RotateCcw 
} from "lucide-react";

const toDateKey = (date) => {
  const d = new Date(date);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

export default function AvailabilityModal(props) {
  if (!props.open) return null;
  return <AvailabilityModalDialog {...props} />;
}

function AvailabilityModalDialog({
  open,
  onClose,
  initialMonth = new Date(),
  initialUnavailable = [],
  assignments = [],
  onSave,
  userRole = "staff",
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date(initialMonth));
  const [unavailableDates, setUnavailableDates] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Mode: "click" (single date selection on calendar) or "range" (date range selector)
  const [selectionMode, setSelectionMode] = useState("click");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  useEffect(() => {
    if (open) {
      setUnavailableDates(new Set(initialUnavailable || []));
      setCurrentDate(new Date(initialMonth));
      setErrorMsg("");
      setRangeStart("");
      setRangeEnd("");
    }
  }, [open, initialUnavailable, initialMonth]);

  const monthKey = useMemo(() => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  }, [currentDate]);

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  }, [currentDate]);

  // Map assigned event dates
  const assignedDatesSet = useMemo(() => {
    const set = new Set();
    (assignments || []).forEach((item) => {
      if (item.date) {
        set.add(toDateKey(new Date(item.date)));
      }
    });
    return set;
  }, [assignments]);

  // Calendar month grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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
  }, [currentDate]);

  const toggleDate = (dateObj) => {
    if (!dateObj) return;
    setErrorMsg("");
    const key = toDateKey(dateObj);
    setUnavailableDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleApplyRange = (markAsUnavailable = true) => {
    setErrorMsg("");
    if (!rangeStart || !rangeEnd) {
      setErrorMsg("Please select both a Start Date and an End Date.");
      return;
    }

    if (rangeStart > rangeEnd) {
      setErrorMsg("End Date cannot be earlier than Start Date.");
      return;
    }

    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);

    // Calculate dates between start and end
    const curr = new Date(start);
    const newDates = new Set(unavailableDates);

    while (curr <= end) {
      const key = toDateKey(curr);
      if (markAsUnavailable) {
        newDates.add(key);
      } else {
        newDates.delete(key);
      }
      curr.setDate(curr.getDate() + 1);
    }

    setUnavailableDates(newDates);
    setRangeStart("");
    setRangeEnd("");
  };

  const handleRemoveDate = (key) => {
    setUnavailableDates((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleClearAll = () => {
    // Clear only for the currently viewed month
    setUnavailableDates((prev) => {
      const next = new Set(prev);
      Array.from(next).forEach((key) => {
        if (key.startsWith(monthKey)) {
          next.delete(key);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    try {
      await onSave(monthKey, Array.from(unavailableDates));
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  const stepMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  // Count unavailable dates in the current month
  const currentMonthUnavailableCount = useMemo(() => {
    return Array.from(unavailableDates).filter((key) => key.startsWith(monthKey)).length;
  }, [unavailableDates, monthKey]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set My Availability"
      className="max-w-2xl sm:max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span>
              <strong>{currentMonthUnavailableCount}</strong> unavailable date(s) in {monthLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#4C81E0] text-xs font-bold text-white hover:bg-[#3b6bc4] transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-2xs"
            >
              <Check size={14} />
              <span>{saving ? "Saving..." : "Save Availability"}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Informational Banner */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold text-blue-950 flex items-center gap-1.5">
            <CalendarIcon size={14} className="text-[#4C81E0] shrink-0" />
            <span>Manage Your Unavailability Schedule</span>
          </p>
          <p className="mt-0.5 text-blue-800">
            Mark dates when you are off-duty or unavailable for catering events. The Administrator will be informed of your unavailability when assigning teams to events. Existing assignments are preserved.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setSelectionMode("click")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectionMode === "click"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Click Single Days
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode("range")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                selectionMode === "range"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarRange size={13} />
              <span>Date Range Picker</span>
            </button>
          </div>

          {currentMonthUnavailableCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw size={12} />
              <span>Clear This Month</span>
            </button>
          )}
        </div>

        {/* Range Selection Inputs (if range mode active) */}
        {selectionMode === "range" && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarRange size={14} className="text-[#4C81E0]" />
              <span>Block Unavailable Date Range</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  End Date
                </label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  min={rangeStart || undefined}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleApplyRange(true)}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Mark Range Unavailable
              </button>
              <button
                type="button"
                onClick={() => handleApplyRange(false)}
                className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Range (Mark Available)
              </button>
            </div>
          </div>
        )}

        {/* Calendar Month Navigation Header */}
        <div className="flex items-center justify-between border rounded-lg p-2.5 bg-slate-50/50 border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{monthLabel}</h3>
            <span className="text-xs text-slate-400 font-mono">({monthKey})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Day-Click Grid */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1">
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
                return <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-lg bg-slate-50/30" />;
              }

              const dateKey = toDateKey(dateObj);
              const isUnavailable = unavailableDates.has(dateKey);
              const hasAssignment = assignedDatesSet.has(dateKey);
              const isToday = toDateKey(new Date()) === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => toggleDate(dateObj)}
                  title={`${dateKey} — ${isUnavailable ? "Unavailable (Click to make available)" : "Available (Click to mark unavailable)"}`}
                  className={`h-12 sm:h-14 rounded-lg border text-left p-1.5 sm:p-2 transition-all relative flex flex-col justify-between cursor-pointer select-none ${
                    isUnavailable
                      ? "border-rose-300 bg-rose-50/90 text-rose-900 shadow-2xs font-bold"
                      : "border-slate-200/80 bg-white text-slate-800 hover:border-[#4C81E0]/50 hover:bg-slate-50"
                  } ${isToday ? "ring-2 ring-[#4C81E0]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tabular-nums">
                      {dateObj.getDate()}
                    </span>

                    {isUnavailable && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {hasAssignment && (
                      <span className="block text-[9px] font-semibold text-blue-700 bg-blue-100/80 px-1 py-0.2 rounded truncate">
                        Assigned
                      </span>
                    )}
                    {isUnavailable && (
                      <span className="block text-[9.5px] font-bold text-rose-700 truncate leading-none">
                        Off-duty
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block" />
            <span>Available (Duty Open)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
            <span className="text-rose-800 font-semibold">Off-Duty / Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />
            <span className="text-blue-800 font-semibold">Assigned Event</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
