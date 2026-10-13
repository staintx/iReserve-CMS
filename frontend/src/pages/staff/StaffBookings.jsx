import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import PageHeader from "../../components/admin/ui/PageHeader";
import Badge from "../../components/admin/ui/Badge";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  ArrowRight,
  Search,
  Sparkles,
  Eye
} from "lucide-react";
import { 
  getEventTimingStatus, 
  getBookingVenueLocation, 
  formatEventStartTime 
} from "../../utils/format";

export default function StaffBookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useToast();

  const tabParam = searchParams.get("tab") || "upcoming";
  const [activeTab, setActiveTab] = useState(tabParam === "completed" ? "completed" : "upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const [upcomingRes, completedRes] = await Promise.all([
        StaffAPI.getBookings("active").catch(() => ({ data: [] })),
        StaffAPI.getBookings("completed").catch(() => ({ data: [] }))
      ]);
      setUpcomingBookings(Array.isArray(upcomingRes.data) ? upcomingRes.data : []);
      setCompletedBookings(Array.isArray(completedRes.data) ? completedRes.data : []);
    } catch {
      notify("Failed to load your assigned bookings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useRealTimeRefresh(loadBookings, ["booking"]);

  const getMyAssignedRole = (booking) => {
    const assignments = booking?.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id?._id || item.user_id) === String(user?._id));
    return match?.role || user?.position || "Staff Crew";
  };

  const currentList = activeTab === "completed" ? completedBookings : upcomingBookings;

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter((b) => {
      const client = (b.customer_id?.full_name || "").toLowerCase();
      const type = (b.event_type || "").toLowerCase();
      const ref = (b.reference || "").toLowerCase();
      const venue = getBookingVenueLocation(b).toLowerCase();
      return client.includes(q) || type.includes(q) || ref.includes(q) || venue.includes(q);
    });
  }, [currentList, searchQuery]);

  return (
    <StaffLayout>
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title="My Assigned Bookings"
          description="Review your upcoming shift duties and browse completed event history"
        />

        {/* Segmented Controls / Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => handleTabChange("upcoming")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "upcoming"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarIcon size={14} className={activeTab === "upcoming" ? "text-[#4C81E0]" : "text-slate-400"} />
              <span>Upcoming Events</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                activeTab === "upcoming" ? "bg-blue-100 text-[#4C81E0]" : "bg-slate-200 text-slate-600"
              }`}>
                {upcomingBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("completed")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "completed"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 size={14} className={activeTab === "completed" ? "text-emerald-600" : "text-slate-400"} />
              <span>Completed</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                activeTab === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
              }`}>
                {completedBookings.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, event or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
            />
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-2xl">
            Loading events...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <CalendarIcon size={32} className="mx-auto text-slate-400" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                {activeTab === "completed" ? "No completed events found" : "No upcoming events found"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "No assignments matched your search filter."
                  : activeTab === "completed"
                  ? "You have not completed any event shifts yet."
                  : "You have no upcoming catering assignments scheduled."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredList.map((booking) => {
              const role = getMyAssignedRole(booking);
              const isCompleted = activeTab === "completed" || ["completed", "Completed"].includes(booking.status);
              const timing = getEventTimingStatus(booking);
              const venue = getBookingVenueLocation(booking);

              return (
                <div
                  key={booking._id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:border-[#4C81E0]/50 transition-all space-y-4 h-full"
                >
                  {/* Top Row: Type, Title, Client, Ref (No 'Ready for Event' badge on upcoming cards) */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                          {isCompleted ? "Historical Event" : "Assigned Shift"}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                          {booking.event_type || "Catering Event"}
                        </h3>
                      </div>
                      {isCompleted && (
                        <Badge status={booking.status || "Completed"} />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 break-words">
                      Client: <strong className="text-slate-800">{booking.customer_id?.full_name || "Valued Client"}</strong> · Ref <span className="font-mono text-slate-700 font-semibold">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    {/* Left: Prominent Event Date & Start Time */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon size={16} className="text-[#4C81E0] shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                          {booking.event_date
                            ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "Date TBA"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-6 pt-0.5 font-medium">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>{formatEventStartTime(booking.start_time)}</span>
                      </div>
                    </div>

                    {/* Right: Actual Venue Location & Staff Role */}
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-[#4C81E0] shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2" title={venue}>
                          {venue}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-6 pt-0.5">
                        <UserCheck size={13} className="text-[#4C81E0] shrink-0" />
                        <span>Role: <strong className="text-slate-900">{role}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action (No redundant 'Upcoming' badge) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 min-h-[22px]">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Read-only record
                        </span>
                      ) : timing.isStarted && !timing.isFinished ? (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                          <Sparkles size={10} className="text-emerald-600" /> In Progress
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/staff/events/${booking._id}`)}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
