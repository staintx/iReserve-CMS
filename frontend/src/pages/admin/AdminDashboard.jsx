import React, { useEffect, useState } from "react";
import { Download, Plus, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import AdminEventCalendar from "../../components/dashboard/AdminEventCalendar";
import { INVENTORY_DATA } from "../../components/admin/ui/data";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});

  const KPIS = [
    { title: "Total Reservations", value: summary.totalReservations || "—", sub: "All bookings", trend: summary.reservationTrend || "", up: summary.reservationTrendUp, color: "#3B82F6" },
    { title: "Upcoming Events", value: summary.upcomingEvents || "—", sub: "Next 30 days", trend: "", up: true, color: "#8B5CF6" },
    { title: "Pending Reservations", value: summary.pendingReservations || "—", sub: "Awaiting approval", trend: "", up: false, color: "#F59E0B" },
    { title: "Completed Events", value: summary.completedEvents || "—", sub: "All time", trend: "", up: true, color: "#22C55E" },
  ];

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingOculars, setUpcomingOculars] = useState([]);

  const parseDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  useEffect(() => {
    const loadAdminDashboard = async () => {
      try {
        const res = await AdminAPI.getBookings();
        const data = Array.isArray(res.data) ? res.data : [];
        setBookings(data);

        const now = new Date();
        const allFuture = data
          .map((booking) => ({
            ...booking,
            eventDate: parseDate(booking.event_date),
          }))
          .filter((booking) => booking.eventDate && booking.eventDate >= now)
          .sort((a, b) => a.eventDate - b.eventDate);

        const futureOculars = data
          .filter((booking) => booking.ocular_visit && ["requested", "scheduled"].includes(booking.ocular_visit.status))
          .map((booking) => ({
            ...booking,
            ocularDate: parseDate(booking.ocular_visit.scheduled_date || booking.ocular_visit.date || booking.event_date),
          }))
          .filter((booking) => booking.ocularDate)
          .sort((a, b) => a.ocularDate - b.ocularDate);

        setUpcomingEvents(allFuture.slice(0, 5));
        setUpcomingOculars(futureOculars.slice(0, 3));

        setSummary({
          totalReservations: data.length,
          upcomingEvents: allFuture.length,
          pendingReservations: data.filter((booking) => booking.status === "pending").length,
          completedEvents: data.filter((booking) => booking.status === "completed").length,
          reservationTrend: "+8.2%",
          reservationTrendUp: true,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadAdminDashboard();
  }, []);

  const formatEventDate = (value) => {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBA";
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-[#111]">Good Morning, System Administrator</h1>
            <p className="text-sm text-[#6B7280] mt-1">Monday, July 22, 2025 · Here's what's happening today</p>
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export Report</Btn>
            <Btn variant="gold" size="sm" onClick={() => navigate("/admin/bookings/new")}><Plus size={13} /> New Booking</Btn>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <KPICard key={k.title} {...k} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <AdminCard className="xl:col-span-2 !p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-[#111]">Event Calendar</p>
                <p className="text-xs text-[#6B7280]">View scheduled bookings and quotes</p>
              </div>
              <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/bookings/reservations")}>Manage Bookings</Btn>
            </div>
            <AdminEventCalendar bookings={bookings} />
          </AdminCard>

          <div className="space-y-5">
            <AdminCard className="!p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-[#111]">Upcoming Events</p>
                <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/bookings/reservations")}>All Events</Btn>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event._id} className="rounded-2xl border border-gray-100 bg-white p-4">
                      <p className="text-sm font-semibold text-[#111] truncate">{event.event_type || "Untitled Event"}</p>
                      <p className="text-xs text-[#6B7280] mt-1">{formatEventDate(event.event_date)} · {event.venue || "Venue not set"}</p>
                      <p className="text-xs text-[#9CA3AF] mt-2">{event.customer_id?.full_name || event.customer_name || "Unknown client"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No upcoming events found.</p>
                )}
              </div>
            </AdminCard>

            <AdminCard className="!p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-[#111]">Next Ocular Visits</p>
                <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/bookings/ocular")}>View Oculars</Btn>
              </div>
              <div className="space-y-3">
                {upcomingOculars.length > 0 ? (
                  upcomingOculars.map((booking) => (
                    <div key={booking._id} className="rounded-2xl border border-gray-100 bg-white p-4">
                      <p className="text-sm font-semibold text-[#111] truncate">{booking.customer_id?.full_name || booking.customer_name || "Unknown client"}</p>
                      <p className="text-xs text-[#6B7280] mt-1">{formatEventDate(booking.ocular_visit?.scheduled_date || booking.ocular_visit?.date || booking.event_date)}</p>
                      <p className="text-xs text-[#9CA3AF] mt-2">{booking.ocular_visit?.status === "scheduled" ? "Scheduled" : "Requested"} · {booking.event_type || "Event"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No upcoming ocular visits.</p>
                )}
              </div>
            </AdminCard>
          </div>
        </div>

        <AdminCard className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-[#111] text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-amber-500" /> Inventory Alerts</p>
            <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/inventory")}>View All</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INVENTORY_DATA.filter((i) => i.status !== "ok").map((item) => (
              <div key={item.id} className={`p-3 rounded-xl border ${item.status === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={item.status} />
                  <span className="text-xs font-bold text-[#111]">{item.name}</span>
                </div>
                <p className="text-xs text-[#6B7280]">Available: <strong>{item.available}</strong> / Min: {item.minStock}</p>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}