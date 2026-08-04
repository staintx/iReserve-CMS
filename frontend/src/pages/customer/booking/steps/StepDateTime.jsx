import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card, SH, PrimaryBtn } from "../components/BookingSharedUI";
import Modal from "../../../../components/common/Modal";
import { cn } from "@/lib/utils";
import { CustomerAPI } from "../../../../api/customer";

export default function StepDateTime({
  form,
  setForm,
  minDate,
  onNext,
}) {
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

  // Simple calendar logic
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = form.event_date ? parseLocalDate(form.event_date) : parseLocalDate(minDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [bookedDates, setBookedDates] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
                  className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={17} />
                </button>
                <h3
                  style={{ fontFamily: "Playfair Display, serif" }}
                  className="font-semibold text-[#1E293B]"
                >
                  {currentMonth.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
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
                    className="text-center text-xs font-bold text-[#94A3B8] py-1"
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
                      onClick={() => setForm({ ...form, event_date: dateStr })}
                      className={cn(
                        "h-9 w-full rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                        isSelected
                          ? "bg-[#4C81E0] text-white shadow-sm"
                          : isBooked
                            ? "line-through opacity-50 bg-[#F8FAFC] text-[#94A3B8] cursor-not-allowed"
                            : isPast
                              ? "text-[#CBD5E1] cursor-not-allowed"
                              : "hover:bg-[#F8FAFC] text-[#1E293B]",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-4 text-xs text-[#94A3B8] flex-wrap justify-center">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-[#4C81E0] inline-block" />{" "}
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
            <h3 className="font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <Clock size={15} className="text-[#4C81E0]" /> Event Start Time
            </h3>

            {isLoadingTimes ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[42px] animate-pulse rounded-xl bg-[#F1F5F9]"
                  />
                ))}
              </div>
            ) : (
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
                        "py-2.5 text-sm font-medium rounded-xl border-2 transition-all duration-200",
                        isSelected
                          ? "border-[#4C81E0] bg-[#4C81E0]/10 text-[#1E293B]"
                          : isFull
                            ? "border-[#F1F5F9] bg-[#F8FAFC] text-[#CBD5E1] cursor-not-allowed"
                            : "border-[#E2E8F0] hover:border-[#4C81E0]/40 text-[#1E293B]",
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
            )}
          </Card>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-5 text-sm">
            <p className="font-semibold text-[#1E293B] mb-2 text-xs uppercase tracking-wider">
              Selected Schedule
            </p>
            <p className="text-base font-semibold text-[#1E293B]">
              {form.event_date && form.start_time
                ? `${formattedDateStr} at ${selectedDisplayTime}`
                : "No schedule selected yet."}
            </p>
            <p className="text-xs text-[#64748B] mt-2">
              Confirm your selected date and time before continuing.
            </p>
            <div className="mt-5">
              <PrimaryBtn
                onClick={() => {
                  if (!form.event_date || !form.start_time) return;
                  setShowConfirmModal(true);
                }}
                className="w-full"
                disabled={!form.event_date || !form.start_time}
              >
                Continue <ChevronRight size={15} />
              </PrimaryBtn>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <Modal title="Confirm Schedule" onClose={() => setShowConfirmModal(false)}>
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              Are you sure you want to proceed with
              <span className="font-semibold"> {formattedDateStr}</span> at
              <span className="font-semibold"> {selectedDisplayTime}</span>?
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                onNext();
              }}
              className="w-full rounded-lg bg-[#4C81E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3D6BC4] sm:w-auto"
            >
              Confirm & Proceed
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
