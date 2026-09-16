import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Search,
  ExternalLink,
  Phone,
  Mail,
  CheckCircle2,
  CalendarOff,
  User
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
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

const toDateKey = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminStaffSchedule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState(() => searchParams.get("id") || "");
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | "manager" | "staff"
  const [memberSearch, setMemberSearch] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarData, setCalendarData] = useState({
    member: null,
    month: "",
    unavailable: [],
    conflicts: [],
    assignments: []
  });
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  // 1. Fetch team members (staff + managers)
  useEffect(() => {
    setLoadingMembers(true);
    AdminAPI.getStaff()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setMembers(list);
        if (!selectedMemberId && list.length > 0) {
          const targetId = searchParams.get("id") || list[0]._id;
          setSelectedMemberId(targetId);
        }
      })
      .catch(() => notify("Failed to load staff & managers directory", "error"))
      .finally(() => setLoadingMembers(false));
  }, []);

  // Update URL search query when selected member changes
  const handleSelectMember = (id) => {
    setSelectedMemberId(id);
    setSelectedDayKey(null);
    setSearchParams({ id }, { replace: true });
  };

  const selectedMember = useMemo(() => {
    return members.find((m) => String(m._id) === String(selectedMemberId)) || calendarData.member || null;
  }, [members, selectedMemberId, calendarData.member]);

  const monthKey = useMemo(() => {
    const yr = calendarMonth.getFullYear();
    const mo = String(calendarMonth.getMonth() + 1).padStart(2, "0");
    return `${yr}-${mo}`;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    return calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });
  }, [calendarMonth]);

  // 2. Load selected member's calendar
  useEffect(() => {
    if (!selectedMemberId) return;
    setLoadingCalendar(true);
    AdminAPI.getMemberCalendar(selectedMemberId, monthKey)
      .then((res) => {
        setCalendarData(res.data || { member: null, month: monthKey, unavailable: [], conflicts: [], assignments: [] });
      })
      .catch((err) => {
        notify("Failed to load schedule for selected member", "error");
        setCalendarData({ member: null, month: monthKey, unavailable: [], conflicts: [], assignments: [] });
      })
      .finally(() => setLoadingCalendar(false));
  }, [selectedMemberId, monthKey]);

  // Calendar calculations
  const calendarDays = useMemo(() => {
    return buildCalendar(calendarMonth.getFullYear(), calendarMonth.getMonth());
  }, [calendarMonth]);

  const assignmentsByDateKey = useMemo(() => {
    const map = new Map();
    (calendarData.assignments || []).forEach((item) => {
      const key = item.date_key || toDateKey(item.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }, [calendarData.assignments]);

  const unavailableSet = useMemo(() => {
    return new Set(calendarData.unavailable || []);
  }, [calendarData.unavailable]);

  const conflictSet = useMemo(() => {
    return new Set(calendarData.conflicts || []);
  }, [calendarData.conflicts]);

  // Filtered members for dropdown / switcher
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchRole = roleFilter === "all" || (m.role || "staff") === roleFilter;
      const matchSearch = !memberSearch ||
        (m.full_name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.position || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(memberSearch.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [members, roleFilter, memberSearch]);

  const initials = (name) =>
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const todayKey = toDateKey(new Date());

  // Determine selected day's events or fallback to current month events
  const displayedAssignments = useMemo(() => {
    if (selectedDayKey) {
      return (calendarData.assignments || []).filter((a) => {
        const key = a.date_key || toDateKey(a.date);
        return key === selectedDayKey;
      });
    }
    return calendarData.assignments || [];
  }, [calendarData.assignments, selectedDayKey]);

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen pb-10">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <button
                type="button"
                onClick={() => navigate("/admin/staff")}
                className="hover:text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft size={12} /> Staff &amp; Managers
              </button>
              <span>/</span>
              <span className="text-foreground font-semibold">Member Schedule</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className="text-primary" size={22} />
              Team Schedule &amp; Availability
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect availability, off-days, and event commitments for managers and staff
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/staff")}>
              <ArrowLeft size={13} /> Back to Directory
            </Btn>
          </div>
        </div>

        {/* Member Switcher Card */}
        <AdminCard className="!p-3 sm:!p-4 bg-card/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                Select Member:
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-muted/60 border border-border rounded-md shrink-0">
                {[
                  { id: "all", label: "All" },
                  { id: "manager", label: "Managers" },
                  { id: "staff", label: "Staff" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRoleFilter(tab.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      roleFilter === tab.id
                        ? "bg-card text-foreground shadow-2xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Member Picker Dropdown */}
              <select
                value={selectedMemberId}
                onChange={(e) => handleSelectMember(e.target.value)}
                disabled={loadingMembers}
                className="bg-card border border-border text-foreground text-xs font-semibold rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary flex-1 max-w-sm cursor-pointer shadow-2xs"
              >
                {filteredMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.full_name} ({m.role === "manager" ? "Manager" : m.position || "Staff"})
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Member Counts */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium text-[11px]">
                <ShieldCheck size={12} className="text-amber-600" />
                {members.filter((m) => m.role === "manager").length} Managers
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium text-[11px]">
                <UserCheck size={12} className="text-slate-600" />
                {members.filter((m) => m.role === "staff" || !m.role).length} Staff
              </span>
            </div>
          </div>
        </AdminCard>

        {/* Selected Member Profile Bar */}
        {selectedMember && (
          <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                    selectedMember.role === "manager"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  {initials(selectedMember.full_name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      {selectedMember.full_name}
                    </h2>
                    {selectedMember.role === "manager" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-mono font-bold rounded-md">
                        <ShieldCheck size={12} className="text-amber-600" /> Event Manager
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono font-semibold rounded-md">
                        <UserCheck size={12} className="text-slate-600" /> Staff
                      </span>
                    )}
                    <Badge status={selectedMember.is_active ? "available" : "off"} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
                      {selectedMember.role === "manager" ? "Event Manager" : selectedMember.position || "Catering Staff"}
                    </span>
                    {selectedMember.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {selectedMember.email}
                      </span>
                    )}
                    {selectedMember.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {selectedMember.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly Stats */}
              <div className="flex items-center gap-3 self-start sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                <div className="text-center px-3 py-1 bg-muted/40 rounded-lg border border-border/60">
                  <div className="text-sm sm:text-base font-bold text-foreground">
                    {calendarData.assignments?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Jobs this Month
                  </div>
                </div>
                <div className="text-center px-3 py-1 bg-muted/40 rounded-lg border border-border/60">
                  <div className="text-sm sm:text-base font-bold text-rose-700">
                    {calendarData.unavailable?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Off-Days
                  </div>
                </div>
                {calendarData.conflicts?.length > 0 && (
                  <div className="text-center px-3 py-1 bg-rose-100/80 rounded-lg border border-rose-300">
                    <div className="text-sm sm:text-base font-bold text-rose-800">
                      {calendarData.conflicts.length}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">
                      Conflicts
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conflict Warning Alert */}
        {calendarData.conflicts?.length > 0 && (
          <div className="rounded-lg border border-rose-300 bg-rose-50/90 p-3.5 flex items-start gap-3 text-xs text-rose-900 shadow-2xs">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-rose-950">
                Schedule Conflict Detected ({calendarData.conflicts.length})
              </div>
              <p className="leading-relaxed">
                {selectedMember?.full_name} is assigned to one or more events on dates they marked as
                unavailable / off-duty:{" "}
                <strong>
                  {calendarData.conflicts
                    .map((dateStr) =>
                      new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric"
                      })
                    )
                    .join(", ")}
                </strong>
                . Review the assignments below to resolve staffing conflicts.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Calendar on Left, Event Breakdown on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Calendar Panel (7 Cols) */}
          <AdminCard className="lg:col-span-7 !p-4 sm:!p-5 space-y-3.5">
            {/* Calendar Controls & Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                  }
                  className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="text-sm font-bold text-foreground tabular-nums min-w-[140px] text-center">
                  {monthLabel}
                </div>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                  }
                  className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date())}
                  className="px-2 py-1 text-xs font-semibold rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-card border border-border inline-block" />
                  <span className="text-muted-foreground text-[10.5px]">Available</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300 inline-block" />
                  <span className="text-muted-foreground text-[10.5px]">Scheduled</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300 inline-block" />
                  <span className="text-muted-foreground text-[10.5px]">Off-Day</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400 inline-block" />
                  <span className="text-muted-foreground text-[10.5px] font-bold text-rose-700">Conflict</span>
                </span>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground pb-1">
              {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((day, index) => {
                const dateKey = day.date ? toDateKey(day.date) : null;
                const eventsOnDay = dateKey ? assignmentsByDateKey.get(dateKey) || [] : [];
                const isUnavailable = dateKey ? unavailableSet.has(dateKey) : false;
                const isConflict = dateKey ? conflictSet.has(dateKey) : false;
                const isToday = dateKey === todayKey;
                const isSelected = dateKey && dateKey === selectedDayKey;

                let cellStyle = "border-border/80 bg-card text-foreground hover:border-primary/40";

                if (isConflict) {
                  cellStyle =
                    "border-rose-400 bg-rose-100/90 text-rose-950 font-bold shadow-2xs hover:bg-rose-100";
                } else if (eventsOnDay.length > 0) {
                  cellStyle =
                    "border-blue-300 bg-blue-50/90 text-blue-950 font-bold shadow-2xs hover:bg-blue-100/80";
                } else if (isUnavailable) {
                  cellStyle =
                    "border-rose-200 bg-rose-50/70 text-rose-900 font-medium hover:bg-rose-100/50";
                }

                if (isSelected) {
                  cellStyle += " ring-2 ring-primary ring-offset-1";
                }

                return (
                  <div
                    key={`${day.label}-${index}`}
                    onClick={() => day.date && setSelectedDayKey(selectedDayKey === dateKey ? null : dateKey)}
                    className={`min-h-[56px] sm:min-h-[66px] rounded-lg border p-1 sm:p-1.5 text-left transition-all relative cursor-pointer ${
                      !day.date ? "border-transparent bg-transparent opacity-0 pointer-events-none" : cellStyle
                    }`}
                  >
                    {day.date && (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-semibold leading-tight ${
                              isToday
                                ? "w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold"
                                : ""
                            }`}
                          >
                            {day.label}
                          </span>
                          {eventsOnDay.length > 0 && (
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1 rounded">
                              {eventsOnDay.length}
                            </span>
                          )}
                        </div>

                        {/* Status Tags inside Cell */}
                        <div className="mt-1 space-y-0.5">
                          {isConflict ? (
                            <div className="truncate text-[9.5px] font-bold leading-tight text-rose-900 bg-rose-200/80 px-1 py-0.5 rounded border border-rose-300">
                              Conflict: Off
                            </div>
                          ) : eventsOnDay.length > 0 ? (
                            <div className="truncate text-[9.5px] font-bold leading-tight text-blue-900">
                              {eventsOnDay[0].assigned_as === "Event Manager" ? "Mgr" : "Crew"} • {eventsOnDay[0].event_type || "Event"}
                            </div>
                          ) : isUnavailable ? (
                            <div className="truncate text-[9.5px] font-bold leading-tight text-rose-700">
                              Off-Duty
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Status Note below Calendar */}
            <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40">
              <div>Click any date to filter assigned events on that day.</div>
              {selectedDayKey && (
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(null)}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Clear day filter
                </button>
              )}
            </div>
          </AdminCard>

          {/* Event Details & Assignments Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <AdminCard className="!p-4 sm:!p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Clock size={14} className="text-primary" />
                    {selectedDayKey
                      ? `Assignments for ${new Date(selectedDayKey + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}`
                      : `Events Scheduled (${monthLabel})`}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {displayedAssignments.length} event assignment(s) found
                  </p>
                </div>
              </div>

              {loadingCalendar ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading schedule commitments…
                </div>
              ) : displayedAssignments.length === 0 ? (
                <div className="py-8 text-center space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">No events on this schedule</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDayKey
                      ? "No events booked on the selected day."
                      : "This member has no assigned bookings for this month."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {displayedAssignments.map((event, idx) => {
                    const eventDate = new Date(event.date);
                    const formattedDate = !isNaN(eventDate.getTime())
                      ? eventDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                      : "Scheduled Date";

                    return (
                      <div
                        key={event._id || idx}
                        className={`p-3 rounded-lg border text-xs shadow-2xs space-y-1.5 transition-all ${
                          event.is_conflict
                            ? "bg-rose-50/90 border-rose-300 text-rose-950"
                            : "bg-muted/30 border-border/80 text-foreground"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <span>{event.event_type || "Catering Event"}</span>
                              {event.assigned_as === "Event Manager" ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded">
                                  <ShieldCheck size={10} className="text-amber-700" /> Event Manager
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold rounded">
                                  <UserCheck size={10} className="text-blue-700" /> {event.assigned_as || "Staff"}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Customer: <strong>{event.customer_name}</strong>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-card border border-border/80 text-foreground shrink-0 uppercase tracking-wider">
                            {event.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span className="inline-flex items-center gap-1 text-foreground font-medium">
                            <CalendarIcon size={12} className="text-primary" /> {formattedDate}
                          </span>
                          {event.start_time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} /> {event.start_time}
                              {event.duration_hours ? ` (${event.duration_hours} hrs)` : ""}
                            </span>
                          )}
                          <span className="font-mono text-[10.5px]">REF: #{event.reference}</span>
                        </div>

                        {event.is_conflict && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">
                            <AlertTriangle size={12} />
                            <span>Conflict: Member marked this date as Unavailable</span>
                          </div>
                        )}

                        {event._id && (
                          <div className="pt-1 text-right">
                            <Link
                              to={`/admin/bookings/${event._id}/details`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              <span>View Booking Details</span>
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminCard>

            {/* Off-Days / Unavailability Card */}
            <AdminCard className="!p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarOff size={13} className="text-rose-600" />
                  Declared Off-Days for {monthLabel} ({calendarData.unavailable?.length || 0})
                </h4>
              </div>

              {calendarData.unavailable?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No declared off-days or unavailability entries for this month.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {calendarData.unavailable.map((dateKey) => {
                    const isConflicting = conflictSet.has(dateKey);
                    const d = new Date(dateKey + "T00:00:00");
                    const dateFormatted = !isNaN(d.getTime())
                      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : dateKey;

                    return (
                      <span
                        key={dateKey}
                        onClick={() => setSelectedDayKey(selectedDayKey === dateKey ? null : dateKey)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${
                          isConflicting
                            ? "bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200"
                            : "bg-muted text-foreground border-border/80 hover:bg-muted/80"
                        }`}
                      >
                        {isConflicting && <AlertTriangle size={10} className="text-rose-600" />}
                        <span>{dateFormatted}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
