import { useEffect, useMemo, useState } from "react";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";

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
  const { user } = useAuth();
  const { notify } = useToast();
  const [bookings, setBookings] = useState([]);
  const [calendar, setCalendar] = useState({ month: "", unavailable: [], assignments: [] });
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    StaffAPI.getBookings("active")
      .then((res) => setBookings(res.data))
      .catch(() => setBookings([]));
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
  }, [monthKey]);

  const calendarDays = useMemo(() => buildCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const assignmentsByDate = useMemo(() => {
    const map = {};
    calendar.assignments.forEach((item) => {
      const dateKey = toDateKey(new Date(item.date));
      map[dateKey] = item;
    });
    return map;
  }, [calendar.assignments]);

  const toggleDate = (date) => {
    if (!date) return;
    const dateKey = toDateKey(date);
    if (assignmentsByDate[dateKey]) return;

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
    setSaving(true);
    StaffAPI.setAvailability(monthKey, Array.from(selectedDates))
      .then(() => {
        notify("Availability updated.", "success");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "We could not save your availability.", "error");
      })
      .finally(() => setSaving(false));
  };

  const assignedRole = (booking) => {
    const assignments = booking.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id) === String(user?._id));
    return match?.role || "Staff";
  };

  return (
    <StaffLayout onCalendar={() => setShowCalendar(true)}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Active Assigned Events</h1>
          <p className="mt-2 text-sm text-slate-500">{bookings.length} events assigned</p>
        </div>
        <button className="btn" type="button" onClick={() => setShowCalendar(true)}>
          My Calendar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {bookings.map((booking) => (
          <div key={booking._id} className="p-5 card">
            <div className="text-sm font-semibold text-ink-900">{booking.event_type || "Event"}</div>
            <div className="text-xs text-slate-500">Customer: {booking.customer_id?.full_name || "Customer"}</div>
            <div className="text-xs text-slate-500">{booking._id?.slice(-6).toUpperCase()}</div>

            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="p-3 border rounded-2xl border-slate-100 bg-slate-50">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Date &amp; Time</div>
                <div className="font-semibold text-ink-900">
                  {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {booking.start_time ? `${booking.start_time}${booking.duration_hours ? ` - ${booking.duration_hours} hrs` : ""}` : "Time TBD"}
                </div>
              </div>
              <div className="p-3 border rounded-2xl border-slate-100 bg-slate-50">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Location</div>
                <div className="font-semibold text-ink-900">{booking.venue_type || "Venue"}</div>
                <div className="text-[11px] text-slate-500">
                  {[booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") || "Address TBD"}
                </div>
              </div>
              <div className="p-3 border rounded-2xl border-amber-200 bg-sand-100">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Your Assigned Role</div>
                <div className="font-semibold text-ink-900">{assignedRole(booking)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 mt-4 text-xs text-blue-700 border border-blue-200 rounded-2xl bg-blue-50">
              <span>Status: {booking.status || "Upcoming"}</span>
              <span>Event has not started yet</span>
            </div>

            <div className="actions">
              <button className="btn-outline" type="button">View Assigned Event</button>
            </div>
          </div>
        ))}
      </div>

      {showCalendar && (
        <Modal title="Set Availability" onClose={() => setShowCalendar(false)}>
          <div className="space-y-6 text-sm">
            <div className="p-4 text-xs text-blue-700 border border-blue-100 rounded-2xl bg-blue-50">
              <div className="mb-2 text-sm font-semibold text-ink-900">How to mark unavailable dates:</div>
              <ul className="pl-5 space-y-1 list-disc">
                <li>Click a date to toggle unavailable status</li>
                <li>Assigned event dates cannot be modified</li>
              </ul>
            </div>

            <div className="calendar-card">
              <div className="calendar-head">
                <div>
                  <div className="calendar-title">{monthLabel}</div>
                  <div className="text-xs text-slate-500">Tap to mark unavailable</div>
                </div>
                <div className="calendar-nav">
                  <button
                    className="calendar-nav-btn"
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  >
                    {"<"}
                  </button>
                  <button
                    className="calendar-nav-btn"
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  >
                    {">"}
                  </button>
                </div>
              </div>

              <div className="calendar-grid">
                {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                  <div key={label} className="calendar-weekday">{label}</div>
                ))}
                {calendarDays.map((day, index) => {
                  const dateKey = day.date ? toDateKey(day.date) : null;
                  const isAssigned = dateKey ? Boolean(assignmentsByDate[dateKey]) : false;
                  const isUnavailable = dateKey ? selectedDates.has(dateKey) : false;

                  const cellClass = [
                    "calendar-cell",
                    !day.date ? "is-empty" : "",
                    isAssigned ? "bg-emerald-50 border-emerald-200" : "",
                    !isAssigned && isUnavailable ? "bg-red-100 border-red-300" : ""
                  ].join(" ").trim();

                  return (
                    <button
                      key={`${day.label}-${index}`}
                      type="button"
                      className={cellClass}
                      onClick={() => toggleDate(day.date)}
                      disabled={!day.date || isAssigned}
                    >
                      {day.date ? <div className="calendar-day">{day.label}</div> : null}
                      {isAssigned && <div className="calendar-event">Assigned</div>}
                      {!isAssigned && isUnavailable && <div className="calendar-event">Unavailable</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="actions">
              <button className="btn" type="button" onClick={saveAvailability} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button className="btn-outline" type="button" onClick={() => setShowCalendar(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </StaffLayout>
  );
}
