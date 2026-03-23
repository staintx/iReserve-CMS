import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
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

export default function ManagerStaff() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [calendar, setCalendar] = useState({ month: "", assignments: [] });

  useEffect(() => {
    ManagerAPI.getStaff().then((res) => setStaff(res.data));
  }, []);

  const filtered = staff.filter((person) =>
    person.full_name?.toLowerCase().includes(query.toLowerCase())
  );

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const calendarDays = useMemo(() => buildCalendar(now.getFullYear(), now.getMonth()), [now]);

  const openCalendar = (person) => {
    setSelected(person);
    ManagerAPI.getStaffCalendar(person._id, monthKey).then((res) => setCalendar(res.data));
  };

  const assignmentsByDate = useMemo(() => {
    const map = {};
    calendar.assignments.forEach((item) => {
      const dateKey = new Date(item.date).toDateString();
      map[dateKey] = item;
    });
    return map;
  }, [calendar.assignments]);

  return (
    <ManagerLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Staff List</h1>
          <p className="mt-2 text-sm text-slate-500">View staff members and their availability</p>
        </div>
        <button className="btn gap-2 uppercase" type="button" onClick={() => navigate("/manager/dashboard")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M3 10h18" />
          </svg>
          My Calendar
        </button>
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Staff List</div>
          <div className="flex items-center gap-3">
            <input
              className="w-64 rounded-full border border-slate-200 px-4 py-2 text-sm"
              placeholder="Search by name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.map((person) => (
            <div key={person._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-ink-900">{person.full_name}</div>
                <div className="text-xs text-slate-500">{person.role || "Staff"}</div>
              </div>
              <div className="text-xs text-slate-500">{person.upcoming_count || 0} upcoming</div>
              <button className="btn-outline" type="button" onClick={() => openCalendar(person)}>
                View Calendar
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <Modal title={selected.full_name} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Upcoming Events</div>
              <div className="text-2xl font-semibold text-ink-900">{selected.upcoming_count || 0}</div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{calendar.month}</div>
              <div className="grid grid-cols-7 gap-2 text-xs text-slate-500">
                {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                  <div key={label} className="text-center font-semibold">{label}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const entry = day.date ? assignmentsByDate[day.date.toDateString()] : null;
                  return (
                    <div key={`${day.label}-${index}`} className={`min-h-[70px] rounded-2xl border p-2 ${
                      entry ? "border-amber-300 bg-amber-100" : "border-slate-200 bg-white"
                    }`}>
                      <div className="text-xs font-semibold text-slate-500">{day.label}</div>
                      {entry && <div className="mt-1 text-[10px] font-semibold text-amber-900">Assigned</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </ManagerLayout>
  );
}
