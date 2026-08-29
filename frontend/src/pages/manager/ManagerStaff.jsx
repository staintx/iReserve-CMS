import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
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
  UserCheck
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Staff Roster &amp; Availability
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              View team availability schedules and event workloads before dispatching
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/dashboard")}>
              My Dashboard
            </Btn>
          </div>
        </div>

        {/* Toolbar */}
        <AdminCard className="!p-3.5">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search staff by name, email, or position..."
            quickFilters={positions.map((p) => ({ value: p, label: p === "all" ? "All Positions" : p }))}
            activeQuickFilter={positionFilter}
            onQuickFilterChange={setPositionFilter}
          />
        </AdminCard>

        {/* Mobile View: Responsive Staff Cards (block md:hidden) */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading staff roster...
            </div>
          ) : pageRows.length === 0 ? (
            <AdminCard className="!p-8 text-center text-xs text-muted-foreground">
              No staff members found.
            </AdminCard>
          ) : (
            <div className="space-y-2.5">
              {pageRows.map((s) => {
                const upcoming = s.upcoming_count || 0;
                return (
                  <AdminCard key={s._id} className="space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials(s.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-foreground truncate">{s.full_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{s.phone || s.email}</div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-[10.5px] font-semibold shrink-0">
                        {s.position || "Staff"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                      <div className="text-[11px] text-muted-foreground">
                        Upcoming Shifts: <strong className="text-foreground">{upcoming}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCalendar(s)}
                        className="py-1.5 px-3 min-h-[38px] bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar size={13} className="text-primary" />
                        <span>View Schedule</span>
                      </button>
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </div>

        {/* Desktop Data Table (hidden md:block) */}
        <AdminCard className="hidden md:block !p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(s) => s._id}
            loading={loading}
            emptyTitle="No staff members found."
            emptyHint="Registered staff will appear here."
            onRowClick={(s) => openCalendar(s)}
            minWidth="700px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Staff Availability Calendar Modal */}
        {selectedStaff && (
          <Modal title={`Staff Schedule — ${selectedStaff.full_name}`} onClose={() => setSelectedStaff(null)} className="max-w-xl">
            <div className="space-y-3.5 text-sm max-h-[80vh] overflow-y-auto pr-1">
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
                  <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Upcoming</div>
                </div>
              </div>

              {/* Calendar with Legend */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div className="text-xs font-bold text-foreground">{monthLabel}</div>
                  
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
                        {entry && <div className="text-[7.5px] sm:text-[8.5px] font-bold text-amber-900 truncate mt-0.5">Assigned</div>}
                        {!entry && isUnavailable && <div className="text-[7.5px] sm:text-[8.5px] font-bold text-red-700 truncate mt-0.5">Off</div>}
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
                        <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border/60">
                <Btn variant="secondary" size="sm" onClick={() => setSelectedStaff(null)} className="w-full sm:w-auto min-h-[38px] sm:min-h-0">Close</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ManagerLayout>

  );
}
