import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import PageHeader from "../../components/admin/ui/PageHeader";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";
import { 
  Calendar,
  Calendar as CalendarIcon, 
  Users, 
  Search, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  CalendarDays,
  UserCheck,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { initialsOf } from "../../utils/format";

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
  const { notify } = useToast();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [calendar, setCalendar] = useState({ month: "", assignments: [], unavailable: [] });
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const loadStaff = () => {
    setLoading(true);
    ManagerAPI.getStaff()
      .then((res) => setStaff(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load staff members.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const positions = useMemo(() => {
    const distinct = Array.from(new Set(staff.map((s) => s.position).filter(Boolean)));
    return ["all", ...distinct];
  }, [staff]);

  const filtered = useMemo(() => {
    return staff.filter((person) => {
      const matchSearch = !search ||
        (person.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (person.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (person.position || "").toLowerCase().includes(search.toLowerCase());
      const matchPosition = positionFilter === "all" || person.position === positionFilter;
      return matchSearch && matchPosition;
    });
  }, [staff, search, positionFilter]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const monthKey = useMemo(() => {
    return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  }, [calendarMonth]);

  const openCalendar = (person) => {
    setSelectedStaff(person);
    ManagerAPI.getStaffCalendar(person._id, monthKey)
      .then((res) => setCalendar(res.data))
      .catch(() => setCalendar({ month: monthKey, assignments: [], unavailable: [] }));
  };

  useEffect(() => {
    if (!selectedStaff) return;
    ManagerAPI.getStaffCalendar(selectedStaff._id, monthKey)
      .then((res) => setCalendar(res.data))
      .catch(() => setCalendar({ month: monthKey, assignments: [], unavailable: [] }));
  }, [monthKey, selectedStaff]);

  const calendarDays = useMemo(() => buildCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth()), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const assignmentsByDate = useMemo(() => {
    const map = {};
    (calendar.assignments || []).forEach((item) => {
      const dateKey = new Date(item.date).toDateString();
      map[dateKey] = item;
    });
    return map;
  }, [calendar.assignments]);

  const initials = (name) => (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const columns = [
    {
      key: "name",
      header: "Staff Member",
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#D6E4F7]/50 text-[#4C81E0] flex items-center justify-center font-bold text-xs shrink-0 border border-[#4C81E0]/20">
            {initials(s.full_name)}
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">{s.full_name}</div>
            <div className="text-[11px] text-muted-foreground">{s.email || "No email"}</div>
          </div>
        </div>
      )
    },
    {
      key: "position",
      header: "Role / Position",
      render: (s) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
          {s.position || s.role || "Staff Member"}
        </span>
      )
    },
    {
      key: "upcoming",
      header: "Upcoming Events",
      className: "text-center",
      render: (s) => (
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
          (s.upcoming_count || 0) > 0 
            ? "bg-[#D6E4F7]/50 text-[#1E293B] border border-[#4C81E0]/25" 
            : "bg-slate-100 text-slate-500"
        }`}>
          {s.upcoming_count || 0} {(s.upcoming_count === 1) ? "event" : "events"}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <Badge status={s.is_active ? "available" : "off"} className="!rounded-md" />
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (s) => (
        <Btn variant="secondary" size="xs" onClick={() => openCalendar(s)} className="flex items-center gap-1.5">
          <CalendarIcon size={12} className="text-[#4C81E0]" />
          <span>View Calendar</span>
        </Btn>
      )
    }
  ];

  return (
    <ManagerLayout>
      <div className="space-y-4">
        <PageHeader
          title="Staff"
          description="View team availability schedules and event workloads before dispatching"
        />

        {/* Natural search and position filter bar */}
        <AdminCard className="!p-2.5 sm:!p-3.5">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search staff by name, email, or position..."
            quickFilters={positions.map((p) => ({ value: p, label: p === "all" ? "All Positions" : p }))}
            activeQuickFilter={positionFilter}
            onQuickFilterChange={setPositionFilter}
          />
        </AdminCard>

        {/* Phone roster. The whole row opens the schedule — it is the only
            thing a manager can do with a staff member here, so a separate
            "View Schedule" button was a second target for the tap the row
            already implied. Contact details become real tel:/mailto: links,
            which on a phone is the difference between reading a number and
            calling the person you are about to dispatch. */}
        <div className="block lg:hidden space-y-2.5">
          {loading ? (
            <AdminCard className="!p-8 text-center text-xs text-muted-foreground">
              Loading staff roster…
            </AdminCard>
          ) : pageRows.length === 0 ? (
            <AdminCard className="!p-8 text-center space-y-1.5">
              <p className="text-sm font-semibold text-foreground">No staff members</p>
              <p className="text-xs text-muted-foreground">
                {search || positionFilter !== "all"
                  ? "Nobody matches this search or position filter."
                  : "Registered staff will appear here."}
              </p>
            </AdminCard>
          ) : (
            <ul className="space-y-2.5 sm:grid sm:grid-cols-2 sm:gap-2.5 sm:space-y-0">
              {pageRows.map((s) => {
                const upcoming = s.upcoming_count || 0;
                return (
                  <li key={s._id}>
                    <AdminCard className="!p-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => openCalendar(s)}
                        className="flex w-full items-center gap-3 p-3 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#4C81E0]/20 bg-[#D6E4F7]/40 text-[13px] font-bold text-[#4C81E0]">
                          {initials(s.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-foreground">{s.full_name}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
                            <span className="rounded bg-muted px-1.5 py-px font-semibold">
                              {s.position || "Staff"}
                            </span>
                            <span className={upcoming > 0 ? "font-semibold text-foreground" : ""}>
                              {upcoming} upcoming
                            </span>
                          </span>
                        </span>
                        <Calendar size={16} className="shrink-0 text-[#4C81E0]" />
                      </button>

                      {(s.phone || s.email) && (
                        <div className="flex items-stretch gap-px border-t border-border/60 bg-border/40">
                          {s.phone && (
                            <a
                              href={`tel:${s.phone}`}
                              className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 bg-card text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                            >
                              <Phone size={13} />
                              Call
                            </a>
                          )}
                          {s.email && (
                            <a
                              href={`mailto:${s.email}`}
                              className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 bg-card text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                            >
                              <Mail size={13} />
                              Email
                            </a>
                          )}
                        </div>
                      )}
                    </AdminCard>
                  </li>
                );
              })}
            </ul>
          )}
          <AdminCard className="!p-0 overflow-hidden">
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
          </AdminCard>
        </div>

        {/* Desktop Data Table (hidden lg:block) */}
        <AdminCard className="hidden lg:block !p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(s) => s._id}
            loading={loading}
            emptyTitle="No staff members found."
            emptyHint="Registered staff will appear here."
            onRowClick={(s) => openCalendar(s)}
            minWidth="700px"
            /* Between 1024px and the table's own min-width the row scrolls,
               and the actions column was the first thing pushed off screen —
               the one column the row is being read for. */
            pinLastColumn
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Staff Availability Calendar Modal */}
        {selectedStaff && (
          <Modal
            title={`Staff Schedule — ${selectedStaff.full_name}`}
            icon={CalendarDays}
            badge={<Badge status={selectedStaff.is_active ? "available" : "off"} className="!rounded-md" />}
            description="Monthly roster assignments, shift availability, and duty schedule."
            onClose={() => setSelectedStaff(null)}
            className="sm:max-w-xl"
            footer={
              <Btn variant="secondary" size="sm" onClick={() => setSelectedStaff(null)} className="w-full sm:w-auto sm:ml-auto">
                Close
              </Btn>
            }
          >
            <div className="space-y-4 text-sm">
              {/* Member Card */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-3.5 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#D6E4F7]/50 text-[#4C81E0] border border-[#4C81E0]/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                    {initialsOf(selectedStaff.full_name)}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-foreground text-sm truncate">{selectedStaff.full_name}</div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-semibold text-foreground border border-border/60">
                        {selectedStaff.position || "Staff"}
                      </span>
                      {selectedStaff.phone && (
                        <a href={`tel:${selectedStaff.phone}`} className="hover:text-primary transition-colors flex items-center gap-1">
                          <Phone size={11} className="text-primary" />
                          <span>{selectedStaff.phone}</span>
                        </a>
                      )}
                      {selectedStaff.email && !selectedStaff.phone && (
                        <a href={`mailto:${selectedStaff.email}`} className="hover:text-primary transition-colors flex items-center gap-1 truncate">
                          <Mail size={11} className="text-primary" />
                          <span className="truncate">{selectedStaff.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border/80 bg-card px-3.5 py-2 text-center shadow-2xs shrink-0 ml-2">
                  <div className="text-base sm:text-lg font-bold text-foreground font-mono leading-none">{selectedStaff.upcoming_count || 0}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">Upcoming</div>
                </div>
              </div>

              {/* Calendar with Legend */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-2">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-muted hover:border-primary/40 cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <div className="text-xs sm:text-sm font-bold text-foreground tabular-nums px-1">{monthLabel}</div>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-muted hover:border-primary/40 cursor-pointer shadow-2xs"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span>
                      <span className="text-muted-foreground text-[11px] font-medium">Assigned</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs"></span>
                      <span className="text-muted-foreground text-[11px] font-medium">Available</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs"></span>
                      <span className="text-muted-foreground text-[11px] font-medium">Unavailable</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted-foreground py-1 border-b border-border/60">
                  {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {calendarDays.map((day, index) => {
                    const dateKey = day.date ? day.date.toLocaleDateString("en-CA") : null;
                    const entry = day.date ? assignmentsByDate[day.date.toDateString()] : null;
                    const isUnavailable = dateKey ? (calendar.unavailable || []).includes(dateKey) : false;

                    let cellBg = "border-border/70 bg-card text-foreground hover:border-primary/40";
                    if (entry) {
                      cellBg = "border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-2xs ring-1 ring-amber-300/60";
                    } else if (isUnavailable) {
                      cellBg = "border-rose-200 bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 shadow-2xs";
                    }

                    return (
                      <div 
                        key={`${day.label}-${index}`} 
                        className={`min-h-[46px] sm:min-h-[52px] rounded-xl border p-1.5 text-left transition-all ${
                          !day.date ? "border-transparent bg-transparent opacity-0 pointer-events-none" : cellBg
                        }`}
                      >
                        {day.date && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold leading-tight">{day.label}</span>
                            {entry && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                            {!entry && isUnavailable && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                          </div>
                        )}
                        {entry && (
                          <div className="mt-1">
                            <span className="inline-block truncate text-[9.5px] font-bold leading-tight text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-1 py-0.5 rounded">
                              <span className="sm:hidden">Job</span><span className="hidden sm:inline">Assigned</span>
                            </span>
                          </div>
                        )}
                        {!entry && isUnavailable && (
                          <div className="mt-1">
                            <span className="inline-block truncate text-[9.5px] font-bold leading-tight text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/50 px-1 py-0.5 rounded">
                              Off
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Assignments list */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock size={13} className="text-primary" />
                    <span>Assigned Events for this Month</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {(calendar.assignments || []).length} Scheduled
                  </span>
                </div>
                {(!calendar.assignments || calendar.assignments.length === 0) ? (
                  <div className="p-3 text-center rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground italic">
                    No assigned events on schedule for this month.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {calendar.assignments.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-muted/20 border border-border/80 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                        <div className="min-w-0 pr-2 space-y-0.5">
                          <div className="font-bold text-foreground truncate">{item.event_type || "Event"} <span className="font-normal text-muted-foreground">({item.customer_name})</span></div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span className="font-mono text-primary font-bold">REF: {item.reference}</span>
                            <span>•</span>
                            <span>{new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </Modal>
        )}
      </div>
    </ManagerLayout>

  );
}
