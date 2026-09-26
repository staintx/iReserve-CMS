import React, { useEffect, useState } from "react";
import { Download, Plus, AlertTriangle, Clock, CheckCircle2, Calendar, FileText } from "lucide-react";
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
    { 
      title: "Pending Inquiries", 
      value: summary.pendingInquiries ?? "0", 
      sub: "Awaiting review", 
      badge: summary.pendingInquiries > 0 ? "Review Needed" : null, 
      icon: Clock 
    },
    { 
      title: "Accepted Quotes", 
      value: summary.acceptedQuotes ?? "0", 
      sub: "Awaiting deposit", 
      trend: summary.acceptedQuotesTrend || null, 
      up: summary.acceptedQuotesTrendUp ?? true, 
      icon: FileText 
    },
    { 
      title: "Upcoming Events", 
      value: summary.upcomingEvents ?? "0", 
      sub: "Next 30 days", 
      trend: summary.reservationTrend || null, 
      up: summary.reservationTrendUp ?? true, 
      icon: Calendar 
    },
    { 
      title: "Completed Events", 
      value: summary.completedEvents ?? "0", 
      sub: "All time total", 
      icon: CheckCircle2 
    },
  ];

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  /**
   * Calculate Month-over-Month (MoM) percentage change.
   * "Only render the trend badge if there is actual historical data to compare against."
   */
  const computeMoMTrend = (current, previous) => {
    if (!previous || previous <= 0) {
      return { trend: null, up: true };
    }

    const diff = current - previous;
    const percent = Math.round((diff / previous) * 100);
    const up = percent >= 0;
    const trend = `${up ? "+" : ""}${percent}%`;

    return { trend, up };
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

        // Month boundaries for Month-over-Month (MoM) comparisons
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Upcoming events within next 30 days
        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const allFuture = data
          .map((booking) => ({
            ...booking,
            eventDate: parseDate(booking.event_date),
          }))
          .filter((booking) => booking.eventDate && booking.eventDate >= now && booking.status !== "cancelled")
          .sort((a, b) => a.eventDate - b.eventDate);

        const upcomingNext30Days = allFuture.filter((b) => b.eventDate <= next30Days);

        // Accepted Quotes Month-over-Month calculation
        const isAcceptedQuote = (inq) =>
          inq.status === "Quote Accepted" || inq.status === "Awaiting Final Confirmation";

        const thisMonthAccepted = inquiries.filter((inq) => {
          if (!isAcceptedQuote(inq) && !inq.converted_booking_id) return false;
          const d = parseDate(inq.updatedAt || inq.createdAt);
          return d && d >= startOfThisMonth && d <= endOfThisMonth;
        }).length;

        const lastMonthAccepted = inquiries.filter((inq) => {
          if (!isAcceptedQuote(inq) && !inq.converted_booking_id) return false;
          const d = parseDate(inq.updatedAt || inq.createdAt);
          return d && d >= startOfLastMonth && d <= endOfLastMonth;
        }).length;

        const acceptedQuotesTrend = computeMoMTrend(thisMonthAccepted, lastMonthAccepted);

        // Reservation / Bookings Month-over-Month calculation
        const thisMonthBookings = data.filter((b) => {
          if (b.status === "cancelled") return false;
          const d = parseDate(b.createdAt);
          return d && d >= startOfThisMonth && d <= endOfThisMonth;
        }).length;

        const lastMonthBookings = data.filter((b) => {
          if (b.status === "cancelled") return false;
          const d = parseDate(b.createdAt);
          return d && d >= startOfLastMonth && d <= endOfLastMonth;
        }).length;

        const reservationTrend = computeMoMTrend(thisMonthBookings, lastMonthBookings);

        setSummary({
          totalReservations: data.length,
          upcomingEvents: upcomingNext30Days.length,
          totalUpcomingEvents: allFuture.length,
          pendingInquiries: inquiries.filter((inq) => inq.status === "Pending Review").length,
          acceptedQuotes: inquiries.filter(isAcceptedQuote).length,
          completedEvents: data.filter((booking) => booking.status === "completed" || booking.status === "Completed").length,
          acceptedQuotesTrend: acceptedQuotesTrend.trend,
          acceptedQuotesTrendUp: acceptedQuotesTrend.up,
          reservationTrend: reservationTrend.trend,
          reservationTrendUp: reservationTrend.up,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadAdminDashboard();

    AdminAPI.getInventoryAvailability()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        setInventoryAlerts(items.filter((item) => item.stock_status === "low_stock" || item.stock_status === "no_stock" || (item.available_quantity ?? 0) <= 0 || item.available === false));
      })
      .catch(() => setInventoryAlerts([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

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
        {/* Clean Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greetingTime}, System Administrator
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentDateFormatted} · Here's your business operations overview
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export Report</Btn>
            <Btn variant="primary" size="sm" onClick={() => navigate("/admin/bookings/new")}><Plus size={13} /> New Booking</Btn>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {KPIS.map((k) => (
            <KPICard key={k.title} {...k} />
          ))}
        </div>

        {/* Availability Calendar & Scheduler */}
        <div>
          <AdminEventCalendar />
        </div>

        {/* Inventory & Operational Alerts */}
        <AdminCard className="!p-4 sm:!p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">Inventory &amp; Stock Alerts</h2>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/inventory")} className="text-xs">
              View All Inventory
            </Btn>
          </div>
          {inventoryAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No inventory alerts. All equipment stock levels are healthy.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {inventoryAlerts.slice(0, 6).map((item) => {
                const isUnavailable = item.available === false;
                const status = isUnavailable 
                  ? "unavailable" 
                  : (item.stock_status === "no_stock" || (item.available_quantity ?? 0) <= 0) 
                    ? "no stock" 
                    : item.stock_status === "low_stock" 
                      ? "low stock" 
                      : "critical";
                const isLow = status === "low stock";

                return (
                  <div key={item._id} className={`p-3 rounded-md border text-xs shadow-2xs ${
                    isUnavailable 
                      ? "border-slate-200 bg-slate-50/60" 
                      : isLow 
                        ? "border-amber-200/80 bg-amber-50/40" 
                        : "border-rose-200/80 bg-rose-50/40"
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-foreground truncate">{item.item_name}</span>
                      <Badge status={status} dot />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Stock on Hand: <strong className={isUnavailable ? "text-slate-600" : isLow ? "text-amber-800 font-bold" : "text-rose-700 font-bold"}>{item.available_quantity || 0}</strong> (Total: {item.quantity || 0})
                    </p>
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