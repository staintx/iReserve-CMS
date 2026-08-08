import React, { useState, useEffect } from "react";
import { Download, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { AdminAPI } from "../../api/admin";

export default function AdminAnalytics() {
  const [range, setRange] = useState("This Year");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ monthlyRevenue: [], bookingStatus: [], topPackages: [] });

  useEffect(() => {
    AdminAPI.getMetrics()
      .then((res) => setMetrics(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-background min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar size={13} className="text-muted-foreground" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none"
              >
                <option>This Year</option>
                <option>Last 6 Months</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <Btn variant="secondary" size="sm"><Download size={13} /> Export Data</Btn>
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
            ) : metrics.monthlyRevenue.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No revenue recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.monthlyRevenue}>
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
