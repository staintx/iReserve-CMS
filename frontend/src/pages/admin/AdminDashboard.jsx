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
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  const [inventoryAlerts, setInventoryAlerts] = useState([]);

  const KPIS = [
    { title: "Pending Inquiries", value: summary.pendingInquiries || "0", sub: "Awaiting review", trend: "", up: false, color: "#F59E0B" },
    { title: "Accepted Quotes", value: summary.acceptedQuotes || "0", sub: "Awaiting deposit", trend: "", up: true, color: "#4C81E0" },
    { title: "Upcoming Events", value: summary.upcomingEvents || "0", sub: "Next 30 days", trend: "", up: true, color: "#4C81E0" },
    { title: "Completed Events", value: summary.completedEvents || "0", sub: "All time", trend: "", up: true, color: "#22C55E" },
  ];

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingOculars, setUpcomingOculars] = useState([]);

  const parseDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const loadData = () => {
    const loadAdminDashboard = async () => {
      try {
        const [bookRes, inqRes] = await Promise.all([
          AdminAPI.getBookings().catch(() => ({ data: [] })),
          AdminAPI.getInquiries().catch(() => ({ data: [] }))
        ]);
        
        const data = Array.isArray(bookRes.data) ? bookRes.data : [];
        const inquiries = Array.isArray(inqRes.data) ? inqRes.data : [];
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
          pendingInquiries: inquiries.filter((inq) => inq.status === "Pending Review").length,
          acceptedQuotes: inquiries.filter((inq) => inq.status === "Quote Accepted").length,
          completedEvents: data.filter((booking) => booking.status === "completed" || booking.status === "Completed").length,
          reservationTrend: "+8.2%",
          reservationTrendUp: true,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadAdminDashboard();

    AdminAPI.getInventoryAvailability()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        setInventoryAlerts(items.filter((item) => (item.available_quantity ?? 0) <= (item.minStock || 0)));
      })
      .catch(() => setInventoryAlerts([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  const formatEventDate = (value) => {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBA";
  };

  const greetingTime = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-5 bg-background min-h-screen">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl sm:text-3xl font-bold text-foreground">
              {greetingTime}, System Administrator
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {currentDateFormatted} · Here's your business overview
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export Report</Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("/admin/bookings/new")}><Plus size={13} /> New Booking</Btn>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <KPICard key={k.title} {...k} />
          ))}
        </div>

        <div>
          <AdminEventCalendar />
        </div>

        <AdminCard className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-foreground text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-amber-500" /> Inventory Alerts</p>
            <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/inventory")}>View All</Btn>
          </div>
          {inventoryAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No inventory alerts. All stock levels are healthy.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {inventoryAlerts.map((item) => {
                const status = (item.available_quantity || 0) <= 0 ? "critical" : "low";
                return (
                  <div key={item._id} className={`p-3 rounded-xl border ${status === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge status={status} />
                      <span className="text-xs font-bold text-foreground">{item.item_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Available: <strong>{item.available_quantity || 0}</strong> / Min: {item.minStock || 0}</p>
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}