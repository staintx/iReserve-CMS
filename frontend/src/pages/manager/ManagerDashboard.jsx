import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ManagerEventCalendar from "../../components/dashboard/ManagerEventCalendar";
import useToast from "../../hooks/useToast";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  UserCheck,
  Eye
} from "lucide-react";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0, assigned: 0, unassigned: 0, today: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ManagerAPI.getSummary()
      .then((res) => {
        setSummary({
          counts: res.data?.counts || { pending: 0, upcoming: 0, completed: 0, assigned: 0, unassigned: 0, today: 0 },
          quickActions: res.data?.quickActions || { pending: [], upcoming: [] },
          calendarEvents: res.data?.calendarEvents || []
        });
      })
      .catch(() => notify("Failed to load manager operations summary.", "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ManagerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Manager Operations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Coordinate catering logistics, dispatch staff teams, and monitor event readiness
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/staff")}>
              <Users className="w-4 h-4" /> View Staff Roster
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("/manager/bookings")}>
              <CalendarIcon className="w-4 h-4" /> All Assigned Events
            </Btn>
          </div>
        </div>

        {/* Top KPI Cards (2x2 on mobile, 4-col on desktop) */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
          <KPICard
            label="Total Assigned"
            value={loading ? "..." : summary.counts.assigned}
            sub="Active operations"
            icon={CalendarIcon}
            tone="neutral"
            onClick={() => navigate("/manager/bookings")}
          />
          <KPICard
            label="Needs Staffing"
            value={loading ? "..." : summary.counts.unassigned}
            sub="Action required"
            icon={Users}
            tone={summary.counts.unassigned > 0 ? "danger" : "success"}
            onClick={() => navigate("/manager/bookings?staffing=unassigned")}
          />
          <KPICard
            label="Today's Shifts"
            value={loading ? "..." : summary.counts.today}
            sub="Events today"
            icon={Clock}
            tone="info"
            onClick={() => navigate("/manager/bookings?date=today")}
          />
          <KPICard
            label="Events Completed"
            value={loading ? "..." : summary.counts.completed}
            sub="This month"
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate("/manager/bookings?status=completed")}
          />
        </div>

        {/* Manager Availability & Event Calendar */}
        <div>
          <ManagerEventCalendar onSelectBooking={(b) => navigate(`/manager/bookings?booking_id=${b.id || b._id}&action=view`)} />
        </div>

        {/* Action Lists: Needs Staffing vs Upcoming Ready */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pending Staff Assignment */}
          <AdminCard className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={15} />
                <h3 className="text-sm font-bold text-foreground">Pending Staff Assignment</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {(summary.quickActions.pending || []).length} Action Required
              </span>
            </div>

            {(summary.quickActions.pending || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                All assigned events currently have teams dispatched.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.quickActions.pending.map((booking) => (
                  <div 
                    key={booking._id} 
                    className="p-2.5 sm:p-3 rounded-lg border border-amber-200/80 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {booking.customer_id?.full_name || "Customer"} — {booking.event_type || "Event"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}</span>
                        <span>•</span>
                        <span className="truncate">{booking.venue_type || "Venue"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/manager/bookings?booking_id=${booking._id}&action=assign`)}
                      className="w-full sm:w-auto px-3 py-1.5 min-h-[38px] sm:min-h-0 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Assign Team</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Upcoming Events */}
          <AdminCard className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="text-blue-600" size={15} />
                <h3 className="text-sm font-bold text-foreground">Upcoming Scheduled Events</h3>
              </div>
              <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {(summary.quickActions.upcoming || []).length} Ready
              </span>
            </div>

            {(summary.quickActions.upcoming || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                No upcoming events ready yet.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.quickActions.upcoming.map((booking) => (
                  <div 
                    key={booking._id} 
                    className="p-2.5 sm:p-3 rounded-lg border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {booking.customer_id?.full_name || "Customer"} — {booking.event_type || "Event"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}</span>
                        <span>•</span>
                        <span>{booking.start_time || "Time TBA"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => navigate(`/manager/bookings?booking_id=${booking._id}&action=view`)}
                        className="flex-1 sm:flex-initial px-2.5 py-1.5 min-h-[38px] sm:min-h-0 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="View full event specifications"
                      >
                        <Eye size={13} className="text-muted-foreground" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => navigate(`/manager/bookings?booking_id=${booking._id}&action=assign`)}
                        className="flex-1 sm:flex-initial px-2.5 py-1.5 min-h-[38px] sm:min-h-0 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Edit dispatched staff assignments"
                      >
                        <UserCheck size={13} className="text-primary" />
                        <span>Edit Staff</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </ManagerLayout>
  );
}
