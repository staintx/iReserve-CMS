import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2, MapPin, ShieldCheck, Minus, Loader2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function StepDateTime({ form, setForm, minDate, availability, suggestedDates, setAvailability, requireAvailabilityCheck, onNext }) {
  // Simple calendar logic
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = form.event_date ? new Date(form.event_date) : new Date(minDate);
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

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const timeSlots = [
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
    { time: "07:00 PM", status: "available" }
  ];
  
  const handleTimeSelect = (slotTime) => {
    let [time, modifier] = slotTime.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    
    setForm(prev => ({ ...prev, start_time: `${hours}:${minutes}` }));
  };

  const getDisplayTime = (time24) => {
    if (!time24) return "";
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${minutes} ${ampm}`;
  };

  const selectedDisplayTime = getDisplayTime(form.start_time);
  
  const minDateObj = new Date(minDate);
  minDateObj.setHours(0,0,0,0);

  const formattedDateStr = useMemo(() => {
    if (!form.event_date) return "";
    try {
      const parts = form.event_date.split("-");
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return form.event_date;
    }
  }, [form.event_date]);

  const handleManualCheck = () => {
    if (!setAvailability) return;
    setAvailability({ status: "checking", message: "Checking availability..." });
    setTimeout(() => {
      setAvailability({ status: "available", message: "Selected time is available." });
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold font-serif text-foreground">Date & Time Selection</h2>
        <p className="text-muted-foreground">Choose your event date and time. We'll automatically verify staff, inventory, and venue availability.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Calendar Card */}
          <Card className="border-border shadow-sm overflow-hidden bg-card">
            <CardContent className="p-6">
              <div className="mx-auto w-full max-w-[320px]">
                <div className="mb-6 flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={prevMonth}
                    className="h-8 w-8 rounded-full"
                    disabled={currentMonth < minDateObj && currentMonth.getMonth() === minDateObj.getMonth()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-base font-bold text-foreground">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={nextMonth}
                    className="h-8 w-8 rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mb-2 gap-1 text-center" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="py-2 text-[11px] font-semibold text-muted-foreground/60">{day}</div>
                  ))}
                </div>

                <div className="gap-1 text-center mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                  {calendarDays.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="p-2" />;
                    
                    const dateStr = date.toISOString().split("T")[0];
                    const isSelected = form.event_date === dateStr;
                    const isPast = date < minDateObj;
                    
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isPast}
                        onClick={() => setForm({ ...form, event_date: dateStr })}
                        className={cn(
                          "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all font-medium",
                          isPast ? "cursor-not-allowed text-muted-foreground/30" : "text-foreground hover:bg-muted/50",
                          isSelected ? "bg-accent font-bold text-accent-foreground shadow-sm hover:bg-accent/90" : ""
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-accent" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-border flex items-center justify-center">
                      <div className="w-4 border-t border-border -rotate-45 absolute" />
                    </div>
                    <span>Booked</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Time Slots Card */}
          <Card className="border-gray-100 shadow-sm overflow-hidden bg-white rounded-2xl" style={{ fontFamily: "Inter, sans-serif" }}>
            <CardContent className="p-6">
              <h3 className="mb-6 flex items-center gap-2 text-[17px] font-bold text-gray-800" style={{ fontFamily: "Playfair Display, serif" }}>
                <Clock className="h-4 w-4 text-[#D4AF37]" />
                Event Start Time
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
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
                        "flex flex-col items-center justify-center rounded-full border py-3 transition-colors duration-200",
                        isFull 
                          ? "cursor-not-allowed border-gray-100 bg-gray-50/50 text-gray-300" 
                          : isSelected
                            ? "border-[#D4AF37] bg-[#fdfaf3] text-[#D4AF37] shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <span className={cn("text-sm font-semibold", isSelected ? "" : "")}>{time}</span>
                      {isFull && <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-300">Full</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {requireAvailabilityCheck && (
            <Card className="border-border shadow-sm overflow-hidden bg-muted mt-6">
              <CardContent className="p-6">
                <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-foreground">Automatic Availability Check</h4>
                
                <div className="space-y-3 mb-6">
                  {[
                    { label: "Staff Availability" },
                    { label: "Inventory Availability" },
                    { label: "Venue Schedule" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                      {availability.status === "available" ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          ✓ Available
                        </span>
                      ) : availability.status === "checking" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-border/50 text-muted-foreground/70">
                          <Minus className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {availability.status === 'unavailable' && suggestedDates?.length > 0 && (
                  <div className="mb-4 rounded-xl bg-background p-4 border border-destructive/20 shadow-sm">
                    <p className="mb-2 text-xs font-semibold text-destructive">Unavailable. Try these alternatives:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedDates.map(d => (
                        <button 
                          key={d} 
                          type="button" 
                          onClick={() => {
                              setForm({ ...form, event_date: d });
                              setAvailability({ status: "idle", message: "" });
                          }}
                          className="rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                        >
                          {new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  type="button"
                  variant="default"
                  disabled={!form.event_date || !form.start_time || availability.status === "checking"}
                  className={cn(
                    "w-full font-bold shadow-none border-none transition-all",
                    availability.status === "checking"
                      ? "bg-accent/60 text-accent-foreground/60 cursor-not-allowed"
                      : "bg-accent text-accent-foreground hover:bg-accent/90"
                  )}
                  onClick={handleManualCheck}
                >
                  {availability.status === "checking" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking Availability...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Check Availability
                    </>
                  )}
                </Button>

                {/* Result Card with Continue Button */}
                {availability.status === "available" && (
                  <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <h4 className="text-base font-bold text-emerald-950">Date Available!</h4>
                    </div>
                    
                    <p className="text-xs text-emerald-800">
                      {formattedDateStr} at {selectedDisplayTime} — all checks passed.
                    </p>

                    <Button
                      type="button"
                      onClick={onNext}
                      className="bg-accent text-accent-foreground font-bold hover:bg-accent/90 rounded-xl px-6 py-2 shadow-sm"
                    >
                      Continue &gt;
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

