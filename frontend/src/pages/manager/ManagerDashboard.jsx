import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";

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

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: []
  });

  useEffect(() => {
    ManagerAPI.getSummary().then((res) => setSummary(res.data));
  }, []);

  const now = new Date();
  const calendarDays = useMemo(() => buildCalendar(now.getFullYear(), now.getMonth()), [now]);
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  const eventsByDate = useMemo(() => {
    const map = {};
    summary.calendarEvents.forEach((event) => {
      const dateKey = new Date(event.date).toDateString();
      map[dateKey] = map[dateKey] || [];
      map[dateKey].push(event);
    });
    return map;
  }, [summary.calendarEvents]);

  return (
    <ManagerLayout onCalendar={() => navigate("/manager/dashboard")}>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Event Staffing &amp; Logistics</h1>
        <p className="mt-2 text-sm text-slate-500">Assigned events from Admin - build your team</p>
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
    </ManagerLayout>
  );
}
