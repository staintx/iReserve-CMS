import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Minus,
  Loader2,
  Check,
} from "lucide-react";
import { Card, SH, GoldBtn } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import { CustomerAPI } from "../../../../api/customer";

export default function StepDateTime({
  form,
  setForm,
  minDate,
  availability,
  suggestedDates,
  setAvailability,
  requireAvailabilityCheck,
  onNext,
}) {
  // Simple calendar logic
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = form.event_date ? new Date(form.event_date) : new Date(minDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const res = await CustomerAPI.getBookedDates(currentMonth.getMonth() + 1, currentMonth.getFullYear());
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

  const [timeSlots, setTimeSlots] = useState([
    { time: "09:00 AM", status: "available" },
    { time: "10:00 AM", status: "available" },
    { time: "11:00 AM", status: "available" },
    { time: "12:00 PM", status: "available" },
    { time: "01:00 PM", status: "available" },
    { time: "02:00 PM", status: "available" },
    { time: "03:00 PM", status: "available" },
    { time: "04:00 PM", status: "available" },
    { time: "05:00 PM", status: "available" },
    { time: "06:00 PM", status: "available" },
    { time: "07:00 PM", status: "available" },
  ]);

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
          const updatedSlots = res.data.map(slot => {
            let [hours, minutes] = slot.time.split(":");
            hours = parseInt(hours, 10);
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strHours = hours < 10 ? "0" + hours : hours;
            return {
              time: `${strHours}:${minutes} ${ampm}`,
              status: slot.status
            };
          });
          setTimeSlots(updatedSlots);
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
    form.service_type
  ]);

  const handleTimeSelect = (slotTime) => {
    let [time, modifier] = slotTime.split(" ");
    let [hours, minutes] = time.split(":");
    if (hours === "12") hours = "00";
    if (modifier === "PM") hours = parseInt(hours, 10) + 12;

    setForm((prev) => ({ ...prev, start_time: `${hours}:${minutes}` }));
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

  const selectedDisplayTime = getDisplayTime(form.start_time);

  const minDateObj = new Date(minDate);
  minDateObj.setHours(0, 0, 0, 0);

  const formattedDateStr = useMemo(() => {
    if (!form.event_date) return "";
    try {
      const parts = form.event_date.split("-");
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return form.event_date;
    }
  }, [form.event_date]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <SH
        title="Date & Time Selection"
        sub="Choose your event date and time."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Calendar Card */}
          <Card className="p-6">
            <div className="mx-auto w-full max-w-[320px]">
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  disabled={
                    currentMonth < minDateObj &&
                    currentMonth.getMonth() === minDateObj.getMonth()
                  }
                  className="p-2 hover:bg-[#F7F4EE] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={17} />
                </button>
                <h3
                  style={{ fontFamily: "Playfair Display, serif" }}
                  className="font-semibold text-[#111]"
                >
                  {currentMonth.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 hover:bg-[#F7F4EE] rounded-lg transition-colors"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              <div
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
              >
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-bold text-[#9E9E9E] py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="grid gap-1 mb-4"
                style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
              >
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className="p-2" />;

                  const dateStr = date.toISOString().split("T")[0];
                  const isSelected = form.event_date === dateStr;
                  const isPast = date < minDateObj;
                  const isBooked = bookedDates.includes(dateStr);
                  const isDisabled = isPast || isBooked;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setForm({ ...form, event_date: dateStr })}
                      className={cn(
                        "h-9 w-full rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                        isSelected
                          ? "bg-[#D4AF37] text-[#111] shadow-sm"
                          : isBooked
                            ? "line-through opacity-50 bg-[#F7F4EE] text-[#9E9E9E] cursor-not-allowed"
                            : isPast
                              ? "text-[#CCCCC5] cursor-not-allowed"
                              : "hover:bg-[#F7F4EE] text-[#111]",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-4 text-xs text-[#9E9E9E] flex-wrap justify-center">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-[#D4AF37] inline-block" />{" "}
                  Selected
                </span>
                <span className="flex items-center gap-1 line-through opacity-50">
                  <span>{bookedDates.length < 10 ? '0' + bookedDates.length : bookedDates.length}</span> Booked
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Time Slots Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-[#111] mb-4 flex items-center gap-2">
              <Clock size={15} className="text-[#D4AF37]" /> Event Start Time
            </h3>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {timeSlots.map(({ time, status }) => {
                const isSelected = selectedDisplayTime === time;
                const isFull = status === "full";

                return (
                  <button
                    key={time}
                    type="button"
                    disabled={isFull}
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "py-2.5 text-sm font-medium rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#111]"
                        : isFull
                          ? "border-black/[0.05] bg-[#F7F4EE] text-[#C5C5C5] cursor-not-allowed"
                          : "border-black/[0.08] hover:border-[#D4AF37]/40 text-[#111]",
                    )}
                  >
                    {isFull ? (
                      <>
                        <span className="block">{time}</span>
                        <span className="text-[10px]">Full</span>
                      </>
                    ) : (
                      time
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {requireAvailabilityCheck && (
            <div className="bg-[#F7F4EE] rounded-2xl p-5 text-sm">
              <p className="font-semibold text-[#111] mb-2 text-xs uppercase tracking-wider">
                Automatic Availability Check
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B6657]">Date Availability</span>
                  {availability.status === "available" ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold text-xs">
                      <Check size={14} /> Available
                    </span>
                  ) : availability.status === "checking" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#9E9E9E]" />
                  ) : (
                    <span className="text-[#9E9E9E]">Pending</span>
                  )}
                </div>
              </div>

              {availability.status === "unavailable" &&
                suggestedDates?.length > 0 && (
                  <div className="mb-4 rounded-xl bg-white p-4 border border-red-200 shadow-sm">
                    <p className="mb-2 text-xs font-semibold text-red-600">
                      Unavailable. Try these alternatives:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, event_date: d });
                            setAvailability({ status: "idle", message: "" });
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
                        >
                          {new Date(d).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {!form.event_date || !form.start_time ? (
                <p className="text-xs text-[#9E9E9E] mt-4">
                  Please select a date and time to check availability.
                </p>
              ) : availability.status === "checking" ? (
                <div className="flex items-center text-[#9E9E9E] mt-4 text-xs font-medium">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking availability...
                </div>
              ) : null}

              {/* Result Card with Continue Button */}
              {availability.status === "available" && (
                <div className="mt-4 pt-4 border-t border-black/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-emerald-700">
                      Date Available!
                    </h4>
                  </div>

                  <p className="text-xs text-[#6B6657] mb-4">
                    {formattedDateStr} at {selectedDisplayTime} — all checks
                    passed.
                  </p>

                  <GoldBtn onClick={onNext} className="w-full">
                    Continue <ChevronRight size={15} />
                  </GoldBtn>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
