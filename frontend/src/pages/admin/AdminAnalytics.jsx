import React, { useState, useEffect, useMemo } from "react";
import { Download, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import useToast from "../../hooks/useToast";
import { AdminAPI } from "../../api/admin";

export default function AdminAnalytics() {
  const [range, setRange] = useState("This Year");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ monthlyRevenue: [], bookingStatus: [], topPackages: [] });
  const { notify } = useToast();

  useEffect(() => {
    AdminAPI.getMetrics()
      .then((res) => setMetrics(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const filteredRevenue = useMemo(() => {
    const list = metrics.monthlyRevenue || [];
    if (!list.length) return [];
    if (range === "Last 30 Days") return list.slice(-1);
    if (range === "Last 6 Months") return list.slice(-6);
    if (range === "This Year") {
      const currentYear = new Date().getFullYear().toString();
      const thisYear = list.filter((m) => m.month?.startsWith(currentYear));
      return thisYear.length ? thisYear : list;
    }
    return list;
  }, [metrics.monthlyRevenue, range]);

  const handleExport = () => {
    if (loading) {
      notify("Please wait until analytics data finishes loading.", "warning");
      return;
    }

    const revenueList = filteredRevenue.length > 0 ? filteredRevenue : (metrics.monthlyRevenue || []);
    const statusList = metrics.bookingStatus || [];
    const packageList = metrics.topPackages || [];
    const eventTypeList = metrics.eventTypes || [];

    const hasData =
      revenueList.length > 0 ||
      statusList.length > 0 ||
      packageList.length > 0 ||
      eventTypeList.length > 0;

    if (!hasData) {
      notify("No analytics data available to export.", "warning");
      return;
    }

    const formatCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const toCsvRow = (arr) => arr.map(formatCell).join(",");

    const rows = [
      ["iReserve CMS - Analytics & Reports Summary"],
      [`Generated On: ${new Date().toLocaleString("en-PH")}`],
      [`Timeframe: ${range}`],
      [],
      ["--- SUMMARY METRICS ---"],
      ["Metric", "Value"],
      ["Total Revenue", metrics.summary?.monthlyRevenue != null ? `PHP ${Number(metrics.summary.monthlyRevenue).toLocaleString("en-PH")}` : "PHP 0"],
      ["Completed Bookings / Events", metrics.summary?.completedEvents ?? 0],
      ["Upcoming Bookings", metrics.summary?.upcomingBookings ?? 0],
      ["Pending Quotations", metrics.summary?.pendingQuotations ?? 0],
      [],
      ["--- MONTHLY REVENUE ---"],
      ["Month", "Revenue (PHP)"],
      ...revenueList.map((item) => [item.month || "N/A", item.total ?? 0]),
      [],
      ["--- BOOKINGS BY STATUS ---"],
      ["Status", "Bookings Count"],
      ...statusList.map((item) => [item.status || "Unknown", item.count ?? 0]),
      [],
      ["--- TOP PACKAGES ---"],
      ["Package Name", "Total Bookings", "Revenue (PHP)"],
      ...packageList.map((item) => [item.name || "Custom Package", item.bookings ?? 0, item.revenue ?? 0]),
    ];

    if (eventTypeList.length > 0) {
      rows.push(
        [],
        ["--- EVENT TYPES ---"],
        ["Event Type", "Total Bookings"],
        ...eventTypeList.map((item) => [item.event_type || "N/A", item.count ?? 0])
      );
    }

    const csvContent = "\uFEFF" + rows.map(toCsvRow).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `iReserve_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify("Analytics report exported successfully.", "success");
  };

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Analytics &amp; Reports</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time revenue metrics, event distribution, and package performance.</p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-card border border-border/80 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Calendar size={13} className="text-muted-foreground" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              >
                <option>This Year</option>
                <option>Last 6 Months</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <Btn
              id="btn-export-analytics"
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={loading}
              title="Export analytics report to CSV"
            >
              <Download size={13} /> Export Data
            </Btn>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Revenue Overview */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-foreground">Revenue Overview</p>
                <p className="text-xs text-muted-foreground">Monthly revenue from approved payments</p>
              </div>
            </div>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">Loading revenue data...</div>
            ) : filteredRevenue.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No revenue recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={filteredRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" name="Revenue" stroke="#4C81E0" strokeWidth={2} fill="#4C81E0" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </AdminCard>

          {/* Booking Status Breakdown */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-foreground">Bookings by Status</p>
                <p className="text-xs text-muted-foreground">Current distribution across all bookings</p>
              </div>
            </div>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">Loading booking data...</div>
            ) : metrics.bookingStatus.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No bookings recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.bookingStatus} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" name="Bookings" fill="#4C81E0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </AdminCard>
        </div>

        <AdminCard className="!p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-foreground">Top Packages</p>
              <p className="text-xs text-muted-foreground">Most booked packages by volume</p>
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Loading package data...</div>
          ) : (metrics.topPackages || []).length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No package bookings recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.topPackages} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="bookings" name="Bookings" fill="#64748B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
