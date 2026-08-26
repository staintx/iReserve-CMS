import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Card,
  SH,
  SectionTitle,
  StepShell,
} from "../components/BookingSharedUI";
import { focusRing } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import { CustomerAPI } from "../../../../api/customer";

const DEFAULT_TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
].map((time) => ({ time, status: "available" }));

const parseLocalDate = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDisplayTime = (time24) => {
  if (!time24) return "";
  let [hours, minutes] = time24.split(":");
  hours = parseInt(hours, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? "0" + hours : hours;
  return `${strHours}:${minutes} ${ampm}`;
};

export default function StepDateTime({
  form,
  setForm,
  minDate,
  availability = { status: "idle", message: "" },
  suggestedDates = [],
  requireAvailabilityCheck = false,
  onRetryAvailability,
  leadTimeDays,
}) {
  // Simple calendar logic
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = form.event_date
      ? parseLocalDate(form.event_date)
      : parseLocalDate(minDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const res = await CustomerAPI.getBookedDates(
          currentMonth.getMonth() + 1,
          currentMonth.getFullYear(),
        );
        setBookedDates(res.data || []);
      } catch (err) {
        console.error("Failed to fetch booked dates", err);
      }
    };
    fetchBookedDates();
  }, [currentMonth]);

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

  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  const prevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );

  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  useEffect(() => {
    if (!form.event_date) return;

    let isMounted = true;
    const fetchAvailableTimes = async () => {
      setIsLoadingTimes(true);
      try {
        const res = await CustomerAPI.getAvailableTimes({
          event_date: form.event_date,
          duration_hours: form.duration_hours,
          venue_type: form.venue_type,
          province: form.province,
          municipality: form.municipality,
          barangay: form.barangay,
          street: form.street,
          delivery_method: form.delivery_method,
          service_type: form.service_type,
        });

        if (isMounted && res.data) {
          const updatedSlots = res.data.map((slot) => {
            let [hours, minutes] = slot.time.split(":");
            hours = parseInt(hours, 10);
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strHours = hours < 10 ? "0" + hours : hours;
            return {
              time: `${strHours}:${minutes} ${ampm}`,
              status: slot.status,
            };
          });
          setTimeSlots(updatedSlots);

          // Clear selected start_time if it's now full in updated slots
          if (form.start_time) {
            const currentDisplay = getDisplayTime(form.start_time);
            const selectedSlot = updatedSlots.find((s) => s.time === currentDisplay);
            if (selectedSlot && (selectedSlot.status === "full" || selectedSlot.status === "unavailable")) {
              setForm((prev) => ({ ...prev, start_time: "" }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch available times", err);
      } finally {
        if (isMounted) setIsLoadingTimes(false);
      }
    };

    fetchAvailableTimes();

    return () => {
      isMounted = false;
    };
  }, [
    form.event_date,
    form.duration_hours,
    form.venue_type,
    form.province,
    form.municipality,
    form.barangay,
    form.street,
    form.delivery_method,
    form.service_type,
  ]);

  const handleTimeSelect = (slotTime) => {
    let [time, modifier] = slotTime.split(" ");
    let [hours, minutes] = time.split(":");
    if (hours === "12") hours = "00";
    if (modifier === "PM") hours = parseInt(hours, 10) + 12;

    setForm((prev) => ({ ...prev, start_time: `${hours}:${minutes}` }));
  };

  const selectedDisplayTime = getDisplayTime(form.start_time);

  const minDateObj = new Date(minDate);
  minDateObj.setHours(0, 0, 0, 0);

  const formattedDateStr = useMemo(() => {
    if (!form.event_date) return "";
    try {
      const dateObj = parseLocalDate(form.event_date);
      return dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return form.event_date;
    }
  }, [form.event_date]);

  // --- Availability banner (mirrors the wizard's availability state) ---
  // "error" is a check that never completed. The wizard treats it the same as
  // unavailable — you cannot continue past a schedule we could not verify — so
  // it has to be visible and recoverable here rather than only inside the
  // confirm dialog, which is where it used to surface for the first time.
  const availabilityView = useMemo(() => {
    if (!requireAvailabilityCheck) return null;
    if (!form.event_date || !form.start_time) return null;

    switch (availability.status) {
      case "checking":
        return {
          tone: "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]",
          icon: Loader2,
          iconClass: "text-[#4C81E0] animate-spin",
          message: availability.message || "Checking whether this slot is free",
        };
      case "available":
        return {
          tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
          icon: CheckCircle2,
          iconClass: "text-emerald-500",
          message: availability.message || "This slot is free.",
        };
      case "blocked":
      case "unavailable":
        return {
          tone: "border-amber-200 bg-amber-50 text-amber-800",
          icon: AlertTriangle,
          iconClass: "text-amber-500",
          message:
            availability.message ||
            "We already have an event booked then. Pick another slot.",
        };
      case "error":
        return {
          tone: "border-red-200 bg-red-50 text-red-700",
          icon: AlertTriangle,
          iconClass: "text-red-500",
          canRetry: true,
          message:
            "We couldn't check whether this slot is free. Nothing you entered is lost. Check your connection and try again.",
        };
      default:
        return null;
    }
  }, [availability, requireAvailabilityCheck, form.event_date, form.start_time]);

  const showSuggestions =
    suggestedDates.length > 0 &&
    ["blocked", "unavailable"].includes(availability.status);

  return (
    <StepShell width="wide">
      <SH
        title="Date & Time"
        sub={
          leadTimeDays
            ? `Pick when your event starts. We require at least ${leadTimeDays} days' notice. Crossed-out dates are fully booked.`
            : "Pick when your event starts. Crossed-out dates are already fully booked."
        }
      />

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[330px_1fr] items-start">
        {/* Calendar */}
        <Card className="p-3.5 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              disabled={
                currentMonth < minDateObj &&
                currentMonth.getMonth() === minDateObj.getMonth()
              }
              aria-label="Previous month"
              className={cn(
                "rounded-md p-1 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
                focusRing,
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {currentMonth.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className={cn(
                "rounded-md p-1 text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer",
                focusRing,
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div
            className="grid gap-1 mb-1"
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="py-0.5 text-center text-[10px] font-bold text-slate-400 uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;

              const dateStr = getDateKey(date);
              const isSelected = form.event_date === dateStr;
              const isPast = date < minDateObj;
              const isBooked = bookedDates.includes(dateStr);
              const isDisabled = isPast || isBooked;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-label={date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  onClick={() => setForm({ ...form, event_date: dateStr })}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#4C81E0] text-white shadow-2xs"
                      : isBooked
                        ? "cursor-not-allowed bg-slate-50 text-slate-300 line-through opacity-60"
                        : isPast
                          ? "cursor-not-allowed text-slate-300"
                          : "text-slate-700 hover:bg-slate-100 active:scale-95",
                    focusRing,
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-3 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-[#4C81E0]" />
              Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded bg-slate-200" />
              Booked
            </span>
          </div>
        </Card>

        {/* Time + summary */}
        <div className="flex flex-col gap-3">
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Clock}>Select start time</SectionTitle>

            {!form.event_date ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CalendarDays size={24} className="mx-auto mb-1.5 text-slate-300" />
                Select a date from the calendar to view available start times.
              </div>
            ) : isLoadingTimes ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 py-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8.5 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {timeSlots.map(({ time, status }) => {
                  const isSelected = selectedDisplayTime === time;
                  const isFull = status === "full" || status === "unavailable";

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isFull}
                      aria-pressed={isSelected}
                      onClick={() => handleTimeSelect(time)}
                      className={cn(
                        "h-8.5 sm:h-9 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                        isSelected
                          ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs ring-1 ring-[#4C81E0]"
                          : isFull
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                            : "border-slate-200 bg-white text-slate-700 hover:border-[#4C81E0]/50 hover:bg-slate-50",
                        focusRing,
                      )}
                    >
                      {isFull ? (
                        <span className="flex items-center justify-center gap-1 opacity-50">
                          <span>{time}</span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Full</span>
                        </span>
                      ) : (
                        time
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected schedule banner & live availability */}
            <div className="mt-3.5 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#4C81E0]">
                    <CalendarDays size={14} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      {form.event_date && form.start_time
                        ? `${formattedDateStr} at ${selectedDisplayTime}`
                        : "No schedule selected yet"}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {form.event_date && form.start_time
                        ? "Reservation is confirmed upon quotation acceptance & deposit."
                        : "Choose a date on the calendar, then tap a start time above."}
                    </span>
                  </div>
                </div>

                {availabilityView && (
                  <div
                    role="status"
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                      availabilityView.tone,
                    )}
                  >
                    <availabilityView.icon
                      size={13}
                      className={cn("shrink-0", availabilityView.iconClass)}
                    />
                    <span>{availabilityView.message}</span>
                    {availabilityView.canRetry && onRetryAvailability && (
                      <button
                        type="button"
                        onClick={onRetryAvailability}
                        className={cn("ml-1 font-bold underline cursor-pointer", focusRing)}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              {showSuggestions && (
                <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                  <p className="font-semibold mb-1">Nearest available alternative dates:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedDates.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setForm({ ...form, event_date: suggestion })}
                        className={cn(
                          "rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/80 cursor-pointer",
                          focusRing,
                        )}
                      >
                        {parseLocalDate(suggestion).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
