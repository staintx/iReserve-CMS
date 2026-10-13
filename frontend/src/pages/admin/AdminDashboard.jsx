import React, { useEffect, useState } from "react";
import { Plus, AlertTriangle, Clock, CheckCircle2, Calendar, FileText } from "lucide-react";
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
      title: "Needs Quotations", 
      value: summary.needsQuotations ?? "0", 
      sub: "Awaiting quotation", 
      icon: Clock 
    },
    { 
      title: "Quotation Sent", 
      value: summary.quotationSent ?? "0", 
      sub: "Awaiting customer response", 
      icon: FileText 
    },
    { 
      title: "Upcoming Events", 
      value: summary.upcomingEvents ?? "0", 
      sub: "Next 30 days", 
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

  const isPastDay = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay < startOfToday;
  };

  const isTerminalOrConvertedInquiry = (inq) => {
    if (!inq) return true;
    if (inq.converted_booking_id || inq.status === "Converted to Booking") return true;
    if (inq.archived) return true;
    const s = String(inq.status || "").toLowerCase();
    if (s === "cancelled" || s === "quote rejected" || s.includes("cancel")) return true;
    if (s === "expired") return true;
    if (inq.event_date && isPastDay(inq.event_date)) return true;
    return false;
  };

  const isQuotationSentInquiry = (inq) => {
    if (isTerminalOrConvertedInquiry(inq)) return false;
    if (["Quote Accepted", "Awaiting Final Confirmation"].includes(inq.status)) return false;
    if (inq.status === "Revision Requested") return false;

    const isSentStatus =
      inq.status === "Quotation Sent" ||
      (inq.latestQuote && ["Sent", "Quotation Sent"].includes(inq.latestQuote.status));
    if (!isSentStatus) return false;

    const quoteExp = inq.latestQuote?.expiration_date || inq.quotation_expiration_date;
    if (quoteExp && isPastDay(quoteExp)) return false;

    return true;
  };

  const isNeedsQuotationInquiry = (inq) => {
    if (isTerminalOrConvertedInquiry(inq)) return false;
    if (isQuotationSentInquiry(inq)) return false;
    if (["Quote Accepted", "Awaiting Final Confirmation"].includes(inq.status)) return false;

    return (
      ["Pending Review", "Under Review", "Revision Requested"].includes(inq.status) ||
      (!inq.latestQuote || inq.latestQuote.status === "Draft")
    );
  };

  const isQuotationSentBooking = (b) => {
    if (!b) return false;
    return (b.status || "").toLowerCase() === "quote_sent";
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

        // Calculate Needs Quotations inquiries (awaiting quotation from admin)
        const needsQuotationsInquiries = inquiries.filter(isNeedsQuotationInquiry);

        // Calculate Quotation Sent (inquiries/reservations where quotation was sent to customer and awaiting response)
        const quotationSentInquiries = inquiries.filter(isQuotationSentInquiry);
        const countedInquiryIds = new Set(quotationSentInquiries.map((i) => String(i._id)));
        const countedBookingIds = new Set(
          quotationSentInquiries
            .map((i) => (i.converted_booking_id ? String(i.converted_booking_id?._id || i.converted_booking_id) : null))
            .filter(Boolean)
        );

        const quotationSentBookings = data.filter((b) => {
          if (!isQuotationSentBooking(b)) return false;
          const bId = String(b._id);
          const inqId = b.inquiry_id ? String(b.inquiry_id?._id || b.inquiry_id) : null;
          return !countedBookingIds.has(bId) && (!inqId || !countedInquiryIds.has(inqId));
        });

        const totalQuotationSent = quotationSentInquiries.length + quotationSentBookings.length;

        setSummary({
          totalReservations: data.length,
          upcomingEvents: upcomingNext30Days.length,
          totalUpcomingEvents: allFuture.length,
          needsQuotations: needsQuotationsInquiries.length,
          quotationSent: totalQuotationSent,
          pendingInquiries: needsQuotationsInquiries.length,
          acceptedQuotes: totalQuotationSent,
          completedEvents: data.filter((booking) => booking.status === "completed" || booking.status === "Completed").length,
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

  useRealTimeRefresh(loadData, ["booking","inquiry","quotation","payment","conversation","systemLog","businessInfo"]);

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
            <Btn variant="primary" size="sm" onClick={() => navigate("/admin/bookings/reservations?new=true")}><Plus size={13} /> New Booking</Btn>
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