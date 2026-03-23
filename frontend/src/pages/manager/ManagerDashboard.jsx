import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";

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

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: []
  });
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [availability, setAvailability] = useState({ month: "", unavailable: [] });
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ManagerAPI.getSummary().then((res) => setSummary(res.data));
  }, []);

  const now = new Date();
  const calendarDays = useMemo(() => buildCalendar(now.getFullYear(), now.getMonth()), [now]);
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  const availabilityMonthKey = useMemo(() => {
    return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarMonth]);

  useEffect(() => {
    if (!showCalendar) return;
    ManagerAPI.getAvailability(availabilityMonthKey)
      .then((res) => {
        setAvailability(res.data);
        setSelectedDates(new Set(res.data.unavailable || []));
      })
      .catch(() => {
        setAvailability({ month: availabilityMonthKey, unavailable: [] });
        setSelectedDates(new Set());
      });
  }, [availabilityMonthKey, showCalendar]);

  const availabilityDays = useMemo(() => buildCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth]);
  const availabilityLabel = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const eventsByDate = useMemo(() => {
    const map = {};
    summary.calendarEvents.forEach((event) => {
      const dateKey = new Date(event.date).toDateString();
      map[dateKey] = map[dateKey] || [];
      map[dateKey].push(event);
    });
    return map;
  }, [summary.calendarEvents]);

  const toggleDate = (date) => {
    if (!date) return;
    const dateKey = toDateKey(date);

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
    ManagerAPI.setAvailability(availabilityMonthKey, Array.from(selectedDates))
      .then(() => notify("Availability updated.", "success"))
      .catch((err) => notify(err.response?.data?.message || "We could not save your availability.", "error"))
      .finally(() => setSaving(false));
  };

  return (
    <ManagerLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Event Staffing &amp; Logistics</h1>
          <p className="mt-2 text-sm text-slate-500">Assigned event from Admin - build your team</p>
        </div>
        <button className="btn gap-2 uppercase" type="button" onClick={() => setShowCalendar(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M3 10h18" />
          </svg>
          My Calendar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending Events</p>
          <p className="kpi-value">{summary.counts.pending}</p>
          <p className="text-xs text-amber-600">Assigned by Admin</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Upcoming Events</p>
          <p className="kpi-value">{summary.counts.upcoming}</p>
          <p className="text-xs text-emerald-600">Staff assigned &amp; scheduled</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed This Month</p>
          <p className="kpi-value">{summary.counts.completed}</p>
          <p className="text-xs text-slate-500">Ready for review</p>
        </div>
      </div>

      <div className="section">
        <div className="panel">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{monthLabel}</h2>
            <span className="text-xs text-slate-500">Manager calendar</span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-slate-500">
            {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
              <div key={label} className="text-center font-semibold">{label}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const events = day.date ? eventsByDate[day.date.toDateString()] || [] : [];
              return (
                <div key={`${day.label}-${index}`} className="min-h-[70px] rounded-2xl border border-slate-200 bg-white p-2">
                  <div className="text-xs font-semibold text-slate-500">{day.label}</div>
                  {events.slice(0, 2).map((event) => (
                    <div key={event.id} className="mt-1 rounded-xl bg-emerald-100 px-2 py-1 text-[10px] text-emerald-800">
                      {event.customer}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Pending Event</h3>
            <span className="text-xs text-slate-500">Quick action</span>
          </div>
          {summary.quickActions.pending.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">No pending events assigned.</p>
          )}
          {summary.quickActions.pending.map((booking) => (
            <div key={booking._id} className="mt-4 rounded-2xl border border-sand-200 bg-sand-100 p-4 text-sm">
              <div className="font-semibold text-ink-900">{booking.customer_id?.full_name || "Customer"}</div>
              <div className="text-xs text-slate-500">Event: {booking.event_type || "Event"}</div>
              <div className="mt-2 text-xs text-slate-500">
                Date: {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Upcoming Event</h3>
            <span className="text-xs text-slate-500">Quick action</span>
          </div>
          {summary.quickActions.upcoming.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">No upcoming events yet.</p>
          )}
          {summary.quickActions.upcoming.map((booking) => (
            <div key={booking._id} className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <div className="font-semibold text-ink-900">{booking.customer_id?.full_name || "Customer"}</div>
              <div className="text-xs text-slate-500">Event: {booking.event_type || "Event"}</div>
              <div className="mt-2 text-xs text-slate-500">
                Date: {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCalendar && (
        <Modal title="Set Availability" onClose={() => setShowCalendar(false)}>
          <div className="space-y-6 text-sm">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
              <div className="mb-2 text-sm font-semibold text-ink-900">How to mark unavailable dates:</div>
              <ul className="list-disc space-y-1 pl-5">
                <li>Click a date to toggle unavailable status</li>
                <li>Click again to remove the mark</li>
              </ul>
            </div>

            <div className="calendar-card">
              <div className="calendar-head">
                <div>
                  <div className="calendar-title">{availabilityLabel}</div>
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
                {availabilityDays.map((day, index) => {
                  const dateKey = day.date ? toDateKey(day.date) : null;
                  const isUnavailable = dateKey ? selectedDates.has(dateKey) : false;
                  const cellClass = [
                    "calendar-cell",
                    !day.date ? "is-empty" : "",
                    isUnavailable ? "bg-red-100 border-red-300" : ""
                  ].join(" ").trim();

                  return (
                    <button
                      key={`${day.label}-${index}`}
                      type="button"
                      className={cellClass}
                      onClick={() => toggleDate(day.date)}
                      disabled={!day.date}
                    >
                      {day.date ? <div className="calendar-day">{day.label}</div> : null}
                      {isUnavailable && <div className="calendar-event">Unavailable</div>}
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
    </ManagerLayout>
  );
}
