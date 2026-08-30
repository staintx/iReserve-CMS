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
  ChevronRight
} from "lucide-react";

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
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
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
        <span className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded">
          {s.position || s.role || "Staff Member"}
        </span>
      )
    },
    {
      key: "upcoming",
      header: "Upcoming Events",
      className: "text-center",
      render: (s) => (
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
          (s.upcoming_count || 0) > 0 
            ? "bg-blue-50 text-blue-800 border border-blue-200" 
            : "bg-muted text-muted-foreground"
        }`}>
          {s.upcoming_count || 0} events
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <Badge status={s.is_active ? "available" : "off"} />
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (s) => (
        <Btn variant="secondary" size="xs" onClick={() => openCalendar(s)} className="flex items-center gap-1">
          <CalendarIcon size={12} className="text-primary" />
          <span>View Calendar</span>
        </Btn>
      )
    }
  ];

  return (
    <ManagerLayout>
      <div className="space-y-4">
        <PageHeader
          title="Staff Roster & Availability"
          description="View team availability schedules and event workloads before dispatching"
          actions={
            <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/dashboard")}>
              My Dashboard
            </Btn>
          }
        />

        {/* Same sticky rail as Assigned Bookings: the position filter is what
            a manager changes between reads, so it stays put while the roster
            scrolls under it. */}
        <div className="portal-sticky -mx-3 bg-background/95 px-3 pb-2.5 pt-0.5 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none">
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
        </div>

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
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-[13px] font-bold text-primary">
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
                        <Calendar size={16} className="shrink-0 text-primary" />
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
            onClose={() => setSelectedStaff(null)}
            className="sm:max-w-xl"
            footer={
              <Btn variant="secondary" size="sm" onClick={() => setSelectedStaff(null)} className="w-full sm:w-auto sm:ml-auto sm:flex">
                Close
              </Btn>
            }
          >
            <div className="space-y-3.5 text-sm">
              {/* Member Card */}
              <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-2.5 sm:p-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {initials(selectedStaff.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-foreground text-xs truncate">{selectedStaff.full_name}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">{selectedStaff.position || "Staff"} • {selectedStaff.phone || selectedStaff.email}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-bold text-foreground">{selectedStaff.upcoming_count || 0}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Upcoming</div>
                </div>
              </div>

              {/* Calendar with Legend */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  {/* The month stepper the label always implied. Without it a
                      manager could read this crew member's current month and
                      nothing else, which is the wrong half of the question
                      when they are staffing an event three weeks out. */}
                  <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-2">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <div className="text-xs font-bold text-foreground tabular-nums">{monthLabel}</div>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-200 border border-amber-300 inline-block"></span>
                      <span className="text-muted-foreground text-[10px]">Assigned</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-card border border-border inline-block"></span>
                      <span className="text-muted-foreground text-[10px]">Available</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-red-200 border border-red-300 inline-block"></span>
                      <span className="text-muted-foreground text-[10px]">Unavailable</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold text-muted-foreground pb-1">
                  {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                    <div key={label}>{label.slice(0, 1)}<span className="hidden sm:inline">{label.slice(1)}</span></div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dateKey = day.date ? day.date.toLocaleDateString("en-CA") : null;
                    const entry = day.date ? assignmentsByDate[day.date.toDateString()] : null;
                    const isUnavailable = dateKey ? (calendar.unavailable || []).includes(dateKey) : false;

                    let cellBg = "border-border/80 bg-card text-foreground";
                    if (entry) {
                      cellBg = "border-amber-300 bg-amber-100/90 text-amber-950 font-bold";
                    } else if (isUnavailable) {
                      cellBg = "border-red-300 bg-red-100/80 text-red-950 font-bold";
                    }

                    return (
                      <div 
                        key={`${day.label}-${index}`} 
                        className={`min-h-[40px] sm:min-h-[46px] rounded-lg border p-1 text-left transition-all ${
                          !day.date ? "border-transparent bg-muted/10 opacity-0" : cellBg
                        }`}
                      >
                        {day.date && <div className="text-[10.5px] font-semibold leading-tight">{day.label}</div>}
                        {entry && <div className="mt-0.5 truncate text-[10px] font-bold leading-none text-amber-900"><span className="sm:hidden">Job</span><span className="hidden sm:inline">Assigned</span></div>}
                        {!entry && isUnavailable && <div className="mt-0.5 truncate text-[10px] font-bold leading-none text-red-700">Off</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Assignments list */}
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Events for this Month</h4>
                {(!calendar.assignments || calendar.assignments.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic py-1">No assigned events on schedule for this month.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {calendar.assignments.map((item, idx) => (
                      <div key={idx} className="p-2 bg-muted/30 border border-border/80 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-foreground truncate">{item.event_type || "Event"} ({item.customer_name})</div>
                          <div className="text-[10.5px] text-muted-foreground truncate">REF: {item.reference} • {new Date(item.date).toLocaleDateString()}</div>
                        </div>
                        <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
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
