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
  CalendarDays,
  CheckCircle2,
  Plus,
  UserCheck,
  Eye
} from "lucide-react";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ManagerAPI.getSummary()
      .then((res) => {
        setSummary({
          counts: res.data?.counts || { pending: 0, upcoming: 0, completed: 0 },
          quickActions: res.data?.quickActions || { pending: [], upcoming: [] },
          calendarEvents: res.data?.calendarEvents || []
        });
      })
      .catch(() => notify("Failed to load manager operations summary.", "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ManagerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl sm:text-3xl font-bold text-foreground">
              Manager Operations
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Coordinate catering logistics, dispatch staff teams, and monitor event readiness
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/staff")}>
              <Users className="w-4 h-4" /> View Staff Availability
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("/manager/bookings")}>
              <CalendarIcon className="w-4 h-4" /> All Assigned Events
            </Btn>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label="Pending Staffing"
            value={loading ? "..." : summary.counts.pending}
            sub="Events awaiting team assignment"
            icon={AlertCircle}
            tone={summary.counts.pending > 0 ? "warning" : "neutral"}
            onClick={() => navigate("/manager/bookings?status=pending")}
          />
          <KPICard
            label="Upcoming Events Ready"
            value={loading ? "..." : summary.counts.upcoming}
            sub="Staff dispatched & ready"
            icon={CalendarDays}
            tone="info"
            onClick={() => navigate("/manager/bookings?status=upcoming")}
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
        <div className="space-y-2">
          <ManagerEventCalendar onSelectBooking={(b) => navigate(`/manager/bookings?booking_id=${b.id || b._id}&action=view`)} />
        </div>

        {/* Action Lists: Needs Staffing vs Upcoming Ready */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Staff Assignment */}
          <AdminCard className="!p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={17} />
                <h3 className="text-sm font-bold text-foreground">Pending Staff Assignment</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {(summary.quickActions.pending || []).length} Action Required
              </span>
            </div>

            {(summary.quickActions.pending || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                All assigned events currently have teams dispatched.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.quickActions.pending.map((booking) => (
                  <div 
                    key={booking._id} 
                    className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {booking.customer_id?.full_name || "Customer"} — {booking.event_type || "Event"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Date: {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}</span>
                        <span>•</span>
                        <span>{booking.venue_type || "Venue"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/manager/bookings?booking_id=${booking._id}&action=assign`)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Assign Team</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Upcoming Events */}
          <AdminCard className="!p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarIcon className="text-blue-600" size={17} />
                <h3 className="text-sm font-bold text-foreground">Upcoming Scheduled Events</h3>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {(summary.quickActions.upcoming || []).length} Ready
              </span>
            </div>

            {(summary.quickActions.upcoming || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No upcoming events ready yet.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.quickActions.upcoming.map((booking) => (
                  <div 
                    key={booking._id} 
                    className="p-3.5 rounded-xl border border-slate-200 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {booking.customer_id?.full_name || "Customer"} — {booking.event_type || "Event"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Date: {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}</span>
                        <span>•</span>
                        <span>{booking.start_time || "Time TBA"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/manager/bookings?booking_id=${booking._id}&action=view`)}
                        className="px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="View full event specifications"
                      >
                        <Eye size={12} className="text-muted-foreground" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => navigate(`/manager/bookings?booking_id=${booking._id}&action=assign`)}
                        className="px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Edit dispatched staff assignments"
                      >
                        <UserCheck size={12} className="text-primary" />
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
