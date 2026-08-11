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
  focusRing,
} from "../components/BookingSharedUI";
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
  const availabilityView = useMemo(() => {
    if (!requireAvailabilityCheck) return null;
    if (!form.event_date || !form.start_time) return null;

    switch (availability.status) {
      case "checking":
        return {
          tone: "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]",
          icon: Loader2,
          iconClass: "text-[#4C81E0] animate-spin",
          message: availability.message || "Checking availability…",
        };
      case "available":
        return {
          tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
          icon: CheckCircle2,
          iconClass: "text-emerald-500",
          message: availability.message || "Selected time is available.",
        };
      case "blocked":
      case "unavailable":
        return {
          tone: "border-amber-200 bg-amber-50 text-amber-800",
          icon: AlertTriangle,
          iconClass: "text-amber-500",
          message:
            availability.message || "This schedule is currently unavailable.",
        };
      default:
        return null;
    }
  }, [availability, requireAvailabilityCheck, form.event_date, form.start_time]);

  const showSuggestions =
    suggestedDates.length > 0 &&
    ["blocked", "unavailable"].includes(availability.status);

  return (
    <StepShell>
      <SH title="Date & Time" sub="Choose when your event should take place." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Calendar */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              disabled={
                currentMonth < minDateObj &&
                currentMonth.getMonth() === minDateObj.getMonth()
              }
              aria-label="Previous month"
              className={cn(
                "rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40",
                focusRing,
              )}
            >
              <ChevronLeft size={17} />
            </button>
            <h3
              style={{ fontFamily: "Playfair Display, serif" }}
              className="text-base font-semibold text-[#1E293B]"
            >
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
                "rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9]",
                focusRing,
              )}
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[11px] font-bold text-[#94A3B8]"
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
                    "flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all",
                    isSelected
                      ? "bg-[#4C81E0] text-white shadow-sm"
                      : isBooked
                        ? "cursor-not-allowed bg-[#F8FAFC] text-[#94A3B8] line-through opacity-60"
                        : isPast
                          ? "cursor-not-allowed text-[#CBD5E1]"
                          : "text-[#1E293B] hover:bg-[#F1F5F9]",
                    focusRing,
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-4 border-t border-[#E2E8F0] pt-3 text-[11px] text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded bg-[#4C81E0]" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded bg-[#E2E8F0]" />
              {String(bookedDates.length).padStart(2, "0")} Booked
            </span>
          </div>
        </Card>

        {/* Time + summary */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <SectionTitle icon={Clock}>Event start time</SectionTitle>

            {!form.event_date ? (
              <p className="py-6 text-center text-sm text-[#94A3B8]">
                Select a date first to see available start times.
              </p>
            ) : isLoadingTimes ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-[#F1F5F9]"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                        "h-10 rounded-xl border-2 text-[13px] font-medium leading-none transition-all duration-200",
                        isSelected
                          ? "border-[#4C81E0] bg-[#4C81E0]/10 text-[#1E293B]"
                          : isFull
                            ? "cursor-not-allowed border-[#E2E8F0]/60 bg-[#F8FAFC] text-[#94A3B8] opacity-75"
                            : "border-[#E2E8F0] text-[#1E293B] hover:border-[#4C81E0]/50 hover:bg-[#F8FAFC]",
                        focusRing,
                      )}
                    >
                      {isFull ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="line-through text-[#94A3B8]">{time}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Full</span>
                        </span>
                      ) : (
                        time
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Selected schedule summary */}
          <Card className="border-[#4C81E0]/25 bg-[#4C81E0]/5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#4C81E0] shadow-sm">
                <CalendarDays size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Selected schedule
                </p>
                <p className="mt-0.5 text-base font-semibold text-[#1E293B]">
                  {form.event_date && form.start_time
                    ? `${formattedDateStr} at ${selectedDisplayTime}`
                    : "No schedule selected yet"}
                </p>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Confirm your date and time to continue.
                </p>
              </div>
            </div>

            {availabilityView && (
              <div
                role="status"
                className={cn(
                  "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px]",
                  availabilityView.tone,
                )}
              >
                <availabilityView.icon
                  size={15}
                  className={cn("mt-0.5 shrink-0", availabilityView.iconClass)}
                />
                <span>{availabilityView.message}</span>
              </div>
            )}

            {showSuggestions && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Nearest available dates
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedDates.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, event_date: suggestion })
                      }
                      className={cn(
                        "rounded-full border border-[#4C81E0]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#1E293B] transition-colors hover:bg-[#D6E4F7]/60",
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
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
