import React from "react";
import { Download, Plus, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { useNavigate } from "react-router-dom";
import { REVENUE_DATA, STATUS_PIE, BOOKINGS_DATA, PKG_DATA, ACTIVITY_FEED, INVENTORY_DATA, STAFF_DATA } from "../../components/admin/ui/data";

const fmt = (n) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

export default function AdminDashboard() {
  const navigate = useNavigate();

  const KPIS = [
    { title: "Total Reservations", value: "248", sub: "+12 this month", trend: "+8.2%", up: true, color: "#3B82F6" },
    { title: "Upcoming Events", value: "34", sub: "Next 30 days", trend: "+3.1%", up: true, color: "#8B5CF6" },
    { title: "Pending Reservations", value: "22", sub: "Awaiting approval", trend: "+12.0%", up: false, color: "#F59E0B" },
    { title: "Completed Events", value: "192", sub: "All time", trend: "+5.4%", up: true, color: "#22C55E" },
    { title: "Monthly Revenue", value: "₱615k", sub: "July 2025", trend: "+18.5%", up: true, color: "#D4AF37" },
    { title: "Pending Payments", value: "₱212k", sub: "7 outstanding", trend: "-4.2%", up: false, color: "#EF4444" },
    { title: "Inventory Alerts", value: "3", sub: "Low / critical items", trend: "+2", up: false, color: "#F97316" },
    { title: "Available Staff Today", value: "6", sub: "of 8 total staff", trend: "75%", up: true, color: "#06B6D4" },
  ];

  const UPCOMING = [
    { date: "Aug 2", event: "Sofia & Marco Wedding", venue: "Shangri-La BGC", guests: 120 },
    { date: "Sep 18", event: "Synergy Corp Gala", venue: "Manila Hotel", guests: 200 },
    { date: "Oct 5", event: "Ana's 18th Debut", venue: "The Ruins Cebu", guests: 40 },
    { date: "Oct 20", event: "Lim Product Launch", venue: "Raffles Makati", guests: 80 },
    { date: "Nov 3", event: "Garcia Birthday Party", venue: "Home venue", guests: 50 },
  ];

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map(k => <KPICard key={k.title} {...k} />)}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <AdminCard className="lg:col-span-2 !p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[#111]">Monthly Revenue</p>
                <p className="text-xs text-[#6B7280]">Revenue vs Expenses — 2025</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#D4AF37] rounded inline-block" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#E5E7EB] rounded inline-block border border-gray-300" />Expenses</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} fill="#D4AF37" fillOpacity={0.12} />
                <Area type="monotone" dataKey="expenses" stroke="#E5E7EB" strokeWidth={2} fill="#F9FAFB" fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </AdminCard>

          <AdminCard className="!p-5">
            <p className="font-bold text-[#111] mb-1">Reservation Status</p>
            <p className="text-xs text-[#6B7280] mb-4">Distribution by status</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={STATUS_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                  {STATUS_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {STATUS_PIE.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-[#6B7280]">{s.name}</span></span>
                  <span className="font-semibold text-[#111]">{s.value}%</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AdminCard className="!p-5">
            <p className="font-bold text-[#111] mb-1">Weekly Bookings</p>
            <p className="text-xs text-[#6B7280] mb-4">Bookings received per day this week</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={BOOKINGS_DATA} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="bookings" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>

          <AdminCard className="!p-5">
            <p className="font-bold text-[#111] mb-1">Popular Packages</p>
            <p className="text-xs text-[#6B7280] mb-4">Bookings by package type — all time</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={PKG_DATA} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="bookings" fill="#111827" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Upcoming Events */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[#111] text-sm">Upcoming Events</p>
              <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/calendar")}>View Calendar</Btn>
            </div>
            <div className="space-y-3">
              {UPCOMING.map(e => (
                <div key={e.date} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <p className="text-[10px] text-[#D4AF37] font-bold leading-none">{e.date.split(" ")[0].toUpperCase()}</p>
                    <p className="text-sm font-bold text-[#D4AF37] leading-tight">{e.date.split(" ")[1]}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111] truncate">{e.event}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{e.venue} · {e.guests} pax</p>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Today's Staff Schedule */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[#111] text-sm">Today's Staff</p>
              <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/staff")}>Manage</Btn>
            </div>
            <div className="space-y-3">
              {STAFF_DATA.slice(0, 6).map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] flex-shrink-0">{s.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111] truncate">{s.name}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{s.role}</p>
                  </div>
                  <Badge status={s.status} />
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Activity Feed */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[#111] text-sm">Recent Activity</p>
              <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/logs")}>Audit Logs</Btn>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {ACTIVITY_FEED.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${a.color}`}>{a.icon}</div>
                  <div>
                    <p className="text-xs text-[#374151] leading-snug">{a.msg}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Inventory Alerts */}
        <AdminCard className="!p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-[#111] text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-amber-500" /> Inventory Alerts</p>
            <Btn size="sm" variant="ghost" onClick={() => navigate("/admin/inventory")}>View All</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INVENTORY_DATA.filter(i => i.status !== "ok").map(item => (
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