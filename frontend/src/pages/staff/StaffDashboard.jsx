import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  PackageCheck, 
  CalendarDays, 
  ArrowRight,
  UserCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lock,
  Sparkles
} from "lucide-react";
import { getEventTimingStatus } from "../../utils/format";


const buildCalendar = (year, monthIndex) => {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = firstDay.getDay();
  const days = [];

  for (let i = 0; i < startOffset; i += 1) {
    days.push({ label: "", date: null });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({ label: String(day), date: new Date(year, monthIndex, day) });
  }

  return days;
};

const toDateKey = (date) => date.toLocaleDateString("en-CA");

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Availability schedule
  const [calendar, setCalendar] = useState({ month: "", unavailable: [], assignments: [] });
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    StaffAPI.getBookings("active")
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load assigned events.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const monthKey = useMemo(() => {
    return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarMonth]);

  useEffect(() => {
    StaffAPI.getAvailability(monthKey)
      .then((res) => {
        setCalendar(res.data);
        setSelectedDates(new Set(res.data.unavailable || []));
      })
      .catch(() => {
        setCalendar({ month: monthKey, unavailable: [], assignments: [] });
        setSelectedDates(new Set());
      });
  }, [monthKey, showCalendar]);

  const calendarDays = useMemo(() => buildCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const assignmentsByDate = useMemo(() => {
    const map = {};
    (calendar.assignments || []).forEach((item) => {
      const dateKey = toDateKey(new Date(item.date));
      map[dateKey] = item;
    });
    return map;
  }, [calendar.assignments]);

  const toggleDate = (date) => {
    if (!date) return;
    const dateKey = toDateKey(date);
    if (assignmentsByDate[dateKey]) return; // Cannot mark unavailable on assigned day

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const saveAvailability = () => {
    setSavingAvailability(true);
    StaffAPI.setAvailability(monthKey, Array.from(selectedDates))
      .then(() => {
        notify("Your monthly availability has been updated.", "success");
        setShowCalendar(false);
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not save availability.", "error");
      })
      .finally(() => setSavingAvailability(false));
  };

  const getMyAssignedRole = (booking) => {
    const assignments = booking.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id?._id || item.user_id) === String(user?._id));
    return match?.role || user?.position || "Crew";
  };

  const nextUpcomingBooking = useMemo(() => {
    if (bookings.length === 0) return null;
    const now = new Date();
    const sorted = [...bookings].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    return sorted[0];
  }, [bookings]);

  const verifiableEventsCount = useMemo(() => {
    return bookings.filter((b) => getEventTimingStatus(b).isStarted).length;
  }, [bookings]);

  const KPIS = [
    { 
      title: "Active Assigned Events", 
      value: bookings.length || "0", 
      sub: "Shifts scheduled for you", 
      trend: "", 
      up: true, 
      color: "#4C81E0" 
    },
    { 
      title: "Next Scheduled Shift", 
      value: nextUpcomingBooking?.event_date ? new Date(nextUpcomingBooking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "None", 
      sub: nextUpcomingBooking?.start_time || "No immediate shifts", 
      trend: "", 
      up: true, 
      color: "#F59E0B" 
    },
    { 
      title: "My Assigned Position", 
      value: user?.position || "Staff Crew", 
      sub: "Active Operations Roster", 
      trend: "", 
      up: true, 
      color: "#8B5CF6" 
    },
    { 
      title: "Equipment Verification", 
      value: verifiableEventsCount > 0 ? `${verifiableEventsCount} Active` : "Locked", 
      sub: verifiableEventsCount > 0 ? "Ready for live/return count" : "Opens at event start", 
      trend: "", 
      up: verifiableEventsCount > 0, 
      color: verifiableEventsCount > 0 ? "#22C55E" : "#94A3B8" 
    },
  ];

  return (
    <StaffLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl sm:text-3xl font-bold text-foreground">
              My Assigned Events &amp; Shifts
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Review your assigned event schedules, view instructions, and verify catering equipment
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Btn 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowCalendar(true)}
              className="border-border shadow-2xs flex items-center gap-1.5"
            >
              <CalendarDays size={14} className="text-primary" />
              My Availability Calendar
            </Btn>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <KPICard key={k.title} {...k} />
          ))}
        </div>

        {/* Assigned Events Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-primary" size={18} />
              <h2 className="text-base font-bold text-foreground">Assigned Event List</h2>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {bookings.length} upcoming event(s)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading your assigned shifts...
            </div>
          ) : bookings.length === 0 ? (
            <AdminCard className="!p-12 text-center space-y-3">
              <CalendarIcon size={32} className="mx-auto text-muted-foreground" />
              <h3 className="text-base font-bold text-foreground">No Active Event Assignments</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You currently do not have any catering events assigned by your Event Manager. Once a manager assigns you to a booking team, it will appear here.
              </p>
            </AdminCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {bookings.map((booking) => {
                const role = getMyAssignedRole(booking);
                const equipmentCount = (booking.equipment_returns || booking.inventory_items || []).length;
                const managerName = booking.event_manager_id?.full_name || "Assigned Manager";
                const timing = getEventTimingStatus(booking);

                return (
                  <AdminCard key={booking._id} className="!p-5 space-y-4 hover:border-primary/50 transition-all">
                    {/* Top Row: Role, Event Phase & Status */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-300 font-bold text-xs flex items-center gap-1">
                          <UserCheck size={13} className="text-amber-700" />
                          <span>Role: {role}</span>
                        </span>

                        {timing.isUpcoming && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-[11px] flex items-center gap-1">
                            <Lock size={11} className="text-slate-500" />
                            <span>Upcoming Shift</span>
                          </span>
                        )}
                        {timing.isStarted && !timing.isFinished && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 font-bold text-[11px] flex items-center gap-1 animate-pulse">
                            <Sparkles size={11} className="text-emerald-600" />
                            <span>In Progress</span>
                          </span>
                        )}
                        {timing.isFinished && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-blue-600" />
                            <span>Ready for Return Check</span>
                          </span>
                        )}
                      </div>
                      <Badge status={booking.status || "confirmed"} />
                    </div>

                    {/* Event Title & Schedule Info */}
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {booking.event_type || "Catering Event"}
                      </h3>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Client: <strong className="text-foreground">{booking.customer_id?.full_name || "Valued Client"}</strong> • REF: <span className="font-mono">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Quick Specs Box */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <CalendarIcon size={11} /> Date &amp; Time
                        </span>
                        <div className="font-bold text-foreground">
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{booking.start_time || "Time TBA"}</div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <MapPin size={11} /> Venue
                        </span>
                        <div className="font-bold text-foreground truncate">{booking.venue_type || "Venue TBA"}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{[booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") || "Location TBA"}</div>
                      </div>
                    </div>

                    {/* Coordinator & Equipment Summary */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheck size={14} className="text-amber-600" />
                        <span>Lead: <strong className="text-foreground">{managerName}</strong></span>
                      </div>
                      <div className={`flex items-center gap-1.5 font-semibold ${timing.isStarted ? "text-primary" : "text-muted-foreground"}`}>
                        <PackageCheck size={14} />
                        <span>{equipmentCount} {timing.isStarted ? "Equipment Items" : "Dispatched Items"}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => navigate(`/staff/events/${booking._id}`)}
                        className="w-full py-2 px-3 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View Briefing &amp; Crew</span>
                      </button>

                      {timing.isStarted ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/staff/events/${booking._id}?tab=equipment`)}
                          className="w-full py-2 px-3 bg-[#4C81E0] hover:bg-[#3b6bc4] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PackageCheck size={13} />
                          <span>Count &amp; Verify Gear</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/staff/events/${booking._id}?tab=equipment`)}
                          className="w-full py-2 px-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Equipment returns can be verified once the event starts"
                        >
                          <Lock size={13} className="text-muted-foreground" />
                          <span>Gear Manifest (Locked)</span>
                        </button>
                      )}
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Set Availability Modal */}
        {showCalendar && (
          <Modal title="My Availability Schedule" onClose={() => setShowCalendar(false)} className="max-w-xl">
            <div className="space-y-5 text-sm">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <div className="font-bold mb-1">How Staff Availability Works:</div>
                <p>Click on any date to mark yourself <strong>Unavailable</strong> for catering assignments. Click again to set available. Dates with confirmed assignments cannot be disabled.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-foreground">{monthLabel}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-muted-foreground pb-2">
                  {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day, index) => {
                    const dateKey = day.date ? toDateKey(day.date) : null;
                    const entry = day.date ? assignmentsByDate[dateKey] : null;
                    const isUnavailable = dateKey ? selectedDates.has(dateKey) : false;

                    let cellBg = "bg-card border-border hover:border-primary text-foreground";
                    if (entry) {
                      cellBg = "bg-amber-100 border-amber-300 text-amber-950 font-bold cursor-not-allowed";
                    } else if (isUnavailable) {
                      cellBg = "bg-red-100 border-red-300 text-red-950 font-bold";
                    }

                    return (
                      <button
                        key={`${day.label}-${index}`}
                        type="button"
                        onClick={() => toggleDate(day.date)}
                        disabled={!day.date || !!entry}
                        className={`min-h-[50px] rounded-lg border p-1 text-left transition-all ${
                          !day.date ? "border-transparent bg-muted/10 opacity-0" : cellBg
                        }`}
                      >
                        {day.date && <div className="text-xs font-semibold">{day.label}</div>}
                        {entry && <div className="text-[9px] text-amber-900 truncate mt-0.5">Assigned</div>}
                        {!entry && isUnavailable && <div className="text-[9px] text-red-700 truncate mt-0.5">Off</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Btn variant="secondary" onClick={() => setShowCalendar(false)} disabled={savingAvailability}>
                  Cancel
                </Btn>
                <Btn variant="primary" onClick={saveAvailability} disabled={savingAvailability}>
                  {savingAvailability ? "Saving..." : "Save Availability"}
                </Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </StaffLayout>
  );
}
