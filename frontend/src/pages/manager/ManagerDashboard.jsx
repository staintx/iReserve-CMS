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
  CheckCircle2, 
  AlertCircle, 
  Users, 
  ArrowRight, 
  CalendarDays,
  ShieldCheck,
  Plus
} from "lucide-react";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [summary, setSummary] = useState({
    counts: { pending: 0, upcoming: 0, completed: 0 },
    quickActions: { pending: [], upcoming: [] },
    calendarEvents: []
  });

  const loadSummary = () => {
    ManagerAPI.getSummary()
      .then((res) => setSummary(res.data))
      .catch(() => notify("Failed to load dashboard summary.", "error"));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const KPIS = [
    { 
      title: "Pending Staffing", 
      value: summary.counts.pending || "0", 
      sub: "Awaiting team dispatch", 
      trend: "", 
      up: false, 
      color: "#F59E0B" 
    },
    { 
      title: "Upcoming Scheduled", 
      value: summary.counts.upcoming || "0", 
      sub: "Staff assigned & ready", 
      trend: "", 
      up: true, 
      color: "#4C81E0" 
    },
    { 
      title: "Completed Events", 
      value: summary.counts.completed || "0", 
      sub: "This month", 
      trend: "", 
      up: true, 
      color: "#22C55E" 
    },
    { 
      title: "Assigned Roster", 
      value: summary.calendarEvents?.length || "0", 
      sub: "Total events under lead", 
      trend: "", 
      up: true, 
      color: "#8B5CF6" 
    },
  ];

  return (
    <ManagerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl sm:text-3xl font-bold text-foreground">
              Event Logistics &amp; Staffing
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Assigned catering events from Admin — assign staff, coordinate logistics, and oversee schedules
            </p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <Btn 
              variant="secondary" 
              size="sm" 
              onClick={() => navigate("/manager/staff")}
              className="border-border shadow-2xs flex items-center gap-1.5"
            >
              <Users size={14} className="text-primary" />
              Staff Roster
            </Btn>
            <Btn 
              variant="primary" 
              size="sm" 
              onClick={() => navigate("/manager/bookings")}
              className="flex items-center gap-1.5"
            >
              <CalendarIcon size={14} />
              Manage Bookings
            </Btn>
          </div>
        </div>

        {/* Top KPI Metrics Cards using KPICard (Same as Admin) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <KPICard key={k.title} {...k} />
          ))}
        </div>

        {/* Manager Availability & Event Calendar (Same style & layout as AdminEventCalendar) */}
        <div>
          <ManagerEventCalendar onSelectBooking={(b) => navigate(`/manager/bookings`)} />
        </div>

        {/* Quick Action Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Events (Action Needed) */}
          <AdminCard className="!p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={17} />
                <h3 className="text-sm font-bold text-foreground">Action Needed: Pending Staffing</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {(summary.quickActions.pending || []).length} Pending
              </span>
            </div>

            {(summary.quickActions.pending || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                All assigned events have their staff teams dispatched! ✓
              </p>
            ) : (
              <div className="space-y-3">
                {summary.quickActions.pending.map((booking) => (
                  <div 
                    key={booking._id} 
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                      onClick={() => navigate("/manager/bookings")}
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

                    <button
                      onClick={() => navigate("/manager/bookings")}
                      className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                    >
                      View Details
                    </button>
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
